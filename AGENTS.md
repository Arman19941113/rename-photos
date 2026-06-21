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
- For loading, metadata extraction, preview naming, duplicates, or rename conflicts, read `docs/core-logic.md` first.
- When core behavior changes, update both `docs/core-logic.md` and `docs/core-logic_CN.md`.

## Task Map
- Frontend loading/rename flow: `src/hooks/useFiles.ts`
- Drag handling: `src/hooks/useDragging.ts`
- Template input: `src/components/OperationBar.tsx`
- Preview/template logic: `src/util/file-transformer.ts`, `src/util/common.ts`
- Format history/settings: `src/hooks/useInputFormat.ts`, `src/store/useConfigStore.ts`, `src/services/storage.ts`
- Backend commands and IPC types: `src-tauri/src/commands/file.rs`, `src-tauri/src/commands/file/types.rs`
- Backend file filtering/classification/metadata: `src-tauri/src/utils/file/filter.rs`, `src-tauri/src/utils/file/kind.rs`, `src-tauri/src/utils/file/metadata_image.rs`, `src-tauri/src/utils/file/metadata_video.rs`

## Commands
- Install: `pnpm install`
- Vite dev server: `pnpm dev`
- Lint frontend: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Tauri dev/build: `pnpm tauri dev`, `pnpm tauri build`
- Rust tests: `cd src-tauri && cargo test`
