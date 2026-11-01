import { describe, expect, it } from 'vitest'
import { extractReleaseNotes } from './extract-release-notes.mjs'

describe('extractReleaseNotes', () => {
  it('extracts each version without including adjacent releases or reference links', () => {
    const changelog = [
      '# Changelog',
      '',
      '## [v1.2.3] - 2026-01-02',
      '',
      '### Fixed',
      '',
      '- Release fix.',
      '',
      '## [v1.2.2] - 2026-01-01',
      '',
      '- Old fix.',
      '',
      '[v1.2.2]: https://example.com',
    ].join('\r\n')

    expect(extractReleaseNotes(changelog, '1.2.3')).toBe('### Fixed\n\n- Release fix.')
    expect(extractReleaseNotes(changelog, 'v1.2.2')).toBe('- Old fix.')
  })

  it.each([
    ['missing', '## [v1.2.2]\n\nOld notes.\n'],
    ['empty', '## [v1.2.3]\n\n## [v1.2.2]\n\nOld notes.\n'],
    ['duplicate', '## [v1.2.3]\n\nOne.\n\n## [v1.2.3]\n\nTwo.\n'],
  ])('rejects %s release notes', (_scenario, changelog) => {
    expect(() => extractReleaseNotes(changelog, 'v1.2.3')).toThrow()
  })
})
