# App icon resources

`app-icon.svg` is the editable 1024 × 1024 vector master for the Tauri app. It preserves the approved sun-and-mountain symbol, using blue `#3064D7` and cyan `#1EC0DC`, on a white tile with transparent outer padding.

## Regenerate

After installing the project's dependencies, run from the repository root:

```sh
pnpm icons:generate
```

This runs the project's pinned Tauri CLI against `assets/icon/app-icon.svg`. Tauri writes its standard outputs to `src-tauri/icons/`:

- macOS: `icon.icns`, including 16–1024 px representations.
- Windows: `icon.ico` and AppX logo PNGs.
- Linux: `32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, and `icon.png`.
- Android and iOS: the existing platform resource directories.

Commit the SVG master and generated resources together. `src-tauri/tauri.conf.json` already references the desktop icon filenames; those paths do not need to change when regenerating. The new resources are included in the next Tauri build.

The landing page's `web/src/app/icon.svg` uses the same vector symbol without the white tile. It is maintained separately; keep its paths and colors in sync when editing the master.

The macOS Icon Composer `.icon` source used during design is not a Tauri input. The vector master provides the portable source for Tauri's ICNS, ICO, and PNG generation.

Reference: [Tauri app icon documentation](https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/develop/icons.mdx).
