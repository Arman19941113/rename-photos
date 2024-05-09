use std::collections::HashMap;
use std::fs::Metadata;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use exif;
use exif::{In, Tag};

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

  /// Check if a file/dir is a symlink
  #[cfg(windows)]
  #[inline]
  pub fn check_is_symlink(file_path: &str) -> bool {
    let symlink_metadata = match fs::symlink_metadata(file_path) {
      Ok(result) => result,
      Err(_) => return true,
    };

    symlink_metadata.file_attributes() == 1040
  }

  /// Check if a file/dir is a symlink
  #[cfg(unix)]
  #[inline]
  pub fn check_is_symlink(_: &str) -> bool {
    false
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
  pub exif_data: Option<HashMap<String, Option<String>>>,
  pub exif_error: Option<String>,
}

impl ExifAnalysis {
  pub fn new(pathname: &str) -> ExifAnalysis {
    let mut exif_error = None;
    let exif_data = match read_exif(pathname) {
      Ok(data) => Some(data),
      Err(err) => {
        exif_error = Some(err.to_string());
        None
      }
    };
    ExifAnalysis { exif_data, exif_error }
  }
}

fn read_exif(pathname: &str) -> Result<HashMap<String, Option<String>>, exif::Error> {
  let file = std::fs::File::open(pathname)?;
  let mut buf_reader = std::io::BufReader::new(&file);
  let exif_reader = exif::Reader::new();
  let exif = exif_reader.read_from_container(&mut buf_reader)?;

  let mut exif_data = HashMap::new();
  exif_data.insert(String::from("Date"), match exif.get_field(Tag::DateTime, In::PRIMARY) {
    Some(field) => Some(field.display_value().to_string()),
    None => None,
  });
  exif_data.insert(String::from("Make"), match exif.get_field(Tag::Make, In::PRIMARY) {
    Some(field) => Some(field.display_value().to_string().trim_matches('"').into()),
    None => None,
  });
  exif_data.insert(String::from("Camera"), match exif.get_field(Tag::Model, In::PRIMARY) {
    Some(field) => Some(field.display_value().to_string().trim_matches('"').into()),
    None => None,
  });
  exif_data.insert(String::from("Lens"), match exif.get_field(Tag::LensModel, In::PRIMARY) {
    Some(field) => Some(field.display_value().to_string().trim_matches('"').into()),
    None => None,
  });
  exif_data.insert(String::from("FocalLength"), match exif.get_field(Tag::FocalLengthIn35mmFilm, In::PRIMARY) {
    Some(field) => Some(field.display_value().to_string()),
    None => None,
  });
  exif_data.insert(String::from("Aperture"), match exif.get_field(Tag::FNumber, In::PRIMARY) {
    Some(field) => Some(field.display_value().to_string()),
    None => None,
  });
  exif_data.insert(String::from("Shutter"), match exif.get_field(Tag::ExposureTime, In::PRIMARY) {
    Some(field) => Some(field.display_value().to_string()),
    None => None,
  });
  exif_data.insert(String::from("ISO"), match exif.get_field(Tag::PhotographicSensitivity, In::PRIMARY) {
    Some(field) => Some(field.display_value().to_string()),
    None => None,
  });

  Ok(exif_data)
}
