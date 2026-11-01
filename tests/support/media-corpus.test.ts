import { describe, expect, it } from 'vitest'
import { corpus, readMediaCorpus } from './media-corpus'

describe('shared media corpus contract', () => {
  it.each([
    { created: 'milliseconds' },
    { size: -1 },
    { pathname: null },
    { fileType: 'unknown' },
    { metadata: { date: 42 } },
    { metaError: undefined },
  ])('rejects malformed IPC data: %j', changes => {
    const fixture = corpus.files[0]
    expect(() =>
      readMediaCorpus({
        ...corpus,
        files: [{ ...fixture, input: { ...fixture.input, ...changes } }],
      }),
    ).toThrow()
  })

  it('rejects a missing expected filename', () => {
    expect(() =>
      readMediaCorpus({
        ...corpus,
        files: [{ ...corpus.files[0], expected: { strictSkip: false } }],
      }),
    ).toThrow()
  })
})
