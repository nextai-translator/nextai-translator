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
    use image::{GenericImage, GenericImageView};
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
    let new_image_file_path = image_dir.join("cut.png");
    // Remove any stale cut so downstream OCR cannot silently pick up the
    // previous selection when this command fails (#1872).
    let _ = std::fs::remove_file(&new_image_file_path);
    let image_file_path = image_dir.join("fullscreen.png");
    if !image_file_path.exists() {
        eprintln!("fullscreen.png does not exist, cannot cut image");
        return;
    }
    let mut img = match image::open(&image_file_path) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("error: {}", e);
            return;
        }
    };
    // Clamp the DPI-scaled selection to the image bounds: sub_image panics
    // on out-of-range rectangles (#1872).
    let (img_width, img_height) = img.dimensions();
    if left >= img_width || top >= img_height {
        eprintln!(
            "cut rectangle ({}, {}) is outside the screenshot ({}x{})",
            left, top, img_width, img_height
        );
        return;
    }
    let width = width.min(img_width - left);
    let height = height.min(img_height - top);
    if width == 0 || height == 0 {
        eprintln!("cut rectangle is empty");
        return;
    }
    let img2 = img.sub_image(left, top, width, height);
    match img2.to_image().save(&new_image_file_path) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("{:?}", e.to_string());
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
    // Silently doing nothing when no display matches leaves a stale
    // fullscreen.png in place and OCR appears to randomly fail (#1872), so
    // fall back to the first screen instead.
    let screen = match screens
        .iter()
        .find(|screen| screen.display_info.x == x && screen.display_info.y == y)
    {
        Some(screen) => screen,
        None => {
            eprintln!(
                "No screen found at ({}, {}), falling back to the first screen",
                x, y
            );
            match screens.first() {
                Some(screen) => screen,
                None => {
                    eprintln!("No screens available");
                    return;
                }
            }
        }
    };
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
    // Remove the previous capture so a failure below cannot leave it in
    // place to be silently reused (#1872).
    let _ = fs::remove_file(&image_file_path);
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
fn recognize_cut_file(image_file_path: &Path) -> Result<String, String> {
    use windows::core::HSTRING;
    use windows::Graphics::Imaging::BitmapDecoder;
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::{FileAccessMode, StorageFile};

    if !image_file_path.exists() {
        return Err(format!("OCR image not found at {:?}", image_file_path));
    }

    let path = image_file_path.to_string_lossy().replace("\\\\?\\", "");
    debug_println!("ocr image file path: {:?}", path);

    let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(path))
        .map_err(|e| format!("failed to open storage file: {}", e))?
        .get()
        .map_err(|e| format!("failed to open storage file: {}", e))?;

    let stream = file
        .OpenAsync(FileAccessMode::Read)
        .map_err(|e| format!("failed to open stream: {}", e))?
        .get()
        .map_err(|e| format!("failed to open stream: {}", e))?;

    let decoder_id =
        BitmapDecoder::PngDecoderId().map_err(|e| format!("failed to get png decoder: {}", e))?;
    let decoder = BitmapDecoder::CreateWithIdAsync(decoder_id, &stream)
        .map_err(|e| format!("failed to create decoder: {}", e))?
        .get()
        .map_err(|e| format!("failed to create decoder: {}", e))?;

    let bitmap = decoder
        .GetSoftwareBitmapAsync()
        .map_err(|e| format!("failed to decode bitmap: {}", e))?
        .get()
        .map_err(|e| format!("failed to decode bitmap: {}", e))?;

    let engine = OcrEngine::TryCreateFromUserProfileLanguages().map_err(|e| {
        if e.to_string().contains("0x00000000") {
            "Language package not installed!\n\nSee: https://learn.microsoft.com/zh-cn/windows/powertoys/text-extractor#supported-languages".to_string()
        } else {
            e.to_string()
        }
    })?;

    let result = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| format!("failed to recognize: {}", e))?
        .get()
        .map_err(|e| format!("failed to recognize: {}", e))?;

    let mut content = String::new();
    for line in result
        .Lines()
        .map_err(|e| format!("failed to read lines: {}", e))?
    {
        if let Ok(text) = line.Text() {
            content.push_str(text.to_string_lossy().trim());
            content.push('\n');
        }
    }
    Ok(content)
}

#[cfg(target_os = "windows")]
pub fn do_ocr_with_cut_file_path(image_file_path: &Path) {
    // Always surface the translator window: dying silently here (the old
    // unwrap chain panicked on any failure) left users with no feedback at
    // all when recognition failed (#1872). An empty input at least shows
    // that OCR ran and found nothing.
    let content = match recognize_cut_file(image_file_path) {
        Ok(content) => {
            debug_println!("ocr content: {:?}", content);
            content
        }
        Err(e) => {
            eprintln!("OCR failed: {}", e);
            String::new()
        }
    };
    crate::utils::send_text(content);
    remember_active_window();
    crate::windows::show_translator_window(false, true, true);
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
