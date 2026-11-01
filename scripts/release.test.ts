import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { devNull, tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const releaseScript = path.resolve('scripts/release.mjs')
const versionFile = 'src-tauri/tauri.conf.json'
const gitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Release Test',
  GIT_AUTHOR_EMAIL: 'release-test@example.com',
  GIT_COMMITTER_NAME: 'Release Test',
  GIT_COMMITTER_EMAIL: 'release-test@example.com',
}

describe('project release entry point', () => {
  let repo: string

  beforeEach(() => {
    repo = mkdtempSync(path.join(tmpdir(), 'rename-photos-release-'))
    git(repo, 'init', '--quiet')
    git(repo, 'config', 'commit.gpgSign', 'false')
    git(repo, 'config', 'tag.gpgSign', 'false')
    git(repo, 'config', 'core.hooksPath', path.join(repo, '.git', 'disabled-hooks'))
    mkdirSync(path.join(repo, 'src-tauri'))
    writeFileSync(path.join(repo, versionFile), '{\n  "version": "1.0.0"\n}\n')
    writeFileSync(path.join(repo, 'CHANGELOG.md'), '## [v1.0.0] - 2026-01-01\n\nInitial release.\n')
    git(repo, 'add', '--', 'CHANGELOG.md', versionFile)
    git(repo, 'commit', '--quiet', '-m', 'Initial release')
    git(repo, 'tag', 'v1.0.0')
    writeFileSync(
      path.join(repo, 'CHANGELOG.md'),
      '## [v1.0.1] - 2026-01-02\n\nRelease changes.\n\n' + readFileSync(path.join(repo, 'CHANGELOG.md'), 'utf8'),
    )
  })

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true })
  })

  it('creates a release commit and annotated version tag', () => {
    const result = release(repo, '--yes', 'patch')

    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(readFileSync(path.join(repo, versionFile), 'utf8')).version).toBe('1.0.1')
    expect(git(repo, 'log', '-1', '--format=%s')).toBe('release: 1.0.1')
    expect(git(repo, 'rev-parse', 'v1.0.1^{commit}')).toBe(git(repo, 'rev-parse', 'HEAD'))
    expect(git(repo, 'cat-file', '-t', 'refs/tags/v1.0.1')).toBe('tag')
    expect(git(repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n')).toEqual([
      'CHANGELOG.md',
      versionFile,
    ])
    expect(git(repo, 'status', '--porcelain')).toBe('')
  })

  it.each([
    ['an existing tag', 'patch', (repo: string) => git(repo, 'tag', 'v1.0.1'), 'already exists'],
    ['a lower version', '0.9.9', undefined, 'must be greater'],
    ['the current version', '1.0.0', undefined, 'must be greater'],
    [
      'missing release notes',
      'patch',
      (repo: string) => writeFileSync(path.join(repo, 'CHANGELOG.md'), '## [v1.0.0]\n\nChanged old notes.\n'),
      'No CHANGELOG.md entry found',
    ],
    [
      'unrelated changes',
      'patch',
      (repo: string) => writeFileSync(path.join(repo, 'unrelated.txt'), 'Keep this change.\n'),
      'Working tree contains changes outside the prepared release files',
    ],
  ] as const)('rejects %s without modifying the repository', (_scenario, target, prepare, error) => {
    prepare?.(repo)
    const before = repositoryState(repo)

    const result = release(repo, '--yes', target)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(error)
    expect(repositoryState(repo)).toEqual(before)
  })

  it('validates an exact version in dry-run mode without modifying the repository', () => {
    const before = repositoryState(repo)

    const result = release(repo, '--dry-run', '1.0.1')

    expect(result.status, result.stderr).toBe(0)
    expect(repositoryState(repo)).toEqual(before)
  })
})

function release(repo: string, ...args: string[]) {
  return spawnSync(process.execPath, [releaseScript, '--repo', repo, ...args], {
    encoding: 'utf8',
    env: gitEnv,
  })
}

function repositoryState(repo: string) {
  return {
    head: git(repo, 'rev-parse', 'HEAD'),
    tags: git(repo, 'tag', '--list'),
    status: git(repo, 'status', '--porcelain'),
    files: Object.fromEntries(
      git(repo, 'ls-files', '--cached', '--others', '--exclude-standard')
        .split('\n')
        .map(file => [file, readFileSync(path.join(repo, file), 'utf8')]),
    ),
  }
}

function git(repo: string, ...args: string[]) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', env: gitEnv })
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}
