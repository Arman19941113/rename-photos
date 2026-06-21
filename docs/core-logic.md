# Core Logic

This document summarizes the main runtime logic of Rename Photos as it exists today. It is intended for maintainers who need to understand how files are loaded, transformed, previewed, and finally renamed.

## Runtime Structure

- The React frontend owns the interactive workflow and user state.
- The Tauri Rust backend owns file-system access, file filtering, metadata extraction, and the final rename operation.
- The frontend communicates with the backend through three Tauri commands:
  - `get_files_from_dir`
  - `get_files_from_paths`
  - `rename_files`

Primary entry points:

- Frontend app shell: `src/App.tsx`
- File operations hook: `src/hooks/useFiles.ts`
- Drag-and-drop hook: `src/hooks/useDragging.ts`
- Format input UI events: `src/components/OperationBar.tsx`
- Format input/history hook: `src/hooks/useInputFormat.ts`
- Persistent settings service: `src/services/storage.ts`
- Filename transformation logic: `src/util/file-transformer.ts`
- Shared date/path helpers: `src/util/common.ts`
- Backend file commands: `src-tauri/src/commands/file.rs`
- Backend file helpers: `src-tauri/src/utils/file/*.rs`

## File Input Flow

The app supports two input modes:

### 1. Open folder

- The frontend opens a native directory picker.
- The selected directory is sent to `get_files_from_dir`.
- The backend scans the immediate children of that directory, non-recursively, and returns all UI-eligible files.
- If a scanned child path cannot be represented as UTF-8, the backend returns an error for the whole directory read instead of silently skipping that entry.

### 2. Drag and drop

- The frontend listens for Tauri drag events and forwards dropped paths to `get_files_from_paths`.
- If the user drops exactly one folder path, the backend treats it the same as `get_files_from_dir`.
- Otherwise, the backend treats the payload as an explicit file list and applies the normal UI exclusion filter to each supplied path, so directories and other excluded paths are ignored.
- For explicit file lists, if filesystem metadata for any supplied path cannot be read, the whole load fails instead of returning a partial list. EXIF/media metadata extraction errors do not fail the load; they populate `metaError` on that file.

This distinction matters for rename conflicts:

- Opening a folder loads the immediate files in that directory into the app.
- Dropping specific files loads only those files.
- Files in the same directory that were not dropped are not included in the frontend preview set.

## Backend File Filtering

When the backend builds a file list, it excludes items that should not appear in the UI:

- directories
- Windows `.lnk` shortcuts
- Unix symlinks
- macOS Finder aliases detected by reading the `com.apple.FinderInfo` extended attribute and checking its Finder alias flag
- hidden files, detected by dot-prefixed filenames on Unix/macOS and by the hidden file attribute on Windows
- Windows system files, detected by the system file attribute

This filtering happens before metadata extraction and before the frontend receives any file entries.

## File Classification and Metadata

Each accepted path is classified into one of three kinds:

- `image`
- `video`
- `other`

Classification is based on file extension in `src-tauri/src/utils/file/kind.rs`.

Image extensions:

- `jpg`, `jpeg`, `png`, `webp`, `tif`, `tiff`, `heic`, `heif`, `heics`, `avif`
- RAW-like formats: `dng`, `arw`, `cr2`, `cr3`, `nef`, `raf`, `rw2`, `orf`, `sr2`, `srf`, `pef`, `x3f`

Video extensions:

- `mp4`, `mov`, `m4v`, `3gp`, `avi`, `mkv`, `webm`, `mka`

Everything else that passes filtering is classified as `other`.

Metadata extraction is best-effort:

- Images use the Rust `exif` crate.
- Videos use `nom_exif`.
- If extraction fails, the file is still returned, but `metaError` is populated.
- If extraction succeeds but fields are missing, the metadata object may be partial.
- `other` files are listed without metadata.

Runtime metadata fields:

- Images expose `date`, `make`, `camera`, `lens`, `focalLength`, `aperture`, `shutter`, and `iso`.
- Videos expose `date`, `make`, and `camera`.
- Image fields are read from EXIF tags `DateTimeOriginal`, `Make`, `Model`, `LensModel`, `FocalLengthIn35mmFilm`, `FNumber`, `ExposureTime`, and `PhotographicSensitivity`.
- Video fields are read from `nom_exif` track tags `CreateDate`, `Make`, and `Model`.
- Image date strings are whatever `exif` returns for `DateTimeOriginal`, commonly `YYYY:MM:DD HH:mm:ss`.
- Video date strings are normalized to local `YYYY-MM-DD HH:mm:ss` when `nom_exif` returns a parseable local/RFC3339 value; otherwise the raw value is kept.
- If parsing succeeds but none of the tracked fields are present, the backend returns `metadata: null` with no `metaError`.

The frontend converts backend payloads into `UIFile` items and assigns a metadata status:

- `SUCCESS`: metadata exists and all tracked fields are present
- `WARNING`: metadata is missing partially or entirely
- `ERROR`: backend parsing returned an explicit error

These statuses drive the table icons and tooltips.

## Rename Rule Input and Persistent Settings

The rename format is a plain string template. Supported variables are declared in `src/const/index.ts`:

- date parts: `{YYYY}`, `{MM}`, `{DD}`, `{hh}`, `{mm}`, `{ss}`
- common metadata/date: `{Date}`, `{Make}`, `{Camera}`
- image metadata: `{Lens}`, `{FocalLength}`, `{Aperture}`, `{Shutter}`, `{ISO}`
- current filename variables: `{Current}`, `{current}`

`useInputFormat` owns the visible input value, active format, and format history. `OperationBar` owns the actual input events.

The input field trims leading/trailing spaces before updating the active format. During IME composition, format updates are deferred until composition ends.

There is no separate template validation step before rename execution:

- an empty active format makes preview mark every file as skipped; clicking Rename then shows the "nothing to rename" toast and does not call the backend
- filename-forbidden characters in template text or metadata replacement values are removed during preview generation instead of blocking the rename

The frontend persists several user settings in local storage:

- language
- strict mode
- use created date
- format history

Default settings:

- `strictMode`: off
- `useCreatedDate`: off
- `language`: saved value, otherwise browser language with Chinese selected for `zh*` locales and English otherwise
- `format history`: `['{YYYY}{MM}{DD} {hh}.{mm}.{ss}']`

Format history keeps the latest five unique values and is shown in the input history dropdown. The history is updated only after a successful rename, not on every input edit.

## Preview Filename Generation

Preview generation happens entirely in the frontend through `transformIPCFiles`.

### Ordering

- Files are sorted by current filename using locale-aware numeric comparison before preview data is produced.

### Base UI transformation

For each file, the frontend computes:

- current path and directory
- original filename
- human-readable creation time
- human-readable file size
- metadata status and tooltip text

### Strict mode

If the active format is empty, preview treats every file as skipped and keeps the original filename.

If strict mode is enabled, a file is skipped when its current rename template cannot be fully satisfied.

Examples:

- If the template uses `{Date}` and `useCreatedDate` is disabled, files without metadata date are skipped.
- If the template uses `{Lens}`, files without lens metadata are skipped.

Skipped files keep their original filename and are excluded from the rename request.

If strict mode is disabled, missing variables do not cause a skip. Missing values are replaced with readable placeholder text such as `YYYY`, `Date`, `Make`, `Lens`, or `ISO`.

### Created date option

If `useCreatedDate` is enabled, date variables come from the file creation timestamp instead of metadata date. Date variables include both the split date parts and `{Date}`.

The backend sends the file creation timestamp in milliseconds. If the platform cannot provide a creation timestamp, the backend falls back to the Unix epoch before the frontend formats it in local time.

### Sanitization

`generateFilename` sanitizes both the literal template text and variable replacement values before use.

The current sanitizer removes these characters:

- `\ / : * ? " < > |`

This means the preview can silently differ from the text the user typed. For example, a literal `a:b` segment becomes `ab`. There is no rename-time error specifically for forbidden characters.

### Extension handling

The rename format is treated as the target basename. `generateFilename` always appends the original extension from the current filename.

Implications:

- users should not include an extension in the format string
- if the format is `archive` and the original file is `IMG_0001.JPG`, the preview target is `archive.JPG`
- if the format is `archive.jpg` and the original file is `IMG_0001.JPG`, the preview target is `archive.jpg.JPG`

### Duplicate handling inside the loaded set

The frontend detects duplicate target names only within the files currently loaded in the app.

Behavior:

- Detection is case-insensitive.
- If multiple loaded files resolve to the same target filename, the app appends numbered suffixes such as `_1`, `_2`, and so on. Suffix numbers are padded to the width of the duplicate group size, so 10 duplicates receive `_01` through `_10`.
- Every non-skipped file in a duplicate group receives a suffix, including the first item in that group.
- The suffix is inserted before the extension-like segment of the generated preview filename. In normal use this is the original file extension, because `generateFilename` appends it to the generated basename.
- Files whose final preview filename equals the original filename are marked as `shouldSkip`.
- Strict-mode skipped files still contribute their original filenames to duplicate counting, so renamed files avoid colliding with files that will stay unchanged.

Important limitation:

- This duplicate handling does not consider files that exist on disk but are not currently loaded in the UI.
- If the user dropped only 5 files out of a 10-file directory, preview deduplication sees only those 5 files.
- Duplicate detection is not grouped by directory. If loaded files from different folders resolve to the same filename, the frontend still treats them as duplicates and appends suffixes.
- The current implementation keeps an internal `nameMap` keyed by original filename rather than full path. If two loaded files from different directories have the same original filename, their preview mapping can overwrite each other. Treat this as an implementation limitation, not a behavior to rely on.

## Rename Execution Flow

When the user clicks Rename:

1. The frontend selects all files where `shouldSkip === false`.
2. It builds a rename payload shaped as `{ oldPath, newFilename, tempFilename }[]`.
3. `oldPath` is the backend-provided `pathname`.
4. `newFilename` is the preview filename generated by the frontend.
5. `tempFilename` is `<timestamp>_<originalFilename>`.
6. The payload is sent to the backend `rename_files` command.

The frontend does not construct full target paths. The backend validates that `newFilename` and `tempFilename` are plain filenames, then resolves both against the parent directory of `oldPath` with Rust `Path::join`.

If a rename is already running, additional clicks are ignored. If no file needs renaming, the frontend shows a "nothing to rename" toast and does not call the backend.

## Existing-File Conflict Handling

The backend first converts each payload item into a concrete rename plan:

- `old_path` comes from `oldPath`
- `new_path` is `parent(oldPath).join(newFilename)`
- `temp_path` is `parent(oldPath).join(tempFilename)`

Then it performs a preflight conflict check before any rename happens.

For each `new_path`:

- If that path is also one of the batch `old_path` values, the backend allows it because the two-phase rename will free that path first.
- Otherwise, if `new_path` already exists on disk, the backend returns an `AlreadyExists` error immediately.

The preflight check only covers final `new_path` targets. It does not preflight every generated `tempPath`, so an existing temporary path can still make phase 1 fail.

The backend also does not currently deduplicate final `new_path` values inside the payload; it relies on the frontend preview generation to avoid duplicate targets. Path equality is based on the derived `PathBuf` values and is not canonicalized.

This is the key behavior for partial drag-and-drop scenarios:

- The frontend preview does not know about unrelated files that were not loaded.
- The backend still checks the real filesystem.
- If a dropped file wants to rename to a filename already used by a non-dropped file in the same directory, the rename request fails.

Current behavior is batch failure, not partial success:

- The backend does the existence check before phase 1 starts.
- If a conflict is found, no file in the batch is renamed.
- The frontend shows the backend error message in an error dialog.

Frontend errors are routed through `useError` and displayed with Tauri's native `message` dialog. String errors are shown directly; `Error.message` is used when available; otherwise the localized system-error text is used.

## Two-Phase Rename

If preflight checks pass, the backend performs a two-phase rename:

1. `oldPath -> tempPath`
2. `tempPath -> newPath`

Why this exists:

- It avoids collisions when multiple files swap names.
- It allows a target path that is currently occupied by another file in the same batch.

This design reduces common collision cases, but it is still a filesystem operation rather than a full transaction manager.

If phase 1 or phase 2 fails after some renames have already happened, the backend currently returns the filesystem error and does not roll back earlier operations.

## Post-Rename Refresh

After a successful rename:

- The backend returns the new paths.
- The frontend rebuilds the current file list from:
  - unchanged files that were skipped
  - renamed files returned by the backend
- The rebuild goes through `handleDropFiles`, so the combined paths are loaded through the explicit-path backend command.
- The selected file is remapped to its new path when possible.
- A success toast is shown.
- The current format is written back into format history.

## UI Presentation Rules

The table displays:

- original filename
- preview filename
- metadata status icon

If a file is marked `shouldSkip`, the preview filename column is left blank.

The side panel displays:

- a preview image when possible
- for videos smaller than `50_000_000` bytes, an asset URL is attempted through the same image element; there is no video player or thumbnail extraction step
- basic file info
- extracted metadata fields

Current preview rule:

- images are previewable
- videos are attempted only when size is below `50_000_000` bytes, and fall back to the generic file icon if the image load fails
- other files fall back to a generic file icon

Drag-and-drop events are ignored while the settings panel is open.

## Practical Summary

The core design is split deliberately:

- the frontend computes a user-facing rename preview from the currently loaded files
- the backend blocks overwriting unrelated files at execution time

As a result, duplicate handling and conflict handling are related but not identical:

- frontend duplicate handling resolves collisions inside the loaded preview set
- backend conflict handling blocks overwriting unrelated files already present on disk

That difference is why a batch can look valid in the UI preview but still fail during rename when only part of a directory was loaded.
