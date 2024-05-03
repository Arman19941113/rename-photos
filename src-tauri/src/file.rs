use std::error::Error;
use std::fs;
use std::time::UNIX_EPOCH;

#[derive(serde::Serialize)]
pub struct FileInfo {
  pathname: String,
  filename: String,
  modified: u128,
}

pub fn get_files_from_dir(dir: &str) -> Result<Vec<FileInfo>, Box<dyn Error>> {
  let mut results: Vec<FileInfo> = Vec::new();
  let dir_info = fs::read_dir(dir)?;

  for entry in dir_info {
    let entry = entry?;
    let metadata = entry.metadata()?;
    if metadata.is_file() {
      // only files
      let path = entry.path();
      let file_name = path.file_name().unwrap().to_str().unwrap();
      if !starts_with_dot(file_name) {
        // only visible files
        results.push(FileInfo {
          pathname: path.to_str().unwrap().to_owned(),
          filename: file_name.to_owned(),
          modified: metadata.modified()?.duration_since(UNIX_EPOCH)?.as_millis(),
        })
      }
    }
  }

  Ok(results)
}

fn starts_with_dot(s: &str) -> bool {
  if let Some(first_char) = s.chars().next() { return first_char == '.'; }
  false
}
