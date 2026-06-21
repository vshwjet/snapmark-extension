# Snapmark

Snapmark is a Chrome (MV3) browser extension for design QA annotation on any webpage. Activate it with `Cmd+Shift+A`, then click elements (Inspect mode) or drag a region (Area mode) to capture a cropped screenshot, attach a comment, and export everything as Markdown for design/QA handoff.

## Prompt for your coding agent

Don't want to clone and build this yourself? Paste this into your coding agent (Claude Code, Cursor, etc.):

```
Clone https://github.com/vshwjet/snapmark-extension.git, install its dependencies with npm install, and build it with npm run build. Confirm the build succeeded and tell me the absolute path to the resulting dist/ folder so I can load it as an unpacked extension in my browser.
```

## Installation

Snapmark isn't on the Chrome Web Store, so it's installed as an unpacked extension:

1. Give the above prompt to your coding agent, or follow the [build instructions](#1-build-the-extension) below.
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `dist/` folder inside this project.
5. The Snapmark icon appears in your toolbar — pin it for easy access.

Whenever the code changes and you rebuild, click the refresh icon on the Snapmark card on the extensions page to pick up the new `dist/` contents.

## Features

- **Inspect mode** — click any element to capture and annotate it.
- **Area mode** — drag to select an arbitrary region and annotate it.
- Floating, draggable toolbar injected into the page.
- Copy all annotations as Markdown (with embedded screenshots).
- Optional [imgBB](https://imgbb.com) integration — when an API key is set in the extension's settings, screenshots are uploaded and the Markdown export uses hosted image URLs instead of base64 blobs.

## Requirements

- Node.js 18+ and npm
- A Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Arc, Vivaldi, etc.)

## 1. Build the extension

Clone the repo and install dependencies:

```bash
git clone https://github.com/vshwjet/snapmark-extension.git
cd snapmark-extension
npm install
```

Build the production bundle:

```bash
npm run build
```

This runs two Vite builds and outputs everything into the `dist/` folder:

- `content.js` — the content script (IIFE bundle, includes React + CSS)
- `background.js` — the MV3 service worker (ES module)
- `manifest.json`, `popup/`, `options/` — copied from `public/`

For active development with auto-rebuild on file changes, use:

```bash
npm run dev
```

(Reload the extension in your browser after each rebuild — see below.)

If you just want a distributable zip of the built extension:

```bash
npm run zip
```

This creates `snapmark-extension.zip` from the contents of `dist/`.

## 2. Load the extension into your browser

See [Installation](#installation) above — load the `dist/` folder you just built as an unpacked extension. If you only changed the content script while developing, also refresh any already-open tabs you're testing on.

## Usage

- Press `Cmd+Shift+A` (or click the toolbar icon → **Activate on this page**) to start annotating.
- Switch between **Inspect** (click elements) and **Area** (drag to select) modes from the floating toolbar.
- Click the list icon to view, delete, or clear annotations.
- Click the copy icon to copy all annotations as Markdown to your clipboard.
- Click the sliders icon (or the extension's **Settings** button in the popup) to set an optional imgBB API key for hosted screenshot URLs — get a free key at [api.imgbb.com](https://api.imgbb.com/).
- Press `Esc` or use the minimize button to collapse the toolbar without losing annotations.

## Project structure

```
public/
  manifest.json        MV3 manifest
  popup/                Toolbar popup UI
  options/              Settings page (imgBB API key)
src/
  background.ts         Service worker (screenshot capture, options routing)
  content/
    index.tsx            Content script entry point
    App.tsx               Root annotation app
    components/           Toolbar, overlay, pin, popover UI
    utils/                Screenshot cropping, selector generation, Markdown export, imgBB upload
    styles/snapmark.css   Injected styles
vite.config.ts            Builds content.js
vite.background.config.ts Builds background.js
```
