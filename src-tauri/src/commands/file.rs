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
        let metadata = fs::symlink_metadata(path_str)?;
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

    ensure_rename_targets_are_available(&rename_plans)?;

    // Use a two-phase rename to avoid collisions when multiple files swap names.
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

fn ensure_rename_targets_are_available(rename_plans: &[RenamePlan]) -> io::Result<()> {
    // The backend resolves filenames relative to each old path's parent directory.
    // Before renaming, ensure we never overwrite an unrelated existing file.
    for plan in rename_plans {
        // If `new_path` is also one of the `old_path`s in this batch, it will be freed up
        // during phase 1, so it's safe to proceed.
        if !is_old_path_in_batch(rename_plans, &plan.new_path) && path_is_occupied(&plan.new_path)?
        {
            return Err(path_already_exists_error(&plan.new_path));
        }

        if path_is_occupied(&plan.temp_path)? {
            return Err(path_already_exists_error(&plan.temp_path));
        }
    }

    Ok(())
}

fn is_old_path_in_batch(rename_plans: &[RenamePlan], path: &Path) -> bool {
    rename_plans
        .iter()
        .any(|plan| plan.old_path.as_path() == path)
}

fn path_is_occupied(path: &Path) -> io::Result<bool> {
    match fs::symlink_metadata(path) {
        Ok(_) => Ok(true),
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(err) => Err(err),
    }
}

fn path_already_exists_error(path: &Path) -> io::Error {
    let msg = format!("The file \"{}\" already exist", path.display());
    io::Error::new(io::ErrorKind::AlreadyExists, msg)
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

#[cfg(test)]
mod tests {
    use super::{
        build_rename_plan, get_files_from_dir_inner, get_files_from_paths_inner,
        rename_files_inner, validate_plain_filename,
    };
    use crate::commands::file::types::{IPCFile, RenamePathData};
    use std::fs;
    use std::io::ErrorKind;
    use std::path::Path;
    use tempfile::tempdir;

    // Keep filesystem tests isolated from repository fixtures and user files.
    fn write_file(path: &Path, content: &str) {
        fs::write(path, content).unwrap();
    }

    // The frontend sends filenames only; the backend resolves them beside old_path.
    fn rename_data(old_path: &Path, new_filename: &str, temp_filename: &str) -> RenamePathData {
        RenamePathData {
            old_path: old_path.to_string_lossy().to_string(),
            new_filename: new_filename.to_string(),
            temp_filename: temp_filename.to_string(),
        }
    }

    fn filename_of(file: IPCFile) -> String {
        match file {
            IPCFile::Image { filename, .. }
            | IPCFile::Video { filename, .. }
            | IPCFile::Other { filename, .. } => filename,
        }
    }

    fn sorted_filenames(files: Vec<IPCFile>) -> Vec<String> {
        let mut filenames = files.into_iter().map(filename_of).collect::<Vec<_>>();
        filenames.sort();
        filenames
    }

    #[test]
    fn validates_plain_filenames() {
        assert!(validate_plain_filename("a.jpg", "newFilename").is_ok());

        for filename in ["", "../a.jpg", "dir/a.jpg", "dir\\a.jpg"] {
            let err = validate_plain_filename(filename, "newFilename").unwrap_err();
            assert_eq!(err.kind(), ErrorKind::InvalidInput);
        }
    }

    #[test]
    fn build_rename_plan_resolves_targets_inside_old_parent() {
        let dir = tempdir().unwrap();
        let old_path = dir.path().join("a.txt");
        let plan = build_rename_plan(rename_data(&old_path, "b.txt", "tmp-a.txt")).unwrap();

        assert_eq!(plan.old_path, old_path);
        assert_eq!(plan.new_path, dir.path().join("b.txt"));
        assert_eq!(plan.temp_path, dir.path().join("tmp-a.txt"));
    }

    #[test]
    fn renames_a_single_file() {
        let dir = tempdir().unwrap();
        let old_path = dir.path().join("a.txt");
        let new_path = dir.path().join("b.txt");
        write_file(&old_path, "a");

        let result =
            rename_files_inner(vec![rename_data(&old_path, "b.txt", "tmp-a.txt")]).unwrap();

        assert_eq!(result, vec![new_path.to_string_lossy().to_string()]);
        assert!(!old_path.exists());
        assert_eq!(fs::read_to_string(new_path).unwrap(), "a");
    }

    #[test]
    fn refuses_to_overwrite_unrelated_existing_files() {
        let dir = tempdir().unwrap();
        let old_path = dir.path().join("a.txt");
        let existing_path = dir.path().join("b.txt");
        write_file(&old_path, "a");
        write_file(&existing_path, "existing");

        let err =
            rename_files_inner(vec![rename_data(&old_path, "b.txt", "tmp-a.txt")]).unwrap_err();

        assert_eq!(err.kind(), ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(old_path).unwrap(), "a");
        assert_eq!(fs::read_to_string(existing_path).unwrap(), "existing");
        assert!(!dir.path().join("tmp-a.txt").exists());
    }

    #[test]
    fn refuses_to_overwrite_unrelated_temporary_files() {
        let dir = tempdir().unwrap();
        let old_path = dir.path().join("a.txt");
        let existing_temp_path = dir.path().join("tmp-a.txt");
        write_file(&old_path, "a");
        write_file(&existing_temp_path, "existing-temp");

        let err =
            rename_files_inner(vec![rename_data(&old_path, "b.txt", "tmp-a.txt")]).unwrap_err();

        assert_eq!(err.kind(), ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(old_path).unwrap(), "a");
        assert_eq!(
            fs::read_to_string(existing_temp_path).unwrap(),
            "existing-temp"
        );
        assert!(!dir.path().join("b.txt").exists());
    }

    #[test]
    fn refuses_to_use_batch_old_paths_as_temporary_paths() {
        let dir = tempdir().unwrap();
        let a_path = dir.path().join("a.txt");
        let b_path = dir.path().join("b.txt");
        write_file(&a_path, "from-a");
        write_file(&b_path, "from-b");

        let err = rename_files_inner(vec![
            rename_data(&a_path, "c.txt", "b.txt"),
            rename_data(&b_path, "d.txt", "tmp-b.txt"),
        ])
        .unwrap_err();

        assert_eq!(err.kind(), ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(a_path).unwrap(), "from-a");
        assert_eq!(fs::read_to_string(b_path).unwrap(), "from-b");
        assert!(!dir.path().join("c.txt").exists());
        assert!(!dir.path().join("d.txt").exists());
    }

    #[cfg(unix)]
    #[test]
    fn refuses_to_overwrite_dangling_symlinks() {
        use std::os::unix::fs::symlink;

        let dir = tempdir().unwrap();
        let old_path = dir.path().join("a.txt");
        let dangling_link_path = dir.path().join("b.txt");
        write_file(&old_path, "a");
        symlink(dir.path().join("missing-target.txt"), &dangling_link_path).unwrap();

        let err =
            rename_files_inner(vec![rename_data(&old_path, "b.txt", "tmp-a.txt")]).unwrap_err();

        assert_eq!(err.kind(), ErrorKind::AlreadyExists);
        assert_eq!(fs::read_to_string(old_path).unwrap(), "a");
        assert!(fs::symlink_metadata(dangling_link_path).is_ok());
    }

    #[test]
    fn swaps_names_with_two_phase_rename() {
        // Direct renames would collide here; the temporary phase is the behavior under test.
        let dir = tempdir().unwrap();
        let a_path = dir.path().join("a.txt");
        let b_path = dir.path().join("b.txt");
        write_file(&a_path, "from-a");
        write_file(&b_path, "from-b");

        let result = rename_files_inner(vec![
            rename_data(&a_path, "b.txt", "tmp-a.txt"),
            rename_data(&b_path, "a.txt", "tmp-b.txt"),
        ])
        .unwrap();

        assert_eq!(
            result,
            vec![
                b_path.to_string_lossy().to_string(),
                a_path.to_string_lossy().to_string()
            ]
        );
        assert_eq!(fs::read_to_string(a_path).unwrap(), "from-b");
        assert_eq!(fs::read_to_string(b_path).unwrap(), "from-a");
    }

    #[test]
    fn reads_direct_files_from_a_directory_without_recursing() {
        // Folder loading is intentionally shallow so nested media is not pulled in implicitly.
        let dir = tempdir().unwrap();
        write_file(&dir.path().join("a.txt"), "a");
        fs::create_dir(dir.path().join("nested")).unwrap();
        write_file(&dir.path().join("nested").join("inside.txt"), "inside");

        let files = get_files_from_dir_inner(dir.path().to_str().unwrap()).unwrap();

        assert_eq!(sorted_filenames(files), vec!["a.txt"]);
    }

    #[test]
    fn treats_a_single_path_directory_like_open_folder() {
        let dir = tempdir().unwrap();
        write_file(&dir.path().join("a.txt"), "a");
        write_file(&dir.path().join("b.txt"), "b");
        let path = dir.path().to_str().unwrap();

        let from_dir = sorted_filenames(get_files_from_dir_inner(path).unwrap());
        let from_paths = sorted_filenames(get_files_from_paths_inner(vec![path]).unwrap());

        assert_eq!(from_paths, from_dir);
    }

    #[cfg(unix)]
    #[test]
    fn skips_single_symlinked_directory_instead_of_opening_it() {
        use std::os::unix::fs::symlink;

        let dir = tempdir().unwrap();
        let target_dir = dir.path().join("target");
        let link_path = dir.path().join("link");
        fs::create_dir(&target_dir).unwrap();
        write_file(&target_dir.join("inside.txt"), "inside");
        symlink(&target_dir, &link_path).unwrap();

        let files = get_files_from_paths_inner(vec![link_path.to_str().unwrap()]).unwrap();

        assert_eq!(sorted_filenames(files), Vec::<String>::new());
    }

    #[test]
    fn ignores_directories_in_explicit_path_lists() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("a.txt");
        let nested_path = dir.path().join("nested");
        write_file(&file_path, "a");
        fs::create_dir(&nested_path).unwrap();

        let files = get_files_from_paths_inner(vec![
            file_path.to_str().unwrap(),
            nested_path.to_str().unwrap(),
        ])
        .unwrap();

        assert_eq!(sorted_filenames(files), vec!["a.txt"]);
    }

    #[test]
    fn fails_explicit_path_lists_when_any_path_is_missing() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("a.txt");
        let missing_path = dir.path().join("missing.txt");
        write_file(&file_path, "a");

        let result = get_files_from_paths_inner(vec![
            file_path.to_str().unwrap(),
            missing_path.to_str().unwrap(),
        ]);
        let err = match result {
            Ok(_) => panic!("expected missing path to fail"),
            Err(err) => err,
        };

        assert_eq!(err.kind(), ErrorKind::NotFound);
    }
}
