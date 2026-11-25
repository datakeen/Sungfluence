// Flagship: Word cloud is the signature style of SungFluence. Apply text art starts from a Word cloud that
// takes its shape from the photo, in the photo's own colors, on warm black paper, at the usual text size.
// A photo with no clear shape for it starts in the style picked for that picture, and a note says so, with
// the Word cloud one click away. Word cloud comes first in the tiles, the wall, the recipes, the menus and
// the help. Older projects open as they were saved. Checked on every sample and both test images.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path'), fs = require('fs');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } await p.waitForTimeout(150); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
const url = require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href;
const PAPER = '#15120f';
// which pictures start as the flagship Word cloud, and which fall back to their own style, and why
const WANT = {
  coffee: 'cloud', face: 'cloud', portrait: 'cloud',
  // a dark subject full of detail: a Word cloud on dark paper would keep only its outline
  cat: ['halftone', 'lost'], rocket: ['halftone', 'lost'],
  camera: ['halftone', 'ground'], lines: ['rows', 'lines'], animals: ['rows', 'several'], swirl: ['halftone', 'lines'], drawing: ['rows', 'lines']
};
const NAMES = { halftone: 'Halftone', rows: 'Text portrait' };

async function loadPic(p, k) {
  if (k === 'portrait' || k === 'drawing') {
    const f = path.join(__dirname, 'images', k === 'portrait' ? 'portrait.jpg' : 'drawing.png');
    const u = 'data:image/' + (k === 'portrait' ? 'jpeg' : 'png') + ';base64,' + fs.readFileSync(f).toString('base64');
    await p.evaluate(async ([u, n]) => { const S = window.__sungfluence; await S.loadImageURL(u, n); S.freshImage(); }, [u, path.basename(f)]);
  } else await p.evaluate((k) => window.__sungfluence.useSample(k), k);
  await wait(p);
}
// the words drawn: how many, how far they reach into the light, how colorful, and whether the shape fell back
const words = () => {
  const S = window.__sungfluence, o = S.out.layers[0], t = o.items.filter((q) => q.t === 'text');
  const lum = (h) => { const m = /^#([0-9a-f]{6})/i.exec(h || ''); if (m) { const n = parseInt(m[1], 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; } const r = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(h || ''); return r ? [r[1] / 255, r[2] / 255, r[3] / 255] : null; };
  let L = 0, C = 0, n = 0;
  for (const q of t) { const c = lum(q.fill); if (!c) continue; L += 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; C += Math.max(...c) - Math.min(...c); n++; }
  const big = t.reduce((a, q) => Math.max(a, q.size || 0), 0);
  return { n: t.length, lum: n ? L / n : 0, chroma: n ? C / n : 0, fellBack: !!(o.stats && o.stats.fellBack), big: big / S.out.W };
};

(async () => {
  const b = await launch();
  // ---- the first start: the coffee sample, the card, Apply text art ----
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(2500); await wait(p);
    const card = await p.evaluate(() => ({ file: window.__sungfluence.doc.fileName, text: document.getElementById('cta').textContent }));
    check(card.file === 'coffee.jpg' && card.text.includes('Suggested: Word cloud.'), 'the first start opens on the coffee sample and offers a Word cloud', card.text.slice(0, 120));
    await p.click('#cta button'); await wait(p); await p.waitForTimeout(1500); await wait(p);
    const first = await p.evaluate(() => { const S = window.__sungfluence, L = S.curLayer(); return { mode: L.mode, paper: S.doc.out.paper, color: L.color, textScale: L.textScale, words: L.words, maskSource: L.maskSource, view: S.ui.view }; });
    check(first.mode === 'cloud' && first.paper === PAPER && first.color === 'image' && first.maskSource === 'image' && first.view === 'text', 'Apply text art makes a Word cloud shaped by the photo, in its colors, on warm black paper', JSON.stringify(first));
    check(first.textScale === 1 && /^family\nlove\nhome/.test(first.words || ''), 'at the usual text size, with the family words', first.textScale + ', ' + String(first.words).slice(0, 30).replace(/\n/g, ' '));
    const w = await p.evaluate(words);
    check(w.n > 250 && !w.fellBack && w.lum > 0.35 && w.chroma > 0.08, 'the coffee cloud: many words in the shape of the cup, light enough and warm enough to read on the dark paper', JSON.stringify(w));
    await p.screenshot({ path: __dirname + '/out/flagship-start.png' });
    // the first tile is Word cloud, marked as the flagship, and pressed now
    const tile = await p.evaluate(() => { const t = document.querySelector('.tile'); return { name: t.querySelector('.l').textContent, flag: t.classList.contains('flag'), pressed: t.getAttribute('aria-pressed'), star: getComputedStyle(t, '::before').content }; });
    check(tile.name === 'Word cloud' && tile.flag && tile.pressed === 'true' && /★/.test(tile.star), 'the first style tile is Word cloud, with a small star', JSON.stringify(tile));
    check(!errs.length, 'no page errors at the first start', errs.join(' | '));
    await ctx.close();
  }

  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(2000); await wait(p);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; });

  // ---- the order of the styles ----
  const order = await A(() => {
    const S = window.__sungfluence;
    return { modes: Object.keys(S.MODES)[0], recipe: S.RECIPES[0].name, flag: !!S.RECIPES[0].flagship, outlined: S.RECIPES.some((r) => r.name === 'Outlined cloud'), paper: S.FLAGSHIP_PAPER, sizes: [S.MODES.cloud.defaults.maxSize, S.MODES.cloud.defaults.minSize], scale: S.newLayer('cloud', {}).textScale };
  });
  check(order.modes === 'cloud', 'Word cloud is the first style', order.modes);
  check(order.recipe === 'Word cloud' && order.flag && order.outlined, 'the first recipe is the flagship Word cloud, and the former one is Outlined cloud', JSON.stringify(order));
  check(order.paper === PAPER && order.sizes[0] === 110 && order.sizes[1] === 10 && order.scale === 1, 'the size defaults of Word cloud are as they were', JSON.stringify(order));
  const doc = fs.readFileSync(path.join(__dirname, '../docs/help/styles.md'), 'utf8');
  check((doc.match(/^## (.+)$/m) || [])[1] === 'Word cloud', 'the help lists Word cloud first');
  check(/signature style/i.test(fs.readFileSync(path.join(__dirname, '../docs/help/text-art.md'), 'utf8')) && /signature style/i.test(fs.readFileSync(path.join(__dirname, '../docs/help/getting-started.md'), 'utf8')), 'the help pages present Word cloud as the signature style');

  // ---- every sample and both test images ----
  const got = {};
  for (const k of Object.keys(WANT)) {
    await loadPic(p, k);
    const card = await A(() => document.getElementById('cta').textContent);
    const long = await A(() => {
      const S = window.__sungfluence, L = [];
      S.doc.text.applied = false; S.doc.out.width = 1600;
      const ob = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration))));
      ob.observe({ entryTypes: ['longtask'] });
      S.applyTextArt();
      return new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); ob.disconnect(); res(L.sort((a, b) => b - a)[0] || 0); } }, 100); });
    });
    await wait(p);
    const r = await A(() => { const S = window.__sungfluence, sg = S.ui.suggestion, t = document.getElementById('toast'); return { mode: S.curLayer().mode, paper: S.doc.out.paper, why: sg.why, off: sg.flagshipOff || '', note: sg.note, toast: t.hidden ? '' : t.textContent }; });
    Object.assign(r, await A(words));
    r.long = long; got[k] = r.mode;
    await p.locator('#art').screenshot({ path: __dirname + '/out/flagship-' + k + '.png' });
    const want = WANT[k];
    if (want === 'cloud') {
      check(r.mode === 'cloud' && r.why === 'flagship' && r.paper === PAPER, k + ': starts as the flagship Word cloud on warm black paper', JSON.stringify([r.mode, r.why, r.paper]));
      check(card.includes('Suggested: Word cloud. ' + r.note), k + ': the card offers the Word cloud', card.slice(0, 120));
      check(r.n > 200 && !r.fellBack, k + ': the words fill the shape of the photo, not an oval', r.n + ' words, fell back: ' + r.fellBack);
      check(r.lum > 0.3, k + ': the words read on the dark paper', 'mean lightness ' + r.lum.toFixed(2));
      // the photo's own colors: a colored photo keeps its hue
      if (['coffee', 'face'].includes(k)) check(r.chroma > 0.08, k + ': the words keep the colors of the photo', 'chroma ' + r.chroma.toFixed(2));
      check(r.big > 0.02 && r.big < 0.06, k + ': the biggest words are the size of the examples', (r.big * 100).toFixed(1) + '% of the width');
      check(!r.toast.includes('no clear shape'), k + ': no fallback note');
      // filling a shape may take 260 ms (see DEVELOPMENT.md)
      check(r.long < 260, k + ': the window stays alive while it renders', r.long + ' ms');
    } else {
      const [mode, why] = want, lost = why === 'lost';
      const note = (lost ? 'A Word cloud would keep only the outline of this photo' : 'This photo has no clear shape for a Word cloud') + ', so it starts as ' + NAMES[mode] + '. Word cloud is one click away.';
      const short = (lost ? 'A Word cloud would keep only the outline here' : 'No clear shape for a Word cloud here') + ', so this is a ' + NAMES[mode] + '.';
      check(r.mode === mode && r.off === why && r.paper === '#ffffff', k + ': ' + (lost ? 'its inside would be lost' : 'no clear shape') + ', so it starts as ' + NAMES[mode] + ' on white', JSON.stringify([r.mode, r.off, r.paper]));
      check(r.note === note && card.includes(note) && !card.includes('Suggested:'), k + ': the card says so in one short note', card.slice(0, 140));
      check(r.toast === short + 'Word cloud', k + ': after Apply, a short note says so, with a Word cloud button', r.toast);
    }
  }
  console.log('first looks: ' + Object.entries(got).map(([k, v]) => k + ' ' + v).join(', '));

  // ---- one click away: the button on the note, the tile before Apply, the recipe ----
  await loadPic(p, 'camera');
  await A(() => { const S = window.__sungfluence; S.doc.text.applied = false; S.applyTextArt(); }); await wait(p);
  await p.locator('#toast button').click(); await wait(p);
  let r = await A(() => { const S = window.__sungfluence; return { mode: S.curLayer().mode, paper: S.doc.out.paper, color: S.curLayer().color }; });
  check(r.mode === 'cloud' && r.paper === PAPER && r.color === 'image', 'camera: the Word cloud button on the note gives the flagship look', JSON.stringify(r));
  await A(() => { const S = window.__sungfluence; S.doc.text.applied = false; S.applyTextArt('cloud'); }); await wait(p);
  r = await A(() => { const S = window.__sungfluence, L = S.curLayer(); return { mode: L.mode, paper: S.doc.out.paper, color: L.color, fit: L.colorFit }; });
  check(r.mode === 'cloud' && r.paper === PAPER && r.color === 'image' && r.fit === 'strong', 'camera: the Word cloud tile before Apply gives the flagship look too', JSON.stringify(r));
  await A(() => { const S = window.__sungfluence; S.doc.text.applied = false; S.applyTextArt('halftone'); }); await wait(p);
  r = await A(() => { const S = window.__sungfluence; return { mode: S.curLayer().mode, paper: S.doc.out.paper }; });
  check(r.mode === 'halftone' && r.paper === '#ffffff', 'another tile before Apply gives that style, on white', JSON.stringify(r));
  await loadPic(p, 'face');
  await A(() => { const S = window.__sungfluence; S.doc.text.applied = false; S.applyTextArt('rows'); }); await wait(p);
  r = await A(() => { const S = window.__sungfluence, L = S.curLayer(); return { mode: L.mode, paper: S.doc.out.paper, fit: L.colorFit }; });
  check(r.mode === 'rows' && r.paper === '#ffffff' && r.fit === 'gentle', 'face: the Text portrait tile before Apply gives a Text portrait on white, its colors fitted as usual', JSON.stringify(r));
  await A(() => { const S = window.__sungfluence; S.applyRecipe(S.RECIPES[0]); }); await wait(p);
  r = await A(() => { const S = window.__sungfluence, L = S.curLayer(); return { mode: L.mode, paper: S.doc.out.paper, flagship: 'flagship' in L, src: L.maskSource }; });
  check(r.mode === 'cloud' && r.paper === PAPER && !r.flagship && r.src === 'image', 'face: the Word cloud recipe gives the same flagship look', JSON.stringify(r));

  // ---- the style wall and the menu list Word cloud first ----
  await A(() => window.__sungfluence.openWall()); await p.waitForTimeout(800);
  const wall = await A(() => { const t = document.querySelector('.wall .wall-t'); return t ? t.textContent.trim() : ''; });
  check(/^Word cloud/.test(wall), 'the Every style wall starts with Word cloud', wall.slice(0, 40));
  await p.keyboard.press('Escape'); await wait(p);
  const menu = await A(() => { const S = window.__sungfluence; return [...S.COMMANDS.keys()].filter((k) => k.startsWith('style.'))[0]; });
  check(menu === 'style.cloud', 'the style commands list Word cloud first', menu);

  // ---- older projects open as they were saved ----
  const proj = await A(() => {
    const S = window.__sungfluence;
    S.doc.text.layers = [S.newLayer('halftone', { cols: 110 })]; S.doc.text.sel = 0; S.doc.out.paper = '#ffffff';
    const half = JSON.parse(JSON.stringify(S.projectData()));
    S.doc.text.layers = [S.newLayer('cloud', { color: 'ink', inkColor: '#14213d' })]; S.doc.out.paper = '#f3efe6';
    const cloud = JSON.parse(JSON.stringify(S.projectData()));
    // a Word cloud from before Tidy the shape and colors that fit the paper
    cloud.text.layers.forEach((L) => { delete L.shapeTidy; delete L.colorFit; delete L.cloudGrid; delete L.edgePiece; });
    return { half, cloud };
  });
  await A((d) => window.__sungfluence.openProject(d), proj.half); await wait(p);
  r = await A(() => { const S = window.__sungfluence; return { mode: S.curLayer().mode, cols: S.curLayer().cols, paper: S.doc.out.paper, applied: S.doc.text.applied }; });
  check(r.mode === 'halftone' && r.cols === 110 && r.paper === '#ffffff' && r.applied, 'an older Halftone project opens as a Halftone on white, not as the flagship', JSON.stringify(r));
  await A((d) => window.__sungfluence.openProject(d), proj.cloud); await wait(p);
  r = await A(() => { const S = window.__sungfluence, L = S.curLayer(); return { mode: L.mode, tidy: L.shapeTidy, fit: L.colorFit, paper: S.doc.out.paper, max: L.maxSize, gradient: L.gradient, grid: L.cloudGrid, edge: L.edgePiece }; });
  check(r.mode === 'cloud' && r.tidy === false && r.fit === 'off' && r.paper === '#f3efe6' && r.max === 110 && r.gradient === 'center' && r.grid === 0 && !r.edge, 'an older Word cloud project keeps its shape, colors, paper, sizes and its grid in pixels', JSON.stringify(r));

  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all flagship checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
