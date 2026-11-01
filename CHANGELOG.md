# Changelog

All notable changes to SungFluence are listed here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers follow [Semantic Versioning](https://semver.org/): a bug fix raises the last number (3.1.1), a new feature the middle one (3.2.0), and a change that can break old projects or plugins the first one (4.0.0).

## [Unreleased]

### Added

- `ROADMAP.md`: the plan toward a full design studio, in phases.
- This changelog.

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

[Unreleased]: https://github.com/datakeen/Sungfluence/compare/v3.1.0...HEAD
[3.1.0]: https://github.com/datakeen/Sungfluence/releases/tag/v3.1.0
