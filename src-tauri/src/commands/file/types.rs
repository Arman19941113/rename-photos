use crate::utils::file::ExifData;

/// Data returned to frontend via IPC for a single file.
///
/// ```json
/// {
///   "pathname": "/Users/username/Downloads/iPhone.HEIC",
///   "filename": "iPhone.HEIC",
///   "created": 1715225328000,
///   "size": 2190180,
///   "exif_error": null,
///   "exif_data": {
///     "date": "2024-05-09 11:17:13",
///     "make": "Apple",
///     "camera": "iPhone 14 Plus",
///     "lens": "iPhone 14 Plus back dual wide camera 5.7mm f/1.5",
///     "focalLength": "26",
///     "aperture": "1.5",
///     "shutter": "1/11364",
///     "iso": "50"
///   }
/// }
/// ```
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcFile {
    pub(crate) pathname: String,
    pub(crate) filename: String,
    pub(crate) created: u128,
    pub(crate) size: u64,
    pub(crate) exif_error: Option<String>,
    pub(crate) exif_data: Option<ExifData>,
}
