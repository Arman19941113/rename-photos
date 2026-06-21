#!/usr/bin/env node
// Extracts the changelog section for a release version and exposes it to GitHub Actions.

import { appendFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')
const changelogPath = path.join(rootDir, 'CHANGELOG.md')
const tauriConfigPath = path.join(rootDir, 'src-tauri/tauri.conf.json')

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const version = normalizeVersion(options.version || (await readTauriVersion()))
  const notes = await extractReleaseNotes(version)

  if (options.output) {
    await writeFile(path.resolve(rootDir, options.output), notes + '\n')
  }

  if (options.githubOutputName) {
    await writeGithubOutput(options.githubOutputName, notes)
    return
  }

  console.log(notes)
}

function parseArgs(args) {
  const options = {
    version: '',
    output: '',
    githubOutputName: '',
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--version') {
      options.version = readArgValue(args, ++i, arg)
    } else if (arg === '--output') {
      options.output = readArgValue(args, ++i, arg)
    } else if (arg === '--github-output-name') {
      options.githubOutputName = readArgValue(args, ++i, arg)
    } else {
      fail(`Unknown argument: ${arg}`)
    }
  }

  return options
}

function readArgValue(args, index, name) {
  const value = args[index]
  if (!value) {
    fail(`${name} requires a value`)
  }
  return value
}

async function readTauriVersion() {
  const configText = await readFile(tauriConfigPath, 'utf8')
  const config = JSON.parse(configText)

  if (!config || typeof config.version !== 'string') {
    fail('src-tauri/tauri.conf.json must contain a string version field')
  }

  return config.version
}

function normalizeVersion(version) {
  return version.startsWith('v') ? version : `v${version}`
}

async function extractReleaseNotes(version) {
  const changelog = await readFile(changelogPath, 'utf8')
  const lines = changelog.split(/\r?\n/)
  const startIndex = lines.findIndex(line => line.startsWith(`## [${version}]`))

  if (startIndex === -1) {
    fail(`No CHANGELOG.md entry found for ${version}`)
  }

  const endIndex = lines.findIndex(
    (line, index) => index > startIndex && (line.startsWith('## [') || /^\[[^\]]+\]:/.test(line)),
  )
  return lines.slice(startIndex + 1, endIndex === -1 ? lines.length : endIndex).join('\n').trim()
}

async function writeGithubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT
  if (!outputPath) {
    fail('GITHUB_OUTPUT is not set')
  }

  const delimiter = `release_notes_${Date.now()}`
  await appendFile(outputPath, `${name}<<${delimiter}\n${value}\n${delimiter}\n`)
}

function fail(message) {
  throw new Error(message)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
