//! Panasonic RW2 metadata via bounded embedded JPEG reads and TIFF fallback.

use nom_exif::{ExifIter, MediaParser, MediaSource};
use std::io::{self, Read, Seek, SeekFrom};

use super::tiff;

const JPEG_SOI: [u8; 2] = [0xff, 0xd8];
const TIFF_HEADER_LEN: u64 = 8;

pub(super) fn read_metadata(
    reader: &mut (impl Read + Seek),
    file_len: u64,
    parser: &mut MediaParser,
) -> anyhow::Result<ExifIter> {
    read_embedded_jpeg(reader, file_len, parser)
        .or_else(|_| tiff::read_metadata(reader, file_len, parser))
}

fn read_embedded_jpeg(
    reader: &mut (impl Read + Seek),
    file_len: u64,
    parser: &mut MediaParser,
) -> anyhow::Result<ExifIter> {
    let ifd_offset = read_u32_le_at(reader, 4)? as u64;
    if ifd_offset < TIFF_HEADER_LEN || ifd_offset >= file_len {
        anyhow::bail!("Invalid RW2 IFD offset");
    }
    for entry in read_ifd_entries(reader, ifd_offset, file_len)? {
        if !entry.can_reference_blob(file_len) {
            continue;
        }
        let mut signature = [0; 2];
        reader.seek(SeekFrom::Start(entry.value_offset as u64))?;
        reader.read_exact(&mut signature)?;
        if signature != JPEG_SOI {
            continue;
        }
        let mut jpeg = ReadRange::new(reader, entry.value_offset as u64, entry.value_len as u64)?;
        // Small JPEGs fit entirely in nom-exif's 128-byte format sniffing buffer.
        if entry.value_len <= 128 {
            let mut data = Vec::new();
            jpeg.read_to_end(&mut data)?;
            return Ok(parser.parse_exif(MediaSource::from_memory(data)?)?);
        }
        return Ok(parser.parse_exif(MediaSource::seekable(jpeg)?)?);
    }
    anyhow::bail!("No embedded JPEG EXIF found in Panasonic RW2 file");
}

struct IfdEntry {
    value_len: usize,
    value_offset: usize,
}

impl IfdEntry {
    fn can_reference_blob(&self, file_len: u64) -> bool {
        self.value_len > 4
            && (self.value_offset as u64)
                .checked_add(self.value_len as u64)
                .is_some_and(|end| end <= file_len)
    }
}

fn read_ifd_entries(
    reader: &mut (impl Read + Seek),
    ifd_offset: u64,
    file_len: u64,
) -> anyhow::Result<Vec<IfdEntry>> {
    reader.seek(SeekFrom::Start(ifd_offset))?;
    let mut count = [0; 2];
    reader.read_exact(&mut count)?;
    let count = u16::from_le_bytes(count) as usize;
    let entries_len = count * 12 + 2;
    if ifd_offset
        .checked_add(entries_len as u64)
        .is_none_or(|end| end > file_len)
    {
        anyhow::bail!("Truncated RW2 IFD");
    }
    let mut entries = Vec::with_capacity(count);
    for _ in 0..count {
        let mut raw = [0; 12];
        reader.read_exact(&mut raw)?;
        if let Some(entry) = parse_ifd_entry(&raw) {
            entries.push(entry);
        }
    }
    Ok(entries)
}

fn parse_ifd_entry(raw: &[u8; 12]) -> Option<IfdEntry> {
    let field_type = u16::from_le_bytes([raw[2], raw[3]]);
    let count = u32::from_le_bytes([raw[4], raw[5], raw[6], raw[7]]) as usize;
    let value_len = tiff_field_type_len(field_type)?.checked_mul(count)?;
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

fn read_u32_le_at(reader: &mut (impl Read + Seek), offset: u64) -> anyhow::Result<u32> {
    let mut bytes = [0; 4];
    reader.seek(SeekFrom::Start(offset))?;
    reader.read_exact(&mut bytes)?;
    Ok(u32::from_le_bytes(bytes))
}

struct ReadRange<'a, R> {
    reader: &'a mut R,
    start: u64,
    length: u64,
    position: u64,
}

impl<'a, R: Seek> ReadRange<'a, R> {
    fn new(reader: &'a mut R, start: u64, length: u64) -> io::Result<Self> {
        reader.seek(SeekFrom::Start(start))?;
        Ok(Self {
            reader,
            start,
            length,
            position: 0,
        })
    }
}

impl<R: Read> Read for ReadRange<'_, R> {
    fn read(&mut self, bytes: &mut [u8]) -> io::Result<usize> {
        let length = (self.length - self.position).min(bytes.len() as u64) as usize;
        let read = self.reader.read(&mut bytes[..length])?;
        self.position += read as u64;
        Ok(read)
    }
}

impl<R: Seek> Seek for ReadRange<'_, R> {
    fn seek(&mut self, position: SeekFrom) -> io::Result<u64> {
        let position = match position {
            SeekFrom::Start(position) => position as i128,
            SeekFrom::Current(offset) => self.position as i128 + offset as i128,
            SeekFrom::End(offset) => self.length as i128 + offset as i128,
        };
        if position < 0 || position > self.length as i128 {
            return Err(io::ErrorKind::InvalidInput.into());
        }
        let position = position as u64;
        let absolute = self
            .start
            .checked_add(position)
            .ok_or(io::ErrorKind::InvalidInput)?;
        self.reader.seek(SeekFrom::Start(absolute))?;
        self.position = position;
        Ok(position)
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_support::sparse_reader;
    use super::super::{CompatibilityError, read_compatible_exif};
    use super::{ReadRange, read_embedded_jpeg, read_metadata};
    use nom_exif::{Exif, ExifTag as Tag, MediaParser};
    use std::fs;
    use std::io::{Cursor, Read, Seek, SeekFrom, Write};

    #[test]
    fn routes_rw2_and_standard_tiff_by_content_and_preserves_nonmatching_errors() {
        let mut parser = MediaParser::new();
        for magic in [TiffMagic::PanasonicRw2, TiffMagic::Standard] {
            let data = minimal_tiff_data(magic);
            let length = data.len() as u64;
            let exif: Exif = read_compatible_exif(&mut Cursor::new(data), length, &mut parser)
                .unwrap()
                .into();
            assert_eq!(field_string(&exif, Tag::Make).as_deref(), Some("Panasonic"));
            assert_eq!(field_string(&exif, Tag::Model).as_deref(), Some("DMC-G85"));
        }
        for data in [b"IIU".as_slice(), b"not a TIFF container"] {
            assert!(matches!(
                read_compatible_exif(&mut Cursor::new(data), data.len() as u64, &mut parser),
                Err(CompatibilityError::NoMatchingReader)
            ));
        }
    }

    #[test]
    fn reads_metadata_from_panasonic_rw2_embedded_jpeg() {
        let path = write_temp_rw2("embedded", &minimal_rw2_data_with_embedded_jpeg());

        let mut file = fs::File::open(&path).unwrap();
        let length = file.metadata().unwrap().len();
        let exif: Exif = read_embedded_jpeg(&mut file, length, &mut MediaParser::new())
            .unwrap()
            .into();

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

        let mut file = fs::File::open(&path).unwrap();
        let length = file.metadata().unwrap().len();
        let exif: Exif = read_metadata(&mut file, length, &mut MediaParser::new())
            .unwrap()
            .into();

        fs::remove_file(path).unwrap();

        assert_eq!(field_string(&exif, Tag::Make).as_deref(), Some("Panasonic"));
        assert_eq!(field_string(&exif, Tag::Model).as_deref(), Some("DMC-G85"));
        assert_eq!(
            field_string(&exif, Tag::DateTimeOriginal).as_deref(),
            Some("2024-12-16 20:55:20")
        );
    }

    #[test]
    fn large_rw2_jpeg_ranges_do_not_allocate_or_read_the_declared_blob() {
        let mut data = minimal_rw2_data_with_embedded_jpeg();
        let jpeg_length = 32 * 1024 * 1024;
        let length = 26 + jpeg_length as u64;
        data[14..18].copy_from_slice(&(jpeg_length as u32).to_le_bytes());
        let mut reader = sparse_reader(&data, length);
        let exif: Exif = read_metadata(&mut reader, length, &mut MediaParser::new())
            .unwrap()
            .into();
        assert_eq!(field_string(&exif, Tag::Make).as_deref(), Some("Panasonic"));
        assert_eq!(
            field_string(&exif, Tag::DateTimeOriginal).as_deref(),
            Some("2024-12-16 20:55:20")
        );
        assert!(
            reader.bytes_read < 16 * 1024,
            "Read {} bytes",
            reader.bytes_read
        );
    }

    #[test]
    fn full_rw2_metadata_reads_skip_trailing_sensor_data() {
        let data = minimal_rw2_data();
        let length = 64 * 1024 * 1024;
        let mut reader = sparse_reader(&data, length);
        let exif: Exif = read_metadata(&mut reader, length, &mut MediaParser::new())
            .unwrap()
            .into();
        assert_eq!(field_string(&exif, Tag::Model).as_deref(), Some("DMC-G85"));
        assert_eq!(
            field_string(&exif, Tag::DateTimeOriginal).as_deref(),
            Some("2024-12-16 20:55:20")
        );
        assert!(reader.bytes_read < 1024, "Read {} bytes", reader.bytes_read);
    }

    #[test]
    fn invalid_rw2_blob_ranges_fall_back_to_tiff_without_large_reads() {
        let mut data = minimal_rw2_data();
        data[10..12].copy_from_slice(&0x002e_u16.to_le_bytes());
        data[12..14].copy_from_slice(&7_u16.to_le_bytes());
        data[14..18].copy_from_slice(&u32::MAX.to_le_bytes());
        let length = data.len() as u64;
        let mut reader = sparse_reader(&data, length);
        let exif: Exif = read_metadata(&mut reader, length, &mut MediaParser::new())
            .unwrap()
            .into();
        assert_eq!(field_string(&exif, Tag::Model).as_deref(), Some("DMC-G85"));
        assert_eq!(
            field_string(&exif, Tag::DateTimeOriginal).as_deref(),
            Some("2024-12-16 20:55:20")
        );
        assert!(reader.bytes_read < 1024);
    }

    #[test]
    fn jpeg_reader_bounds_relative_seeks_and_reads() {
        let mut source = Cursor::new(b"prefixJPEGsuffix");
        {
            let mut range = ReadRange::new(&mut source, 6, 4).unwrap();
            assert!(range.seek(SeekFrom::Current(-1)).is_err());
            assert!(range.seek(SeekFrom::End(1)).is_err());
            assert_eq!(range.seek(SeekFrom::End(-2)).unwrap(), 2);
            let mut tail = Vec::new();
            range.read_to_end(&mut tail).unwrap();
            assert_eq!(tail, b"EG");
            assert_eq!(range.seek(SeekFrom::Start(0)).unwrap(), 0);
            let mut all = Vec::new();
            range.read_to_end(&mut all).unwrap();
            assert_eq!(all, b"JPEG");
        }
        assert_eq!(source.position(), 10);
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

    fn field_string(exif: &Exif, tag: Tag) -> Option<String> {
        exif.get(tag).map(ToString::to_string)
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
