//! Tauri commands for file system operations.
//! get_files_from_dir: get files from a directory
//! get_files_from_paths: get files from a list of paths
//! rename_files: rename a list of files

use std::fs;
use std::fs::Metadata;
use std::io;
use std::path::{Component, Path, PathBuf};

mod types;

use self::types::{IPCFile, RenamePathData};
use crate::utils::file::{
    FileKind, analyze_image_metadata, analyze_video_metadata, detect_file_kind,
    get_created_timestamp, get_filename, should_exclude_from_ui_file_list,
};

#[tauri::command]
pub fn get_files_from_dir(dir_path: &str) -> Result<Vec<IPCFile>, String> {
    get_files_from_dir_inner(dir_path).map_err(|err| err.to_string())
}

fn build_ipc_file(path_str: &str, metadata: &Metadata) -> IPCFile {
    let pathname = path_str.to_string();
    let filename = get_filename(path_str);
    let created = get_created_timestamp(metadata);
    let size = metadata.len();

    match detect_file_kind(path_str) {
        FileKind::Image => {
            let (metadata, meta_error) = analyze_image_metadata(path_str);
            IPCFile::Image {
                pathname,
                filename,
                created,
                size,
                metadata,
                meta_error,
            }
        }
        FileKind::Video => {
            let (metadata, meta_error) = analyze_video_metadata(path_str);
            IPCFile::Video {
                pathname,
                filename,
                created,
                size,
                metadata,
                meta_error,
            }
        }
        FileKind::Other => IPCFile::Other {
            pathname,
            filename,
            created,
            size,
        },
    }
}

fn get_files_from_dir_inner(dir_path: &str) -> std::io::Result<Vec<IPCFile>> {
    let dir_entries = fs::read_dir(dir_path)?;
    let mut files = Vec::new();

    for entry_result in dir_entries {
        let entry = entry_result?;
        let path_buf = entry.path();
        // Use `symlink_metadata` so `file_type().is_symlink()` works as expected.
        let metadata = fs::symlink_metadata(&path_buf)?;
        // Get the path as a string.
        let Some(path_str) = path_buf.to_str() else {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Non-UTF-8 path encountered: {}", path_buf.display()),
            ));
        };

        // Skip folders, symlinks, hidden files, and (on Windows) system files.
        if should_exclude_from_ui_file_list(&path_buf, &metadata) {
            continue;
        }

        files.push(build_ipc_file(path_str, &metadata))
    }

    Ok(files)
}

#[tauri::command]
pub fn get_files_from_paths(paths: Vec<&str>) -> Result<Vec<IPCFile>, String> {
    get_files_from_paths_inner(paths).map_err(|err| err.to_string())
}

fn get_files_from_paths_inner(paths: Vec<&str>) -> std::io::Result<Vec<IPCFile>> {
    // If the user drops a single folder path, treat it like "open folder".
    if let [path_str] = paths.as_slice() {
        let metadata = fs::metadata(path_str)?;
        if metadata.is_dir() {
            return get_files_from_dir_inner(path_str);
        }
    }

    // Otherwise treat every input as a file path and ignore directories.
    let mut files = Vec::new();

    for path_str in paths {
        let path = Path::new(path_str);
        let metadata = fs::symlink_metadata(path)?;

        if should_exclude_from_ui_file_list(path, &metadata) {
            continue;
        }

        files.push(build_ipc_file(path_str, &metadata))
    }

    Ok(files)
}

#[tauri::command]
pub fn rename_files(rename_path_data: Vec<RenamePathData>) -> Result<Vec<String>, String> {
    rename_files_inner(rename_path_data).map_err(|err| err.to_string())
}

struct RenamePlan {
    old_path: PathBuf,
    new_path: PathBuf,
    temp_path: PathBuf,
}

fn rename_files_inner(rename_path_data: Vec<RenamePathData>) -> io::Result<Vec<String>> {
    let rename_plans = rename_path_data
        .into_iter()
        .map(build_rename_plan)
        .collect::<io::Result<Vec<_>>>()?;

    // Frontend input shape: `[{ oldPath, newFilename, tempFilename }, ...]`.
    // The backend resolves filenames relative to each old path's parent directory.
    //
    // We use a two-phase rename to avoid collisions when multiple files swap names:
    // 1) oldPath -> tempPath
    // 2) tempPath -> newPath
    //
    // Before renaming, ensure we never overwrite an unrelated existing file.
    for plan in &rename_plans {
        // If `new_path` is also one of the `old_path`s in this batch, it will be freed up
        // during phase 1, so it's safe to proceed.
        if rename_plans
            .iter()
            .any(|other| other.old_path.as_path() == plan.new_path.as_path())
        {
            continue;
        }
        if plan.new_path.exists() {
            let msg = format!("The file \"{}\" already exist", plan.new_path.display());
            return Err(io::Error::new(io::ErrorKind::AlreadyExists, msg));
        }
    }

    // Phase 1: move everything to a temporary path.
    for plan in &rename_plans {
        fs::rename(&plan.old_path, &plan.temp_path)?;
    }
    // Phase 2: move temporary paths into their final targets.
    for plan in &rename_plans {
        fs::rename(&plan.temp_path, &plan.new_path)?;
    }
    let new_paths: Vec<String> = rename_plans
        .into_iter()
        .map(|plan| plan.new_path.to_string_lossy().to_string())
        .collect();

    Ok(new_paths)
}

fn build_rename_plan(rename_data: RenamePathData) -> io::Result<RenamePlan> {
    validate_plain_filename(&rename_data.new_filename, "newFilename")?;
    validate_plain_filename(&rename_data.temp_filename, "tempFilename")?;

    let old_path = PathBuf::from(rename_data.old_path);
    let parent_dir = old_path
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "Cannot determine parent directory for \"{}\"",
                    old_path.display()
                ),
            )
        })?;

    let new_path = parent_dir.join(rename_data.new_filename);
    let temp_path = parent_dir.join(rename_data.temp_filename);

    Ok(RenamePlan {
        old_path,
        new_path,
        temp_path,
    })
}

fn validate_plain_filename(filename: &str, label: &str) -> io::Result<()> {
    let mut components = Path::new(filename).components();
    let is_plain_filename = matches!(components.next(), Some(Component::Normal(_)))
        && components.next().is_none()
        && !filename.contains('/')
        && !filename.contains('\\');

    if !is_plain_filename {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("{label} must be a plain filename: \"{filename}\""),
        ));
    }

    Ok(())
}
