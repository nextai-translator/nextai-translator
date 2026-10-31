use debug_print::debug_println;
use futures_util::stream::{AbortHandle, Abortable};
use futures_util::StreamExt;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

use reqwest::{
    header::{HeaderMap, HeaderName},
    Client,
};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Listener};

use crate::config::{get_config, ProxyProtocol};
use crate::APP_HANDLE;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct FetchOptions {
    #[serde(default)]
    method: Option<String>,
    #[serde(default)]
    headers: HashMap<String, String>,
    #[serde(default)]
    body: Option<String>,
}

/// Latency breakdown of the request, measured where JS cannot see it.
/// Times are millis since the command was entered.
#[derive(Debug, Default, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FetchTimings {
    /// Client lookup/build, i.e. our own overhead before touching the network.
    client_ms: u64,
    /// `send()` until response headers: DNS + TCP + TLS + request round trip +
    /// however long the provider queued the request before answering.
    headers_ms: u64,
    /// Command entry until the first response body chunk (the earliest moment
    /// the UI could possibly show a character).
    #[serde(skip_serializing_if = "Option::is_none")]
    first_chunk_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct StreamChunk {
    id: String,
    data: String,
    done: bool,
    status: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    timings: Option<FetchTimings>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct StreamStatusCode {
    id: String,
    status: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    timings: Option<FetchTimings>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct AbortEventPayload {
    id: String,
}

/// Reusing the client is what lets reqwest reuse the TCP/TLS connection:
/// building one per request (the old behaviour) paid a full DNS + handshake
/// on *every* translation, which is a large, invisible chunk of the delay
/// before the first character.
static CLIENT_CACHE: Lazy<Mutex<HashMap<String, Client>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Keeping the pool small: the key is the proxy configuration, and a user
/// rarely has more than a couple of them.
const MAX_CACHED_CLIENTS: usize = 4;

struct ResolvedProxy {
    /// Identifies the client configuration; never logged.
    signature: String,
    proxy: Option<reqwest::Proxy>,
}

fn resolve_proxy() -> ResolvedProxy {
    let mut signature = String::from("direct");
    let mut proxy = None;

    if let Ok(config) = get_config() {
        if let Some(proxy_config) = config.proxy {
            if proxy_config.enabled.unwrap_or(false)
                && proxy_config.protocol.is_some()
                && proxy_config.server.is_some()
                && proxy_config.port.is_some()
            {
                let proxy_url = format!(
                    "{}:{}",
                    proxy_config.server.clone().unwrap_or_default(),
                    proxy_config.port.clone().unwrap_or_default()
                );
                let proxy_url = match proxy_config.protocol.clone().unwrap() {
                    ProxyProtocol::HTTP => format!("http://{}", proxy_url),
                    ProxyProtocol::HTTPS => format!("https://{}", proxy_url),
                };
                match reqwest::Proxy::all(&proxy_url) {
                    Ok(mut p) => {
                        let mut signature_parts = vec![proxy_url.clone()];
                        if let Some(basic_auth) = proxy_config.basic_auth.clone() {
                            let username = basic_auth.username.unwrap_or_default();
                            let password = basic_auth.password.unwrap_or_default();
                            if !username.is_empty() {
                                signature_parts.push(format!("{}:{}", username, password));
                                p = p.basic_auth(&username, &password);
                            }
                        }
                        if let Some(no_proxy) = proxy_config.no_proxy.clone() {
                            signature_parts.push(no_proxy.clone());
                            if let Some(no_proxy) = reqwest::NoProxy::from_string(&no_proxy) {
                                p = p.no_proxy(Some(no_proxy));
                            }
                        }
                        signature = signature_parts.join("|");
                        proxy = Some(p);
                    }
                    Err(err) => println!("ignoring invalid proxy configuration: {}", err),
                }
            }
        }
    }

    ResolvedProxy { signature, proxy }
}

fn build_client(proxy: Option<reqwest::Proxy>) -> Result<Client, String> {
    let mut builder = Client::builder()
        .tcp_nodelay(true)
        .connect_timeout(Duration::from_secs(15))
        .pool_idle_timeout(Duration::from_secs(120))
        .pool_max_idle_per_host(16)
        // Keep the pooled connection warm between translations: an idle
        // connection that the server silently dropped costs a full handshake
        // again on the next request.
        .http2_keep_alive_interval(Duration::from_secs(30))
        .http2_keep_alive_while_idle(true);
    if let Some(proxy) = proxy {
        builder = builder.proxy(proxy);
    }
    builder
        .build()
        .map_err(|err| format!("failed to generate client: {}", err))
}

fn get_client() -> Result<Client, String> {
    let resolved = resolve_proxy();
    if let Some(client) = CLIENT_CACHE.lock().get(&resolved.signature) {
        return Ok(client.clone());
    }
    let client = build_client(resolved.proxy)?;
    let mut cache = CLIENT_CACHE.lock();
    if cache.len() >= MAX_CACHED_CLIENTS {
        cache.clear();
    }
    cache.insert(resolved.signature, client.clone());
    Ok(client)
}

/// Decodes the next network chunk into text, holding back a trailing partial
/// UTF-8 sequence until the next chunk completes it.
///
/// Network chunks are byte slices of the body and have no reason to respect
/// character boundaries: `String::from_utf8_lossy` on a single chunk turns
/// every split CJK character into U+FFFD, which is exactly what a streamed
/// translation is full of (the SSE chunks of a Chinese answer are rarely
/// aligned to 3-byte characters).
fn decode_stream_chunk(pending: &mut Vec<u8>, chunk: &[u8]) -> String {
    pending.extend_from_slice(chunk);
    match std::str::from_utf8(pending) {
        Ok(text) => {
            let text = text.to_string();
            pending.clear();
            text
        }
        Err(err) => {
            let valid_up_to = err.valid_up_to();
            let mut text = String::from_utf8_lossy(&pending[..valid_up_to]).to_string();
            if err.error_len().is_some() {
                // Genuinely invalid bytes, not a split sequence: the body is not
                // UTF-8, so keep going lossily instead of buffering forever.
                text.push_str(&String::from_utf8_lossy(&pending[valid_up_to..]));
                pending.clear();
            } else {
                // Incomplete sequence at the end: keep it for the next chunk.
                pending.drain(..valid_up_to);
            }
            text
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_stream(id: String, url: String, options_str: String) -> Result<String, String> {
    let command_started = Instant::now();
    let options: FetchOptions = serde_json::from_str(&options_str)
        .map_err(|err| format!("failed to parse fetch options: {}", err))?;

    let mut headers = HeaderMap::new();
    for (key, value) in options.headers {
        let name = key
            .parse::<HeaderName>()
            .map_err(|err| format!("invalid header name {}: {}", key, err))?;
        let value = value
            .parse::<reqwest::header::HeaderValue>()
            .map_err(|err| format!("invalid value for header {}: {}", key, err))?;
        headers.insert(name, value);
    }

    let client = get_client()?;
    let client_ms = command_started.elapsed().as_millis() as u64;

    let method = options.method.unwrap_or_else(|| "POST".to_string());
    let mut request_builder = client
        .request(
            method
                .parse()
                .map_err(|err| format!("failed to parse method: {}", err))?,
            url.parse::<reqwest::Url>()
                .map_err(|err| format!("failed to parse url: {}", err))?,
        )
        .headers(headers);
    if let Some(body) = options.body {
        request_builder = request_builder.body(body);
    }

    let send_started = Instant::now();
    let resp = request_builder
        .send()
        .await
        .map_err(|err| format!("failed to call API: {}", err))?;
    let headers_ms = send_started.elapsed().as_millis() as u64;

    let status = resp.status();

    let app_handle = APP_HANDLE.get().unwrap();
    let _ = app_handle.emit(
        "fetch-stream-status-code",
        StreamStatusCode {
            id: id.clone(),
            status: status.as_u16(),
            timings: Some(FetchTimings {
                client_ms,
                headers_ms,
                first_chunk_ms: None,
            }),
        },
    );

    let stream = resp.bytes_stream();

    let (abort_handle, abort_registration) = AbortHandle::new_pair();
    let cloned_id = id.clone();
    let listen_id = app_handle.listen_any("abort-fetch-stream", move |msg| {
        let payload: AbortEventPayload = match serde_json::from_str(&msg.payload()) {
            Ok(payload) => payload,
            Err(_) => return,
        };
        if payload.id == cloned_id {
            debug_println!("aborting fetch stream: {}", payload.id);
            abort_handle.abort();
        } else {
            debug_println!("ignoring abort event for: {}", payload.id);
        }
    });

    let mut stream = Abortable::new(stream, abort_registration);

    let mut chunk_count: u64 = 0;
    let mut first_chunk_ms: Option<u64> = None;
    let mut timings_sent = false;
    let mut pending_bytes: Vec<u8> = Vec::new();
    let result: Result<(), String> = async {
        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|err| format!("failed to read response chunk: {}", err))?;
            chunk_count += 1;
            if chunk_count == 1 {
                first_chunk_ms = Some(command_started.elapsed().as_millis() as u64);
            }
            let chunk_str = decode_stream_chunk(&mut pending_bytes, &chunk);
            if chunk_str.is_empty() {
                // Only a partial character so far: nothing to deliver yet, but
                // the timing is already recorded above.
                continue;
            }
            let timings = if timings_sent {
                None
            } else {
                timings_sent = true;
                Some(FetchTimings {
                    client_ms,
                    headers_ms,
                    first_chunk_ms,
                })
            };
            // A dropped event must not panic the command: the stream would
            // stay half-delivered and take the whole window down with it.
            if app_handle
                .emit(
                    "fetch-stream-chunk",
                    StreamChunk {
                        id: id.clone(),
                        data: chunk_str,
                        done: false,
                        status: status.as_u16(),
                        timings,
                    },
                )
                .is_err()
            {
                break;
            }
        }
        Ok(())
    }
    .await;

    // A body that ended in the middle of a character still has to be delivered.
    if !pending_bytes.is_empty() {
        let tail = String::from_utf8_lossy(&pending_bytes).to_string();
        pending_bytes.clear();
        if !tail.is_empty() {
            let _ = app_handle.emit(
                "fetch-stream-chunk",
                StreamChunk {
                    id: id.clone(),
                    data: tail,
                    done: false,
                    status: status.as_u16(),
                    timings: None,
                },
            );
        }
    }
    // The abort listener used to leak on the error path (`?` skipped the
    // unlisten), and every leaked listener is woken by every later abort.
    app_handle.unlisten(listen_id);

    debug_println!("chunk done!");
    // The one line that separates "our network layer is slow" from "the model
    // took a second to think", printed before the terminal chunk so it shows up
    // even if the consumer drops the stream.
    println!(
        "[ttft][rust] client={}ms headers={}ms first_chunk={}ms chunks={} total={}ms status={}",
        client_ms,
        headers_ms,
        first_chunk_ms
            .map(|value| value.to_string())
            .unwrap_or_else(|| "-".to_string()),
        chunk_count,
        command_started.elapsed().as_millis(),
        status.as_u16()
    );

    let _ = app_handle.emit(
        "fetch-stream-chunk",
        StreamChunk {
            id: id.clone(),
            data: "".to_string(),
            done: true,
            status: status.as_u16(),
            timings: None,
        },
    );

    result?;

    Ok("".to_string())
}

/// Receives the renderer's finished latency traces and prints them to the
/// app's stdout, which is the only observability channel a packaged build
/// reliably has.
#[tauri::command]
#[specta::specta]
pub fn log_perf_line(line: String) {
    println!("{}", line);
}

#[cfg(test)]
mod tests {
    use super::decode_stream_chunk;

    #[test]
    fn reassembles_characters_split_across_chunks() {
        let text = "你好，世界 hello";
        let mut pending: Vec<u8> = Vec::new();
        let mut decoded = String::new();
        // One byte at a time: every multi-byte character is split.
        for byte in text.as_bytes() {
            decoded.push_str(&decode_stream_chunk(&mut pending, &[*byte]));
        }
        assert_eq!(decoded, text);
        assert!(pending.is_empty());
    }

    #[test]
    fn keeps_a_trailing_partial_sequence_for_the_next_chunk() {
        let bytes = "你".as_bytes();
        let mut pending: Vec<u8> = Vec::new();
        assert_eq!(decode_stream_chunk(&mut pending, &bytes[..1]), "");
        assert_eq!(decode_stream_chunk(&mut pending, &bytes[1..2]), "");
        assert_eq!(decode_stream_chunk(&mut pending, &bytes[2..]), "你");
        assert!(pending.is_empty());
    }

    #[test]
    fn does_not_buffer_genuinely_invalid_bytes_forever() {
        let mut pending: Vec<u8> = Vec::new();
        let decoded = decode_stream_chunk(&mut pending, &[0xff, 0xfe, b'a']);
        assert!(pending.is_empty());
        assert!(decoded.ends_with('a'));
    }
}
