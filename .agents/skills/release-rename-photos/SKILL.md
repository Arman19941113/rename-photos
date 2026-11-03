---
name: release-rename-photos
description: >-
  Prepare a Rename Photos release: select the version, write the changelog, and
  create the release commit and tag through the project script. Use only when
  explicitly invoked as $release-rename-photos or requested by name, not for
  ordinary changelog edits or CI publishing.
---

# Release Rename Photos

Run from the repository root. This skill owns version selection and changelog authoring; `pnpm release` ([release.mjs](../../../scripts/release.mjs)) owns version updates, validation, commits, and tags.

## Workflow

1. Inspect `git status --short` and fetch tags with `git fetch --tags origin` without force-updating existing tags. Resolve unrelated local changes with the user before creating the release commit; read-only planning can continue. Do not stage, stash, or discard unrelated changes.
2. Use the user's explicit version or `patch`/`minor`/`major` target without reconfirming it. If no target was supplied, run `pnpm release` to show the three version suggestions and wait for the user's selection; there is no default target.
3. Find the latest reachable tag with `git describe --tags --abbrev=0`. Inspect commits from that tag to `HEAD`, limited to `src-tauri` and `src`, including relevant diffs when needed. Summarize actual user-facing changes; skip release commits and details outside those directories.
4. Insert one nonempty top entry in `CHANGELOG.md` using `## [vX.Y.Z] - YYYY-MM-DD`. Follow existing section headings such as Added, Fixed, and Changed rather than copying commit subjects mechanically. Resolve a bump target to its exact version before writing the entry.
5. Once the target is selected and notes are ready, run the release entry point with that target. `--yes` uses the version authorization already given; no additional confirmation is needed. Use `--dry-run` if a preflight is useful.

```bash
pnpm release --yes 1.2.3
```

6. Report the created commit hash, tag, and changed files. Push only when authorized; otherwise provide the command for this specific tag:

```bash
git push origin refs/tags/v1.2.3
```

Push the release branch/commit only if separately authorized; never push all local tags.

## Script Constraints

- The version comes from `src-tauri/tauri.conf.json`. Exact targets (`1.2.3` or `v1.2.3`) and semantic bumps are supported; the result must be greater than the current version and its tag must not already exist.
- Before creating the release commit, only the prepared `CHANGELOG.md` may be dirty, with exactly one nonempty entry for the target version. The script validates notes through [extract-release-notes.mjs](../../../scripts/extract-release-notes.mjs).
- Invoking this skill authorizes the script to stage and commit only `CHANGELOG.md` and `src-tauri/tauri.conf.json` once the target is selected. It creates `release: x.y.z` and an annotated `vX.Y.Z` tag; it does not push.
- If the commit succeeds but tagging fails, inspect the commit and resolve the tag failure without rerunning the version bump or creating another release commit.

## CI Handoff

A new `v*` tag push triggers validation, a draft Release, platform builds, and publication after all builds succeed. Failed builds leave the Release in draft; rerun failed jobs. For CI details, Latest selection, and rerun behavior, consult the [desktop release workflow](../../../.github/workflows/publish-desktop-release.yml) and [github-release.mjs](../../../scripts/github-release.mjs).
