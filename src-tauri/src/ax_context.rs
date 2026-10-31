// Read text context from the focused / hovered Accessibility element of the
// currently active application. Used by the Quick Translator window to guess
// which word or sentence the user is most likely interested in.

#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AxContext {
    pub focused_text: String,
    pub focused_role: String,
    pub selected_text: String,
    pub hovered_text: String,
    pub hovered_role: String,
    pub app_name: String,
    pub app_bundle_id: String,
    pub mouse_x: i32,
    pub mouse_y: i32,
    pub paragraphs: Vec<String>,
    pub truncated: bool,
}

#[cfg(target_os = "macos")]
mod macos_impl {
    use super::AxContext;
    use accessibility_ng::{AXAttribute, AXUIElement};
    use accessibility_sys_ng::{
        kAXChildrenAttribute, kAXDescriptionAttribute, kAXFocusedApplicationAttribute,
        kAXFocusedUIElementAttribute, kAXFocusedWindowAttribute, kAXRoleAttribute,
        kAXSelectedTextAttribute, kAXTitleAttribute, kAXValueAttribute,
        AXUIElementCopyElementAtPosition, AXUIElementCreateApplication, AXUIElementRef,
    };
    use cocoa::base::{id, nil};
    use core_foundation::array::CFArray;
    use core_foundation::base::{CFType, TCFType};
    use core_foundation::string::CFString;
    use objc::{class, msg_send, sel, sel_impl};
    use std::ffi::c_void;

    const MAX_TEXT_PER_NODE: usize = 1200;
    const MAX_FOCUSED_TEXT: usize = 4000;
    const MAX_WIDE_NODES: usize = 300;
    const MAX_WIDE_DEPTH: usize = 8;
    const MAX_WIDE_TOTAL: usize = 8000;

    fn attr_string(elem: &AXUIElement, key: &'static str) -> Option<String> {
        let value: CFType = elem
            .attribute(&AXAttribute::new(&CFString::from_static_string(key)))
            .ok()?;
        if let Some(s) = value.downcast::<CFString>() {
            return Some(s.to_string());
        }
        None
    }

    fn role(elem: &AXUIElement) -> String {
        attr_string(elem, kAXRoleAttribute).unwrap_or_default()
    }

    fn best_text(elem: &AXUIElement) -> String {
        for key in [
            kAXValueAttribute,
            kAXTitleAttribute,
            kAXDescriptionAttribute,
        ] {
            if let Some(text) = attr_string(elem, key) {
                let trimmed = text.trim();
                if !trimmed.is_empty() {
                    return truncate(trimmed, MAX_TEXT_PER_NODE);
                }
            }
        }
        String::new()
    }

    fn truncate(s: &str, max: usize) -> String {
        if s.chars().count() <= max {
            return s.to_string();
        }
        let mut out = String::with_capacity(max);
        for (i, c) in s.chars().enumerate() {
            if i >= max {
                break;
            }
            out.push(c);
        }
        out
    }

    fn focused_pid() -> Option<i32> {
        let system = AXUIElement::system_wide();
        let app: AXUIElement = system
            .attribute(&AXAttribute::new(&CFString::from_static_string(
                kAXFocusedApplicationAttribute,
            )))
            .ok()
            .and_then(|v: CFType| v.downcast_into::<AXUIElement>())?;
        app.pid().ok()
    }

    fn frontmost_app_info() -> (String, String) {
        unsafe {
            let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
            let running_app: id = msg_send![workspace, frontmostApplication];
            if running_app == nil {
                return (String::new(), String::new());
            }
            let bundle_id_str: id = msg_send![running_app, bundleIdentifier];
            let bundle_id = nsstring_to_string(bundle_id_str);
            let name_str: id = msg_send![running_app, localizedName];
            let name = nsstring_to_string(name_str);
            (name, bundle_id)
        }
    }

    unsafe fn nsstring_to_string(s: id) -> String {
        if s == nil {
            return String::new();
        }
        let bytes: *const std::os::raw::c_char = msg_send![s, UTF8String];
        if bytes.is_null() {
            return String::new();
        }
        std::ffi::CStr::from_ptr(bytes)
            .to_string_lossy()
            .into_owned()
    }

    fn element_at_position(x: f32, y: f32) -> Option<AXUIElement> {
        let pid = focused_pid()?;
        unsafe {
            let app_ref = AXUIElementCreateApplication(pid);
            if app_ref.is_null() {
                return None;
            }
            let app = AXUIElement::wrap_under_create_rule(app_ref);
            let mut out: AXUIElementRef = std::ptr::null_mut();
            let err = AXUIElementCopyElementAtPosition(app.as_concrete_TypeRef(), x, y, &mut out);
            if err != accessibility_sys_ng::kAXErrorSuccess || out.is_null() {
                return None;
            }
            Some(AXUIElement::wrap_under_create_rule(out))
        }
    }

    fn children(elem: &AXUIElement) -> Option<CFArray<*const c_void>> {
        let value: CFType = elem
            .attribute(&AXAttribute::new(&CFString::from_static_string(
                kAXChildrenAttribute,
            )))
            .ok()?;
        value.downcast_into::<CFArray<*const c_void>>()
    }

    fn walk(elem: &AXUIElement, depth: usize, out: &mut Vec<String>, total: &mut usize) -> bool {
        if depth > MAX_WIDE_DEPTH || out.len() >= MAX_WIDE_NODES || *total >= MAX_WIDE_TOTAL {
            return false;
        }
        let role = role(elem);
        let interesting = matches!(
            role.as_str(),
            "AXStaticText" | "AXTextArea" | "AXTextField" | "AXHeading" | "AXLink"
        );
        if interesting {
            let text = best_text(elem);
            if !text.is_empty() {
                *total += text.chars().count();
                out.push(text);
                if out.len() >= MAX_WIDE_NODES || *total >= MAX_WIDE_TOTAL {
                    return false;
                }
            }
        }
        if let Some(kids) = children(elem) {
            for kid in kids.iter() {
                let ptr: *const c_void = *kid;
                if ptr.is_null() {
                    continue;
                }
                let child = unsafe { AXUIElement::wrap_under_get_rule(ptr as AXUIElementRef) };
                if !walk(&child, depth + 1, out, total) {
                    return false;
                }
            }
        }
        true
    }

    pub fn read_narrow(mouse_x: i32, mouse_y: i32) -> AxContext {
        let (app_name, app_bundle_id) = frontmost_app_info();
        let system = AXUIElement::system_wide();
        let focused: Option<AXUIElement> = system
            .attribute(&AXAttribute::new(&CFString::from_static_string(
                kAXFocusedUIElementAttribute,
            )))
            .ok()
            .and_then(|v: CFType| v.downcast_into::<AXUIElement>());

        let (focused_text, focused_role, selected_text) = match &focused {
            Some(elem) => {
                let r = role(elem);
                let val = attr_string(elem, kAXValueAttribute).unwrap_or_default();
                let text = if val.trim().is_empty() {
                    best_text(elem)
                } else {
                    truncate(&val, MAX_FOCUSED_TEXT)
                };
                let sel = attr_string(elem, kAXSelectedTextAttribute).unwrap_or_default();
                (text, r, sel)
            }
            None => (String::new(), String::new(), String::new()),
        };

        let hovered = element_at_position(mouse_x as f32, mouse_y as f32);
        let (hovered_text, hovered_role) = match hovered {
            Some(elem) => (best_text(&elem), role(&elem)),
            None => (String::new(), String::new()),
        };

        AxContext {
            focused_text,
            focused_role,
            selected_text,
            hovered_text,
            hovered_role,
            app_name,
            app_bundle_id,
            mouse_x,
            mouse_y,
            paragraphs: Vec::new(),
            truncated: false,
        }
    }

    pub fn read_wide(mouse_x: i32, mouse_y: i32) -> AxContext {
        let mut ctx = read_narrow(mouse_x, mouse_y);
        let system = AXUIElement::system_wide();
        let focused_window: Option<AXUIElement> = system
            .attribute(&AXAttribute::new(&CFString::from_static_string(
                kAXFocusedWindowAttribute,
            )))
            .ok()
            .and_then(|v: CFType| v.downcast_into::<AXUIElement>());

        if let Some(window) = focused_window {
            let mut paragraphs = Vec::new();
            let mut total = 0usize;
            let fully = walk(&window, 0, &mut paragraphs, &mut total);
            ctx.truncated = !fully;
            ctx.paragraphs = paragraphs;
        }
        ctx
    }
}

#[cfg(target_os = "macos")]
fn read_narrow_impl(mouse_x: i32, mouse_y: i32) -> AxContext {
    macos_impl::read_narrow(mouse_x, mouse_y)
}

#[cfg(target_os = "macos")]
fn read_wide_impl(mouse_x: i32, mouse_y: i32) -> AxContext {
    macos_impl::read_wide(mouse_x, mouse_y)
}

#[cfg(not(target_os = "macos"))]
fn read_narrow_impl(mouse_x: i32, mouse_y: i32) -> AxContext {
    AxContext {
        mouse_x,
        mouse_y,
        ..AxContext::default()
    }
}

#[cfg(not(target_os = "macos"))]
fn read_wide_impl(mouse_x: i32, mouse_y: i32) -> AxContext {
    AxContext {
        mouse_x,
        mouse_y,
        ..AxContext::default()
    }
}

#[tauri::command]
#[specta::specta]
pub async fn read_ax_context_narrow() -> AxContext {
    let (x, y) = crate::windows::get_mouse_location().unwrap_or((0, 0));
    tokio::task::spawn_blocking(move || read_narrow_impl(x, y))
        .await
        .unwrap_or_default()
}

#[tauri::command]
#[specta::specta]
pub async fn read_ax_context_wide() -> AxContext {
    let (x, y) = crate::windows::get_mouse_location().unwrap_or((0, 0));
    tokio::task::spawn_blocking(move || read_wide_impl(x, y))
        .await
        .unwrap_or_default()
}
