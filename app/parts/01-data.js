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
const PALETTE_DEFAULTS = { palette: 'Ink and gold', paletteColors: null, paletteFlip: false, paletteSteps: false };
const COLOR_LABEL = { ink: 'Ink', image: 'Photo', fill: 'Cell fill', tone: 'Tone', duotone: 'Duotone', palette: 'Palette' };
const INKS = ['#111111', '#ffffff', '#f2efe6', '#14213d', '#c8553d', '#e8a33d'];
/* the warm near-black paper of the flagship look: a Word cloud in the photo's own colors */
const FLAGSHIP_PAPER = '#15120f';
/* the flagship style: first in every list of styles, and the first look of Apply text art */
const FLAGSHIP_STYLE = 'cloud';
const PAPERS = [['#ffffff', 'White'], ['#f3efe6', 'Cream'], ['#e9e4d8', 'Stone'], [FLAGSHIP_PAPER, 'Warm black'], ['#0b1626', 'Navy'], ['#07110b', 'Terminal']];
const SHIRTS = [['#f6f6f4', 'White'], ['#1b1b1d', 'Black'], ['#8f9096', 'Heather gray'], ['#1f2a44', 'Navy'], ['#5a1f2b', 'Maroon'], ['#d8c7a6', 'Sand']];
/* Print sizes in millimetres, short side first. A third value of 0 means no page margin (prints that fill the area). */
const PRINT_GROUPS = [
  ['ISO A paper', { 'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594], 'A3': [297, 420], 'A4': [210, 297], 'A5': [148, 210], 'A6': [105, 148] }],
  ['ISO B paper', { 'B3': [353, 500], 'B4': [250, 353], 'B5': [176, 250] }],
  ['US paper', { 'Letter': [215.9, 279.4], 'Legal': [215.9, 355.6], 'Tabloid 11 × 17 in': [279.4, 431.8], 'Super B 13 × 19 in': [330.2, 482.6] }],
  ['Photo prints', { '4 × 6 in': [101.6, 152.4], '5 × 7 in': [127, 177.8], '8 × 10 in': [203.2, 254], '11 × 14 in': [279.4, 355.6], '12 × 12 in': [304.8, 304.8] }],
  ['Posters', { '12 × 18 in': [304.8, 457.2], '16 × 20 in': [406.4, 508], '18 × 24 in': [457.2, 609.6], '24 × 36 in': [609.6, 914.4], '50 × 70 cm': [500, 700], '70 × 100 cm': [700, 1000] }],
  ['Clothes and small things', { 'T-shirt chest 30 cm': [300, 400, 0], 'T-shirt full front 12 × 16 in': [304.8, 406.4, 0], 'Left chest 4 × 4 in': [101.6, 101.6, 0], 'Sticker 3 × 3 in': [76.2, 76.2, 0], 'Business card 85 × 55 mm': [55, 85, 0] }]
];
const PRINTS = Object.assign({}, ...PRINT_GROUPS.map((g) => g[1]));
const CUSTOM_PRINT = 'Custom size';
const DPI_PRESETS = [[72, '72'], [150, '150'], [300, '300'], [600, '600']];
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
const WORDS = 'family\nlove\nhome\ntogether\ncare\nheart\ntrust\nwarmth\nbond\nhug\ncherish\nkindness\nmother\nfather\nchild\nroots';
const LINE_TEXT = 'keep going · stay curious · be kind · dream big · work hard · stay humble';

const R = (key, label, min, max, step, extra) => Object.assign({ key, label, type: 'range', min, max, step }, extra || {});
const T = (key, label, extra) => Object.assign({ key, label, type: 'toggle' }, extra || {});
const S = (key, label, options, extra) => Object.assign({ key, label, type: 'seg', options }, extra || {});
const SEL = (key, label, options, extra) => Object.assign({ key, label, type: 'select', options }, extra || {});
const TX = (key, label, extra) => Object.assign({ key, label, type: 'text' }, extra || {});
const TA = (key, label, extra) => Object.assign({ key, label, type: 'textarea' }, extra || {});
/* Sliders measured in artboard pixels also get a box to type an exact value, because the top of the
   slider is a comfortable value, not a limit. The box goes five times higher. */
const PX_CTL = ['size', 'spacing', 'maxSize', 'minSize', 'shapeOutline'];
/* Those sizes in the style defaults and the recipes are set for an artboard this wide. A new layer keeps
   that width in pxW, and its sizes grow and shrink with the artboard, so it looks the same at any width.
   A size set by hand stays as it is (pxW becomes null), and so do layers from older projects. */
const BASE_W = 1600;
const hardMaxOf = (c) => c.hardMax ?? (PX_CTL.includes(c.key) ? c.max * 5 : c.max);
const typedCtl = (c) => c.type === 'range' && (c.num || PX_CTL.includes(c.key));
/* under the words box of Word mosaic and Word cloud */
const WORDS_HINT = { text: 'One per line, most important first.', more: 'Add ": 5" after a word to make it count five times, so it comes out bigger and more often.' };
const COL = (options) => ({ key: 'color', label: 'Color', type: 'colormode', options });
const FONT = { key: 'font', label: 'Typeface', type: 'select', options: FONT_OPTS };

/* Tone shaping for the styles built on a grid of cells (ASCII, Braille, Halftone) */
const TONE_CTL = [
  R('localContrast', 'Local contrast', 0, 2, 0.05),
  R('paperKnee', 'Leave light areas empty', 0, 0.5, 0.01),
  R('toneGamma', 'Tone curve', 0.5, 2.5, 0.05)
];
const MODES = {
  // Word cloud is the flagship style of SungFluence: it comes first wherever the styles are listed
  cloud: {
    name: 'Word cloud', about: 'Your words packed inside a shape, biggest first, so the outline of the shape still reads. The signature style of SungFluence.',
    glyph: '<svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true"><path d="M4 13c-2 0-3-1.4-3-3s1.4-3 3-3c.3-2.3 2.2-4 4.5-4 2 0 3.7 1.3 4.3 3 .4-.2.8-.3 1.2-.3 1.7 0 3 1.3 3 3h.5c2 0 3.5 1.5 3.5 3.3S19.5 15 17.5 15H4z" fill="none" stroke="currentColor" stroke-width="1.3"/><text x="6" y="12.6" font-size="5.5" font-weight="700" fill="currentColor">word</text></svg>',
    defaults: { words: WORDS, maskSource: 'image', maskText: 'LOVE', threshold: 0.45, maskInvert: false, maskSmooth: 6, minPiece: 0.003, edgePiece: 0, margin: 0, maxSize: 110, minSize: 10, step: 0.85, cell: 3, cloudGrid: 300, gap: 1, density: 1, spill: 0,
      rotSet: [0], rotAngle: 0, rotTilt: 0, gradient: 'center', gradientAmount: 0.8, shapeOutline: 0, shapeColor: '#111113', shapeTidy: true, skipFiller: false,
      font: 'sans', weight: 700, upper: false, color: 'image', saturation: 1.25 },
    controls: [TA('words', 'Words', { hint: WORDS_HINT }),
      S('maskSource', 'Shape', [['image', 'Photo'], ['detail', 'Detailed parts of the photo'], ['cutout', 'Cutout'], ['text', 'Word'], ['heart', 'Heart'], ['circle', 'Circle'], ['star', 'Star'], ['vector', 'Vector shapes']]),
      TA('maskText', 'Shape word or words. Press Enter for a new line.', { show: (L) => L.maskSource === 'text', rows: 2 }),
      R('threshold', 'Photo threshold', 0.05, 0.95, 0.01, { show: (L) => L.maskSource === 'image' || L.maskSource === 'detail' }),
      T('maskInvert', 'Swap the shape and the space around it', { show: (L) => L.maskSource === 'image' || L.maskSource === 'detail' }),
      R('maxSize', 'Largest word', 20, 300, 1), R('minSize', 'Smallest word', 3, 40, 1),
      { key: 'rotSet', label: 'Turn each word', type: 'angles', options: [-90, -45, 0, 45, 90, 180] },
      R('rotAngle', 'Overall turn', -180, 180, 1), R('rotTilt', 'Tilt at random', 0, 90, 1),
      SEL('gradient', 'Bigger words', [['none', 'Everywhere the same'], ['center', 'Toward the middle'], ['edge', 'Toward the edge'], ['dark', 'On the dark parts'], ['light', 'On the light parts']]),
      R('gradientAmount', 'How strongly', 0, 1, 0.05, { show: (L) => L.gradient !== 'none' }),
      COL(['image', 'ink', 'tone', 'duotone', 'palette']), FONT],
    more: [{ type: 'note', text: 'Silhouette' },
      R('shapeOutline', 'Shape outline', 0, 24, 1),
      { key: 'shapeColor', label: 'Outline color', type: 'ink', show: (L) => L.shapeOutline > 0 },
      { type: 'note', live: (L) => { const R = L.shapeOutline > 0 && outOf(L); return R && R.stats && R.stats.outlineOff ? 'This shape read from the photo is too ragged for a clean outline, so it is left off. Smooth the shape more, or pick another shape.' : ''; } },
      R('maskSmooth', 'Smooth the shape', 0, 10, 0.5, { show: (L) => L.maskSource === 'image' || L.maskSource === 'detail' }),
      T('shapeTidy', 'Tidy the shape: one clean piece, clear of the edges', { show: (L) => L.maskSource === 'image' || L.maskSource === 'detail' }),
      { type: 'note', live: (L) => { const R = (L.maskSource === 'image' || L.maskSource === 'detail') && outOf(L); return R && R.stats && R.stats.fellBack ? 'This photo has no clear shape to read, so the words fill an oval. Try Detailed parts of the photo, another threshold, or another shape.' : ''; } },
      R('minPiece', 'Leave out small pieces', 0, 0.1, 0.005, { show: (L) => ['image', 'detail', 'cutout'].includes(L.maskSource) }),
      R('margin', 'Margin of paper', 0, 0.2, 0.01),
      R('density', 'Attempts', 0.3, 3, 0.1), R('gap', 'Gap', 0, 3, 1), R('spill', 'Allowed to spill out', 0, 0.3, 0.01), T('upper', 'Capitals'), T('skipFiller', 'Leave out filler words such as the, and, of')]
  },
  paths: {
    name: 'Line text', about: 'Writes your text along the lines of the Vector layer. Letters grow and shrink with the width of each line.', lines: true,
    glyph: '<svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true"><path d="M2 13c4-8 9-8 12-4s6 3 8-2" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="3" y="9" font-size="5.5" font-weight="700" fill="currentColor" transform="rotate(-24 6 9)">ABC</text></svg>',
    defaults: { text: LINE_TEXT, color: 'ink', inkColor: null, font: 'condensed', weight: 700, upper: true, fill: 0.85, sizeFrom: 'line', size: 14, minSize: 7, maxSize: 48, tracking: 0.06, restart: false, sep: ' · ' },
    controls: [TA('text', 'Text'), { key: 'printOn', label: 'Letters', type: 'printon' }, R('fill', 'Letter height', 0.3, 1.6, 0.05, { show: (L) => L.sizeFrom !== 'fixed' }),
      S('sizeFrom', 'Letter size', [['line', 'Follow line width'], ['fixed', 'Fixed']]), R('size', 'Fixed size', 4, 60, 0.5, { show: (L) => L.sizeFrom === 'fixed' }), FONT],
    more: [COL(['ink', 'image', 'duotone', 'palette']), T('restart', 'Start the text again on every line'), TX('sep', 'Separator between repeats')]
  },
  rows: {
    name: 'Text portrait', about: 'Your text in rows across the whole picture. Each letter shows the photo inside it, so the picture reads even with big letters.', glyph: '<span style="font-family:Oswald,sans-serif;font-weight:600;letter-spacing:-.02em">ABC</span>',
    defaults: { text: PASSAGE, size: 24, color: 'image', font: 'condensed', weight: 800, upper: true, weightMod: true, sizeMod: false, saturation: 1.35, minInk: 0.08, leading: 0.92, tracking: 0, letterFill: 'photo' },
    controls: [TA('text', 'Text'), R('size', 'Letter size', 6, 80, 0.5), COL(['image', 'ink', 'tone', 'duotone', 'palette']), FONT, T('weightMod', 'Weight follows tone'), T('sizeMod', 'Size follows tone')],
    more: [R('leading', 'Line spacing', 0.8, 1.6, 0.05)]
  },
  flow: {
    name: 'Flow lines', about: 'Text that follows the edges and forms of the photo, like an engraving.', glyph: '<svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true"><path d="M1 4c5-4 9 4 14 0s7-1 8 0M1 9c5-4 9 4 14 0s7-1 8 0M1 14c5-4 9 4 14 0s7-1 8 0" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    defaults: { text: PASSAGE, size: 15, autoSpace: true, lineGap: 1.1, spacing: 12, minInk: 0.2, font: 'sans', weight: 600, color: 'ink', smooth: 5, weightMod: true, sizeMod: true, sizeFloor: 0.55, tracking: 0.05 },
    controls: [TA('text', 'Text'), R('size', 'Letter size', 3, 80, 0.5), T('autoSpace', 'Keep the lines clear of each other', { rebuild: () => buildPanel() }),
      R('spacing', 'Line spacing', 6, 60, 0.5, { show: (o) => !o.autoSpace }), R('minInk', 'Leave light areas empty', 0, 0.7, 0.01), COL(['ink', 'image', 'tone', 'duotone', 'palette']), FONT],
    more: [R('lineGap', 'Room between the lines', 0.9, 3, 0.05, { show: (o) => o.autoSpace !== false }), R('smooth', 'Smoothness', 1, 14, 1), T('weightMod', 'Weight follows tone'), T('sizeMod', 'Size follows tone'),
      R('sizeFloor', 'Smallest letters, as a share of the size', 0.2, 1, 0.05, { show: (o) => o.sizeMod !== false })]
  },
  mosaic: {
    name: 'Word mosaic', about: 'Words packed into the picture: large in calm areas, small in detailed ones.', glyph: '<b style="font-size:14px">wo</b><span style="font-size:9px">rd</span><b style="font-size:11px">s</b>',
    defaults: { words: WORDS, maxSize: 64, minSize: 10, ratio: 5, step: 0.84, threshold: 0.3, vertical: 0.25, font: 'sans', weight: 700, color: 'image', saturation: 1.3, detail: 0.85, density: 1, gap: 1, upper: false, order: 'seq', skipFiller: false },
    controls: [TA('words', 'Words', { hint: WORDS_HINT }), R('threshold', 'Leave light areas empty', 0, 0.9, 0.01), R('maxSize', 'Largest word', 20, 220, 1), R('minSize', 'Smallest word', 4, 30, 1), R('vertical', 'Vertical words', 0, 1, 0.05), COL(['image', 'ink', 'tone', 'duotone', 'palette']), FONT],
    more: [R('ratio', 'Size range, largest to smallest', 2, 12, 0.5), R('detail', 'Small words in detail', 0, 1, 0.05), R('density', 'Attempts', 0.3, 3, 0.1), R('gap', 'Gap', 0, 3, 1), S('order', 'Word order', [['seq', 'In order'], ['random', 'By weight, at random']]), T('skipFiller', 'Leave out filler words such as the, and, of')]
  },
  grid: {
    name: 'ASCII', about: 'Classic ASCII art. Each cell gets the character whose ink best matches the tone there.', glyph: '<span style="font-family:var(--mono);font-weight:700">#%@</span>',
    defaults: { cols: 160, rampName: 'Classic', ramp: RAMPS.Classic, color: 'ink', edges: 0, dither: false, localContrast: 0.5, paperKnee: 0.1, toneGamma: 1.15 },
    controls: [R('cols', 'Columns (fewer means bigger letters)', 30, 260, 1), { key: 'rampName', label: 'Character set', type: 'ramp' }, COL(['ink', 'image', 'fill', 'tone', 'palette'])],
    more: [R('edges', 'Edge strokes', 0, 1, 0.05), T('dither', 'Dither')].concat(TONE_CTL)
  },
  unicode: {
    name: 'Braille', about: 'Braille dots or half blocks: fine detail that still copies as plain text.', glyph: '<span style="font-family:var(--mono)">⣿⣶⡆</span>',
    defaults: { style: 'braille', cols: 150, threshold: 0.5, color: 'ink', localContrast: 0.8, paperKnee: 0.12, toneGamma: 1.1 },
    controls: [S('style', 'Characters', [['braille', 'Braille dots'], ['half', 'Half blocks']]), R('cols', 'Columns (fewer means bigger dots)', 40, 320, 1), R('threshold', 'Threshold', 0.1, 0.9, 0.01, { show: (L) => L.style === 'braille' }), COL(['ink', 'image', 'palette'])],
    more: TONE_CTL.map((c) => Object.assign({}, c, { show: (L) => L.style !== 'half' }))
  },
  halftone: {
    name: 'Halftone', about: 'A halftone screen where every dot is a letter. The tone sets its size, its weight, or both.', glyph: '<b style="font-size:18px">O</b><b style="font-size:12px">o</b><b style="font-size:8px">o</b>',
    defaults: { text: 'O', cols: 80, modulate: 'size', grid: 'hex', rotate: 'none', font: 'sans', weight: 900, color: 'ink', scale: 1.35, power: 0.75, localContrast: 0.8, paperKnee: 0.12, toneGamma: 1.1, minDot: 0.18, chromaDot: 0 },
    controls: [TX('text', 'Characters'), R('cols', 'Columns (fewer means bigger letters)', 16, 200, 1), R('scale', 'Letter size', 0.5, 2.5, 0.05), S('modulate', 'Tone changes', [['size', 'Size'], ['weight', 'Weight'], ['both', 'Both']]), S('grid', 'Grid', [['square', 'Square'], ['hex', 'Offset']]), SEL('rotate', 'Rotation', [['none', 'Upright'], ['flow', 'Follow edges'], ['random', 'Scattered']]), COL(['ink', 'image', 'tone', 'duotone', 'palette']), FONT],
    more: [R('power', 'Dot size curve', 0.3, 1.5, 0.05), R('minDot', 'Smallest dot', 0, 0.6, 0.01), R('chromaDot', 'Dots for bright colors', 0, 1, 0.05)].concat(TONE_CTL)
  },
  calligram: {
    name: 'Calligram', about: 'Text poured into a shape: the subject of your photo, one or more words, a heart, a circle or a star.', glyph: '<svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 1.5a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM2.5 21c0-5.2 4.2-8 9.5-8s9.5 2.8 9.5 8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 1.6"/></svg>',
    defaults: { maskSource: 'auto', maskText: 'WAH', text: PASSAGE, size: 22, font: 'condensed', weight: 700, upper: true, color: 'tone', inkColor: '#1b2a4a', inkColor2: '#c8553d', threshold: 0.5, leading: 1, tracking: 0, dir: 'auto', verseMark: 'none' },
    controls: [S('maskSource', 'Shape', [['auto', 'Subject'], ['image', 'Photo'], ['cutout', 'Cutout'], ['text', 'Word'], ['heart', 'Heart'], ['circle', 'Circle'], ['star', 'Star'], ['vector', 'Vector shapes']]), TA('maskText', 'Shape word or words. Press Enter for a new line.', { show: (L) => L.maskSource === 'text', rows: 2 }), R('threshold', 'Photo threshold', 0.05, 0.95, 0.01, { show: (L) => L.maskSource === 'image' }), TA('text', 'Text'), R('size', 'Letter size', 6, 80, 0.5), COL(['image', 'ink', 'tone', 'duotone', 'palette']), FONT],
    more: [R('leading', 'Line spacing', 0.8, 1.6, 0.05), S('dir', 'Writing', [['auto', 'Auto'], ['rtl', 'Right to left'], ['ltr', 'Left to right']]),
      SEL('verseMark', 'Mark between lines of the text', [['none', 'None, just a space'], ['۔', '۔  Urdu full stop'], ['✦', '✦  Star'], ['❁', '❁  Flower'], ['·', '·  Dot'], ['/', '/  Slash']])]
  },
  spiral: {
    name: 'Spiral', about: 'One sentence on a spiral or on rings. Letters thicken where the photo is dark.', glyph: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c0-1 1-1.6 2-1 1.6.9 1 3.6-1 4-2.8.6-4.6-2.4-3.6-4.8 1.3-3.2 6-3.8 8.2-1C20 12.6 18.6 18 14 19c-5 1.2-9.6-2.6-9.4-7.6C4.8 5.6 11 2.4 16 4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    defaults: { text: PASSAGE, path: 'spiral', spacing: 18, cx: 0.5, cy: 0.5, scale: 1.3, font: 'sans', weight: 700, color: 'ink', minScale: 0.3, minInk: 0.12, weightMod: true, start: 'inside', turn: 'auto', a0: -90, r0: 0, r1: 1, disc: true, calmCenter: 3, shortRuns: 4, pop: 0.5, tracking: 0.04 },
    controls: [TA('text', 'Text'), S('path', 'Path', [['spiral', 'Spiral'], ['rings', 'Rings']]), R('scale', 'Letter size', 0.4, 2.4, 0.05), R('spacing', 'Ring spacing', 5, 50, 0.5),
      S('start', 'Text starts', [['inside', 'At the center'], ['outside', 'Outside']]), S('turn', 'Direction', [['auto', 'Auto'], ['cw', 'Clockwise'], ['ccw', 'Anticlockwise']]),
      { type: 'note', text: 'Drag the handles on the picture.', more: 'They set the center, where the text starts and where it ends.' },
      COL(['ink', 'image', 'tone', 'duotone', 'palette']), FONT],
    more: [R('cx', 'Center, across', 0, 1, 0.01), R('cy', 'Center, down', 0, 1, 0.01), R('r0', 'Start radius', 0, 0.95, 0.01), R('r1', 'End radius', 0.05, 1, 0.01), T('disc', 'Round, inside the picture'), R('a0', 'Start angle', -180, 180, 1),
      R('calmCenter', 'Fade the middle turns', 0, 8, 0.5), R('shortRuns', 'Leave out pieces shorter than this many letters', 0, 12, 1),
      R('pop', 'Tone contrast', 0, 1, 0.05), R('minScale', 'Thinnest letters', 0, 0.6, 0.01), R('minInk', 'Leave light areas empty', 0, 0.5, 0.01), T('weightMod', 'Weight follows tone')]
  },
  relief: {
    name: 'Relief', about: 'Rows of text lifted by the tones, like a terrain map. Rows behind can be hidden.', glyph: '<svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true"><path d="M1 7h6l2-5 2 5h12M1 12h4l3-4 3 6 2-2h10M1 17h22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    defaults: { text: PASSAGE, spacing: 11, scale: 1.1, amp: 1.2, occlude: true, font: 'sans', weight: 600, color: 'ink', weightMod: true, sizeMod: true, minInk: 0.14, pop: 0.5, toneGamma: 0.7, sizeFloor: 0.45, tracking: 0.05 },
    controls: [TA('text', 'Text'), R('scale', 'Letter size', 0.4, 2.4, 0.05), R('spacing', 'Row spacing', 6, 50, 0.5), R('amp', 'Lift', 0, 5, 0.1), T('occlude', 'Hide lines behind'), COL(['ink', 'image', 'tone', 'duotone', 'palette']), FONT],
    more: [R('pop', 'Tone contrast', 0, 1, 0.05), R('toneGamma', 'Tone curve', 0.4, 1.5, 0.05), R('minInk', 'Leave light areas empty', 0, 0.5, 0.01), T('weightMod', 'Weight follows tone'), T('sizeMod', 'Size follows tone'),
      R('sizeFloor', 'Smallest letters, as a share of the size', 0.2, 1, 0.05, { show: (o) => o.sizeMod !== false })]
  },
  typewriter: {
    name: 'Typewriter', about: 'Typed and overstruck characters with ribbon ink and a little wobble, like 1960s typewriter art.', glyph: '<span style="font-family:\'Special Elite\',\'Courier New\',monospace;font-size:19px;line-height:1;letter-spacing:-.02em">Aa</span>',
    defaults: { cols: 170, color: 'ink', inkColor: '#1f1d1a', wobble: 1, edges: 0.15, dither: false, leading: 1.1, curve: 1.2, strikes: 2, localContrast: 0.6, paperKnee: 0.1 },
    controls: [R('cols', 'Columns (fewer means bigger letters)', 30, 200, 1), R('wobble', 'Wobble and ribbon', 0, 2, 0.05), COL(['ink', 'image', 'tone', 'duotone', 'palette'])],
    more: [R('edges', 'Edge strokes', 0, 1, 0.05), T('dither', 'Dither'), TONE_CTL[0], TONE_CTL[1], R('curve', 'Tone curve', 0.6, 3, 0.05), R('strikes', 'Most characters typed on one spot', 1, 5, 1), R('leading', 'Line feed', 0.9, 1.6, 0.05)]
  }
};
const COMMON_DEFAULTS = {
  contrast: 1, brightness: 0, gamma: 1, saturation: 1, invert: false, autoLevels: true, region: 'all', regionT: 0.5, regionShape: 'text', regionText: 'LOVE',
  opacity: 1, seed: 7, hidden: false, inkColor: null, inkColor2: '#d9732e',
  focus: 'none', focusDir: 'out', focusAffect: 'both', fx: 0.5, fy: 0.5, fr: 0.8, fs: 0.7, fa: 0, fe: 1,
  effect: 'none', effectColor: '#e4572e', shadowFrom: 'paper', shadowColor: '#1b1b1b', shadowAlpha: 0.45, risoTone: true, jitter: 0, limitColors: 0, inkSwap: null,
  alpha: 1, alphaTone: 0, colorAvg: true, colorFit: 'gentle', italic: false,
  palette: 'Ink and gold', paletteColors: null, paletteFlip: false, paletteSteps: false,
  turn: 'none', turnSet: [0], turnAngle: 0, turnTilt: 0, turnSplit: false, emph: true, mirror: 'none', textScale: 1,
  letterFill: 'ink', fillShow: 1, fillSoft: 0.012, fillSheet: null, fillCutSoft: false, fillPop: 0.3, fillSheetSee: 0.85
};
/* One control for every style: makes all the letters of the layer bigger or smaller, evenly */
const TEXT_SCALE = R('textScale', 'Text size', 0.5, 3, 0.05);
/* Settings added after a style first shipped, with the values that keep an older project looking as it
   did. A project is read through these before the new defaults fill in what it lacks. */
const LEGACY_DEFAULTS = {
  grid: { localContrast: 0, paperKnee: 0, toneGamma: 1, cols: 120 },
  unicode: { localContrast: 0, paperKnee: 0, toneGamma: 1 },
  halftone: { localContrast: 0, paperKnee: 0, toneGamma: 1, minDot: 0 },
  flow: { sizeFloor: 0.35 },
  rows: { letterFill: 'ink' },
  calligram: { maskSource: 'heart', color: 'duotone', threshold: 0.5 },
  spiral: { disc: false, calmCenter: 0, shortRuns: 0, pop: 0, scale: 1.15, minScale: 0.22 },
  relief: { pop: 0, toneGamma: 1, sizeFloor: 0.35, spacing: 16, scale: 0.9, amp: 2.2 },
  typewriter: { cols: 96, edges: 0.4, curve: 1.6, strikes: 5, localContrast: 0, paperKnee: 0, dither: true },
  cloud: { shapeTidy: false, cloudGrid: 0 }
};
/* Settings every style gained later, with the values that keep older projects as they were: colors that fit
   the paper came in 3.4.0, so older layers keep their exact colors (newLayer turns the old colorLift into it),
   and letter sizes that follow the artboard width came in 3.4.0 too, so older layers keep theirs in pixels.
   Later still: the softer fade (Both, a wider shape), a shadow that is a darker see-through copy of the
   letters (older layers keep the shadow in the offset ink, at full strength), a Riso offset that follows the
   tone of each letter, and a Cut out sheet that lets a little of the photo through */
const LEGACY_COMMON = { colorFit: 'off', pxW: null, focusAffect: 'density', fr: 0.55, fs: 0.45, shadowFrom: 'color', shadowColor: null, shadowAlpha: 1, risoTone: false, fillSheetSee: 0 };
const legacyFor = (mode) => Object.assign({}, LEGACY_COMMON, LEGACY_DEFAULTS[mode] || {});
/* Colors that fit the paper: one setting for every style and plugin */
const FIT_CTL = S('colorFit', 'Fit colors to the paper', [['off', 'Off'], ['gentle', 'Gentle'], ['strong', 'Strong']]);
/* the shared Turn is on for 'each' and 'flow'. Spiral keeps its own direction under the same key (auto, cw, ccw), which is not a turn */
const turnOn = (L) => L.turn === 'each' || L.turn === 'flow';
const TURN_CTL = [
  S('turn', 'Turn the pieces', [['none', 'Not at all'], ['each', 'Each one'], ['flow', 'Along the picture']]),
  { key: 'turnSet', label: 'Angles', type: 'angles', options: [-90, -45, 0, 45, 90, 180], show: (L) => L.turn === 'each' },
  R('turnAngle', 'Overall turn', -180, 180, 1, { show: turnOn }),
  R('turnTilt', 'Tilt at random', 0, 90, 1, { show: turnOn }),
  T('turnSplit', 'Break lines and words into single letters first', { show: turnOn }),
  { type: 'note', text: 'Each piece turns where it stands.', more: 'The picture keeps its shape. Whether a piece is a letter, a word or a whole line depends on the style. Urdu and Arabic words are never broken into letters, because their letters join.', show: turnOn }
];
/* Letter fill: the letters as a window onto the photo. The fill is laid on when the letters are drawn,
   so it works the same in every style, plugins too, and the layout of the letters does not change. */
const fillCut = (L) => L.letterFill === 'cut';
const FILL_CTL = [
  S('letterFill', 'Letters show', [['ink', 'Ink colors'], ['photo', 'The photo'], ['soft', 'A soft photo'], ['cut', 'Cut out']]),
  T('fillCutSoft', 'Soft photo in the holes', { show: fillCut, rebuild: () => buildPanel() }),
  R('fillSoft', 'Softness', 0.002, 0.05, 0.001, { show: (L) => L.letterFill === 'soft' || (fillCut(L) && L.fillCutSoft) }),
  { key: 'fillSheet', label: 'Sheet', type: 'ink', show: fillCut },
  R('fillSheetSee', 'Photo in the sheet', 0, 1, 0.01, { show: fillCut }),
  R('fillShow', 'How much shows', 0, 1, 0.01, { show: (L) => L.letterFill && L.letterFill !== 'ink' }),
  R('fillPop', 'Photo strength', 0, 1, 0.01, { show: (L) => L.letterFill && L.letterFill !== 'ink' }),
  { type: 'note', text: 'The photo shows through the letters.', more: 'Bold, heavy letters show more of it: try a weight of 800 or more, or bigger text. At 0% the letters let the background through.', show: (L) => L.letterFill && L.letterFill !== 'ink' && !fillCut(L) },
  { type: 'note', text: 'The letters are holes in a sheet.', more: 'The photo shows through them. The sheet holds the photo too, in a deep tone, so the letters stand out and the whole picture reads. Where the photo is as light as the paper, the sheet stays light. At 0% Photo in the sheet, the sheet is one plain color. When How much shows is at 0%, the holes show the background.', show: fillCut }
];
const MIRROR_WRITING = [['none', 'Not at all'], ['letter', 'Each letter, where it stands'], ['word', 'Each word'], ['line', 'Each line']];
const MIRROR_CTL = [
  S('mirror', 'Mirror the writing', MIRROR_WRITING),
  { type: 'note', text: 'Turns the letters of this layer around.', more: 'It lays the art out again, so the picture keeps its shape. Each letter: every letter turns on the spot. Each word: every word also reads backwards. Each line: the whole line reads from right to left. Urdu and Arabic words stay whole.' }
];
const MIRROR_ALL_NOTE = { text: 'Flips the finished picture, like a mirror.', more: 'Mirror the whole text art flips the picture with all its layers. Use it for an iron-on T-shirt transfer, so the print reads the right way round once it is pressed on. Every export carries it.' };
const FOCUS_CTL = [
  S('focus', 'Fade shape', [['none', 'None'], ['ellipse', 'Oval'], ['circle', 'Circle'], ['vertical', 'Band'], ['horizontal', 'Column']]),
  S('focusDir', 'Strong part', [['out', 'Center'], ['in', 'Outer area']], { show: (L) => L.focus !== 'none' }),
  S('focusAffect', 'Fades', [['density', 'Density'], ['color', 'Color'], ['both', 'Both']], { show: (L) => L.focus !== 'none' }),
  { type: 'note', text: 'Drag the shape on the picture.', more: 'The dot moves the shape, the square handles change its size and softness, and the round handle turns it.', show: (L) => L.focus !== 'none' },
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
  S('shadowFrom', 'Shadow color', [['paper', 'From the paper'], ['letters', 'Darker letters'], ['color', 'One color']], { show: (L) => L.effect === 'shadow' }),
  { key: 'shadowColor', label: 'Shadow', type: 'ink', show: (L) => L.effect === 'shadow' && L.shadowFrom === 'color' },
  R('shadowAlpha', 'Shadow strength', 0.05, 1, 0.01, { show: (L) => L.effect === 'shadow' }),
  R('jitter', 'Hand-set wobble', 0, 1, 0.01),
  S('limitColors', 'Limit to inks', [[0, 'Off'], [2, '2'], [3, '3'], [4, '4'], [6, '6'], [8, '8']]),
  { key: 'palette', type: 'palette', show: (L) => L.limitColors >= 2 },
  // for a style with no Color control of its own (some plugins); the others show it under Color
  Object.assign({}, FIT_CTL, { show: (L) => !MODES[L.mode] || !MODES[L.mode].controls.concat(MODES[L.mode].more || []).some((c) => c.type === 'colormode') })
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
  // while the weight follows the tone, one weight would do nothing, so the note takes the slider's place
  const list = keys.map((k) => k === 'weight' && L.weightMod ? { type: 'note', text: 'Weight follows the tone now. To set one weight, turn off Weight follows tone.' } : LETTER_CTL[k]);
  return list;
}
/* Marks: **bold** and the like, typed in the text. The switch and a "?" for this note sit under the text box. */
const MARKS_CTL = T('emph', 'Marks change the words', { rebuild: () => buildPanel() });
const MARKS_NOTE = { text: 'Type **bold**, *italic* or __a line under__.', more: 'Also ^big^, ~small~, or [a word]{#c0392b} for a color. Start a line with # for big or > for a quote. A mark only counts when its partner is on the same line, and a backslash keeps it as an ordinary character.' };
/* Shape: where the letters go */
const DRAW_ON_CTL = [
  S('region', 'Draw on', [['all', 'All'], ['dark', 'Dark'], ['light', 'Light'], ['inside', 'In shape'], ['outside', 'Out of shape']]),
  R('regionT', 'Tone split', 0.05, 0.95, 0.01, { show: (L) => L.region === 'dark' || L.region === 'light' }),
  S('regionShape', 'Shape', [['text', 'Word'], ['heart', 'Heart'], ['circle', 'Circle'], ['star', 'Star']], { show: (L) => L.region === 'inside' || L.region === 'outside' }),
  TX('regionText', 'Shape word', { show: (L) => (L.region === 'inside' || L.region === 'outside') && L.regionShape === 'text' })
];
/* Tone: how this layer reads the photo. The Photo panel changes the picture itself, for every layer. */
const TONE_SHARED_CTL = [
  R('contrast', 'Contrast', 0.4, 2.5, 0.05), R('brightness', 'Brightness', -0.4, 0.4, 0.01), R('gamma', 'Gamma', 0.4, 2.5, 0.05),
  R('saturation', 'Photo color strength', 0, 2.5, 0.05, { show: (L) => L.color !== 'image' }), T('invert', 'Invert tones'), T('autoLevels', 'Auto levels')
];
/* The opacity of one layer of the text art. Letter opacity and Layer blending do this now, so it shows only
   for layers that already have one. */
const LAYER_OPACITY_CTL = R('opacity', 'Layer opacity', 0, 1, 0.05, { show: (L) => L.opacity < 1 });
/* Where each setting of a style sits in the Text art panel. A key not listed here stays with the style. */
const GROUP_KEYS = {
  words: ['text', 'words', 'rampName', 'sep', 'restart', 'dir', 'verseMark'],
  size: ['size', 'fill', 'sizeFrom', 'scale', 'cols', 'maxSize', 'minSize'],
  spacing: ['leading', 'autoSpace', 'spacing', 'lineGap'],
  font: ['font'],
  letters: ['ratio', 'weightMod', 'sizeMod', 'sizeFloor', 'minScale', 'power', 'minDot', 'upper'],
  tone: ['localContrast', 'paperKnee', 'toneGamma'],
  // Word cloud: its turning sits under Shape, Turn the text; the size gradient under More Word cloud settings
  turn: ['rotSet', 'rotAngle', 'rotTilt'],
  styleMore: ['gradient', 'gradientAmount']
};
/* Every shared setting outside the groups, for saved recipes and the AI helper. Shuffle sets the seed. */
const COMMON_MORE = [MARKS_CTL].concat(TONE_SHARED_CTL, DRAW_ON_CTL, [R('opacity', 'Layer opacity', 0, 1, 0.05), R('seed', 'Variation', 1, 99, 1)]);
/* crop: null for the whole photo, or {x, y, w, h} as fractions of the image. ratio locks the crop box shape. */
const PHOTO_DEFAULTS = { crop: null, ratio: 'free', gray: false, invert: false, brightness: 0, contrast: 1, saturation: 1, temperature: 0, tint: 0, sharpen: 0, smooth: 0, feather: 1,
  gamma: 1, levelLo: 0, levelHi: 1, clarity: 0,
  hue: 0, shadows: 0, highlights: 0, sepia: 0, vignette: 0, grain: 0, posterize: 0, threshold: 0, pixelate: 0,
  bulge: 0, twirl: 0, warpX: 0.5, warpY: 0.5, warpR: 0.5,
  silhouette: 0, silInvert: false, silThreshold: 0, silFill: true };
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
const PREF_DEFAULTS = { zoomSpeed: 1, zoomSmooth: true, zoomDuration: 160, wheel: 'scroll', zoomAnchor: 'cursor', zoomStep: 1.25, zoomMax: 16, zoomInvert: false, dblClick: 'toggle', pixelated: true, zoomHud: true, theme: 'system', motion: 'full', reveal: 'fly', autoPhoto: true, transpShow: 'checker' };
/* how clear areas look on screen (View > Show transparency as). Only the screen: files stay clear. */
const TRANSP_SHOW = [['checker', 'Checkerboard'], ['black', 'Black'], ['white', 'White']];
const prefs = (() => { try { return Object.assign({}, PREF_DEFAULTS, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { return Object.assign({}, PREF_DEFAULTS); } })();
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* storage blocked */ } }
function applyTheme() { if (prefs.theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', prefs.theme); }
applyTheme();
/* motion: smooth transitions in the interface, off when the person asked their computer for less motion */
const reduceMotion = () => prefs.motion === 'off' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function applyMotion() { const de = document.documentElement; if (!de || !de.classList) return; de.classList.toggle('motion-off', reduceMotion()); de.classList.toggle('motion-calm', prefs.motion === 'calm'); }
applyMotion();

/* recipes for photos; line recipes live with the Lines source */
const RECIPES = [
  // the flagship: the look Apply text art gives, a Word cloud in the photo's colors on warm black paper
  { name: 'Word cloud', paper: FLAGSHIP_PAPER, flagship: true, layers: [['cloud', { flagship: true }]] },
  { name: 'Word portrait', paper: FLAGSHIP_PAPER, layers: [['rows', { size: 24 }]] },
  { name: 'Engraving', paper: '#f3efe6', layers: [['flow', { inkColor: '#14213d', size: 14, minInk: 0.12 }]] },
  { name: 'Relief', paper: FLAGSHIP_PAPER, layers: [['relief', { inkColor: '#f2efe6', toneGamma: 1 }]] },
  { name: 'Typewriter', paper: '#f3efe6', layers: [['typewriter', {}]] },
  { name: 'Word mosaic', paper: '#ffffff', layers: [['mosaic', {}]] },
  { name: 'Outlined cloud', paper: '#ffffff', layers: [['cloud', { color: 'ink', inkColor: '#14213d', maskSource: 'image', threshold: 0.5, shapeFromPhoto: true, gradient: 'center', shapeOutline: 4, shapeColor: '#b4420c', maxSize: 120 }]] },
  { name: 'Night words', paper: '#0b0b0c', layers: [['unicode', { cols: 170, opacity: 0.4 }], ['mosaic', { region: 'dark', regionT: 0.55, threshold: 0.55, maxSize: 60, saturation: 1.5 }]] },
  { name: 'Spotlight', paper: FLAGSHIP_PAPER, layers: [['rows', { size: 22, focus: 'circle', focusAffect: 'both', fr: 0.6, fs: 0.7 }]] },
  { name: 'Word window', paper: FLAGSHIP_PAPER, layers: [['unicode', { cols: 170, opacity: 0.3 }], ['rows', { size: 20, region: 'inside', regionShape: 'text', regionText: 'LOVE', saturation: 1.6, letterFill: 'ink' }]] },
  { name: 'Terminal', paper: '#07110b', layers: [['grid', { cols: 130, rampName: 'Letters', inkColor: '#7cf29c', edges: 0.55 }]] },
  { name: 'Spiral', paper: '#ffffff', layers: [['spiral', { inkColor: '#111111', disc: false, pop: 0.6, minScale: 0.3, scale: 1.3 }]] },
  { name: 'Rings', paper: '#f3efe6', layers: [['spiral', { path: 'rings', inkColor: '#14213d' }]] },
  { name: 'Riso halftone', paper: '#fbf3e4', layers: [['halftone', { color: 'duotone', inkColor: '#1b2a4a', inkColor2: '#3d6a8a', effect: 'riso', effectColor: '#e4572e' }]] },
  { name: 'Calligram', paper: '#ffffff', layers: [['calligram', {}]] },
  { name: 'Heart calligram', paper: '#ffffff', layers: [['calligram', { maskSource: 'heart', color: 'duotone', inkColor: '#1b2a4a', inkColor2: '#c8553d' }]] },
  { name: 'Photo cells', paper: '#000000', layers: [['grid', { cols: 90, color: 'fill' }]] },
  { name: 'Pixel blocks', paper: '#000000', layers: [['unicode', { style: 'half', cols: 72 }]] },
  { name: 'Ink + Braille', paper: '#ffffff', layers: [['unicode', { cols: 200, opacity: 0.55, inkColor: '#14213d' }], ['flow', { region: 'dark', regionT: 0.6, inkColor: '#c8553d', size: 16 }]] }
];

/* ---------------- the text library ---------------- */
const LIB_DEFAULT = {
  words: {
    'Family': ['family', 'love', 'home', 'together', 'care', 'heart', 'trust', 'warmth', 'bond', 'hug', 'cherish', 'kindness', 'mother', 'father', 'child', 'roots'],
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
    'Peace and soul': ['peace', 'soul', 'calm', 'breath', 'stillness', 'light', 'silence', 'serenity', 'harmony', 'inner', 'grace', 'rest', 'balance', 'spirit', 'quiet', 'dawn'],
    'Water resources': ['watershed', 'aquifer', 'groundwater', 'recharge', 'runoff', 'catchment', 'basin', 'rainfall', 'storage', 'irrigation', 'drought', 'supply', 'demand', 'allocation', 'well', 'spring', 'snowmelt', 'glacier', 'drinking water', 'conservation'],
    'Hydraulics and rivers': ['discharge', 'velocity', 'head', 'pressure', 'flow', 'turbulence', 'laminar', 'weir', 'flume', 'spillway', 'culvert', 'channel', 'roughness', 'slope', 'sediment', 'bedload', 'scour', 'erosion', 'deposition', 'meander', 'floodplain', 'levee', 'barrage', 'hydrograph', 'stage', 'backwater', 'hydraulic jump', 'confluence', 'tributary'],
    'Flora': ['tree', 'leaf', 'root', 'seed', 'flower', 'petal', 'moss', 'fern', 'grass', 'pine', 'oak', 'willow', 'bamboo', 'orchid', 'lotus', 'cedar', 'maple', 'rose', 'palm', 'vine', 'blossom', 'canopy', 'pollen', 'sapling'],
    'Fauna': ['lion', 'tiger', 'elephant', 'deer', 'wolf', 'fox', 'eagle', 'falcon', 'sparrow', 'owl', 'heron', 'dolphin', 'whale', 'turtle', 'frog', 'snake', 'bee', 'butterfly', 'ant', 'fish', 'otter', 'ibex', 'markhor', 'crane'],
    'SDG 1: No poverty': ['poverty', 'income', 'dignity', 'shelter', 'safety net', 'livelihood', 'savings', 'access', 'basic needs', 'resilience', 'social protection', 'opportunity', 'land rights', 'microfinance'],
    'SDG 2: Zero hunger': ['hunger', 'food', 'nutrition', 'harvest', 'farmer', 'seed', 'soil', 'crop', 'yield', 'famine', 'malnutrition', 'food security', 'smallholder', 'market'],
    'SDG 3: Good health and well-being': ['health', 'clinic', 'vaccine', 'medicine', 'nurse', 'doctor', 'maternal', 'newborn', 'disease', 'prevention', 'well-being', 'mental health', 'hygiene', 'life expectancy'],
    'SDG 4: Quality education': ['school', 'teacher', 'student', 'literacy', 'numeracy', 'classroom', 'learning', 'skills', 'scholarship', 'curriculum', 'books', 'early years', 'training', 'lifelong learning'],
    'SDG 5: Gender equality': ['equality', 'women', 'girls', 'rights', 'voice', 'leadership', 'pay gap', 'inclusion', 'safety', 'opportunity', 'representation', 'empowerment', 'dignity', 'choice'],
    'SDG 6: Clean water and sanitation': ['clean water', 'sanitation', 'hygiene', 'latrine', 'handwashing', 'treatment', 'pipeline', 'tap', 'well', 'wastewater', 'contamination', 'water quality', 'drinking water', 'reuse'],
    'SDG 7: Affordable and clean energy': ['energy', 'solar', 'wind', 'hydropower', 'grid', 'electricity', 'renewable', 'efficiency', 'off grid', 'battery', 'fuel', 'access', 'clean cooking', 'power'],
    'SDG 8: Decent work and economic growth': ['work', 'jobs', 'wages', 'skills', 'enterprise', 'growth', 'productivity', 'fair pay', 'safe work', 'youth employment', 'informal', 'rights at work', 'trade', 'training'],
    'SDG 9: Industry, innovation and infrastructure': ['infrastructure', 'industry', 'innovation', 'research', 'factory', 'road', 'bridge', 'railway', 'internet', 'technology', 'manufacturing', 'investment', 'resilient', 'connectivity'],
    'SDG 10: Reduced inequalities': ['inequality', 'inclusion', 'fairness', 'access', 'migrant', 'disability', 'minority', 'opportunity', 'voice', 'discrimination', 'equity', 'belonging', 'representation', 'welcome'],
    'SDG 11: Sustainable cities and communities': ['city', 'housing', 'transport', 'public space', 'planning', 'settlement', 'waste', 'air quality', 'resilient', 'heritage', 'green space', 'commute', 'community', 'services'],
    'SDG 12: Responsible consumption and production': ['reuse', 'recycle', 'repair', 'waste', 'packaging', 'supply chain', 'footprint', 'circular', 'efficiency', 'food waste', 'sustainable', 'materials', 'consumption', 'production'],
    'SDG 13: Climate action': ['climate', 'carbon', 'emissions', 'warming', 'adaptation', 'mitigation', 'heatwave', 'flood', 'drought', 'resilience', 'net zero', 'greenhouse gas', 'forecast', 'risk'],
    'SDG 14: Life below water': ['ocean', 'sea', 'coral', 'reef', 'fish', 'plastic', 'overfishing', 'mangrove', 'coast', 'marine', 'plankton', 'acidification', 'estuary', 'habitat'],
    'SDG 15: Life on land': ['forest', 'soil', 'wildlife', 'biodiversity', 'habitat', 'desertification', 'wetland', 'species', 'deforestation', 'restoration', 'grassland', 'poaching', 'ecosystem', 'native'],
    'SDG 16: Peace, justice and strong institutions': ['peace', 'justice', 'rights', 'law', 'courts', 'accountability', 'transparency', 'governance', 'safety', 'participation', 'records', 'institutions', 'trust', 'fairness'],
    'SDG 17: Partnerships for the goals': ['partnership', 'cooperation', 'funding', 'data', 'capacity', 'trade', 'shared goals', 'coalition', 'open data', 'volunteer', 'local', 'global', 'together', 'support']
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
    'Peace and soul': ['breathe in, breathe out', 'peace begins within', 'be still', 'light within', 'rest is strength'],
    'Water resources': ['every drop counts', 'water is a shared resource', 'store the rain', 'measure what you use', 'from catchment to tap'],
    'Hydraulics and rivers': ['water finds its level', 'the river shapes the land', 'slope drives the flow', 'sediment follows the current', 'room for the river'],
    'Flora': ['plant a tree', 'roots hold the soil', 'bloom in season', 'green holds the hill'],
    'Fauna': ['give wildlife room', 'every species counts', 'tracks in the sand', 'listen for the birds'],
    'SDG 1: No poverty': ['no one left behind', 'dignity is not optional', 'a floor under everyone'],
    'SDG 2: Zero hunger': ['food for every table', 'a harvest for all', 'nobody should go hungry'],
    'SDG 3: Good health and well-being': ['health for everyone', 'care within reach', 'prevention first'],
    'SDG 4: Quality education': ['every child in school', 'learning never ends', 'teach one, reach many'],
    'SDG 5: Gender equality': ['equal by right', 'half the world, a full voice', 'open every door'],
    'SDG 6: Clean water and sanitation': ['clean water for all', 'a tap and a toilet', 'safe water, safe lives'],
    'SDG 7: Affordable and clean energy': ['power for everyone', 'clean energy, clear air', 'light every home'],
    'SDG 8: Decent work and economic growth': ['fair pay for fair work', 'safe work is a right', 'jobs that last'],
    'SDG 9: Industry, innovation and infrastructure': ['build it to last', 'innovation for everyone', 'connect every place'],
    'SDG 10: Reduced inequalities': ['level the ground', 'include by design', 'the same chance for all'],
    'SDG 11: Sustainable cities and communities': ['cities for people', 'room to breathe', 'a home in the city'],
    'SDG 12: Responsible consumption and production': ['use less, use longer', 'repair before you replace', 'waste is a design fault'],
    'SDG 13: Climate action': ['act on the climate', 'cut the carbon', 'prepare for the flood'],
    'SDG 14: Life below water': ['keep the ocean alive', 'less plastic, more fish', 'coasts need care'],
    'SDG 15: Life on land': ['hold the soil', 'room for the wild', 'forests are our lungs'],
    'SDG 16: Peace, justice and strong institutions': ['peace needs justice', 'records keep us honest', 'rules for everyone'],
    'SDG 17: Partnerships for the goals': ['nobody does this alone', 'share what works', 'local hands, global goals']
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
