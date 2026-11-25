// First look: letter sizes that follow the artboard width, so a new layer looks the same on a 1600 px and
// a 3671 px artboard; sizes set by hand and older projects that stay in pixels; and the Transparent swatch
// in the Background row.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } await p.waitForTimeout(150); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
const STYLES = ['rows', 'flow', 'mosaic', 'cloud', 'grid', 'unicode', 'halftone', 'calligram', 'spiral', 'relief', 'typewriter'];
const BIG = 3671;

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; });
  await A(() => window.__sungfluence.useSample('cat')); await wait(p);
  await A(() => window.__sungfluence.applyTextArt()); await wait(p);

  // one new layer of a style on an artboard of a given width: how many letters, and their middle size
  const layerAt = async (mode, width, over) => {
    await A(({ mode, width, over }) => {
      const S = window.__sungfluence;
      S.doc.out.width = width;
      S.doc.text.layers = [S.newLayer(mode, over || {})]; S.doc.text.sel = 0; S.doc.text.applied = true; S.doc.text.source = 'photo';
      S.buildPanel(); S.setView('text'); S.scheduleText(0);
    }, { mode, width, over });
    await wait(p);
    return A(() => {
      const S = window.__sungfluence, k = S.previewScale();
      const sz = S.out.layers[0].items.filter((q) => q.t === 'text').map((q) => q.size / k).sort((a, b) => a - b);
      return { n: sz.length, med: sz.length ? sz[sz.length >> 1] : 0 };
    });
  };

  // ---- a new layer of every style looks the same at any artboard width ----
  for (const m of STYLES) {
    const a = await layerAt(m, 1600), z = await layerAt(m, BIG);
    const ratio = z.med / a.med, want = BIG / 1600;
    check(a.n > 0 && Math.abs(z.n - a.n) <= a.n * 0.1, m + ': the same number of letters on a 1600 and a ' + BIG + ' px artboard', a.n + ' and ' + z.n);
    check(Math.abs(ratio / want - 1) < 0.1, m + ': the letters grow with the artboard', 'middle size ' + a.med.toFixed(1) + ' to ' + z.med.toFixed(1) + ' px, ' + ratio.toFixed(2) + ' times, want ' + want.toFixed(2));
    if (m === 'rows') await p.screenshot({ path: __dirname + '/out/firstlook-rows-' + BIG + '.png' });
  }

  // ---- first-look sizes: at Fit the Text portrait letters are big enough to read ----
  await layerAt('rows', BIG);
  const look = await A(() => {
    const S = window.__sungfluence, a = document.getElementById('art'), css = a.getBoundingClientRect().width / S.out.W;
    const k = S.previewScale(), L = S.out.layers[0].items.filter((q) => q.t === 'text');
    return { css: L[L.length >> 1].size * css, n: L.length, ui: S.curLayer().size, pxW: S.curLayer().pxW };
  });
  check(look.css >= 8, 'Text portrait at Fit: letters about ' + look.css.toFixed(1) + ' screen px, big enough to read', look.n + ' letters');
  check(look.pxW === BIG && Math.abs(look.ui - 24 * BIG / 1600) < 0.1, 'the panel shows the size in pixels of this artboard', look.ui + ' px');
  const range = await A(() => { const r = document.getElementById('c-size'), n = document.getElementById('c-size-n'); return { max: +r.max, val: +r.value, box: +n.max }; });
  check(range.max >= look.ui && Math.abs(range.val - look.ui) <= 0.5, 'the slider spans the new size on a large artboard', 'slider top ' + range.max + ', at ' + range.val);
  check(range.box >= range.max * 4, 'the box still goes well past the slider', range.box);

  // ---- a size typed by hand stays in pixels ----
  await p.fill('#c-size-n', '40'); await p.waitForTimeout(400); await wait(p);
  const typed = await A(() => {
    const S = window.__sungfluence, k = S.previewScale(), L = S.curLayer();
    const sz = S.out.layers[0].items.filter((q) => q.t === 'text').map((q) => q.size / k).sort((a, b) => a - b);
    return { size: L.size, pxW: L.pxW, med: sz[sz.length >> 1] };
  });
  check(typed.size === 40 && typed.pxW === null && Math.abs(typed.med - 40) < 0.5, 'a typed size is used as typed and stays the user\'s', typed.size + ' px, drawn at ' + typed.med.toFixed(1));
  // change the width on the Output tab: the typed size stays, and a note offers to scale it
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'output'; S.buildPanel(); });
  await p.click('#panel button:text-is("1600 px")');
  await wait(p);
  const after = await A(() => ({ w: window.__sungfluence.doc.out.width, size: window.__sungfluence.curLayer().size, toast: document.getElementById('toast').textContent, shown: !document.getElementById('toast').hidden }));
  check(after.w === 1600 && after.size === 40, 'after a change of width the typed size is still 40 px', after.w + ' px wide');
  check(after.shown && /stay in pixels/.test(after.toast) && /Scale them too/.test(after.toast), 'a note says so and offers to scale it', after.toast);
  await p.click('#toast button'); await wait(p);
  check(Math.abs(await A(() => window.__sungfluence.curLayer().size) - 40 * 1600 / BIG) < 0.05, 'Scale them too scales it with the artboard', await A(() => window.__sungfluence.curLayer().size));

  // ---- projects ----
  const proj = await A((BIG) => {
    const S = window.__sungfluence;
    S.doc.out.width = BIG; S.doc.text.layers = [S.newLayer('rows')]; S.doc.text.sel = 0;
    const now = JSON.parse(JSON.stringify(S.projectData()));
    const old = JSON.parse(JSON.stringify(now)); old.text.layers.forEach((L) => { delete L.pxW; L.size = 12; });
    return { now, old };
  }, BIG);
  await A((d) => window.__sungfluence.openProject(d), proj.old); await wait(p);
  const oldL = await A(() => { const S = window.__sungfluence, k = S.previewScale(), it = S.out.layers[0].items.map((q) => q.size / k).sort((a, b) => a - b); return { pxW: S.curLayer().pxW, size: S.curLayer().size, med: it[it.length >> 1], w: S.doc.out.width }; });
  check(oldL.pxW === null && oldL.size === 12 && Math.abs(oldL.med - 12) < 0.5 && oldL.w === BIG, 'a project from before keeps its letter sizes in pixels', oldL.size + ' px on ' + oldL.w + ' px, drawn at ' + oldL.med.toFixed(1));
  await A((d) => window.__sungfluence.openProject(d), proj.now); await wait(p);
  const newL = await A(() => ({ pxW: window.__sungfluence.curLayer().pxW, size: window.__sungfluence.curLayer().size }));
  check(newL.pxW > 0 && Math.abs(newL.size * 1600 / newL.pxW - 24) < 0.1, 'a project saved now keeps following the artboard', JSON.stringify(newL));

  // ---- the Transparent swatch, next to the paper colors ----
  await A(() => { const S = window.__sungfluence; S.doc.out.width = 1600; S.doc.out.transparent = false; S.ui.tab = 'text'; S.buildPanel(); S.scheduleText(0); }); await wait(p);
  const row = await A(() => {
    const s = document.getElementById('sec-paper'), t = document.getElementById('sw-clear');
    return { inRow: !!t && t.parentNode.classList.contains('swatches') && s.contains(t), label: t && t.getAttribute('aria-label'), pressed: t && t.getAttribute('aria-pressed'), bg: t && getComputedStyle(t).backgroundImage };
  });
  check(row.inRow && row.label === 'Transparent background' && row.pressed === 'false', 'the Background row in the Text art panel has a Transparent swatch', row.label);
  check(/conic-gradient/.test(row.bg), 'the swatch is drawn as a small checkerboard');
  // tones in an empty corner of the artboard, with the text art hidden
  const corner = () => A(() => {
    const S = window.__sungfluence; S.doc.text.visible = false; S.compose();
    const c = document.getElementById('art'), d = c.getContext('2d').getImageData(0, 0, 60, 60).data, tones = new Set();
    for (let i = 0; i < d.length; i += 4) tones.add(d[i] >> 3);
    S.doc.text.visible = true; S.compose();
    return [...tones].sort((a, b) => a - b);
  });
  const before = await corner();
  await p.click('#sw-clear'); await wait(p);
  const on = await A(() => ({ t: window.__sungfluence.doc.out.transparent, pressed: document.getElementById('sw-clear').getAttribute('aria-pressed'), note: [...document.querySelectorAll('#sec-paper .note')].map((n) => n.textContent).join(' '), chip: document.getElementById('paperChip').textContent }));
  const checker = await corner();
  check(on.t && on.pressed === 'true', 'clicking it turns on the transparent background');
  check(/Clear in PNG, SVG and PDF\./.test(on.note) && /JPG gets the paper color/.test(on.note), 'the note under the row says what stays clear', on.note);
  check(before.length === 1 && checker.length >= 2 && checker[checker.length - 1] - checker[0] >= 3, 'the artboard shows a checkerboard', 'tones ' + before.join(',') + ' then ' + checker.join(','));
  check(on.chip === 'Transparent background', 'the note under the picture says so', on.chip);
  await p.locator('#art').screenshot({ path: __dirname + '/out/firstlook-transparent.png' });
  // the Output tab has the same row and no second switch
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'output'; S.buildPanel(); });
  const out = await A(() => ({ sw: !!document.querySelector('#sec-paper #sw-clear[aria-pressed="true"]'), toggle: !!document.getElementById('c-o-transparent') }));
  check(out.sw && !out.toggle, 'the Output tab shows the same swatch, and the separate switch is gone', JSON.stringify(out));
  // the note under the picture lands on the swatch
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'photo'; S.buildPanel(); });
  await p.click('#paperChip'); await p.waitForTimeout(300);
  const land = await A(() => ({ tab: window.__sungfluence.ui.tab, focus: document.activeElement && document.activeElement.id }));
  check(land.tab === 'text' && land.focus === 'sw-clear', 'clicking the note under the picture lands on the Transparent swatch', JSON.stringify(land));
  await p.click('#sw-clear'); await wait(p);
  check(await A(() => window.__sungfluence.doc.out.transparent) === false, 'a second click brings the paper back');
  const cmd = await A(() => { const S = window.__sungfluence; S.runCommand('paper.transparent'); const a = S.doc.out.transparent; S.runCommand('paper.transparent'); return [a, S.doc.out.transparent]; });
  check(cmd[0] === true && cmd[1] === false, 'Transparent background is a command too, for the menu and the palette');

  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all first look checks passed');
  process.exit(fails ? 1 : 0);
})();
