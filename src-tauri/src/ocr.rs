#[cfg(any(target_os = "macos", target_os = "windows"))]
use crate::insertion::remember_active_window;
use debug_print::debug_println;
#[cfg(target_os = "windows")]
use std::path::Path;
use tauri::path::BaseDirectory;
use tauri::Manager;

#[tauri::command(async)]
#[specta::specta]
pub fn cut_image(left: u32, top: u32, width: u32, height: u32) {
    use image::GenericImage;
    let app_handle = match crate::APP_HANDLE.get() {
        Some(handle) => handle,
        None => {
            eprintln!("APP_HANDLE not initialized");
            return;
        }
    };
    let image_dir = match app_handle
        .path()
        .resolve("ocr_images", BaseDirectory::AppCache)
    {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("Failed to resolve ocr_images directory: {:?}", e);
            return;
        }
    };
    let image_file_path = image_dir.join("fullscreen.png");
    if !image_file_path.exists() {
        return;
    }
    let mut img = match image::open(&image_file_path) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("error: {}", e);
            return;
        }
    };
    let img2 = img.sub_image(left, top, width, height);
    let new_image_file_path = image_dir.join("cut.png");
    match img2.to_image().save(&new_image_file_path) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("{:?}", e.to_string());
            return;
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn screenshot(x: i32, y: i32) {
    use screenshots::{Compression, Screen};
    use std::fs;

    let screens = match Screen::all() {
        Ok(screens) => screens,
        Err(e) => {
            eprintln!("Failed to get screens: {:?}", e);
            return;
        }
    };
    for screen in screens {
        let info = screen.display_info;
        if info.x == x && info.y == y {
            let app_handle = match crate::APP_HANDLE.get() {
                Some(handle) => handle,
                None => {
                    eprintln!("APP_HANDLE not initialized");
                    return;
                }
            };
            let image_dir = match app_handle
                .path()
                .resolve("ocr_images", BaseDirectory::AppCache)
            {
                Ok(dir) => dir,
                Err(e) => {
                    eprintln!("Failed to resolve ocr_images directory: {:?}", e);
                    return;
                }
            };
            if !image_dir.exists() {
                if let Err(e) = std::fs::create_dir_all(&image_dir) {
                    eprintln!("Failed to create ocr_images directory: {:?}", e);
                    return;
                }
            }
            let image_file_path = image_dir.join("fullscreen.png");
            let image = match screen.capture() {
                Ok(img) => img,
                Err(e) => {
                    eprintln!("Failed to capture screen: {:?}", e);
                    return;
                }
            };
            let buffer = match image.to_png(Compression::Fast) {
                Ok(buf) => buf,
                Err(e) => {
                    eprintln!("Failed to convert image to PNG: {:?}", e);
                    return;
                }
            };
            debug_println!("image_file_path: {:?}", image_file_path);
            if let Err(e) = fs::write(&image_file_path, buffer) {
                eprintln!("Failed to write screenshot file: {:?}", e);
                return;
            }
            break;
        }
    }
}

#[cfg(target_os = "linux")]
pub fn do_ocr() -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn do_ocr() -> Result<(), Box<dyn std::error::Error>> {
    use crate::windows::show_screenshot_window;
    show_screenshot_window();
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn do_ocr_with_cut_file_path(image_file_path: &Path) {
    use windows::core::HSTRING;
    use windows::Graphics::Imaging::BitmapDecoder;
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::{FileAccessMode, StorageFile};

    let path = image_file_path.to_string_lossy().replace("\\\\?\\", "");
    debug_println!("ocr image file path: {:?}", path);

    let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(path))
        .unwrap()
        .get()
        .unwrap();

    let bitmap = BitmapDecoder::CreateWithIdAsync(
        BitmapDecoder::PngDecoderId().unwrap(),
        &file.OpenAsync(FileAccessMode::Read).unwrap().get().unwrap(),
    )
    .unwrap()
    .get()
    .unwrap();

    let bitmap = bitmap.GetSoftwareBitmapAsync().unwrap().get().unwrap();

    let engine = OcrEngine::TryCreateFromUserProfileLanguages();

    match engine {
        Ok(engine) => {
            let result = engine.RecognizeAsync(&bitmap).unwrap().get().unwrap();

            let mut content = String::new();
            for line in result.Lines().unwrap() {
                content.push_str(&line.Text().unwrap().to_string_lossy().trim());
                content.push('\n');
            }

            debug_println!("ocr content: {:?}", content);
            crate::utils::send_text(content);
            remember_active_window();
            crate::windows::show_translator_window(false, true, true);
        }
        Err(e) => {
            debug_println!("ocr error: {:?}", e);
            if e.to_string().contains("0x00000000") {
                eprintln!("{}", "Language package not installed!\n\nSee: https://learn.microsoft.com/zh-cn/windows/powertoys/text-extractor#supported-languages".to_string());
            } else {
                eprintln!("{}", e.to_string());
            }
        }
    }
}

#[cfg(target_os = "macos")]
pub fn do_ocr() -> Result<(), Box<dyn std::error::Error>> {
    use crate::{APP_HANDLE, CPU_VENDOR};

    let mut rel_path = "resources/bin/ocr_intel".to_string();
    if *CPU_VENDOR.lock() == "Apple" {
        rel_path = "resources/bin/ocr_apple".to_string();
    }

    let app = APP_HANDLE.get().ok_or("APP_HANDLE not initialized")?;

    let bin_path = app
        .path()
        .resolve(&rel_path, BaseDirectory::Resource)
        .map_err(|e| {
            format!(
                "Failed to resolve ocr binary resource '{}': {:?}",
                rel_path, e
            )
        })?;

    if !bin_path.exists() {
        return Err(format!(
            "OCR binary not found at {:?}. Please ensure the binary is bundled correctly.",
            bin_path
        )
        .into());
    }

    let output = std::process::Command::new(&bin_path)
        .args(["-l", "zh"])
        .output()
        .map_err(|e| format!("Failed to execute ocr binary at {:?}: {:?}", bin_path, e))?;

    // check exit code
    if output.status.success() {
        // get output content
        let content = String::from_utf8_lossy(&output.stdout);
        crate::utils::send_text(content.to_string());
        remember_active_window();
        crate::windows::show_translator_window(false, true, true);
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!(
            "OCR binary failed with exit code {:?}: {}",
            output.status.code(),
            stderr
        )
        .into())
    }
}

#[tauri::command(async)]
#[specta::specta]
pub fn start_ocr() {
    ocr();
}

pub fn ocr() {
    if let Err(e) = do_ocr() {
        eprintln!("OCR failed: {:?}", e);
    }
}

#[tauri::command(async)]
#[specta::specta]
pub fn finish_ocr() {
    do_finish_ocr();
}

#[cfg(target_os = "windows")]
fn do_finish_ocr() {
    let app_handle = match crate::APP_HANDLE.get() {
        Some(handle) => handle,
        None => {
            eprintln!("APP_HANDLE not initialized");
            return;
        }
    };
    let image_dir = match app_handle
        .path()
        .resolve("ocr_images", BaseDirectory::AppCache)
    {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("Failed to resolve ocr_images directory: {:?}", e);
            return;
        }
    };
    let image_file_path = image_dir.join("cut.png");
    do_ocr_with_cut_file_path(&image_file_path);
}

#[cfg(target_os = "linux")]
fn do_finish_ocr() {}

#[cfg(target_os = "macos")]
fn do_finish_ocr() {}
