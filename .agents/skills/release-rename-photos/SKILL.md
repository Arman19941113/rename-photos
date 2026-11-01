---
name: release-rename-photos
description: >-
  Repository-specific release workflow for Rename Photos: confirm the version,
  write the changelog from src-tauri and src commits since the latest tag, and
  invoke the project release entry point to update the app version and create a
  release commit and tag. Use only when the user explicitly invokes
  `$release-rename-photos` or asks to run this release skill; do not use for
  ordinary changelog edits or automatic CI release publishing.
---

# Release Rename Photos

## Overview

This skill is specific to the Rename Photos repository. The AI chooses and confirms the release version with the user, writes the release notes in `CHANGELOG.md` from `src-tauri` and `src` commit history since the latest reachable tag, and then invokes the project release entry point. The project script updates the Tauri app version, creates the release commit, and tags it with an annotated `vX.Y.Z` tag. Pushing the tag triggers CI to build and publish GitHub Release assets.

Run release commands from the repository root through `pnpm release`, which executes `scripts/release.mjs`. Release execution and validation belong to the project; this skill owns version confirmation, changelog authoring, and workflow coordination.

## Workflow

1. Inspect the repository state with `git status --short`.
   - If unrelated user changes are present, stop and ask how to proceed.
   - If the release should include local uncommitted changes, ask the user to confirm before staging them.
   - Fetch tags with `git fetch --tags origin` before choosing a version so the release boundary and duplicate-tag check include remote tags. Do not force-update existing tags.
2. Determine the target version.
   - If the user already gave an exact version or a target of `patch`, `minor`, or `major`, use that target after confirming it is intentional.
   - If the user did not specify a target, run the project entry point without a target to print the three legal semantic-version suggestions:

```bash
pnpm release
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

4. Run the project release entry point only after the target version is confirmed and `CHANGELOG.md` has been updated. Use an interactive TTY for the script prompt, or pass `--yes` only after the version is confirmed:

```bash
pnpm release --yes 1.2.3
```

5. Report the created commit hash, tag, and changed files. The script does not push. Unless the user has authorized pushing, provide the command to publish this specific tag:

```bash
git push origin refs/tags/v1.2.3
```

   - Push only the selected release tag, not all local tags. Push the release branch/commit too only if authorized.
   - If tagging fails after the commit was created, inspect that commit and fix the tag creation failure; do not rerun the version bump or create another release commit.

## Version Targets

The release target can be:

- `patch`, `minor`, or `major`.
- An exact version such as `1.2.3` or `v1.2.3`.

The target version must be greater than the current app version. Equal or lower versions are rejected before any files are changed.

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

The project script `scripts/release.mjs` requires `CHANGELOG.md` to already have local changes and exactly one nonempty entry for the target version before it creates the release commit. It shares the release-note parser in `scripts/extract-release-notes.mjs` with CI. It refuses to continue if the target `vX.Y.Z` tag already exists locally, or if files other than `CHANGELOG.md` are dirty before the script updates the version file. `pnpm release --dry-run 1.2.3` performs these checks without changing files, committing, or tagging.

After updating the version, it stages only:

- `CHANGELOG.md`
- `src-tauri/tauri.conf.json`

It commits with:

```text
release: x.y.z
```

After committing, it creates an annotated `vX.Y.Z` tag on the new release commit. It does not push.

## CI Publishing

`.github/workflows/publish-desktop-release.yml` publishes when a new `v*` tag is pushed:

1. Verify the tag matches the Tauri version and validate the matching changelog entry.
2. Run frontend/release tests, TypeScript checks, and Rust tests.
3. Create a draft GitHub Release, or reuse an existing draft for that tag.
4. Build all four platform targets and upload their assets to that same draft.
5. Publish the Release only after every build succeeds, through the `production` environment. Final publication jobs share a repository-wide concurrency group and queue across tags while builds can run in parallel.

Inside the final publication job, CI compares the target version with all published stable releases using numeric major/minor/patch ordering. Drafts, prereleases, and tags outside the stable `x.y.z`/`vX.Y.Z` format are excluded from the comparison. The first stable release, or a version greater than every published stable version, becomes Latest. An older or equal version is published without changing Latest, so a slower older build cannot replace a newer release as Latest.

If a build fails, the Release stays in draft. Rerun failed CI jobs to finish uploading; a full rerun also reuses the draft. A full rerun against an already published Release stops before asset upload. The application does not use the updater; CI disables updater JSON generation and does not require updater signing secrets.

Branch pushes do not trigger release publishing. CI uses the pushed tag; this skill creates it before CI runs.
