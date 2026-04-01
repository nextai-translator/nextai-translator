use crate::insertion::remember_active_window;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconEvent},
    Manager, Runtime,
};
use crate::windows::{show_settings_window, TRANSLATOR_WIN_NAME};

static mut TRAY_EVENT_REGISTERED: bool = false;

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, Some("CmdOrCtrl+,"))?;
    let history_i = MenuItem::with_id(app, "history", "History", true, None::<String>)?;
    let show_i = MenuItem::with_id(app, "show", "Show", true, None::<String>)?;
    let hide_i = PredefinedMenuItem::hide(app, Some("Hide"))?;
    let quit_i = PredefinedMenuItem::quit(app, Some("Quit"))?;
    let separator_i = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[
            &settings_i,
            &history_i,
            &show_i,
            &hide_i,
            &separator_i,
            &quit_i,
        ],
    )?;

    let tray = app.tray_by_id("tray").unwrap();
    tray.set_menu(Some(menu.clone()))?;
    unsafe {
        if TRAY_EVENT_REGISTERED {
            return Ok(());
        }
        TRAY_EVENT_REGISTERED = true;
    }
    tray.on_menu_event(move |app, event| match event.id.as_ref() {
        "settings" => {
            show_settings_window();
        }
        "history" => {
            tauri::async_runtime::spawn(async move {
                crate::windows::show_history_window().await;
            });
        }
        "show" => {
            remember_active_window();
            crate::windows::show_translator_window(false, false, true);
        }
        "hide" => {
            if let Some(window) = app.get_webview_window(TRANSLATOR_WIN_NAME) {
                window.set_focus().unwrap();
                window.unminimize().unwrap();
                window.hide().unwrap();
            }
        }
        "quit" => app.exit(0),
        _ => {}
    });
    tray.on_tray_icon_event(|_, event| {
        if let TrayIconEvent::Click { button, .. } = event {
            if button == MouseButton::Left {
                remember_active_window();
                crate::windows::show_translator_window(false, false, true);
            }
        };
    });
    tray.set_show_menu_on_left_click(false)?;

    Ok(())
}
