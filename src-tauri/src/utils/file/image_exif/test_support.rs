use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom, Write};

pub(super) struct CountedReader {
    pub inner: File,
    pub bytes_read: usize,
}

pub(super) fn sparse_reader(prefix: &[u8], length: u64) -> CountedReader {
    let mut inner = tempfile::tempfile().unwrap();
    inner.write_all(prefix).unwrap();
    inner.set_len(length).unwrap();
    inner.rewind().unwrap();
    CountedReader {
        inner,
        bytes_read: 0,
    }
}

impl Read for CountedReader {
    fn read(&mut self, bytes: &mut [u8]) -> io::Result<usize> {
        if bytes.len() > 64 * 1024 - self.bytes_read {
            return Err(io::Error::other("metadata read budget exceeded"));
        }
        let count = self.inner.read(bytes)?;
        self.bytes_read += count;
        Ok(count)
    }
}

impl Seek for CountedReader {
    fn seek(&mut self, position: SeekFrom) -> io::Result<u64> {
        self.inner.seek(position)
    }
}
