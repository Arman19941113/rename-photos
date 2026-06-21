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

    let output = Command::new("xattr")
        .args(["-px", "com.apple.FinderInfo"])
        .arg(path)
        .output();

    let Ok(out) = output else {
        return false;
    };
    if !out.status.success() {
        return false;
    }

    parse_hex_xattr_output(&out.stdout)
        .map(|finder_info| has_macos_alias_finder_flag(&finder_info))
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn parse_hex_xattr_output(output: &[u8]) -> Option<Vec<u8>> {
    let text = String::from_utf8_lossy(output);
    let hex: String = text.chars().filter(|ch| !ch.is_whitespace()).collect();

    if hex.len() % 2 != 0 || !hex.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return None;
    }

    hex.as_bytes()
        .chunks(2)
        .map(|chunk| {
            let pair = std::str::from_utf8(chunk).ok()?;
            u8::from_str_radix(pair, 16).ok()
        })
        .collect()
}

#[cfg(target_os = "macos")]
fn has_macos_alias_finder_flag(finder_info: &[u8]) -> bool {
    const FINDER_FLAGS_OFFSET: usize = 8;
    const FINDER_FLAG_IS_ALIAS: u16 = 0x8000;

    let Some(flags) = finder_info.get(FINDER_FLAGS_OFFSET..FINDER_FLAGS_OFFSET + 2) else {
        return false;
    };
    let finder_flags = u16::from_be_bytes([flags[0], flags[1]]);

    finder_flags & FINDER_FLAG_IS_ALIAS != 0
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

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::{has_macos_alias_finder_flag, parse_hex_xattr_output};

    #[test]
    fn parses_xattr_hex_output_with_whitespace() {
        let output = b"00 01 0a ff\n10";

        assert_eq!(
            parse_hex_xattr_output(output),
            Some(vec![0, 1, 10, 255, 16])
        );
    }

    #[test]
    fn rejects_non_hex_xattr_output() {
        assert_eq!(parse_hex_xattr_output(b"00 xx"), None);
    }

    #[test]
    fn detects_only_the_finder_alias_flag() {
        let mut regular_finder_info = [0; 32];
        regular_finder_info[8] = 0x00;
        regular_finder_info[9] = 0x10;

        let mut alias_finder_info = [0; 32];
        alias_finder_info[8] = 0x80;
        alias_finder_info[9] = 0x00;

        assert!(!has_macos_alias_finder_flag(&regular_finder_info));
        assert!(has_macos_alias_finder_flag(&alias_finder_info));
    }

    #[test]
    fn missing_finder_flags_are_not_aliases() {
        assert!(!has_macos_alias_finder_flag(&[0; 8]));
    }
}
