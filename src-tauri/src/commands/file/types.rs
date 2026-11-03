use crate::files::{FileEntry, FileMedia};
use crate::metadata::{ImageMetadata, VideoMetadata};
use crate::rename::RenameOperation;

/// Data returned to frontend via IPC for a single file.
///
/// ```json
/// {
///   "pathname": "/Users/username/Downloads/iPhone.HEIC",
///   "filename": "iPhone.HEIC",
///   "created": 1715225328000,
///   "size": 2190180,
///   "fileType": "image",
///   "metadata": {
///     "date": "2024-05-09 11:17:13",
///     "make": "Apple",
///     "camera": "iPhone 14 Plus",
///     "lens": "iPhone 14 Plus back dual wide camera 5.7mm f/1.5",
///     "focalLength": "26",
///     "aperture": "1.5",
///     "shutter": "1/11364",
///     "iso": "50"
///   },
///   "metaError": null
/// }
/// ```
#[derive(serde::Serialize)]
#[serde(tag = "fileType", rename_all = "lowercase")]
pub enum IpcFile {
    #[serde(rename_all = "camelCase")]
    Image {
        pathname: String,
        filename: String,
        created: u128,
        size: u64,
        metadata: Option<ImageMetadata>,
        meta_error: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    Video {
        pathname: String,
        filename: String,
        created: u128,
        size: u64,
        metadata: Option<VideoMetadata>,
        meta_error: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    Other {
        pathname: String,
        filename: String,
        created: u128,
        size: u64,
    },
}

/// Rename request sent by the frontend for a single file.
///
/// `new_filename` and `temp_filename` must be plain filenames. The backend
/// resolves them against the parent directory of `old_path`.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameRequest {
    pub old_path: String,
    pub new_filename: String,
    pub temp_filename: String,
}

impl From<FileEntry> for IpcFile {
    fn from(file: FileEntry) -> Self {
        let FileEntry {
            pathname,
            filename,
            created,
            size,
            media,
        } = file;

        match media {
            FileMedia::Image { metadata, error } => Self::Image {
                pathname,
                filename,
                created,
                size,
                metadata,
                meta_error: error,
            },
            FileMedia::Video { metadata, error } => Self::Video {
                pathname,
                filename,
                created,
                size,
                metadata,
                meta_error: error,
            },
            FileMedia::Other => Self::Other {
                pathname,
                filename,
                created,
                size,
            },
        }
    }
}

impl From<RenameRequest> for RenameOperation {
    fn from(request: RenameRequest) -> Self {
        Self {
            old_path: request.old_path.into(),
            new_filename: request.new_filename,
            temp_filename: request.temp_filename,
        }
    }
}
