use tauri::Emitter;

use crate::APP_HANDLE;

pub fn send_text(text: String) {
    if let Some(handle) = APP_HANDLE.get() {
        handle.emit("change-text", text).unwrap_or_default();
    }
}

pub fn show() {
    if let Some(handle) = APP_HANDLE.get() {
        handle.emit("show", "").unwrap_or_default();
    }
}

