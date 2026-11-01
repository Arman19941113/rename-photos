# AGENTS.md

## Project Snapshot

- Rename Photos is a Tauri desktop app for renaming photos/videos from metadata.
- Frontend code lives in `src` and uses React, Vite, TypeScript, Tailwind, and NextUI.
- Backend code lives in `src-tauri/src` and uses Rust/Tauri.
- `web` is the Next.js landing page, separate from the desktop app.

## Work Rules

- Keep changes narrow and aligned with the existing frontend/backend boundary.
- Shared TypeScript types belong in `src/types`; Tauri command payloads belong in Rust `types.rs`.
- If a change touches both frontend and backend, keep IPC payloads and TypeScript callers in sync.
- For loading, preview naming, duplicates, or rename conflicts, read [core logic](docs/core-logic.md) first.
- For classification, metadata fields, date/value formatting, or TIFF/RAW/RW2 parsing, read [metadata extraction](docs/metadata.md) first.
- For test infrastructure, hook flow tests, CI checks, or media fixtures, read [testing](docs/testing.md) first.
- For icon sources or generated resources, read [icons](docs/icons.md) first.
- Update the document that owns any behavior changed by the task. Keep detailed rules in that document and link to them from other documents.
- Describe current implementation and constraints; keep change history in `CHANGELOG.md`.

## Task Map

- Frontend loading/rename flow: `src/hooks/useFiles.ts`
- Drag handling: `src/hooks/useDragging.ts`
- Template input: `src/components/OperationBar.tsx`
- Preview/template logic: `src/util/file-transformer.ts`, `src/util/common.ts`
- Format history/settings: `src/hooks/useInputFormat.ts`, `src/store/useConfigStore.ts`, `src/services/storage.ts`
- Backend commands and IPC types: `src-tauri/src/commands/file.rs`, `src-tauri/src/commands/file/types.rs`
- Backend file filtering/classification/metadata: `src-tauri/src/utils/file/filter.rs`, `src-tauri/src/utils/file/kind.rs`, `src-tauri/src/utils/file/metadata_image.rs`, `src-tauri/src/utils/file/metadata_video.rs`
- TIFF/RAW/RW2 compatibility readers: `src-tauri/src/utils/file/image_exif/`

## Development and Checks

- Setup, run/build commands, and release entry points: [development guide](docs/README.md).
- Check commands and fixture workflows: [testing](docs/testing.md).
