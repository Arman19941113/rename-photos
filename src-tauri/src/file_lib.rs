use chrono::prelude::{DateTime, Local};
use exif;
use exif::{In, Tag};
use nom_exif::{MediaParser, MediaSource, TrackInfo, TrackInfoTag};
use std::fs;
use std::fs::Metadata;
#[cfg(windows)]
use std::os::windows::prelude::*;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

// pathname filepath
//   dirname
//   filename
//     basename
//     extname

pub struct FileUtil;

impl FileUtil {
    /// Get filename of the path given
    #[inline]
    pub fn get_filename(file_path: &str) -> String {
        Path::new(&file_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .to_string()
    }

    /// Check if a file is hidden
    ///
    /// Checking file_attributes metadata of a file and check if it is hidden
    #[cfg(windows)]
    #[inline]
    pub fn check_is_hidden(file_path: &str) -> bool {
        let attributes = fs::metadata(file_path).unwrap().file_attributes();

        (attributes & 0x2) > 0
    }

    /// Check if a file is hidden
    ///
    /// Checking a file is hidden by checking if the file name starts with a dot
    #[cfg(unix)]
    #[inline]
    pub fn check_is_hidden(file_path: &str) -> bool {
        Self::get_filename(file_path).starts_with(".")
    }

    /// Check if a file is system file
    ///
    /// Checking file_attributes metadata of a file and check if it is system file
    #[cfg(windows)]
    #[inline]
    pub fn check_is_system_file(file_path: &str) -> bool {
        let attributes = fs::metadata(file_path).unwrap().file_attributes();

        (attributes & 0x4) > 0
    }

    #[cfg(unix)]
    #[inline]
    pub fn check_is_system_file(_: &str) -> bool {
        false
    }
}

pub fn get_created_time(metadata: &Metadata) -> u128 {
    let modified = metadata.created().unwrap_or(SystemTime::UNIX_EPOCH);
    let duration = modified.duration_since(UNIX_EPOCH).unwrap();
    duration.as_millis()
}

pub struct ExifAnalysis {
    pub exif_data: Option<ExifData>,
    pub exif_error: Option<String>,
}

#[derive(serde::Serialize)]
pub struct ExifData {
    date: Option<String>,
    make: Option<String>,
    camera: Option<String>,
    lens: Option<String>,
    focal_length: Option<String>,
    aperture: Option<String>,
    shutter: Option<String>,
    iso: Option<String>,
}

impl ExifAnalysis {
    pub fn new(pathname: &str) -> ExifAnalysis {
        let mut exif_error = None;
        let exif_data = match read_exif(pathname) {
            Ok(data) => Some(data),
            Err(err) => {
                exif_error = Some(err);
                None
            }
        };
        ExifAnalysis {
            exif_data,
            exif_error,
        }
    }
}

fn read_exif(pathname: &str) -> Result<ExifData, String> {
    let mut exif_data = ExifData {
        date: None,
        make: None,
        camera: None,
        lens: None,
        focal_length: None,
        aperture: None,
        shutter: None,
        iso: None,
    };

    // Video
    let mut parser = MediaParser::new();
    let ms = match MediaSource::file_path(pathname) {
        Ok(data) => data,
        Err(err) => return Err(err.to_string()),
    };
    if ms.has_track() {
        let info: TrackInfo = match parser.parse(ms) {
            Ok(info) => info,
            Err(err) => return Err(err.to_string()),
        };
        exif_data.date = match info.get(TrackInfoTag::CreateDate) {
            Some(field) => Some(
                field
                    .to_string()
                    .parse::<DateTime<Local>>()
                    .unwrap()
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string(),
            ),
            None => None,
        };
        exif_data.make = match info.get(TrackInfoTag::Make) {
            Some(field) => Some(field.to_string()),
            None => None,
        };
        exif_data.camera = match info.get(TrackInfoTag::Model) {
            Some(field) => Some(field.to_string()),
            None => None,
        };
        return Ok(exif_data);
    }

    // Image
    let file = match fs::File::open(pathname) {
        Ok(file) => file,
        Err(err) => return Err(err.to_string()),
    };
    let mut buf_reader = std::io::BufReader::new(&file);
    let exif_reader = exif::Reader::new();
    let exif = match exif_reader.read_from_container(&mut buf_reader) {
        Ok(exif) => exif,
        Err(err) => return Err(err.to_string()),
    };

    exif_data.date = match exif.get_field(Tag::DateTimeOriginal, In::PRIMARY) {
        Some(field) => Some(field.display_value().to_string()),
        None => None,
    };
    exif_data.make = match exif.get_field(Tag::Make, In::PRIMARY) {
        Some(field) => Some(field.display_value().to_string().trim_matches('"').into()),
        None => None,
    };
    exif_data.camera = match exif.get_field(Tag::Model, In::PRIMARY) {
        Some(field) => Some(field.display_value().to_string().trim_matches('"').into()),
        None => None,
    };
    exif_data.lens = match exif.get_field(Tag::LensModel, In::PRIMARY) {
        Some(field) => Some(field.display_value().to_string().trim_matches('"').into()),
        None => None,
    };
    exif_data.focal_length = match exif.get_field(Tag::FocalLengthIn35mmFilm, In::PRIMARY) {
        Some(field) => Some(field.display_value().to_string()),
        None => None,
    };
    exif_data.aperture = match exif.get_field(Tag::FNumber, In::PRIMARY) {
        Some(field) => Some(field.display_value().to_string()),
        None => None,
    };
    exif_data.shutter = match exif.get_field(Tag::ExposureTime, In::PRIMARY) {
        Some(field) => Some(field.display_value().to_string()),
        None => None,
    };
    exif_data.iso = match exif.get_field(Tag::PhotographicSensitivity, In::PRIMARY) {
        Some(field) => Some(field.display_value().to_string()),
        None => None,
    };
    Ok(exif_data)
}
