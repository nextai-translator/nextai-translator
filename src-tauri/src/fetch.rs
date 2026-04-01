use debug_print::debug_println;
use futures_util::stream::{AbortHandle, Abortable};
use futures_util::StreamExt;
use std::collections::HashMap;

use reqwest::{
    header::{HeaderMap, HeaderName},
    Client,
};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Listener};

use crate::config::{get_config, ProxyProtocol};
use crate::APP_HANDLE;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct FetchOptions {
    method: String,
    headers: HashMap<String, String>,
    body: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct StreamChunk {
    id: String,
    data: String,
    done: bool,
    status: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct StreamStatusCode {
    id: String,
    status: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct AbortEventPayload {
    id: String,
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_stream(id: String, url: String, options_str: String) -> Result<String, String> {
    let options: FetchOptions = serde_json::from_str(&options_str).unwrap();
    debug_println!("[fetch_stream] id={} {} {}", id, options.method, url);
    let mut headers = HeaderMap::new();
    for (key, value) in options.headers {
        headers.insert(key.parse::<HeaderName>().unwrap(), value.parse().unwrap());
    }

    let mut client_builder = Client::builder().default_headers(headers);

    // For local Ollama (and other local services), never route through a proxy.
    // A misconfigured proxy often returns 502 with empty body.
    let is_local_url = url
        .parse::<reqwest::Url>()
        .ok()
        .and_then(|u| u.host_str().map(|h| h.eq_ignore_ascii_case("localhost") || h == "127.0.0.1"))
        .unwrap_or(false);
    if is_local_url {
        // Also disable proxy from environment variables (HTTP_PROXY, etc).
        client_builder = client_builder.no_proxy();
        debug_println!("[fetch_stream] no_proxy enabled for local url");
    }

    if let Ok(config) = get_config() {
        if let Some(proxy_config) = config.proxy {
            if proxy_config.enabled.unwrap_or(false)
                && proxy_config.protocol.is_some()
                && proxy_config.server.is_some()
                && proxy_config.port.is_some()
            {
                if is_local_url {
                    debug_println!("[fetch_stream] proxy enabled but bypassed for local url");
                } else {
                let proxy_url = format!(
                    "{}:{}",
                    proxy_config.server.unwrap_or_default(),
                    proxy_config.port.unwrap_or_default()
                );
                let proxy_url = match proxy_config.protocol.unwrap() {
                    ProxyProtocol::HTTP => format!("http://{}", proxy_url),
                    ProxyProtocol::HTTPS => format!("https://{}", proxy_url),
                };
                debug_println!("[fetch_stream] using proxy {}", proxy_url);
                let mut proxy = reqwest::Proxy::all(&proxy_url).unwrap();
                if let Some(basic_auth) = proxy_config.basic_auth {
                    let username = basic_auth.username.unwrap_or_default();
                    if username.len() > 0 {
                        proxy =
                            proxy.basic_auth(&username, &basic_auth.password.unwrap_or_default());
                    }
                }
                if let Some(no_proxy) = proxy_config.no_proxy {
                    proxy = proxy.no_proxy(Some(reqwest::NoProxy::from_string(&no_proxy).unwrap()));
                }
                client_builder = client_builder.proxy(proxy);
                }
            }
        }
    }

    let client = client_builder
        .build()
        .map_err(|err| format!("failed to generate client: {}", err))?;

    let request_builder = client.request(
        options
            .method
            .parse()
            .map_err(|err| format!("failed to parse method: {}", err))?,
        url.parse::<reqwest::Url>()
            .map_err(|err| format!("failed to parse url: {}", err))?,
    );

    let resp = request_builder
        .body(options.body)
        .send()
        .await
        .map_err(|err| format!("failed to call API: {}", err))?;

    let status = resp.status();
    debug_println!("[fetch_stream] status={} for {}", status.as_u16(), url);

    let app_handle = APP_HANDLE.get().unwrap();
    app_handle
        .emit(
            "fetch-stream-status-code",
            StreamStatusCode {
                id: id.clone(),
                status: status.as_u16(),
            },
        )
        .unwrap();

    // If the request failed, try to read the response body once and forward it to the frontend
    // so it can be surfaced via the existing `onError` path.
    if !status.is_success() {
        let err_text = resp
            .text()
            .await
            .unwrap_or_else(|e| format!("failed to read error response body: {}", e));
        debug_println!(
            "[fetch_stream] error body len={} (showing up to 400 chars): {}",
            err_text.len(),
            err_text.chars().take(400).collect::<String>()
        );
        app_handle
            .emit(
                "fetch-stream-chunk",
                StreamChunk {
                    id: id.clone(),
                    data: err_text,
                    done: false,
                    status: status.as_u16(),
                },
            )
            .unwrap();
        debug_println!("chunk done!");
        app_handle
            .emit(
                "fetch-stream-chunk",
                StreamChunk {
                    id: id.clone(),
                    data: "".to_string(),
                    done: true,
                    status: status.as_u16(),
                },
            )
            .unwrap();
        return Ok("".to_string());
    }

    let stream = resp.bytes_stream();

    let (abort_handle, abort_registration) = AbortHandle::new_pair();
    let cloned_id = id.clone();
    let listen_id = app_handle.listen_any("abort-fetch-stream", move |msg| {
        let payload: AbortEventPayload = serde_json::from_str(&msg.payload()).unwrap();
        if payload.id == cloned_id {
            debug_println!("aborting fetch stream: {}", payload.id);
            abort_handle.abort();
        } else {
            debug_println!("ignoring abort event for: {}", payload.id);
        }
    });

    let mut stream = Abortable::new(stream, abort_registration);

    while let Some(item) = stream.next().await {
        // debug_println!("chunk item: {:#?}", item);
        let chunk = item.map_err(|err| format!("failed to read response chunk: {}", err))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        debug_println!("[fetch_stream] chunk len={}", chunk_str.len());
        // debug_println!("chunk: {}", chunk_str);
        app_handle
            .emit(
                "fetch-stream-chunk",
                StreamChunk {
                    id: id.clone(),
                    data: chunk_str.to_string(),
                    done: false,
                    status: status.as_u16(),
                },
            )
            .unwrap();
    }

    debug_println!("chunk done!");
    app_handle
        .emit(
            "fetch-stream-chunk",
            StreamChunk {
                id: id.clone(),
                data: "".to_string(),
                done: true,
                status: status.as_u16(),
            },
        )
        .unwrap();

    app_handle.unlisten(listen_id);

    Ok("".to_string())
}
