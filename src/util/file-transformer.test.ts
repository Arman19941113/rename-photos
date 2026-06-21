// Unit tests for converting backend file payloads into rename previews.
import { MetadataStatus } from '@/const'
import type { ImageMetadata, IPCFile, VideoMetadata } from '@/types/file'
import { describe, expect, it } from 'vitest'
import { transformIPCFiles } from './file-transformer'

const t = (key: string) => `t:${key}`

// Metadata factories keep individual tests focused on the field being varied.
function imageMetadata(overrides: Partial<ImageMetadata> = {}): ImageMetadata {
  return {
    date: '2024:04:22 23:17:54',
    make: 'Apple',
    camera: 'iPhone 14 Plus',
    lens: 'iPhone back camera',
    focalLength: '26',
    aperture: '1.5',
    shutter: '1/120',
    iso: '50',
    ...overrides,
  }
}

function videoMetadata(overrides: Partial<VideoMetadata> = {}): VideoMetadata {
  return {
    date: '2024-05-16 08:09:10',
    make: 'Apple',
    camera: 'iPhone 14 Plus',
    ...overrides,
  }
}

// IPC file factories mimic backend payloads without depending on real media files.
function imageFile(filename: string, overrides: Partial<Extract<IPCFile, { fileType: 'image' }>> = {}): IPCFile {
  return {
    pathname: `/photos/${filename}`,
    filename,
    created: new Date(2024, 0, 2, 3, 4, 5).getTime(),
    size: 1_250_000,
    fileType: 'image',
    metadata: imageMetadata(),
    metaError: null,
    ...overrides,
  }
}

function videoFile(filename: string, overrides: Partial<Extract<IPCFile, { fileType: 'video' }>> = {}): IPCFile {
  return {
    pathname: `/photos/${filename}`,
    filename,
    created: new Date(2024, 0, 2, 3, 4, 5).getTime(),
    size: 2_000,
    fileType: 'video',
    metadata: videoMetadata(),
    metaError: null,
    ...overrides,
  }
}

function otherFile(filename: string, overrides: Partial<Extract<IPCFile, { fileType: 'other' }>> = {}): IPCFile {
  return {
    pathname: `/photos/${filename}`,
    filename,
    created: new Date(2024, 0, 2, 3, 4, 5).getTime(),
    size: 999,
    fileType: 'other',
    ...overrides,
  }
}

// Small wrapper for the common preview-generation defaults used by most tests.
function transform({
  ipcFiles,
  strictMode = false,
  useCreatedDate = false,
  format = '{YYYY}{MM}{DD} {hh}.{mm}.{ss}',
}: {
  ipcFiles: IPCFile[]
  strictMode?: boolean
  useCreatedDate?: boolean
  format?: string
}) {
  return transformIPCFiles({ ipcFiles, strictMode, useCreatedDate, format, t })
}

describe('transformIPCFiles basic conversion', () => {
  it('sorts files by filename with numeric comparison and maps common fields', () => {
    const files = transform({
      ipcFiles: [otherFile('file-10.txt'), imageFile('file-2.jpg'), videoFile('file-1.mov')],
      format: '{Current}',
    })

    expect(files.map(file => file.filename)).toEqual(['file-1.mov', 'file-2.jpg', 'file-10.txt'])
    expect(files[0]).toMatchObject({
      dirname: '/photos',
      fileSize: '2 KB',
      created: '2024-01-02 03:04:05',
      fileType: 'video',
    })
    expect(files[1].fileType).toBe('image')
    expect(files[2].fileType).toBe('other')
  })
})

describe('transformIPCFiles template variables', () => {
  it('generates filenames from metadata date and EXIF fields', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG')],
      format: '{YYYY}{MM}{DD} {hh}.{mm}.{ss} {Make} {Camera} {Lens} {FocalLength} {Aperture} {Shutter} {ISO}',
    })

    expect(file.newFilename).toBe('20240422 23.17.54 Apple iPhone 14 Plus iPhone back camera 26 1.5 1120 50.JPG')
  })

  it('formats the Date variable by replacing colons with dots', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG')],
      format: '{Date}',
    })

    expect(file.newFilename).toBe('2024.04.22 23.17.54.JPG')
  })

  it('uses the current basename for Current variables', () => {
    const [upper, lower] = transform({
      ipcFiles: [imageFile('album.photo.001.jpg'), videoFile('clip.mov')],
      format: '{Current}-{current}',
    })

    expect(upper.newFilename).toBe('album.photo.001-album.photo.001.jpg')
    expect(lower.newFilename).toBe('clip-clip.mov')
  })

  it('always appends the original extension', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG')],
      format: 'archive.jpg',
    })

    expect(file.newFilename).toBe('archive.jpg.JPG')
  })
})

describe('transformIPCFiles strict mode and created date', () => {
  it('skips every file when the active format is empty', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG')],
      format: '',
    })

    expect(file).toMatchObject({
      newFilename: 'IMG_0001.JPG',
      shouldSkip: true,
    })
  })

  it('skips files in strict mode when required metadata is missing', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG', { metadata: imageMetadata({ lens: null }) })],
      strictMode: true,
      format: '{Lens}',
    })

    expect(file).toMatchObject({
      newFilename: 'IMG_0001.JPG',
      shouldSkip: true,
    })
  })

  it('uses placeholders for missing variables outside strict mode', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG', { metadata: imageMetadata({ date: null, make: null }) })],
      format: '{YYYY}-{Make}',
    })

    expect(file.newFilename).toBe('YYYY-Make.JPG')
    expect(file.shouldSkip).toBe(false)
  })

  it('uses the created timestamp for date variables when requested', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG', { metadata: imageMetadata({ date: null }) })],
      strictMode: true,
      useCreatedDate: true,
      format: '{YYYY}{MM}{DD} {hh}.{mm}.{ss}',
    })

    expect(file.newFilename).toBe('20240102 03.04.05.JPG')
    expect(file.shouldSkip).toBe(false)
  })
})

describe('transformIPCFiles sanitization', () => {
  it('removes forbidden characters from literal template text', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG')],
      format: 'a:b/c*d?e"f<g>h|i',
    })

    expect(file.newFilename).toBe('abcdefghi.JPG')
  })

  it('removes forbidden characters from metadata replacement values', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.JPG', { metadata: imageMetadata({ camera: 'a:b/c*d?e"f<g>h|i' }) })],
      format: '{Camera}',
    })

    expect(file.newFilename).toBe('abcdefghi.JPG')
  })
})

describe('transformIPCFiles duplicate handling', () => {
  it('adds a sequence to every duplicate target name', () => {
    const files = transform({
      ipcFiles: [imageFile('a.jpg'), imageFile('b.jpg')],
      format: 'same',
    })

    expect(files.map(file => file.newFilename)).toEqual(['same_1.jpg', 'same_2.jpg'])
  })

  it('detects duplicate target names case-insensitively', () => {
    const files = transform({
      ipcFiles: [imageFile('a.JPG'), imageFile('b.jpg')],
      format: 'same',
    })

    expect(files.map(file => file.newFilename)).toEqual(['same_1.JPG', 'same_2.jpg'])
  })

  it('pads duplicate sequences for ten or more files', () => {
    const files = transform({
      ipcFiles: Array.from({ length: 10 }, (_, index) => imageFile(`repeat-${index + 1}.jpg`)),
      format: 'same',
    })

    expect(files.map(file => file.newFilename)).toEqual([
      'same_01.jpg',
      'same_02.jpg',
      'same_03.jpg',
      'same_04.jpg',
      'same_05.jpg',
      'same_06.jpg',
      'same_07.jpg',
      'same_08.jpg',
      'same_09.jpg',
      'same_10.jpg',
    ])
  })

  it('counts strict-mode skipped originals when avoiding duplicate targets', () => {
    // Skipped files keep their original names, so renamed files must still avoid them.
    const files = transform({
      ipcFiles: [
        imageFile('target.jpg', { metadata: imageMetadata({ lens: null }) }),
        imageFile('z.jpg', { metadata: imageMetadata({ lens: 'target' }) }),
      ],
      strictMode: true,
      format: '{Lens}',
    })

    expect(files.map(file => file.newFilename)).toEqual(['target.jpg', 'target_1.jpg'])
    expect(files.map(file => file.shouldSkip)).toEqual([true, false])
  })

  it('marks files as skipped when the final preview matches the original filename', () => {
    const [file] = transform({
      ipcFiles: [imageFile('same.jpg')],
      format: '{Current}',
    })

    expect(file).toMatchObject({
      newFilename: 'same.jpg',
      shouldSkip: true,
    })
  })
})

describe('transformIPCFiles metadata status', () => {
  it('marks full metadata as success', () => {
    const [file] = transform({ ipcFiles: [imageFile('IMG_0001.JPG')] })

    expect(file.fileType).toBe('image')
    if (file.fileType === 'image') {
      expect(file.metadataStatus).toBe(MetadataStatus.SUCCESS)
      expect(file.metadataTips).toBe('')
    }
  })

  it('marks explicit metadata errors as errors', () => {
    const [file] = transform({
      ipcFiles: [imageFile('IMG_0001.HEIC', { metadata: null, metaError: 'Unknown image format' })],
    })

    expect(file.fileType).toBe('image')
    if (file.fileType === 'image') {
      expect(file.metadataStatus).toBe(MetadataStatus.ERROR)
      expect(file.metadataTips).toBe('t:errors.unknownImageFormat')
    }
  })

  it('marks null or partial metadata as warnings', () => {
    const files = transform({
      ipcFiles: [
        videoFile('missing.mov', { metadata: null }),
        imageFile('partial.jpg', { metadata: imageMetadata({ iso: null }) }),
      ],
    })

    expect(files.map(file => (file.fileType === 'other' ? null : file.metadataStatus))).toEqual([
      MetadataStatus.WARNING,
      MetadataStatus.WARNING,
    ])
    expect(files.map(file => (file.fileType === 'other' ? null : file.metadataTips))).toEqual([
      't:errors.missingMetadata',
      't:errors.missingMetadata',
    ])
  })
})
