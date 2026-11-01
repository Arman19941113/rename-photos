# Tests and media fixtures

## Checks

Run from the repository root:

```sh
pnpm test
pnpm typecheck
pnpm lint
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

`.github/workflows/test.yml` runs on PRs, pushes to `main`, and manual dispatch.
Vitest, type checking, and lint run on Linux; Rust tests run on Linux, macOS, and
Windows. Release tags also run the existing publication checks.

## Test boundaries

| Location                                          | Responsibility                                                                                                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/util/*.test.ts`                              | Formatting, template rules, and normal/strict previews from shared media metadata.                                                                                      |
| `src/hooks/useFiles.test.ts`                      | Real hook in jsdom; mocked Tauri, settings, translation, and notifications. Covers loading, rename payloads, selection/refresh, failures/retry, and duplicate requests. |
| `src-tauri/src/commands/file.rs`                  | Loading rules, filename validation, two-phase rename, and conflict protection using temporary files.                                                                    |
| `src-tauri/src/commands/file/real_media_tests.rs` | Media parsing and IPC fields, batch rename/reload with byte preservation, damaged-file isolation, and a 256 KiB fixture budget.                                         |
| `scripts/*.test.ts`                               | Release notes and release operations using mocked GitHub APIs or disposable Git repositories.                                                                           |

`pnpm typecheck` runs one `tsc -p tsconfig.typecheck.json` for application and test
code. Builds use `tsconfig.json`. Imported JavaScript scripts have inferred types
with `allowJs`; `checkJs` is disabled. `tests/support/media-corpus.ts` validates
shared JSON before exposing typed IPC inputs.

Tests use temporary copies for filesystem writes. They do not launch the app or
exercise Tauri transport/UI. Release tests do not commit the working repository
or create GitHub releases.

## Fixture conventions

`tests/fixtures/media/` holds about 9 KiB of files derived from real HEIC, JPEG,
ARW, RW2, MP4/MOV, and text samples. `tests/fixtures/real-media.json` is shared by
frontend and Rust tests. It records original metadata and reviewed preview names:

- `size` is the bundled size; `sourceSize` is the original size.
- Synthetic `/fixtures/` paths and creation time `0` are replaced by actual
  filesystem expectations in Rust, including millisecond units and epoch fallback.
- Video dates are UTC wall-clock strings. Rust converts expected dates to local
  time; frontend previews use the fixed strings, so expected names describe UTC.
  Image EXIF dates are unchanged.

The two iPhone JPEGs share a date and exercise duplicate numbering. The screenshot
has no tracked EXIF fields; RW2 lacks a lens; both MP4s lack make/model but retain
a date. Damaged JPEG/MP4 cases are generated in temporary directories.

## Regenerate samples

Install Python 3, ImageMagick with JPEG/HEIC support, and FFmpeg with `ffprobe`
and `libx264`, then run:

```sh
python3 scripts/prepare-media-fixtures.py '/absolute/path/to/original/media'
cargo test --locked --manifest-path src-tauri/Cargo.toml real_media_tests
pnpm test
```

The generator resizes JPEG/HEIC to fit 16 × 16 pixels, keeps one 16 × 16 video
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
