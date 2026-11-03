# Icons

This document covers icon sources and generated resources. See the [development guide](README.md) for dependency installation and other development tasks.

## Sources

The editable desktop master is [assets/icon/app-icon.svg](../assets/icon/app-icon.svg), a 1024 × 1024 vector with a sun-and-mountain symbol in deep plum `#7E1552` and coral `#FA514E`, on a white tile with transparent outer padding.

The landing page uses [web/src/app/icon.svg](../web/src/app/icon.svg) with the same symbol and no white tile. It is maintained separately; keep its paths and colors in sync with the desktop master.

## Regenerate desktop resources

After installing dependencies, run from the repository root:

```sh
pnpm icons:generate
```

The script in [package.json](../package.json) runs the project's Tauri CLI against the SVG master. It writes platform resources to [src-tauri/icons/](../src-tauri/icons):

- macOS: `icon.icns`, including 16–1024 px representations.
- Windows: `icon.ico` and AppX logo PNGs.
- Linux: `32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, and `icon.png`.
- Android and iOS: platform resource subdirectories.

Keep the SVG master and generated resources together in a change. [Tauri configuration](../src-tauri/tauri.conf.json) references the desktop icon filenames, and app builds bundle those resources.
