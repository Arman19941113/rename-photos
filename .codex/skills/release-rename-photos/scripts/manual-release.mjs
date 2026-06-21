#!/usr/bin/env node
// Prepare a release commit after the AI-authored changelog has been updated.

import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const validBumpTypes = new Set(['major', 'minor', 'patch'])

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const repo = path.resolve(options.repo || process.cwd())
  const tauriConfigRelativePath = options.versionFile || 'src-tauri/tauri.conf.json'
  const changelogRelativePath = options.changelog || 'CHANGELOG.md'
  const tauriConfigPath = path.join(repo, tauriConfigRelativePath)

  ensureGitRepo(repo)

  const config = await readTauriConfig(tauriConfigPath, tauriConfigRelativePath)
  const latestTag = getLatestTag(repo)

  if (!options.target) {
    printVersionSuggestions({ repo, currentVersion: config.version, latestTag })
    return
  }

  const targetVersion = resolveNextVersion(config.version, options.target)

  printReleasePlan({
    repo,
    currentVersion: config.version,
    targetVersion,
    latestTag,
    changedFiles: [changelogRelativePath, tauriConfigRelativePath],
  })

  if (options.dryRun) return

  ensureOnlyAllowedPreexistingChanges(repo, [changelogRelativePath])
  ensureFileHasChanges(repo, changelogRelativePath)

  if (!options.yes) {
    await confirm(`Proceed with release ${targetVersion}? [y/N] `)
  }

  await writeFile(tauriConfigPath, replaceConfigVersion(config.text, targetVersion))

  runGit(repo, ['add', '--', tauriConfigRelativePath, changelogRelativePath])
  runGit(repo, ['commit', '-m', `release: ${targetVersion}`, '--', tauriConfigRelativePath, changelogRelativePath])

  const commitHash = runGit(repo, ['rev-parse', '--short', 'HEAD'], { capture: true }).trim()
  console.log(`Created release commit ${commitHash} for ${targetVersion}`)
}

function parseArgs(args) {
  const options = {
    repo: '',
    versionFile: '',
    changelog: '',
    target: '',
    dryRun: false,
    yes: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--repo') {
      options.repo = readArgValue(args, ++i, arg)
    } else if (arg === '--version-file') {
      options.versionFile = readArgValue(args, ++i, arg)
    } else if (arg === '--changelog') {
      options.changelog = readArgValue(args, ++i, arg)
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--yes') {
      options.yes = true
    } else if (arg.startsWith('--')) {
      fail(`Unknown option: ${arg}`)
    } else if (!options.target) {
      options.target = arg
    } else {
      fail(`Unexpected argument: ${arg}`)
    }
  }

  return options
}

function readArgValue(args, index, name) {
  const value = args[index]
  if (!value) fail(`${name} requires a value`)
  return value
}

function ensureGitRepo(repo) {
  runGit(repo, ['rev-parse', '--is-inside-work-tree'], { capture: true })
}

function ensureOnlyAllowedPreexistingChanges(repo, allowedPaths) {
  const allowed = new Set(allowedPaths)
  const entries = getStatusEntries(repo)
  const unexpected = entries.filter(entry => !allowed.has(entry.path))

  if (unexpected.length) {
    fail(
      [
        'Working tree contains changes outside the prepared release files.',
        'Commit, stash, or revert them before releasing.',
        ...unexpected.map(entry => `${entry.status} ${entry.path}`),
      ].join('\n'),
    )
  }
}

function ensureFileHasChanges(repo, filePath) {
  const hasChanges = getStatusEntries(repo).some(entry => entry.path === filePath)
  if (!hasChanges) {
    fail(`${filePath} must be updated before running the release commit script.`)
  }
}

async function readTauriConfig(configPath, relativePath) {
  const text = await readFile(configPath, 'utf8')
  const config = JSON.parse(text)
  if (!config || typeof config.version !== 'string') {
    fail(`${relativePath} must contain a string version field`)
  }
  return { text, version: config.version }
}

function getLatestTag(repo) {
  const tag = runGit(repo, ['describe', '--tags', '--abbrev=0'], { capture: true }).trim()
  if (!tag) fail('No git tag found. Create an initial tag before releasing.')
  return tag
}

function resolveNextVersion(currentVersion, releaseTarget) {
  const current = parseVersion(currentVersion)

  if (validBumpTypes.has(releaseTarget)) {
    return formatVersion(bumpVersion(current, releaseTarget))
  }

  return formatVersion(parseVersion(releaseTarget))
}

function bumpVersion(version, bumpType) {
  if (bumpType === 'major') {
    return { major: version.major + 1, minor: 0, patch: 0 }
  }

  if (bumpType === 'minor') {
    return { major: version.major, minor: version.minor + 1, patch: 0 }
  }

  return { major: version.major, minor: version.minor, patch: version.patch + 1 }
}

function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    fail(`Invalid version "${version}". Expected x.y.z, major, minor, or patch.`)
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`
}

function replaceConfigVersion(configText, nextVersion) {
  const nextConfigText = configText.replace(/("version"\s*:\s*")[^"]+(")/, `$1${nextVersion}$2`)
  if (nextConfigText === configText) {
    fail('Unable to update version in Tauri config')
  }
  return nextConfigText
}

function printVersionSuggestions({ repo, currentVersion, latestTag }) {
  const current = parseVersion(currentVersion)
  const suggestions = ['patch', 'minor', 'major'].map(type => ({
    type,
    version: formatVersion(bumpVersion(current, type)),
  }))

  console.log(`Repository: ${repo}`)
  console.log(`Current version: ${currentVersion}`)
  console.log(`Previous tag: ${latestTag}`)
  console.log('Version suggestions:')
  for (const suggestion of suggestions) {
    console.log(`- ${suggestion.type}: ${suggestion.version}`)
  }
  console.log('')
  console.log('Choose one version before running the release commit.')
}

function printReleasePlan({ repo, currentVersion, targetVersion, latestTag, changedFiles }) {
  console.log(`Repository: ${repo}`)
  console.log(`Current version: ${currentVersion}`)
  console.log(`Next version: ${targetVersion}`)
  console.log(`Previous tag: ${latestTag}`)
  console.log('Files to stage and commit:')
  for (const file of changedFiles) {
    console.log(`- ${file}`)
  }
  console.log('')
  console.log('CHANGELOG.md must already contain AI-authored release notes for src-tauri and src changes.')
  console.log('')
}

async function confirm(question) {
  if (!process.stdin.isTTY) {
    fail('Refusing to continue without --yes because stdin is not interactive')
  }

  const rl = createInterface({ input, output })
  const answer = await rl.question(question)
  rl.close()

  if (!/^y(es)?$/i.test(answer.trim())) {
    fail('Release cancelled')
  }
}

function runGit(repo, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })

  if (result.status !== 0) {
    const message = result.stderr?.trim() || `git ${args.join(' ')} failed`
    fail(message)
  }

  return result.stdout ?? ''
}

function getStatusEntries(repo) {
  const status = runGit(repo, ['status', '--porcelain=v1'], { capture: true })
  return status
    .split('\n')
    .filter(Boolean)
    .map(line => ({
      status: line.slice(0, 2),
      path: parseStatusPath(line.slice(3)),
    }))
}

function parseStatusPath(pathText) {
  const renamedPath = pathText.includes(' -> ') ? pathText.split(' -> ').at(-1) : pathText
  return renamedPath.replace(/^"|"$/g, '')
}

function fail(message) {
  throw new Error(message)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
