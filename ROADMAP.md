# SungFluence roadmap

This is a list of ideas, not a promise. Effort: S is a few days, M is one or two weeks, L is longer.
"Plugin" means the idea can ship as a plugin without touching the core.

## Ten new art ideas

| # | Idea | What it makes | Who wants it | Effort | Where |
| --- | --- | --- | --- | --- | --- |
| 1 | Contour words | Text along lines of equal tone, like a topographic or river depth map. Every 5th line bold. | Map lovers, engineers, posters | Done | Plugin (built in) |
| 2 | Stipple letters | Letters placed by weighted Voronoi stippling, so spacing follows tone smoothly. No grid look. | Fine art prints | M | Plugin |
| 3 | Circle-packed words | Each word sits in its own circle. Circles are packed tight and sized by detail. | Gifts, wedding words | M | Plugin |
| 4 | Animated text art | Letters type in, flow along lines, or cycle through the text. Export GIF, MP4 or animated SVG. | Social media, stickers | L | Core (needs a time axis) |
| 5 | Live camera mirror | The webcam shown as text art in real time, using the Fast proxy. | Demos, classrooms, exhibitions | M | Core |
| 6 | Cross-stitch and embroidery charts | A grid of stitches with a symbol per thread color and a printable key with thread numbers. | Crafters (a paying market) | M | Plugin plus export |
| 7 | Pen plotter and laser files | Single-stroke lettering (Hershey style) exported as SVG paths with no fills. | Makers, laser engravers | M | Export |
| 8 | Text lithophane | Letters raised by tone and exported as STL. The picture shows when light passes through a 3D print. | 3D printing | L | Export |
| 9 | Urdu and Arabic on lines | Nastaliq and Naskh text along curves, joined correctly, right to left. Done for Calligram, Text portrait, Spiral and Rings (whole words); still to do for Line text, Flow lines and Relief, which bend each letter. | Pakistan, the Arab world, calligraphy fans | M | Core (needs shaping per word) |
| 10 | Double exposure | Letters shaped by one photo and colored by a second one. | Portraits with landscapes | S | Core |

## UI and UX improvements

1. **Command palette** (Ctrl+K). Type to find any action, style, recipe or setting.
2. **Before and after slider** on the canvas. Done in 3.1 as Compare: a divider with any look on each side.
3. **Layer opacity and blend modes** shown on the layer row, with drag to reorder. Done in 3.1 for the Photo, Vector and Text art layers; still to do for single text layers.
4. **Paint where a layer shows.** A brush that paints a mask per text layer, so a style appears only on the face, the sky, and so on.
5. **History panel** with small thumbnails. Click any step to go back.
6. **Touch gestures** for tablets: pinch to zoom, two fingers to pan, a long press for the context menu.
7. **First-run tour** in three short steps, and a "Remix this" button on every sample.
8. **Live recipe thumbnails of your own photo** that stay fresh while you edit. Today they redraw only when the panel opens.
9. **Urdu interface** and right-to-left layout. Later, other languages through a simple translation file.
10. **Accessibility pass.** Full keyboard use, screen reader labels on every control, and a check that the contrast of all text meets WCAG AA.

## Architecture, so the project scales

1. **Modules and TypeScript.** Move the `p*.js` parts to ES modules with Vite. Add TypeScript gradually, starting with the engine and the plugin API.
2. **Engine as its own package** (`@sungfluence/engine`) with no DOM code. It then runs in a Web Worker, in Node for a command line tool, and on a server.
3. **Rendering in a Web Worker** with OffscreenCanvas. The UI then never waits for the engine, even on slow computers.
4. **One document format** in JSON with a version number and migration functions. Projects from every version keep opening.
5. **Commands for every edit.** Each change is a small command object. Undo, redo, macros, plugin actions and future sync all reuse it.
6. **Golden image tests.** Render fixed inputs and compare against stored images. Add a speed test in CI that fails if any task blocks the page for more than 200 ms.
7. **Command line tool** for batch work: `sungfluence render photo.jpg --recipe word-portrait --out poster.svg`.
8. **WebAssembly only where profiling shows a need,** for example thinning and distance transforms on very large images.

## Plugins

Done in v3:

- `Sungfluence.plugin({...})` registers a style. Plugins declare their settings, and the panel builds itself.
- Plugin layers get removal masks, focus and fade, effects, ink limits, color models and every export for free.
- Load plugin button, a downloadable template, plugins remembered between sessions, clear error messages.

Next:

1. **Run plugins in a Web Worker,** so a slow or broken plugin cannot freeze the app and cannot read the page.
2. **Plugin manifest** (`sungfluence-plugin.json`): id, version, author, license, homepage, API version, permissions.
3. **More plugin kinds:** photo filters, line generators (for example a spiral or a maze), exporters (cross-stitch, plotter), and text sources.
4. **Plugin gallery.** A GitHub repository where people submit plugins by pull request. The app lists them and installs with one click.
5. **Signed plugins** for the gallery, so users can see who made a plugin and that nobody changed it.
