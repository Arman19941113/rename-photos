use super::exif::{METADATA_TAGS, read_exif};
use nom_exif::{EntryValue, ExifIter, ExifTag, IfdIndex, IfdKind, MediaParser};
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

pub(crate) fn analyze_image_metadata(
    path: &Path,
    parser: &mut MediaParser,
) -> (Option<ImageMetadata>, Option<String>) {
    match read_image_metadata(path, parser) {
        Ok(metadata) => (metadata, None),
        Err(err) => (None, Some(err.to_string())),
    }
}

fn read_image_metadata(
    path: &Path,
    parser: &mut MediaParser,
) -> anyhow::Result<Option<ImageMetadata>> {
    Ok(extract_image_metadata(read_exif(path, parser)?))
}

fn extract_image_metadata(exif: ExifIter) -> Option<ImageMetadata> {
    let mut values: [Option<(u8, String)>; METADATA_TAGS.len()] = std::array::from_fn(|_| None);
    for entry in exif {
        if entry.ifd() != IfdIndex::MAIN {
            continue;
        }
        let Some(index) = METADATA_TAGS
            .iter()
            .position(|tag| tag.code() == entry.tag().code())
        else {
            continue;
        };
        // Match Exif::get's namespace priority independently of traversal order.
        let priority = match entry.ifd_kind() {
            IfdKind::Tiff => 0,
            IfdKind::Exif => 1,
            IfdKind::Gps => 2,
            IfdKind::Interop => 3,
            _ => continue,
        };
        if values[index]
            .as_ref()
            .is_some_and(|(current, _)| *current <= priority)
        {
            continue;
        }
        if let Ok(value) = entry.into_result() {
            let text = match value {
                EntryValue::Text(text) => text,
                value => format_exif_value(METADATA_TAGS[index], &value),
            };
            values[index] = Some((priority, text));
        }
    }
    let [
        date,
        make,
        camera,
        lens,
        focal_length,
        aperture,
        shutter,
        iso,
    ] = values.map(|value| value.map(|(_, text)| text));
    normalize_image_metadata(ImageMetadata {
        date,
        make,
        camera,
        lens,
        focal_length,
        aperture,
        shutter,
        iso,
    })
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

fn format_exif_value(tag: ExifTag, value: &EntryValue) -> String {
    match (tag, value) {
        // Photo dates retain capture wall-clock time even when EXIF includes an offset.
        (ExifTag::DateTimeOriginal, _) => value
            .as_datetime()
            .map(|date| date.into_naive().format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_else(|| value.to_string()),
        (ExifTag::FNumber, EntryValue::URational(number)) => {
            (number.numerator() as f64 / number.denominator() as f64).to_string()
        }
        (ExifTag::ExposureTime, EntryValue::URational(time)) => {
            let numerator = time.numerator();
            let denominator = time.denominator();
            if numerator >= denominator {
                (numerator as f64 / denominator as f64).to_string()
            } else if numerator != 0 {
                format!("1/{}", denominator as f64 / numerator as f64)
            } else {
                format!("{numerator}/{denominator}")
            }
        }
        _ => value.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::super::exif::{METADATA_TAGS, read_exif};
    use super::{extract_image_metadata, format_exif_value};
    use chrono::DateTime;
    use nom_exif::{EntryValue, Exif, ExifTag, MediaParser, MediaSource, URational};
    use serde_json::{Value, json};
    use std::path::Path;

    #[test]
    fn single_pass_metadata_matches_eager_exif_for_the_image_corpus() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures/media");
        let mut parser = MediaParser::new();
        for filename in [
            "image-iPhone-1.HEIC",
            "image-iPhone-2.jpeG",
            "image-iPhone-3.jpeg",
            "image-screenshot.jpg",
            "image-sony-1.ARW",
            "image-sony-2.JPG",
            "test.RW2",
        ] {
            let iter = read_exif(&root.join(filename), &mut parser).unwrap();
            assert_matches_eager(iter, filename);
        }
    }

    #[test]
    fn single_pass_preserves_namespace_priority_partial_errors_and_primary_image_only() {
        let mut data = vec![0; 110];
        data[..8].copy_from_slice(b"II\x2a\0\x08\0\0\0");
        data[8..10].copy_from_slice(&3_u16.to_le_bytes());
        data[46..50].copy_from_slice(&92_u32.to_le_bytes());
        data[50..52].copy_from_slice(&3_u16.to_le_bytes());
        data[92..94].copy_from_slice(&1_u16.to_le_bytes());
        set_entry(&mut data, 10, 0x8769, 4, 1, 50);
        text_entry(&mut data, 22, 0x010f, "Primary");
        text_entry(&mut data, 34, 0x9003, "invalid");
        text_entry(&mut data, 52, 0x010f, "Exif");
        text_entry(&mut data, 64, 0x0110, "Exif camera");
        text_entry(&mut data, 76, 0x9003, "2024:12:16 20:55:20");
        text_entry(&mut data, 94, 0xa434, "Thumbnail lens");
        let mut parser = MediaParser::new();
        let iter = parser
            .parse_exif(MediaSource::from_memory(data).unwrap())
            .unwrap();
        assert_matches_eager(iter.clone(), "IFD priority and errors");
        assert_eq!(
            serde_json::to_value(extract_image_metadata(iter)).unwrap(),
            json!({
                "date": "2024-12-16 20:55:20", "make": "Primary", "camera": "Exif camera",
                "lens": null, "focalLength": null, "aperture": null, "shutter": null, "iso": null,
            })
        );
    }

    fn assert_matches_eager(iter: nom_exif::ExifIter, name: &str) {
        let eager: Exif = iter.clone().into();
        let names = [
            "date",
            "make",
            "camera",
            "lens",
            "focalLength",
            "aperture",
            "shutter",
            "iso",
        ];
        let values = names
            .into_iter()
            .zip(METADATA_TAGS)
            .map(|(name, tag)| {
                let value = eager.get(tag).map(|value| format_exif_value(tag, value));
                (name.to_string(), serde_json::to_value(value).unwrap())
            })
            .collect::<serde_json::Map<String, Value>>();
        let expected = if values.values().all(Value::is_null) {
            Value::Null
        } else {
            Value::Object(values)
        };
        assert_eq!(
            serde_json::to_value(extract_image_metadata(iter)).unwrap(),
            expected,
            "{name}"
        );
    }

    fn text_entry(data: &mut Vec<u8>, position: usize, tag: u16, text: &str) {
        let offset = data.len() as u32;
        data.extend_from_slice(text.as_bytes());
        data.push(0);
        set_entry(data, position, tag, 2, text.len() as u32 + 1, offset);
    }

    fn set_entry(data: &mut [u8], position: usize, tag: u16, kind: u16, count: u32, value: u32) {
        data[position..position + 2].copy_from_slice(&tag.to_le_bytes());
        data[position + 2..position + 4].copy_from_slice(&kind.to_le_bytes());
        data[position + 4..position + 8].copy_from_slice(&count.to_le_bytes());
        data[position + 8..position + 12].copy_from_slice(&value.to_le_bytes());
    }

    #[test]
    fn capture_dates_keep_wall_clock_time_without_offset_or_subseconds() {
        for offset in ["+08:00", "-07:00"] {
            let date =
                DateTime::parse_from_rfc3339(&format!("2024-05-09T11:17:13.123{offset}")).unwrap();
            for value in [
                EntryValue::DateTime(date),
                EntryValue::NaiveDateTime(date.naive_local()),
            ] {
                assert_eq!(
                    format_exif_value(ExifTag::DateTimeOriginal, &value),
                    "2024-05-09 11:17:13"
                );
            }
        }
    }

    #[test]
    fn capture_date_text_is_preserved() {
        for text in [
            "2024:05:09 11:17:13",
            "2024-05-09T11:17:13.123+08:00",
            "unknown",
            "",
        ] {
            assert_eq!(
                format_exif_value(ExifTag::DateTimeOriginal, &EntryValue::from(text)),
                text
            );
        }
    }

    #[test]
    fn aperture_and_shutter_values_stay_suitable_for_filename_templates() {
        for (tag, numerator, denominator, expected) in [
            (ExifTag::FNumber, 18, 10, "1.8"),
            (ExifTag::FNumber, 13, 1, "13"),
            (ExifTag::ExposureTime, 2, 100, "1/50"),
            (ExifTag::ExposureTime, 3, 2, "1.5"),
            (ExifTag::ExposureTime, 1, 1, "1"),
            (ExifTag::ExposureTime, 0, 1, "0/1"),
        ] {
            let value = EntryValue::URational(URational::new(numerator, denominator));
            assert_eq!(format_exif_value(tag, &value), expected);
        }
    }
}
