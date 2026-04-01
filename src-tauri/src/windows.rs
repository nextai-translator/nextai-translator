use crate::config;
use crate::insertion::remember_active_window;
use crate::utils;
use crate::APP_HANDLE;
#[cfg(target_os = "macos")]
use cocoa::appkit::NSWindow;
use debug_print::debug_println;
use get_selected_text::get_selected_text;
use mouse_position::mouse_position::Mouse;
use tauri::{LogicalPosition, Manager, PhysicalPosition};

pub const TRANSLATOR_WIN_NAME: &str = "translator";
pub const SETTINGS_WIN_NAME: &str = "settings";
pub const HISTORY_WIN_NAME: &str = "history";

fn get_dummy_window() -> tauri::WebviewWindow {
    let app_handle = APP_HANDLE.get().unwrap();
    match app_handle.get_webview_window("dummy") {
        Some(window) => {
            debug_println!("Dummy window found!");
            window
        }
        None => {
            debug_println!("Create dummy window!");
            tauri::WebviewWindowBuilder::new(
                app_handle,
                "dummy",
                tauri::WebviewUrl::App("src/tauri/dummy.html".into()),
            )
            .title("Dummy")
            .visible(false)
            .build()
            .unwrap()
        }
    }
}

pub fn get_current_monitor() -> tauri::Monitor {
    let window = get_dummy_window();
    let (mouse_logical_x, mouse_logical_y): (i32, i32) = get_mouse_location().unwrap();
    let scale_factor = window.scale_factor().unwrap_or(1.0);
    let mut mouse_physical_position = PhysicalPosition::new(mouse_logical_x, mouse_logical_y);
    if cfg!(target_os = "macos") {
        mouse_physical_position =
            LogicalPosition::new(mouse_logical_x as f64, mouse_logical_y as f64)
                .to_physical(scale_factor);
    }
    window
        .available_monitors()
        .map(|monitors| {
            monitors
                .iter()
                .find(|monitor| {
                    let monitor_physical_size = monitor.size();
                    let monitor_physical_position = monitor.position();
                    mouse_physical_position.x >= monitor_physical_position.x
                        && mouse_physical_position.x
                            <= monitor_physical_position.x + (monitor_physical_size.width as i32)
                        && mouse_physical_position.y >= monitor_physical_position.y
                        && mouse_physical_position.y
                            <= monitor_physical_position.y + (monitor_physical_size.height as i32)
                })
                .cloned()
        })
        .unwrap_or_else(|e| {
            eprintln!("Error get available monitors: {}", e);
            None
        })
        .or_else(|| window.current_monitor().unwrap())
        .or_else(|| window.primary_monitor().unwrap())
        .expect("No current monitor found")
}

pub fn get_mouse_location() -> Result<(i32, i32), String> {
    let position = Mouse::get_mouse_position();
    match position {
        Mouse::Position { x, y } => Ok((x, y)),
        Mouse::Error => Err("Error getting mouse position".to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn show_translator_window_with_selected_text_command() {
    remember_active_window();
    let config = config::get_config().ok();
    let restore_previous_position = config
        .as_ref()
        .and_then(|conf| conf.restore_previous_position)
        .unwrap_or(false);
    let read_selected_text = || -> String {
        match get_selected_text() {
            Ok(text) => text,
            Err(e) => {
                eprintln!("Error getting selected text natively: {}", e);
                String::new()
            }
        }
    };

    let selected_text = read_selected_text();

    // Show the translator window only after we've captured the current selection.
    let window = show_translator_window(false, true, true);

    if !selected_text.trim().is_empty() {
        utils::send_text(selected_text);
    }

    if !restore_previous_position {
        position_translator_window_to_cursor(&window);
    }
    focus_translator_window(&window);
    utils::show();
}

pub fn do_hide_translator_window() {
    if let Some(handle) = APP_HANDLE.get() {
        match handle.get_webview_window(TRANSLATOR_WIN_NAME) {
            Some(window) => {
                #[cfg(not(target_os = "macos"))]
                {
                    window.hide().unwrap();
                }
                #[cfg(target_os = "macos")]
                {
                    tauri::AppHandle::hide(&handle).unwrap();
                    window.hide().unwrap();
                }
            }
            None => {}
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn hide_translator_window() {
    do_hide_translator_window();
}

pub fn post_process_window<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    window.set_visible_on_all_workspaces(true).unwrap();

    let _ = window.current_monitor();

    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSWindowCollectionBehavior;
        use cocoa::base::id;

        let ns_win = window.ns_window().unwrap() as id;

        unsafe {
            // Disable the automatic creation of "Show Tab Bar" etc menu items on macOS
            NSWindow::setAllowsAutomaticWindowTabbing_(ns_win, cocoa::base::NO);

            let mut collection_behavior = ns_win.collectionBehavior();
            collection_behavior |=
                NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces;

            ns_win.setCollectionBehavior_(collection_behavior);
        }
    }
}

pub fn build_window<'a, R: tauri::Runtime, M: tauri::Manager<R>>(
    builder: tauri::WebviewWindowBuilder<'a, R, M>,
) -> tauri::WebviewWindow<R> {
    #[cfg(target_os = "macos")]
    {
        let window = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .transparent(true)
            .build()
            .unwrap();

        post_process_window(&window);

        window
    }

    #[cfg(not(target_os = "macos"))]
    {
        let window = builder.transparent(true).decorations(true).build().unwrap();

        post_process_window(&window);

        window
    }
}

#[tauri::command]
#[specta::specta]
pub async fn show_translator_window_command() {
    remember_active_window();
    show_translator_window(false, false, true);
}

pub fn show_translator_window(
    center: bool,
    to_mouse_position: bool,
    set_focus: bool,
) -> tauri::WebviewWindow {
    let window = get_translator_window(center, to_mouse_position, set_focus);
    window.show().unwrap();
    window
}

fn position_translator_window_to_cursor(window: &tauri::WebviewWindow) {
    let current_monitor = get_current_monitor();
    let mouse_position = get_mouse_location();
    let window_physical_size = window.outer_size();
    if mouse_position.is_err() || window_physical_size.is_err() {
        return;
    }
    let (mouse_logical_x, mouse_logical_y) = mouse_position.unwrap();
    let window_physical_size = window_physical_size.unwrap();
    let scale_factor = window.scale_factor().unwrap_or(1.0);
    let mut mouse_physical_position = PhysicalPosition::new(mouse_logical_x, mouse_logical_y);
    if cfg!(target_os = "macos") {
        mouse_physical_position =
            LogicalPosition::new(mouse_logical_x as f64, mouse_logical_y as f64)
                .to_physical(scale_factor);
    }

    let monitor_physical_size = current_monitor.size();
    let monitor_physical_position = current_monitor.position();

    let mut window_physical_position = mouse_physical_position;
    if window_physical_position.x < monitor_physical_position.x {
        window_physical_position.x = monitor_physical_position.x;
    }
    if window_physical_position.y < monitor_physical_position.y {
        window_physical_position.y = monitor_physical_position.y;
    }
    if window_physical_position.x + (window_physical_size.width as i32)
        > monitor_physical_position.x + (monitor_physical_size.width as i32)
    {
        window_physical_position.x = monitor_physical_position.x
            + (monitor_physical_size.width as i32)
            - (window_physical_size.width as i32);
    }
    if window_physical_position.y + (window_physical_size.height as i32)
        > monitor_physical_position.y + (monitor_physical_size.height as i32)
    {
        window_physical_position.y = monitor_physical_position.y
            + (monitor_physical_size.height as i32)
            - (window_physical_size.height as i32);
    }

    if let Err(e) = window.set_position(window_physical_position) {
        eprintln!("Error setting translator window position: {}", e);
    }
}

fn focus_translator_window(window: &tauri::WebviewWindow) {
    if let Err(e) = window.unminimize() {
        eprintln!("Error unminimizing translator window: {}", e);
    }

    if let Err(e) = window.set_focus() {
        eprintln!("Error focusing translator window: {}", e);
    }

    // In the minimal desktop build, pinning is managed by the renderer.
}

pub fn get_translator_window(
    center: bool,
    to_mouse_position: bool,
    set_focus: bool,
) -> tauri::WebviewWindow {
    let current_monitor = get_current_monitor();
    let handle = APP_HANDLE.get().unwrap();
    let window = match handle.get_webview_window(TRANSLATOR_WIN_NAME) {
        Some(window) => {
            window.unminimize().unwrap();
            if set_focus {
                window.set_focus().unwrap();
            }
            window
        }
        None => {
            let config = config::get_config_by_app(handle).unwrap();

            let builder = tauri::WebviewWindowBuilder::new(
                handle,
                TRANSLATOR_WIN_NAME,
                tauri::WebviewUrl::App("src/tauri/index.html".into()),
            )
            .title("NextAI Translator")
            .fullscreen(false)
            .inner_size(620.0, 700.0)
            .min_inner_size(540.0, 600.0)
            .resizable(true)
            .skip_taskbar(config.hide_the_icon_in_the_dock.unwrap_or(true))
            .visible(false)
            .focused(false);

            build_window(builder)
        }
    };

    let restore_previous_position = match config::get_config() {
        Ok(config) => config.restore_previous_position.unwrap_or(false),
        Err(e) => {
            eprintln!("Error getting config: {}", e);
            false
        }
    };

    if restore_previous_position {
        debug_println!("Restoring previous position");
        if !cfg!(target_os = "macos") {
            window.unminimize().unwrap();
        }
    } else if to_mouse_position {
        debug_println!("Setting position to mouse position");
        let (mouse_logical_x, mouse_logical_y): (i32, i32) = get_mouse_location().unwrap();
        let window_physical_size = window.outer_size().unwrap();
        let scale_factor = window.scale_factor().unwrap_or(1.0);
        let mut mouse_physical_position = PhysicalPosition::new(mouse_logical_x, mouse_logical_y);
        if cfg!(target_os = "macos") {
            mouse_physical_position =
                LogicalPosition::new(mouse_logical_x as f64, mouse_logical_y as f64)
                    .to_physical(scale_factor);
        }

        let monitor_physical_size = current_monitor.size();
        let monitor_physical_position = current_monitor.position();

        let mut window_physical_position = mouse_physical_position;
        if mouse_physical_position.x + (window_physical_size.width as i32)
            > monitor_physical_position.x + (monitor_physical_size.width as i32)
        {
            window_physical_position.x = monitor_physical_position.x
                + (monitor_physical_size.width as i32)
                - (window_physical_size.width as i32);
        }
        if mouse_physical_position.y + (window_physical_size.height as i32)
            > monitor_physical_position.y + (monitor_physical_size.height as i32)
        {
            window_physical_position.y = monitor_physical_position.y
                + (monitor_physical_size.height as i32)
                - (window_physical_size.height as i32);
        }
        if !cfg!(target_os = "macos") {
            window.unminimize().unwrap();
        }
        debug_println!("Mouse physical position: {:?}", mouse_physical_position);
        debug_println!("Monitor physical size: {:?}", monitor_physical_size);
        debug_println!("Monitor physical position: {:?}", monitor_physical_position);
        debug_println!("Window physical size: {:?}", window_physical_size);
        debug_println!("Window physical position: {:?}", window_physical_position);
        window.set_position(window_physical_position).unwrap();
    } else if center {
        if !cfg!(target_os = "macos") {
            window.unminimize().unwrap();
        }
        window.center().unwrap();
    }

    window
}

#[tauri::command]
#[specta::specta]
pub async fn show_history_window() {
    let window = get_history_window();
    window.center().unwrap();
    window.show().unwrap();
}

pub fn get_history_window() -> tauri::WebviewWindow {
    let handle = APP_HANDLE.get().unwrap();
    let window = match handle.get_webview_window(HISTORY_WIN_NAME) {
        Some(window) => {
            window.unminimize().unwrap();
            window.set_focus().unwrap();
            window
        }
        None => {
            let builder = tauri::WebviewWindowBuilder::new(
                handle,
                HISTORY_WIN_NAME,
                tauri::WebviewUrl::App("src/tauri/index.html".into()),
            )
            .title("NextAI Translator History")
            .fullscreen(false)
            .inner_size(760.0, 720.0)
            .min_inner_size(660.0, 600.0)
            .resizable(true)
            .skip_taskbar(true)
            .focused(true);

            return build_window(builder);
        }
    };

    window
}

pub fn show_settings_window() {
    let window = get_settings_window();
    window.center().unwrap();
    window.show().unwrap();
}

pub fn get_settings_window() -> tauri::WebviewWindow {
    let handle = APP_HANDLE.get().unwrap();
    let window = match handle.get_webview_window(SETTINGS_WIN_NAME) {
        Some(window) => {
            window.unminimize().unwrap();
            window.set_focus().unwrap();
            window
        }
        None => {
            let builder = tauri::WebviewWindowBuilder::new(
                handle,
                SETTINGS_WIN_NAME,
                tauri::WebviewUrl::App("src/tauri/index.html".into()),
            )
            .title("NextAI Translator Settings")
            .fullscreen(false)
            .inner_size(660.0, 800.0)
            .min_inner_size(660.0, 600.0)
            .resizable(true)
            .skip_taskbar(true)
            .focused(true);

            return build_window(builder);
        }
    };

    window
}
