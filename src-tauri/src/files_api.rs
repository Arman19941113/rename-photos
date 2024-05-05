use std::fs;

use crate::file_lib;
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
    if metadata.is_dir() { continue; }

    let path_buf = dir_entry.path();
    let pathname = path_buf.to_str().unwrap();
    // jump invalid file
    if FileUtil::check_is_symlink(pathname) { continue; }
    if FileUtil::check_is_hidden(pathname) { continue; }
    if FileUtil::check_is_system_file(pathname) { continue; }

    files.push(FileInfo {
      pathname: pathname.to_string(),
      filename: path_buf.file_name().unwrap().to_str().unwrap().to_string(),
      modified: file_lib::get_modified_time(metadata),
    })
  }

  Ok(files)
}

#[tauri::command]
pub fn get_files_from_paths(paths: Vec<&str>) -> Result<Vec<FileInfo>, String> {
  // drop 1 folder
  if paths.len() == 1 {
    let pathname = paths[0];
    let metadata = fs::metadata(pathname).map_err(|err| err.to_string())?;
    if metadata.is_dir() {
      return get_files_from_dir(pathname);
    }
  }

  // drop multiple files and folders
  let mut files: Vec<FileInfo> = Vec::new();

  for pathname in paths {
    let metadata = fs::metadata(pathname).map_err(|err| err.to_string())?;
    // jump dir
    if metadata.is_dir() { continue; }
    // jump invalid file
    if FileUtil::check_is_symlink(pathname) { continue; }
    if FileUtil::check_is_hidden(pathname) { continue; }
    if FileUtil::check_is_system_file(pathname) { continue; }

    files.push(FileInfo {
      pathname: pathname.to_string(),
      filename: FileUtil::get_filename(pathname),
      modified: file_lib::get_modified_time(metadata),
    })
  }

  Ok(files)
}
