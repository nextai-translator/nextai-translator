#[cfg(any(target_os = "macos", target_os = "windows"))]
use crate::insertion::remember_active_window;
use debug_print::debug_println;
#[cfg(any(target_os = "macos", target_os = "windows"))]
use std::path::Path;
use tauri::path::BaseDirectory;
use tauri::Manager;

#[tauri::command(async)]
#[specta::specta]
pub fn cut_image(left: u32, top: u32, width: u32, height: u32) {
    use image::{GenericImage, GenericImageView};
    let app_handle = match crate::APP_HANDLE.get() {
        Some(handle) => handle,
        None => {
            eprintln!("APP_HANDLE not initialized");
            return;
        }
    };
    let image_dir = match app_handle
        .path()
        .resolve("ocr_images", BaseDirectory::AppCache)
    {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("Failed to resolve ocr_images directory: {:?}", e);
            return;
        }
    };
    let new_image_file_path = image_dir.join("cut.png");
    // Remove any stale cut so downstream OCR cannot silently pick up the
    // previous selection when this command fails (#1872).
    let _ = std::fs::remove_file(&new_image_file_path);
    let image_file_path = image_dir.join("fullscreen.png");
    if !image_file_path.exists() {
        eprintln!("fullscreen.png does not exist, cannot cut image");
        return;
    }
    let mut img = match image::open(&image_file_path) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("error: {}", e);
            return;
        }
    };
    // Clamp the DPI-scaled selection to the image bounds: sub_image panics
    // on out-of-range rectangles (#1872).
    let (img_width, img_height) = img.dimensions();
    if left >= img_width || top >= img_height {
        eprintln!(
            "cut rectangle ({}, {}) is outside the screenshot ({}x{})",
            left, top, img_width, img_height
        );
        return;
    }
    let width = width.min(img_width - left);
    let height = height.min(img_height - top);
    if width == 0 || height == 0 {
        eprintln!("cut rectangle is empty");
        return;
    }
    let img2 = img.sub_image(left, top, width, height);
    match img2.to_image().save(&new_image_file_path) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("{:?}", e.to_string());
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn screenshot(x: i32, y: i32) {
    use screenshots::{Compression, Screen};
    use std::fs;

    let screens = match Screen::all() {
        Ok(screens) => screens,
        Err(e) => {
            eprintln!("Failed to get screens: {:?}", e);
            return;
        }
    };
    // Silently doing nothing when no display matches leaves a stale
    // fullscreen.png in place and OCR appears to randomly fail (#1872), so
    // fall back to the first screen instead.
    let screen = match screens
        .iter()
        .find(|screen| screen.display_info.x == x && screen.display_info.y == y)
    {
        Some(screen) => screen,
        None => {
            eprintln!(
                "No screen found at ({}, {}), falling back to the first screen",
                x, y
            );
            match screens.first() {
                Some(screen) => screen,
                None => {
                    eprintln!("No screens available");
                    return;
                }
            }
        }
    };
    let app_handle = match crate::APP_HANDLE.get() {
        Some(handle) => handle,
        None => {
            eprintln!("APP_HANDLE not initialized");
            return;
        }
    };
    let image_dir = match app_handle
        .path()
        .resolve("ocr_images", BaseDirectory::AppCache)
    {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("Failed to resolve ocr_images directory: {:?}", e);
            return;
        }
    };
    if !image_dir.exists() {
        if let Err(e) = std::fs::create_dir_all(&image_dir) {
            eprintln!("Failed to create ocr_images directory: {:?}", e);
            return;
        }
    }
    let image_file_path = image_dir.join("fullscreen.png");
    // Remove the previous capture so a failure below cannot leave it in
    // place to be silently reused (#1872).
    let _ = fs::remove_file(&image_file_path);
    let image = match screen.capture() {
        Ok(img) => img,
        Err(e) => {
            eprintln!("Failed to capture screen: {:?}", e);
            return;
        }
    };
    let buffer = match image.to_png(Compression::Fast) {
        Ok(buf) => buf,
        Err(e) => {
            eprintln!("Failed to convert image to PNG: {:?}", e);
            return;
        }
    };
    debug_println!("image_file_path: {:?}", image_file_path);
    if let Err(e) = fs::write(&image_file_path, buffer) {
        eprintln!("Failed to write screenshot file: {:?}", e);
    }
}

#[cfg(target_os = "linux")]
pub fn do_ocr() -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn do_ocr() -> Result<(), Box<dyn std::error::Error>> {
    use crate::windows::show_screenshot_window;
    show_screenshot_window();
    Ok(())
}

#[cfg(target_os = "windows")]
fn recognize_cut_file(image_file_path: &Path) -> Result<String, String> {
    let bitmap = load_bitmap(image_file_path)?;
    recognize_with_engines(&ocr_engines()?, &bitmap)
}

#[cfg(target_os = "windows")]
fn load_bitmap(
    image_file_path: &Path,
) -> Result<windows::Graphics::Imaging::SoftwareBitmap, String> {
    use windows::core::HSTRING;
    use windows::Graphics::Imaging::BitmapDecoder;
    use windows::Storage::{FileAccessMode, StorageFile};

    if !image_file_path.exists() {
        return Err(format!("OCR image not found at {:?}", image_file_path));
    }

    // StorageFile rejects verbatim (`\\?\`) prefixes and forward slashes.
    let path = image_file_path
        .to_string_lossy()
        .replace("\\\\?\\", "")
        .replace('/', "\\");
    debug_println!("ocr image file path: {:?}", path);

    let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(path))
        .map_err(|e| format!("failed to open storage file: {}", e))?
        .get()
        .map_err(|e| format!("failed to open storage file: {}", e))?;

    let stream = file
        .OpenAsync(FileAccessMode::Read)
        .map_err(|e| format!("failed to open stream: {}", e))?
        .get()
        .map_err(|e| format!("failed to open stream: {}", e))?;

    let decoder_id =
        BitmapDecoder::PngDecoderId().map_err(|e| format!("failed to get png decoder: {}", e))?;
    let decoder = BitmapDecoder::CreateWithIdAsync(decoder_id, &stream)
        .map_err(|e| format!("failed to create decoder: {}", e))?
        .get()
        .map_err(|e| format!("failed to create decoder: {}", e))?;

    decoder
        .GetSoftwareBitmapAsync()
        .map_err(|e| format!("failed to decode bitmap: {}", e))?
        .get()
        .map_err(|e| format!("failed to decode bitmap: {}", e))
}

#[cfg(target_os = "windows")]
fn recognize_with_engines(
    engines: &[windows::Media::Ocr::OcrEngine],
    bitmap: &windows::Graphics::Imaging::SoftwareBitmap,
) -> Result<String, String> {
    let mut results = Vec::with_capacity(engines.len());
    let mut first_error = None;
    for engine in engines {
        match recognize_bitmap(engine, bitmap) {
            Ok(text) => results.push(text),
            Err(e) => {
                eprintln!("OCR engine failed: {}", e);
                first_error.get_or_insert(e);
            }
        }
    }
    if results.is_empty() {
        return Err(first_error.unwrap_or_else(|| "no OCR engine produced a result".to_string()));
    }
    let best = pick_ocr_result(&results);
    Ok(results.swap_remove(best))
}

/// Every OCR engine installed on this machine, the user-profile one first.
///
/// `TryCreateFromUserProfileLanguages` only uses the *first* profile language
/// that has an OCR pack. When that is English, a Chinese screen comes back as
/// just its digits and Latin words, or as nothing at all (#1902), even though
/// a Chinese OCR pack is installed. So every installed recognizer language
/// runs, and `pick_ocr_result` keeps the one that read the most text.
#[cfg(target_os = "windows")]
fn ocr_engines() -> Result<Vec<windows::Media::Ocr::OcrEngine>, String> {
    use windows::Media::Ocr::OcrEngine;

    let mut engines = Vec::new();
    let mut profile_tag = None;
    if let Ok(engine) = OcrEngine::TryCreateFromUserProfileLanguages() {
        profile_tag = engine
            .RecognizerLanguage()
            .and_then(|lang| lang.LanguageTag())
            .ok()
            .map(|tag| tag.to_string());
        engines.push(engine);
    }
    if let Ok(languages) = OcrEngine::AvailableRecognizerLanguages() {
        for language in languages {
            let tag = language.LanguageTag().ok().map(|tag| tag.to_string());
            if tag.is_some() && tag == profile_tag {
                continue;
            }
            if let Ok(engine) = OcrEngine::TryCreateFromLanguage(&language) {
                engines.push(engine);
            }
        }
    }
    if engines.is_empty() {
        return Err("Language package not installed!\n\nSee: https://learn.microsoft.com/zh-cn/windows/powertoys/text-extractor#supported-languages".to_string());
    }
    Ok(engines)
}

#[cfg(target_os = "windows")]
fn recognize_bitmap(
    engine: &windows::Media::Ocr::OcrEngine,
    bitmap: &windows::Graphics::Imaging::SoftwareBitmap,
) -> Result<String, String> {
    let result = engine
        .RecognizeAsync(bitmap)
        .map_err(|e| format!("failed to recognize: {}", e))?
        .get()
        .map_err(|e| format!("failed to recognize: {}", e))?;

    let mut content = String::new();
    for line in result
        .Lines()
        .map_err(|e| format!("failed to read lines: {}", e))?
    {
        if let Ok(text) = line.Text() {
            content.push_str(&join_cjk_spaces(text.to_string_lossy().trim()));
            content.push('\n');
        }
    }
    Ok(content)
}

/// Windows OCR returns Chinese and Japanese lines with a space between every
/// character ("你 好 世 界"), which reads as garbage and confuses the
/// translator. Drop a space only when both neighbours are CJK, so spaces
/// between Latin words, and Korean word spacing, stay as they are.
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn join_cjk_spaces(line: &str) -> String {
    fn is_cjk(c: char) -> bool {
        matches!(c,
            '\u{3000}'..='\u{30ff}' // CJK punctuation, hiragana, katakana
            | '\u{3400}'..='\u{4dbf}'
            | '\u{4e00}'..='\u{9fff}'
            | '\u{f900}'..='\u{faff}'
            | '\u{ff00}'..='\u{ffef}' // full-width forms
        )
    }
    let chars: Vec<char> = line.chars().collect();
    let mut out = String::with_capacity(line.len());
    for (i, &c) in chars.iter().enumerate() {
        if c == ' ' && i > 0 && i + 1 < chars.len() && is_cjk(chars[i - 1]) && is_cjk(chars[i + 1])
        {
            continue;
        }
        out.push(c);
    }
    out
}

/// Index of the OCR result to use. `results[0]` comes from the user-profile
/// language and wins unless another engine read at least 20% more
/// non-whitespace characters, so an engine for another script only takes over
/// when it clearly saw text the profile engine could not read.
#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn pick_ocr_result(results: &[String]) -> usize {
    let score = |text: &str| text.chars().filter(|c| !c.is_whitespace()).count();
    let profile_score = results.first().map_or(0, |text| score(text));
    let mut best = 0;
    let mut best_score = profile_score;
    for (index, text) in results.iter().enumerate().skip(1) {
        let text_score = score(text);
        if text_score * 5 > profile_score * 6 && text_score > best_score {
            best = index;
            best_score = text_score;
        }
    }
    best
}

#[cfg(target_os = "windows")]
pub fn do_ocr_with_cut_file_path(image_file_path: &Path) {
    // Always surface the translator window: dying silently here (the old
    // unwrap chain panicked on any failure) left users with no feedback at
    // all when recognition failed (#1872). An empty input at least shows
    // that OCR ran and found nothing.
    let content = match recognize_cut_file(image_file_path) {
        Ok(content) => {
            debug_println!("ocr content: {:?}", content);
            content
        }
        Err(e) => {
            eprintln!("OCR failed: {}", e);
            String::new()
        }
    };
    crate::utils::send_text(content);
    remember_active_window();
    crate::windows::show_translator_window(false, true, true);
}

#[cfg(target_os = "macos")]
pub fn do_ocr() -> Result<(), Box<dyn std::error::Error>> {
    // The bundled macOCR helper binary this used to spawn no longer works on
    // current macOS (its interactive screencapture child dies immediately),
    // so macOS now uses the same in-app screenshot window flow as Windows,
    // with recognition done natively via the Vision framework in
    // do_ocr_with_cut_file_path.
    use crate::windows::show_screenshot_window;
    show_screenshot_window();
    Ok(())
}

#[cfg(target_os = "macos")]
unsafe fn nsstring_to_string(ns_string: cocoa::base::id) -> String {
    use objc::{msg_send, sel, sel_impl};
    let bytes: *const std::os::raw::c_char = msg_send![ns_string, UTF8String];
    if bytes.is_null() {
        return String::new();
    }
    std::ffi::CStr::from_ptr(bytes)
        .to_string_lossy()
        .into_owned()
}

#[cfg(target_os = "macos")]
fn recognize_cut_file(image_file_path: &Path) -> Result<String, String> {
    use cocoa::base::{id, nil, YES};
    use cocoa::foundation::{NSArray, NSAutoreleasePool, NSString};
    use objc::{class, msg_send, sel, sel_impl};

    if !image_file_path.exists() {
        return Err(format!("OCR image not found at {:?}", image_file_path));
    }

    unsafe {
        let pool = NSAutoreleasePool::new(nil);
        let result = (|| -> Result<String, String> {
            let path_str = NSString::alloc(nil).init_str(&image_file_path.to_string_lossy());
            let url: id = msg_send![class!(NSURL), fileURLWithPath: path_str];
            if url == nil {
                return Err("failed to create file URL for OCR image".to_string());
            }

            let options: id = msg_send![class!(NSDictionary), dictionary];
            let handler: id = msg_send![class!(VNImageRequestHandler), alloc];
            let handler: id = msg_send![handler, initWithURL: url options: options];
            if handler == nil {
                return Err("failed to create Vision image request handler".to_string());
            }

            let request: id = msg_send![class!(VNRecognizeTextRequest), alloc];
            let request: id = msg_send![request, init];
            if request == nil {
                return Err("failed to create Vision text recognition request".to_string());
            }

            // Match the languages the previous macOCR-based flow used (-l zh).
            let languages = NSArray::arrayWithObjects(
                nil,
                &[
                    NSString::alloc(nil).init_str("zh-Hans"),
                    NSString::alloc(nil).init_str("zh-Hant"),
                    NSString::alloc(nil).init_str("en-US"),
                ],
            );
            let _: () = msg_send![request, setRecognitionLanguages: languages];
            let _: () = msg_send![request, setUsesLanguageCorrection: YES];

            let requests = NSArray::arrayWithObject(nil, request);
            let mut error: id = nil;
            let ok: bool = msg_send![handler, performRequests: requests error: &mut error];
            if !ok {
                let message = if error != nil {
                    let description: id = msg_send![error, localizedDescription];
                    nsstring_to_string(description)
                } else {
                    "unknown Vision error".to_string()
                };
                return Err(format!("Vision OCR failed: {}", message));
            }

            let results: id = msg_send![request, results];
            let count: usize = msg_send![results, count];
            let mut content = String::new();
            for index in 0..count {
                let observation: id = msg_send![results, objectAtIndex: index];
                let candidates: id = msg_send![observation, topCandidates: 1usize];
                let candidate_count: usize = msg_send![candidates, count];
                if candidate_count == 0 {
                    continue;
                }
                let candidate: id = msg_send![candidates, objectAtIndex: 0usize];
                let text: id = msg_send![candidate, string];
                content.push_str(nsstring_to_string(text).trim());
                content.push('\n');
            }
            Ok(content)
        })();
        pool.drain();
        result
    }
}

#[cfg(target_os = "macos")]
pub fn do_ocr_with_cut_file_path(image_file_path: &Path) {
    // Always surface the translator window, mirroring the Windows flow:
    // silent failures left users with no feedback at all (#1872).
    let content = match recognize_cut_file(image_file_path) {
        Ok(content) => {
            debug_println!("ocr content: {:?}", content);
            content
        }
        Err(e) => {
            eprintln!("OCR failed: {}", e);
            String::new()
        }
    };
    crate::utils::send_text(content);
    remember_active_window();
    crate::windows::show_translator_window(false, true, true);
}

#[tauri::command(async)]
#[specta::specta]
pub fn start_ocr() {
    ocr();
}

pub fn ocr() {
    if let Err(e) = do_ocr() {
        eprintln!("OCR failed: {:?}", e);
    }
}

#[tauri::command(async)]
#[specta::specta]
pub fn finish_ocr() {
    do_finish_ocr();
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn do_finish_ocr() {
    let app_handle = match crate::APP_HANDLE.get() {
        Some(handle) => handle,
        None => {
            eprintln!("APP_HANDLE not initialized");
            return;
        }
    };
    let image_dir = match app_handle
        .path()
        .resolve("ocr_images", BaseDirectory::AppCache)
    {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("Failed to resolve ocr_images directory: {:?}", e);
            return;
        }
    };
    let image_file_path = image_dir.join("cut.png");
    do_ocr_with_cut_file_path(&image_file_path);
}

#[cfg(target_os = "linux")]
fn do_finish_ocr() {}

#[cfg(test)]
mod pick_tests {
    use super::{join_cjk_spaces, pick_ocr_result};

    #[test]
    fn joins_spaces_between_cjk_characters_only() {
        assert_eq!(
            join_cjk_spaces("HeIIo WorId 你 好 世 界"),
            "HeIIo WorId 你好世界"
        );
        assert_eq!(
            join_cjk_spaces("Kimi 半 年 三 次 道 歉"),
            "Kimi 半年三次道歉"
        );
        assert_eq!(join_cjk_spaces("“ 行 李 箱 ” 装 下"), "“ 行李箱 ” 装下");
        assert_eq!(join_cjk_spaces("こ ん に ち は"), "こんにちは");
        assert_eq!(join_cjk_spaces("안녕 하세요"), "안녕 하세요");
        assert_eq!(join_cjk_spaces("plain english text"), "plain english text");
    }

    fn results(texts: &[&str]) -> Vec<String> {
        texts.iter().map(|t| t.to_string()).collect()
    }

    #[test]
    fn keeps_profile_result_when_others_read_about_the_same() {
        assert_eq!(
            pick_ocr_result(&results(&["Hello world", "He11o w0rld!"])),
            0
        );
    }

    #[test]
    fn switches_to_engine_that_read_another_script() {
        // #1902: an en-US engine on a Chinese page keeps only the digits.
        let picked = pick_ocr_result(&results(&[
            "1\n2\n3\nKimi\n",
            "1 微信转账\n2 喜欢吃\n3 行李箱\nKimi 道歉\n",
        ]));
        assert_eq!(picked, 1);
    }

    #[test]
    fn prefers_the_best_of_several_candidates() {
        assert_eq!(pick_ocr_result(&results(&["", "ab", "abcdef"])), 2);
    }

    #[test]
    fn empty_profile_result_loses_to_any_text() {
        assert_eq!(pick_ocr_result(&results(&["", "你好"])), 1);
    }
}

#[cfg(all(test, any(target_os = "macos", target_os = "windows")))]
mod tests {
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn recognizes_text_in_fixture_image() {
        let path =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/ocr-fixture.png");
        let content = recognize_cut_file(&path).expect("recognition should succeed");
        assert!(content.contains("Hello"), "unexpected content: {content:?}");
        assert!(content.contains("你好"), "unexpected content: {content:?}");
    }

    /// #1902: with an English-first profile only the en-US engine ran, and
    /// Chinese text vanished. With every installed engine tried, the Chinese
    /// one wins on a mixed page even when English is listed first.
    #[cfg(target_os = "windows")]
    #[test]
    fn english_first_engine_list_still_reads_chinese() {
        use windows::core::HSTRING;
        use windows::Globalization::Language;
        use windows::Media::Ocr::OcrEngine;

        let engine = |tag: &str| {
            let language = Language::CreateLanguage(&HSTRING::from(tag)).unwrap();
            OcrEngine::TryCreateFromLanguage(&language).expect(tag)
        };
        let path =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/ocr-fixture.png");
        let bitmap = load_bitmap(&path).unwrap();

        let english_only = recognize_with_engines(&[engine("en-US")], &bitmap).unwrap();
        eprintln!("en-US only: {english_only:?}");
        let content =
            recognize_with_engines(&[engine("en-US"), engine("zh-Hans-CN")], &bitmap).unwrap();
        eprintln!("en-US + zh-Hans: {content:?}");
        assert!(!english_only.contains('你'), "en-US read Chinese?");
        // The zh-Hans engine reads the Latin line less cleanly (l -> I), but
        // it is the only one that keeps the Chinese at all.
        assert!(content.contains("He"), "unexpected content: {content:?}");
        assert!(
            content.contains("你好世界"),
            "unexpected content: {content:?}"
        );
    }

    #[test]
    fn reports_missing_image_as_error() {
        let result = recognize_cut_file(std::path::Path::new("/nonexistent/ocr.png"));
        assert!(result.is_err());
    }
}
