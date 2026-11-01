/* ===================== Part 1: vocabulary, styles, recipes, text library ===================== */
const C = window.Sungfluence;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

/* Early private builds saved under other keys. Move that data to the current keys once. */
(function migrateStorage() {
  try {
    ['session-v3', 'library-v1', 'plugins-v1'].forEach((k) => {
      const old = localStorage.getItem('charcoal-' + k);
      if (old !== null && localStorage.getItem('sungfluence-' + k) === null) localStorage.setItem('sungfluence-' + k, old);
      if (old !== null) localStorage.removeItem('charcoal-' + k);
    });
  } catch (e) { /* storage blocked */ }
})();

const useCap = (n) => (window.claude && typeof window.claude.use === 'function') ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
const dlP = useCap('downloads');
const sampleP = useCap('sample');

const RAMPS = {
  Classic: ' .:-=+*#%@',
  Letters: ' .,:;irsXA253hMHGS#9B&@',
  Detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  Blocks: ' ░▒▓█',
  Minimal: ' .-+#'
};
const FONT_OPTS = [['sans', 'Inter'], ['condensed', 'Oswald'], ['serif', 'Playfair'], ['mono', 'JetBrains Mono'], ['typewriter', 'Special Elite'], ['naskh', 'Naskh (Arabic, Urdu)'], ['nastaliq', 'Nastaliq (Urdu)']];
const COLOR_LABEL = { ink: 'Ink', image: 'Photo', fill: 'Cell fill', tone: 'Tone', duotone: 'Duotone' };
const INKS = ['#111111', '#ffffff', '#f2efe6', '#14213d', '#c8553d', '#e8a33d'];
const PAPERS = [['#ffffff', 'White'], ['#f3efe6', 'Cream'], ['#e9e4d8', 'Stone'], ['#111113', 'Black'], ['#0b1626', 'Navy'], ['#07110b', 'Terminal']];
const SHIRTS = [['#f6f6f4', 'White'], ['#1b1b1d', 'Black'], ['#8f9096', 'Heather gray'], ['#1f2a44', 'Navy'], ['#5a1f2b', 'Maroon'], ['#d8c7a6', 'Sand']];
const PRINTS = { 'A4': [210, 297], 'A3': [297, 420], 'A2': [420, 594], 'A1': [594, 841], 'Letter': [215.9, 279.4], '16 × 20 in': [406.4, 508], '24 × 36 in': [609.6, 914.4], 'T-shirt chest 30 cm': [300, 400] };
const FRAMES = [['original', 'Original'], ['1:1', '1:1'], ['4:5', '4:5'], ['3:2', '3:2'], ['16:9', '16:9'], ['9:16', '9:16']];
const MODELS = [['rgb', 'RGB'], ['cmyk', 'CMYK'], ['ansi', '16 colors'], ['gray', 'Gray'], ['bw', 'B/W']];
const MODEL_NOTE = {
  rgb: 'Full screen color. Best for screens, social posts and photo prints.',
  cmyk: 'Preview pulls bright screen colors into what ink can print. The CMYK PDF and plates carry CMYK values from a simple conversion; ask your printer for their profile if exact color matters.',
  ansi: 'Every color snaps to the classic 16 terminal colors. ASCII layers can also export as color terminal text.',
  gray: 'Every color becomes a shade of gray. Good for laser print and newspaper.',
  bw: 'Pure black and white, no grays. Good for stamps, stencils, vinyl cutting and one-color screen print.'
};
const QUALITY = [['fast', 'Fast', 900], ['balanced', 'Balanced', 1300], ['full', 'Full', 0]];

const PASSAGE = 'every picture is a story told in letters and every letter keeps a little of the light';
const WORDS = 'sungfluence\nletters\nink\npaper\nglyph\nstory\nlight\nshadow\ntype\nline\nword\nmark';
const LINE_TEXT = 'keep going · stay curious · be kind · dream big · work hard · stay humble';

const R = (key, label, min, max, step, extra) => Object.assign({ key, label, type: 'range', min, max, step }, extra || {});
const T = (key, label, extra) => Object.assign({ key, label, type: 'toggle' }, extra || {});
const S = (key, label, options, extra) => Object.assign({ key, label, type: 'seg', options }, extra || {});
const SEL = (key, label, options, extra) => Object.assign({ key, label, type: 'select', options }, extra || {});
const TX = (key, label, extra) => Object.assign({ key, label, type: 'text' }, extra || {});
const TA = (key, label, extra) => Object.assign({ key, label, type: 'textarea' }, extra || {});
const COL = (options) => ({ key: 'color', label: 'Color', type: 'colormode', options });
const FONT = { key: 'font', label: 'Typeface', type: 'select', options: FONT_OPTS };

const MODES = {
  paths: {
    name: 'Line text', about: 'Writes your text along the lines of the Vector layer. Letters grow and shrink with the width of each line.', lines: true,
    glyph: '<svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true"><path d="M2 13c4-8 9-8 12-4s6 3 8-2" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="3" y="9" font-size="5.5" font-weight="700" fill="currentColor" transform="rotate(-24 6 9)">ABC</text></svg>',
    defaults: { text: LINE_TEXT, color: 'ink', inkColor: '#ffffff', font: 'condensed', weight: 700, upper: true, fill: 0.85, sizeFrom: 'line', size: 14, minSize: 3, maxSize: 200, tracking: 0.06, restart: false, sep: ' · ' },
    controls: [TA('text', 'Text along the lines'), { key: 'printOn', label: 'Print on', type: 'printon' }, R('fill', 'Letter height', 0.3, 1.6, 0.05, { show: (L) => L.sizeFrom !== 'fixed' }),
      S('sizeFrom', 'Letter size', [['line', 'Follow line width'], ['fixed', 'Fixed']]), R('size', 'Fixed size', 4, 60, 0.5, { show: (L) => L.sizeFrom === 'fixed' }), FONT],
    more: [COL(['ink', 'image', 'duotone']), T('restart', 'Start the text again on every line'), TX('sep', 'Separator between repeats')]
  },
  rows: {
    name: 'Text portrait', about: 'Your text in rows across the whole picture. Each letter takes the color or tone of the photo under it.', glyph: '<span style="font-family:Oswald,sans-serif;font-weight:600;letter-spacing:-.02em">ABC</span>',
    defaults: { text: PASSAGE, size: 12, color: 'image', font: 'condensed', weight: 600, upper: true, weightMod: false, sizeMod: false, saturation: 1.35, leading: 1, tracking: 0 },
    controls: [TA('text', 'Text'), R('size', 'Letter size', 5, 40, 0.5), COL(['image', 'ink', 'tone', 'duotone']), FONT, T('weightMod', 'Weight follows tone'), T('sizeMod', 'Size follows tone')],
    more: [R('leading', 'Line spacing', 0.8, 1.6, 0.05)]
  },
  flow: {
    name: 'Flow lines', about: 'Text that follows the edges and forms of the photo, like an engraving.', glyph: '<svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true"><path d="M1 4c5-4 9 4 14 0s7-1 8 0M1 9c5-4 9 4 14 0s7-1 8 0M1 14c5-4 9 4 14 0s7-1 8 0" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    defaults: { text: PASSAGE, spacing: 12, minInk: 0.15, font: 'sans', weight: 600, color: 'ink', smooth: 5, weightMod: true, sizeMod: true, tracking: 0.05 },
    controls: [TA('text', 'Text'), R('spacing', 'Line spacing', 6, 30, 0.5), R('minInk', 'Leave light areas empty', 0, 0.7, 0.01), COL(['ink', 'image', 'tone', 'duotone']), FONT],
    more: [R('smooth', 'Smoothness', 1, 14, 1), T('weightMod', 'Weight follows tone'), T('sizeMod', 'Size follows tone')]
  },
  mosaic: {
    name: 'Word mosaic', about: 'Words packed into the picture: large in calm areas, small in detailed ones.', glyph: '<b style="font-size:14px">wo</b><span style="font-size:9px">rd</span><b style="font-size:11px">s</b>',
    defaults: { words: WORDS, maxSize: 90, minSize: 6, threshold: 0.3, vertical: 0.25, font: 'sans', weight: 700, color: 'image', saturation: 1.3, detail: 0.85, density: 1, gap: 1, upper: false, order: 'seq' },
    controls: [TA('words', 'Words, one per line, most important first'), R('threshold', 'Leave light areas empty', 0, 0.9, 0.01), R('maxSize', 'Largest word', 20, 220, 1), R('minSize', 'Smallest word', 4, 30, 1), R('vertical', 'Vertical words', 0, 1, 0.05), COL(['image', 'ink', 'tone', 'duotone']), FONT],
    more: [R('detail', 'Small words in detail', 0, 1, 0.05), R('density', 'Attempts', 0.3, 3, 0.1), R('gap', 'Gap', 0, 3, 1), S('order', 'Word order', [['seq', 'In order'], ['random', 'Random']])]
  },
  grid: {
    name: 'ASCII', about: 'Classic ASCII art. Each cell gets the character whose ink best matches the tone there.', glyph: '<span style="font-family:var(--mono);font-weight:700">#%@</span>',
    defaults: { cols: 120, rampName: 'Classic', ramp: RAMPS.Classic, color: 'ink', edges: 0, dither: false },
    controls: [R('cols', 'Columns', 30, 260, 1), { key: 'rampName', label: 'Character set', type: 'ramp' }, COL(['ink', 'image', 'fill', 'tone'])],
    more: [R('edges', 'Edge strokes', 0, 1, 0.05), T('dither', 'Dither')]
  },
  unicode: {
    name: 'Braille', about: 'Braille dots or half blocks: fine detail that still copies as plain text.', glyph: '<span style="font-family:var(--mono)">⣿⣶⡆</span>',
    defaults: { style: 'braille', cols: 150, threshold: 0.5, color: 'ink' },
    controls: [S('style', 'Characters', [['braille', 'Braille dots'], ['half', 'Half blocks']]), R('cols', 'Columns', 40, 320, 1), R('threshold', 'Threshold', 0.1, 0.9, 0.01, { show: (L) => L.style === 'braille' }), COL(['ink', 'image'])],
    more: []
  },
  halftone: {
    name: 'Halftone', about: 'A halftone screen where every dot is a letter. The tone sets its size, its weight, or both.', glyph: '<b style="font-size:18px">O</b><b style="font-size:12px">o</b><b style="font-size:8px">o</b>',
    defaults: { text: 'O', cols: 80, modulate: 'size', grid: 'hex', rotate: 'none', font: 'sans', weight: 900, color: 'ink', scale: 1.35, power: 0.75 },
    controls: [TX('text', 'Glyphs'), R('cols', 'Columns', 16, 200, 1), S('modulate', 'Tone changes', [['size', 'Size'], ['weight', 'Weight'], ['both', 'Both']]), S('grid', 'Grid', [['square', 'Square'], ['hex', 'Offset']]), SEL('rotate', 'Rotation', [['none', 'Upright'], ['flow', 'Follow edges'], ['random', 'Scattered']]), COL(['ink', 'image', 'tone', 'duotone']), FONT],
    more: [R('scale', 'Glyph scale', 0.5, 2.5, 0.05), R('power', 'Tone curve', 0.3, 1.5, 0.05)]
  },
  calligram: {
    name: 'Calligram', about: 'Text poured into a shape: one or more words, a heart, a circle, a star, the dark parts of the photo, or your cutout.', glyph: '<svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 15 2 11.5 2 7.5A5 5 0 0 1 12 5a5 5 0 0 1 10 2.5c0 4-3 7.5-10 13.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 1.6"/></svg>',
    defaults: { maskSource: 'text', maskText: 'WAH', text: PASSAGE, size: 14, font: 'condensed', weight: 700, upper: true, color: 'duotone', inkColor: '#1b2a4a', inkColor2: '#c8553d', threshold: 0.5, leading: 1, tracking: 0, dir: 'auto', verseMark: 'none' },
    controls: [S('maskSource', 'Shape', [['image', 'Photo'], ['cutout', 'Cutout'], ['text', 'Word'], ['heart', 'Heart'], ['circle', 'Circle'], ['star', 'Star']]), TA('maskText', 'Shape word or words. Press Enter for a new line.', { show: (L) => L.maskSource === 'text', rows: 2 }), R('threshold', 'Photo threshold', 0.05, 0.95, 0.01, { show: (L) => L.maskSource === 'image' }), TA('text', 'Text'), R('size', 'Letter size', 5, 40, 0.5), COL(['image', 'ink', 'tone', 'duotone']), FONT],
    more: [R('leading', 'Line spacing', 0.8, 1.6, 0.05), S('dir', 'Writing', [['auto', 'Auto'], ['rtl', 'Right to left'], ['ltr', 'Left to right']]),
      SEL('verseMark', 'Mark between lines of the text', [['none', 'None, just a space'], ['۔', '۔  Urdu full stop'], ['✦', '✦  Star'], ['❁', '❁  Flower'], ['·', '·  Dot'], ['/', '/  Slash']])]
  },
  spiral: {
    name: 'Spiral', about: 'One sentence on a spiral or on rings. Letters thicken where the photo is dark.', glyph: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c0-1 1-1.6 2-1 1.6.9 1 3.6-1 4-2.8.6-4.6-2.4-3.6-4.8 1.3-3.2 6-3.8 8.2-1C20 12.6 18.6 18 14 19c-5 1.2-9.6-2.6-9.4-7.6C4.8 5.6 11 2.4 16 4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    defaults: { text: PASSAGE, path: 'spiral', spacing: 11, cx: 0.5, cy: 0.5, font: 'sans', weight: 700, color: 'ink', minScale: 0.12, weightMod: true, start: 'inside', turn: 'auto', a0: -90, r0: 0, r1: 1, tracking: 0.04 },
    controls: [TA('text', 'Text'), S('path', 'Path', [['spiral', 'Spiral'], ['rings', 'Rings']]), R('spacing', 'Ring spacing', 5, 30, 0.5),
      S('start', 'Text starts', [['inside', 'At the center'], ['outside', 'Outside']]), S('turn', 'Direction', [['auto', 'Auto'], ['cw', 'Clockwise'], ['ccw', 'Anticlockwise']]),
      { type: 'note', text: 'Drag the handles on the picture: the center, where the text starts and where it ends.' },
      COL(['ink', 'image', 'tone', 'duotone']), FONT],
    more: [R('cx', 'Center, across', 0, 1, 0.01), R('cy', 'Center, down', 0, 1, 0.01), R('r0', 'Start radius', 0, 0.95, 0.01), R('r1', 'End radius', 0.05, 1, 0.01), R('a0', 'Start angle', -180, 180, 1),
      R('minScale', 'Thinnest letters', 0, 0.6, 0.01), T('weightMod', 'Weight follows tone')]
  },
  relief: {
    name: 'Relief', about: 'Rows of text lifted by the tones, like a terrain map. Rows behind can be hidden.', glyph: '<svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true"><path d="M1 7h6l2-5 2 5h12M1 12h4l3-4 3 6 2-2h10M1 17h22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    defaults: { text: PASSAGE, spacing: 13, amp: 2.2, occlude: true, font: 'sans', weight: 600, color: 'ink', weightMod: true, sizeMod: true, tracking: 0.05 },
    controls: [TA('text', 'Text'), R('spacing', 'Row spacing', 6, 30, 0.5), R('amp', 'Lift', 0, 5, 0.1), T('occlude', 'Hide lines behind'), COL(['ink', 'image', 'tone', 'duotone']), FONT],
    more: [T('weightMod', 'Weight follows tone'), T('sizeMod', 'Size follows tone'), R('minInk', 'Skip flat parts', 0, 0.5, 0.01)]
  },
  typewriter: {
    name: 'Typewriter', about: 'Typed and overstruck characters with ribbon ink and a little wobble, like 1960s typewriter art.', glyph: '<span style="font-family:\'Special Elite\',\'Courier New\',monospace;font-size:15px">X<span style="margin-left:-.55em;opacity:.8">O</span></span>',
    defaults: { cols: 96, color: 'ink', inkColor: '#1f1d1a', wobble: 1, edges: 0.4, dither: true, leading: 1.1, curve: 1.6 },
    controls: [R('cols', 'Columns', 30, 200, 1), R('curve', 'Lightness', 0.6, 3, 0.05), R('wobble', 'Wobble and ribbon', 0, 2, 0.05), R('edges', 'Edge strokes', 0, 1, 0.05), COL(['ink', 'image', 'tone', 'duotone'])],
    more: [T('dither', 'Dither'), R('leading', 'Line feed', 0.9, 1.6, 0.05)]
  }
};
const COMMON_DEFAULTS = {
  contrast: 1, brightness: 0, gamma: 1, saturation: 1, invert: false, autoLevels: true, region: 'all', regionT: 0.5, regionShape: 'text', regionText: 'LOVE',
  opacity: 1, seed: 7, hidden: false, inkColor: null, inkColor2: '#d9732e',
  focus: 'none', focusDir: 'out', focusAffect: 'density', fx: 0.5, fy: 0.5, fr: 0.55, fs: 0.45, fa: 0, fe: 1,
  effect: 'none', effectColor: '#e4572e', jitter: 0, limitColors: 0, inkSwap: null,
  alpha: 1, alphaTone: 0, colorAvg: true, colorLift: 0, italic: false
};
const FOCUS_CTL = [
  S('focus', 'Fade shape', [['none', 'None'], ['ellipse', 'Oval'], ['circle', 'Circle'], ['vertical', 'Band'], ['horizontal', 'Column']]),
  S('focusDir', 'Strong part', [['out', 'Center'], ['in', 'Outer area']], { show: (L) => L.focus !== 'none' }),
  S('focusAffect', 'Fades', [['density', 'Density'], ['color', 'Color'], ['both', 'Both']], { show: (L) => L.focus !== 'none' }),
  { type: 'note', text: 'Drag on the picture: the dot moves the shape, the square handles change its size and softness, the round handle turns it.', show: (L) => L.focus !== 'none' },
  R('fr', 'Size', 0.05, 1.6, 0.01, { show: (L) => L.focus !== 'none' }),
  R('fe', 'Width of the oval', 0.2, 3, 0.01, { show: (L) => L.focus === 'ellipse' }),
  R('fs', 'Softness', 0.02, 1.2, 0.01, { show: (L) => L.focus !== 'none' }),
  R('fa', 'Turn', -90, 90, 1, { show: (L) => L.focus !== 'none' && L.focus !== 'circle' }),
  R('fx', 'Center, across', 0, 1, 0.01, { show: (L) => L.focus !== 'none' }),
  R('fy', 'Center, down', 0, 1, 0.01, { show: (L) => L.focus !== 'none' })
];
const EFFECT_CTL = [
  R('alpha', 'Letter opacity', 0.05, 1, 0.01),
  R('alphaTone', 'See-through in light areas', 0, 1, 0.01),
  S('effect', 'Letter effect', [['none', 'None'], ['shadow', 'Shadow'], ['outline', 'Outline'], ['riso', 'Riso offset']]),
  { key: 'effectColor', label: 'Offset ink', type: 'ink', show: (L) => L.effect === 'riso' },
  R('jitter', 'Hand-set wobble', 0, 1, 0.01),
  S('limitColors', 'Limit to inks', [[0, 'Off'], [2, '2'], [3, '3'], [4, '4'], [6, '6'], [8, '8']]),
  { key: 'palette', type: 'palette', show: (L) => L.limitColors >= 2 }
];
/* Letters: weight, spacing, italic and capitals, for the styles that set real text */
const LETTER_KEYS = {
  paths: ['weight', 'tracking', 'italic', 'upper'], rows: ['weight', 'tracking', 'italic', 'upper'], flow: ['weight', 'tracking', 'italic', 'upper'],
  mosaic: ['weight', 'italic', 'upper'], halftone: ['weight', 'italic'], calligram: ['weight', 'tracking', 'italic', 'upper'],
  spiral: ['weight', 'tracking', 'italic', 'upper'], relief: ['weight', 'tracking', 'italic', 'upper']
};
const LETTER_CTL = {
  weight: R('weight', 'Weight, from thin to bold', 100, 900, 100),
  tracking: R('tracking', 'Letter spacing', -0.1, 0.8, 0.01),
  italic: T('italic', 'Italic'),
  upper: T('upper', 'Capitals')
};
function letterControls(L, M) {
  const keys = LETTER_KEYS[L.mode] || (M && M.plugin ? ['weight', 'italic', 'upper'].filter((k) => k === 'italic' || k in M.defaults) : []);
  const list = keys.map((k) => LETTER_CTL[k]);
  if (keys.includes('weight') && L.weightMod) list.splice(1, 0, { type: 'note', text: 'Weight follows the tone now. Turn that off under More controls to set one weight.' });
  return list;
}
const COMMON_MORE = [
  R('contrast', 'Contrast', 0.4, 2.5, 0.05), R('brightness', 'Brightness', -0.4, 0.4, 0.01), R('gamma', 'Gamma', 0.4, 2.5, 0.05),
  R('saturation', 'Photo color strength', 0, 2.5, 0.05), T('invert', 'Invert tones'), T('autoLevels', 'Auto levels'),
  S('region', 'Draw on', [['all', 'All'], ['dark', 'Dark'], ['light', 'Light'], ['inside', 'In shape'], ['outside', 'Out of shape']]),
  R('regionT', 'Tone split', 0.05, 0.95, 0.01, { show: (L) => L.region === 'dark' || L.region === 'light' }),
  S('regionShape', 'Shape', [['text', 'Word'], ['heart', 'Heart'], ['circle', 'Circle'], ['star', 'Star']], { show: (L) => L.region === 'inside' || L.region === 'outside' }),
  TX('regionText', 'Shape word', { show: (L) => (L.region === 'inside' || L.region === 'outside') && L.regionShape === 'text' }),
  R('opacity', 'Layer opacity', 0, 1, 0.05), R('seed', 'Variation', 1, 99, 1)
];
/* crop: null for the whole photo, or {x, y, w, h} as fractions of the image. ratio locks the crop box shape. */
const PHOTO_DEFAULTS = { crop: null, ratio: 'free', gray: false, invert: false, brightness: 0, contrast: 1, saturation: 1, temperature: 0, tint: 0, sharpen: 0, smooth: 0, feather: 1,
  hue: 0, shadows: 0, highlights: 0, sepia: 0, vignette: 0, grain: 0, posterize: 0, threshold: 0, pixelate: 0,
  bulge: 0, twirl: 0, warpX: 0.5, warpY: 0.5, warpR: 0.5 };
const LAYER_DEFAULTS = { visible: true, opacity: 1, blend: 'normal' };
const BLENDS = [['normal', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['darken', 'Darken'], ['lighten', 'Lighten'],
  ['color-dodge', 'Color dodge'], ['color-burn', 'Color burn'], ['hard-light', 'Hard light'], ['soft-light', 'Soft light'], ['difference', 'Difference'],
  ['exclusion', 'Exclusion'], ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Color'], ['luminosity', 'Luminosity']];
const LAYER_NAMES = { text: 'Text art', lines: 'Vector', photo: 'Photo' };
const CROP_RATIOS = [['free', 'Free'], ['original', 'Original'], ['1:1', '1:1'], ['4:5', '4:5'], ['3:2', '3:2'], ['2:3', '2:3'], ['16:9', '16:9'], ['9:16', '9:16']];

/* new artboards. Sizes are in the unit shown; dpi turns inches and millimeters into pixels. */
const ARTBOARDS = [
  { name: 'Square', w: 2000, h: 2000, unit: 'px' }, { name: 'Instagram post', w: 1080, h: 1080, unit: 'px' }, { name: 'Instagram portrait', w: 1080, h: 1350, unit: 'px' },
  { name: 'Story or reel', w: 1080, h: 1920, unit: 'px' }, { name: 'YouTube thumbnail', w: 1280, h: 720, unit: 'px' }, { name: 'Full HD', w: 1920, h: 1080, unit: 'px' },
  { name: 'A4', w: 210, h: 297, unit: 'mm', dpi: 300 }, { name: 'A3', w: 297, h: 420, unit: 'mm', dpi: 300 }, { name: 'US Letter', w: 8.5, h: 11, unit: 'in', dpi: 300 },
  { name: 'Poster 18 × 24 in', w: 18, h: 24, unit: 'in', dpi: 150 }, { name: 'T-shirt print', w: 12, h: 16, unit: 'in', dpi: 200 }, { name: 'Grid 64 × 64 cells', w: 64, h: 64, unit: 'cells', cell: 24 }
];
const UNITS = [['px', 'Pixels'], ['in', 'Inches'], ['mm', 'mm'], ['cm', 'cm'], ['cells', 'Grid cells']];

/* preferences belong to this computer, not to a project */
const PREF_KEY = 'sungfluence-prefs-v1';
const PREF_DEFAULTS = { zoomSpeed: 1, zoomSmooth: true, zoomDuration: 160, wheel: 'scroll', zoomAnchor: 'cursor', zoomStep: 1.25, zoomMax: 16, zoomInvert: false, dblClick: 'toggle', pixelated: true, zoomHud: true, theme: 'system' };
const prefs = (() => { try { return Object.assign({}, PREF_DEFAULTS, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { return Object.assign({}, PREF_DEFAULTS); } })();
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* storage blocked */ } }
function applyTheme() { if (prefs.theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', prefs.theme); }
applyTheme();

/* recipes for photos; line recipes live with the Lines source */
const RECIPES = [
  { name: 'Word portrait', paper: '#111113', layers: [['rows', { size: 12 }]] },
  { name: 'Engraving', paper: '#f3efe6', layers: [['flow', { inkColor: '#14213d', spacing: 11, minInk: 0.12 }]] },
  { name: 'Relief', paper: '#111113', layers: [['relief', { inkColor: '#f2efe6' }]] },
  { name: 'Typewriter', paper: '#f3efe6', layers: [['typewriter', {}]] },
  { name: 'Word cloud', paper: '#ffffff', layers: [['mosaic', {}]] },
  { name: 'Night words', paper: '#0b0b0c', layers: [['unicode', { cols: 170, opacity: 0.4 }], ['mosaic', { region: 'dark', regionT: 0.55, threshold: 0.55, maxSize: 60, saturation: 1.5 }]] },
  { name: 'Spotlight', paper: '#111113', layers: [['rows', { size: 11, focus: 'circle', focusAffect: 'both', fr: 0.6, fs: 0.7 }]] },
  { name: 'Word window', paper: '#111113', layers: [['unicode', { cols: 170, opacity: 0.3 }], ['rows', { size: 10, region: 'inside', regionShape: 'text', regionText: 'LOVE', saturation: 1.6 }]] },
  { name: 'Terminal', paper: '#07110b', layers: [['grid', { cols: 130, rampName: 'Letters', inkColor: '#7cf29c', edges: 0.55 }]] },
  { name: 'Spiral', paper: '#ffffff', layers: [['spiral', { inkColor: '#111111', focus: 'ellipse', fr: 0.7, fs: 0.5 }]] },
  { name: 'Rings', paper: '#f3efe6', layers: [['spiral', { path: 'rings', inkColor: '#14213d' }]] },
  { name: 'Riso halftone', paper: '#fbf3e4', layers: [['halftone', { color: 'duotone', inkColor: '#1b2a4a', inkColor2: '#3d6a8a', effect: 'riso', effectColor: '#e4572e' }]] },
  { name: 'Calligram', paper: '#ffffff', layers: [['calligram', {}]] },
  { name: 'Photo cells', paper: '#000000', layers: [['grid', { cols: 90, color: 'fill' }]] },
  { name: 'Pixel blocks', paper: '#000000', layers: [['unicode', { style: 'half', cols: 72 }]] },
  { name: 'Ink + Braille', paper: '#ffffff', layers: [['unicode', { cols: 200, opacity: 0.55, inkColor: '#14213d' }], ['flow', { region: 'dark', regionT: 0.6, inkColor: '#c8553d', spacing: 13 }]] }
];

/* ---------------- the text library ---------------- */
const LIB_DEFAULT = {
  words: {
    'Positive': ['hope', 'joy', 'bright', 'kind', 'grace', 'smile', 'gratitude', 'wonder', 'calm', 'cheer', 'shine', 'bloom', 'warm', 'gentle', 'thrive', 'glow', 'delight', 'uplift'],
    'Bravery': ['courage', 'brave', 'bold', 'valor', 'fearless', 'rise', 'honor', 'grit', 'heart', 'steady', 'resolve', 'daring', 'strength', 'shield', 'endure', 'stand tall'],
    'Challenge': ['climb', 'push', 'strive', 'conquer', 'persist', 'aim', 'effort', 'focus', 'discipline', 'overcome', 'progress', 'quest', 'summit', 'drive', 'try again', 'level up'],
    'Science': ['atom', 'cell', 'energy', 'gravity', 'light', 'orbit', 'quantum', 'theory', 'data', 'experiment', 'molecule', 'wave', 'particle', 'evolution', 'genome', 'spectrum', 'entropy', 'carbon'],
    'Beauty': ['elegance', 'petal', 'silk', 'golden', 'radiant', 'harmony', 'bloom', 'velvet', 'pearl', 'dawn', 'grace', 'sparkle', 'serene', 'poise', 'delicate', 'luster'],
    'Love and family': ['love', 'care', 'heart', 'embrace', 'home', 'family', 'devotion', 'tender', 'cherish', 'together', 'warmth', 'kindness', 'mother', 'father', 'child', 'bond', 'trust', 'hug'],
    'Friendship': ['friend', 'loyal', 'laugh', 'share', 'trust', 'together', 'support', 'buddy', 'companion', 'stories', 'kindness', 'side by side', 'ally', 'cheer', 'honest', 'journey'],
    'Technology': ['code', 'pixel', 'circuit', 'signal', 'network', 'chip', 'cloud', 'robot', 'sensor', 'data', 'binary', 'algorithm', 'laser', 'fiber', 'battery', 'satellite', 'digital', 'byte'],
    'Engineering': ['design', 'load', 'force', 'gear', 'beam', 'torque', 'stress', 'system', 'model', 'build', 'measure', 'precision', 'tolerance', 'structure', 'motor', 'prototype', 'safety'],
    'Civil engineering': ['bridge', 'concrete', 'steel', 'foundation', 'column', 'girder', 'dam', 'canal', 'road', 'survey', 'rebar', 'culvert', 'levee', 'truss', 'pavement', 'aggregate', 'slope', 'drainage', 'sediment', 'hydraulics'],
    'Water and river': ['river', 'stream', 'flow', 'current', 'delta', 'rain', 'spring', 'tide', 'wave', 'brook', 'bank', 'monsoon', 'estuary', 'ripple', 'meander', 'valley', 'reservoir', 'confluence'],
    'Environment': ['earth', 'forest', 'leaf', 'seed', 'soil', 'green', 'climate', 'air', 'ocean', 'wildlife', 'recycle', 'sun', 'wind', 'roots', 'habitat', 'planet', 'clean', 'renew'],
    'Empathy': ['listen', 'understand', 'care', 'gentle', 'patience', 'comfort', 'kindness', 'compassion', 'feel', 'hold', 'mercy', 'warmth', 'presence', 'support', 'softness', 'heal'],
    'Humanity': ['people', 'dignity', 'justice', 'unity', 'hope', 'freedom', 'rights', 'share', 'help', 'equal', 'together', 'community', 'world', 'voice', 'respect', 'service'],
    'Brotherhood and sisterhood': ['brother', 'sister', 'sibling', 'kin', 'family', 'together', 'bond', 'side by side', 'loyal', 'shared', 'protect', 'laugh', 'roots', 'home', 'trust', 'union'],
    'Relationship': ['trust', 'respect', 'promise', 'listen', 'share', 'honest', 'partner', 'together', 'care', 'patience', 'loyal', 'bond', 'support', 'grow', 'home', 'understanding'],
    'Peace and soul': ['peace', 'soul', 'calm', 'breath', 'stillness', 'light', 'silence', 'serenity', 'harmony', 'inner', 'grace', 'rest', 'balance', 'spirit', 'quiet', 'dawn']
  },
  phrases: {
    'Positive': ['keep going', 'today is a gift', 'small steps every day', 'choose joy', 'you are enough', 'light finds a way', 'good things take time'],
    'Bravery': ['be brave', 'fear less, live more', 'stand tall', 'courage is a choice', 'rise again', 'be the lion'],
    'Challenge': ['never give up', 'one more step', 'progress over perfection', 'hard work pays', 'start where you are', 'aim high'],
    'Science': ['stay curious', 'question everything', 'made of stardust', 'data tells stories', 'test and learn', 'nature is the teacher'],
    'Beauty': ['simply beautiful', 'grace in motion', 'beauty in small things', 'bloom where you are planted', 'quiet elegance'],
    'Love and family': ['love is patient', 'home is where the heart is', 'made with love', 'love one another', 'family first'],
    'Friendship': ['friends for life', 'laugh together', 'true friends stay', 'better together', 'a friend is a gift'],
    'Technology': ['hello world', 'code is poetry', 'keep it simple', 'build the future', 'ship it'],
    'Engineering': ['form follows function', 'build it right', 'safety first', 'design with care', 'measure twice, cut once'],
    'Civil engineering': ['bridges connect people', 'built to last', 'strong foundations', 'water shapes the land', 'roads to everywhere'],
    'Water and river': ['go with the flow', 'rivers know the way', 'every drop counts', 'water is life', 'still waters run deep'],
    'Environment': ['protect our planet', 'plant a tree', 'leave no trace', 'think green', 'one earth'],
    'Empathy': ['listen first', 'be kind always', 'walk in their shoes', 'kindness is strength'],
    'Humanity': ['we are one', 'help one another', 'dignity for all', 'together we rise'],
    'Brotherhood and sisterhood': ['always there for you', 'family is everything', 'side by side', 'my brother, my strength', 'my sister, my friend'],
    'Relationship': ['grow together', 'trust is earned', 'home is people', 'built on respect'],
    'Peace and soul': ['breathe in, breathe out', 'peace begins within', 'be still', 'light within', 'rest is strength']
  },
  chars: {
    'Capital letters': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'Small letters': 'abcdefghijklmnopqrstuvwxyz',
    'Digits': '0123456789',
    'Binary': '01',
    'Hex': '0123456789ABCDEF',
    'Symbols': '★✦♥♠♣♦♪☀☼✿❀✴',
    'Punctuation': '.,:;!?-+=*/\\|_~^',
    'Math': '∑∫√π∞≠≈≤≥±×÷∂∇',
    'Greek': 'αβγδεζηθλμπσφψωΩΔΣ',
    'Arrows': '←↑→↓↖↗↘↙↺↻',
    'Braille': '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵⣿',
    'Blocks': '░▒▓█▀▄▌▐',
    'Urdu letters': 'ابپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنوہی'
  }
};
const LIB_KEY = 'sungfluence-library-v1';
function loadLibrary() {
  const lib = JSON.parse(JSON.stringify(LIB_DEFAULT));
  try {
    const saved = JSON.parse(localStorage.getItem(LIB_KEY) || 'null');
    if (saved) for (const kind of ['words', 'phrases', 'chars']) Object.assign(lib[kind], saved[kind] || {});
  } catch (e) { /* storage blocked: built-in sets only */ }
  return lib;
}
function saveLibrary(lib) {
  const diff = { words: {}, phrases: {}, chars: {} };
  for (const kind of ['words', 'phrases', 'chars']) for (const [name, v] of Object.entries(lib[kind])) {
    if (JSON.stringify(v) !== JSON.stringify(LIB_DEFAULT[kind][name])) diff[kind][name] = v;
  }
  try { localStorage.setItem(LIB_KEY, JSON.stringify(diff)); } catch (e) { /* ignore */ }
}
const LIB = loadLibrary();
