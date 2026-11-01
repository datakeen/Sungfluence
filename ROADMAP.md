# SungFluence roadmap

SungFluence started as a weekend toy. The goal now is a proper design studio for typographic art: precise, fast, printable, and good with every script, including Urdu, Arabic and Persian.

This is a plan, not a promise. Phases are in the order they should be built, because later work stands on earlier work. Within a phase, items can be built in any order.

Effort: **S** a few days, **M** one or two weeks, **L** longer.
Status: **Done**, **Partly** (a basic version exists), or blank (not started).

---

## The shape of the studio

Every phase below moves the app toward these few building blocks. New code should fit them from now on, even before a phase starts.

| Building block | What it is | Why it matters |
| --- | --- | --- |
| **Command registry** | Every action (open, export, duplicate layer, apply recipe) is a command with an id, a label, a shortcut and a function. | One list feeds the menu bar, a command palette, keyboard shortcuts, batch mode, plugins and tests. |
| **Menu bar** | File, Edit, Image, Layer, Type, Effects, Export, Window, Help, in the desktop app and in the web app. | A studio is found through its menus. Today some actions live only in side panels. |
| **Layer stack** | Any number of layers of three kinds: raster, vector and text art. Each can be duplicated, hidden, reordered, blended and masked. | Duplicate layer, double exposure, another round of effects, selective saving and animation all need it. |
| **Project file** | One `.sungfluence` file (a zip) with every layer, its pixels, vectors, text, effects and settings, with a version number and migrations. | Saving and reopening work exactly, and old projects keep opening. |
| **Exporter registry** | Each output format is a module: it says what layers it can take and what options it has. | PNG, SVG, PDF, text, Word, Excel, G-code, DXF and STL all plug into one Export window. Plugins can add formats. |
| **Font service** | Bundled fonts, plus system fonts when the user allows it. Gives the font file bytes, not just a name. | Real fonts in PDF, glyph outlines for plotters and lasers, and shaping for every script. |
| **Shaping service** | HarfBuzz (WebAssembly) turns text into positioned glyphs and outlines, for any script and direction. | Correct Urdu, Arabic and Persian everywhere, vertical Chinese and Japanese, text on paths with joined letters. |
| **Workers** | The engine runs in Web Workers with OffscreenCanvas. | A studio never freezes, even on large prints and in batch mode. |
| **Provider service** | Optional AI and cloud services behind one interface, with the user's own keys stored in the system keychain. | AI cutout and text help without tying the app to one company, and without sending photos anywhere unless the user says so. |

---

## Phase 0: documentation and release habits (start now, keep going)

| Item | Notes | Effort | Status |
| --- | --- | --- | --- |
| Changelog | `CHANGELOG.md` in the "Keep a Changelog" format, one entry per release, with Added, Changed, Fixed. | S | Done |
| Help that ships with the app | A Help window (F1) that opens pages bundled with the installer, so help works offline. Same pages as `docs/`. | M | |
| User reference | One page per panel and tool: what each control does, its range, and a small picture. Lives in `docs/reference/`. | M | |
| Getting started tutorial | Five short steps: open a photo, pick a style, adjust, try a recipe, export. With screenshots. | S | |
| Wiki | GitHub wikis need the repository to be public (or a paid plan). Keep the real docs in `docs/` so they are versioned and offline; use the wiki as a front door: FAQ, gallery, links. | S | |
| GitHub About and topics, SourceForge listing | Short description, topics and website. | S | Done (text written) |
| Release checklist | Version bump, changelog, build, tests, screenshots, tag. | S | Partly |

---

## Phase 1: foundations

These change the structure of the app. Almost everything later needs at least one of them.

| Item | Notes | Effort | Status |
| --- | --- | --- | --- |
| Command registry and menu bar | See "The shape of the studio". Start by moving existing buttons into commands. Add a command palette (Ctrl+K). | M | Partly (desktop menu calls page commands) |
| Layer stack with any number of layers | Duplicate any layer for another round of effects. Two photo layers make a double exposure. Per-layer masks. | L | Partly (fixed three layers; text art has sub-layers that can be duplicated) |
| Project file v5 | A zip with every layer. On save, choose what to include: any mix of raster, vector and text art layers. | M | Partly (JSON project with photo, lines, objects and text settings) |
| Exporter registry | Move every current export into modules. One Export window with format, layers to include and options. | M | |
| Workers | Run styles in Web Workers with OffscreenCanvas. Keep the 200 ms rule as a test. | L | |
| Font service | Bundled fonts, plus system fonts through the Local Font Access API. A switch in Settings turns system fonts on or off, because of privacy and licensing. | M | |
| Shaping service | HarfBuzz WebAssembly (MIT). Shape whole runs; give glyph ids, positions and outlines. | L | Partly (whole Urdu words in Calligram, Text portrait, Spiral and Rings, using the browser's own shaping) |
| Print setup | Page size, orientation, print margin, bleed and crop marks in one place, with a printer-friendly preview. | M | Partly (margin and print size in Output) |

---

## Phase 2: typography that no other tool has

Needs the shaping service and the font service from Phase 1.

| Item | Notes | Effort | Status |
| --- | --- | --- | --- |
| Urdu, Arabic and Persian in every style | Whole words join correctly in Line text, Flow lines, Relief and plugins too. | M | Partly |
| Text that fills a river | Text along the centerline of a shape (like a thalweg), as tall as the banks are wide. Each word is shaped once and bent as one outline, so changing thickness never breaks the joins. Made first for Urdu, Arabic and Persian. | L | Partly (Line text follows line width, letter by letter) |
| Semantic mode | Feed a poem, a letter, a resume or song lyrics. The picture is drawn with that text in reading order, so it stays readable as writing and still shows the face: left to right for English, right to left for Urdu and Arabic, top to bottom for Chinese and Japanese. | M | Partly (Text portrait, right to left for Urdu) |
| Weight ramp | One letter at nine weights or sizes makes the tones. Uses variable fonts. Elegant, and rare. | S | |
| Drawn, not dithered | Find the edge direction and use `/ \ | _ -` and shape-matched characters, so faces look sketched instead of noisy. Match each cell to the best glyph by shape, not only by brightness. | M | Partly (Edge strokes in ASCII and Typewriter) |
| More resolution from Unicode | Quadrant, sextant and octant block characters next to the existing half blocks and Braille. | S | Partly (Braille and half blocks) |
| Correct cell shape for text output | Monospace cells are about twice as tall as wide. SungFluence already corrects this on screen and in its text export; make the target font's cell shape a setting, and show it. | S | Partly |
| Character choice for text output | Characters per line; character sets: any, only the ones you list, A to Z in order, digits only, ASCII letters only, ASCII symbols only. Spaces for white areas. For logos that terminal apps show when they start. | S | Partly (ASCII ramps, custom characters) |
| Recursive typography | Big letters, each built from tiny letters, like FIGlet banners made of letters all the way down. | S | Partly (Calligram with a word shape) |
| Math and equations | Draw with math symbols, or with famous equations from physics, civil, mechanical and electrical engineering, and calculus. Needs a math font (STIX Two Math, OFL) and an equation library. | M | |
| Vertical writing | Top to bottom columns for Chinese, Japanese and Korean. | M | |

---

## Phase 3: output for print, offices and makers

Needs the exporter registry and the font service. Plotter and laser output also need glyph outlines from the shaping service.

| Item | Notes | Effort | Status |
| --- | --- | --- | --- |
| Vector PDF with real fonts | Embed subset fonts, so text stays text and looks the same everywhere. | M | Partly (vector PDF with standard fonts) |
| ICC color profiles | PDF/X output intent with a CMYK profile, through pdf-lib (MIT). | M | Partly (CMYK PDF and plates) |
| Word export | `.docx` with the text art as real text in a fitting monospace size, in color when possible. Built with JSZip, already bundled. | S | |
| Excel export, picture in cells | Each cell is a square pixel filled with the photo color. Zoom out in Excel to see the picture. Colors are limited to stay inside Excel's style limits. | S | |
| Excel export, hidden picture | Cells are empty but each has a font color from the photo. Type or paste a letter into every cell and the picture appears. The edges of the area are marked, so people know where to stop. A fun file to send to a friend. | S | |
| Text file export | Plain text with spaces for white areas, a set number of characters per line, and an ANSI color option for terminals. | S | Partly |
| Pen plotter files | Single-stroke (Hershey) lettering as SVG paths, HPGL and G-code. | M | |
| Laser cutting and engraving | DXF and SVG with cut and engrave colors, sized in millimeters. | M | |
| Stencils | Letters with bridges, so the middles of O, A and B do not fall out. | M | |
| Cross-stitch charts | A grid with one symbol per thread color, DMC thread numbers and a printable key. | M | |
| Embroidery | Running-stitch lettering in DST or PES. | L | |
| Typewriter keys only | A switch that limits Typewriter to the keys of a real typewriter, overstrikes allowed. | S | Partly (Typewriter style) |
| Text lithophane | Letters raised by tone, exported as STL for 3D printing. Light through the print shows the picture. | L | |

---

## Phase 4: studio workflow

Needs the layer stack, the project file and the command registry.

| Item | Notes | Effort | Status |
| --- | --- | --- | --- |
| Batch mode | Pick many photos and one recipe; get a folder of exports. Runs in workers. Also a command line tool. | M | |
| Shared recipe libraries | Export and import recipe files. A team points the app at a shared folder (a network drive or a synced folder). No server needed. | M | |
| T-shirt mockups | Two or three shirts side by side, front and back, each in its own color, so you see how a design looks before you print. | M | Partly (one shirt mockup) |
| Double exposure | Letters shaped by one photo and colored by another. | S | |
| Live camera mirror | The webcam as text art in real time, with a snapshot button. | M | |
| Animation | Letters draw themselves in, type out, fall like rain, gather from confetti, spiral in, or wave. Export GIF, MP4 or WebM (gifenc and mp4-muxer, both MIT, and WebCodecs). | L | |
| History panel | Thumbnails of every step. Click one to go back. | M | |

---

## Phase 5: optional AI, with your own keys

Needs the provider service. Nothing here is required: the app keeps working offline without it.

| Item | Notes | Effort | Status |
| --- | --- | --- | --- |
| Provider settings | Add a key for Claude (Anthropic), ChatGPT (OpenAI), Kimi (Moonshot), Gemini (Google), Dola if it offers a developer API, any OpenAI-compatible service (DeepSeek, OpenRouter and others), or a local model (Ollama, LM Studio). Keys go in the system keychain, never into project files. | M | Partly ("Direct" and "Suggest" work on claude.ai) |
| Subject cutout on any background | Chat models describe pictures but do not return exact masks, so the best cutout comes from a segmentation model. Plan: a built-in model that runs on the computer (offline, private, no key; for example BiRefNet, MIT, or U²-Net, Apache 2.0), plus optional cloud cutout through the user's keys. | L | Partly (border flood, magic wand, lasso, brush) |
| Text help | Write a poem, a caption or verses that suit the photo; translate text; suggest a recipe. Uses whichever provider the user set up. | S | Partly (on claude.ai) |
| Privacy | Ask before the first photo leaves the computer, every time for a new provider. Show which provider gets what. | S | |

---

## Plugins

Done: `Sungfluence.plugin({...})` registers a style; plugins get removal masks, fades, effects, inks, color models and every export for free; a Plugins window and menu; styles show under Extra effects.

Next, in order:

1. **Plugins in a Web Worker,** so a slow or broken plugin cannot freeze the app or read the page. (With Phase 1 workers.)
2. **Plugin manifest** (`sungfluence-plugin.json`): id, version, author, license, homepage, API version, permissions.
3. **More plugin kinds:** photo filters, line generators, exporters (from Phase 3) and text sources.
4. **Plugin gallery:** a GitHub repository where people submit plugins by pull request; the app lists and installs them.
5. **Signed plugins** in the gallery.

## Also on the list

- Urdu interface with a right-to-left layout, then other languages through translation files.
- Accessibility pass: full keyboard use, screen reader labels, WCAG AA contrast.
- Golden image tests in CI, and a speed test that fails if any task blocks the page for more than 200 ms.
- Stipple letters and circle-packed words as plugins.
