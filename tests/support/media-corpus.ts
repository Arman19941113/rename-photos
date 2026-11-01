import type { ImageMetadata, IPCFile, VideoMetadata } from '../../src/types/file'
import rawCorpus from '../fixtures/real-media.json'

type MediaCorpus = {
  format: string
  files: {
    input: IPCFile
    expected: { newFilename: string; strictSkip: boolean; metadataStatus: 'success' | 'warning' | 'error' | null }
    sourceSize: number
  }[]
}

export function readMediaCorpus(value: unknown): MediaCorpus {
  assertMediaCorpus(value)
  return value
}

function assertMediaCorpus(value: unknown): asserts value is MediaCorpus {
  assert(isRecord(value) && typeof value.format === 'string' && Array.isArray(value.files), 'Invalid media corpus')
  assert(value.files.length > 0, 'Media corpus must not be empty')
  for (const fixture of value.files) {
    assert(isRecord(fixture) && isRecord(fixture.input) && isRecord(fixture.expected), 'Invalid media fixture')
    const { input, expected } = fixture
    assert(typeof input.pathname === 'string' && typeof input.filename === 'string', 'Invalid IPC path or filename')
    assert(isNonnegativeInteger(input.created) && isNonnegativeInteger(input.size), 'Invalid IPC timestamp or size')
    assert(isNonnegativeInteger(fixture.sourceSize), 'Invalid source size')
    assert(typeof expected.newFilename === 'string' && typeof expected.strictSkip === 'boolean', 'Invalid preview')
    if (input.fileType === 'image' || input.fileType === 'video') {
      assert(input.metaError === null || typeof input.metaError === 'string', 'Invalid metadata error')
      const fields = input.fileType === 'image' ? imageFields : videoFields
      const metadata = input.metadata
      assert(metadata === null || isRecord(metadata), 'Invalid metadata')
      if (metadata !== null) {
        for (const field of Object.keys(fields)) {
          assert(metadata[field] === null || typeof metadata[field] === 'string', `Invalid metadata field: ${field}`)
        }
      }
      assert(
        expected.metadataStatus === 'success' ||
          expected.metadataStatus === 'warning' ||
          expected.metadataStatus === 'error',
        'Invalid metadata status',
      )
    } else {
      assert(input.fileType === 'other' && expected.metadataStatus === null, 'Invalid file type or status')
    }
  }
}

const imageFields = {
  date: true,
  make: true,
  camera: true,
  lens: true,
  focalLength: true,
  aperture: true,
  shutter: true,
  iso: true,
} satisfies Record<keyof ImageMetadata, boolean>

const videoFields = { date: true, make: true, camera: true } satisfies Record<keyof VideoMetadata, boolean>

export const corpus = readMediaCorpus(rawCorpus)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
