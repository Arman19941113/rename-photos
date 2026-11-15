//! Packs referenced metadata into a small TIFF without reading gaps or image pixels.

use std::collections::HashSet;
use std::io::{Read, Seek, SeekFrom};

use nom_exif::{ExifIter, ExifTag, MediaParser, MediaSource};

use super::METADATA_TAGS;

const MAX_COMPACT_TIFF_BYTES: u64 = 1024 * 1024;
const IFD_POINTER_TAGS: [ExifTag; 3] = [
    ExifTag::ExifOffset,
    ExifTag::GPSInfo,
    ExifTag::InteropOffset,
];

pub(super) fn read_metadata(
    reader: &mut (impl Read + Seek),
    file_len: u64,
    parser: &mut MediaParser,
) -> anyhow::Result<ExifIter> {
    reader.rewind()?;
    let mut header = [0; 8];
    reader.read_exact(&mut header)?;
    let endian = match &header[..4] {
        b"II\x2a\0" | b"II\x55\0" => Endian::Little,
        b"MM\0\x2a" => Endian::Big,
        _ => anyhow::bail!("Not a supported TIFF header"),
    };
    let first_ifd = endian.u32(&header[4..]);
    header[..4].copy_from_slice(match endian {
        Endian::Little => b"II\x2a\0",
        Endian::Big => b"MM\0\x2a",
    });
    let mut data = header.to_vec();
    let mut visited_ifds = HashSet::new();
    let first_ifd = copy_ifd(
        reader,
        file_len,
        first_ifd,
        endian,
        &mut data,
        &mut visited_ifds,
        0,
    )?;
    endian.write_u32(&mut data[4..8], first_ifd);
    Ok(parser.parse_exif(MediaSource::from_memory(data)?)?)
}

fn copy_ifd(
    reader: &mut (impl Read + Seek),
    file_len: u64,
    offset: u32,
    endian: Endian,
    data: &mut Vec<u8>,
    visited_ifds: &mut HashSet<u32>,
    depth: usize,
) -> anyhow::Result<u32> {
    if depth >= 3 {
        anyhow::bail!("TIFF IFD nesting is too deep");
    }
    // The EXIF parser follows every pointer, so forwarding a shared directory can multiply visits.
    anyhow::ensure!(visited_ifds.insert(offset), "Repeated TIFF IFD offset");
    check_range(offset as u64, 2, file_len)?;
    if offset < 8 {
        anyhow::bail!("Invalid TIFF IFD offset");
    }
    reader.seek(SeekFrom::Start(offset as u64))?;
    let mut count = [0; 2];
    reader.read_exact(&mut count)?;
    let count = endian.u16(&count) as usize;
    check_range(offset as u64, 2 + count as u64 * 12 + 4, file_len)?;
    let mut entries = vec![0; count * 12];
    reader.read_exact(&mut entries)?;
    let entries = entries
        .as_chunks::<12>()
        .0
        .iter()
        .filter(|entry| keep_entry(entry, endian))
        .collect::<Vec<_>>();
    let directory_len = 2 + entries.len() * 12 + 4;
    align_for_append(data, directory_len as u64)?;
    let directory_end = data.len() + directory_len;
    let copied = u32::try_from(data.len())?;
    data.extend_from_slice(&match endian {
        Endian::Little => (entries.len() as u16).to_le_bytes(),
        Endian::Big => (entries.len() as u16).to_be_bytes(),
    });
    let entries_start = data.len();
    data.resize(directory_end, 0);
    let mut seen_pointers = [false; IFD_POINTER_TAGS.len()];
    for (index, entry) in entries.into_iter().enumerate() {
        let start = entries_start + index * 12;
        data[start..start + 12].copy_from_slice(entry);
        let tag = endian.u16(entry);
        let value = endian.u32(&entry[8..]);
        if let Some(pointer_index) = ifd_pointer_index(tag) {
            anyhow::ensure!(
                !seen_pointers[pointer_index],
                "Duplicate TIFF IFD pointer tag 0x{tag:04x}"
            );
            seen_pointers[pointer_index] = true;
            let target = copy_ifd(
                reader,
                file_len,
                value,
                endian,
                data,
                visited_ifds,
                depth + 1,
            )?;
            endian.write_u32(&mut data[start + 8..start + 12], target);
        } else if let Some(unit) = field_size(endian.u16(&entry[2..])) {
            let length = endian.u32(&entry[4..]) as u64 * unit;
            if length > 4 {
                check_range(value as u64, length, file_len)?;
                align_for_append(data, length)?;
                let target = u32::try_from(data.len())?;
                reader.seek(SeekFrom::Start(value as u64))?;
                let read = reader.by_ref().take(length).read_to_end(data)?;
                if read as u64 != length {
                    anyhow::bail!("Truncated TIFF metadata value");
                }
                endian.write_u32(&mut data[start + 8..start + 12], target);
            }
        }
    }
    // Only the main image and its sub-IFDs supply naming metadata, not thumbnails.
    Ok(copied)
}

fn keep_entry(entry: &[u8; 12], endian: Endian) -> bool {
    let tag = endian.u16(entry);
    if ifd_pointer_index(tag).is_some() {
        return endian.u32(&entry[8..]) != 0;
    }
    METADATA_TAGS.iter().any(|field| field.code() == tag) || matches!(tag, 0x9010..=0x9012)
}

fn ifd_pointer_index(tag: u16) -> Option<usize> {
    IFD_POINTER_TAGS
        .iter()
        .position(|field| field.code() == tag)
}

fn check_range(offset: u64, length: u64, file_len: u64) -> anyhow::Result<()> {
    if offset.checked_add(length).is_none_or(|end| end > file_len) {
        anyhow::bail!("TIFF metadata range is outside the file");
    }
    Ok(())
}

fn align_for_append(data: &mut Vec<u8>, append_len: u64) -> anyhow::Result<()> {
    let aligned_len = data.len().next_multiple_of(2);
    // Several valid offsets can refer to the same bytes, so input bounds alone do not bound the copy.
    anyhow::ensure!(
        aligned_len as u64 + append_len <= MAX_COMPACT_TIFF_BYTES,
        "Compact TIFF metadata exceeds 1 MiB"
    );
    data.resize(aligned_len, 0);
    Ok(())
}

fn field_size(kind: u16) -> Option<u64> {
    match kind {
        1 | 2 | 6 | 7 => Some(1),
        3 | 8 => Some(2),
        4 | 9 | 11 => Some(4),
        5 | 10 | 12 => Some(8),
        _ => None,
    }
}

#[derive(Clone, Copy)]
enum Endian {
    Little,
    Big,
}

impl Endian {
    fn u16(self, bytes: &[u8]) -> u16 {
        let bytes = [bytes[0], bytes[1]];
        match self {
            Self::Little => u16::from_le_bytes(bytes),
            Self::Big => u16::from_be_bytes(bytes),
        }
    }

    fn u32(self, bytes: &[u8]) -> u32 {
        let bytes = [bytes[0], bytes[1], bytes[2], bytes[3]];
        match self {
            Self::Little => u32::from_le_bytes(bytes),
            Self::Big => u32::from_be_bytes(bytes),
        }
    }

    fn write_u32(self, bytes: &mut [u8], value: u32) {
        bytes.copy_from_slice(&match self {
            Self::Little => value.to_le_bytes(),
            Self::Big => value.to_be_bytes(),
        });
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_support::sparse_reader;
    use super::read_metadata;
    use nom_exif::{Exif, ExifTag, MediaParser};
    use std::io::{Seek, SeekFrom, Write};

    #[test]
    fn reads_late_tiff_values_in_both_byte_orders_without_reading_pixel_gaps() {
        let offset = 32 * 1024 * 1024;
        let length = 64 * 1024 * 1024;
        for big_endian in [false, true] {
            let mut reader = sparse_reader(&tiff_with_make(big_endian, offset), length);
            reader.inner.seek(SeekFrom::Start(offset as u64)).unwrap();
            reader.inner.write_all(b"Panasonic\0").unwrap();
            let exif: Exif = read_metadata(&mut reader, length, &mut MediaParser::new())
                .unwrap()
                .into();
            assert_eq!(
                exif.get(ExifTag::Make).and_then(|value| value.as_str()),
                Some("Panasonic")
            );
            assert!(reader.bytes_read < 128, "Read {} bytes", reader.bytes_read);
        }
    }

    #[test]
    fn rejects_out_of_file_values_and_truncated_directories_before_reading_payloads() {
        let mut data = tiff_with_make(false, u32::MAX);
        for directory_count in [1_u16, u16::MAX] {
            data[8..10].copy_from_slice(&directory_count.to_le_bytes());
            let mut reader = sparse_reader(&data, data.len() as u64);
            assert!(
                read_metadata(&mut reader, data.len() as u64, &mut MediaParser::new()).is_err()
            );
            assert!(reader.bytes_read <= data.len());
        }
    }

    #[test]
    fn rejects_overlapping_values_that_exceed_the_cumulative_copy_limit() {
        const EXPECTED_COPY_LIMIT: u32 = 1024 * 1024;
        let value_offset = 38_u32;
        let large_value_len = EXPECTED_COPY_LIMIT - value_offset - 2;
        let mut data = b"II\x2a\0\x08\0\0\0\x02\0".to_vec();
        for (tag, length) in [(0x010f_u16, 10_u32), (0x0110, large_value_len)] {
            data.extend_from_slice(&tag.to_le_bytes());
            data.extend_from_slice(&2_u16.to_le_bytes());
            data.extend_from_slice(&length.to_le_bytes());
            data.extend_from_slice(&value_offset.to_le_bytes());
        }
        data.extend_from_slice(&0_u32.to_le_bytes());
        assert_eq!(data.len(), value_offset as usize);
        let file_len = u64::from(value_offset + large_value_len);
        let mut reader = sparse_reader(&data, file_len);

        let error = read_metadata(&mut reader, file_len, &mut MediaParser::new()).unwrap_err();

        assert_eq!(error.to_string(), "Compact TIFF metadata exceeds 1 MiB");
        assert!(reader.bytes_read < 128, "Read {} bytes", reader.bytes_read);
    }

    #[test]
    fn rejects_cyclic_ifds() {
        let mut data = tiff_with_make(false, 8);
        data[10..12].copy_from_slice(&0x8769_u16.to_le_bytes());
        data[12..14].copy_from_slice(&4_u16.to_le_bytes());
        data[14..18].copy_from_slice(&1_u32.to_le_bytes());
        let mut reader = sparse_reader(&data, data.len() as u64);
        let error =
            read_metadata(&mut reader, data.len() as u64, &mut MediaParser::new()).unwrap_err();
        assert_eq!(error.to_string(), "Repeated TIFF IFD offset");
    }

    #[test]
    fn rejects_duplicate_pointer_tags_and_sub_ifds_shared_by_multiple_pointers() {
        let exif_tag = ExifTag::ExifOffset.code();
        for (second_tag, second_offset, expected) in [
            (exif_tag, 56_u32, "Duplicate TIFF IFD pointer tag 0x8769"),
            (ExifTag::GPSInfo.code(), 38, "Repeated TIFF IFD offset"),
        ] {
            let mut data = b"II\x2a\0\x08\0\0\0\x02\0".to_vec();
            for (tag, offset) in [(exif_tag, 38_u32), (second_tag, second_offset)] {
                data.extend_from_slice(&tag.to_le_bytes());
                data.extend_from_slice(b"\x04\0\x01\0\0\0");
                data.extend_from_slice(&offset.to_le_bytes());
            }
            data.extend_from_slice(b"\0\0\0\0");
            data.extend_from_slice(b"\x01\0\x0f\x01\x02\0\x04\0\0\0ABC\0\0\0\0\0");
            data.extend_from_slice(b"\x01\0\x0f\x01\x02\0\x04\0\0\0XYZ\0\0\0\0\0");
            let mut reader = sparse_reader(&data, data.len() as u64);

            let error =
                read_metadata(&mut reader, data.len() as u64, &mut MediaParser::new()).unwrap_err();

            assert_eq!(error.to_string(), expected);
        }
    }

    fn tiff_with_make(big_endian: bool, offset: u32) -> Vec<u8> {
        let mut bytes = if big_endian {
            b"MM\0\x2a\0\0\0\x08".to_vec()
        } else {
            b"II\x2a\0\x08\0\0\0".to_vec()
        };
        let u16_bytes = |value: u16| {
            if big_endian {
                value.to_be_bytes()
            } else {
                value.to_le_bytes()
            }
        };
        let u32_bytes = |value: u32| {
            if big_endian {
                value.to_be_bytes()
            } else {
                value.to_le_bytes()
            }
        };
        bytes.extend_from_slice(&u16_bytes(1));
        bytes.extend_from_slice(&u16_bytes(0x010f));
        bytes.extend_from_slice(&u16_bytes(2));
        bytes.extend_from_slice(&u32_bytes(10));
        bytes.extend_from_slice(&u32_bytes(offset));
        bytes.extend_from_slice(&u32_bytes(0));
        bytes
    }
}
