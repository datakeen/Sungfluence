# SungFluence: project notes for Claude Code

SungFluence turns images into art made of letters. It is an open-source project by Ahmed Bilal, licensed AGPL-3.0-or-later.
The name is written **SungFluence** (capital F) wherever people read it: window title, About, installers, docs. Code names stay as they were: the plugin API `Sungfluence.plugin` (`SungFluence.plugin` is an alias), the npm name `sungfluence`, storage keys `sungfluence-*`, and the GitHub repository `datakeen/Sungfluence`. Early private builds used `charcoal-*` storage keys and `app: 'charcoal'` in project files; `migrateStorage` in `01-data.js` moves the keys once, and such projects still open. Do not mention the old name in the UI or the docs: the project goes public under this name. If the owner renames it again, change it everywhere in one change: `package.json` (name, productName, appId), `main.js`, `app/body.html` (brand mark), `scripts/build.js`, storage keys only with a migration, README, docs and workflows.

## How the code is organized

- `app/` is the source. Edit only here.
- `scripts/build.js` builds `src/` from `app/`. Run `npm run build` after every change. `npm start` builds first.
- `src/` is generated and committed, so a double-click on `src/index.html` works. Never edit `src/app.js`, `src/engine.js`, `src/samples.js`, `src/plugin-files.js`, `src/plugins/`, `src/index.html`, `src/styles.css` or `src/sw.js` by hand. `src/fonts`, `src/vendor`, `src/icons`, `src/pwa.js` and `src/manifest.webmanifest` are hand-kept.
- `npm run build:single` also writes `single/sungfluence.html`, one self-contained file. The owner uses it to test on claude.ai first.

| File | Contents |
| --- | --- |
| `app/engine.js` | Image to typographic scene. Styles (modes), line tracing, color models, SVG and text export, plugin registry. No DOM except canvas. |
| `app/body.html` | Page markup |
| `app/styles.css` | Styles and color tokens, light and dark |
| `app/parts/01-data.js` | Style definitions and controls, recipes, word and phrase library |
| `app/parts/02-core.js` | Document model, masks, photo source (warp and photo objects), filters, preview pipeline, job runner, layer compositing (`composeTo`) |
| `app/parts/03-tools.js` | Stage layout, smooth zoom, tool rail, pointer handling, selection tools, pen, pencil, overlay, option bar |
| `app/parts/03b-objects.js` | Shapes, text and images on the Photo or Vector layer; select, scale, rotate; step and repeat; object SVG |
| `app/parts/03c-studio.js` | Crop tool, rotate, flip, canvas size (baked with undo through `imgStore`), compare divider, new artboard, settings, about, on-canvas guides for fade shapes and spirals |
| `app/parts/04-ui.js` | Inspector panels, controls, recipes, thumbnails, variations, library |
| `app/parts/05-plugins.js` | Plugin loading, plugin controls, the Plugins window (top bar button and the desktop menu bar through `window.__sungfluenceMenu`) |
| `app/parts/06-io.js` | Undo, autosave, projects, export, Claude features, shortcuts, boot |
| `app/plugins/` | Built-in plugins; their styles show under Extra effects. `sungfluence-plugin-template.js` is the starter for plugin authors: it is offered as a download, not loaded as a style. |
| `app/samples/` | Sample images. `01-cat.jpg` becomes the sample "cat". The cat must stay. |
| `app/icon.svg` | The app icon. `npm run icons` draws `build/icon.png` and `src/icons/*.png` from it. The build copies it to `src/icons/icon.svg`. |

All parts share one function scope (the build wraps them). Order matters only for code that runs at load time.

## Commands

```bash
npm install
npm run build             # app/ -> src/
npm start                 # build, then open the desktop app
npm run web               # serve src/ at http://localhost:8080
npx playwright install chromium   # once, for tests
npm test                  # regression, plugin and studio tests on src/index.html
node tests/make-images.js # redraws the two test images in tests/images
node tests/smoke.test.js  # opens src/index.html from disk, like a double-click
npm run dist:win          # or dist:linux, dist:mac
```

Tests write screenshots to `tests/out/`. Look at them after visual changes. Tests read `tests/images/portrait.jpg` and `tests/images/drawing.png`. Only `tests/effects.test.js` uses the sample cat, to judge the effects on a real face. `tests/browser.js` falls back to the installed Chrome or Edge when Playwright's Chromium is blocked (it is on the owner's Windows PC, and the shell sandbox also blocks browsers, so run tests with the sandbox off).

## Layers

Three layers: Photo, Vector (`doc.lines`: lines and vector objects) and Text art. `doc.order` lists them top first. Each has `visible`, `opacity` and `blend`. The eyes are the truth; the Photo, Mix and Text buttons are presets that set the eyes (`setView`, `syncViewSeg`). Layer visibility is left out of undo history. Objects (`doc.objects`) use image pixels like lines; `layer: 'photo'` objects are drawn into `photoSrc()`, so text art reads them. Image object pixels live in `assets`, outside history.

## Text in Urdu and Arabic

Arabic script joins its letters, so styles must never draw it one letter at a time. `ARABIC`, `RTL`, `famFor` and `famScale` in the engine pick a font that has it (Nastaliq by default) and set whole words, right to left. Calligram, Text portrait and Spiral do this; `post()` moves any stray Arabic letter to the Nastaliq font. Fonts for it are preloaded with Urdu sample text in `06-io.js`, because `document.fonts.load` without text only loads the Latin part.

## Rules that keep the app good

- **No freezing.** Target: no main-thread task over about 200 ms on an i5 8th gen laptop. Heavy work is a generator (`function*`) that yields progress. The app runs generators in 8 to 14 ms slices (`runJob` in `02-core.js`, `sliceThumbs` in `04-ui.js`). Never add a synchronous loop over a full-size image. Known exception: switching preview quality rebuilds the photo view in one step (about 0.3 s).
- **Proxy previews.** Previews render at a smaller scale (`scene.scale`), exports at full size. Pixel settings named `size`, `spacing`, `minSize` and `maxSize` scale by themselves. A preview must look like its export.
- **One drawing list.** Every style returns items `{t: 'text' | 'rect', ...}`. Canvas, SVG, PDF, CMYK and text exports all read the same list.
- **Plugin API is public.** Do not change `Sungfluence.plugin` or the `api` object in `docs/PLUGINS.md` without raising `PLUGIN_API` and keeping old plugins working.
- **Offline desktop.** No CDN or Google Fonts calls from `src/`. The Content Security Policy in `src/index.html` allows scripts from the app folder and `blob:` (for user plugins) only.
- **Claude features** ("Direct" and "Suggest") use `window.claude`, which exists only on claude.ai. They hide themselves elsewhere. Keep it that way.
- **Privacy.** Photos never leave the computer. No analytics without an explicit opt-in.
- **Writing in the UI and docs.** Short sentences. Plain US English. No em dashes. No hype.

## Before a release

1. License: AGPL-3.0-or-later (decided). Keep SPDX lines in new files. The plugin template stays MIT on purpose.
2. Samples: all pictures in `app/samples/` were made by the owner with AI image tools, and the owner holds the rights (confirmed November 2026). Keep new samples under about 450 KB (1600 px JPEG).
3. The GitHub repository is `datakeen/Sungfluence` (private for now). Installer steps: `docs/INSTALLERS-AND-GITHUB.md`.
4. Run the build and all tests, and check the screenshots.

## Where the project is going

See `ROADMAP.md`. Before a large change, propose a short plan and wait for the owner.
