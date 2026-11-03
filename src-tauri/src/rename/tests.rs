use super::{RenameOperation, build_rename_plan, rename_batch, validate_plain_filename};
use std::fs;
use std::io::ErrorKind;
use std::path::Path;
use tempfile::tempdir;

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

    let result = rename_batch(vec![rename_data(&old_path, "b.txt", "tmp-a.txt")]).unwrap();

    assert_eq!(result, vec![new_path.clone()]);
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

    let err = rename_batch(vec![rename_data(&old_path, "b.txt", "tmp-a.txt")]).unwrap_err();

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

    let err = rename_batch(vec![rename_data(&old_path, "b.txt", "tmp-a.txt")]).unwrap_err();

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

    let err = rename_batch(vec![
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

    let err = rename_batch(vec![rename_data(&old_path, "b.txt", "tmp-a.txt")]).unwrap_err();

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

    let result = rename_batch(vec![
        rename_data(&a_path, "b.txt", "tmp-a.txt"),
        rename_data(&b_path, "a.txt", "tmp-b.txt"),
    ])
    .unwrap();

    assert_eq!(result, vec![b_path.clone(), a_path.clone()]);
    assert_eq!(fs::read_to_string(a_path).unwrap(), "from-b");
    assert_eq!(fs::read_to_string(b_path).unwrap(), "from-a");
}

fn write_file(path: &Path, content: &str) {
    fs::write(path, content).unwrap();
}

fn rename_data(old_path: &Path, new_filename: &str, temp_filename: &str) -> RenameOperation {
    RenameOperation {
        old_path: old_path.to_path_buf(),
        new_filename: new_filename.to_string(),
        temp_filename: temp_filename.to_string(),
    }
}
