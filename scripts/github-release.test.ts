import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareDraftRelease, publishRelease } from './github-release.mjs'

const repo = { owner: 'example', repo: 'rename-photos' }
const tag = 'v1.2.3'
const draft = { id: 123, tag_name: tag, draft: true, assets: [{ name: 'app.dmg' }] }
const github = {
  paginate: vi.fn(),
  rest: {
    repos: {
      listReleases: vi.fn(),
      getRelease: vi.fn(),
      createRelease: vi.fn(),
      updateRelease: vi.fn(),
    },
  },
}
const preparation = { github, repo, tag, commit: 'abc123', body: 'Release notes.' }
const publication = { github, repo, tag, releaseId: String(draft.id) }

beforeEach(() => {
  vi.resetAllMocks()
  github.paginate.mockResolvedValue([])
  github.rest.repos.getRelease.mockResolvedValue({ data: draft })
  github.rest.repos.createRelease.mockResolvedValue({ data: draft })
  github.rest.repos.updateRelease.mockImplementation(async changes => ({ data: { ...draft, ...changes } }))
})

describe('prepareDraftRelease', () => {
  it('creates a draft with the target tag and release notes', async () => {
    const result = await prepareDraftRelease(preparation)

    expect(result.id).toBe(draft.id)
    expect(github.rest.repos.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({ tag_name: tag, draft: true, body: preparation.body }),
    )
  })

  it('reuses the matching draft when a workflow is rerun', async () => {
    github.paginate.mockResolvedValue([{ ...draft, id: 122, tag_name: 'v1.2.2' }, draft])

    await prepareDraftRelease(preparation)

    expect(github.rest.repos.updateRelease).toHaveBeenCalledWith(
      expect.objectContaining({ release_id: draft.id, draft: true }),
    )
    expect(github.rest.repos.createRelease).not.toHaveBeenCalled()
  })

  it('refuses to modify an already published release', async () => {
    github.paginate.mockResolvedValue([{ ...draft, draft: false }])

    await expect(prepareDraftRelease(preparation)).rejects.toThrow()

    expect(github.rest.repos.updateRelease).not.toHaveBeenCalled()
    expect(github.rest.repos.createRelease).not.toHaveBeenCalled()
  })
})

describe('publishRelease', () => {
  it.each([[['v1.2.9', 'v1.2.10']], [['v1.2.10', 'v1.2.9']]])(
    'keeps the highest version as Latest for publication order %j',
    async order => {
      const releases = order.map((releaseTag, index) => ({ ...draft, id: index + 1, tag_name: releaseTag }))
      let latest = ''
      github.paginate.mockImplementation(async () => releases)
      github.rest.repos.getRelease.mockImplementation(async ({ release_id }) => ({
        data: releases.find(release => release.id === release_id),
      }))
      github.rest.repos.updateRelease.mockImplementation(async ({ release_id, make_latest }) => {
        const release = releases.find(release => release.id === release_id)!
        release.draft = false
        if (make_latest !== 'false') latest = release.tag_name
        return { data: release }
      })

      for (const release of releases) {
        await publishRelease({ ...publication, tag: release.tag_name, releaseId: String(release.id) })
      }

      expect(latest).toBe('v1.2.10')
      expect(releases.every(release => !release.draft)).toBe(true)
    },
  )

  it('ignores drafts, prereleases, and non-version tags when promoting a new major version', async () => {
    github.rest.repos.getRelease.mockResolvedValue({ data: { ...draft, tag_name: 'v2.0.0' } })
    github.paginate.mockResolvedValue([
      { ...draft, tag_name: 'v99.0.0' },
      { ...draft, tag_name: 'v50.0.0', draft: false, prerelease: true },
      { ...draft, tag_name: 'nightly', draft: false },
      { ...draft, tag_name: 'v1.99.99', draft: false },
    ])

    await publishRelease({ ...publication, tag: 'v2.0.0' })

    expect(github.rest.repos.updateRelease).toHaveBeenCalledWith(
      expect.objectContaining({ draft: false, make_latest: 'true' }),
    )
  })

  it('checks all published versions using numeric minor version ordering', async () => {
    github.rest.repos.getRelease.mockResolvedValue({ data: { ...draft, tag_name: 'v1.9.99' } })
    github.paginate.mockResolvedValue([
      { ...draft, tag_name: 'v1.8.100', draft: false },
      { ...draft, tag_name: 'v1.10.0', draft: false },
      { ...draft, tag_name: 'v1.2.2', draft: false },
    ])

    await publishRelease({ ...publication, tag: 'v1.9.99' })

    expect(github.rest.repos.updateRelease).toHaveBeenCalledWith(
      expect.objectContaining({ draft: false, make_latest: 'false' }),
    )
  })

  it.each([
    ['without assets', { assets: [] }],
    ['for another tag', { tag_name: 'v1.2.2' }],
  ] as const)('refuses to publish a release %s', async (_scenario, changes) => {
    github.rest.repos.getRelease.mockResolvedValue({ data: { ...draft, ...changes } })

    await expect(publishRelease(publication)).rejects.toThrow()

    expect(github.rest.repos.updateRelease).not.toHaveBeenCalled()
  })

  it('does not publish when existing release versions cannot be read', async () => {
    const error = new Error('Release listing unavailable')
    github.paginate.mockRejectedValue(error)

    await expect(publishRelease(publication)).rejects.toBe(error)

    expect(github.rest.repos.updateRelease).not.toHaveBeenCalled()
  })

  it('leaves an already published release unchanged on retry', async () => {
    github.rest.repos.getRelease.mockResolvedValue({ data: { ...draft, draft: false } })

    const result = await publishRelease(publication)

    expect(result.draft).toBe(false)
    expect(github.rest.repos.updateRelease).not.toHaveBeenCalled()
  })
})
