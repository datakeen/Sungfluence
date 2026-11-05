# Changelog

All notable changes to SungFluence are listed here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers follow [Semantic Versioning](https://semver.org/): a bug fix raises the last number (3.1.1), a new feature the middle one (3.2.0), and a change that can break old projects or plugins the first one (4.0.0).

## [Unreleased]

### Added

- **Export window.** Export (Ctrl E) now opens a window with every format on the left and its options on the right, with a line that shows the size of the result. It remembers your last choice. Picture formats and projects let you choose which layers to include.
- **Project files as `.sungfluence`.** Save project (Ctrl S) writes one zip file with the settings, the photo, placed images and a preview. You can choose which layers a project keeps. Projects saved as `.json` still open.
- **Text twins.** Any style can be saved as plain text, Markdown, an HTML page, terminal colors (16, 256 or full color) or an SVG for README files.
- **Text options.** Width in characters (40 to 160), the cell shape of the font where the text will be read, spaces for white areas, swap ink and paper, and the characters to use: keyboard characters, shade blocks, Braille, the letters A to Z in order, digits, letters only, symbols only, or your own.
- **Code outputs.** The art as a string or a comment block in 16 languages, a shell script whose `--help` starts with the art, and a login message (`motd`) file.
- **Letter size** slider in Flow lines, Spiral and Relief, and at the top of Halftone. ASCII, Braille and Typewriter now say that fewer columns mean bigger letters.
- **Motion.** Buttons, windows, menus, panels and messages move with short, quiet transitions. When text art appears, the letters fly in from outside the picture and land in their places. Settings → Motion chooses Full, Calm or Off, and fly in, fade in or at once. A computer set to reduce motion keeps everything still.
- **Compare at any angle**: up and down, across, slanted, or any angle with a slider. Shift and the arrow keys on the divider turn it.
- **Liquify tool** (Y): brush the photo with Push, Bloat, Pucker, Twirl right, Twirl left and Restore, with a size and a strength. Hold still to keep going; Alt restores. Saved in projects, with undo.
- **More print settings**: 31 print sizes (ISO A and B, US paper, photo prints, posters, clothes and small things) and a custom size in mm, cm or inches; portrait or landscape; turning the art on the page at any angle; a page margin; and any dpi from 30 to 2400, with 72, 150, 300 and 600 one click away.
- A help page, **Printing**, on print sizes and which dpi to use for screens, posters, T-shirts and close-up prints, with sources.
- **JPG export** of the visible layers. JPG cannot be transparent, so the background gets the paper color.
- **Style settings inside PNG and SVG files**, if you turn it on. Opening such a file applies its look to the open photo. The photo itself is never stored.

### Fixed

- Zoom and Compare now work on the Paper and T-shirt previews. You can also drag to move around there.
- The Paper preview shows the paper color even with a transparent background, so light letters chosen for dark paper no longer vanish on a white sheet.
- Choosing a paper the ink cannot be seen on, such as navy letters on black, now switches that ink to a light or dark one and says so, with Undo.

### Changed

- The background section is called **Paper color (background)**, or **T-shirt color (background)** on the T-shirt preview, where it shows shirt colors.
- The transparent background note says which formats keep it clear and what color JPG files get instead.
- Clearer license wording in the README, the About window and the installers: SungFluence is free and open source software.
- The About window's LinkedIn button is now just called LinkedIn.
- README: links to the latest download and the web version, the 3.2 features, and an up-to-date project layout.
- `docs/BUILDING.md` explains running from source, building installers and publishing the web version, for anyone working on their own copy.
- `DEVELOPMENT.md`: a developer guide to how the code is laid out and the rules that keep the app good.
- A download guide, `docs/downloads/README.md`: which file to pick for each computer, and how to install it.

## [3.2.0] - 2026-11-01

Menus for everything, a command finder, snapping, and help inside the app.

### Added

- **Menu bar** with File, Edit, Image, Layer, Text art, Effects, Export, View and Help. The desktop app shows it as its normal menu bar; the web version shows it at the top of the page. Every item shows its shortcut, and checkmarks show what is on.
- **Find any command** with Ctrl K: commands, styles, recipes, samples, export formats and tools.
- **Snapping** while drawing and editing vectors: end points, points and corners, mid points, centers, intersections, extensions, perpendicular, tangent, on lines, text baselines, edges in the photo, lining up with other points, 15° angles and a grid. A mark shows where the point will land. Alt places a point freely; a Snap button and View → Snapping choose what to snap to.
- **Grid**: View → Show grid (Ctrl '), with its size in Settings.
- New shortcuts: Ctrl O opens, Ctrl A selects all shapes, Ctrl ; turns snapping on or off.
- **Help inside the app.** Press F1, or choose **?** → **Help and tutorial**, or **Help → SungFluence Help** in the desktop app. Topics on the left, search, links between pages. It works offline and ships with every installer.
- **Getting started tutorial** in five steps, with pictures. New users see a one-time hint that points to it.
- **User reference** for the window, the Photo, Vector, Text art and Output panels, export, plugins, Urdu and Arabic, and common problems.
- **Style reference** with every style, setting, range and starting value. It is written from the app's own definitions on every build, so it always matches the app. The keyboard shortcut page is made the same way.
- A one-sentence description under each style's name in the Text art panel.
- `docs/RELEASING.md`: the release checklist. `docs/wiki`: pages for the GitHub wiki.
- `ROADMAP.md`: where the project is heading. This changelog.

### Changed

- Every action is now one command that menus, shortcuts, the palette and tests all share. Shortcuts work the same as before.
- New icon: a light S and a gold F on deep ink, in the style of the wordmark.
- The desktop Help menu has Help and Getting started at the top.

## [3.1.0] - 2026-11-01

First public release.

### Added

- **Three layers:** Photo, Vector and Text art, each with its own visibility, opacity and blend mode. Drag to reorder. Lock the text art and put an edited photo on top of it.
- **Photo tools:** crop with handles, free or fixed ratio; rotate, flip and canvas size; brightness, contrast, color, warmth, hue, shadows, highlights, sepia, vignette, grain, posterize, black and white cut, pixelate, bulge, pinch and twirl; magic wand, lasso and brush to remove areas.
- **Vector tools:** pen, pencil and tracing; shapes, text and images; move, scale, rotate, align, flip, copy and paste; step and repeat in a line, a grid, a circle or along a line; bend lines.
- **Text art styles:** Line text, Text portrait, Word mosaic, Flow lines, ASCII, Braille, Halftone, Calligram, Spiral, Rings, Relief and Typewriter.
- **Extra effects** from plugins, with Confetti and Contours built in. A Plugins window, a Plugins menu in the desktop app, and a plugin template for authors.
- **Urdu and Arabic:** Calligram, Text portrait, Spiral and Rings set whole joined words, right to left, in the bundled Noto Nastaliq Urdu and Noto Naskh Arabic fonts. Calligram shape words can have several lines.
- **Fade shapes** (oval, circle, band, column) that can be moved, sized, softened and turned by dragging handles on the picture.
- **Spiral and Rings** can start at the center or outside and run either way, with handles for the center, the start and the end.
- **Letter controls:** opacity, see-through light areas, weight, letter spacing, italic and capitals.
- **Color:** photo colors averaged under each letter and kept bright on dark paper, colors picked from the photo or the screen, and inks that can be swapped after "Limit to inks".
- **Blank artboards** in pixels, inches, millimeters or grid cells, with presets for social media and print.
- **Compare** with a divider: any look on each side.
- **Smooth zoom** with settings for speed, glide, steps and wheel behavior.
- **Exports:** PNG and SVG of what you see or of single layers; text art as PNG, SVG with live text, PDF, CMYK PDF and plates, Braille or ASCII text; project files.
- **Installers** for Windows, macOS and Linux, built by GitHub Actions. The app also runs in a browser and offline.
- Sample pictures made for the project, and a new icon.

### Changed

- Licensed under the GNU Affero General Public License, version 3 or later.

[Unreleased]: https://github.com/datakeen/Sungfluence/compare/v3.2.0...HEAD
[3.2.0]: https://github.com/datakeen/Sungfluence/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/datakeen/Sungfluence/releases/tag/v3.1.0
