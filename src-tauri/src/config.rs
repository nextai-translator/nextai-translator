use parking_lot::Mutex;
use tauri::Manager;
use tauri::{path::BaseDirectory, AppHandle};

use serde::{Deserialize, Serialize};

use crate::APP_HANDLE;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, specta::Type, tauri_specta::Event)]
pub struct ConfigUpdatedEvent;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ProxyProtocol {
    HTTP,
    HTTPS,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BasicAuth {
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProxyConfig {
    pub enabled: Option<bool>,
    pub protocol: Option<ProxyProtocol>,
    pub server: Option<String>,
    pub port: Option<String>,
    pub basic_auth: Option<BasicAuth>,
    pub no_proxy: Option<String>,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub hotkey: Option<String>,
    pub display_window_hotkey: Option<String>,
    pub ocr_hotkey: Option<String>,
    pub writing_hotkey: Option<String>,
    pub writing_newline_hotkey: Option<String>,
    pub restore_previous_position: Option<bool>,
    pub always_show_icons: Option<bool>,
    pub allow_using_clipboard_when_selected_text_not_available: Option<bool>,
    pub automatic_check_for_updates: Option<bool>,
    pub hide_the_icon_in_the_dock: Option<bool>,
    pub proxy: Option<ProxyConfig>,
    pub use_compact_lookup: Option<bool>,
}

static CONFIG_CACHE: Mutex<Option<Config>> = Mutex::new(None);

pub fn get_config() -> Result<Config, Box<dyn std::error::Error>> {
    let app_handle = APP_HANDLE.get().unwrap();
    get_config_by_app(app_handle)
}

pub fn get_config_by_app(app: &AppHandle) -> Result<Config, Box<dyn std::error::Error>> {
    let conf = _get_config_by_app(app);
    match conf {
        Ok(conf) => Ok(conf),
        Err(e) => {
            println!("get config failed: {}", e);
            Err(e)
        }
    }
}

pub fn _get_config_by_app(app: &AppHandle) -> Result<Config, Box<dyn std::error::Error>> {
    if let Some(config_cache) = &*CONFIG_CACHE.lock() {
        return Ok(config_cache.clone());
    }
    let config_content = get_config_content_by_app(app)?;
    // A config that fails typed deserialization (e.g. a field written with a
    // wrong type by some older version) must never prevent startup: the very
    // first get_config() happens while building the tray, before any window
    // exists, so an error here used to kill the app before anything appeared
    // on screen. Fall back to defaults and leave the file alone - the webview
    // reads it as untyped JSON and may still be perfectly happy with it.
    let config: Config = serde_json::from_str(&config_content).unwrap_or_else(|e| {
        println!("config.json does not match the expected schema ({e}), using defaults");
        Config::default()
    });
    CONFIG_CACHE.lock().replace(config.clone());
    Ok(config)
}

#[tauri::command]
#[specta::specta]
pub fn clear_config_cache() {
    CONFIG_CACHE.lock().take();
}

#[tauri::command]
#[specta::specta]
pub fn get_config_content() -> String {
    if let Some(app) = APP_HANDLE.get() {
        return get_config_content_by_app(app).unwrap_or_else(|_| "{}".to_string());
    } else {
        return "{}".to_string();
    }
}

pub fn get_config_content_by_app(app: &AppHandle) -> Result<String, String> {
    let app_paths = app.path();
    let app_config_dir = app_paths
        .resolve("xyz.yetone.apps.openai-translator", BaseDirectory::Config)
        .unwrap();
    if !app_config_dir.exists() {
        let old_config_dir = app_paths
            .resolve("xyz.yetone.apps.nextai-translator", BaseDirectory::Config)
            .unwrap();
        if old_config_dir.exists() {
            if std::fs::rename(&old_config_dir, &app_config_dir).is_err() {
                std::fs::create_dir_all(&app_config_dir).unwrap();
                if let Ok(entries) = std::fs::read_dir(&old_config_dir) {
                    for entry in entries.flatten() {
                        let target_path = app_config_dir.join(entry.file_name());
                        if let Ok(file_type) = entry.file_type() {
                            if file_type.is_file() {
                                let _ = std::fs::copy(entry.path(), &target_path);
                            }
                        }
                    }
                }
                let _ = std::fs::remove_dir_all(&old_config_dir);
            }
        } else {
            std::fs::create_dir_all(&app_config_dir).unwrap();
        }
    }
    let config_path = app_config_dir.join("config.json");
    if config_path.exists() {
        match std::fs::read_to_string(&config_path) {
            Ok(content) => {
                if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
                    Ok(content)
                } else {
                    // The file is not valid JSON - typically truncated by a
                    // crash or power loss in the middle of a settings save.
                    // It survives uninstall/reinstall, so without recovery
                    // here every version of the app crashes at launch
                    // forever. Keep the bytes for manual recovery and start
                    // over with defaults.
                    let _ =
                        std::fs::rename(&config_path, app_config_dir.join("config.json.corrupted"));
                    let _ = std::fs::write(&config_path, "{}");
                    Ok("{}".to_string())
                }
            }
            Err(_) => Err("Failed to read config file".to_string()),
        }
    } else {
        std::fs::write(config_path, "{}").unwrap();
        Ok("{}".to_string())
    }
}
