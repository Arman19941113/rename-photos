use std::collections::HashMap;
use std::fs;

use crate::file_lib;
use crate::file_lib::{ExifAnalysis, FileUtil};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcFile {
  pathname: String,
  filename: String,
  created: u128,
  size: u64,
  exif_error: Option<String>,
  exif_data: Option<HashMap<String, Option<String>>>,
}

#[tauri::command]
pub fn get_files_from_dir(dir_path: &str) -> Result<Vec<IpcFile>, String> {
  let dir_data = fs::read_dir(dir_path).map_err(|err| err.to_string())?;
  let mut files: Vec<IpcFile> = Vec::new();

  for dir_entry in dir_data {
    let dir_entry = dir_entry.map_err(|err| err.to_string())?;
    let metadata = dir_entry.metadata().map_err(|err| err.to_string())?;
    let path_buf = dir_entry.path();
    let pathname = path_buf.to_str().unwrap();

    // filter file
    if metadata.is_dir() { continue; }
    if metadata.is_symlink() { continue; }
    if FileUtil::check_is_hidden(pathname) { continue; }
    if FileUtil::check_is_system_file(pathname) { continue; }

    let ExifAnalysis { exif_error, exif_data } = ExifAnalysis::new(pathname);
    files.push(IpcFile {
      pathname: pathname.to_string(),
      filename: path_buf.file_name().unwrap().to_str().unwrap().to_string(),
      created: file_lib::get_created_time(&metadata),
      size: metadata.len(),
      exif_error,
      exif_data,
    })
  }

  Ok(files)
}

#[tauri::command]
pub fn get_files_from_paths(paths: Vec<&str>) -> Result<Vec<IpcFile>, String> {
  // drop 1 folder
  if paths.len() == 1 {
    let pathname = paths[0];
    let metadata = fs::metadata(pathname).map_err(|err| err.to_string())?;
    if metadata.is_dir() {
      return get_files_from_dir(pathname);
    }
  }

  // drop multiple files and folders
  let mut files: Vec<IpcFile> = Vec::new();

  for pathname in paths {
    let metadata = fs::metadata(pathname).map_err(|err| err.to_string())?;

    // filter file
    if metadata.is_dir() { continue; }
    if metadata.is_symlink() { continue; }
    if FileUtil::check_is_hidden(pathname) { continue; }
    if FileUtil::check_is_system_file(pathname) { continue; }

    let ExifAnalysis { exif_error, exif_data } = ExifAnalysis::new(pathname);
    files.push(IpcFile {
      pathname: pathname.to_string(),
      filename: FileUtil::get_filename(pathname),
      created: file_lib::get_created_time(&metadata),
      size: metadata.len(),
      exif_error,
      exif_data,
    })
  }

  Ok(files)
}

#[tauri::command]
pub fn rename_files(rename_path_data: Vec<(&str, &str, &str)>) -> Result<Vec<String>, String> {
  // check exists
  for paths in &rename_path_data {
    let new_path = paths.1;
    if rename_path_data.iter().any(|item| item.0 == new_path) {
      continue;
    }
    let path_buf = std::path::PathBuf::from(new_path);
    if path_buf.exists() {
      let msg = format!("The file \"{}\" already exist", new_path);
      return Err(String::from(msg));
    }
  }

  for path_info in &rename_path_data {
    let (old_name, _, temp_name) = path_info;
    fs::rename(old_name, temp_name).map_err(|err| err.to_string())?;
  }
  for path_info in &rename_path_data {
    let (_, new_name, temp_name) = path_info;
    fs::rename(temp_name, new_name).map_err(|err| err.to_string())?;
  }
  let new_paths = rename_path_data.iter().map(|item| item.1.to_string()).collect();

  Ok(new_paths)
}
