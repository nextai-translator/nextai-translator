use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use bzip2::read::BzDecoder;
use futures_util::StreamExt;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::Serialize;
use sha2::{Digest, Sha256};
use sherpa_onnx::{
    GenerationConfig, OfflineTts, OfflineTtsConfig, OfflineTtsKokoroModelConfig,
    OfflineTtsModelConfig, OfflineTtsVitsModelConfig,
};
use std::collections::HashMap;
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;
use tar::Archive;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

const MELO_DIR: &str = "vits-melo-tts-zh_en";
const MELO_SHA256: &str = "e58351ed7149f290a54534538badd4077cdbe6fddc964b24d0bee870415d1514";
const MELO_URLS: &[&str] = &[
    "https://release.yansu.app/sherpa/tts/vits-melo-tts-zh_en.tar.bz2",
    "https://model-assets.yansu.app/sherpa/tts/vits-melo-tts-zh_en.tar.bz2",
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-melo-tts-zh_en.tar.bz2",
];

const KOKORO_DIR: &str = "kokoro-en-v0_19";
const KOKORO_SHA256: &str = "912804855a04745fa77a30be545b3f9a5d15c4d66db00b88cbcd4921df605ac7";
const KOKORO_URLS: &[&str] = &[
    "https://release.yansu.app/sherpa/tts/kokoro-en-v0_19.tar.bz2",
    "https://model-assets.yansu.app/sherpa/tts/kokoro-en-v0_19.tar.bz2",
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-en-v0_19.tar.bz2",
];

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
enum ModelKind {
    Chinese,
    English,
}

impl ModelKind {
    fn id(self) -> &'static str {
        match self {
            Self::Chinese => "zh",
            Self::English => "en",
        }
    }

    fn directory(self) -> &'static str {
        match self {
            Self::Chinese => MELO_DIR,
            Self::English => KOKORO_DIR,
        }
    }

    fn sha256(self) -> &'static str {
        match self {
            Self::Chinese => MELO_SHA256,
            Self::English => KOKORO_SHA256,
        }
    }

    fn urls(self) -> &'static [&'static str] {
        match self {
            Self::Chinese => MELO_URLS,
            Self::English => KOKORO_URLS,
        }
    }
}

type SharedEngine = Arc<Mutex<OfflineTts>>;

static ENGINES: Lazy<Mutex<HashMap<ModelKind, SharedEngine>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static LOAD_LOCK: Lazy<tokio::sync::Mutex<()>> = Lazy::new(|| tokio::sync::Mutex::new(()));

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TtsDownloadProgress {
    lang: &'static str,
    downloaded: u64,
    total: u64,
    bytes_per_second: f64,
    phase: &'static str,
    message: Option<String>,
}

fn emit_download_progress(
    app: &AppHandle,
    kind: ModelKind,
    downloaded: u64,
    total: u64,
    bytes_per_second: f64,
    phase: &'static str,
    message: Option<String>,
) {
    let _ = app.emit(
        "tts-download-progress",
        TtsDownloadProgress {
            lang: kind.id(),
            downloaded,
            total,
            bytes_per_second,
            phase,
            message,
        },
    );
}

fn model_for_text(text: &str, lang: &str) -> Result<ModelKind, String> {
    if text.chars().any(is_han) {
        return Ok(ModelKind::Chinese);
    }
    if lang == "en" {
        return Ok(ModelKind::English);
    }
    if matches!(lang, "zh-Hans" | "zh-Hant" | "yue" | "lzh") {
        return Ok(ModelKind::Chinese);
    }
    Err(format!("local TTS does not support language: {lang}"))
}

fn is_han(ch: char) -> bool {
    matches!(
        ch as u32,
        0x3400..=0x4DBF
            | 0x4E00..=0x9FFF
            | 0xF900..=0xFAFF
            | 0x20000..=0x2FA1F
    )
}

fn model_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("tts"))
        .map_err(|err| format!("resolve app data directory: {err}"))
}

fn file_nonempty(path: impl AsRef<Path>) -> bool {
    std::fs::metadata(path)
        .map(|metadata| metadata.is_file() && metadata.len() > 0)
        .unwrap_or(false)
}

fn model_present(kind: ModelKind, root: &Path) -> bool {
    let directory = root.join(kind.directory());
    match kind {
        ModelKind::Chinese => {
            file_nonempty(directory.join("model.onnx"))
                && file_nonempty(directory.join("lexicon.txt"))
                && file_nonempty(directory.join("tokens.txt"))
        }
        ModelKind::English => {
            file_nonempty(directory.join("model.onnx"))
                && file_nonempty(directory.join("voices.bin"))
                && file_nonempty(directory.join("tokens.txt"))
        }
    }
}

async fn download_model(app: &AppHandle, kind: ModelKind, root: &Path) -> Result<(), String> {
    tokio::fs::create_dir_all(root)
        .await
        .map_err(|err| format!("create TTS model directory: {err}"))?;

    let archive_path = root.join(format!("{}.tar.bz2.part", kind.directory()));
    let client = reqwest::Client::builder()
        .build()
        .map_err(|err| format!("create TTS download client: {err}"))?;
    let mut last_error = String::from("no model mirror was available");

    for url in kind.urls() {
        let result = async {
            let response = client
                .get(*url)
                .send()
                .await
                .map_err(|err| format!("request failed: {err}"))?
                .error_for_status()
                .map_err(|err| format!("server returned an error: {err}"))?;
            let total = response.content_length().unwrap_or(0);
            let mut downloaded = 0_u64;
            let mut last_reported = 0_u64;
            let mut last_report_at = Instant::now();
            let mut hasher = Sha256::new();
            let mut output = tokio::fs::File::create(&archive_path)
                .await
                .map_err(|err| format!("create model archive: {err}"))?;
            let mut stream = response.bytes_stream();

            emit_download_progress(app, kind, 0, total, 0.0, "downloading", None);

            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|err| format!("download model archive: {err}"))?;
                output
                    .write_all(&chunk)
                    .await
                    .map_err(|err| format!("write model archive: {err}"))?;
                hasher.update(&chunk);
                downloaded += chunk.len() as u64;
                let elapsed = last_report_at.elapsed();
                if elapsed.as_millis() >= 200 || (total > 0 && downloaded >= total) {
                    let speed =
                        (downloaded - last_reported) as f64 / elapsed.as_secs_f64().max(0.001);
                    emit_download_progress(
                        app,
                        kind,
                        downloaded,
                        total,
                        speed,
                        "downloading",
                        None,
                    );
                    last_reported = downloaded;
                    last_report_at = Instant::now();
                }
            }
            if downloaded != last_reported {
                let elapsed = last_report_at.elapsed();
                let speed = (downloaded - last_reported) as f64 / elapsed.as_secs_f64().max(0.001);
                emit_download_progress(app, kind, downloaded, total, speed, "downloading", None);
            }
            output
                .flush()
                .await
                .map_err(|err| format!("flush model archive: {err}"))?;

            let actual_sha = format!("{:x}", hasher.finalize());
            if actual_sha != kind.sha256() {
                return Err(format!(
                    "model archive checksum mismatch: expected {}, got {actual_sha}",
                    kind.sha256()
                ));
            }

            emit_download_progress(app, kind, downloaded, total, 0.0, "extracting", None);

            let archive = archive_path.clone();
            let destination = root.to_path_buf();
            let model_directory = root.join(kind.directory());
            tokio::task::spawn_blocking(move || {
                if model_directory.exists() {
                    std::fs::remove_dir_all(&model_directory)
                        .map_err(|err| format!("replace old TTS model: {err}"))?;
                }
                let file =
                    File::open(&archive).map_err(|err| format!("open model archive: {err}"))?;
                let mut tar = Archive::new(BzDecoder::new(file));
                for entry in tar
                    .entries()
                    .map_err(|err| format!("read model archive: {err}"))?
                {
                    entry
                        .map_err(|err| format!("read model archive entry: {err}"))?
                        .unpack_in(&destination)
                        .map_err(|err| format!("extract model archive: {err}"))?;
                }
                Ok::<(), String>(())
            })
            .await
            .map_err(|err| format!("extract model task failed: {err}"))??;

            if !model_present(kind, root) {
                return Err("model files are missing after extraction".to_string());
            }
            emit_download_progress(app, kind, downloaded, total, 0.0, "ready", None);
            Ok::<(), String>(())
        }
        .await;

        if result.is_ok() {
            let _ = tokio::fs::remove_file(&archive_path).await;
            return Ok(());
        }
        last_error = format!("{url}: {}", result.unwrap_err());
        let _ = tokio::fs::remove_file(&archive_path).await;
    }

    let error = format!("download {} TTS model: {last_error}", kind.id());
    emit_download_progress(app, kind, 0, 0, 0.0, "error", Some(error.clone()));
    Err(error)
}

fn path_string(path: PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

fn create_engine(kind: ModelKind, root: &Path) -> Result<OfflineTts, String> {
    let directory = root.join(kind.directory());
    let model = match kind {
        ModelKind::Chinese => {
            let rule_fsts = ["phone.fst", "date.fst", "number.fst"]
                .iter()
                .map(|name| directory.join(name))
                .filter(|path| file_nonempty(path))
                .map(path_string)
                .collect::<Vec<_>>()
                .join(",");
            OfflineTtsConfig {
                model: OfflineTtsModelConfig {
                    vits: OfflineTtsVitsModelConfig {
                        model: Some(path_string(directory.join("model.onnx"))),
                        lexicon: Some(path_string(directory.join("lexicon.txt"))),
                        tokens: Some(path_string(directory.join("tokens.txt"))),
                        noise_scale: 0.667,
                        noise_scale_w: 0.8,
                        length_scale: 1.0,
                        ..Default::default()
                    },
                    num_threads: 2,
                    ..Default::default()
                },
                rule_fsts: (!rule_fsts.is_empty()).then_some(rule_fsts),
                max_num_sentences: 2,
                ..Default::default()
            }
        }
        ModelKind::English => OfflineTtsConfig {
            model: OfflineTtsModelConfig {
                kokoro: OfflineTtsKokoroModelConfig {
                    model: Some(path_string(directory.join("model.onnx"))),
                    voices: Some(path_string(directory.join("voices.bin"))),
                    tokens: Some(path_string(directory.join("tokens.txt"))),
                    data_dir: Some(path_string(directory.join("espeak-ng-data"))),
                    length_scale: 1.0,
                    ..Default::default()
                },
                num_threads: 2,
                ..Default::default()
            },
            max_num_sentences: 2,
            ..Default::default()
        },
    };

    OfflineTts::create(&model).ok_or_else(|| format!("failed to load {} TTS model", kind.id()))
}

async fn ensure_engine(app: &AppHandle, kind: ModelKind) -> Result<SharedEngine, String> {
    if let Some(engine) = ENGINES.lock().get(&kind).cloned() {
        return Ok(engine);
    }

    let _load_guard = LOAD_LOCK.lock().await;
    if let Some(engine) = ENGINES.lock().get(&kind).cloned() {
        return Ok(engine);
    }

    let root = model_root(app)?;
    if !model_present(kind, &root) {
        download_model(app, kind, &root).await?;
    }
    let engine = tokio::task::spawn_blocking(move || create_engine(kind, &root))
        .await
        .map_err(|err| format!("load TTS model task failed: {err}"))??;
    let engine = Arc::new(Mutex::new(engine));
    ENGINES.lock().insert(kind, engine.clone());
    Ok(engine)
}

fn normalize_peak(samples: &mut [f32], target: f32) {
    let peak = samples
        .iter()
        .fold(0.0_f32, |peak, sample| peak.max(sample.abs()));
    if peak == 0.0 {
        return;
    }
    let gain = (target / peak).min(8.0);
    if (0.99..=1.01).contains(&gain) {
        return;
    }
    for sample in samples {
        *sample *= gain;
    }
}

fn apply_edge_fades(samples: &mut [f32], sample_rate: i32) {
    let mut fade = (sample_rate.max(0) as usize * 12) / 1000;
    fade = fade.min(samples.len() / 2);
    for index in 0..fade {
        let gain = index as f32 / fade as f32;
        samples[index] *= gain;
        samples[samples.len() - 1 - index] *= gain;
    }
}

fn encode_wav(samples: &[f32], sample_rate: i32) -> Vec<u8> {
    let data_len = samples.len() * 2;
    let mut output = Vec::with_capacity(44 + data_len);
    output.extend_from_slice(b"RIFF");
    output.extend_from_slice(&(36_u32 + data_len as u32).to_le_bytes());
    output.extend_from_slice(b"WAVEfmt ");
    output.extend_from_slice(&16_u32.to_le_bytes());
    output.extend_from_slice(&1_u16.to_le_bytes());
    output.extend_from_slice(&1_u16.to_le_bytes());
    output.extend_from_slice(&(sample_rate as u32).to_le_bytes());
    output.extend_from_slice(&((sample_rate as u32) * 2).to_le_bytes());
    output.extend_from_slice(&2_u16.to_le_bytes());
    output.extend_from_slice(&16_u16.to_le_bytes());
    output.extend_from_slice(b"data");
    output.extend_from_slice(&(data_len as u32).to_le_bytes());
    for sample in samples {
        let pcm = (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
        output.extend_from_slice(&pcm.to_le_bytes());
    }
    output
}

#[tauri::command]
#[specta::specta]
pub async fn synthesize_local_tts(
    app: AppHandle,
    text: String,
    lang: String,
    rate: f32,
) -> Result<String, String> {
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("no speakable text".to_string());
    }
    let kind = model_for_text(&text, &lang)?;
    let engine = ensure_engine(&app, kind).await?;
    let speed = rate.clamp(0.1, 2.0);

    tokio::task::spawn_blocking(move || {
        let engine = engine.lock();
        let audio = engine
            .generate_with_config(
                &text,
                &GenerationConfig {
                    sid: 0,
                    speed,
                    ..Default::default()
                },
                None::<fn(&[f32], f32) -> bool>,
            )
            .ok_or_else(|| "TTS produced no audio".to_string())?;
        let mut samples = audio.samples().to_vec();
        if samples.is_empty() {
            return Err("TTS produced no audio".to_string());
        }
        normalize_peak(&mut samples, 0.95);
        apply_edge_fades(&mut samples, audio.sample_rate());
        Ok(BASE64.encode(encode_wav(&samples, audio.sample_rate())))
    })
    .await
    .map_err(|err| format!("synthesize TTS task failed: {err}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn routes_han_text_to_chinese_model() {
        assert_eq!(model_for_text("Hello，世界", "en"), Ok(ModelKind::Chinese));
    }

    #[test]
    fn routes_supported_languages_and_rejects_others() {
        assert_eq!(model_for_text("Hello", "en"), Ok(ModelKind::English));
        assert_eq!(model_for_text("123", "zh-Hant"), Ok(ModelKind::Chinese));
        assert!(model_for_text("Bonjour", "fr").is_err());
    }

    #[test]
    fn wav_encoder_writes_pcm_header() {
        let wav = encode_wav(&[0.0, 1.0, -1.0], 24_000);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(wav.len(), 50);
    }
}
