//! Tauri adapters for file loading and renaming.

use std::io;
use std::path::PathBuf;

use crate::{files, rename};
use types::{IpcFile, RenameRequest};

mod types;

#[cfg(test)]
mod real_media_tests;

#[tauri::command]
pub async fn get_files_from_dir(dir_path: String) -> Result<Vec<IpcFile>, String> {
    let dir_path = PathBuf::from(dir_path);
    run_blocking(move || {
        files::load_directory(&dir_path).map(|files| files.into_iter().map(IpcFile::from).collect())
    })
    .await
}

#[tauri::command]
pub async fn get_files_from_paths(paths: Vec<String>) -> Result<Vec<IpcFile>, String> {
    let paths = paths.into_iter().map(PathBuf::from).collect::<Vec<_>>();
    run_blocking(move || {
        let path_refs = paths.iter().map(|path| path.as_path()).collect::<Vec<_>>();
        files::load_paths(&path_refs).map(|files| files.into_iter().map(IpcFile::from).collect())
    })
    .await
}

#[tauri::command]
pub async fn rename_files(rename_path_data: Vec<RenameRequest>) -> Result<Vec<String>, String> {
    run_blocking(move || {
        let operations = rename_path_data.into_iter().map(Into::into).collect();
        rename::rename_batch(operations).map(|paths| {
            paths
                .into_iter()
                .map(|path| path.to_string_lossy().into_owned())
                .collect()
        })
    })
    .await
}

async fn run_blocking<T>(task: impl FnOnce() -> io::Result<T> + Send + 'static) -> Result<T, String>
where
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|err| err.to_string())?
        .map_err(|err| err.to_string())
}
