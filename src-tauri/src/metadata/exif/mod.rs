//! Image EXIF reader with compatibility fallbacks for RAW container variants.

use std::{
    fs::File,
    io::{self, Read, Seek},
    path::Path,
};

use nom_exif::{ExifIter, ExifTag, MediaParser, MediaSource};

mod rw2;
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

pub(super) fn read_exif(path: &Path, parser: &mut MediaParser) -> anyhow::Result<ExifIter> {
    let mut file = File::open(path).map_err(nom_exif::Error::from)?;
    let result = MediaSource::seekable(&mut file).and_then(|source| parser.parse_exif(source));
    match result {
        Ok(exif) => Ok(exif),
        Err(container_error) => {
            let file_len = file.metadata()?.len();
            read_compatible_exif(&mut file, file_len, parser).map_err(|fallback_error| {
                preserve_non_matching_fallback_error(container_error.into(), fallback_error)
            })
        }
    }
}

fn preserve_non_matching_fallback_error(
    container_error: anyhow::Error,
    fallback_error: CompatibilityError,
) -> anyhow::Error {
    match fallback_error {
        CompatibilityError::NoMatchingReader => container_error,
        CompatibilityError::ReadFailed(error) => error,
    }
}

const PANASONIC_RW2_LE_MAGIC: [u8; 4] = [0x49, 0x49, 0x55, 0x00];

#[derive(Debug)]
enum CompatibilityError {
    NoMatchingReader,
    ReadFailed(anyhow::Error),
}

fn read_compatible_exif(
    reader: &mut (impl Read + Seek),
    file_len: u64,
    parser: &mut MediaParser,
) -> Result<ExifIter, CompatibilityError> {
    reader
        .rewind()
        .map_err(|error| CompatibilityError::ReadFailed(error.into()))?;
    let mut header = [0; 4];
    match reader.read_exact(&mut header) {
        Ok(()) => {}
        Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => {
            return Err(CompatibilityError::NoMatchingReader);
        }
        Err(error) => return Err(CompatibilityError::ReadFailed(error.into())),
    }
    let result = match &header {
        &PANASONIC_RW2_LE_MAGIC => rw2::read_metadata(reader, file_len, parser),
        b"II\x2a\0" | b"MM\0\x2a" => tiff::read_metadata(reader, file_len, parser),
        _ => return Err(CompatibilityError::NoMatchingReader),
    };
    result.map_err(CompatibilityError::ReadFailed)
}
