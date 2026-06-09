// Writing flow: stream a translation into whatever input box the user has
// focused in their active app.
//
// HISTORY / DESIGN NOTE
// ---------------------
// The previous implementation typed a status placeholder ("<Translating ✍️>",
// later " ✅") *into* the input as a progress animation and then removed it
// with simulated Backspace keystrokes. That was the root cause of the
// "Writing eats extra characters" bug: `backspace_click` blindly sends N
// `key code 51` events via AppleScript with no knowledge of grapheme widths
// (e.g. `✍️` = U+270D + U+FE0F is 2 Rust chars but one grapheme, so most
// fields treat one Backspace as deleting the whole emoji → off-by-one),
// IME composition state, autocomplete, or whether the cursor is still where
// we think it is.
//
// The fix: the "translating…" / "done" indicator now lives in a separate
// floating panel (see `windows::get_writing_indicator_window`) anchored just
// below the input. This module no longer types anything decorative into the
// user's input and no longer simulates Backspace or arrow keys. The only
// keystrokes it produces are the literal translated text itself, optionally
// preceded by ⌘A (select-all) to replace the existing content.
//
// As a consequence, the old "incremental re-edit + invisible fingerprint"
// optimisation (which surgically patched diffs in already-translated text
// using arrow keys + Backspace) has been removed — re-triggering writing on
// already-translated text now performs a full select-all + retype, which is
// the only way to guarantee zero over-deletion.

use crate::utils::{
    get_focused_text_via_ax, get_selected_text_by_clipboard, get_selected_text_via_ax,
    get_writing_anchor_rect, select_all, INPUT_LOCK,
};
use crate::APP_HANDLE;
use debug_print::debug_println;
use enigo::*;
use parking_lot::Mutex;
use std::{thread, time::Duration};
use tauri::{Emitter, Manager};
use tauri_plugin_aptabase::EventTracker;

static IS_WRITING: Mutex<bool> = Mutex::new(false);
static IS_FIRST_CHUNK: Mutex<bool> = Mutex::new(true);

/// How the first streamed chunk should erase whatever's currently in the input.
#[derive(Clone, Copy)]
enum FirstChunkMode {
    /// The user had a selection when they triggered writing; the selection is
    /// still active, so simply typing the chunk replaces it (zero extra
    /// keystrokes, zero Backspace).
    ReplaceSelection,
    /// No selection — we're rewriting the whole field. Issue ⌘A right before
    /// the first chunk so typing replaces all existing content.
    SelectAllThenType,
}

static FIRST_CHUNK_MODE: Mutex<FirstChunkMode> = Mutex::new(FirstChunkMode::SelectAllThenType);

/// Anchor rect (logical screen points, top-left origin) captured at the moment
/// `writing_command` ran — *before* anything moved focus or changed selection.
/// The frontend later asks `show_writing_indicator` (in `windows.rs`) to read
/// this so the indicator panel can be placed under the right input.
static CACHED_ANCHOR: Mutex<Option<(f64, f64, f64, f64)>> = Mutex::new(None);

/// Non-destructive read of the most recent anchor rect. The anchor lives until
/// the *next* `writing_command` overwrites it, so duplicate / re-triggered
/// indicator shows still get a valid position.
pub fn peek_cached_anchor() -> Option<(f64, f64, f64, f64)> {
    *CACHED_ANCHOR.lock()
}

struct WritingGuard {
    committed: bool,
}

impl WritingGuard {
    fn new() -> Option<Self> {
        let mut is_writing = IS_WRITING.lock();
        if *is_writing {
            return None;
        }
        *is_writing = true;
        Some(Self { committed: false })
    }

    fn commit(&mut self) {
        self.committed = true;
    }
}

impl Drop for WritingGuard {
    fn drop(&mut self) {
        if !self.committed {
            *IS_WRITING.lock() = false;
        }
    }
}

pub fn get_input_text(
    enigo: &mut Enigo,
    cancel_select: bool,
) -> Result<String, Box<dyn std::error::Error>> {
    select_all(enigo);
    get_selected_text_by_clipboard(enigo, cancel_select)
}

#[tauri::command]
#[specta::specta]
pub fn writing_command() {
    debug_println!("[writing] trigger");
    let mut writing_guard = match WritingGuard::new() {
        Some(guard) => guard,
        None => return,
    };
    let app_handle = APP_HANDLE.get().unwrap();
    let _ = app_handle.track_event("writing", None);

    // Reset per-invocation state.
    *IS_FIRST_CHUNK.lock() = true;

    // Snapshot the anchor rect (selection bounds, falling back to focused
    // element frame) BEFORE we touch the clipboard / fire ⌘C, so the indicator
    // panel can sit exactly under the input the user just acted on.
    *CACHED_ANCHOR.lock() = get_writing_anchor_rect();

    let mut enigo = Enigo::new(&Settings::default()).unwrap();

    // PREFERRED PATH (clean): read selection/value straight from the macOS
    // Accessibility tree. No clipboard hijack, no ⌘A flash, no cursor jump.
    //
    // FALLBACK: if AX returns nothing (app doesn't expose AX, custom Electron
    // input, focused element doesn't support the attribute, accessibility
    // permission denied, non-macOS, etc.), drop down to the old select-all +
    // copy dance. That path still works everywhere; it's just dirty.
    if let Some(selected_text) = get_selected_text_via_ax() {
        debug_println!(
            "[writing] read selection via AX ({} chars)",
            selected_text.chars().count()
        );
        *FIRST_CHUNK_MODE.lock() = FirstChunkMode::ReplaceSelection;
        writing_guard.commit();
        crate::utils::writing_text(selected_text);
        return;
    }
    if let Some(content) = get_focused_text_via_ax() {
        let content = content.replace("\r\n", "\n");
        let trimmed_empty = content.trim().is_empty();
        if !trimmed_empty {
            debug_println!(
                "[writing] read full value via AX ({} chars)",
                content.chars().count()
            );
            *FIRST_CHUNK_MODE.lock() = FirstChunkMode::SelectAllThenType;
            writing_guard.commit();
            crate::utils::writing_text(content);
            return;
        }
    }

    debug_println!("[writing] AX returned nothing — falling back to clipboard read");
    let selected_text = get_selected_text_by_clipboard(&mut enigo, false).unwrap_or_default();
    if !selected_text.is_empty() {
        *FIRST_CHUNK_MODE.lock() = FirstChunkMode::ReplaceSelection;
        writing_guard.commit();
        crate::utils::writing_text(selected_text);
        return;
    }
    let mut content = get_input_text(&mut enigo, true).unwrap_or_default();
    if content.ends_with("\r\n") {
        content.truncate(content.len() - 2);
    }
    let content = content.replace("\r\n", "\n");
    if content.trim().is_empty() {
        return;
    }
    debug_println!("[writing] clipboard content: {:?}", content.chars());

    *FIRST_CHUNK_MODE.lock() = FirstChunkMode::SelectAllThenType;
    writing_guard.commit();
    crate::utils::writing_text(content);
}

fn do_write_to_input(enigo: &mut Enigo, text: String, animation: bool) {
    let _guard = INPUT_LOCK.lock();
    if animation {
        for c in text.chars() {
            let char = c.to_string();
            if char == "\n" {
                if let Ok(config) = crate::config::get_config() {
                    if let Some(writing_newline_hotkey) = config.writing_newline_hotkey {
                        let keys = writing_newline_hotkey
                            .split('+')
                            .map(|c| c.trim())
                            .collect::<Vec<&str>>();
                        for key in &keys {
                            if key.len() == 1 {
                                enigo
                                    .key(
                                        Key::Unicode(key.chars().next().unwrap()),
                                        Direction::Press,
                                    )
                                    .unwrap_or_default();
                            } else {
                                match *key {
                                    "ctrl" => enigo.key(Key::Control, Direction::Press).unwrap(),
                                    "alt" => enigo.key(Key::Alt, Direction::Press).unwrap(),
                                    "shift" => enigo.key(Key::Shift, Direction::Press).unwrap(),
                                    "meta" => enigo.key(Key::Meta, Direction::Press).unwrap(),
                                    "caps_lock" => {
                                        enigo.key(Key::CapsLock, Direction::Press).unwrap()
                                    }
                                    "escape" => enigo.key(Key::Escape, Direction::Press).unwrap(),
                                    "enter" => enigo.key(Key::Return, Direction::Press).unwrap(),
                                    _ => {}
                                }
                            }
                        }
                        for key in keys.iter().rev() {
                            if key.len() == 1 {
                                enigo
                                    .key(
                                        Key::Unicode(key.chars().next().unwrap()),
                                        Direction::Release,
                                    )
                                    .unwrap_or_default();
                            } else {
                                match *key {
                                    "ctrl" => enigo.key(Key::Control, Direction::Release).unwrap(),
                                    "alt" => enigo.key(Key::Alt, Direction::Release).unwrap(),
                                    "shift" => enigo.key(Key::Shift, Direction::Release).unwrap(),
                                    "meta" => enigo.key(Key::Meta, Direction::Release).unwrap(),
                                    "caps_lock" => {
                                        enigo.key(Key::CapsLock, Direction::Release).unwrap()
                                    }
                                    "escape" => enigo.key(Key::Escape, Direction::Release).unwrap(),
                                    "enter" => enigo.key(Key::Return, Direction::Release).unwrap(),
                                    _ => {}
                                }
                            }
                        }
                        continue;
                    }
                }
            }
            enigo.text(&char).unwrap_or_default();
            thread::sleep(Duration::from_millis(20));
        }
    } else {
        enigo.text(&text).unwrap_or_default();
    }
}

#[tauri::command]
#[specta::specta]
pub fn write_to_input(text: String) {
    let mut enigo = Enigo::new(&Settings::default()).unwrap();

    let mut is_first = IS_FIRST_CHUNK.lock();
    if *is_first {
        *is_first = false;
        match *FIRST_CHUNK_MODE.lock() {
            FirstChunkMode::SelectAllThenType => {
                // Replace existing content by selecting all then typing the
                // chunk over it. No Backspace involved.
                select_all(&mut enigo);
                thread::sleep(Duration::from_millis(50));
            }
            FirstChunkMode::ReplaceSelection => {
                // The user's original selection is still active (we never
                // cancelled it in `writing_command`); typing replaces it.
                // Intentionally no keystroke here.
            }
        }
    }
    drop(is_first);

    do_write_to_input(&mut enigo, text, true);
}

#[tauri::command]
#[specta::specta]
pub fn finish_writing() {
    debug_println!("[writing] finish_writing called");
    *IS_WRITING.lock() = false;
    *IS_FIRST_CHUNK.lock() = true;
    // Tell the indicator panel to flash "done", THEN hide the window from Rust
    // ourselves. Previously we relied on React to chain setTimeout → call
    // `hideWritingIndicator()` — but the dev-build logs showed the panel's
    // listener was not firing reliably across all macOS/Tauri builds (the
    // broadcast emit succeeded but the JS-side `listen('writing-indicator-
    // -finish', ...)` callback never ran). So hiding is now Rust-authoritative
    // and React's only job is the visual "Done" flash if it does receive the
    // event.
    //
    // Why 700ms: matches React's "hold Done before fade" duration. If React
    // received the finish event it played the check + fade in that window;
    // if not, the user just sees the bar disappear cleanly after the same
    // delay. No more 1.5s ghost panel.
    if let Some(handle) = APP_HANDLE.get() {
        match handle.emit("writing-indicator-finish", ()) {
            Ok(_) => {
                debug_println!("[writing] emitted writing-indicator-finish");
            }
            Err(e) => {
                debug_println!("[writing] FAILED to emit finish: {:?}", e);
            }
        }

        let handle_clone = handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(700));
            *crate::windows::WRITING_INDICATOR_PENDING_LANG.lock() = None;
            if let Some(window) =
                handle_clone.get_webview_window(crate::windows::WRITING_INDICATOR_WIN_NAME)
            {
                let _ = window.set_always_on_top(false);
                let _ = window.hide();
                crate::windows::set_webview_visibility(&window, false);
                debug_println!("[writing] indicator window hidden by Rust authoritative path");
            }
        });
    }
}
