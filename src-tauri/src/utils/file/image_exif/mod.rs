//! Image EXIF reader with compatibility fallbacks for RAW container variants.

use std::fs;
use std::path::Path;

mod raw_fallback;

pub(crate) fn read_exif(path: &Path) -> anyhow::Result<exif::Exif> {
    match read_standard_container(path) {
        Ok(exif) => Ok(exif),
        Err(container_error) => raw_fallback::read_supported_raw(path).map_err(|fallback_error| {
            preserve_non_matching_fallback_error(container_error, fallback_error)
        }),
    }
}

fn read_standard_container(path: &Path) -> anyhow::Result<exif::Exif> {
    let file = fs::File::open(path)?;
    let mut buf_reader = std::io::BufReader::new(&file);

    exif::Reader::new()
        .read_from_container(&mut buf_reader)
        .map_err(|err| anyhow::anyhow!(err.to_string()))
}

fn preserve_non_matching_fallback_error(
    container_error: anyhow::Error,
    fallback_error: raw_fallback::RawFallbackError,
) -> anyhow::Error {
    match fallback_error {
        raw_fallback::RawFallbackError::NoMatchingFallback => container_error,
        raw_fallback::RawFallbackError::ReadFailed(error) => error,
    }
}
