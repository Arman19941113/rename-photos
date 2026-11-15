//! Extracts TIFF metadata from a JPEG XL Exif box without reading the codestream.

use std::{
    io::{self, Read, Seek, SeekFrom},
    ops::Range,
};

use nom_exif::{ExifIter, MediaParser};

use super::{read_range::ReadRange, tiff};

const SIGNATURE_LEN: u32 = 12;
pub(super) const SIGNATURE_SIZE: [u8; 4] = SIGNATURE_LEN.to_be_bytes();
const SIGNATURE_SUFFIX: &[u8; 8] = b"JXL \x0d\x0a\x87\x0a";
// ISO/IEC 18181-2 §9.2 specifies the exact encoding of the second box.
const FILE_TYPE_BOX: &[u8; 20] = b"\0\0\0\x14ftypjxl \0\0\0\0jxl ";
const BOX_HEADER_LEN: u64 = 8;
const MAX_SCANNED_BOXES: usize = 4_096;
const CODESTREAM_PART_INDEX_LEN: u64 = 4;

pub(super) fn has_signature_suffix(reader: &mut impl Read) -> io::Result<bool> {
    let mut suffix = [0; SIGNATURE_SUFFIX.len()];
    match reader.read_exact(&mut suffix) {
        Ok(()) => Ok(suffix == *SIGNATURE_SUFFIX),
        Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => Ok(false),
        Err(error) => Err(error),
    }
}

pub(super) fn read_metadata(
    reader: &mut (impl Read + Seek),
    file_len: u64,
    parser: &mut MediaParser,
) -> anyhow::Result<Option<ExifIter>> {
    let mut file_type = [0; FILE_TYPE_BOX.len()];
    let mut start = u64::from(SIGNATURE_LEN) + file_type.len() as u64;
    anyhow::ensure!(start <= file_len, "Truncated JPEG XL file type box");
    reader.seek(SeekFrom::Start(u64::from(SIGNATURE_LEN)))?;
    reader.read_exact(&mut file_type)?;
    anyhow::ensure!(file_type == *FILE_TYPE_BOX, "Invalid JPEG XL file type box");

    let mut has_codestream = false;
    let mut exif_payload = None;
    let mut scanned_boxes = 0;
    while start < file_len {
        anyhow::ensure!(
            scanned_boxes < MAX_SCANNED_BOXES,
            "JPEG XL box scan limit exceeded ({MAX_SCANNED_BOXES} boxes)"
        );
        scanned_boxes += 1;
        reader.seek(SeekFrom::Start(start))?;
        let (kind, payload) = read_box(reader, start, file_len)?;
        start = payload.end;
        let payload_len = payload.end - payload.start;
        match &kind {
            b"jxlc" if payload_len > 0 => has_codestream = true,
            b"jxlp" if payload_len > CODESTREAM_PART_INDEX_LEN => has_codestream = true,
            b"Exif" if exif_payload.is_none() => exif_payload = Some(payload),
            _ => {}
        }
        if has_codestream && let Some(payload) = exif_payload {
            return read_exif_box(reader, payload, parser).map(Some);
        }
    }
    anyhow::ensure!(has_codestream, "Missing JPEG XL codestream data");
    Ok(None)
}

fn read_box(
    reader: &mut impl Read,
    start: u64,
    file_len: u64,
) -> anyhow::Result<([u8; 4], Range<u64>)> {
    let remaining = file_len - start;
    anyhow::ensure!(remaining >= BOX_HEADER_LEN, "Truncated JPEG XL box header");
    let mut size = [0; 4];
    let mut kind = [0; 4];
    reader.read_exact(&mut size)?;
    reader.read_exact(&mut kind)?;
    let mut header_len = BOX_HEADER_LEN;
    let size = match u32::from_be_bytes(size) {
        0 => remaining,
        1 => {
            header_len += 8;
            anyhow::ensure!(remaining >= header_len, "Truncated JPEG XL box header");
            let mut extended = [0; 8];
            reader.read_exact(&mut extended)?;
            u64::from_be_bytes(extended)
        }
        size => u64::from(size),
    };
    anyhow::ensure!(
        (header_len..=remaining).contains(&size),
        "Invalid JPEG XL box size"
    );
    Ok((kind, start + header_len..start + size))
}

fn read_exif_box(
    reader: &mut (impl Read + Seek),
    payload: Range<u64>,
    parser: &mut MediaParser,
) -> anyhow::Result<ExifIter> {
    let mut offset = [0; 4];
    let offset_size = offset.len() as u64;
    anyhow::ensure!(
        payload.end - payload.start >= offset_size,
        "Truncated JPEG XL Exif offset"
    );
    reader.seek(SeekFrom::Start(payload.start))?;
    reader.read_exact(&mut offset)?;
    // The offset is relative to the bytes after the offset field, not the box header.
    let tiff_offset = offset_size + u64::from(u32::from_be_bytes(offset));
    let tiff_len = (payload.end - payload.start)
        .checked_sub(tiff_offset)
        .filter(|length| *length >= 8)
        .ok_or_else(|| anyhow::anyhow!("Invalid JPEG XL Exif TIFF offset"))?;
    let mut tiff = ReadRange::new(reader, payload.start + tiff_offset, tiff_len)?;
    tiff::read_metadata(&mut tiff, tiff_len, parser)
}

#[cfg(test)]
mod tests {
    use std::io::{Cursor, Write};

    use nom_exif::{Exif, ExifTag};

    use super::super::test_support::sparse_reader;
    use super::*;

    const HEADER: &[u8] = b"\0\0\0\x0cJXL \x0d\x0a\x87\x0a\0\0\0\x14ftypjxl \0\0\0\0jxl ";
    const CODESTREAM: &[u8] = b"\0\0\0\x0ajxlc\xff\x0a";
    const TIFF: &[u8] = b"II\x2a\0\x08\0\0\0\x01\0\x0f\x01\x02\0\x04\0\0\0ABC\0\0\0\0\0";

    #[test]
    fn rejects_truncation_after_the_signature_or_within_the_file_type_box() {
        for length in SIGNATURE_LEN as usize..HEADER.len() {
            let data = &HEADER[..length];
            let error = read_metadata(
                &mut Cursor::new(data),
                length as u64,
                &mut MediaParser::new(),
            )
            .unwrap_err();
            assert_eq!(error.to_string(), "Truncated JPEG XL file type box");
        }
    }

    #[test]
    fn rejects_missing_or_invalid_file_type_box() {
        let signature = &HEADER[..SIGNATURE_LEN as usize];
        for second_box in [
            b"\0\0\0\x14freejxl \0\0\0\0jxl ",
            b"\0\0\0\x14ftypavif\0\0\0\0avif",
            b"\0\0\0\0ftypjxl \0\0\0\0jxl ",
        ] {
            let data = [signature, second_box].concat();
            let length = data.len() as u64;
            let error =
                read_metadata(&mut Cursor::new(data), length, &mut MediaParser::new()).unwrap_err();
            assert_eq!(error.to_string(), "Invalid JPEG XL file type box");
        }
    }

    #[test]
    fn rejects_containers_without_codestream_data() {
        for tail in [
            &b""[..],
            b"\0\0\0\0xml <xmp/>",
            b"\0\0\0\x08jxlc",
            b"\0\0\0\x0cjxlp\x80\0\0\0",
        ] {
            let data = [HEADER, tail].concat();
            let length = data.len() as u64;
            let error =
                read_metadata(&mut Cursor::new(data), length, &mut MediaParser::new()).unwrap_err();
            assert_eq!(error.to_string(), "Missing JPEG XL codestream data");
        }
    }

    #[test]
    fn stops_before_reading_a_box_beyond_the_scan_limit() {
        const EXPECTED_SCAN_LIMIT: usize = 4_096;
        let free_box = b"\0\0\0\x08free";
        let mut data = [HEADER, CODESTREAM].concat();
        data.extend_from_slice(&free_box.repeat(EXPECTED_SCAN_LIMIT - 1));
        let limit_end = data.len() as u64;
        let mut parser = MediaParser::new();
        assert!(
            read_metadata(&mut Cursor::new(&data), limit_end, &mut parser)
                .unwrap()
                .is_none()
        );

        data.extend_from_slice(free_box);
        let length = data.len() as u64;
        let mut reader = Cursor::new(data);
        let error = read_metadata(&mut reader, length, &mut parser).unwrap_err();
        assert_eq!(
            error.to_string(),
            format!("JPEG XL box scan limit exceeded ({EXPECTED_SCAN_LIMIT} boxes)")
        );
        assert_eq!(reader.position(), limit_end);
    }

    #[test]
    fn reads_exif_before_the_codestream_once_codestream_data_is_found() {
        let mut exif_only = HEADER.to_vec();
        exif_only.extend_from_slice(&(12 + TIFF.len() as u32).to_be_bytes());
        exif_only.extend_from_slice(b"Exif\0\0\0\0");
        exif_only.extend_from_slice(TIFF);

        let error = read_metadata(
            &mut Cursor::new(&exif_only),
            exif_only.len() as u64,
            &mut MediaParser::new(),
        )
        .unwrap_err();
        assert_eq!(error.to_string(), "Missing JPEG XL codestream data");

        for codestream in [CODESTREAM, b"\0\0\0\x0djxlp\x80\0\0\0\xff"] {
            let data = [exif_only.as_slice(), codestream].concat();
            let length = data.len() as u64;
            let exif: Exif = read_metadata(&mut Cursor::new(data), length, &mut MediaParser::new())
                .unwrap()
                .unwrap()
                .into();
            assert_eq!(
                exif.get(ExifTag::Make).and_then(|value| value.as_str()),
                Some("ABC")
            );
        }
    }

    #[test]
    fn skips_large_codestream_and_reads_exif_at_a_nonzero_tiff_offset() {
        let box_size = 64 * 1024 * 1024_u64;
        let mut data = HEADER.to_vec();
        data.extend_from_slice(b"\0\0\0\x01jxlc");
        data.extend_from_slice(&box_size.to_be_bytes());
        let exif_start = HEADER.len() as u64 + box_size;
        let exif_header = b"\0\0\0\0Exif\0\0\0\x06Exif\0\0";
        let length = exif_start + (exif_header.len() + TIFF.len()) as u64;
        let mut reader = sparse_reader(&data, length);
        reader.inner.seek(SeekFrom::Start(exif_start)).unwrap();
        reader.inner.write_all(exif_header).unwrap();
        reader.inner.write_all(TIFF).unwrap();

        let exif: Exif = read_metadata(&mut reader, length, &mut MediaParser::new())
            .unwrap()
            .unwrap()
            .into();
        assert_eq!(
            exif.get(ExifTag::Make).and_then(|value| value.as_str()),
            Some("ABC")
        );
        assert!(reader.bytes_read < 128);
    }

    #[test]
    fn rejects_box_ranges_and_offsets_that_exceed_their_bounds() {
        for (tail, expected) in [
            (&b"\0\0\0\x07jxlc"[..], "Invalid JPEG XL box size"),
            (
                b"\0\0\0\x01jxlc\xff\xff\xff\xff\xff\xff\xff\xff",
                "Invalid JPEG XL box size",
            ),
            (
                // The EXIF offset points at a TIFF header in the next box.
                b"\0\0\0\x0cExif\0\0\0\x08\0\0\0\0free",
                "Invalid JPEG XL Exif TIFF offset",
            ),
        ] {
            let data = [HEADER, CODESTREAM, tail, TIFF].concat();
            let length = data.len() as u64;
            let error =
                read_metadata(&mut Cursor::new(data), length, &mut MediaParser::new()).unwrap_err();
            assert_eq!(error.to_string(), expected);
        }
    }

    #[test]
    fn skips_xmp_when_there_is_no_exif_box() {
        let data = [HEADER, CODESTREAM, b"\0\0\0\0xml <xmp/>"].concat();
        let length = data.len() as u64;
        assert!(
            read_metadata(&mut Cursor::new(data), length, &mut MediaParser::new())
                .unwrap()
                .is_none()
        );
    }
}
