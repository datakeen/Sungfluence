# Contributing to SungFluence

Thank you for helping. Bug reports, new styles, plugins and translations are all welcome. Small, focused changes are easiest to review.

For feedback or a bug, please [open an issue](https://github.com/datakeen/Sungfluence/issues). There is no need to email.

## Getting started

1. Fork the repository and clone your fork.
2. Run `npm install`, then `npm start`. This builds the app and opens it.
3. Make your change in `app/`, not in `src/`. Run `npm run build` and reload the window (Ctrl+R, or Cmd+R on a Mac).
4. Run `npm test` before you open a pull request.

## Adding a new text style or a plugin

The easiest way is a plugin: one JavaScript file that adds an effect under Extra effects. See [docs/PLUGINS.md](docs/PLUGINS.md). A good plugin can later move into `app/plugins/` as a built-in style.

To add a style to the core instead:

1. In `app/engine.js`, write a generator `function* modeYourStyle(S, P, W, H, R)` that yields progress from 0 to 1 and returns `{ items }`. Each item is a glyph `{ t: 'text', s, x, y, size, font, weight, fill }` or a rectangle `{ t: 'rect', x, y, w, h, fill }`.
2. Add it to the `MODES` table in `engine.js`. If its tones drive how much ink it places, add it to `inkDriven()` too.
3. In `app/parts/01-data.js`, add an entry to `MODES` with a name, a small glyph for the tile, defaults and controls.
4. Check it on the samples, on light and dark paper, at Fast and Full quality, and export it as SVG and PDF.

## Reporting bugs

Please include your system, the app version, the steps to repeat the problem, and a screenshot. A saved project file (Export, then Save project) helps a lot.

## Code style

Plain JavaScript. No runtime dependencies without a good reason. Heavy work must yield, so slow computers never freeze. Keep the interface text short and plain.

## License of contributions

SungFluence is licensed under the GNU Affero General Public License, version 3 or later (AGPL-3.0-or-later). By sending a pull request you agree that your contribution is licensed the same way. New source files start with this line:

```
// SPDX-License-Identifier: AGPL-3.0-or-later
```

The plugin template (`app/plugins/sungfluence-plugin-template.js`) is MIT licensed on purpose, so plugin authors can pick their own license.
