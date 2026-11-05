# Testing and media fixtures

This document owns check commands, test coverage, and media fixture workflows. See the [development guide](README.md) for setup, [core logic](core-logic.md) for runtime behavior, and [metadata extraction](metadata.md) for parser contracts.

## Checks

Run acceptance checks from the repository root using the same script as CI:

```sh
node scripts/check.mjs          # Frontend and Rust
node scripts/check.mjs frontend # Frontend and release scripts
node scripts/check.mjs rust     # Rust formatting, Clippy, and tests
```

The [shared script](../scripts/check.mjs) runs frontend type checking, lint, and tests, followed by Rust formatting, Clippy (including test targets, with warnings treated as errors), and tests. It stops at the first failure. `cargo check` alone is not acceptance. The independent `web/` project is not included.

Local development and CI use [rust-toolchain.toml](../rust-toolchain.toml) as the single source for the Rust version and components. Install it with `rustup toolchain install --no-self-update`; subsequent acceptance runs do not require `rustup update stable`. Upgrade Rust by updating this file and running full acceptance. Local checks cover the host platform.

The [test workflow](../.github/workflows/test.yml) runs on PRs and manual dispatch, and is reused by the [desktop release workflow](../.github/workflows/publish-desktop-release.yml).
Frontend checks run on Linux; the frontend job also runs `pnpm build` after the shared acceptance script. Rust checks run on Linux, macOS, and Windows using the pinned toolchain.

An independent website job installs only `web/` dependencies and runs its typecheck, lint, and static builds both with and without `GITHUB_PAGES=true`. The website job is included when the test workflow is reused for a release.

For a local native build without packaging, run `pnpm tauri build --no-bundle`. This builds the application without launching it or publishing release assets.

## Test boundaries

| Location                                                                                  | Responsibility                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/util/*.test.ts`](../src/util)                                                       | Formatting, template rules, and normal/strict previews from shared metadata                                                                                                                   |
| [`useFiles.test.ts`](../src/hooks/useFiles.test.ts)                                       | Hook flow with mocked Tauri/settings/notifications: loading, rename payloads, refresh, failures/retry, and duplicate requests                                                                 |
| `src/hooks/useInputFormat.test.ts`, `src/services/storage.test.ts`                        | History deduplication and persistence, unchanged storage keys, and settings restored by a recreated Zustand store                                                                             |
| [`files/tests.rs`](../src-tauri/src/files/tests.rs)                                       | Directory and explicit-path loading rules                                                                                                                                                     |
| [`rename/tests.rs`](../src-tauri/src/rename/tests.rs)                                     | Filename validation, two-phase rename, and conflict protection                                                                                                                                |
| [`commands/file/real_media_tests.rs`](../src-tauri/src/commands/file/real_media_tests.rs) | Media IPC fields, supported/unsupported extension routing, mixed-batch isolation, distant TIFF/RAW metadata, rename/reload byte preservation, damaged-file isolation, and fixture size budget |
| [`files/`](../src-tauri/src/files)                                                        | Platform filtering and case-insensitive supported/unsupported extension classification                                                                                                        |
| [`metadata/`](../src-tauri/src/metadata)                                                  | Date/numeric formatting, EXIF field selection, TIFF/RW2 bounds, and metadata read budgets                                                                                                     |
| [`scripts/*.test.ts`](../scripts)                                                         | Release notes and release operations with mocked GitHub APIs or disposable Git repositories                                                                                                   |

`pnpm typecheck` runs one `tsc -p tsconfig.typecheck.json` for application and test
code. Builds use `tsconfig.json`. Imported JavaScript scripts have inferred types
with `allowJs`; `checkJs` is disabled. `tests/support/media-corpus.ts` validates
shared JSON before exposing typed IPC inputs.

Real-media tests call the async command adapters and their blocking tasks, exercising IPC request conversion and serialized file responses against the shared corpus. Business-module tests call loading and renaming directly.

Tests use temporary copies for filesystem writes. They do not launch the app or
exercise Tauri transport/UI. Release tests do not commit the working repository
or create GitHub releases.

## Fixture conventions

[tests/fixtures/media/](../tests/fixtures/media) holds compact files derived from real HEIC, JPEG,
ARW, RW2, MP4/MOV, and text samples. [real-media.json](../tests/fixtures/real-media.json) is shared by
frontend and Rust tests. It records original metadata and reviewed preview names:

- `size` is the bundled size; `sourceSize` is the original size.
- Synthetic `/fixtures/` paths and creation time `0` are replaced by actual
  filesystem expectations in Rust, including millisecond units and epoch fallback.
- Video dates are UTC wall-clock strings. Rust converts expected dates to local
  time; frontend previews use the fixed strings, so expected names describe UTC.
  Image EXIF dates are unchanged.

The bundled corpus has a total size budget of 256 KiB, enforced by the Rust tests.

The two iPhone JPEGs share a date and exercise duplicate numbering. The screenshot
has no tracked EXIF fields; RW2 lacks a lens; both MP4s lack make/model but retain
a date. Damaged JPEG/MP4 cases are generated in temporary directories.

TIFF/RAW compatibility tests generate temporary files with distant metadata,
both TIFF byte orders, invalid ranges, and cyclic IFDs. Counted readers enforce
a small I/O budget while files contain large gaps or trailing sensor data.
RW2 tests cover bounded JPEG reads and TIFF fallback. Image extraction is also
compared with eager `nom_exif::Exif` lookup for namespace priority, primary-image
selection, and partial entry errors. These cases do not add bundled media files.

Extension-routing tests exercise both directory and explicit-path loading. Temporary copies of the bundled MP4 use `3g2a`, `3g2b`, and `3g2c` brands with `.3g2`/`.3G2` filenames and retain the expected track metadata. The distant-TIFF test also uses `.iiq`/`.IIQ` filenames to verify TIFF compatibility routing; it does not represent a separate real Phase One sample or test RAW decoding. AVI, ORF, and X3F paths remain visible as `other` files without metadata fields or parser errors. No additional bundled media is required.

## Regenerate samples

Install Python 3, ImageMagick with JPEG/HEIC support, and FFmpeg with `ffprobe`
and `libx264`, then run:

```sh
python3 scripts/prepare-media-fixtures.py '/absolute/path/to/original/media'
cargo test --locked --manifest-path src-tauri/Cargo.toml real_media_tests
pnpm test
```

The [fixture generator](../scripts/prepare-media-fixtures.py) resizes JPEG/HEIC to fit 16 × 16 pixels, keeps one 16 × 16 video
frame, and repacks RAW metadata. RW2 retains an embedded JPEG with its original
tracked EXIF; MOV retains the source's `moov/meta` layout. RAW samples have no
sensor pixels and cannot test RAW decoding. Ordinary images/videos remain decodable.

Only tracked EXIF and orientation, or video creation time and make/model, are
retained. GPS, author, serial numbers, MakerNotes, and original thumbnails are
removed. Capture dates and camera/lens information remain in the fixtures.

Generation uses a temporary directory before replacing samples and updating their
sizes. It leaves metadata and preview expectations unchanged. Encoder versions
can affect bytes and sizes; inspect the diff and run both test layers. Review
expectations against originals rather than updating them just to pass a test.

## Test full originals

Point the same tests at the original filenames listed in the JSON:

```sh
RENAME_PHOTOS_TEST_MEDIA_DIR='/absolute/path/to/original/media' \
  cargo test --locked --manifest-path src-tauri/Cargo.toml real_media_tests
```

In PowerShell, set `$env:RENAME_PHOTOS_TEST_MEDIA_DIR = 'C:\path\to\media'`, then
run the same Cargo command. An invalid directory or missing required sample fails
the run. Originals remain untouched; temporary copies need roughly 160 MiB.
Extra files such as `.DS_Store` and Finder aliases are excluded from this corpus;
platform filtering is tested separately.
