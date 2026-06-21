---
name: release rename photos
description: Manual release workflow for Rename Photos repositories that need explicit version confirmation, an AI-authored changelog generated from src-tauri and src commits since the latest git tag, a Tauri version file update, and an automatic release commit. Use only when the user explicitly invokes `$release rename photos` or asks to run this manual release skill; do not use for ordinary changelog edits, package scripts, or automatic CI release publishing.
---

# Manual Release

## Overview

Use this skill to prepare a local release commit from the current repository state. The AI chooses and confirms the release version with the user, writes the release notes in `CHANGELOG.md` from `src-tauri` and `src` commit history since the latest reachable tag, and then runs the bundled script to update the Tauri app version and create the release commit.

Do not call a project-level package script such as `pnpm release` or `npm run release`. Run the bundled script directly.

## Workflow

1. Inspect the repository state with `git status --short`.
   - If unrelated user changes are present, stop and ask how to proceed.
   - If the release should include local uncommitted changes, ask the user to confirm before staging them.
2. Determine the target version.
   - If the user already gave an exact version or a target of `patch`, `minor`, or `major`, use that target after confirming it is intentional.
   - If the user did not specify a target, run the bundled script without a target to print the three legal semantic-version suggestions:

```bash
node .codex/skills/release-rename-photos/scripts/manual-release.mjs --repo /path/to/repo
```

   - Present the three options to the user and wait for confirmation before proceeding.
3. Generate the changelog entry yourself from commits that touched `src-tauri` or `src` between the latest reachable git tag and `HEAD`:

```bash
git describe --tags --abbrev=0
git log --reverse --format='%h %s%n%b' latest-tag..HEAD -- src-tauri src
```

   - Skip release commits such as `release: 1.2.3`.
   - Ignore commits and details that only changed files outside `src-tauri` and `src`.
   - Summarize the actual user-facing changes rather than mechanically copying every commit subject.
   - Update `CHANGELOG.md` by inserting a new top entry:

```markdown
## [v1.2.3] - YYYY-MM-DD
```

4. Run the release script only after the target version is confirmed and `CHANGELOG.md` has been updated. Use an interactive TTY for the script prompt, or pass `--yes` only after the version is confirmed:

```bash
node .codex/skills/release-rename-photos/scripts/manual-release.mjs --repo /path/to/repo --yes 1.2.3
```

5. Report the created commit hash and changed files.

## Version Targets

The release target can be:

- `patch`, `minor`, or `major`.
- An exact version such as `1.2.3` or `v1.2.3`.

When no target is provided, the script does not default to `patch`. It prints the three valid semantic-version suggestions for the current version and exits.

The script reads the current version from `src-tauri/tauri.conf.json` and writes the normalized `x.y.z` value back to that file.

## Changelog Rules

The AI, not the script, updates `CHANGELOG.md`. Use the most recent reachable git tag as the previous release boundary and summarize only commits in `latest-tag..HEAD` that touched `src-tauri` or `src`.

Recommended grouping:

- `feat` -> `Added`
- `fix` -> `Fixed`
- `perf`, `refactor`, `style` -> `Changed`
- `docs` -> `Documentation`
- `test` -> `Tests`
- `build`, `ci`, `chore` -> `Maintenance`
- Other commits -> the most accurate section for the actual change

Do not include entries that only describe the release process itself, such as `release: 1.2.3`.

## Git Behavior

The script requires `CHANGELOG.md` to already have local changes before it creates the release commit. It refuses to continue if files other than `CHANGELOG.md` are dirty before the script updates the version file.

After updating the version, it stages only:

- `CHANGELOG.md`
- `src-tauri/tauri.conf.json`

It commits with:

```text
release: x.y.z
```

It does not create a git tag and does not push.
