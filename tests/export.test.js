// Export window, text twins, code outputs, project files (.sungfluence) and the recipe saved inside PNG and SVG files.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const fs = require('fs'), path = require('path');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(300); };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  await p.setInputFiles('#fileInput', __dirname + '/images/portrait.jpg'); await p.waitForTimeout(1200);
  await p.evaluate(() => window.__sungfluence.applyTextArt()); await wait(p);

  // one export: runs it and returns the saved file
  const grab = async (id, opts) => {
    const dl = p.waitForEvent('download', { timeout: 60000 });
    await p.evaluate(([id, opts]) => { const S = window.__sungfluence, x = S.EXPORTERS.find((e) => e.id === id); S.runExporter(x, Object.assign(S.exporterOpts(x), opts || {})); }, [id, opts]);
    const d = await dl; const f = path.join(__dirname, 'out', 'exp-' + d.suggestedFilename()); await d.saveAs(f); return f;
  };

  // the window
  await p.evaluate(() => window.__sungfluence.runCommand('file.export')); await p.waitForTimeout(300);
  const win = await p.evaluate(() => ({ open: !document.getElementById('dlgScrim').hidden, items: document.querySelectorAll('.exp-item').length, groups: [...document.querySelectorAll('.exp-g')].map((g) => g.textContent).join(',') }));
  check(win.open && win.items >= 18, 'Export window opens with ' + win.items + ' formats in ' + win.groups);
  await p.click('.exp-item[data-id="txt-ansi"]'); await p.waitForTimeout(200);
  check(await p.evaluate(() => /characters/.test(document.querySelector('.exp-info').textContent)), 'size line: ' + await p.evaluate(() => document.querySelector('.exp-info').textContent));
  await p.screenshot({ path: __dirname + '/out/e1-export-window.png' });
  await p.keyboard.press('Escape');

  // text twins
  let f = await grab('txt-plain', { cols: 80, chars: 'ramp' });
  let t = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  check(t.length > 10 && Math.max(...t.map((l) => l.length)) <= 80, 'plain text, 80 wide: ' + t.length + ' lines');
  f = await grab('txt-plain', { cols: 40, chars: 'az', own: '' });
  t = fs.readFileSync(f, 'utf8');
  check(/^[A-Z \n]+$/.test(t) && /ABCD/.test(t.replace(/[\s]/g, '')), 'A to Z in order, 40 wide');
  f = await grab('txt-plain', { cols: 60, chars: 'braille' });
  check(/[\u2800-\u28FF]/.test(fs.readFileSync(f, 'utf8')), 'Braille text');
  f = await grab('txt-plain', { cols: 60, chars: 'own', own: 'xo', blank: false });
  t = fs.readFileSync(f, 'utf8');
  check(/^[xo\n]+$/.test(t), 'your own characters, no spaces');
  f = await grab('txt-md', { cols: 60 });
  check(/^```text\n[\s\S]+\n```\n$/.test(fs.readFileSync(f, 'utf8')), 'Markdown code block');
  f = await grab('txt-html', { cols: 60, color: true });
  t = fs.readFileSync(f, 'utf8');
  check(/^<!doctype html>/.test(t) && /<span style="color:#/.test(t), 'HTML page in color');
  for (const depth of [16, 256, 'full']) {
    f = await grab('txt-ansi', { cols: 60, depth });
    t = fs.readFileSync(f, 'utf8');
    check(depth === 'full' ? /\x1b\[38;2;/.test(t) : depth === 256 ? /\x1b\[38;5;/.test(t) : /\x1b\[(3|9)\dm/.test(t), 'terminal colors, ' + depth);
  }
  f = await grab('txt-svg', { cols: 60, color: false });
  t = fs.readFileSync(f, 'utf8');
  check(/^<svg/.test(t) && /<text /.test(t) && !/<script/.test(t), 'SVG for README files');

  // code
  for (const [lang, re] of [['js', /^const art = \[/], ['py', /^art = "\\n".join/], ['c', /#include <stdio.h>/], ['go', /package main/], ['rs', /fn main/], ['sh', /cat <<'SUNGFLUENCE_ART'/]]) {
    f = await grab('code', { lang, form: 'string', cols: 40 });
    check(re.test(fs.readFileSync(f, 'utf8')), 'code string, ' + lang + ' (' + path.basename(f) + ')');
  }
  f = await grab('code', { lang: 'c', form: 'comment', cols: 40 });
  t = fs.readFileSync(f, 'utf8');
  check(/^\/\*\n/.test(t) && t.trim().endsWith('*/') && t.indexOf('*/') === t.lastIndexOf('*/'), 'comment block closes once');
  check(await p.evaluate(() => window.__sungfluence.codeFor(['a */ b'], 'js', 'comment').split('*/').length === 2), 'comment block: */ inside the art is broken up');
  f = await grab('help-header', { prog: 'river', cols: 40 });
  check(/Usage: river/.test(fs.readFileSync(f, 'utf8')), '--help header');
  f = await grab('motd', { cols: 40, depth: 'none' });
  check(/^exp-motd/.test(path.basename(f)) && !/\x1b/.test(fs.readFileSync(f, 'utf8')), 'login message');

  // the recipe inside a PNG and an SVG
  f = await grab('png-art', { recipe: true });
  const rec = await p.evaluate(async (b64) => { const u = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); return window.__sungfluence.recipeFromPNG(u.buffer); }, fs.readFileSync(f).toString('base64'));
  check(rec && rec.kind === 'recipe' && rec.text.layers.length > 0 && !('image' in rec), 'PNG carries the recipe and no photo');
  const pngRecipe = f.replace(/.png$/, '-recipe.png'); fs.copyFileSync(f, pngRecipe);
  f = await grab('svg-art', { recipe: true });
  check(/<metadata id="sungfluence-recipe">/.test(fs.readFileSync(f, 'utf8')), 'SVG carries the recipe');
  f = await grab('png-art', { recipe: false });
  check(!(await p.evaluate(async (b64) => { const u = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); return window.__sungfluence.recipeFromPNG(u.buffer); }, fs.readFileSync(f).toString('base64'))), 'recipe is opt-in');
  // dropping the PNG back brings the look back onto the open photo
  const modeBefore = rec.text.layers[rec.text.sel || 0].mode;
  await p.evaluate(() => window.__sungfluence.usePluginStyle('grid')); await wait(p);
  await p.setInputFiles('#fileInput', pngRecipe); await wait(p);
  const after = await p.evaluate(() => ({ mode: window.__sungfluence.curLayer().mode, file: window.__sungfluence.doc.fileName, toast: document.getElementById('toast').textContent }));
  check(after.mode === modeBefore && after.file === 'portrait.jpg', 'opening the PNG restored the style (' + after.mode + ') on the same photo: ' + after.toast);

  // project file, version 5
  await p.evaluate(() => { const S = window.__sungfluence; S.addObject({ type: 'rect', layer: 'lines', x: 100, y: 100, w: 200, h: 120 }); });
  f = await grab('project', { layer_photo: true, layer_lines: true, layer_text: true });
  check(/\.sungfluence$/.test(f) && fs.readFileSync(f).slice(0, 2).toString() === 'PK', 'project saved as a zip: ' + path.basename(f));
  const JSZip = require(path.resolve(__dirname, '../src/vendor/jszip.min.js'));
  const z = await JSZip.loadAsync(fs.readFileSync(f));
  const pj = JSON.parse(await z.file('project.json').async('string'));
  check(pj.v === 5 && /^image\./.test(pj.image) && z.file(pj.image) && z.file('preview.png'), 'zip holds project.json (v5), the photo and a preview');
  const before = await p.evaluate(() => ({ n: window.__sungfluence.doc.objects.length, layers: window.__sungfluence.doc.text.layers.length }));
  await p.setInputFiles('#fileInput', __dirname + '/images/drawing.png'); await p.waitForTimeout(1200);
  await p.setInputFiles('#fileInput', f); await wait(p);
  const re = await p.evaluate(() => ({ n: window.__sungfluence.doc.objects.length, layers: window.__sungfluence.doc.text.layers.length, file: window.__sungfluence.doc.fileName, size: window.__sungfluence.imgSize }));
  check(re.file === 'portrait.jpg' && re.n === before.n && re.layers === before.layers, 'project reopened: ' + JSON.stringify(re));
  f = await grab('project', { layer_photo: false, layer_lines: true, layer_text: false, layersTouched: true });
  const z2 = await JSZip.loadAsync(fs.readFileSync(f)); const pj2 = JSON.parse(await z2.file('project.json').async('string'));
  check(pj2.text.applied === false && pj2.layers.photo === false && pj2.objects.length === before.n, 'project with only the vector layer');
  await p.screenshot({ path: __dirname + '/out/e2-after-reopen.png' });

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' export checks failed' : 'all export checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
