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
pub enum IPCFile {
    #[serde(rename_all = "camelCase")]
    Image {
        pathname: String,
        filename: String,
        created: u128,
        size: u64,
        metadata: Option<crate::utils::file::ImageMetadata>,
        meta_error: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    Video {
        pathname: String,
        filename: String,
        created: u128,
        size: u64,
        metadata: Option<crate::utils::file::VideoMetadata>,
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
