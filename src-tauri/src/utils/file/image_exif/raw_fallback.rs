//! Compatibility readers for RAW formats that are not accepted as standard EXIF containers.

use std::fs;
use std::io::{Cursor, Read, Seek, SeekFrom};
use std::path::Path;

const TIFF_LE_MAGIC: [u8; 4] = [0x49, 0x49, 0x2a, 0x00];
const PANASONIC_RW2_LE_MAGIC: [u8; 4] = [0x49, 0x49, 0x55, 0x00];
const JPEG_SOI: [u8; 2] = [0xff, 0xd8];
const TIFF_HEADER_LEN: u64 = 8;

pub(super) enum RawFallbackError {
    NoMatchingFallback,
    ReadFailed(anyhow::Error),
}

pub(super) fn read_supported_raw(path: &Path) -> Result<exif::Exif, RawFallbackError> {
    if is_panasonic_rw2_file(path).map_err(RawFallbackError::ReadFailed)? {
        return read_panasonic_rw2(path).map_err(RawFallbackError::ReadFailed);
    }

    Err(RawFallbackError::NoMatchingFallback)
}

fn read_panasonic_rw2(path: &Path) -> anyhow::Result<exif::Exif> {
    read_panasonic_rw2_embedded_jpeg(path).or_else(|_| read_panasonic_rw2_full_file(path))
}

fn read_panasonic_rw2_embedded_jpeg(path: &Path) -> anyhow::Result<exif::Exif> {
    let mut file = fs::File::open(path)?;
    let file_len = file.metadata()?.len();

    if !is_panasonic_rw2_reader(&mut file)? {
        anyhow::bail!("Not a Panasonic RW2 file");
    }

    let ifd_offset = read_u32_le_at(&mut file, 4)? as u64;
    if ifd_offset < TIFF_HEADER_LEN || ifd_offset >= file_len {
        anyhow::bail!("Invalid RW2 IFD offset");
    }

    for entry in read_ifd_entries(&mut file, ifd_offset, file_len)? {
        if !entry.can_reference_blob(file_len) {
            continue;
        }

        let mut signature = [0; 2];
        file.seek(SeekFrom::Start(entry.value_offset as u64))?;
        file.read_exact(&mut signature)?;

        if signature != JPEG_SOI {
            continue;
        }

        let mut jpeg = vec![0; entry.value_len];
        file.seek(SeekFrom::Start(entry.value_offset as u64))?;
        file.read_exact(&mut jpeg)?;

        return read_exif_from_jpeg(jpeg);
    }

    anyhow::bail!("No embedded JPEG EXIF found in Panasonic RW2 file");
}

fn read_panasonic_rw2_full_file(path: &Path) -> anyhow::Result<exif::Exif> {
    let mut data = fs::File::open(path).and_then(|mut file| {
        let mut data = Vec::new();
        file.read_to_end(&mut data)?;
        Ok(data)
    })?;

    if !is_panasonic_rw2_data(&data) {
        anyhow::bail!("Not a Panasonic RW2 file");
    }

    data[..4].copy_from_slice(&TIFF_LE_MAGIC);

    exif::Reader::new()
        .read_raw(data)
        .map_err(|err| anyhow::anyhow!(err.to_string()))
}

fn read_exif_from_jpeg(jpeg: Vec<u8>) -> anyhow::Result<exif::Exif> {
    let cursor = Cursor::new(jpeg);
    let mut reader = std::io::BufReader::new(cursor);

    exif::Reader::new()
        .read_from_container(&mut reader)
        .map_err(|err| anyhow::anyhow!(err.to_string()))
}

fn is_panasonic_rw2_file(path: &Path) -> anyhow::Result<bool> {
    let mut header = [0; 4];
    let mut file = fs::File::open(path)?;
    if file.read(&mut header)? < header.len() {
        return Ok(false);
    }

    Ok(is_panasonic_rw2_data(&header))
}

fn is_panasonic_rw2_reader(file: &mut fs::File) -> anyhow::Result<bool> {
    let mut header = [0; 4];
    file.seek(SeekFrom::Start(0))?;
    file.read_exact(&mut header)?;

    Ok(is_panasonic_rw2_data(&header))
}

fn is_panasonic_rw2_data(data: &[u8]) -> bool {
    data.starts_with(&PANASONIC_RW2_LE_MAGIC)
}

struct IfdEntry {
    value_len: usize,
    value_offset: usize,
}

impl IfdEntry {
    fn can_reference_blob(&self, file_len: u64) -> bool {
        if self.value_len <= 4 {
            return false;
        }

        let value_offset = self.value_offset as u64;
        let value_len = self.value_len as u64;

        value_offset
            .checked_add(value_len)
            .is_some_and(|end| end <= file_len)
    }
}

fn read_ifd_entries(
    file: &mut fs::File,
    ifd_offset: u64,
    file_len: u64,
) -> anyhow::Result<Vec<IfdEntry>> {
    file.seek(SeekFrom::Start(ifd_offset))?;
    let count = read_u16_le(file)? as usize;
    let entries_len = count
        .checked_mul(12)
        .and_then(|len| len.checked_add(2))
        .ok_or_else(|| anyhow::anyhow!("Invalid RW2 IFD size"))?;

    if ifd_offset
        .checked_add(entries_len as u64)
        .is_none_or(|end| end > file_len)
    {
        anyhow::bail!("Truncated RW2 IFD");
    }

    let mut entries = Vec::with_capacity(count);
    for _ in 0..count {
        let mut raw = [0; 12];
        file.read_exact(&mut raw)?;

        if let Some(entry) = parse_ifd_entry(&raw) {
            entries.push(entry);
        }
    }

    Ok(entries)
}

fn parse_ifd_entry(raw: &[u8; 12]) -> Option<IfdEntry> {
    let field_type = u16::from_le_bytes([raw[2], raw[3]]);
    let count = u32::from_le_bytes([raw[4], raw[5], raw[6], raw[7]]) as usize;
    let unit_len = tiff_field_type_len(field_type)?;
    let value_len = unit_len.checked_mul(count)?;

    if value_len <= 4 {
        return None;
    }

    Some(IfdEntry {
        value_len,
        value_offset: u32::from_le_bytes([raw[8], raw[9], raw[10], raw[11]]) as usize,
    })
}

fn tiff_field_type_len(field_type: u16) -> Option<usize> {
    match field_type {
        1 | 2 | 7 => Some(1),
        3 => Some(2),
        4 | 9 => Some(4),
        5 | 10 => Some(8),
        _ => None,
    }
}

fn read_u16_le(file: &mut fs::File) -> anyhow::Result<u16> {
    let mut bytes = [0; 2];
    file.read_exact(&mut bytes)?;
    Ok(u16::from_le_bytes(bytes))
}

fn read_u32_le_at(file: &mut fs::File, offset: u64) -> anyhow::Result<u32> {
    let mut bytes = [0; 4];
    file.seek(SeekFrom::Start(offset))?;
    file.read_exact(&mut bytes)?;
    Ok(u32::from_le_bytes(bytes))
}

#[cfg(test)]
mod tests {
    use super::{is_panasonic_rw2_data, read_panasonic_rw2, read_panasonic_rw2_embedded_jpeg};
    use exif::{In, Tag};
    use std::fs;
    use std::io::Write;

    #[test]
    fn detects_panasonic_rw2_header() {
        assert!(is_panasonic_rw2_data(&[0x49, 0x49, 0x55, 0x00, 0x08, 0x00]));
        assert!(!is_panasonic_rw2_data(&[
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00
        ]));
        assert!(!is_panasonic_rw2_data(&[0x49, 0x49, 0x55]));
    }

    #[test]
    fn reads_metadata_from_panasonic_rw2_embedded_jpeg() {
        let path = write_temp_rw2("embedded", &minimal_rw2_data_with_embedded_jpeg());

        let exif = read_panasonic_rw2_embedded_jpeg(&path).unwrap();

        fs::remove_file(path).unwrap();

        assert_eq!(field_string(&exif, Tag::Make).as_deref(), Some("Panasonic"));
        assert_eq!(field_string(&exif, Tag::Model).as_deref(), Some("DMC-G85"));
        assert_eq!(
            field_string(&exif, Tag::DateTimeOriginal).as_deref(),
            Some("2024-12-16 20:55:20")
        );
    }

    #[test]
    fn falls_back_to_full_rw2_tiff_variant() {
        let path = write_temp_rw2("full", &minimal_rw2_data());

        let exif = read_panasonic_rw2(&path).unwrap();

        fs::remove_file(path).unwrap();

        assert_eq!(field_string(&exif, Tag::Make).as_deref(), Some("Panasonic"));
        assert_eq!(field_string(&exif, Tag::Model).as_deref(), Some("DMC-G85"));
        assert_eq!(
            field_string(&exif, Tag::DateTimeOriginal).as_deref(),
            Some("2024-12-16 20:55:20")
        );
    }

    fn write_temp_rw2(name: &str, data: &[u8]) -> std::path::PathBuf {
        let mut path = std::env::temp_dir();
        path.push(format!(
            "rename-photos-rw2-{name}-test-{}.RW2",
            std::process::id()
        ));

        let mut file = fs::File::create(&path).unwrap();
        file.write_all(data).unwrap();
        path
    }

    fn field_string(exif: &exif::Exif, tag: Tag) -> Option<String> {
        exif.get_field(tag, In::PRIMARY).map(|field| {
            field
                .display_value()
                .to_string()
                .trim_matches('"')
                .to_string()
        })
    }

    fn minimal_rw2_data_with_embedded_jpeg() -> Vec<u8> {
        let jpeg = minimal_exif_jpeg();
        let jpeg_offset = 26;

        let mut data = Vec::new();
        data.extend_from_slice(&[0x49, 0x49, 0x55, 0x00]);
        push_u32(&mut data, 8);

        push_u16(&mut data, 1);
        push_ifd_entry(&mut data, 0x002e, 7, jpeg.len() as u32, jpeg_offset);
        push_u32(&mut data, 0);

        data.extend_from_slice(&jpeg);
        data
    }

    fn minimal_exif_jpeg() -> Vec<u8> {
        let tiff = minimal_tiff_data(TiffMagic::Standard);
        let app1_len = 2 + 6 + tiff.len();

        let mut jpeg = vec![0xff, 0xd8, 0xff, 0xe1];
        jpeg.extend_from_slice(&(app1_len as u16).to_be_bytes());
        jpeg.extend_from_slice(b"Exif\0\0");
        jpeg.extend_from_slice(&tiff);
        jpeg.extend_from_slice(&[0xff, 0xd9]);
        jpeg
    }

    fn minimal_rw2_data() -> Vec<u8> {
        minimal_tiff_data(TiffMagic::PanasonicRw2)
    }

    enum TiffMagic {
        Standard,
        PanasonicRw2,
    }

    fn minimal_tiff_data(magic: TiffMagic) -> Vec<u8> {
        let mut data = Vec::new();
        match magic {
            TiffMagic::Standard => data.extend_from_slice(&[0x49, 0x49, 0x2a, 0x00]),
            TiffMagic::PanasonicRw2 => data.extend_from_slice(&[0x49, 0x49, 0x55, 0x00]),
        }
        push_u32(&mut data, 8);

        push_u16(&mut data, 3);
        push_ifd_entry(&mut data, 0x010f, 2, 10, 50);
        push_ifd_entry(&mut data, 0x0110, 2, 8, 60);
        push_ifd_entry(&mut data, 0x8769, 4, 1, 68);
        push_u32(&mut data, 0);

        data.extend_from_slice(b"Panasonic\0");
        data.extend_from_slice(b"DMC-G85\0");

        push_u16(&mut data, 1);
        push_ifd_entry(&mut data, 0x9003, 2, 20, 86);
        push_u32(&mut data, 0);

        data.extend_from_slice(b"2024:12:16 20:55:20\0");
        data
    }

    fn push_ifd_entry(data: &mut Vec<u8>, tag: u16, typ: u16, count: u32, value: u32) {
        push_u16(data, tag);
        push_u16(data, typ);
        push_u32(data, count);
        push_u32(data, value);
    }

    fn push_u16(data: &mut Vec<u8>, value: u16) {
        data.extend_from_slice(&value.to_le_bytes());
    }

    fn push_u32(data: &mut Vec<u8>, value: u32) {
        data.extend_from_slice(&value.to_le_bytes());
    }
}
