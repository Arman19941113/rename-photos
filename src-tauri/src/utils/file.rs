use std::fs::Metadata;
use std::path::Path;
use std::time::UNIX_EPOCH;

mod filter;
mod kind;
mod metadata_image;
mod metadata_video;

pub(crate) use filter::should_exclude_from_ui_file_list;
pub(crate) use kind::{FileKind, detect_file_kind};
pub(crate) use metadata_image::{ImageMetadata, analyze_image_metadata};
pub(crate) use metadata_video::{VideoMetadata, analyze_video_metadata};

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
