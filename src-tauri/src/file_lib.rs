use std::path::Path;

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
