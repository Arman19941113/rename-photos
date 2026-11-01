export async function prepareDraftRelease({ github, repo, tag, commit, body }) {
  const releases = await github.paginate(github.rest.repos.listReleases, { ...repo, per_page: 100 })
  const release = releases.find(candidate => candidate.tag_name === tag)

  const details = {
    ...repo,
    tag_name: tag,
    name: `Rename Photos ${tag}`,
    body,
    draft: true,
    prerelease: false,
  }

  if (release) {
    ensureReleaseTag(release, tag)
    if (!release.draft) {
      throw new Error(`Release ${tag} is already published; refusing to modify its assets`)
    }
    return (await github.rest.repos.updateRelease({ ...details, release_id: release.id })).data
  }

  return (await github.rest.repos.createRelease({ ...details, target_commitish: commit })).data
}

export async function publishRelease({ github, repo, tag, releaseId }) {
  const id = Number(releaseId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('A valid release ID is required before publishing')
  }

  const release = (await github.rest.repos.getRelease({ ...repo, release_id: id })).data
  ensureReleaseTag(release, tag)
  if (!release.draft) return release
  if (!release.assets.length) {
    throw new Error(`Release ${tag} has no assets; refusing to publish`)
  }

  const version = parseStableVersion(tag)
  if (!version) {
    throw new Error(`Release tag ${tag} must use a stable x.y.z version`)
  }

  // Read published versions while the final job holds its shared publication lock.
  const releases = await github.paginate(github.rest.repos.listReleases, { ...repo, per_page: 100 })
  const publishedVersions = releases
    .filter(release => !release.draft && !release.prerelease)
    .map(release => parseStableVersion(release.tag_name))
    .filter(version => version !== null)
  const makeLatest = publishedVersions.every(previous => compareVersions(version, previous) > 0)

  return (
    await github.rest.repos.updateRelease({
      ...repo,
      release_id: id,
      draft: false,
      make_latest: makeLatest ? 'true' : 'false',
    })
  ).data
}

function ensureReleaseTag(release, tag) {
  if (release.tag_name !== tag) {
    throw new Error(`Release tag ${release.tag_name} does not match ${tag}`)
  }
}

function parseStableVersion(tag) {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag)
  return match ? match.slice(1).map(part => BigInt(part)) : null
}

function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1
  }
  return 0
}
