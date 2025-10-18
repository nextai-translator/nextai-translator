use std::thread;
use std::time::Duration;

use active_win_pos_rs::{get_active_window, ActiveWindow};
use debug_print::debug_println;
use enigo::{Enigo, Keyboard, Settings};
use parking_lot::Mutex;

use crate::utils::INPUT_LOCK;

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

#[cfg(target_os = "macos")]
fn focus_window(window: &ActiveWindow) -> Result<(), String> {
    use cocoa::appkit::{NSApplicationActivateIgnoringOtherApps, NSRunningApplication};
    use cocoa::base::{id, nil};

    unsafe {
        let running_app: id = <id as NSRunningApplication>::runningApplicationWithProcessIdentifier(
            nil,
            window.process_id as i32,
        );
        if running_app != nil {
            let activated = NSRunningApplication::activateWithOptions_(
                running_app,
                NSApplicationActivateIgnoringOtherApps,
            );
            if activated {
                debug_println!(
                    "[insertion] activated app via NSRunningApplication: {}",
                    window.app_name
                );
                return Ok(());
            } else {
                debug_println!(
                    "[insertion] NSRunningApplication activation returned false for {}",
                    window.app_name
                );
            }
        } else {
            debug_println!(
                "[insertion] NSRunningApplication not found for pid {} ({})",
                window.process_id,
                window.app_name
            );
        }
    }

    if window.app_name.is_empty() {
        return Err("previous window app name is empty".to_string());
    }
    let script = format!(
        r#"tell application "{}" to activate"#,
        window.app_name.replace('"', "\\\"")
    );
    let status = std::process::Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        debug_println!(
            "[insertion] activated app via AppleScript: {}",
            window.app_name
        );
        Ok(())
    } else {
        Err(format!("failed to focus app {}", window.app_name))
    }
}

#[cfg(target_os = "windows")]
fn parse_hwnd(window_id: &str) -> Result<windows::Win32::Foundation::HWND, String> {
    use windows::Win32::Foundation::HWND;

    let trimmed = window_id.trim();
    let hex_str = trimmed
        .strip_prefix("HWND(")
        .and_then(|s| s.strip_suffix(')'))
        .ok_or_else(|| format!("invalid window id format: {}", window_id))?
        .trim_start_matches("0x");
    let value = usize::from_str_radix(hex_str, 16)
        .map_err(|_| format!("failed to parse window id {}", window_id))?;
    Ok(HWND(value as isize))
}

#[cfg(target_os = "windows")]
fn focus_window(window: &ActiveWindow) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Threading::GetCurrentThreadId;
    use windows::Win32::UI::WindowsAndMessaging::{
        AttachThreadInput, BringWindowToTop, GetForegroundWindow, GetWindowThreadProcessId,
        IsIconic, SetForegroundWindow, ShowWindow, SW_RESTORE,
    };

    let hwnd = parse_hwnd(&window.window_id)?;

    unsafe {
        if IsIconic(hwnd).as_bool() {
            ShowWindow(hwnd, SW_RESTORE);
        }
        let fg_window: HWND = GetForegroundWindow();
        let target_thread_id = GetWindowThreadProcessId(hwnd, None);
        let foreground_thread_id = GetWindowThreadProcessId(fg_window, None);
        let current_thread_id = GetCurrentThreadId();

        if target_thread_id == 0 {
            return Err("failed to get target thread id".to_string());
        }

        // Attach our thread to the foreground thread to bypass focus restrictions.
        AttachThreadInput(foreground_thread_id, current_thread_id, true);
        AttachThreadInput(target_thread_id, current_thread_id, true);

        BringWindowToTop(hwnd);
        let success = SetForegroundWindow(hwnd);

        AttachThreadInput(foreground_thread_id, current_thread_id, false);
        AttachThreadInput(target_thread_id, current_thread_id, false);

        if success.as_bool() {
            Ok(())
        } else {
            Err("SetForegroundWindow failed".to_string())
        }
    }
}

#[cfg(target_os = "linux")]
fn focus_window(window: &ActiveWindow) -> Result<(), String> {
    use xcb::x;
    use xcb::XidNew;

    let window_id: u32 = window
        .window_id
        .parse()
        .map_err(|_| format!("invalid window id {}", window.window_id))?;

    let (conn, screen_num) = xcb::Connection::connect(None).map_err(|e| e.to_string())?;
    let setup = conn.get_setup();
    let screen = setup
        .roots()
        .nth(screen_num as usize)
        .ok_or_else(|| "failed to get screen".to_string())?;
    let root = screen.root();

    let atom = |name: &str| -> Result<x::Atom, String> {
        let cookie = conn.send_request(&x::InternAtom {
            only_if_exists: false,
            name: name.as_bytes(),
        });
        conn.wait_for_reply(cookie)
            .map(|reply| reply.atom())
            .map_err(|e| e.to_string())
    };

    let net_active_window = atom("_NET_ACTIVE_WINDOW")?;

    let data = x::ClientMessageData::Data32([1, x::CURRENT_TIME, window_id, 0, 0]);
    let window = unsafe { x::Window::new(window_id) };
    let event = x::ClientMessageEvent::new(window, net_active_window, data);

    conn.send_request(&x::SendEvent {
        propagate: false,
        destination: x::SendEventDest::Window(root),
        event: &event,
        event_mask: x::EventMask::SUBSTRUCTURE_REDIRECT | x::EventMask::SUBSTRUCTURE_NOTIFY,
    });
    conn.flush().map_err(|e| e.to_string())?;

    Ok(())
}

fn focus_previous_window() -> Result<(), String> {
    if let Some(window) = PREVIOUS_ACTIVE_WINDOW.lock().clone() {
        debug_println!(
            "[insertion] focusing previous window: {}",
            describe_window(&window)
        );
        let result = focus_window(&window);
        if let Err(ref err) = result {
            debug_println!("[insertion] failed to focus window: {}", err);
        }
        result
    } else {
        debug_println!("[insertion] no previous window recorded");
        Err("no previous window recorded".to_string())
    }
}

fn replace_input_with_text(text: &str) -> Result<(), String> {
    if text.is_empty() {
        return Ok(());
    }

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    {
        let _input_lock = INPUT_LOCK.lock();
        enigo.text(text).map_err(|e| e.to_string())?;
    }
    thread::sleep(Duration::from_millis(80));

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn insert_translation_into_previous_input(text: String) -> Result<(), String> {
    focus_previous_window()?;
    thread::sleep(Duration::from_millis(200));
    replace_input_with_text(&text)?;
    debug_println!("[insertion] inserted translation ({} chars)", text.len());
    Ok(())
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
