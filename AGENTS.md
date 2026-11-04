# AGENTS.md

## Conventions

- Desktop frontend code belongs in `src/`; filesystem access and renaming belong in `src-tauri/src/`.
- `web/` is an independent project with its own package manifest, lockfile, and commands.
- Shared TypeScript types belong in `src/types/`.
- Rust command payloads belong in `src-tauri/src/commands/file/types.rs`.
- Keep IPC payloads and TypeScript callers in sync.

## Verification

- Routine, low-risk changes can rely on code review and relevant static checks.
- Add or update tests when they meaningfully protect core logic or complex, error-prone cases.
- Start with the narrowest relevant checks; broaden only for a concrete risk, failure, or unresolved concern.
- During commit review, missing documentation or test updates alone do not block routine, low-risk changes or require confirmation.

## Commands

- Run desktop checks from the repository root.

| Check | Command |
| --- | --- |
| Test file | `pnpm exec vitest run <test-file>` |
| Lint file | `pnpm exec eslint <file>` |
| App and test types | `pnpm typecheck` |
| Rust test filter | `cargo test --locked --manifest-path src-tauri/Cargo.toml <test-filter>` |

## Documentation

- Update the owning document when core behavior or contracts change, or existing documentation becomes inaccurate.
- Minor UI and other non-core fixes otherwise need no documentation updates.

## References and Entry Points

| Task | References |
| --- | --- |
| Setup, builds, website | [docs/README.md](docs/README.md) |
| Loading, preview, rename | [docs/core-logic.md](docs/core-logic.md); `src/hooks/useFiles.ts`, `src/util/file-transformer.ts`, `src/util/common.ts` |
| Drag handling | `src/hooks/useDragging.ts` |
| Templates, history, settings | [docs/core-logic.md](docs/core-logic.md); `src/components/OperationBar.tsx`, `src/hooks/useInputFormat.ts`, `src/store/useConfigStore.ts`, `src/services/storage.ts` |
| Backend commands and IPC | `src-tauri/src/commands/file.rs`, `src-tauri/src/commands/file/types.rs` |
| Backend loading and rename | [docs/core-logic.md](docs/core-logic.md); `src-tauri/src/files.rs`, `src-tauri/src/files/`, `src-tauri/src/rename.rs` |
| Metadata and TIFF/RAW/RW2 | [docs/metadata.md](docs/metadata.md); `src-tauri/src/metadata/`, `src-tauri/src/metadata/exif/` |
| Tests, CI, fixtures | [docs/testing.md](docs/testing.md) |
| Icons and generated resources | [docs/icons.md](docs/icons.md) |
| Releases | `scripts/release.mjs`, `.github/workflows/publish-desktop-release.yml` |
