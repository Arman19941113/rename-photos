use chrono::prelude::{DateTime, Local};
use nom_exif::{MediaParser, MediaSource, TrackInfo, TrackInfoTag};

#[derive(serde::Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VideoMetadata {
    date: Option<String>,
    make: Option<String>,
    camera: Option<String>,
}

pub(crate) fn analyze_video_metadata(path_str: &str) -> (Option<VideoMetadata>, Option<String>) {
    match read_video_metadata(path_str) {
        Ok(metadata) => (metadata, None),
        Err(err) => (None, Some(err)),
    }
}

fn read_video_metadata(path_str: &str) -> Result<Option<VideoMetadata>, String> {
    read_video_metadata_inner(path_str).map_err(|err| err.to_string())
}

fn read_video_metadata_inner(path_str: &str) -> anyhow::Result<Option<VideoMetadata>> {
    let mut parser = MediaParser::new();
    let ms = MediaSource::file_path(path_str).map_err(|err| anyhow::anyhow!(err.to_string()))?;
    if !ms.has_track() {
        return Ok(None);
    }

    let info: TrackInfo = parser
        .parse(ms)
        .map_err(|err| anyhow::anyhow!(err.to_string()))?;

    let mut metadata = VideoMetadata::default();
    metadata.date = info.get(TrackInfoTag::CreateDate).map(|field| {
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
    metadata.make = info.get(TrackInfoTag::Make).map(|field| field.to_string());
    metadata.camera = info.get(TrackInfoTag::Model).map(|field| field.to_string());

    Ok(normalize_video_metadata(metadata))
}

fn normalize_video_metadata(metadata: VideoMetadata) -> Option<VideoMetadata> {
    let has_any = metadata.date.is_some() || metadata.make.is_some() || metadata.camera.is_some();
    if has_any { Some(metadata) } else { None }
}
