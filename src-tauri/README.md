## Tauri Rust Backend (`src-tauri/src`)

This folder contains the Rust backend for the Tauri desktop app. The frontend (TypeScript) calls into Rust via `invoke()` using the command names defined in `src/const/index.ts` (`TauriCommand`).

### IPC Commands

All commands are registered in `src-tauri/src/main.rs` and implemented in `src-tauri/src/commands/file.rs`:

- `get_files_from_dir`  
  Input: `dirPath: string`  
  Output: `IPCFile[]`  
  Reads the directory and returns a list of files with basic metadata plus best-effort EXIF information.

- `get_files_from_paths`  
  Input: `paths: string[]`  
  Output: `IPCFile[]`  
  Handles drag-and-drop. If a single folder is provided, it behaves like `get_files_from_dir`. Otherwise it treats inputs as file paths and ignores directories.

- `rename_files`  
  Input: `renamePathData: [oldPath: string, newPath: string, tempPath: string][]`  
  Output: `string[]` (the new paths)  
  Performs a two-phase rename (`old -> temp -> new`) to avoid collisions when renaming multiple files.

### File Filtering

When building a file list (`get_files_from_dir` / `get_files_from_paths`), Rust skips items that would be confusing or unsafe to show:

- directories
- symlinks
- hidden files
- Windows system files

### Data Returned to the Frontend

- `IPCFile` (`src-tauri/src/commands/file/types.rs`) is the IPC payload for one file:
  - `pathname`: full path
  - `filename`: basename
  - `created`: creation time in milliseconds since Unix epoch (may be `0` if unavailable)
  - `size`: file size in bytes
  - `metadata`: optional EXIF fields for template substitution
  - `metaError`: error string when metadata parsing fails

- `metadata` (`src-tauri/src/utils/file/metadata_image.rs` and `src-tauri/src/utils/file/metadata_video.rs`) is a set of optional string fields such as `date`, `make`, `camera`, etc. All fields are optional because files may not contain metadata or may be partially populated.

### Metadata Extraction

Metadata parsing is best-effort and never blocks listing files:

- Videos: use `nom_exif` to read container track metadata.
- Images: use the `exif` crate to read tags like `DateTimeOriginal`, `Make`, `Model`, etc.

If parsing fails, the file is still returned with `metaError` populated.
