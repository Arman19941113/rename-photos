# Development guide

Start here for local setup. Read the topic relevant to the change rather than loading every implementation detail.

## Read by task

| Task                                                                                   | Document                           |
| -------------------------------------------------------------------------------------- | ---------------------------------- |
| Change file loading, naming previews, settings, or rename execution                    | [Core logic](core-logic.md)        |
| Change classification, metadata fields, date/value formatting, or TIFF/RAW/RW2 parsing | [Metadata extraction](metadata.md) |
| Run checks, change tests or CI, or work with media fixtures                            | [Testing and fixtures](testing.md) |
| Change app or website icons and regenerate resources                                   | [Icons](icons.md)                  |

Each topic owns its detailed behavior. Other documents link to that topic. Agent work rules and the source entry-point map are in [AGENTS.md](../AGENTS.md).

## Project layout

| Location                     | Responsibility                                                               |
| ---------------------------- | ---------------------------------------------------------------------------- |
| [`src/`](../src)             | Desktop frontend: React, Vite, TypeScript, Tailwind, and HeroUI              |
| [`src-tauri/`](../src-tauri) | Desktop backend and packaging: Rust and Tauri                                |
| [`web/`](../web)             | Independent Next.js landing page, with its own package manifest and lockfile |
| [`tests/`](../tests)         | Shared media fixtures and frontend test support                              |
| [`scripts/`](../scripts)     | Release preparation and fixture-generation tools                             |
| [`assets/`](../assets)       | Editable assets and README images                                            |

The frontend/backend runtime boundary and IPC contracts are described in [core logic](core-logic.md#runtime-structure).

## Local setup

- Use the Node.js and pnpm versions specified by `engines` and `devEngines.packageManager` in [package.json](../package.json). [.node-version](../.node-version) selects Node.js for compatible version managers. Install pnpm separately if your Node distribution does not include Corepack.
- Desktop development also needs Rustup and the platform's native Tauri build dependencies. [rust-toolchain.toml](../rust-toolchain.toml) pins the Rust version and components for local development and CI; Rustup installs them on first use. [CI setup](../.github/workflows/test.yml) lists the Linux system packages.
- Dependency requirements are defined in the package manifests; lockfiles record the resolved versions. Keep both pnpm lockfiles and Cargo.lock checked in, and use frozen/locked installs in CI. Use the user-level pnpm store rather than a store inside the repository.

Development builds require macOS 13.3 or later. The frontend and website target Safari 16.4+, Chrome/Edge 111+, and Firefox 128+; Windows and Linux need a corresponding modern WebView.

Install desktop frontend dependencies from the repository root:

```sh
pnpm install --frozen-lockfile
```

## Run and build the desktop app

Run commands from the repository root:

| Purpose                                            | Command            |
| -------------------------------------------------- | ------------------ |
| Start the desktop app with its frontend dev server | `pnpm tauri dev`   |
| Build the desktop app and platform bundles         | `pnpm tauri build` |
| Start the Vite frontend alone                      | `pnpm dev`         |
| Build frontend assets alone                        | `pnpm build`       |

[Tauri configuration](../src-tauri/tauri.conf.json) starts or builds the frontend through its `beforeDevCommand` and `beforeBuildCommand`. The standalone Vite server does not provide the desktop app's native commands.

Check commands and their coverage are maintained in [testing](testing.md#checks).

## Work on the landing page

The website is installed and run separately:

```sh
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Its scripts are defined in [web/package.json](../web/package.json), including independent `typecheck` and `lint` checks. The [website workflow](../.github/workflows/deploy-web-pages.yml) builds its static export for GitHub Pages. The website keeps its own dependency manifest, pnpm settings, and lockfile; installing the desktop project is not required to build it.

## Prepare a desktop release

`pnpm release` displays version suggestions. Preparing a selected version requires release notes in [CHANGELOG.md](../CHANGELOG.md) and creates a release commit and tag. Pushing the release tag triggers the [desktop release workflow](../.github/workflows/publish-desktop-release.yml). See [the release script](../scripts/release.mjs) for arguments and working-tree requirements.

Tests and platform builds run in parallel; the release stays in draft until all checks and builds succeed.
