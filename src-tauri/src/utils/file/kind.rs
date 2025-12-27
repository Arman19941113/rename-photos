use std::path::Path;

/// A coarse file classification used by the backend to decide how to extract metadata.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum FileKind {
    Image,
    Video,
    Other,
}

pub(crate) fn detect_file_kind(path_str: &str) -> FileKind {
    let ext = Path::new(path_str)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match ext.as_str() {
        // Images (common + a few RAW formats)
        "jpg" | "jpeg" | "tif" | "tiff" | "heic" | "heif" | "heics" | "avif" | "dng" | "arw"
        | "cr2" | "cr3" | "nef" | "raf" | "rw2" | "orf" | "sr2" | "srf" | "pef" | "x3f" => {
            FileKind::Image
        }

        // Videos
        "mp4" | "mov" | "m4v" | "3gp" | "avi" | "mkv" | "webm" | "mka" => FileKind::Video,

        _ => FileKind::Other,
    }
}
