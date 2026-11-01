import { MetadataStatus } from '@/const'
import { describe, expect, it } from 'vitest'
import { corpus } from '../../tests/support/media-corpus'
import { transformIPCFiles } from './file-transformer'

describe('rename previews from real media metadata', () => {
  it.each(corpus.files)('matches normal and strict previews for $input.filename', ({ input, expected }) => {
    const file = preview().find(file => file.filename === input.filename)!

    expect(file.newFilename).toBe(expected.newFilename)
    expect(file.shouldSkip).toBe(false)
    if (file.fileType !== 'other') {
      expect(file.metadataStatus).toBe(
        expected.metadataStatus === null
          ? null
          : {
              success: MetadataStatus.SUCCESS,
              warning: MetadataStatus.WARNING,
              error: MetadataStatus.ERROR,
            }[expected.metadataStatus],
      )
    }
    const strictFile = preview(true).find(file => file.filename === input.filename)!

    expect(strictFile.shouldSkip).toBe(expected.strictSkip)
    expect(strictFile.newFilename).toBe(expected.strictSkip ? input.filename : expected.newFilename)
  })
})

function preview(strictMode = false) {
  return transformIPCFiles({
    ipcFiles: corpus.files.map(({ input }) => ({ ...input })),
    strictMode,
    useCreatedDate: false,
    format: corpus.format,
    t: (key: string) => key,
  })
}
