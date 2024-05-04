use std::fs;
use std::time::UNIX_EPOCH;

use crate::file_lib::FileUtil;

#[derive(serde::Serialize)]
pub struct FileInfo {
  pathname: String,
  filename: String,
  modified: u128,
}

#[tauri::command]
pub fn get_files_from_dir(dir_path: &str) -> Result<Vec<FileInfo>, String> {
  let dir_data = fs::read_dir(dir_path).map_err(|err| err.to_string())?;
  let mut files: Vec<FileInfo> = Vec::new();

  for dir_entry in dir_data {
    let dir_entry = dir_entry.map_err(|err| err.to_string())?;
    let metadata = dir_entry.metadata().map_err(|err| err.to_string())?;
    // jump dir
    if !metadata.is_file() { continue; }

    let path_buf = dir_entry.path();
    let pathname = path_buf.to_str().unwrap();
    // jump invalid file
    if FileUtil::check_is_symlink(pathname) { continue; }
    if FileUtil::check_is_hidden(pathname) { continue; }
    if FileUtil::check_is_system_file(pathname) { continue; }

    let filename = path_buf.file_name().unwrap().to_str().unwrap();
    let modified = metadata.modified().map_err(|err| err.to_string())?;
    let duration = modified.duration_since(UNIX_EPOCH).map_err(|err| err.to_string())?;
    files.push(FileInfo {
      pathname: pathname.to_string(),
      filename: filename.to_string(),
      modified: duration.as_millis(),
    })
  }

  Ok(files)
}


