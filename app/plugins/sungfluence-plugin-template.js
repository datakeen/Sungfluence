/*  SungFluence plugin template
    ========================
    A plugin adds one new style to the Text art panel.

    How to make your own:
      1. Copy this file and give it a new name, for example my-style.js
      2. Change id, name and icon below. The id must be unique.
      3. Edit render(). Keep the rest as it is.
      4. In SungFluence click Plugins at the top (or Plugins in the menu bar), then Load plugin, and pick your file.
      5. Your style now shows up under Style, in Extra effects. Change a setting and it redraws.

    Plugins run code inside SungFluence. Only load plugins you trust.
    This template is MIT licensed. Use it for anything.

    ---------------------------------------------------------------
    What render(api) gets
    ---------------------------------------------------------------
    api.W, api.H            artboard size in pixels. (0, 0) is the top left corner.
    api.params              the current settings of this layer (your defaults plus what the user changed).
                            Settings named size, spacing, minSize and maxSize are already scaled
                            for fast previews, so the preview looks like the final export.
    api.scale               preview scale (1 at export). Multiply your own pixel sizes by it.
    api.random()            a seeded random number from 0 to 1. Same seed, same picture.

    Reading the picture (x, y in artboard pixels):
    api.ink(x, y)           0 = empty paper, 1 = the darkest part. On dark paper the light parts get the ink.
    api.rgb(x, y)           [r, g, b], each 0 to 1
    api.hex(x, y)           '#rrggbb'
    api.kept(x, y)          false where the user removed the background
    api.area(x0, y0, x1, y1)  average {ink, r, g, b} over a rectangle. Fast at any size.
    api.colorAt(x, y, ink)  the color this layer's Color setting asks for (Ink, Photo, Tone or Duotone)
    api.lines()             the user's lines, if your plugin sets usesLines: true
                            [{ pts: [[x, y, halfWidth], ...], closed, text }]

    Text helpers:
    api.text()              an endless stream of the layer's text. Call .next() for one character.
    api.words()             the text split into words or lines
    api.measure(s, size, weight, font)  width of a string in pixels

    Drawing:
    api.addText(s, x, y, { size, angle, color, font, weight, align: 'center' | 'left', alpha })
                            angle is in radians. x, y is the center of the letter (or its left side).
    api.addRect(x, y, w, h, { color, alpha })
    yield* api.writeAlong(paths, { size })   writes the layer's text along your own paths,
                            the same way the Line text style does. paths: [[[x, y], [x, y], ...], ...]

    Free of charge: removed background, Focus and fade, Effects, Limit to inks, color models
    and every export (PNG, SVG, PDF, CMYK) work on plugin styles without extra code.

    Controls (the settings panel). Types:
      range   { key, label, type: 'range', min, max, step }
      toggle  { key, label, type: 'toggle' }
      choice  { key, label, type: 'choice', options: [[value, 'Label'], ...] }
      text    { key, label, type: 'text' }      textarea { key, label, type: 'textarea' }
      font    { type: 'font' }                  color    { type: 'color', options: ['ink', 'image', 'tone', 'duotone'] }
      ink     { key, label, type: 'ink' }       (a single color picker)
    Add more: true to tuck a control under "More controls".
*/

Sungfluence.plugin({
  api: 1,                         // the plugin API version this file was written for
  id: 'my-scatter',               // unique: lowercase letters, digits and dashes
  name: 'My scatter',             // shown on the style tile
  icon: 'a*b',                    // up to 3 characters shown on the tile
  version: '1.0.0',
  author: 'Your name',
  description: 'Scattered letters. Darker parts of the picture get more and bigger letters.',

  // Starting values. text, font, weight, color, upper and sep are understood by SungFluence too.
  defaults: { text: 'confetti', count: 9000, minSize: 5, maxSize: 26, spin: 0.7, power: 1.2, color: 'image', saturation: 1.3, font: 'sans', weight: 700, upper: false, sep: '' },

  controls: [
    { key: 'text', label: 'Letters to scatter', type: 'textarea' },
    { key: 'count', label: 'How many tries', type: 'range', min: 1000, max: 30000, step: 500 },
    { key: 'maxSize', label: 'Largest letter', type: 'range', min: 8, max: 90, step: 1 },
    { key: 'minSize', label: 'Smallest letter', type: 'range', min: 2, max: 30, step: 1 },
    { type: 'color', options: ['image', 'ink', 'tone', 'duotone'] },
    { type: 'font' },
    { key: 'spin', label: 'Spin', type: 'range', min: 0, max: 1, step: 0.05, more: true },
    { key: 'power', label: 'Leave light areas emptier', type: 'range', min: 0.5, max: 3, step: 0.1, more: true },
    { key: 'upper', label: 'Capitals', type: 'toggle', more: true }
  ],

  // render() runs every time a setting changes.
  // Written as function* so it can yield progress (0 to 1). That keeps slow computers responsive.
  *render(api) {
    const p = api.params;
    const letters = api.text({ sep: '' });                 // endless stream of the text
    const tries = Math.round(p.count * (api.W * api.H) / (1600 * 1600)); // same density at any size

    for (let i = 0; i < tries; i++) {
      if (i % 600 === 0) yield i / tries;                  // progress for the progress bar

      const x = api.random() * api.W;
      const y = api.random() * api.H;
      const ink = api.ink(x, y);                           // how dark the picture is here
      if (api.random() > Math.pow(ink, p.power)) continue; // light areas keep fewer letters

      let ch = letters.next();
      if (ch === ' ') ch = letters.next();
      if (ch === ' ') continue;

      api.addText(ch, x, y, {
        size: p.minSize + (p.maxSize - p.minSize) * ink,
        angle: (api.random() - 0.5) * Math.PI * p.spin,    // radians
        color: api.colorAt(x, y, ink)                      // follows the Color setting
      });
    }
  }
});
