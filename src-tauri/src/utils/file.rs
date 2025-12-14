use std::fs::Metadata;
use std::path::Path;
use std::time::UNIX_EPOCH;

mod check;
mod exif;

pub(crate) use check::should_skip_file;
pub(crate) use exif::{ExifData, analyze_exif};

pub(crate) fn get_created_timestamp(metadata: &Metadata) -> u128 {
    metadata
        .created()
        .unwrap_or(UNIX_EPOCH)
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

pub(crate) fn get_filename(path_str: &str) -> String {
    Path::new(path_str)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_string()
}
