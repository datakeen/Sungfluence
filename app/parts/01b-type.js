/* ===================== Part 1b: the Type toolbox, data and text work ===================== */
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Unicode styles, marks, flipping, symbol sets, faces, decorations, dividers and keyword expansions.
// Everything here is plain data and pure functions, so the panels, the text boxes and the tests all share it.
//
// A word about what these styles are: they are not fonts. Each one swaps your letters for different characters
// that already exist in Unicode, so the look travels into chat boxes and profiles that allow no formatting.
// That also means some styles have gaps, and screen readers read them out oddly. TYPE_CHECKS below says so plainly.

const A_UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', A_LO = 'abcdefghijklmnopqrstuvwxyz', DIGITS = '0123456789';
const cp = (n) => String.fromCodePoint(n);

/* Builds one style's character table.
   up, lo, dig: the first code point of a run of 26 or 10 characters.
   upStr, loStr, digStr: the characters written out, where a dot means "this letter has none, keep it as it is".
   fix: single characters that sit elsewhere in Unicode than the run suggests. */
function typeMap(spec) {
  const m = new Map();
  const run = (plain, start) => { if (start != null) Array.from(plain).forEach((ch, i) => m.set(ch, cp(start + i))); };
  const str = (plain, s) => { if (s) Array.from(plain).forEach((ch, i) => { const v = Array.from(s)[i]; if (v && v !== '.') m.set(ch, v); }); };
  run(A_UP, spec.up); run(A_LO, spec.lo); run(DIGITS, spec.dig);
  str(A_UP, spec.upStr); str(A_LO, spec.loStr); str(DIGITS, spec.digStr);
  if (spec.fix) for (const [k, v] of Object.entries(spec.fix)) m.set(k, v);
  if (spec.also) for (const [k, v] of Object.entries(spec.also)) m.set(k, v);
  return m;
}
/* The letters that Unicode keeps outside the mathematical blocks, because they were encoded earlier. */
const GAP_ITALIC = { h: 'ℎ' };
const GAP_SCRIPT = { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' };
const GAP_FRAKTUR = { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' };
const GAP_DOUBLE = { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' };

/* The style catalog. family groups them in the panel; note explains anything a reader should know.
   rtl: true means the style also has something for Arabic script (none do yet, so Urdu and Arabic text is left alone). */
const TYPE_STYLES = [
  // --- weight and slant ---
  { id: 'bold', name: 'Bold', family: 'Weight and slant', spec: { up: 0x1D400, lo: 0x1D41A, dig: 0x1D7CE } },
  { id: 'italic', name: 'Italic', family: 'Weight and slant', spec: { up: 0x1D434, lo: 0x1D44E, fix: GAP_ITALIC } },
  { id: 'boldItalic', name: 'Bold italic', family: 'Weight and slant', spec: { up: 0x1D468, lo: 0x1D482 } },
  { id: 'sans', name: 'Plain sans', family: 'Weight and slant', spec: { up: 0x1D5A0, lo: 0x1D5BA, dig: 0x1D7E2 } },
  { id: 'sansBold', name: 'Sans bold', family: 'Weight and slant', spec: { up: 0x1D5D4, lo: 0x1D5EE, dig: 0x1D7EC } },
  { id: 'sansItalic', name: 'Sans italic', family: 'Weight and slant', spec: { up: 0x1D608, lo: 0x1D622 } },
  { id: 'sansBoldItalic', name: 'Sans bold italic', family: 'Weight and slant', spec: { up: 0x1D63C, lo: 0x1D656 } },
  { id: 'mono', name: 'Typewriter', family: 'Weight and slant', spec: { up: 0x1D670, lo: 0x1D68A, dig: 0x1D7F6 } },
  // --- handwriting and old print ---
  { id: 'script', name: 'Script', family: 'Handwriting and old print', spec: { up: 0x1D49C, lo: 0x1D4B6, fix: GAP_SCRIPT } },
  { id: 'scriptBold', name: 'Script bold', family: 'Handwriting and old print', spec: { up: 0x1D4D0, lo: 0x1D4EA } },
  { id: 'fraktur', name: 'Fraktur', family: 'Handwriting and old print', spec: { up: 0x1D504, lo: 0x1D51E, fix: GAP_FRAKTUR } },
  { id: 'frakturBold', name: 'Fraktur bold', family: 'Handwriting and old print', spec: { up: 0x1D56C, lo: 0x1D586 } },
  { id: 'double', name: 'Double struck', family: 'Handwriting and old print', spec: { up: 0x1D538, lo: 0x1D552, dig: 0x1D7D8, fix: GAP_DOUBLE } },
  // --- size and position ---
  { id: 'smallCaps', name: 'Small capitals', family: 'Size and position', note: 'Capital X has no small capital, so it stays as it is.',
    spec: { upStr: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘꞯʀꜱᴛᴜᴠᴡ.ʏᴢ', loStr: 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘꞯʀꜱᴛᴜᴠᴡ.ʏᴢ' } },
  { id: 'superscript', name: 'Raised', family: 'Size and position', note: 'Several capitals have no raised form and stay as they are.',
    spec: { upStr: 'ᴬᴮ.ᴰᴱ.ᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾ.ᴿ.ᵀᵁⱽᵂ...', loStr: 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖ.ʳˢᵗᵘᵛʷˣʸᶻ', digStr: '⁰¹²³⁴⁵⁶⁷⁸⁹', also: { '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾' } } },
  { id: 'subscript', name: 'Lowered', family: 'Size and position', note: 'Only some letters have a lowered form; the rest stay as they are.',
    spec: { loStr: 'ₐ...ₑ..ₕᵢⱼₖₗₘₙₒₚ.ᵣₛₜᵤᵥ.ₓ..', digStr: '₀₁₂₃₄₅₆₇₈₉', also: { '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎' } } },
  { id: 'fullwidth', name: 'Wide', family: 'Size and position', spec: { up: 0xFF21, lo: 0xFF41, dig: 0xFF10, also: { ' ': '　', '!': '！', '?': '？', '.': '．', ',': '，', ':': '：', ';': '；', "'": '＇', '"': '＂', '-': '－', '(': '（', ')': '）', '@': '＠', '#': '＃', '&': '＆' } } },
  // --- in boxes and circles ---
  { id: 'circled', name: 'In circles', family: 'In boxes and circles', spec: { up: 0x24B6, lo: 0x24D0, fix: { 0: '⓪', 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥', 7: '⑦', 8: '⑧', 9: '⑨' } } },
  { id: 'circledDark', name: 'In dark circles', family: 'In boxes and circles', note: 'Capitals only; small letters are made capital.',
    spec: { up: 0x1F150, fix: { 0: '⓿', 1: '❶', 2: '❷', 3: '❸', 4: '❹', 5: '❺', 6: '❻', 7: '❼', 8: '❽', 9: '❾' } }, upper: true },
  { id: 'squared', name: 'In squares', family: 'In boxes and circles', note: 'Capitals only; small letters are made capital.', spec: { up: 0x1F130 }, upper: true },
  { id: 'squaredDark', name: 'In dark squares', family: 'In boxes and circles', note: 'Capitals only; small letters are made capital.', spec: { up: 0x1F170 }, upper: true },
  { id: 'parens', name: 'In brackets', family: 'In boxes and circles', spec: { up: 0x1F110, lo: 0x249C, fix: { 1: '⑴', 2: '⑵', 3: '⑶', 4: '⑷', 5: '⑸', 6: '⑹', 7: '⑺', 8: '⑻', 9: '⑼' } } },
  { id: 'flags', name: 'Flag letters', family: 'In boxes and circles', note: 'Two letters side by side may turn into a country flag. Capitals only.', spec: { up: 0x1F1E6 }, upper: true },
  // --- turned around ---
  { id: 'upsideDown', name: 'Upside down', family: 'Turned around', note: 'The letters are also written back to front, so the line reads correctly when turned.', reverse: true,
    spec: { upStr: '∀ᙠƆ◖ƎℲ⅁HIſ⋊˥WNOԀΌᴚS⊥∩ΛMX⅄Z', loStr: 'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz', digStr: '0ƖᄅƐㄣϛ9ㄥ86',
      also: { '.': '˙', ',': "'", "'": ',', '"': '„', '?': '¿', '!': '¡', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '&': '⅋', '_': '‾', ';': '؛' } } },
  { id: 'mirror', name: 'Mirrored', family: 'Turned around', note: 'Decorative. The letters only look mirrored; they are not a real mirror image.', reverse: true,
    spec: { upStr: 'AᙠƆᗡƎꟻꓨHIႱꓘ⅃MͶOꟼϘЯƧTUVWXYƸ', loStr: 'ɒdɔbɘꟻǫʜijʞlmnoqpɿƨƚuvwxyz',
      also: { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' } } },
  // --- look-alike letters ---
  { id: 'greekish', name: 'Greek look-alike', family: 'Look-alike letters', decorative: true,
    spec: { upStr: 'ΑΒᏟ∆ΕϜᏀΗΙͿΚᏞΜΝΟΡႳΡՏΤՍѴᎳΧΥΖ', loStr: 'αβϲδεfgнιjκλмηορqгѕτυνωχуζ' } },
  { id: 'cyrillicish', name: 'Cyrillic look-alike', family: 'Look-alike letters', decorative: true,
    spec: { upStr: 'АБᏟDЕГННІЈКLМИОРQЯЅТЦVШХЧZ', loStr: 'аъсdеfgнıјкlмиорqяѕтцvшхуz' } },
  { id: 'cherokeeish', name: 'Cherokee look-alike', family: 'Look-alike letters', decorative: true,
    spec: { upStr: 'ᎪᏴᏟᎠᎬᖴᏀᎻᏆᎫᏦᏞᎷᏁᎾᏢǪᏒᏚᎢᏌᏉᏔᚷᎩᏃ', loStr: 'ᎪᏴᏟᎠᎬᖴᏀᎻᏆᎫᏦᏞᎷᏁᎾᏢǪᏒᏚᎢᏌᏉᏔᚷᎩᏃ' } },
  { id: 'runish', name: 'Rune look-alike', family: 'Look-alike letters', decorative: true,
    spec: { upStr: 'ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚴᛚᛗᚾᛟᛈᛩᚱᛋᛏᚢᚡᚹᛪᛉᛎ', loStr: 'ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚴᛚᛗᚾᛟᛈᛩᚱᛋᛏᚢᚡᚹᛪᛉᛎ' } },
  { id: 'curly', name: 'Curly look-alike', family: 'Look-alike letters', decorative: true,
    spec: { upStr: 'ƛƁƇƊЄƑƓӇƖʆƘԼMƝƠƤҨƦƧƬƲƔƜXƳȤ', loStr: 'ąცƈɖɛʄɠɦıʝƙƖɱŋơραཞʂɬųʋῳxყʑ' } },
  { id: 'thaiish', name: 'Thai look-alike', family: 'Look-alike letters', decorative: true,
    spec: { upStr: 'ค๒ƈ๔єŦﻮђเןкɭ๓ภ๏ρ۹гรՇยชฬאץչ', loStr: 'ค๒ƈ๔єŦﻮђเןкɭ๓ภ๏ρ۹гรՇยชฬאץչ' } }
];
const TYPE_STYLE = Object.fromEntries(TYPE_STYLES.map((s) => [s.id, s]));
TYPE_STYLES.forEach((s) => { s.map = typeMap(s.spec); });

/* Lines through, under and over the letters: combining marks, so they follow every character. */
const TYPE_LINES = [
  { id: 'none', name: 'None', mark: '' },
  { id: 'strike', name: 'Struck through', mark: '̶' },
  { id: 'strikeShort', name: 'Struck, short', mark: '̵' },
  { id: 'slash', name: 'Slashed', mark: '̸' },
  { id: 'underline', name: 'Underlined', mark: '̲' },
  { id: 'underlineDouble', name: 'Underlined twice', mark: '̳' },
  { id: 'overline', name: 'Overlined', mark: '̅' },
  { id: 'tilde', name: 'Wavy underline', mark: '̰' }
];
/* "Zalgo" marks. The limit keeps it readable and keeps chat apps from choking. */
const ZALGO_UP = Array.from({ length: 46 }, (_, i) => cp(0x0300 + i)).concat(['̽', '̾', '̿', '͆', '͊', '͐', '͒', '͗']);
const ZALGO_MID = ['̴', '̵', '̶', '̷', '̸', '҉'];
const ZALGO_DOWN = ['̖', '̗', '̘', '̙', '̜', '̝', '̞', '̟', '̠', '̤', '̥', '̦', '̩', '̪', '̫', '̬', '̭', '̮', '̯', '̰', '̱', '̲', '̳', '̹', '̺', '̻', '̼', 'ͅ', '͇', '͈', '͉', '͍', '͎', '͓', '͔', '͕', '͖', '͙', '͚'];
const ZALGO_MAX = 12; // marks per letter, per place

/* ---------------- turning text into a style ---------------- */
const isBase = (ch) => !/[̀-ͯ҃-҉]/.test(ch);
/* Splits text into characters with the marks that belong to them, so marks never get separated from their letter. */
function graphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try { return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(String(text)), (s) => s.segment); } catch (e) { /* fall through */ }
  }
  const out = [];
  for (const ch of String(text)) { if (out.length && !isBase(ch)) out[out.length - 1] += ch; else out.push(ch); }
  return out;
}
const styleOne = (ch, s) => {
  if (!s || !s.map) return ch;
  const k = s.upper ? ch.toUpperCase() : ch;
  return s.map.get(k) || s.map.get(ch) || ch;
};
/* opt: { mode, styles, seed, line, zalgo: { up, mid, down, amount }, flip } */
function styleText(text, id, opt) {
  opt = opt || {};
  const s = TYPE_STYLE[id];
  let parts = graphemes(text);
  const mode = opt.mode || 'one';
  const pool = (opt.styles || []).map((x) => TYPE_STYLE[x]).filter(Boolean);
  let seed = (opt.seed || 7) * 9301 + 49297;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let n = 0;
  parts = parts.map((g) => {
    const base = Array.from(g)[0], rest = g.slice(base.length);
    let pick = s;
    if (mode === 'alternate' && pool.length) { if (/\S/.test(base)) pick = pool[n++ % pool.length]; }
    else if (mode === 'mix' && pool.length) pick = pool[Math.floor(rnd() * pool.length)];
    else if (mode === 'ransom' && pool.length) { pick = pool[Math.floor(rnd() * pool.length)]; if (rnd() < 0.4) return styleOne(base.toUpperCase(), pick) + rest; }
    return styleOne(base, pick) + rest;
  });
  if (s && s.reverse) parts = parts.reverse();
  let out = parts.join('');
  const line = TYPE_LINES.find((l) => l.id === opt.line);
  if (line && line.mark) out = graphemes(out).map((g) => (/\s/.test(g) ? g : g + line.mark)).join('');
  const z = opt.zalgo;
  if (z && z.amount > 0) {
    const many = Math.max(1, Math.round(z.amount * ZALGO_MAX));
    out = graphemes(out).map((g) => {
      if (/\s/.test(g)) return g;
      let r = g;
      const add = (set, on) => { if (!on) return; for (let i = 0; i < 1 + Math.floor(rnd() * many); i++) r += set[Math.floor(rnd() * set.length)]; };
      add(ZALGO_UP, z.up); add(ZALGO_MID, z.mid); add(ZALGO_DOWN, z.down);
      return r;
    }).join('');
  }
  return out;
}
/* The way back: fancy letters become plain ones again. */
let unstyleMap = null;
const PLAIN_CHARS = new Set(Array.from(A_UP + A_LO + DIGITS));
function buildUnstyle() {
  const m = new Map();
  TYPE_STYLES.forEach((s) => {
    s.map.forEach((v, k) => {
      // a few styles leave a letter as a plain one (upside-down n is a u). Those need no turning back,
      // and treating them as styled would swap letters in ordinary words.
      if (PLAIN_CHARS.has(v) || m.has(v)) return;
      m.set(v, { plain: k, rev: !!s.reverse });
    });
  });
  return m;
}
const plainOf = (ch) => ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
/* Text that was turned around uses ordinary letters as well: an upside-down n is a u.
   Those cannot be turned back on their own, so first we ask whether the whole text looks turned around. */
function turnedStyle(chars) {
  let best = null, bestN = 0;
  TYPE_STYLES.filter((s) => s.reverse).forEach((s) => {
    let n = 0;
    s.map.forEach((v) => { if (!PLAIN_CHARS.has(v) && chars.includes(v)) n++; });
    if (n > bestN) { bestN = n; best = s; }
  });
  const letters = chars.filter((c) => /\S/.test(c)).length;
  return (best && bestN >= 2 && bestN * 5 >= letters) ? best : null;
}
function unstyleText(text) {
  if (!unstyleMap) unstyleMap = buildUnstyle();
  // the marks go first, then the table, and only what is left over goes through Unicode's own plain form
  const chars = Array.from(String(text).replace(/[̀-ͯ҃-҉]/g, ''));
  const turned = turnedStyle(chars);
  if (turned) {
    const back = new Map();
    turned.map.forEach((v, k) => { if (!back.has(v)) back.set(v, k); });
    return chars.map((ch) => back.get(ch) || (unstyleMap.get(ch) || {}).plain || plainOf(ch)).reverse().join('');
  }
  return chars.map((ch) => { const v = unstyleMap.get(ch); return v ? v.plain : plainOf(ch); }).join('');
}

/* ---------------- trust checks (S8) ----------------
   Fancy letters are not plain letters. Two things can go wrong, so the panel always says which. */
const SR_NAMES = { bold: 'mathematical bold', italic: 'mathematical italic', script: 'script', fraktur: 'black-letter', double: 'double-struck', mono: 'monospace', circled: 'circled', squared: 'squared', fullwidth: 'fullwidth' };
function typeNotes(id, styled) {
  const s = TYPE_STYLE[id], out = [];
  if (s && s.note) out.push({ kind: 'note', text: s.note });
  if (s && s.decorative) out.push({ kind: 'warn', text: 'Decorative only. These are letters of another writing system that happen to look like Latin ones, so they are not really your words.' });
  if (s && s.map && s.map.size) out.push({ kind: 'warn', text: 'A screen reader reads these out as "' + (SR_NAMES[id] || 'symbol') + '" for every letter. Keep a plain copy for anywhere that offers alt text.' });
  if (/[̀-ͯ҃-҉]{3,}/.test(styled || '')) out.push({ kind: 'warn', text: 'Many marks on one letter. Some apps cut this off or refuse to show it.' });
  return out;
}
/* How long is this really? Chat and profile boxes count in three different ways. */
function textCounts(text) {
  const t = String(text);
  return { units: t.length, points: Array.from(t).length, letters: graphemes(t).length, lines: t.split('\n').length };
}
/* Blank box detector: draws each character and the browser's "missing glyph" box, and compares them. */
let blankRef = null;
function blankBoxes(text, font) {
  const mk2 = (w, h) => (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const S = 28, c = mk2(S, S), x = c.getContext('2d', { willReadFrequently: true });
  if (!x) return [];
  x.font = (font || '20px system-ui, sans-serif'); x.textBaseline = 'middle'; x.textAlign = 'center';
  const shot = (ch) => {
    x.clearRect(0, 0, S, S); x.fillStyle = '#000'; x.fillText(ch, S / 2, S / 2);
    const d = x.getImageData(0, 0, S, S).data; let k = '';
    for (let i = 3; i < d.length; i += 4) k += d[i] > 40 ? '1' : '0';
    return k;
  };
  // an unassigned code point draws as the browser's missing-glyph box
  if (!blankRef) blankRef = { box: shot('\u{10FFFD}'), empty: shot(' ') };
  const bad = [];
  for (const g of new Set(graphemes(text))) {
    if (!/\S/.test(g)) continue;
    const k = shot(g);
    if (k === blankRef.box || k === blankRef.empty) bad.push(g);
  }
  return bad;
}


/* ---------------- sharing it (S7) ----------------
   Bios and posts have limits, and they count characters in different ways. These numbers were checked
   in November 2026 from public guides, not from the apps themselves, so the panel says to treat them
   as a guide. The counting rule for X is the published one; the others are counted as characters. */
const SOCIAL = [
  { id: 'ig-bio', name: 'Instagram bio', limit: 150, kind: 'bio', breaks: true, note: 'Instagram drops a line break when the line before it is empty, so empty lines need something invisible in them.' },
  { id: 'ig-cap', name: 'Instagram caption', limit: 2200, kind: 'post', cut: 125, breaks: true },
  { id: 'ig-name', name: 'Instagram name', limit: 30, kind: 'name' },
  { id: 'x-post', name: 'X post', limit: 280, kind: 'post', count: 'x', note: 'X counts most Latin letters as one and most other characters as two. Paid accounts can post far longer.' },
  { id: 'x-bio', name: 'X bio', limit: 160, kind: 'bio', count: 'x' },
  { id: 'bluesky', name: 'Bluesky post', limit: 300, kind: 'post' },
  { id: 'tiktok-bio', name: 'TikTok bio', limit: 80, kind: 'bio', breaks: true },
  { id: 'li-head', name: 'LinkedIn headline', limit: 220, kind: 'bio' },
  { id: 'li-post', name: 'LinkedIn post', limit: 3000, kind: 'post', cut: 210, breaks: true },
  { id: 'yt-title', name: 'YouTube title', limit: 100, kind: 'name' },
  { id: 'yt-desc', name: 'YouTube description', limit: 5000, kind: 'post', cut: 157, breaks: true },
  { id: 'wa-about', name: 'WhatsApp about', limit: 139, kind: 'bio' }
];
/* X publishes its rule: these ranges count as one, everything else as two. */
const xWeight = (c) => ((c <= 0x10FF) || (c >= 0x2000 && c <= 0x200D) || (c >= 0x2010 && c <= 0x201F) || (c >= 0x2032 && c <= 0x2037)) ? 1 : 2;
function countFor(text, how) {
  const s = String(text);
  if (how === 'x') { let n = 0; for (const ch of s) n += xWeight(ch.codePointAt(0)); return n; }
  return Array.from(s).length;
}
/* Line breaks that survive: no trailing spaces, and nothing truly empty. */
const BLANK_LINE = '⠀';   // Braille blank: a real character that takes no ink
function fixBreaks(text) {
  return String(text).split('\n').map((l) => {
    const t = l.replace(/[ \t]+$/, '');
    return t.length ? t : BLANK_LINE;
  }).join('\n');
}
const breaksWillStick = (text) => fixBreaks(text) === String(text);
/* Cuts the text to a limit at a space, so no word is left half written. */
function fitTo(text, limit, how) {
  const s = String(text);
  if (countFor(s, how) <= limit) return s;
  const chars = Array.from(s);
  let out = '', n = 0;
  for (const ch of chars) {
    const w = how === 'x' ? xWeight(ch.codePointAt(0)) : 1;
    if (n + w > limit - 1) break;
    out += ch; n += w;
  }
  const cut = out.replace(/\s+\S*$/, '');
  return (cut.length > limit * 0.5 ? cut : out).replace(/[ \t]+$/, '') + '…';
}

/* ---------------- symbols (G1) ---------------- */
const SYMBOL_SETS = {
  'Arrows': '←↑→↓↔↕↖↗↘↙⇄⇅⇆⇇⇈⇉⇊⇍⇎⇏⇐⇑⇒⇓⇔⇕➔➘➙➚➛➜➞➟➠➡➢➣➤➥➦➧➨➩➪➫➬➭➮➯➱➲➳➴➵➶➷➸➹➺➻➼➽➾⟵⟶⟷⟸⟹⟺⤴⤵↩↪↰↱↲↳↴↵⇜⇝⇠⇡⇢⇣',
  'Stars and sparkles': '★☆✡✦✧✩✪✫✬✭✮✯✰⁂⁎⁑✢✣✤✥✱✲✳✴✵✶✷✸✹✺✻✼✽❂❉❊❋⭐🌟✨💫⚝⚹✴️',
  'Hearts': '♥♡❤❥❦❧💓💔💕💖💗💘💙💚💛💜💝💞💟❣♥️☙',
  'Music': '♩♪♫♬♭♮♯𝄞𝄢𝄪𝄫🎵🎶🎼',
  'Weather and nature': '☀☁☂☃☄☼☽☾❄❅❆☔⛄⛅🌞🌝🌛🌜🌙⭑🔥💧🌊🌈🍀🌱🌿🌸🌺🌻🌼🌷',
  'Maths': '±×÷≠≈≡≤≥∞∑∏√∫∂∆∇∈∉∋⊂⊃⊆⊇∩∪∧∨¬∀∃∴∵∝⊕⊗⊥∥°′″‰µΩπΣΔΘΛΞΦΨαβγδεθλμνξρστφχψω',
  'Boxes and lines': '─━│┃┄┅┆┇┈┉┊┋┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╌╍╎╏═║╔╗╚╝╠╣╦╩╬',
  'Blocks and shades': '░▒▓█▄▀▌▐▁▂▃▅▆▇■□▪▫▬▭▮▯▰▱◼◻◾◽⬛⬜',
  'Shapes': '●○◉◎◍◌◯⬤⬮⬯▲△▴▵▼▽▾▿◆◇◈◊◢◣◤◥⬟⬠⬡⬢⬣⯃⯄◐◑◒◓◔◕',
  'Braille dots': '⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⡀⢀⣀⣤⣶⣿⠿⡿⣟⣯⣷',
  'Games': '♔♕♖♗♘♙♚♛♜♝♞♟♠♣♥♦♤♧♡♢⚀⚁⚂⚃⚄⚅🀄🂠🂡🂱🃁🃑🎲🎯🎮🕹♟️',
  'Office and signs': '✓✔✗✘☑☒☐✎✏✐✑✒✁✂✃✄✆✇✈✉✌✍☎☏⌨⌛⌚⏰⏳⚠⚡⚐⚑⚒⚓⚔⚖⚙⚛⚜♻♾☮☯☢☣⌘⌥⇧⌦⏎⏏⏩⏪⏭⏮⏯⏱',
  'Brackets and quotes': '«»‹›“”‘’„‚「」『』【】〔〕〖〗〘〙〚〛（）［］｛｝⟨⟩⟪⟫⦅⦆⸢⸣⸤⸥❛❜❝❞❮❯❰❱',
  'Dots and bullets': '·•‣⁃◦∙⋅∘⦁⚫⚪　…⋯⋮⋰⋱∴∵※⁜⁘⁙⁚⁛',
  'Currency': '$¢£¤¥₠₡₢₣₤₥₦₧₨₩₪₫€₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿﷼',
  'Arabic ornaments': '﴾﴿۞۩﷽؎؏۝٭❁❃❊✾✿❀❉⁕۔؛؞؟٪٫٬٭ﷲﷺ',
  'Zodiac and planets': '♈♉♊♋♌♍♎♏♐♑♒♓☉☿♀♁♂♃♄♅♆♇☊☋',
  'Flourishes': '❦❧☙⚜✤✣❖⌘⍟⟡⟢⟣⟤⟥⁂⁑❈❅✺✹✸❆❃❂❀✾✽✼✻✵✴✳✲✱'
};
/* Names for searching. Only the ones people look for by name; everything else is found by set, code point or entity. */
const GLYPH_NAMES = {
  '★': 'star black filled', '☆': 'star white outline', '✦': 'star four pointed sparkle', '✨': 'sparkles glitter',
  '♥': 'heart black', '♡': 'heart white outline', '❤': 'heart red love', '💖': 'heart sparkle love',
  '→': 'arrow right', '←': 'arrow left', '↑': 'arrow up', '↓': 'arrow down', '⇒': 'arrow double right then', '➜': 'arrow thick right',
  '✓': 'check tick yes done', '✔': 'check heavy tick yes', '✗': 'cross no wrong', '✘': 'cross heavy no wrong', '☑': 'checkbox ticked', '☐': 'checkbox empty',
  '•': 'bullet dot point', '…': 'ellipsis three dots', '°': 'degree', '±': 'plus minus', '×': 'times multiply', '÷': 'divide',
  '∞': 'infinity', '√': 'square root', '∑': 'sum sigma', '∏': 'product pi', '∫': 'integral', '≈': 'approximately about', '≠': 'not equal',
  '♩': 'music note quarter', '♪': 'music note eighth', '♫': 'music notes beamed', '☀': 'sun', '☁': 'cloud', '☂': 'umbrella rain', '❄': 'snowflake snow',
  '☎': 'telephone phone', '✉': 'envelope mail email', '✏': 'pencil write', '✂': 'scissors cut', '⚠': 'warning caution', '⚡': 'lightning bolt power',
  '♔': 'chess king white', '♟': 'chess pawn black', '♠': 'spade card', '♣': 'club card', '♦': 'diamond card',
  '€': 'euro currency', '£': 'pound sterling currency', '¥': 'yen yuan currency', '₹': 'rupee indian currency', '₨': 'rupee pakistan currency', '₽': 'ruble currency', '₿': 'bitcoin currency',
  '﴾': 'ornate bracket left arabic', '﴿': 'ornate bracket right arabic', '۞': 'rub el hizb arabic ornament', '۩': 'place of sajdah arabic', '﷽': 'bismillah basmala arabic',
  '█': 'full block', '░': 'light shade', '▒': 'medium shade', '▓': 'dark shade', '─': 'box line horizontal', '│': 'box line vertical', '┌': 'box corner top left',
  '©': 'copyright', '®': 'registered trademark', '™': 'trademark', '§': 'section', '¶': 'paragraph pilcrow', '†': 'dagger', '‡': 'double dagger'
};
/* HTML entity names, for search and for showing how to type a glyph. */
const GLYPH_ENTITY = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', '©': 'copy', '®': 'reg', '™': 'trade', '§': 'sect', '¶': 'para', '†': 'dagger', '‡': 'Dagger', '•': 'bull', '…': 'hellip', '°': 'deg', '±': 'plusmn', '×': 'times', '÷': 'divide', '¼': 'frac14', '½': 'frac12', '¾': 'frac34', '←': 'larr', '↑': 'uarr', '→': 'rarr', '↓': 'darr', '↔': 'harr', '⇐': 'lArr', '⇒': 'rArr', '∞': 'infin', '≈': 'asymp', '≠': 'ne', '≤': 'le', '≥': 'ge', '√': 'radic', '∑': 'sum', '∏': 'prod', '∫': 'int', '♠': 'spades', '♣': 'clubs', '♥': 'hearts', '♦': 'diams', '€': 'euro', '£': 'pound', '¥': 'yen', '¢': 'cent', '«': 'laquo', '»': 'raquo', '“': 'ldquo', '”': 'rdquo', '‘': 'lsquo', '’': 'rsquo', '–': 'ndash', '—': 'mdash', ' ': 'nbsp' };


/* ---------------- search by drawing (G5) ----------------
   Every symbol is drawn once into one big sheet, then each one is boiled down to a small square of ink.
   A sketch is boiled down the same way, and the closest squares win. Shapes are compared after being
   fitted to the same box, so size and position on the pad make no difference. */
const SHAPE_N = 12;          // the square each shape is reduced to
let glyphShapes = null;
const mkCanvas = (w, h) => ((typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
/* Alpha in a cell, fitted to its own ink and reduced to SHAPE_N by SHAPE_N, then softened and normalised. */
function shapeFrom(alpha, w, h, x0, y0, cw, chh) {
  let minX = cw, minY = chh, maxX = -1, maxY = -1;
  for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
    if (alpha[(y0 + y) * w + x0 + x] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) return null;
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const side = Math.max(bw, bh);                       // keep the shape's proportions
  const ox = minX - (side - bw) / 2, oy = minY - (side - bh) / 2;
  const g = new Float32Array(SHAPE_N * SHAPE_N);
  for (let j = 0; j < SHAPE_N; j++) for (let i = 0; i < SHAPE_N; i++) {
    let sum = 0, cnt = 0;
    const ax = ox + i * side / SHAPE_N, bx = ox + (i + 1) * side / SHAPE_N;
    const ay = oy + j * side / SHAPE_N, by = oy + (j + 1) * side / SHAPE_N;
    for (let y = Math.floor(ay); y < Math.ceil(by); y++) for (let x = Math.floor(ax); x < Math.ceil(bx); x++) {
      if (x < 0 || y < 0 || x >= cw || y >= chh) { cnt++; continue; }
      sum += alpha[(y0 + y) * w + x0 + x] / 255; cnt++;
    }
    g[j * SHAPE_N + i] = cnt ? sum / cnt : 0;
  }
  // a little softening, so a line drawn slightly off still matches
  const sm = new Float32Array(SHAPE_N * SHAPE_N);
  for (let j = 0; j < SHAPE_N; j++) for (let i = 0; i < SHAPE_N; i++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = i + dx, Y = j + dy;
      if (X < 0 || Y < 0 || X >= SHAPE_N || Y >= SHAPE_N) continue;
      s += g[Y * SHAPE_N + X] * (dx === 0 && dy === 0 ? 2 : 1); n += (dx === 0 && dy === 0 ? 2 : 1);
    }
    sm[j * SHAPE_N + i] = s / n;
  }
  let tot = 0;
  for (let i = 0; i < sm.length; i++) tot += sm[i];
  if (tot < 0.02) return null;
  for (let i = 0; i < sm.length; i++) sm[i] /= tot / 10;
  return sm;
}
/* Reducing every symbol takes about a third of a second in one go, which would hold up the window,
   so it is done a row of 32 at a time. Opening the drawing pad starts it; by the time anyone has
   drawn a shape it is ready, and asking for it early simply finishes it on the spot. */
const SHAPE_COLS = 32, SHAPE_CELL = 28;
let shapeJob = null;
function shapeStart() {
  if (glyphShapes || shapeJob) return;
  const seen = new Set(), list = [];
  Object.values(SYMBOL_SETS).forEach((set) => Array.from(set).forEach((ch) => { if (ch.trim() && !seen.has(ch)) { seen.add(ch); list.push(ch); } }));
  shapeJob = { list, at: 0, out: [] };
}
function shapeStep(rows) {
  if (glyphShapes) return true;
  shapeStart();
  const J = shapeJob, S = SHAPE_CELL, cols = SHAPE_COLS;
  const c = mkCanvas(cols * S, S), x = c.getContext('2d', { willReadFrequently: true });
  if (!x) { glyphShapes = []; shapeJob = null; return true; }
  x.fillStyle = '#000'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = Math.round(S * 0.78) + 'px system-ui, "Segoe UI Symbol", sans-serif';
  for (let r = 0; r < (rows || 1) && J.at < J.list.length; r++) {
    const part = J.list.slice(J.at, J.at + cols);
    x.clearRect(0, 0, cols * S, S);
    part.forEach((ch, i) => x.fillText(ch, i * S + S / 2, S / 2));
    const d = x.getImageData(0, 0, cols * S, S).data;
    const w = cols * S, alpha = new Uint8ClampedArray(w * S);
    for (let i = 0; i < alpha.length; i++) alpha[i] = d[i * 4 + 3];
    part.forEach((ch, i) => { const g = shapeFrom(alpha, w, S, i * S, 0, S, S); if (g) J.out.push({ ch, g }); });
    J.at += cols;
  }
  if (J.at >= J.list.length) { glyphShapes = J.out; shapeJob = null; return true; }
  return false;
}
function buildGlyphShapes() {
  while (!shapeStep(4)) { /* finish whatever is left */ }
  return glyphShapes || [];
}
/* Gets it ready in the background, a couple of rows between frames. */
function buildGlyphShapesSoon() {
  if (glyphShapes) return;
  const tick = () => { if (!shapeStep(2)) setTimeout(tick, 0); };
  setTimeout(tick, 0);
}
/* How alike two shapes are: the ink they share against the ink they cover between them. */
function shapeScore(a, b) {
  let lo = 0, hi = 0;
  for (let i = 0; i < a.length; i++) { const p = a[i], q = b[i]; lo += p < q ? p : q; hi += p > q ? p : q; }
  return hi > 0 ? lo / hi : 0;
}
/* Takes the alpha of a drawing pad and returns the symbols that look most like it. */
function searchByShape(alpha, w, h, many) {
  const want = shapeFrom(alpha, w, h, 0, 0, w, h);
  if (!want) return [];
  return buildGlyphShapes()
    .map((q) => ({ ch: q.ch, score: shapeScore(want, q.g) }))
    .sort((p, q) => q.score - p.score)
    .slice(0, many || 72)
    .filter((q) => q.score > 0.12);
}

/* ---------------- one-line art and faces (G2, G3) ---------------- */
/* Many of these are well-known internet kaomoji, also collected in the ART library by Sepand Haghighi (MIT,
   https://github.com/sepandhaghighi/art), which inspired this toolbox. Credited in NOTICE.md. */
const ART_SETS = {
  'Happy': ['(◕‿◕)', '(｡◕‿◕｡)', '(＾▽＾)', '(✿◠‿◠)', '(ﾉ◕ヮ◕)ﾉ', '♪(´▽｀)', '(*^▽^*)', '＼(^o^)／', '(〜￣▽￣)〜', '(•‿•)', '(ᵔᴥᵔ)', '(＾◡＾)'],
  'Sad and tired': ['(╥﹏╥)', '(ಥ_ಥ)', '(っ- ‸ – ς)', '(´；ω；`)', '(ㅠ﹏ㅠ)', '(-_-)zzz', '(_ _)..zzZZ', '(´-ω-`)', '(눈_눈)', '(⌣_⌣”)'],
  'Angry and flipping': ['(╯°□°）╯︵ ┻━┻', '┻━┻ ︵ヽ(`Д´)ﾉ︵ ┻━┻', '(ノಠ益ಠ)ノ彡┻━┻', '┬─┬ ノ( ゜-゜ノ)', '(¬_¬)', '(ಠ_ಠ)', '(҂◡_◡)', 'ヽ(ಠ_ಠ)ノ'],
  'Shrug and hands': ['¯\\_(ツ)_/¯', '╮(╯▽╰)╭', '(づ｡◕‿‿◕｡)づ', 'ლ(╹◡╹ლ)', '(ง •̀_•́)ง', 'ヽ(•‿•)ノ', '(っ◔◡◔)っ', '૮ ˶ᵔ ᵕ ᵔ˶ ა', '(人◕‿◕)'],
  'Love': ['(♥‿♥)', '(◍•ᴗ•◍)❤', '♡(˃͈ દ ˂͈ ༶ )', '(づ￣ ³￣)づ', '(´ ∀ ` *)', '♡＾▽＾♡', '(｡♥‿♥｡)', '♥‿♥'],
  'Animals': ['(=^･ω･^=)', '/ᐠ｡ꞈ｡ᐟ\\', '(｡･ᴗ･｡)', 'ʕ•ᴥ•ʔ', 'ʕ￫ᴥ￩ʔ', '(\\_/)\n( •_•)', '＜(｡_｡)＞', '(・Д・)', '🐾', '(¬‿¬)'],
  'Lenny and friends': ['( ͡° ͜ʖ ͡°)', '( ͡~ ͜ʖ ͡°)', '( ͡ᵔ ͜ʖ ͡ᵔ)', '(ಥ ͜ʖಥ)', '( ͠° ͟ʖ ͡°)', '(づ ͡° ͜ʖ ͡°)づ'],
  'Small pictures': ['✈ ✈ ✈', '☕', '♫♪.ılılıll|̲̅̅●̲̅̅|̲̅̅=̲̅̅|̲̅̅●̲̅̅|llılılı.♫♪', '(¯`·.¸¸.·´¯)', '°º¤ø,¸¸,ø¤º°`°º¤ø', '▁▂▃▄▅▆▇█', '⌐╦╦═─', '(•_•)>⌐■-■', '✿ ❀ ✿']
};
/* Face builder: pick a part from each row, or let it choose. */
const FACE_PARTS = {
  'Left arm': ['', '┐', 'ლ', '╭', '(づ', '╚', '\\', 'ヽ', '૮'],
  'Left cheek': ['(', '[', '{', '（', '｢', '*', '°'],
  'Left eye': ['͡°', '◕', '•', '＾', '°', 'ಠ', '⌐■', '^', '≧', '╹', '￣', '✿', '♥', '˃', 'ಥ', 'ʘ'],
  'Mouth': [' ͜ʖ', '‿', '︿', 'ω', 'ᴥ', '╭╮', '◡', '﹏', '_', '益', '∀', '³', ' ε ', 'ᗜ', '△'],
  'Right eye': ['͡°', '◕', '•', '＾', '°', 'ಠ', '■-■', '^', '≦', '╹', '￣', '✿', '♥', '˂', 'ಥ', 'ʘ'],
  'Right cheek': [')', ']', '}', '）', '｣', '*', '°'],
  'Right arm': ['', '┌', 'ლ', '╮', 'づ', '╝', '/', 'ノ', 'ა']
};

/* ---------------- decorations and dividers (D1, D4, D5) ---------------- */
/* Each decoration is the left side; the right side is made by mirroring, so right-to-left text works too (D5). */
const MIRROR_PAIRS = { '(': ')', '[': ']', '{': '}', '<': '>', '«': '»', '‹': '›', '⟨': '⟩', '⟪': '⟫', '❮': '❯', '❰': '❱', '「': '」', '『': '』', '【': '】', '〔': '〕', '〖': '〗', '/': '\\', '→': '←', '⇒': '⇐', '➤': '➤', '¸': '¸', '`': '´', '´': '`', '❛': '❜', '❝': '❞', '⸢': '⸣', '⸤': '⸥', '﴾': '﴿' };
const mirrorChar = (ch) => MIRROR_PAIRS[ch] || Object.keys(MIRROR_PAIRS).find((k) => MIRROR_PAIRS[k] === ch) || ch;
const mirrorSide = (s) => Array.from(s).reverse().map(mirrorChar).join('');
const DECOR_SETS = {
  'Simple': ['• ', '· ', '- ', '~ ', '« ', '— ', '| ', '/ '],
  'Stars': ['★ ', '☆ ', '✦ ', '✧ ', '⋆ ', '✯ ', '⁂ ', '✩ ', '˚ ✦ ', '⋆｡°✩ '],
  'Hearts': ['♥ ', '♡ ', '❤ ', '❥ ', '•♥• ', '˙·٠•♥ ', '♡ ⋆ '],
  'Flowers': ['❀ ', '✿ ', '❁ ', '🌸 ', '⚘ ', '✾ ', '❃ ', '｡ﾟ❀ '],
  'Lines and waves': ['─── ', '═══ ', '▬▬ ', '≡≡ ', '¸¸.·´¯`·.¸ ', '·´¯`·. ', '~·~ ', '°º¤ø,¸ '],
  'Arabic ornaments': ['﴾ ', '۞ ', '❁ ', '۩ ', '٭ ', '؎ '],
  'Boxes': ['【', '『', '「', '〖', '〔', '[', '《'],
  'Sparkle': ['✨ ', '･ﾟ✧ ', '｡ﾟ+. ', '˚₊· ͟͟͞͞➳ ', '⊹ ', '✵ ']
};
const DIVIDER_SETS = {
  'Lines': ['─', '━', '═', '╌', '┄', '┈', '⎯', '‒', '–', '—', '_', '~', '·', '•', '=', '-'],
  'Patterns': ['─✦', '•·', '✿·', '═╦', '▬▭', '◇◆', '⋆·', '≈≋', '✧･', '♡·'],
  'Decorated ends': ['❖', '✦', '✿', '❀', '۞', '◆', '★', '♦']
};
function makeDivider(unit, width, cap) {
  const u = Array.from(unit || '─');
  let s = '';
  while (Array.from(s).length < Math.max(1, width)) s += u.join('');
  s = Array.from(s).slice(0, Math.max(1, width)).join('');
  return cap ? cap + ' ' + s + ' ' + mirrorSide(cap) : s;
}
function decorate(text, deco, both) {
  if (!deco) return text;
  const left = deco, right = mirrorSide(deco.trim()) + (deco.endsWith(' ') ? '' : '');
  return both ? left + text + ' ' + right : left + text;
}

/* ---------------- keyword expansions (G4) ---------------- */
const EXPAND_DEFAULT = {
  shrug: '¯\\_(ツ)_/¯', tableflip: '(╯°□°）╯︵ ┻━┻', unflip: '┬─┬ ノ( ゜-゜ノ)', lenny: '( ͡° ͜ʖ ͡°)',
  bear: 'ʕ•ᴥ•ʔ', cat: '(=^･ω･^=)', happy: '(◕‿◕)', love: '(♥‿♥)', cry: '(╥﹏╥)', star: '★', heart: '♥',
  check: '✓', cross: '✗', arrow: '→', deg: '°', tm: '™', copy: '©', pm: '±', ne: '≠', inf: '∞',
  bismillah: '﷽', pbuh: 'ﷺ', rupee: '₨', euro: '€', pound: '£'
};
const EXPAND_KEY = 'sungfluence-expansions-v1';
function loadExpansions() {
  const e = Object.assign({}, EXPAND_DEFAULT);
  try { Object.assign(e, JSON.parse(localStorage.getItem(EXPAND_KEY) || '{}')); } catch (err) { /* storage blocked */ }
  return e;
}
function saveExpansions(e) {
  const diff = {};
  for (const [k, v] of Object.entries(e)) if (EXPAND_DEFAULT[k] !== v) diff[k] = v;
  for (const k of Object.keys(EXPAND_DEFAULT)) if (!(k in e)) diff[k] = '';
  try { localStorage.setItem(EXPAND_KEY, JSON.stringify(diff)); } catch (err) { /* storage blocked */ }
}
const EXPANSIONS = loadExpansions();
/* Expands (word) and :word: anywhere in a piece of text. Unknown words are left alone. */
function expandText(text) {
  return String(text).replace(/\((\w[\w-]{0,30})\)|:(\w[\w-]{0,30}):/g, (all, a, b) => {
    const k = (a || b).toLowerCase();
    return EXPANSIONS[k] ? EXPANSIONS[k] : all;
  });
}
const hasExpansion = (text) => expandText(text) !== String(text);
/* The same list for the text replacement tools people already use on their computers. */
function expansionsAs(kind) {
  const list = Object.entries(EXPANSIONS).filter(([, v]) => v);
  if (kind === 'espanso') return 'matches:\n' + list.map(([k, v]) => '  - trigger: ":' + k + '"\n    replace: "' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join('\n') + '\n';
  if (kind === 'ahk') return '#Requires AutoHotkey v2.0\n' + list.map(([k, v]) => '::' + k + '::' + v.replace(/\r?\n/g, ' ')).join('\n') + '\n';
  if (kind === 'apple') {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<array>\n' +
      list.map(([k, v]) => '  <dict>\n    <key>phrase</key>\n    <string>' + esc(v) + '</string>\n    <key>shortcut</key>\n    <string>' + esc(k) + '</string>\n  </dict>').join('\n') + '\n</array>\n</plist>\n';
  }
  return list.map(([k, v]) => '(' + k + ')\t' + v).join('\n') + '\n';
}

/* ---------------- searching the glyphs (G5) ---------------- */
function glyphSearch(q) {
  q = String(q || '').trim();
  if (!q) return null;
  const out = [];
  const push = (ch) => { if (ch && !out.includes(ch)) out.push(ch); };
  // a code point, written in any of the usual ways
  let m = /^(?:u\+|0x|\\u)([0-9a-f]{2,6})$/i.exec(q);
  if (m) { try { push(cp(parseInt(m[1], 16))); } catch (e) { /* not a character */ } }
  if (/^\d{1,7}$/.test(q)) { try { push(cp(+q)); } catch (e) { /* not a character */ } }        // Windows Alt code and decimal
  m = /^&#?x?([0-9a-z]+);?$/i.exec(q);
  if (m) {
    const name = m[1].toLowerCase();
    const hit = Object.entries(GLYPH_ENTITY).find(([, n]) => n.toLowerCase() === name);
    if (hit) push(hit[0]);
    if (/^x[0-9a-f]+$/i.test(m[1])) { try { push(cp(parseInt(m[1].slice(1), 16))); } catch (e) { /* not a character */ } }
    else if (/^\d+$/.test(m[1])) { try { push(cp(+m[1])); } catch (e) { /* not a character */ } }
  }
  if (Array.from(q).length === 1) push(q);
  // by name, tag or set, with * standing for anything
  const rx = new RegExp(q.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');
  for (const [ch, name] of Object.entries(GLYPH_NAMES)) if (rx.test(name)) push(ch);
  for (const [ch, name] of Object.entries(GLYPH_ENTITY)) if (rx.test(name)) push(ch);
  for (const [set, chars] of Object.entries(SYMBOL_SETS)) if (rx.test(set)) Array.from(chars).forEach(push);
  for (const [set, list] of Object.entries(ART_SETS)) if (rx.test(set)) list.forEach(push);
  return out.slice(0, 400);
}
/* How to type a glyph elsewhere, shown under the search results. */
function glyphInfo(ch) {
  const code = ch.codePointAt(0);
  const hex = code.toString(16).toUpperCase().padStart(4, '0');
  const bits = ['U+' + hex];
  if (GLYPH_ENTITY[ch]) bits.push('&' + GLYPH_ENTITY[ch] + ';');
  bits.push('&#' + code + ';');
  if (code < 65536) bits.push('Alt ' + code);
  return { name: GLYPH_NAMES[ch] || '', how: bits.join('  ·  '), code };
}
