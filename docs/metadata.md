# Metadata extraction

This document owns media classification, extracted fields, value formatting, and parser compatibility behavior. See the [development guide](README.md) for setup, [core logic](core-logic.md#metadata-in-the-loading-flow) for how results affect the UI, and [testing](testing.md) for verification and media fixtures.

## File classification

The backend classifies accepted files by case-insensitive extension in [kind.rs](../src-tauri/src/utils/file/kind.rs):

| Kind            | Extensions                                                                         |
| --------------- | ---------------------------------------------------------------------------------- |
| Image           | `jpg`, `jpeg`, `png`, `webp`, `tif`, `tiff`, `heic`, `heif`, `heics`, `avif`       |
| Image, RAW-like | `dng`, `arw`, `cr2`, `cr3`, `nef`, `raf`, `rw2`, `sr2`, `srf`, `pef`, `iiq`        |
| Video           | `mp4`, `mov`, `m4v`, `3gp`, `3g2`, `mkv`, `webm`, `mka`                            |
| Other           | All other extensions                                                               |

Classification selects a parsing path; extraction also depends on the actual container and its metadata. UI preview support uses a separate extension allowlist described in [core logic](core-logic.md#ui-presentation-rules).

The extension list follows the containers recognized by `nom-exif`, including Phase One IIQ and ISOBMFF 3G2, plus the [TIFF/RAW](#tiff-and-raw-compatibility) and [Panasonic RW2](#panasonic-rw2) compatibility readers. TIFF-based RAW extensions share the TIFF path; this does not guarantee support for every camera variant. `mka` is an audio container and uses the same track-metadata path and `video` IPC shape as videos.

AVI, Olympus ORF, and Sigma X3F containers have no supported parsing path. Their extensions are classified as `other`; eligible files still appear in the file list, without metadata or metadata errors.

## Extracted fields and result contract

Images and videos use `nom-exif`. Dependency versions are maintained in [Cargo.toml](../src-tauri/Cargo.toml) and [Cargo.lock](../src-tauri/Cargo.lock).

The [image](../src-tauri/src/utils/file/metadata_image.rs) and [video](../src-tauri/src/utils/file/metadata_video.rs) extractors expose optional string values for filename-template substitution:

| Field         | Image EXIF tag          | Video track tag |
| ------------- | ----------------------- | --------------- |
| `date`        | `DateTimeOriginal`      | `CreateDate`    |
| `make`        | `Make`                  | `Make`          |
| `camera`      | `Model`                 | `Model`         |
| `lens`        | `LensModel`             | —               |
| `focalLength` | `FocalLengthIn35mmFilm` | —               |
| `aperture`    | `FNumber`               | —               |
| `shutter`     | `ExposureTime`          | —               |
| `iso`         | `ISOSpeedRatings`       | —               |

- Missing or individually unparseable fields are `null`; successful fields remain available.
- If parsing succeeds but none of the tracked fields are present, the result is `metadata: null` with no `metaError`.
- If container or compatibility parsing fails, the result is `metadata: null` with a `metaError` string. This per-file error does not fail the file-list request.
- `other` files have no metadata payload.

The full IPC shapes are defined by the [Rust payload types](../src-tauri/src/commands/file/types.rs) and [TypeScript types](../src/types/file.d.ts).

## Date and numeric formatting

Dates are read through `EntryValue::as_datetime`:

- Image datetime values use `YYYY-MM-DD HH:mm:ss`, preserving the capture wall-clock time even when EXIF includes a timezone. Other image date values keep their text or display representation.
- Timezone-aware video dates are converted to the computer's local `YYYY-MM-DD HH:mm:ss`.
- Video dates without a timezone retain their wall-clock time at second precision.
- Non-datetime video values use local/RFC3339 text parsing; the display value is kept if parsing fails.

Unsigned rational aperture values use decimal strings such as `1.8`. Unsigned rational exposure times use reciprocal strings such as `1/50` for positive values below one second and decimal seconds for exposures of at least one second. A zero exposure retains its fraction, such as `0/1`. Other entry types use their text or display representation.

Using the filesystem creation timestamp for naming is a frontend setting described in [core logic](core-logic.md#created-date-option).

## Parsing lifecycle

Each directory or explicit-path load creates one `MediaParser` in the backend blocking task and reuses it sequentially across accepted files. Values are converted to owned strings and intermediate iterators are released before the next file.

Images are opened once by the [image reader](../src-tauri/src/utils/file/image_exif/mod.rs). It first uses `MediaSource::seekable` and `MediaParser::parse_exif`. The resulting `ExifIter` is traversed once, retaining only the eight naming fields without building a complete EXIF map or explicitly decoding GPS.

Image fields come from the main image. Successful values are selected in TIFF, EXIF, GPS, then Interop namespace order, independently of traversal order. Thumbnail fields do not fill missing main-image fields, and individual entry errors leave that value unavailable.

Videos use `MediaSource::open` and `MediaParser::parse_track`. A recognized image container on the video path returns no metadata. Both extractors convert read errors to strings at their result-adaptation boundary.

## TIFF and RAW compatibility

When standard parsing fails, compatibility readers reuse the same open file. A matching TIFF-based container is handled by the [TIFF reader](../src-tauri/src/utils/file/image_exif/tiff.rs):

1. Read the main IFD and its EXIF/GPS/Interop sub-IFDs using their file offsets.
2. Retain naming and timezone entries, read their referenced values, and rewrite offsets into a compact TIFF buffer.
3. Parse the compact buffer with `MediaSource::from_memory` and the batch's `MediaParser`.

Both TIFF byte orders and distant metadata offsets are supported. Compatibility reads skip pixel data and gaps between referenced metadata. Referenced ranges and directory nesting are checked before reading; cyclic IFDs fail parsing. Thumbnail IFD chains are excluded from the compact buffer.

## Panasonic RW2

The [RW2 reader](../src-tauri/src/utils/file/image_exif/raw_fallback.rs) recognizes the Panasonic TIFF-variant header and prefers embedded JPEG EXIF:

1. Inspect blob entries in the main IFD, validating each candidate's offset and length against the file size.
2. Parse the first JPEG candidate through a seekable view bounded by that blob's range. The reader does not allocate a buffer for the declared blob length. JPEGs of at most 128 bytes are parsed from memory.
3. If no JPEG candidate is found or JPEG parsing fails, use the TIFF compatibility reader on the RW2 metadata. Its compact buffer has a standard TIFF header; the source file is unchanged.

For a container without a matching compatibility reader, the standard parser's error is retained. For matching containers, a compatibility failure supplies the per-file error.
