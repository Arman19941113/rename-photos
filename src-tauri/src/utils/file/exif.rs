use chrono::prelude::{DateTime, Local};
use exif::{In, Tag};
use nom_exif::{MediaParser, MediaSource, TrackInfo, TrackInfoTag};
use std::fs;

// EXIF extraction utilities
// - Images: parsed via the `exif` crate (EXIF/TIFF container).
// - Videos: parsed via `nom_exif` (container track metadata when present).

#[derive(serde::Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExifData {
    date: Option<String>,
    make: Option<String>,
    camera: Option<String>,
    lens: Option<String>,
    focal_length: Option<String>,
    aperture: Option<String>,
    shutter: Option<String>,
    iso: Option<String>,
}

pub(crate) fn analyze_exif(path_str: &str) -> (Option<ExifData>, Option<String>) {
    match read_exif(path_str) {
        Ok(exif_data) => (Some(exif_data), None),
        Err(err) => (None, Some(err)),
    }
}

fn read_exif(path_str: &str) -> Result<ExifData, String> {
    read_exif_inner(path_str).map_err(|err| err.to_string())
}

fn read_exif_inner(path_str: &str) -> anyhow::Result<ExifData> {
    let mut exif_data = ExifData::default();

    // If the file has video track metadata, use that
    if let Some(video_exif_data) = read_video_exif(path_str)? {
        return Ok(video_exif_data);
    }

    // Otherwise use image EXIF fields
    read_image_exif(path_str, &mut exif_data)?;
    Ok(exif_data)
}

fn read_video_exif(path_str: &str) -> anyhow::Result<Option<ExifData>> {
    let mut parser = MediaParser::new();
    let ms = MediaSource::file_path(path_str).map_err(|err| anyhow::anyhow!(err.to_string()))?;
    if !ms.has_track() {
        return Ok(None);
    }

    let info: TrackInfo = parser
        .parse(ms)
        .map_err(|err| anyhow::anyhow!(err.to_string()))?;

    let mut exif_data = ExifData::default();
    exif_data.date = info.get(TrackInfoTag::CreateDate).map(|field| {
        let raw = field.to_string();
        // Attempt a couple of common datetime formats; otherwise keep the raw string.
        if let Ok(dt) = raw.parse::<DateTime<Local>>() {
            return dt.format("%Y-%m-%d %H:%M:%S").to_string();
        }
        if let Ok(dt) = DateTime::parse_from_rfc3339(&raw) {
            return dt
                .with_timezone(&Local)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string();
        }
        raw
    });
    exif_data.make = info.get(TrackInfoTag::Make).map(|field| field.to_string());
    exif_data.camera = info.get(TrackInfoTag::Model).map(|field| field.to_string());

    Ok(Some(exif_data))
}

fn read_image_exif(path_str: &str, exif_data: &mut ExifData) -> anyhow::Result<()> {
    let file = fs::File::open(path_str)?;
    let mut buf_reader = std::io::BufReader::new(&file);
    let exif = exif::Reader::new()
        .read_from_container(&mut buf_reader)
        .map_err(|err| anyhow::anyhow!(err.to_string()))?;

    // Values are stored as strings because the UI uses them for template substitution.
    exif_data.date = exif_field_string(&exif, Tag::DateTimeOriginal);
    exif_data.make = exif_field_string(&exif, Tag::Make);
    exif_data.camera = exif_field_string(&exif, Tag::Model);
    exif_data.lens = exif_field_string(&exif, Tag::LensModel);
    exif_data.focal_length = exif_field_string(&exif, Tag::FocalLengthIn35mmFilm);
    exif_data.aperture = exif_field_string(&exif, Tag::FNumber);
    exif_data.shutter = exif_field_string(&exif, Tag::ExposureTime);
    exif_data.iso = exif_field_string(&exif, Tag::PhotographicSensitivity);

    Ok(())
}

// Reads a single EXIF tag value and returns its display representation.
fn exif_field_string(exif: &exif::Exif, tag: Tag) -> Option<String> {
    exif.get_field(tag, In::PRIMARY).map(|field| {
        field
            .display_value()
            .to_string()
            .trim_matches('"')
            .to_string()
    })
}
