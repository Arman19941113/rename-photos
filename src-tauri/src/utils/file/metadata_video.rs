use chrono::prelude::{DateTime, Local};
use nom_exif::{EntryValue, ExifDateTime, MediaKind, MediaParser, MediaSource, TrackInfoTag};
use std::path::Path;

#[derive(serde::Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VideoMetadata {
    date: Option<String>,
    make: Option<String>,
    camera: Option<String>,
}

pub(crate) fn analyze_video_metadata(
    path: &Path,
    parser: &mut MediaParser,
) -> (Option<VideoMetadata>, Option<String>) {
    match read_video_metadata(path, parser) {
        Ok(metadata) => (metadata, None),
        Err(err) => (None, Some(err.to_string())),
    }
}

fn read_video_metadata(
    path: &Path,
    parser: &mut MediaParser,
) -> anyhow::Result<Option<VideoMetadata>> {
    let ms = MediaSource::open(path)?;
    if ms.kind() != MediaKind::Track {
        return Ok(None);
    }

    let info = parser.parse_track(ms)?;

    let metadata = VideoMetadata {
        date: info.get(TrackInfoTag::CreateDate).map(format_video_date),
        make: info.get(TrackInfoTag::Make).map(ToString::to_string),
        camera: info.get(TrackInfoTag::Model).map(ToString::to_string),
    };

    Ok(normalize_video_metadata(metadata))
}

fn normalize_video_metadata(metadata: VideoMetadata) -> Option<VideoMetadata> {
    let has_any = metadata.date.is_some() || metadata.make.is_some() || metadata.camera.is_some();
    if has_any { Some(metadata) } else { None }
}

fn format_video_date(value: &EntryValue) -> String {
    match value.as_datetime() {
        Some(ExifDateTime::Aware(date)) => date
            .with_timezone(&Local)
            .format("%Y-%m-%d %H:%M:%S")
            .to_string(),
        Some(ExifDateTime::Naive(date)) => date.format("%Y-%m-%d %H:%M:%S").to_string(),
        None => {
            let raw = value.to_string();
            raw.parse::<DateTime<Local>>()
                .or_else(|_| {
                    DateTime::parse_from_rfc3339(&raw).map(|date| date.with_timezone(&Local))
                })
                .map(|date| date.format("%Y-%m-%d %H:%M:%S").to_string())
                .unwrap_or(raw)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::format_video_date;
    use chrono::{DateTime, Local, NaiveDateTime};
    use nom_exif::EntryValue;

    #[test]
    fn aware_video_dates_and_text_use_local_time_without_subseconds() {
        for offset in ["+08:00", "-07:00"] {
            let date =
                DateTime::parse_from_rfc3339(&format!("2024-05-09T11:17:13.123{offset}")).unwrap();
            let expected = date
                .with_timezone(&Local)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string();

            for value in [
                EntryValue::DateTime(date),
                EntryValue::Text(date.to_rfc3339()),
                EntryValue::Text(date.format("%Y-%m-%d %H:%M:%S%.3f%z").to_string()),
            ] {
                assert_eq!(format_video_date(&value), expected);
            }
        }
    }

    #[test]
    fn naive_video_dates_keep_wall_clock_time_without_subseconds() {
        let date = NaiveDateTime::parse_from_str("2024-05-09 11:17:13.123", "%Y-%m-%d %H:%M:%S%.f")
            .unwrap();

        assert_eq!(
            format_video_date(&EntryValue::NaiveDateTime(date)),
            "2024-05-09 11:17:13"
        );
    }

    #[test]
    fn unparseable_video_dates_keep_display_values() {
        for text in ["2024-05-09 11:17:13", "2024:05:09 11:17:13", "unknown", ""] {
            assert_eq!(format_video_date(&EntryValue::from(text)), text);
        }
        assert_eq!(format_video_date(&EntryValue::U16(2024)), "2024");
    }
}
