use std::path::Path;

/// A coarse file classification used by the backend to decide how to extract metadata.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum FileKind {
    Image,
    Video,
    Other,
}

pub(crate) fn detect_file_kind(path: &Path) -> FileKind {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match ext.as_str() {
        // Images (common + a few RAW formats)
        "jpg" | "jpeg" | "png" | "webp" | "tif" | "tiff" | "heic" | "heif" | "heics" | "avif"
        | "dng" | "arw" | "cr2" | "cr3" | "nef" | "raf" | "rw2" | "orf" | "sr2" | "srf" | "pef"
        | "x3f" => FileKind::Image,

        // Videos
        "mp4" | "mov" | "m4v" | "3gp" | "avi" | "mkv" | "webm" | "mka" => FileKind::Video,

        _ => FileKind::Other,
    }
}

#[cfg(test)]
mod tests {
    use super::{FileKind, detect_file_kind};
    use std::path::Path;

    // Classification only depends on the path extension, so no real files are needed.
    #[test]
    fn detects_images_case_insensitively() {
        assert_eq!(detect_file_kind(Path::new("a.JPG")), FileKind::Image);
        assert_eq!(detect_file_kind(Path::new("a.jPeG")), FileKind::Image);
    }

    #[test]
    fn detects_raw_images() {
        assert_eq!(detect_file_kind(Path::new("a.ARW")), FileKind::Image);
        assert_eq!(detect_file_kind(Path::new("a.dng")), FileKind::Image);
    }

    #[test]
    fn detects_videos_case_insensitively() {
        assert_eq!(detect_file_kind(Path::new("a.MOV")), FileKind::Video);
        assert_eq!(detect_file_kind(Path::new("a.mp4")), FileKind::Video);
    }

    #[test]
    fn treats_unknown_or_missing_extensions_as_other() {
        assert_eq!(detect_file_kind(Path::new("a.txt")), FileKind::Other);
        assert_eq!(detect_file_kind(Path::new("a")), FileKind::Other);
    }
}
