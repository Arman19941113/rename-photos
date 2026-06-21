use std::fs::Metadata;
#[cfg(windows)]
use std::os::windows::fs::MetadataExt;
use std::path::Path;

// Whether the file should be excluded from the UI file list.
pub(crate) fn should_exclude_from_ui_file_list(path: &Path, metadata: &Metadata) -> bool {
    if metadata.is_dir() {
        return true;
    }
    if is_shortcut(path, metadata) {
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

#[cfg(windows)]
fn is_shortcut(path: &Path, _: &Metadata) -> bool {
    is_windows_shortcut(path)
}

#[cfg(all(unix, not(target_os = "macos")))]
fn is_shortcut(_: &Path, metadata: &Metadata) -> bool {
    is_unix_symlink(metadata)
}

#[cfg(target_os = "macos")]
fn is_shortcut(path: &Path, metadata: &Metadata) -> bool {
    // Finder aliases are not symlinks; detect them separately.
    is_unix_symlink(metadata) || is_macos_finder_alias(path)
}

#[cfg(windows)]
fn is_windows_shortcut(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("lnk"))
        .unwrap_or(false)
}

#[cfg(unix)]
fn is_unix_symlink(metadata: &Metadata) -> bool {
    metadata.file_type().is_symlink()
}

#[cfg(target_os = "macos")]
const FINDER_INFO_XATTR: &str = "com.apple.FinderInfo";

#[cfg(target_os = "macos")]
fn is_macos_finder_alias(path: &Path) -> bool {
    xattr::get(path, std::ffi::OsStr::new(FINDER_INFO_XATTR))
        .ok()
        .flatten()
        .map(|finder_info| has_macos_alias_finder_flag(&finder_info))
        .unwrap_or(false)
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

#[cfg(test)]
mod tests {
    use super::should_exclude_from_ui_file_list;
    #[cfg(target_os = "macos")]
    use super::{FINDER_INFO_XATTR, has_macos_alias_finder_flag, is_macos_finder_alias};
    use std::fs;
    use tempfile::tempdir;

    // These tests create minimal filesystem fixtures instead of relying on media samples.
    #[test]
    fn keeps_regular_files() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("regular.txt");
        fs::write(&path, "content").unwrap();
        let metadata = fs::symlink_metadata(&path).unwrap();

        assert!(!should_exclude_from_ui_file_list(&path, &metadata));
    }

    #[test]
    fn excludes_directories() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("nested");
        fs::create_dir(&path).unwrap();
        let metadata = fs::symlink_metadata(&path).unwrap();

        assert!(should_exclude_from_ui_file_list(&path, &metadata));
    }

    #[cfg(unix)]
    #[test]
    fn excludes_dot_prefixed_hidden_files() {
        let dir = tempdir().unwrap();
        let path = dir.path().join(".hidden.jpg");
        fs::write(&path, "content").unwrap();
        let metadata = fs::symlink_metadata(&path).unwrap();

        assert!(should_exclude_from_ui_file_list(&path, &metadata));
    }

    #[cfg(unix)]
    #[test]
    fn excludes_unix_symlinks() {
        use std::os::unix::fs::symlink;

        let dir = tempdir().unwrap();
        let target = dir.path().join("target.jpg");
        let link = dir.path().join("link.jpg");
        fs::write(&target, "content").unwrap();
        symlink(&target, &link).unwrap();
        let metadata = fs::symlink_metadata(&link).unwrap();

        assert!(should_exclude_from_ui_file_list(&link, &metadata));
    }

    #[cfg(windows)]
    #[test]
    fn excludes_windows_shortcuts() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("shortcut.LNK");
        fs::write(&path, "content").unwrap();
        let metadata = fs::symlink_metadata(&path).unwrap();

        assert!(should_exclude_from_ui_file_list(&path, &metadata));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn detects_only_the_finder_alias_flag() {
        // Finder stores the alias bit in the big-endian flag bytes at offset 8.
        let mut regular_finder_info = [0; 32];
        regular_finder_info[8] = 0x00;
        regular_finder_info[9] = 0x10;

        let mut alias_finder_info = [0; 32];
        alias_finder_info[8] = 0x80;
        alias_finder_info[9] = 0x00;

        assert!(!has_macos_alias_finder_flag(&regular_finder_info));
        assert!(has_macos_alias_finder_flag(&alias_finder_info));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn detects_macos_finder_alias_from_extended_attribute() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("alias-file");
        fs::write(&path, "content").unwrap();

        let mut finder_info = [0; 32];
        finder_info[8] = 0x80;
        xattr::set(&path, std::ffi::OsStr::new(FINDER_INFO_XATTR), &finder_info).unwrap();

        assert!(is_macos_finder_alias(&path));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn missing_finder_flags_are_not_aliases() {
        assert!(!has_macos_alias_finder_flag(&[0; 8]));
    }
}
