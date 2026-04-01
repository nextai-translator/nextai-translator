#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod config;
mod fetch;
mod insertion;
mod lang;
mod tray;
mod utils;
mod windows;

use debug_print::debug_println;
use insertion::{remember_active_window, remember_active_window_command};
use parking_lot::Mutex;
use serde_json::json;
use std::env;
use std::sync::Arc;
use sysinfo::{CpuExt, System, SystemExt};
use tauri_plugin_aptabase::EventTracker;
use tauri_plugin_autostart::MacosLauncher;
use windows::get_translator_window;
use tauri_specta::Event;

use crate::config::{clear_config_cache, get_config_content, ConfigUpdatedEvent};
use crate::fetch::fetch_stream;
use crate::lang::detect_lang;
use crate::windows::{
    hide_translator_window, show_history_window, show_translator_window_command,
    show_translator_window_with_selected_text_command, TRANSLATOR_WIN_NAME,
};

use once_cell::sync::OnceCell;
#[cfg(debug_assertions)]
use specta_typescript::{formatter::prettier, Typescript};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;
use tiny_http::{Response as HttpResponse, Server};
use tokio::runtime::{
    Builder as TokioRuntimeBuilder, EnterGuard as TokioEnterGuard, Runtime as TokioRuntime,
};

pub static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();
pub static CPU_VENDOR: Mutex<String> = Mutex::new(String::new());

fn init_tokio_runtime() -> &'static TokioRuntime {
    use std::sync::OnceLock;

    static RUNTIME: OnceLock<&'static TokioRuntime> = OnceLock::new();
    static ENTER_GUARD: OnceLock<&'static TokioEnterGuard<'static>> = OnceLock::new();
    static SET_HANDLE: OnceLock<()> = OnceLock::new();

    let runtime = RUNTIME.get_or_init(|| {
        Box::leak(Box::new(
            TokioRuntimeBuilder::new_multi_thread()
                .enable_all()
                .build()
                .expect("failed to initialize Tokio runtime"),
        ))
    });

    ENTER_GUARD.get_or_init(|| Box::leak(Box::new(runtime.enter())));

    if SET_HANDLE.set(()).is_ok() {
        tauri::async_runtime::set(runtime.handle().clone());
    }

    runtime
}

#[cfg(target_os = "macos")]
fn query_accessibility_permissions() -> bool {
    let trusted = macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
    if trusted {
        print!("Application is totally trusted!");
    } else {
        print!("Application isn't trusted :(");
    }
    trusted
}

#[cfg(not(target_os = "macos"))]
fn query_accessibility_permissions() -> bool {
    return true;
}

#[inline]
fn launch_ipc_server(server: &Server) {
    for mut req in server.incoming_requests() {
        let mut selected_text = String::new();
        req.as_reader().read_to_string(&mut selected_text).unwrap();
        utils::send_text(selected_text);
        remember_active_window();
        let window = windows::show_translator_window(false, true, false);
        window.set_focus().unwrap();
        utils::show();
        let response = HttpResponse::from_string("ok");
        req.respond(response).unwrap();
    }
}

fn main() {
    let _ = init_tokio_runtime();
    let silently = env::args().any(|arg| arg == "--silently");

    let mut sys = System::new();
    sys.refresh_cpu(); // Refreshing CPU information.
    if let Some(cpu) = sys.cpus().first() {
        let vendor_id = cpu.vendor_id().to_string();
        *CPU_VENDOR.lock() = vendor_id;
    }

    let specta_builder = tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            get_config_content,
            clear_config_cache,
            show_translator_window_command,
            show_translator_window_with_selected_text_command,
            show_history_window,
            fetch_stream,
            remember_active_window_command,
            detect_lang,
            hide_translator_window,
        ])
        .events(tauri_specta::collect_events![ConfigUpdatedEvent]);

    #[cfg(debug_assertions)]
    specta_builder
        .export(
            Typescript::default().formatter(prettier),
            "../src/tauri/bindings.ts",
        )
        .expect("Failed to export TypeScript bindings");

    let invoke_handler = specta_builder.invoke_handler();
    let specta_builder = Arc::new(specta_builder);

    let specta_builder_setup = specta_builder.clone();

    #[cfg_attr(not(target_os = "macos"), allow(unused_mut))]
    let mut app = tauri::Builder::default()
        .plugin(
            tauri_plugin_aptabase::Builder::new("A-US-9856842764")
                .with_panic_hook(Box::new(|client, info, msg| {
                    let location = info
                        .location()
                        .map(|loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()))
                        .unwrap_or_else(|| "".to_string());

                    let _ = client.track_event(
                        "panic",
                        Some(json!({
                            "info": format!("{} ({})", msg, location),
                        })),
                    );
                }))
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            app.notification()
                .builder()
                .title("This app is already running!")
                .body("You can find it in the tray menu.")
                .show()
                .unwrap();
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--silently"]),
        ))
        .plugin(tauri_plugin_process::init())
        .setup(move |app| {
            specta_builder_setup.mount_events(app);
            let app_handle = app.handle();
            APP_HANDLE.get_or_init(|| app.handle().clone());
            tray::create_tray(&app_handle)?;
            app_handle.plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            if silently {
                // create translator window
                let _ = get_translator_window(false, false, false);
                windows::do_hide_translator_window();
                debug_println!("translator window is hidden");
            } else {
                let window = get_translator_window(false, false, false);
                window.set_focus().unwrap();
                window.show().unwrap();
            }
            if !query_accessibility_permissions() {
                if let Some(window) = app.get_webview_window(TRANSLATOR_WIN_NAME) {
                    window.minimize().unwrap();
                }
                app.notification()
                    .builder()
                    .title("Accessibility permissions")
                    .body("Please grant accessibility permissions to the app")
                    .icon("icon.png")
                    .show()
                    .unwrap();
            }
            std::thread::spawn(move || {
                #[cfg(target_os = "windows")]
                {
                    let server = Server::http("127.0.0.1:62007").unwrap();
                    launch_ipc_server(&server);
                }
                #[cfg(not(target_os = "windows"))]
                {
                    use std::path::Path;
                    let path = Path::new("/tmp/openai-translator.sock");
                    std::fs::remove_file(path).unwrap_or_default();
                    let server = Server::http_unix(path).unwrap();
                    launch_ipc_server(&server);
                }
            });
            let handle = app_handle.clone();
            ConfigUpdatedEvent::listen(app_handle, move |_event| {
                clear_config_cache();
                tray::create_tray(&handle).unwrap();
            });
            Ok(())
        })
        .invoke_handler(invoke_handler)
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    #[cfg(target_os = "macos")]
    {
        let config = config::get_config_by_app(app.handle()).unwrap();
        if config.hide_the_icon_in_the_dock.unwrap_or(true) {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
        } else {
            app.set_activation_policy(tauri::ActivationPolicy::Regular);
        }
    }

    app.run(|app, event| match event {
        tauri::RunEvent::Exit { .. } => {
            let _ = app.track_event("app_exited", None);
            app.flush_events_blocking();
        }
        tauri::RunEvent::Ready => {
            let _ = app.track_event("app_started", None);
        }
        tauri::RunEvent::WindowEvent {
            label,
            event: tauri::WindowEvent::CloseRequested { api, .. },
            ..
        } => {
            if label != TRANSLATOR_WIN_NAME {
                return;
            }

            windows::do_hide_translator_window();

            api.prevent_close();
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen {
            has_visible_windows,
            ..
        } => {
            if !has_visible_windows {
                remember_active_window();
                windows::show_translator_window(false, false, false);
            }
        }
        _ => {}
    });
}
