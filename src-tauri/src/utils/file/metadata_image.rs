use super::image_exif::read_exif;
use exif::{In, Tag};
use std::path::Path;

#[derive(serde::Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImageMetadata {
    date: Option<String>,
    make: Option<String>,
    camera: Option<String>,
    lens: Option<String>,
    focal_length: Option<String>,
    aperture: Option<String>,
    shutter: Option<String>,
    iso: Option<String>,
}

pub(crate) fn analyze_image_metadata(path: &Path) -> (Option<ImageMetadata>, Option<String>) {
    match read_image_metadata(path) {
        Ok(metadata) => (metadata, None),
        Err(err) => (None, Some(err)),
    }
}

fn read_image_metadata(path: &Path) -> Result<Option<ImageMetadata>, String> {
    read_image_metadata_inner(path).map_err(|err| err.to_string())
}

fn read_image_metadata_inner(path: &Path) -> anyhow::Result<Option<ImageMetadata>> {
    let mut metadata = ImageMetadata::default();
    fill_image_metadata(path, &mut metadata)?;
    Ok(normalize_image_metadata(metadata))
}

fn normalize_image_metadata(metadata: ImageMetadata) -> Option<ImageMetadata> {
    let has_any = metadata.date.is_some()
        || metadata.make.is_some()
        || metadata.camera.is_some()
        || metadata.lens.is_some()
        || metadata.focal_length.is_some()
        || metadata.aperture.is_some()
        || metadata.shutter.is_some()
        || metadata.iso.is_some();
    if has_any { Some(metadata) } else { None }
}

fn fill_image_metadata(path: &Path, metadata: &mut ImageMetadata) -> anyhow::Result<()> {
    let exif = read_exif(path)?;

    fill_metadata_from_exif(metadata, &exif);

    Ok(())
}

fn fill_metadata_from_exif(metadata: &mut ImageMetadata, exif: &exif::Exif) {
    // Values are stored as strings because the UI uses them for template substitution.
    metadata.date = exif_field_string(exif, Tag::DateTimeOriginal);
    metadata.make = exif_field_string(exif, Tag::Make);
    metadata.camera = exif_field_string(exif, Tag::Model);
    metadata.lens = exif_field_string(exif, Tag::LensModel);
    metadata.focal_length = exif_field_string(exif, Tag::FocalLengthIn35mmFilm);
    metadata.aperture = exif_field_string(exif, Tag::FNumber);
    metadata.shutter = exif_field_string(exif, Tag::ExposureTime);
    metadata.iso = exif_field_string(exif, Tag::PhotographicSensitivity);
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
