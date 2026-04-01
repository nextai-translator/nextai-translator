use active_win_pos_rs::{get_active_window, ActiveWindow};
use debug_print::debug_println;
use parking_lot::Mutex;

static PREVIOUS_ACTIVE_WINDOW: Mutex<Option<ActiveWindow>> = Mutex::new(None);

fn is_translator_process(window: &ActiveWindow) -> bool {
    window.process_id == std::process::id() as u64
}

pub fn remember_active_window() {
    if let Ok(window) = get_active_window() {
        if !is_translator_process(&window) {
            debug_println!(
                "[insertion] remembered window: {}",
                describe_window(&window)
            );
            *PREVIOUS_ACTIVE_WINDOW.lock() = Some(window);
        } else {
            debug_println!("[insertion] active window is translator, skipping");
        }
    } else {
        debug_println!("[insertion] failed to fetch active window");
    }
}

fn describe_window(window: &ActiveWindow) -> String {
    format!(
        "title='{}', app='{}', pid={}, id={}",
        window.title, window.app_name, window.process_id, window.window_id
    )
}

#[tauri::command]
#[specta::specta]
pub fn remember_active_window_command() -> bool {
    let before = PREVIOUS_ACTIVE_WINDOW.lock().clone();
    remember_active_window();
    let has_window = PREVIOUS_ACTIVE_WINDOW.lock().is_some() || before.is_some();
    debug_println!(
        "[insertion] remember_active_window_command called, has_window={}",
        has_window
    );
    has_window
}
