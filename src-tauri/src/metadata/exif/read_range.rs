use std::io::{self, Read, Seek, SeekFrom};

pub(super) struct ReadRange<'a, R> {
    reader: &'a mut R,
    start: u64,
    length: u64,
    position: u64,
}

impl<'a, R: Seek> ReadRange<'a, R> {
    pub(super) fn new(reader: &'a mut R, start: u64, length: u64) -> io::Result<Self> {
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
