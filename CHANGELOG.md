# Changelog

## [v1.0.2] - 2026-06-28

### Added

- Added Panasonic RW2 RAW metadata fallback so RW2 photos can expose capture metadata for rename templates.

### Fixed

- Improved media preview rendering in the file detail view.

### Changed

- Added zebra striping to the file table for easier scanning.
- Refreshed app icon assets across desktop and mobile bundle outputs.

## [v1.0.1] - 2026-06-23

### Changed

- Hardened file loading and rename preflight checks to better reject unsupported, hidden, shortcut, and conflicting paths before rename operations run.
- Improved macOS Finder alias detection by reading the alias extended attribute directly during file filtering.
- Refactored internal file APIs to use path-based inputs consistently across metadata reading and file classification.
- Moved heavier file commands onto blocking async tasks so metadata loading and rename operations avoid blocking the Tauri async runtime.

### Tests

- Added unit test coverage for rename template generation, date formatting, file filtering, file classification, and rename preflight behavior.

## [v1.0.0] - 2026-06-21

### Added

- Added an option to use the file creation date for date-based template variables, making files without image EXIF or video metadata easier to rename.
- Preserved the current file selection after renaming and moved the selection to the renamed path when possible.
- Added a dedicated frontend storage service for language, strict mode, created-date preference, and format history.
- Added dedicated Rust command and file utility modules for file loading, filtering, file type detection, image metadata, and video metadata.
- Added `src-tauri/README.md` with backend implementation notes.

### Changed

- Refactored IPC file payloads to distinguish image, video, and other files.
- Refactored rename preview generation to check whether the selected template can be satisfied by the available metadata.
- Improved strict mode so files with insufficient metadata are skipped instead of being renamed with placeholders.
- Improved duplicate target name handling with case-insensitive conflict detection and sequence suffixes.
- Moved localization resources from TypeScript files to JSON files and reorganized translation keys.
- Refactored frontend file operation hooks, file types, and settings state naming.
- Refactored Rust file filtering to consistently ignore directories, shortcuts, hidden files, and Windows system files.
- Updated README and website content to document video metadata support and created-date fallback behavior.

### Fixed

- Fixed selection preservation in rename flows where the selected file path changed.
- Improved video datetime parsing for common date formats while preserving raw values when parsing fails.

### Removed

- Removed in-app update checking and updater-related code.
- Removed the old `file_lib.rs` and `files_api.rs` backend entry points in favor of command and utility modules.

## [v0.1.2] - 2025-04-22

### Changed

- Replaced the sponsor prompt in the About view with a GitHub star link.
- Updated README, website download links, and the Tauri app version to `0.1.2`.

### Removed

- Removed the sponsor modal and payment QR code assets.

## [v0.1.1] - 2025-04-22

### Added

- Added an in-app check-for-updates entry that can download, install, and relaunch when a new version is available.
- Added a Next.js website with English and Chinese pages, usage steps, download links, and product screenshots.
- Added website image assets, full-page scrolling behavior, a Mac window preview component, and website utilities.

### Changed

- Updated Tauri updater configuration and capabilities for update support.
- Updated README download instructions and project configuration.
- Adjusted build configuration by removing the old GitHub CI setup and adding Vercel configuration.
- Formatted Rust code and updated dependencies.

## [v0.1.0] - 2024-10-12

### Added

- Added video metadata support so video files can use fields such as `Date`, `Make`, and `Camera` in rename templates.
- Added `nom-exif` and `chrono` for media metadata and datetime parsing.

### Changed

- Closed the settings modal after copying help documentation.
- Updated README content to describe video compatibility.

### Fixed

- Fixed timezone handling for media datetime fields.

## [v0.0.4] - 2024-09-21

### Added

- Adapted drag-and-drop handling to the newer Tauri drag events.

### Changed

- Updated the file detail view layout for clearer file size, creation date, and EXIF information.
- Improved rename preview generation by preserving extensions and normalizing extension case.
- Improved duplicate target name sequencing so suffixes are inserted before the extension.
- Updated Tauri RC dependencies and configuration, including Windows build adjustments.

## [v0.0.3] - 2024-07-15

### Added

- Added rename template history stored locally.
- Added a history dropdown next to the template input for quickly selecting recent formats.

### Changed

- Moved template state out of the file operation hook so rename success can update history.
- Changed the default template to a simpler datetime format.
- Updated dependencies and README download links.

## [v0.0.2] - 2024-06-16

### Added

- Added EXIF mode to skip files without complete EXIF data instead of renaming them with placeholder values.
- Added `{Current}` and `{current}` template variables for reusing the original filename.
- Added real-time template preview with composition-input handling for IME users.

### Changed

- Moved settings state into a global config store and persisted EXIF mode locally.
- Kept skipped and unchanged files visible after rename completion.
- Updated README, dependencies, and app version to `0.0.2`.

## [v0.0.1] - 2024-05-23

### Added

- Initial release of the Rename Photos Tauri desktop app.
- Added folder selection, file drag-and-drop, and single-folder drag-and-drop import.
- Added image EXIF reading with filename, size, created date, preview, and EXIF field display.
- Added template-based filename generation with date, camera, lens, focal length, aperture, shutter, and ISO variables.
- Added fallback behavior for files without EXIF data using file creation time and placeholder fields.
- Added batch rename support with temporary filenames to handle same-batch filename swaps.
- Added duplicate target filename sequencing to avoid conflicts.
- Added settings modal, keyboard shortcuts, help documentation, About view, and localization.
- Added cross-platform download documentation, license, and release configuration.

### Fixed

- Ignored symlinks, hidden files, and Windows system files during file loading.
- Fixed Windows path handling, EXIF `DateTimeOriginal` reading, and template input trimming.
- Kept all files visible after renaming.

[v1.0.1]: https://github.com/Arman19941113/rename-photos/compare/v1.0.0...v1.0.1
[v1.0.0]: https://github.com/Arman19941113/rename-photos/compare/v0.1.2...v1.0.0
[v0.1.2]: https://github.com/Arman19941113/rename-photos/compare/v0.1.1...v0.1.2
[v0.1.1]: https://github.com/Arman19941113/rename-photos/compare/v0.1.0...v0.1.1
[v0.1.0]: https://github.com/Arman19941113/rename-photos/compare/v0.0.4...v0.1.0
[v0.0.4]: https://github.com/Arman19941113/rename-photos/compare/v0.0.3...v0.0.4
[v0.0.3]: https://github.com/Arman19941113/rename-photos/compare/v0.0.2...v0.0.3
[v0.0.2]: https://github.com/Arman19941113/rename-photos/compare/v0.0.1...v0.0.2
[v0.0.1]: https://github.com/Arman19941113/rename-photos/releases/tag/v0.0.1
