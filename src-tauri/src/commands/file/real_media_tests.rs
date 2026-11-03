use super::types::{IpcFile, RenameRequest};
use chrono::{Local, NaiveDateTime};
use serde::Deserialize;
use serde_json::Value;
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tempfile::tempdir;

#[test]
fn real_media_batch_preserves_metadata_and_bytes_after_rename() {
    let root = media_root();
    let fixtures = fixtures();
    let dir = tempdir().unwrap();

    for fixture in &fixtures {
        copy_fixture(&root, dir.path(), fixture.filename());
    }

    let loaded = load_directory(dir.path()).unwrap();
    assert_eq!(loaded.len(), fixtures.len());
    for file in loaded {
        let file = serde_json::to_value(file).unwrap();
        let fixture = fixtures
            .iter()
            .find(|fixture| fixture.input["filename"] == file["filename"])
            .unwrap();
        assert_metadata_matches(file, fixture, &dir.path().join(fixture.filename()));
    }

    let payload = fixtures
        .iter()
        .enumerate()
        .map(|(index, fixture)| {
            serde_json::from_value::<RenameRequest>(serde_json::json!({
                "oldPath": dir.path().join(fixture.filename()).to_str().unwrap(),
                "newFilename": fixture.expected.new_filename,
                "tempFilename": format!("rename-test-{index}.tmp"),
            }))
            .unwrap()
        })
        .collect();
    let renamed = rename_batch(payload).unwrap();
    let expected_paths = fixtures
        .iter()
        .map(|fixture| {
            dir.path()
                .join(&fixture.expected.new_filename)
                .to_str()
                .unwrap()
                .to_string()
        })
        .collect::<Vec<_>>();
    assert_eq!(renamed, expected_paths);

    let paths = renamed.iter().map(Path::new).collect::<Vec<_>>();
    let reloaded = load_paths(&paths).unwrap();
    assert_eq!(reloaded.len(), fixtures.len());
    for (fixture, file) in fixtures.iter().zip(reloaded) {
        let renamed_path = dir.path().join(&fixture.expected.new_filename);
        assert!(!dir.path().join(fixture.filename()).exists());
        assert_files_equal(&root.join(fixture.filename()), &renamed_path);
        assert_metadata_matches(serde_json::to_value(file).unwrap(), fixture, &renamed_path);
    }
    assert_eq!(fs::read_dir(dir.path()).unwrap().count(), fixtures.len());
}

#[test]
fn damaged_media_reports_per_file_errors_without_failing_the_load() {
    let root = bundled_media_root();
    let jpeg = fs::read(root.join("image-sony-2.JPG")).unwrap();
    let mp4 = fs::read(root.join("video-large.mp4")).unwrap();
    let dir = tempdir().unwrap();
    let cases: [(&str, &str, &[u8]); 4] = [
        ("empty.jpg", "image", b""),
        ("truncated.jpg", "image", &jpeg[..32]),
        ("invalid.mp4", "video", b"not a media container"),
        ("truncated.mp4", "video", &mp4[..32]),
    ];
    let mut paths = Vec::new();
    for (filename, _, bytes) in &cases {
        let path = dir.path().join(filename);
        fs::write(&path, bytes).unwrap();
        paths.push(path);
    }
    paths.push(copy_fixture(&root, dir.path(), "image-iPhone-1.HEIC"));
    let refs = paths.iter().map(PathBuf::as_path).collect::<Vec<_>>();
    for files in [
        load_directory(dir.path()).unwrap(),
        load_paths(&refs).unwrap(),
    ] {
        assert_eq!(files.len(), paths.len());
        let files = files
            .into_iter()
            .map(|file| serde_json::to_value(file).unwrap())
            .collect::<Vec<_>>();
        for (filename, kind, _) in &cases {
            let file = files
                .iter()
                .find(|file| file["filename"] == *filename)
                .unwrap();
            assert_eq!(file["fileType"], *kind);
            assert!(file["metadata"].is_null());
            assert!(!file["metaError"].as_str().unwrap().is_empty());
            assert_eq!(
                file["pathname"],
                dir.path().join(filename).to_str().unwrap()
            );
        }
        let healthy = files
            .iter()
            .find(|file| file["filename"] == "image-iPhone-1.HEIC")
            .unwrap();
        assert!(healthy["metaError"].is_null());
        assert_eq!(healthy["metadata"]["make"], "Apple");
    }
}

#[test]
fn unsupported_media_extensions_load_as_other_without_metadata() {
    let dir = tempdir().unwrap();
    let paths = [
        "clip-lower.avi",
        "clip-upper.AVI",
        "photo-lower.orf",
        "photo-upper.ORF",
        "photo-lower.x3f",
        "photo-upper.X3F",
    ]
    .map(|filename| dir.path().join(filename));
    for path in &paths {
        fs::write(path, b"not a supported media container").unwrap();
    }
    let refs = paths.iter().map(PathBuf::as_path).collect::<Vec<_>>();
    for files in [
        load_directory(dir.path()).unwrap(),
        load_paths(&refs).unwrap(),
    ] {
        assert_eq!(files.len(), paths.len());
        for file in files {
            let file = serde_json::to_value(file).unwrap();
            assert_eq!(file["fileType"], "other");
            assert!(file.get("metadata").is_none());
            assert!(file.get("metaError").is_none());
        }
    }
}

#[test]
fn three_g2_brands_load_track_metadata_case_insensitively() {
    let root = bundled_media_root();
    let mut fixture = fixtures()
        .into_iter()
        .find(|fixture| fixture.filename() == "video-large.mp4")
        .unwrap();
    let mut bytes = fs::read(root.join(fixture.filename())).unwrap();
    fixture.input["size"] = (bytes.len() as u64).into();
    assert_eq!(&bytes[4..8], b"ftyp");
    let dir = tempdir().unwrap();
    let mut paths = Vec::new();
    for (filename, brand) in [
        ("clip-a.3g2", b"3g2a"),
        ("clip-b.3G2", b"3g2b"),
        ("clip-c.3g2", b"3g2c"),
    ] {
        bytes[8..12].copy_from_slice(brand);
        let path = dir.path().join(filename);
        fs::write(&path, &bytes).unwrap();
        paths.push(path);
    }
    let refs = paths.iter().map(PathBuf::as_path).collect::<Vec<_>>();
    for files in [
        load_directory(dir.path()).unwrap(),
        load_paths(&refs).unwrap(),
    ] {
        assert_eq!(files.len(), paths.len());
        for file in files {
            let file = serde_json::to_value(file).unwrap();
            let path = Path::new(file["pathname"].as_str().unwrap()).to_path_buf();
            assert_metadata_matches(file, &fixture, &path);
        }
    }
}

#[test]
fn mixed_media_batch_keeps_metadata_isolated_after_failures_and_repeated_files() {
    let root = media_root();
    let fixtures = fixtures();
    let dir = tempdir().unwrap();
    let sequence = [
        "image-iPhone-1.HEIC",
        "truncated.jpg",
        "video-metadata.MOV",
        "test.RW2",
        "video-large.mp4",
        "image-screenshot.jpg",
        "invalid.mp4",
        "image-sony-1.ARW",
        "truncated.mp4",
        "image-iPhone-2.jpeG",
        "test.RW2",
        "video-metadata-missing.mp4",
        "untitled.txt",
        "image-iPhone-1.HEIC",
    ];

    for fixture in &fixtures {
        if sequence.contains(&fixture.filename()) {
            copy_fixture(&root, dir.path(), fixture.filename());
        }
    }
    let bundled = bundled_media_root();
    let jpeg = fs::read(bundled.join("image-sony-2.JPG")).unwrap();
    let mp4 = fs::read(bundled.join("video-large.mp4")).unwrap();
    fs::write(dir.path().join("truncated.jpg"), &jpeg[..32]).unwrap();
    fs::write(dir.path().join("truncated.mp4"), &mp4[..32]).unwrap();
    fs::write(dir.path().join("invalid.mp4"), b"not a media container").unwrap();

    let paths = sequence.map(|filename| dir.path().join(filename));
    let refs = paths.iter().map(PathBuf::as_path).collect::<Vec<_>>();
    let files = load_paths(&refs).unwrap();
    assert_eq!(files.len(), sequence.len());

    for (filename, file) in sequence.into_iter().zip(files) {
        let file = serde_json::to_value(file).unwrap();
        assert_eq!(file["filename"], filename);
        if let Some(fixture) = fixtures
            .iter()
            .find(|fixture| fixture.filename() == filename)
        {
            assert_metadata_matches(file, fixture, &dir.path().join(filename));
        } else {
            assert!(file["metadata"].is_null());
            assert!(!file["metaError"].as_str().unwrap().is_empty());
        }
    }
}

#[test]
fn late_tiff_and_raw_metadata_preserves_the_full_ipc_payload_and_file_bytes() {
    let root = bundled_media_root();
    let mut corpus = fixtures();
    let fixture = corpus
        .iter_mut()
        .find(|fixture| fixture.filename() == "image-sony-1.ARW")
        .unwrap();
    let mut bytes = fs::read(root.join(fixture.filename())).unwrap();
    let make = bytes[140..145].to_vec();
    let offset = 16 * 1024_u32;
    bytes.resize(offset as usize, 0);
    bytes.extend_from_slice(&make);
    bytes[18..22].copy_from_slice(&offset.to_le_bytes());
    fixture.input["size"] = (bytes.len() as u64).into();
    let dir = tempdir().unwrap();
    let paths = ["late.tiff", "late.ARW", "late-lower.iiq", "late-upper.IIQ"]
        .map(|name| dir.path().join(name));
    for path in &paths {
        fs::write(path, &bytes).unwrap();
    }
    let refs = paths.iter().map(PathBuf::as_path).collect::<Vec<_>>();
    for files in [
        load_directory(dir.path()).unwrap(),
        load_paths(&refs).unwrap(),
    ] {
        assert_eq!(files.len(), paths.len());
        for file in files {
            let file = serde_json::to_value(file).unwrap();
            let path = Path::new(file["pathname"].as_str().unwrap()).to_path_buf();
            assert_metadata_matches(file, fixture, &path);
            assert_eq!(fs::read(path).unwrap(), bytes);
        }
    }
}

#[test]
fn checked_in_media_stays_within_size_budget() {
    let root = bundled_media_root();
    let mut total = 0;
    for entry in fs::read_dir(root).unwrap() {
        let metadata = entry.unwrap().metadata().unwrap();
        assert!(
            metadata.is_file(),
            "The bundled corpus must contain only files"
        );
        total += metadata.len();
    }
    assert!(
        total > 0 && total <= 256 * 1024,
        "Media corpus is {total} bytes; budget is 256 KiB"
    );
}

fn load_directory(path: &Path) -> Result<Vec<IpcFile>, String> {
    tauri::async_runtime::block_on(super::get_files_from_dir(
        path.to_str().unwrap().to_string(),
    ))
}

fn load_paths(paths: &[&Path]) -> Result<Vec<IpcFile>, String> {
    let paths = paths
        .iter()
        .map(|path| path.to_str().unwrap().to_string())
        .collect();
    tauri::async_runtime::block_on(super::get_files_from_paths(paths))
}

fn rename_batch(requests: Vec<RenameRequest>) -> Result<Vec<String>, String> {
    tauri::async_runtime::block_on(super::rename_files(requests))
}

fn media_root() -> PathBuf {
    let root = std::env::var_os("RENAME_PHOTOS_TEST_MEDIA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(bundled_media_root);
    assert!(
        root.is_dir(),
        "Media corpus directory is missing: {}",
        root.display()
    );
    root
}

fn bundled_media_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/media")
}

fn fixtures() -> Vec<MediaFixture> {
    #[derive(Deserialize)]
    struct Corpus {
        files: Vec<MediaFixture>,
    }

    let mut corpus: Corpus =
        serde_json::from_str(include_str!("../../../../tests/fixtures/real-media.json")).unwrap();
    assert!(
        !corpus.files.is_empty(),
        "The media corpus must not be empty"
    );
    if std::env::var_os("RENAME_PHOTOS_TEST_MEDIA_DIR").is_some() {
        for fixture in &mut corpus.files {
            fixture.input["size"] = fixture.source_size.into();
        }
    }
    corpus.files
}

fn copy_fixture(root: &Path, destination: &Path, filename: &str) -> PathBuf {
    let source = root.join(filename);
    let copied = destination.join(filename);
    fs::copy(&source, &copied)
        .unwrap_or_else(|err| panic!("Cannot copy fixture {}: {err}", source.display()));
    copied
}

fn assert_metadata_matches(actual: Value, fixture: &MediaFixture, path: &Path) {
    let mut expected = fixture.input.clone();
    expected["filename"] = path.file_name().unwrap().to_str().unwrap().into();
    expected["pathname"] = path.to_str().unwrap().into();
    let created = fs::metadata(path)
        .unwrap()
        .created()
        .unwrap_or(UNIX_EPOCH)
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    expected["created"] = serde_json::to_value(created).unwrap();
    // Video snapshots use UTC; the backend intentionally returns local wall-clock time.
    if expected["fileType"] == "video"
        && let Some(date) = expected["metadata"]["date"].as_str()
    {
        let utc = NaiveDateTime::parse_from_str(date, "%Y-%m-%d %H:%M:%S")
            .unwrap()
            .and_utc();
        expected["metadata"]["date"] = utc
            .with_timezone(&Local)
            .format("%Y-%m-%d %H:%M:%S")
            .to_string()
            .into();
    }
    assert_eq!(actual, expected, "IPC mismatch for {}", path.display());
}

fn assert_files_equal(source: &Path, destination: &Path) {
    let mut source_file = File::open(source).unwrap();
    let mut destination_file = File::open(destination).unwrap();
    let mut remaining = source_file.metadata().unwrap().len();
    assert_eq!(remaining, destination_file.metadata().unwrap().len());
    let mut source_buffer = [0; 64 * 1024];
    let mut destination_buffer = [0; 64 * 1024];
    while remaining > 0 {
        let length = remaining.min(source_buffer.len() as u64) as usize;
        source_file
            .read_exact(&mut source_buffer[..length])
            .unwrap();
        destination_file
            .read_exact(&mut destination_buffer[..length])
            .unwrap();
        assert!(
            source_buffer[..length] == destination_buffer[..length],
            "File content changed: {}",
            destination.display()
        );
        remaining -= length as u64;
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MediaFixture {
    input: Value,
    expected: Preview,
    source_size: u64,
}

impl MediaFixture {
    fn filename(&self) -> &str {
        self.input["filename"].as_str().unwrap()
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Preview {
    new_filename: String,
}
