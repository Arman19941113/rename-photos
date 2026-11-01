//! Image EXIF reader with compatibility fallbacks for RAW container variants.

use std::{fs::File, path::Path};

use nom_exif::{ExifIter, ExifTag, MediaParser, MediaSource};

mod raw_fallback;
mod tiff;

#[cfg(test)]
mod test_support;

pub(super) const METADATA_TAGS: [ExifTag; 8] = [
    ExifTag::DateTimeOriginal,
    ExifTag::Make,
    ExifTag::Model,
    ExifTag::LensModel,
    ExifTag::FocalLengthIn35mmFilm,
    ExifTag::FNumber,
    ExifTag::ExposureTime,
    ExifTag::ISOSpeedRatings,
];

pub(crate) fn read_exif(path: &Path, parser: &mut MediaParser) -> anyhow::Result<ExifIter> {
    let mut file = File::open(path).map_err(nom_exif::Error::from)?;
    let result = MediaSource::seekable(&mut file).and_then(|source| parser.parse_exif(source));
    match result {
        Ok(exif) => Ok(exif),
        Err(container_error) => {
            let file_len = file.metadata()?.len();
            raw_fallback::read_supported_raw(&mut file, file_len, parser).map_err(
                |fallback_error| {
                    preserve_non_matching_fallback_error(container_error.into(), fallback_error)
                },
            )
        }
    }
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
