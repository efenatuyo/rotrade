# Build Instructions

This document is for Mozilla AMO reviewers to reproduce the submitted build from source.

## Requirements

- Node.js >= 18
- npm (bundled with Node)

## Steps

```sh
npm ci
npm run build:firefox
```

Output is written to `dist-firefox/`. The contents of `dist-firefox/` (zipped) match what was uploaded to AMO.

`npm run build` (no suffix) produces both targets: `dist/` (Chrome, `background.service_worker`) and `dist-firefox/` (Firefox, `background.scripts`). The two outputs differ only in the `background` block of `manifest.json`; the bundled background script itself is identical.

## What the build does

`scripts/build.mjs` does the following:

1. Reads `manifest.json` and resolves the content-script and background-script file lists.
2. Concatenates all content scripts (in the order listed in `manifest.json`) into `dist/content-scripts.bundle.js`.
3. Concatenates `background/background.js` with the files it `importScripts(...)` into `dist/background/background.js`.
4. Minifies all JS and CSS with **esbuild** (target: `es2018`, `legalComments: 'none'`, no source maps in production).
5. Copies `assets/`, `ui/popup.html`, `ui/popup.css`, `ui/popup.js`, and the rolimons content scripts (`content_scripts[1].js`) into `dist/`, minifying JS/CSS along the way.
6. Writes a `manifest.json` in the output dir that replaces the long content-script list with the single bundled file, and rewrites the `background` block for the selected target (`service_worker` for Chrome, `scripts` for Firefox).

No bundler plugins, no code transforms beyond minification. The source in this repository is the code that ships.

## Verifying the build

After running `npm run build`, the unminified source for any line in `dist/content-scripts.bundle.js` can be found in the corresponding file under `content/`, `core/`, `trading/`, or `ui/` as listed in `manifest.json` (`content_scripts[0].js`).

## Versions

The submitted build was produced with the dependencies pinned in `package-lock.json`. `npm ci` installs those exact versions.
