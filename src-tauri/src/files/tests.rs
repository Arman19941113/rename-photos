use super::{FileEntry, load_directory, load_paths};
use std::fs;
use std::io::ErrorKind;
use std::path::Path;
use tempfile::tempdir;

#[test]
fn reads_direct_files_from_a_directory_without_recursing() {
    // Folder loading is intentionally shallow so nested media is not pulled in implicitly.
    let dir = tempdir().unwrap();
    write_file(&dir.path().join("a.txt"), "a");
    fs::create_dir(dir.path().join("nested")).unwrap();
    write_file(&dir.path().join("nested").join("inside.txt"), "inside");

    let files = load_directory(dir.path()).unwrap();

    assert_eq!(sorted_filenames(files), vec!["a.txt"]);
}

#[test]
fn treats_a_single_path_directory_like_open_folder() {
    let dir = tempdir().unwrap();
    write_file(&dir.path().join("a.txt"), "a");
    write_file(&dir.path().join("b.txt"), "b");
    let path = dir.path();

    let from_dir = sorted_filenames(load_directory(path).unwrap());
    let from_paths = sorted_filenames(load_paths(&[path]).unwrap());

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

    let files = load_paths(&[link_path.as_path()]).unwrap();

    assert_eq!(sorted_filenames(files), Vec::<String>::new());
}

#[test]
fn ignores_directories_in_explicit_path_lists() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("a.txt");
    let nested_path = dir.path().join("nested");
    write_file(&file_path, "a");
    fs::create_dir(&nested_path).unwrap();

    let files = load_paths(&[file_path.as_path(), nested_path.as_path()]).unwrap();

    assert_eq!(sorted_filenames(files), vec!["a.txt"]);
}

#[test]
fn fails_explicit_path_lists_when_any_path_is_missing() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("a.txt");
    let missing_path = dir.path().join("missing.txt");
    write_file(&file_path, "a");

    let result = load_paths(&[file_path.as_path(), missing_path.as_path()]);
    let err = match result {
        Ok(_) => panic!("expected missing path to fail"),
        Err(err) => err,
    };

    assert_eq!(err.kind(), ErrorKind::NotFound);
}

fn write_file(path: &Path, content: &str) {
    fs::write(path, content).unwrap();
}

fn sorted_filenames(files: Vec<FileEntry>) -> Vec<String> {
    let mut filenames = files
        .into_iter()
        .map(|file| file.filename)
        .collect::<Vec<_>>();
    filenames.sort();
    filenames
}
