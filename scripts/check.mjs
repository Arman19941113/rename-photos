#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

function main() {
  const scope = process.argv[2] ?? 'all'
  if (!['all', 'frontend', 'rust'].includes(scope) || process.argv.length > 3) {
    console.error('Usage: node scripts/check.mjs [all|frontend|rust]')
    process.exit(1)
  }

  if (scope === 'all' || scope === 'frontend') {
    run('pnpm', ['typecheck'])
    run('pnpm', ['lint'])
    run('pnpm', ['test'])
  }

  if (scope === 'all' || scope === 'rust') {
    run('rustc', ['--version'])
    run('cargo', ['clippy', '--version'])
    run('cargo', ['fmt', '--manifest-path', 'src-tauri/Cargo.toml', '--all', '--', '--check'])
    run('cargo', ['clippy', '--locked', '--manifest-path', 'src-tauri/Cargo.toml', '--all-targets', '--', '-D', 'warnings'])
    run('cargo', ['test', '--locked', '--manifest-path', 'src-tauri/Cargo.toml'])
  }
}

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) {
    console.error(result.error.message)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

main()
