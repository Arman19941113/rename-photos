//! File loading, eligibility filtering, and media metadata collection.

use std::fs::{self, Metadata};
use std::io;
use std::path::Path;
use std::time::UNIX_EPOCH;

use nom_exif::MediaParser;

use crate::metadata::{
    ImageMetadata, VideoMetadata, analyze_image_metadata, analyze_video_metadata,
};
use filter::should_exclude_from_ui_file_list;
use kind::{FileKind, detect_file_kind};

mod filter;
mod kind;

#[cfg(test)]
mod tests;

pub(crate) struct FileEntry {
    pub pathname: String,
    pub filename: String,
    pub created: u128,
    pub size: u64,
    pub media: FileMedia,
}

pub(crate) enum FileMedia {
    Image {
        metadata: Option<ImageMetadata>,
        error: Option<String>,
    },
    Video {
        metadata: Option<VideoMetadata>,
        error: Option<String>,
    },
    Other,
}

pub(crate) fn load_directory(dir_path: &Path) -> std::io::Result<Vec<FileEntry>> {
    let dir_entries = fs::read_dir(dir_path)?;
    let mut files = Vec::new();
    let mut parser = MediaParser::new();

    for entry_result in dir_entries {
        let entry = entry_result?;
        let path_buf = entry.path();
        // Use `symlink_metadata` so `file_type().is_symlink()` works as expected.
        let metadata = fs::symlink_metadata(&path_buf)?;
        let path_str = path_to_str(&path_buf)?;

        // Skip folders, symlinks, hidden files, and (on Windows) system files.
        if should_exclude_from_ui_file_list(&path_buf, &metadata) {
            continue;
        }

        files.push(build_file_entry(
            &path_buf,
            path_str,
            &metadata,
            &mut parser,
        ))
    }

    Ok(files)
}

pub(crate) fn load_paths(paths: &[&Path]) -> std::io::Result<Vec<FileEntry>> {
    // If the user drops a single folder path, treat it like "open folder".
    if let [path] = paths {
        let path = *path;
        let metadata = fs::symlink_metadata(path)?;
        if metadata.is_dir() {
            return load_directory(path);
        }
    }

    // Otherwise treat every input as a file path and ignore directories.
    let mut files = Vec::new();
    let mut parser = MediaParser::new();

    for &path in paths {
        let metadata = fs::symlink_metadata(path)?;

        if should_exclude_from_ui_file_list(path, &metadata) {
            continue;
        }

        files.push(build_file_entry(
            path,
            path_to_str(path)?,
            &metadata,
            &mut parser,
        ))
    }

    Ok(files)
}

fn path_to_str(path: &Path) -> io::Result<&str> {
    path.to_str().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Non-UTF-8 path encountered: {}", path.display()),
        )
    })
}

fn build_file_entry(
    path: &Path,
    path_str: &str,
    metadata: &Metadata,
    parser: &mut MediaParser,
) -> FileEntry {
    let media = match detect_file_kind(path) {
        FileKind::Image => {
            let (metadata, error) = analyze_image_metadata(path, parser);
            FileMedia::Image { metadata, error }
        }
        FileKind::Video => {
            let (metadata, error) = analyze_video_metadata(path, parser);
            FileMedia::Video { metadata, error }
        }
        FileKind::Other => FileMedia::Other,
    };

    FileEntry {
        pathname: path_str.to_string(),
        filename: get_filename(path),
        created: get_created_timestamp(metadata),
        size: metadata.len(),
        media,
    }
}

fn get_created_timestamp(metadata: &Metadata) -> u128 {
    metadata
        .created()
        .unwrap_or(UNIX_EPOCH)
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn get_filename(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_string()
}
