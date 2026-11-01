# Writing a SungFluence plugin

A plugin is one JavaScript file. It adds a new style to the Text art panel, under **Extra effects**.

## Quick start

1. In SungFluence, click **Plugins** at the top (in the desktop app you can also use the **Plugins** menu), and press **Get the template**. You can also copy `app/plugins/sungfluence-plugin-template.js`.
2. Change `id`, `name` and `icon`. The id must be unique: lowercase letters, digits and dashes.
3. Edit `render(api)`.
4. Press **Load plugin** and pick your file. The new style appears under **Style**, in **Extra effects**. The **Add effect** tile there loads a file too.
5. Change your file and load it again. A plugin with the same id replaces the old one.

`SungFluence.plugin`, with a capital F like the app name, works too. It is the same function as `Sungfluence.plugin`.

## The shape of a plugin

```js
Sungfluence.plugin({
  api: 1,
  id: 'my-style',
  name: 'My style',
  icon: 'Ab',                 // up to 3 characters on the tile
  version: '1.0.0',
  author: 'Your name',
  description: 'One sentence about what it makes.',
  usesLines: false,           // true gives render() the user's lines through api.lines()
  inkDriven: false,           // true: Focus and fade thins your ink instead of dropping letters at random
  defaults: { text: 'hello', size: 12, color: 'ink' },
  controls: [
    { key: 'text', label: 'Text', type: 'textarea' },
    { key: 'size', label: 'Letter size', type: 'range', min: 4, max: 40, step: 0.5 },
    { type: 'color', options: ['ink', 'image', 'tone', 'duotone'] }
  ],
  *render(api) {
    // place letters with api.addText(...)
    // yield a number from 0 to 1 now and then to show progress
  }
});
```

## The `api` object

| Field | What it gives |
| --- | --- |
| `W`, `H` | Artboard size in pixels. (0, 0) is the top left corner. |
| `params` | The layer's settings: your defaults plus what the user changed. |
| `scale` | Preview scale. 1 at export. `size`, `spacing`, `minSize` and `maxSize` are already scaled. |
| `random()` | Seeded random number from 0 to 1. Same seed, same picture. |
| `ink(x, y)` | 0 for empty paper, 1 for the darkest part. On dark paper the light parts get the ink. |
| `rgb(x, y)`, `hex(x, y)` | Photo color as `[r, g, b]` (0 to 1) or `'#rrggbb'`. |
| `kept(x, y)` | `false` where the user removed the background. |
| `area(x0, y0, x1, y1)` | Average `{ink, r, g, b}` over a rectangle. Fast at any size. |
| `colorAt(x, y, ink)` | The color the layer's Color setting asks for. |
| `text(options)` | Endless stream of the layer's text. Call `.next()` for one character. |
| `words()` | The text split into words or lines. |
| `measure(s, size, weight, font)` | Width of a string in pixels. |
| `lines()` | The user's lines, when `usesLines` is true: `[{pts: [[x, y, halfWidth]], closed, text}]`. |
| `grid` | The photo's tone grid `{w, h, ink, smooth(r)}` for advanced work. |
| `blur(array, w, h, r)` | Box blur for your own grids. |
| `addText(s, x, y, o)` | Draw text. `o`: `size`, `angle` (radians), `color`, `font`, `weight`, `align` (`'center'` or `'left'`), `alpha`. |
| `addRect(x, y, w, h, o)` | Draw a rectangle. `o`: `color`, `alpha`. |
| `writeAlong(paths, o)` | Write the layer's text along your own paths, like Line text. Use `yield* api.writeAlong(paths, { size })`. |

## Control types

| Type | Example |
| --- | --- |
| `range` | `{ key: 'size', label: 'Size', type: 'range', min: 4, max: 40, step: 0.5 }` |
| `toggle` | `{ key: 'upper', label: 'Capitals', type: 'toggle' }` |
| `choice` | `{ key: 'shape', label: 'Shape', type: 'choice', options: [['a', 'Round'], ['b', 'Square']] }` |
| `text`, `textarea` | `{ key: 'text', label: 'Text', type: 'textarea' }` |
| `font` | `{ type: 'font' }` |
| `color` | `{ type: 'color', options: ['ink', 'image', 'tone', 'duotone'] }` |
| `ink` | `{ key: 'accent', label: 'Accent', type: 'ink' }` |

Add `more: true` to put a control under **More controls**. Up to four choices show as buttons, more show as a list.

## What you get for free

Removed backgrounds, Focus and fade, letter effects, Limit to inks, the color models (RGB, CMYK, 16 colors, gray, black and white), undo, projects, and every export: PNG, SVG with live text, PDF and CMYK PDF.

## Rules for good plugins

- **Stay responsive.** Write `render` as `function*` and `yield` every few thousand steps. A slow laptop should never freeze.
- **Same look at every size.** Scale counts with the area (`api.W * api.H`), and sizes with `api.scale` or the `size` keys.
- **Be deterministic.** Use `api.random()`, not `Math.random()`, so the export matches the preview.
- **Use only the `api` object.** Do not touch the page, the network or storage.

## Safety

Today a plugin runs inside the page, with the same rights as SungFluence itself. Only load plugins you trust, and read the code first. A future version will run plugins in a separate worker with no access to the page.

## Sharing

Give your plugin a license (MIT is simple, and it works with the AGPL license of the app), put it on GitHub, and open an issue in the SungFluence repository to have it listed.
