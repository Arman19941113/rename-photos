//! Rename planning, conflict checks, and two-phase filesystem execution.

use std::collections::HashSet;
use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};

#[cfg(test)]
mod tests;

pub(crate) struct RenameOperation {
    pub old_path: PathBuf,
    pub new_filename: String,
    pub temp_filename: String,
}

pub(crate) fn rename_batch(operations: Vec<RenameOperation>) -> io::Result<Vec<PathBuf>> {
    let rename_plans = operations
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
    let new_paths: Vec<PathBuf> = rename_plans.into_iter().map(|plan| plan.new_path).collect();

    Ok(new_paths)
}

fn ensure_rename_targets_are_available(rename_plans: &[RenamePlan]) -> io::Result<()> {
    // The backend resolves filenames relative to each old path's parent directory.
    // Before renaming, ensure we never overwrite an unrelated existing file.
    let old_paths = rename_plans
        .iter()
        .map(|plan| plan.old_path.as_path())
        .collect::<HashSet<_>>();

    for plan in rename_plans {
        // If `new_path` is also one of the `old_path`s in this batch, it will be freed up
        // during phase 1, so it's safe to proceed.
        if !old_paths.contains(plan.new_path.as_path()) && path_is_occupied(&plan.new_path)? {
            return Err(path_already_exists_error(&plan.new_path));
        }

        if path_is_occupied(&plan.temp_path)? {
            return Err(path_already_exists_error(&plan.temp_path));
        }
    }

    Ok(())
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

fn build_rename_plan(operation: RenameOperation) -> io::Result<RenamePlan> {
    validate_plain_filename(&operation.new_filename, "newFilename")?;
    validate_plain_filename(&operation.temp_filename, "tempFilename")?;

    let old_path = operation.old_path;
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

    let new_path = parent_dir.join(operation.new_filename);
    let temp_path = parent_dir.join(operation.temp_filename);

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

struct RenamePlan {
    old_path: PathBuf,
    new_path: PathBuf,
    temp_path: PathBuf,
}
