/* ===================== Part 6a: export formats, the Export window, project files ===================== */
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Every output format is one entry in EXPORTERS: an id, a group, a title, the options it offers and a run(options) function.
// The Export window, the Export menu and the command palette are all made from this one list.
// registerExporter() adds a format; later, plugins will be able to add their own the same way.
//
// Nothing here runs at load time except plain definitions, because this part loads before 06-io.js.

/* ---------------- small helpers ---------------- */
const b64ToBytes = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const dataURLParts = (u) => { const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(u || ''); return m ? { type: m[1], b64: m[2] ? m[3] : btoa(unescape(m[3])) } : null; };
const extOf = (type) => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/gif': 'gif' })[type] || 'bin';
function aboutBytes(n) { return n > 1e6 ? 'about ' + (n / 1e6).toFixed(n > 1e7 ? 0 : 1) + ' MB' : 'about ' + Math.max(1, Math.round(n / 1e3)) + ' KB'; }

/* ---------------- the recipe that travels with a file (O5) ----------------
   The look only: styles, text, colors, paper and photo adjustments. Never the photo, never a crop. */
function recipeData() {
  const o = doc.out, ph = Object.assign({}, doc.photo); delete ph.crop; delete ph.ratio; delete ph.liquify;
  return { app: 'sungfluence', kind: 'recipe', v: 1,
    text: { source: doc.text.source, sel: doc.text.sel, layers: doc.text.layers.map((L) => { const c = Object.assign({}, L); delete c.id; return c; }) },
    out: { paper: o.paper, transparent: o.transparent, margin: o.margin, colorModel: o.colorModel }, photo: ph };
}
function applySavedRecipe(r, fileName, file) {
  if (!r || r.kind !== 'recipe' || !r.text || !Array.isArray(r.text.layers)) return false;
  const layers = r.text.layers.filter((L) => MODES[L.mode]).map((L) => newLayer(L.mode, Object.assign({}, L, { id: undefined })));
  if (!layers.length) return false;
  commitHistory(); revealSoon();
  doc.text.layers = layers.concat(doc.text.layers.filter((L) => L.mode === 'paths' && doc.text.source === 'both'));
  doc.text.sel = clamp(r.text.sel || 0, 0, layers.length - 1);
  if (r.text.source && r.text.source !== 'lines') doc.text.source = r.text.source === 'both' && !doc.lines.paths.length ? 'photo' : r.text.source;
  Object.assign(doc.out, r.out || {});
  if (r.photo) { const crop = doc.photo.crop, ratio = doc.photo.ratio, liquify = doc.photo.liquify; doc.photo = migratePhoto(Object.assign({}, PHOTO_DEFAULTS, r.photo, { crop, ratio, liquify })); rebuildBase(); rebuildPhotoView(); }
  doc.text.applied = true;
  buildAll(); if (ui.view === 'photo') setView('text'); else compose();
  scheduleText(0); queueHistory();
  toast('Applied the look saved in ' + (fileName || 'that file'), file ? { label: 'Open as a picture', fn: () => { undo(); loadFile(file, true); } } : { label: 'Undo', fn: undo });
  return true;
}

/* PNG: the recipe sits in an iTXt chunk named "sungfluence", just before the end of the file */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function pngWithRecipe(blob, rec) {
  const src = new Uint8Array(await blob.arrayBuffer());
  const text = new TextEncoder().encode(JSON.stringify(rec));
  const key = new TextEncoder().encode('sungfluence');
  const data = new Uint8Array(key.length + 5 + text.length);
  data.set(key, 0); // keyword, then: null, compression flag, method, empty language, empty translated keyword
  data.set(text, key.length + 5);
  const type = new TextEncoder().encode('iTXt');
  const chunk = new Uint8Array(12 + data.length), dv = new DataView(chunk.buffer);
  dv.setUint32(0, data.length); chunk.set(type, 4); chunk.set(data, 8);
  const crcIn = new Uint8Array(4 + data.length); crcIn.set(type, 0); crcIn.set(data, 4);
  dv.setUint32(8 + data.length, crc32(crcIn));
  // find IEND and put the chunk in front of it
  let p = 8;
  while (p < src.length) {
    const len = new DataView(src.buffer, src.byteOffset + p).getUint32(0);
    const t = String.fromCharCode(src[p + 4], src[p + 5], src[p + 6], src[p + 7]);
    if (t === 'IEND') break;
    p += 12 + len;
  }
  const outB = new Uint8Array(src.length + chunk.length);
  outB.set(src.subarray(0, p), 0); outB.set(chunk, p); outB.set(src.subarray(p), p + chunk.length);
  return new Blob([outB], { type: 'image/png' });
}
function recipeFromPNG(buf) {
  const u = new Uint8Array(buf);
  if (u.length < 8 || u[0] !== 0x89 || u[1] !== 0x50) return null;
  let p = 8;
  while (p + 8 <= u.length) {
    const len = new DataView(u.buffer, u.byteOffset + p).getUint32(0);
    const t = String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]);
    if (t === 'iTXt' || t === 'tEXt') {
      const d = u.subarray(p + 8, p + 8 + len);
      const z = d.indexOf(0);
      if (new TextDecoder().decode(d.subarray(0, z)) === 'sungfluence') {
        let q = z + 1;
        if (t === 'iTXt') { q += 2; q = d.indexOf(0, q) + 1; q = d.indexOf(0, q) + 1; }
        try { return JSON.parse(new TextDecoder().decode(d.subarray(q))); } catch (e) { return null; }
      }
    }
    if (t === 'IEND') break;
    p += 12 + len;
  }
  return null;
}
/* SVG: the recipe sits in <metadata>, as JSON */
function svgWithRecipe(svg, rec) {
  const m = '<metadata id="sungfluence-recipe"><![CDATA[' + JSON.stringify(rec).replace(/]]>/g, ']]]]><![CDATA[>') + ']]></metadata>';
  return svg.replace(/(<svg\b[^>]*>)/, (s) => s + '\n' + m);
}
function recipeFromSVG(text) {
  const m = /<metadata id="sungfluence-recipe"><!\[CDATA\[([\s\S]*?)\]\]><\/metadata>/.exec(text);
  if (!m) return null;
  try { return JSON.parse(m[1].replace(/]]]]><!\[CDATA\[>/g, ']]>')); } catch (e) { return null; }
}
/* looks inside a dropped PNG or SVG for a saved look */
async function recipeInFile(file) {
  try {
    if (/svg/.test(file.type) || /\.svg$/i.test(file.name)) return recipeFromSVG(await file.text());
    if (/png/.test(file.type) || /\.png$/i.test(file.name)) return recipeFromPNG(await file.arrayBuffer());
  } catch (e) { /* not readable: open it as a picture */ }
  return null;
}

/* ---------------- project file, version 5: one .sungfluence zip ----------------
   project.json holds the settings; the photo, image objects and a preview are separate files inside.
   layers: which of photo, lines (vector) and text to keep. */
const PROJECT_EXT = '.sungfluence';
async function projectZip(layers) {
  layers = Object.assign({ photo: true, lines: true, text: true }, layers || {});
  const JSZip = await zipReady();
  const z = new JSZip();
  const p = JSON.parse(JSON.stringify(projectData()));
  p.v = 5; p.layers = layers;
  if (!layers.photo) {
    const c = mk(iw, ih), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, iw, ih);
    p.image = c.toDataURL('image/png'); p.photo = Object.assign({}, PHOTO_DEFAULTS, { crop: doc.photo.crop, ratio: doc.photo.ratio }); p.mask = null; p.blank = p.blank || { bg: '#ffffff' };
    p.objects = p.objects.filter((q) => q.layer !== 'photo');
  }
  if (!layers.lines) { p.lines.paths = []; p.objects = p.objects.filter((q) => q.layer === 'photo'); }
  if (!layers.text) { p.text.layers = [newLayer('rows')]; p.text.applied = false; }
  const im = dataURLParts(p.image);
  if (im) { const name = 'image.' + extOf(im.type); z.file(name, im.b64, { base64: true }); p.image = name; }
  const used = {};
  Object.entries(p.assets || {}).forEach(([id, url]) => {
    if (!p.objects.some((q) => q.asset === id)) return;
    const a = dataURLParts(url);
    if (a) { const name = 'assets/' + id + '.' + extOf(a.type); z.file(name, a.b64, { base64: true }); used[id] = name; } else used[id] = url;
  });
  p.assets = used;
  z.file('project.json', JSON.stringify(p, null, 1));
  try { const t = mk(320, Math.max(1, Math.round(320 * canvas.height / canvas.width))); t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height); z.file('preview.png', (await toBlob(t, 'image/png')) || '', {}); } catch (e) { /* no preview */ }
  z.file('README.txt', 'A SungFluence project. Open it in SungFluence with File, Open.\nproject.json holds the settings; the pictures are stored next to it.\n');
  return z.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/zip' });
}
async function saveProjectFile(layers) {
  if (!origImg) return;
  try { await saveFile(baseName() + PROJECT_EXT, await projectZip(layers)); }
  catch (e) { toast('The project could not be saved. ' + (e && e.message ? e.message : '')); }
}
async function openProjectZip(file) {
  try {
    const JSZip = await zipReady();
    const z = await JSZip.loadAsync(file);
    const pj = z.file('project.json');
    if (!pj) throw new Error('no project.json');
    const p = JSON.parse(await pj.async('string'));
    const asData = async (name) => {
      const f = z.file(name); if (!f) return null;
      const ext = name.split('.').pop().toLowerCase();
      return 'data:' + ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif' }[ext] || 'application/octet-stream') + ';base64,' + await f.async('base64');
    };
    if (p.image && !/^data:/.test(p.image)) p.image = await asData(p.image);
    for (const [id, v] of Object.entries(p.assets || {})) if (v && !/^data:/.test(v)) p.assets[id] = await asData(v);
    return openProject(p);
  } catch (e) { toast('That project file could not be opened.'); return false; }
}

/* ---------------- text twins and code outputs ---------------- */
const TEXT_DEF = { cols: 80, chars: 'ramp', own: '', aspect: 2, blank: true, invert: false, color: true, depth: 256, lang: 'js', form: 'string', name: 'art', prog: 'mytool' };
const CHAR_CHOICES = [['ramp', 'Keyboard characters, light to dark'], ['blocks', 'Shade blocks ░▒▓█'], ['braille', 'Braille dots (fine detail)'], ['az', 'The letters A to Z, in order'],
  ['digits', 'Digits 0 to 9'], ['letters', 'ASCII letters only'], ['symbols', 'ASCII symbols only'], ['own', 'Your own characters']];
const TEXT_OPTS = [
  SEL('cols', 'Width in characters', [[40, '40'], [60, '60'], [80, '80 (classic terminal)'], [100, '100'], [120, '120'], [160, '160']]),
  SEL('chars', 'Characters', CHAR_CHOICES),
  { key: 'own', label: 'Your characters (any order, or the text to repeat for A to Z)', type: 'text', show: (o) => o.chars === 'own' || o.chars === 'az' },
  SEL('aspect', 'Cell shape of the font it will be read in', [[2, 'Terminals and code editors (2 : 1)'], [1.8, 'Notepad and most text boxes (1.8 : 1)'], [1.6, 'Wide fonts (1.6 : 1)'], [1, 'Square cells (1 : 1)']]),
  T('blank', 'Spaces for white areas'),
  T('invert', 'Swap ink and paper')
];
function textOpt(o) {
  const chars = o.chars === 'own' ? (o.own || ' .#') : o.chars;
  return { chars, aspect: +o.aspect || 2, blank: o.blank !== false, invert: !!o.invert, text: o.chars === 'az' && o.own ? o.own : undefined };
}
const twinGrid = (r, o) => C.textGrid(r.out, +o.cols || 80, textOpt(o));
const twinLines = (r, o) => C.gridLines(twinGrid(r, o));
const rowsFor = (o) => { const g = artGeom(1); return Math.max(1, Math.round((+o.cols || 80) * g.H / g.W / (+o.aspect || 2))); };
/* code: the art as a string or a comment block in a programming language */
const LANGS = [['js', 'JavaScript'], ['ts', 'TypeScript'], ['py', 'Python'], ['c', 'C'], ['cpp', 'C++'], ['cs', 'C#'], ['java', 'Java'], ['go', 'Go'], ['rs', 'Rust'], ['sh', 'Shell (bash)'], ['ps1', 'PowerShell'], ['rb', 'Ruby'], ['php', 'PHP'], ['lua', 'Lua'], ['sql', 'SQL'], ['html', 'HTML comment']];
const LANG_EXT = { js: 'js', ts: 'ts', py: 'py', c: 'c', cpp: 'cpp', cs: 'cs', java: 'java', go: 'go', rs: 'rs', sh: 'sh', ps1: 'ps1', rb: 'rb', php: 'php', lua: 'lua', sql: 'sql', html: 'html' };
const qstr = (s) => JSON.stringify(s); // a double-quoted string with escapes that these languages all read
function codeFor(lines, lang, form, name) {
  name = (name || 'art').replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'art';
  const N = lines.length;
  if (form === 'comment') {
    const hash = ['py', 'sh', 'rb', 'ps1'].includes(lang);
    if (lang === 'sql' || lang === 'lua') return lines.map((l) => '-- ' + l).join('\n') + '\n';
    if (lang === 'html') return '<!--\n' + lines.map((l) => l.replace(/--/g, '- -')).join('\n') + '\n-->\n';
    if (hash) return lines.map((l) => ('# ' + l).replace(/\s+$/, '')).join('\n') + '\n';
    return '/*\n' + lines.map((l) => (' * ' + l.replace(/\*\//g, '* /')).replace(/\s+$/, '')).join('\n') + '\n */\n';
  }
  const arr = lines.map(qstr);
  switch (lang) {
    case 'js': return 'const ' + name + ' = [\n  ' + arr.join(',\n  ') + '\n].join("\\n");\n\nconsole.log(' + name + ');\n';
    case 'ts': return 'export const ' + name + ': string = [\n  ' + arr.join(',\n  ') + '\n].join("\\n");\n';
    case 'py': return name + ' = "\\n".join([\n    ' + arr.join(',\n    ') + ',\n])\n\nif __name__ == "__main__":\n    print(' + name + ')\n';
    case 'c': return '#include <stdio.h>\n\nstatic const char *' + name + '[] = {\n  ' + arr.join(',\n  ') + '\n};\n\nint main(void) {\n  for (int i = 0; i < ' + N + '; i++) puts(' + name + '[i]);\n  return 0;\n}\n';
    case 'cpp': return '#include <iostream>\n\nstatic const char *' + name + '[] = {\n  ' + arr.join(',\n  ') + '\n};\n\nint main() {\n  for (auto line : ' + name + ') std::cout << line << "\\n";\n}\n';
    case 'cs': return 'static class Art\n{\n    public static readonly string[] Lines =\n    {\n        ' + arr.join(',\n        ') + '\n    };\n\n    static void Main() { foreach (var l in Lines) System.Console.WriteLine(l); }\n}\n';
    case 'java': return 'public class Art {\n    static final String[] LINES = {\n        ' + arr.join(',\n        ') + '\n    };\n\n    public static void main(String[] args) {\n        for (String l : LINES) System.out.println(l);\n    }\n}\n';
    case 'go': return 'package main\n\nimport (\n\t"fmt"\n\t"strings"\n)\n\nvar ' + name + ' = strings.Join([]string{\n\t' + arr.join(',\n\t') + ',\n}, "\\n")\n\nfunc main() { fmt.Println(' + name + ') }\n';
    case 'rs': return 'const ' + name.toUpperCase() + ': &[&str] = &[\n    ' + arr.join(',\n    ') + ',\n];\n\nfn main() {\n    for l in ' + name.toUpperCase() + ' { println!("{}", l); }\n}\n';
    case 'sh': return "#!/usr/bin/env bash\ncat <<'SUNGFLUENCE_ART'\n" + lines.join('\n') + '\nSUNGFLUENCE_ART\n';
    case 'ps1': return "$" + name + " = @'\n" + lines.join('\n') + "\n'@\nWrite-Output $" + name + '\n';
    case 'rb': return name.toUpperCase() + " = <<~'ART'\n" + lines.map((l) => '  ' + l).join('\n') + '\nART\n\nputs ' + name.toUpperCase() + '\n';
    case 'php': return "<?php\n$" + name + " = <<<'ART'\n" + lines.join('\n') + "\nART;\necho $" + name + ', PHP_EOL;\n';
    case 'lua': return 'local ' + name + ' = table.concat({\n  ' + arr.join(',\n  ') + '\n}, "\\n")\nprint(' + name + ')\n';
    case 'sql': return "SELECT '" + lines.map((l) => l.replace(/'/g, "''")).join("' || CHAR(10) || '") + "' AS " + name + ';\n';
    case 'html': return '<pre aria-label="Text art">' + lines.map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('\n') + '</pre>\n';
  }
  return lines.join('\n') + '\n';
}
/* a shell script whose --help starts with the art */
function helpHeader(lines, prog) {
  prog = (prog || 'mytool').replace(/[^A-Za-z0-9._-]/g, '') || 'mytool';
  return "#!/usr/bin/env bash\n# " + prog + ": replace this with what your tool does.\n\nusage() {\n  cat <<'SUNGFLUENCE_ART'\n" + lines.join('\n') +
    '\nSUNGFLUENCE_ART\n  cat <<EOF\n\nUsage: ' + prog + ' [options] <file>\n\nOptions:\n  -h, --help     Show this help and exit\n  -v, --version  Show the version and exit\nEOF\n}\n\ncase "${1:-}" in\n  -h|--help) usage; exit 0 ;;\n  -v|--version) echo "' + prog + ' 1.0"; exit 0 ;;\nesac\n\nusage\n';
}

/* ---------------- the list of formats ----------------
   group: where it sits in the window and menu. needs: 'text' when text art must be applied first.
   layers: true when the user picks which layers go in. opts: controls (R, T, S, SEL from 01-data.js).
   info(o): the size line in the window. run(o): makes and saves the file. */
const RECIPE_OPT = T('recipe', 'Keep the style settings inside the file (never the photo)');
const LAYER_IDS = [['photo', 'Photo'], ['lines', 'Vector'], ['text', 'Text art']];
const layerList = (o) => LAYER_IDS.map(([id]) => id).filter((id) => o['layer_' + id]);
const pngSize = (w, h) => aboutBytes(w * h * 1.6);
const EXPORTERS = [];
function registerExporter(x) {
  const i = EXPORTERS.findIndex((e) => e.id === x.id);
  if (i >= 0) EXPORTERS[i] = x; else EXPORTERS.push(x);
  return x;
}
const GROUPS = ['Picture', 'Text art', 'Text twins', 'Code', 'Project'];
[
  { id: 'png-view', group: 'Picture', title: 'PNG of the visible layers', always: true, layers: true, opts: [RECIPE_OPT],
    sub: () => { const g = artGeom(1); return 'Every shown layer in its order, ' + g.TW + ' × ' + g.TH + ' px'; },
    info: () => { const g = artGeom(1); return g.TW + ' × ' + g.TH + ' px, ' + pngSize(g.TW, g.TH); },
    run: (o) => flatPNG(o && o.layers ? o.layers : null, '-view', { recipe: o && o.recipe }) },
  { id: 'jpg-view', group: 'Picture', title: 'JPG of the visible layers', always: true, layers: true, opts: [SEL('quality', 'Quality', [[0.92, 'High'], [0.85, 'Good, smaller file'], [0.75, 'Small file']])],
    sub: () => 'A smaller file for sharing. JPG has no transparency: the background gets the ' + (doc.out.mock === 'shirt' ? 'T-shirt' : 'paper') + ' color',
    info: () => { const g = artGeom(1); return g.TW + ' × ' + g.TH + ' px, ' + aboutBytes(g.TW * g.TH * 0.35) + ', background ' + doc.out.paper; },
    run: (o) => flatPNG(o && o.layers ? o.layers : null, '-view', { jpg: (o && +o.quality) || 0.92, ground: 'paper' }) },
  { id: 'svg-view', group: 'Picture', title: 'SVG of the visible layers', always: true, layers: true, opts: [RECIPE_OPT],
    sub: () => 'Photo as a picture, vector shapes and live text art letters',
    info: () => { const g = artGeom(1); return g.TW + ' × ' + g.TH + ' px, letters stay editable'; },
    run: (o) => fullSVG(o && o.layers, o && o.recipe) },
  { id: 'png-photo-vector', group: 'Picture', title: 'Photo and vector, PNG', always: true, sub: () => 'The photo layer with shapes and lines, no text art',
    info: () => { const g = artGeom(1); return g.TW + ' × ' + g.TH + ' px'; }, run: () => flatPNG(['photo', 'lines'], '-photo-vector') },
  { id: 'svg-vector', group: 'Picture', title: 'Vector layer, SVG', always: true, sub: () => 'Lines drawn as strokes, shapes, text and images',
    info: () => (doc.lines.paths.length + doc.objects.length) + ' lines and objects', run: () => saveFile(baseName() + '-vector.svg', vectorSVG()) },
  { id: 'png-vector', group: 'Picture', title: 'Vector layer, PNG', always: true, sub: () => 'Transparent background',
    info: () => { const g = artGeom(1); return g.TW + ' × ' + g.TH + ' px, transparent'; }, run: () => flatPNG(['lines'], '-vector', { ground: null, ignoreOpacity: true }) },
  { id: 'png-photo', group: 'Picture', title: 'Photo layer, edited', always: true, sub: () => 'Adjustments, effects, crop and photo objects, transparent where removed',
    info: () => { const cr = cropRect(); return Math.round(cr.w * iw) + ' × ' + Math.round(cr.h * ih) + ' px'; }, run: () => photoCutout() },

  { id: 'png-print', group: 'Text art', title: 'PNG for print', opts: [RECIPE_OPT],
    sub: () => { const g = printGeom(); return g.needPx.toLocaleString() + ' × ' + g.needH.toLocaleString() + ' px, ' + g.name + ' at ' + g.realDpi + ' dpi' + (doc.out.transparent ? ', transparent' : ''); },
    info: () => { const g = printGeom(); return g.needPx.toLocaleString() + ' × ' + g.needH.toLocaleString() + ' px, ' + g.name + ' at ' + g.realDpi + ' dpi, ' + pngSize(g.needPx, g.needH); },
    run: (o) => runExport(printScaleFor, async (r) => saveFile(baseName() + '-' + printTag() + '.png', await withRecipePNG(await toBlob(r.canvas, 'image/png'), o))) },
  { id: 'png-art', group: 'Text art', title: 'PNG at artboard size', opts: [RECIPE_OPT],
    sub: () => { const g = artGeom(1); return g.TW + ' × ' + g.TH + ' px'; }, info: () => { const g = artGeom(1); return g.TW + ' × ' + g.TH + ' px, ' + pngSize(g.TW, g.TH); },
    run: (o) => runExport(() => 1, async (r) => saveFile(baseName() + '.png', await withRecipePNG(await toBlob(r.canvas, 'image/png'), o))) },
  { id: 'svg-art', group: 'Text art', title: 'SVG with live text', opts: [RECIPE_OPT], sub: () => 'Editable letters for Illustrator, Inkscape or Figma',
    info: () => (out ? out.layers.reduce((n, L) => n + L.items.length, 0).toLocaleString() + ' letters and shapes' : 'Editable letters'),
    run: (o) => runExport(null, async (r) => { const s = C.toSVG(r.out, FONT_IMPORT); return saveFile(baseName() + '.svg', o && o.recipe ? svgWithRecipe(s, recipeData()) : s); }) },
  { id: 'pdf-print', group: 'Text art', title: 'PDF for print', sub: () => printGeom().name + ' page, artwork at ' + printGeom().realDpi + ' dpi', info: () => { const g = printGeom(); return g.name + ' ' + (g.land ? 'landscape' : 'portrait') + ', ' + g.realDpi + ' dpi' + (g.rot ? ', art turned ' + g.rot + '°' : ''); },
    run: () => runExport(printScaleFor, async (r) => {
      const jsPDF = await jsPDFReady(); const g = printGeom();
      const pdf = new jsPDF({ orientation: g.land ? 'landscape' : 'portrait', unit: 'mm', format: [g.pw, g.ph].sort((a, b) => a - b), compress: true });
      if (g.rot) {
        // turned art: draw the whole page as one picture, at the chosen dpi or as close as fits
        const ppm = Math.min(doc.out.dpi / 25.4, 12000 / Math.max(g.pw, g.ph));
        const pc = mk(Math.round(g.pw * ppm), Math.round(g.ph * ppm)), x = pc.getContext('2d');
        if (!doc.out.transparent) { x.fillStyle = r.out.paper; x.fillRect(0, 0, pc.width, pc.height); }
        x.translate(pc.width / 2, pc.height / 2); x.rotate(g.rot * Math.PI / 180);
        x.imageSmoothingQuality = 'high';
        x.drawImage(r.canvas, -g.aw * ppm / 2, -g.ah * ppm / 2, g.aw * ppm, g.ah * ppm);
        pdf.addImage(doc.out.transparent ? pc.toDataURL('image/png') : pc.toDataURL('image/jpeg', 0.93), doc.out.transparent ? 'PNG' : 'JPEG', 0, 0, g.pw, g.ph);
      } else if (!doc.out.transparent) { pdf.setFillColor(r.out.paper); pdf.rect(0, 0, g.pw, g.ph, 'F'); pdf.addImage(r.canvas.toDataURL('image/jpeg', 0.93), 'JPEG', g.x, g.y, g.aw, g.ah); }
      else pdf.addImage(r.canvas.toDataURL('image/png'), 'PNG', g.x, g.y, g.aw, g.ah);
      await saveFile(baseName() + '-' + printTag() + '.pdf', pdf.output('blob'));
    }) },
  { id: 'pdf-cmyk', group: 'Text art', title: 'CMYK PDF, vector', sub: () => 'Live letters with CMYK ink values, ' + printGeom().name, info: () => printGeom().name + ' page, live letters' + (printGeom().rot ? ', art kept straight' : ''), run: () => runExport(null, (r) => cmykPDF(r.out)) },
  { id: 'cmyk-plates', group: 'Text art', title: 'CMYK plates', sub: () => 'Four PNG separations in one .zip, for screen print', info: () => 'Four PNG files in a .zip',
    run: () => runExport((o) => Math.min(printScaleFor(o), 4000 / Math.max(o.W, o.H)), (r) => separations(r.canvas)) },

  { id: 'txt-plain', group: 'Text twins', title: 'Plain text', sub: () => 'Any style as characters you can paste anywhere', opts: TEXT_OPTS,
    info: (o) => (+o.cols) + ' × ' + rowsFor(o) + ' characters',
    run: (o) => runExport(null, (r) => saveFile(baseName() + '-' + (o.chars === 'braille' ? 'braille' : 'text') + '.txt', twinLines(r, o).join('\n') + '\n')) },
  { id: 'txt-md', group: 'Text twins', title: 'Markdown', sub: () => 'Text art inside a code block, for README files and chats', opts: TEXT_OPTS,
    info: (o) => (+o.cols) + ' × ' + rowsFor(o) + ' characters in a code block',
    run: (o) => runExport(null, (r) => saveFile(baseName() + '.md', '```text\n' + twinLines(r, o).join('\n').replace(/```/g, '`\u200b``') + '\n```\n')) },
  { id: 'txt-html', group: 'Text twins', title: 'HTML page', sub: () => 'Colored characters in a web page', opts: TEXT_OPTS.concat([T('color', 'Keep the colors')]),
    info: (o) => (+o.cols) + ' × ' + rowsFor(o) + ' characters' + (o.color ? ', in color' : ''),
    run: (o) => runExport(null, (r) => saveFile(baseName() + '.html', C.gridHTML(twinGrid(r, o), o.color, doc.fileName))) },
  { id: 'txt-ansi', group: 'Text twins', title: 'Terminal colors', sub: () => 'Any style as colored text for a terminal (cat the file)', opts: TEXT_OPTS.concat([S('depth', 'Colors', [[16, '16'], [256, '256'], ['full', 'Full color']])]),
    info: (o) => (+o.cols) + ' × ' + rowsFor(o) + ' characters, ' + (o.depth === 'full' ? 'full color' : o.depth + ' colors'),
    run: (o) => runExport(null, (r) => saveFile(baseName() + '-ansi' + (o.depth === 'full' ? '-full' : o.depth) + '.txt', C.gridANSI(twinGrid(r, o), o.depth) + '\n')) },
  { id: 'txt-svg', group: 'Text twins', title: 'SVG for README files', sub: () => 'Text rows in a small SVG that GitHub and GitLab show as a picture', opts: TEXT_OPTS.concat([T('color', 'Keep the colors')]),
    info: (o) => (+o.cols) + ' × ' + rowsFor(o) + ' characters, no fonts or scripts',
    run: (o) => runExport(null, (r) => saveFile(baseName() + '-readme.svg', C.gridSVG(twinGrid(r, o), o.color))) },
  { id: 'txt-grid', group: 'Text twins', title: 'Grid text, exact', sub: () => 'The exact characters of an ASCII or Braille layer', when: () => activeLayers().some((L) => L.mode === 'grid' || L.mode === 'unicode'),
    info: () => 'The characters exactly as placed',
    run: () => runExport(null, (r) => saveFile(baseName() + '-grid.txt', r.out.layers.filter((L) => L.text).map((L) => L.text).join('\n\n'))) },
  { id: 'txt-ansi-grid', group: 'Text twins', title: 'Color terminal text, exact', sub: () => 'ASCII layer with 16-color codes, letter for letter', when: () => activeLayers().some((L) => L.mode === 'grid'),
    info: () => '16 colors, letter for letter', run: () => runExport(null, (r) => { const t = C.toANSI(r.out); if (t) return saveFile(baseName() + '-ansi.txt', t); }) },

  { id: 'code', group: 'Code', title: 'Code', sub: () => 'The art as a string or a comment block in a programming language',
    opts: [SEL('lang', 'Language', LANGS), S('form', 'As', [['string', 'A string'], ['comment', 'A comment block']]), { key: 'name', label: 'Name of the string', type: 'text', show: (o) => o.form === 'string' }].concat(TEXT_OPTS),
    info: (o) => (+o.cols) + ' × ' + rowsFor(o) + ' characters, ' + (LANGS.find((l) => l[0] === o.lang) || ['', ''])[1],
    run: (o) => runExport(null, (r) => saveFile(baseName() + (o.form === 'comment' ? '-comment' : '') + '.' + LANG_EXT[o.lang], codeFor(twinLines(r, o), o.lang, o.form, o.name))) },
  { id: 'help-header', group: 'Code', title: '--help header', sub: () => 'A shell script whose --help starts with the art', opts: [{ key: 'prog', label: 'Name of the tool', type: 'text' }].concat(TEXT_OPTS),
    info: (o) => (+o.cols) + ' × ' + rowsFor(o) + ' characters, then the usage text',
    run: (o) => runExport(null, (r) => saveFile((o.prog || 'mytool').replace(/[^A-Za-z0-9._-]/g, '') + '-help.sh', helpHeader(twinLines(r, o), o.prog))) },
  { id: 'motd', group: 'Code', title: 'Login message', sub: () => 'A motd file that a server shows when someone signs in', opts: TEXT_OPTS.concat([S('depth', 'Colors', [['none', 'None'], [16, '16'], [256, '256']])]),
    info: (o) => (+o.cols) + ' × ' + rowsFor(o) + ' characters. On Linux it goes in /etc/motd',
    run: (o) => runExport(null, (r) => saveFile('motd', (o.depth === 'none' || !o.depth ? twinLines(r, o).join('\n') : C.gridANSI(twinGrid(r, o), o.depth)) + '\n')) },

  { id: 'project', group: 'Project', title: 'Save project', always: true, layers: true, sub: () => 'One ' + PROJECT_EXT + ' file with the photo, removed areas, lines, objects, layers and settings (' + MOD + ' S)',
    info: (o) => { const L = layerList(o); return L.length ? 'Keeps ' + L.map((id) => LAYER_IDS.find((x) => x[0] === id)[1].toLowerCase()).join(', ') : 'Choose at least one layer'; },
    run: (o) => saveProjectFile(o && o.layers ? { photo: o.layers.includes('photo'), lines: o.layers.includes('lines'), text: o.layers.includes('text') } : null) },
  { id: 'open', group: 'Project', title: 'Open project', always: true, noWindow: true, sub: () => 'Pick a ' + PROJECT_EXT + ' or .json file saved from SungFluence', run: () => $('fileInput').click() }
].forEach(registerExporter);

async function withRecipePNG(blob, o) { return o && o.recipe ? pngWithRecipe(blob, recipeData()) : blob; }

/* The Export menu and the command palette still read EXPORTS: headings, then formats. */
const EXPORTS = [];
function refreshExportsList() {
  EXPORTS.length = 0;
  GROUPS.forEach((g) => {
    const list = EXPORTERS.filter((x) => x.group === g);
    if (!list.length) return;
    EXPORTS.push({ head: g });
    list.forEach((x) => EXPORTS.push(x));
  });
  EXPORTERS.filter((x) => !GROUPS.includes(x.group)).forEach((x) => EXPORTS.push(x));
}
refreshExportsList();

/* ---------------- the Export window ---------------- */
const EXPORT_KEY = 'sungfluence-export';
let expState = null;
function exportState() {
  if (expState) return expState;
  expState = { id: 'png-view', opts: {} };
  try { const s = JSON.parse(localStorage.getItem(EXPORT_KEY) || 'null'); if (s && s.id) expState = Object.assign(expState, s); } catch (e) { /* storage blocked */ }
  return expState;
}
function saveExportState() { try { localStorage.setItem(EXPORT_KEY, JSON.stringify(expState)); } catch (e) { /* storage blocked */ } }
function exporterOpts(x) {
  const st = exportState();
  const o = st.opts[x.id] || (st.opts[x.id] = {});
  (x.opts || []).forEach((c) => { if (o[c.key] === undefined) o[c.key] = c.key in TEXT_DEF ? TEXT_DEF[c.key] : (c.key === 'recipe' ? false : c.type === 'toggle' ? false : c.options ? c.options[0][0] : ''); });
  if (x.layers) LAYER_IDS.forEach(([id]) => { if (o['layer_' + id] === undefined || !o.layersTouched) o['layer_' + id] = x.id === 'project' ? true : layerOf(id).visible; });
  return o;
}
const exporterReady = (x) => !!origImg && (x.always || doc.text.applied) && (!x.when || x.when());
function runExporter(x, o) {
  if (!origImg) return;
  if (!x.always && !doc.text.applied) { toast('Apply text art first, or export the photo itself.'); return; }
  const opts = Object.assign({}, o || {});
  if (x.layers && o) { opts.layers = layerList(o); if (!opts.layers.length) { toast('Choose at least one layer.'); return; } }
  x.run(opts);
}
function openExport(id) {
  if (!origImg) return;
  closeMenu();
  const st = exportState();
  if (id) st.id = id;
  if (!EXPORTERS.some((x) => x.id === st.id && !x.noWindow)) st.id = 'png-view';
  openDialog('Export', (body, d) => {
    d.classList.add('export-dlg');
    const wrapEl = el('div', 'exp'), list = el('div', 'exp-list'), pane = el('div', 'exp-pane');
    list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Formats');
    wrapEl.append(list, pane); body.appendChild(wrapEl);
    const drawList = () => {
      list.replaceChildren();
      GROUPS.concat(EXPORTERS.map((x) => x.group).filter((g) => !GROUPS.includes(g))).filter((g, i, a) => a.indexOf(g) === i).forEach((g) => {
        const items = EXPORTERS.filter((x) => x.group === g && !x.noWindow && (!x.when || x.when()));
        if (!items.length) return;
        list.appendChild(el('div', 'exp-g', g));
        items.forEach((x) => {
          const b = el('button', 'exp-item', x.title); b.type = 'button'; b.setAttribute('role', 'option');
          b.setAttribute('aria-selected', String(x.id === st.id)); b.dataset.id = x.id;
          if (!exporterReady(x)) b.classList.add('off');
          b.onclick = () => { st.id = x.id; saveExportState(); drawList(); drawPane(); };
          list.appendChild(b);
        });
      });
    };
    const drawPane = () => {
      const x = EXPORTERS.find((e) => e.id === st.id) || EXPORTERS[0];
      const o = exporterOpts(x);
      pane.replaceChildren();
      pane.appendChild(el('h3', 'exp-t', x.title));
      pane.appendChild(el('p', 'note', x.sub()));
      const info = el('p', 'exp-info'); info.setAttribute('aria-live', 'polite');
      const refresh = () => { try { info.textContent = x.info ? x.info(o) : ''; } catch (e) { info.textContent = ''; } };
      const changed = (dl) => { saveExportState(); if (dl === 0) drawPane(); else refresh(); };
      if (x.layers) {
        const s = el('div', 'exp-layers'); s.appendChild(el('span', 'lab', 'Layers to include'));
        LAYER_IDS.forEach(([id, label]) => {
          const n = makeControl(o, T('layer_' + id, label, { idp: 'ex-' }), () => { o.layersTouched = true; changed(); });
          if (n) s.appendChild(n);
        });
        pane.appendChild(s);
      }
      (x.opts || []).forEach((c) => { const n = makeControl(o, Object.assign({}, c, { idp: 'ex-' + x.id + '-', rebuild: () => drawPane() }), changed); if (n) pane.appendChild(n); });
      pane.appendChild(info); refresh();
      const ready = exporterReady(x);
      if (!ready) pane.appendChild(el('p', 'note', doc.text.applied ? 'This format needs a different style.' : 'Apply text art first to use this format.'));
      const row = el('div', 'row2 exp-go');
      const go = optBtn('Export', () => { closeDialog(); runExporter(x, o); }, true, !ready); go.id = 'expGo';
      row.append(optBtn('Cancel', closeDialog), go);
      pane.appendChild(row);
    };
    drawList(); drawPane();
    setTimeout(() => { const b = list.querySelector('[aria-selected="true"]'); if (b) { b.scrollIntoView({ block: 'nearest' }); b.focus(); } }, 0);
  }, true);
}
