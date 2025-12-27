use std::fs::Metadata;
#[cfg(windows)]
use std::os::windows::fs::MetadataExt;
use std::path::Path;

// Whether the file should be excluded from the UI file list.
pub(crate) fn should_exclude_from_ui_file_list(path: &Path, metadata: &Metadata) -> bool {
    if metadata.is_dir() {
        return true;
    }
    if is_shortcut(path) {
        return true;
    }
    if is_hidden(path, metadata) {
        return true;
    }
    if is_system_file(metadata) {
        return true;
    }
    false
}

pub fn is_shortcut(path: &Path) -> bool {
    #[cfg(windows)]
    {
        is_windows_shortcut(path)
    }

    #[cfg(unix)]
    {
        let mut is_shortcut = is_unix_symlink(path);

        // On macOS, Finder aliases are not symlinks; detect them separately.
        #[cfg(target_os = "macos")]
        {
            is_shortcut = is_shortcut || is_macos_finder_alias(path);
        }

        is_shortcut
    }
}

#[cfg(windows)]
fn is_windows_shortcut(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("lnk"))
        .unwrap_or(false)
}

#[cfg(unix)]
fn is_unix_symlink(path: &Path) -> bool {
    std::fs::symlink_metadata(path)
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn is_macos_finder_alias(path: &Path) -> bool {
    use std::process::Command;

    let output = Command::new("xattr").arg(path).output();
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            stdout.contains("com.apple.FinderInfo")
        }
        Err(_) => false,
    }
}

#[cfg(windows)]
fn is_hidden(_: &Path, metadata: &Metadata) -> bool {
    (metadata.file_attributes() & 0x2) != 0
}

#[cfg(unix)]
fn is_hidden(path: &Path, _: &Metadata) -> bool {
    use std::os::unix::ffi::OsStrExt;

    let Some(file_name) = path.file_name() else {
        return false;
    };
    matches!(file_name.as_bytes().first(), Some(b'.'))
}

#[cfg(windows)]
fn is_system_file(metadata: &Metadata) -> bool {
    (metadata.file_attributes() & 0x4) != 0
}

#[cfg(unix)]
fn is_system_file(_: &Metadata) -> bool {
    false
}
