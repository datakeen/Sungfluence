// Word cloud at every size: the words are packed on a grid that is the same at every artboard width, so the
// Fast preview, the Full preview and the exports at 1600 and 3671 px show the same words in the same shape.
// Older projects keep their grid in pixels. Also the finish of the signature look: no stray island of words
// at the edge, one Warm black swatch, a hairline around dark paper in the dark theme, recipe pictures that
// match the art, and a fallback note that stays readable on a narrow window and is not replaced by the welcome hint.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path'), fs = require('fs');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 120000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } await p.waitForTimeout(150); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
const url = require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href;

// the text items of an output: how many, the largest relative to the width, and where they sit on a coarse grid
const SUM = `(o) => { const t = o.layers[0].items.filter((q) => q.t === 'text'); const g = new Uint8Array(20 * 20);
  t.forEach((q) => { g[Math.min(19, (q.y / o.H * 20) | 0) * 20 + Math.min(19, (q.x / o.W * 20) | 0)] = 1; });
  return { W: o.W, n: t.length, big: Math.max(...t.map((q) => q.size)) / o.W, g: Array.from(g).join(''),
    corner: t.filter((q) => q.x / o.W < 0.3 && q.y / o.H < 0.12).length }; }`;
const overlap = (a, b) => { let s = 0, n = 0; for (let i = 0; i < a.length; i++) { if (a[i] === '1' || b[i] === '1') n++; if (a[i] === '1' && b[i] === '1') s++; } return n ? s / n : 1; };

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(2000); await wait(p);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; window.__sungfluence.prefs.welcomed = true; });
  // the export: the full-size render of the current layers, through the same job the export uses
  const exportSum = () => A((SUM) => { const S = window.__sungfluence, f = eval(SUM); return new Promise((res) => S.runJob('t-export', S.fullGen(), (r) => res(f(r.out)))); }, SUM);
  const previewSum = () => A((SUM) => eval(SUM)(window.__sungfluence.out), SUM);

  // ---- the same words at every size ----
  for (const k of ['coffee', 'face']) {
    await A((k) => window.__sungfluence.useSample(k), k); await wait(p);
    const R = {};
    for (const w of [1600, 3671]) {
      await A((w) => { const S = window.__sungfluence; S.setQuality('fast'); S.doc.text.applied = false; S.doc.out.width = w; S.applyTextArt(); }, w); await wait(p);
      R['fast' + w] = await previewSum();
      R['export' + w] = await exportSum();
    }
    await A(() => window.__sungfluence.setQuality('full')); await wait(p);
    R.full3671 = await previewSum();
    await A(() => window.__sungfluence.setQuality('fast')); await wait(p);
    const f = R.fast1600, e1 = R.export1600, e3 = R.export3671, fu = R.full3671;
    check(f.W === 900 && e3.W === 3671 && fu.W === 3671, k + ': the preview is the 900 px copy, the export and the Full preview are full size', [f.W, e1.W, e3.W, fu.W].join(', '));
    check(e1.n === e3.n && Math.abs(e1.big - e3.big) < 0.002, k + ': the exports at 1600 and 3671 px hold the same words', e1.n + ' and ' + e3.n + ' words');
    check(Math.abs(e3.n - f.n) / f.n < 0.1 && Math.abs(fu.n - f.n) / f.n < 0.1, k + ': the export and the Full preview have about as many words as the Fast preview', [f.n, e3.n, fu.n].join(', '));
    check(Math.abs(e3.big - f.big) < 0.002 && Math.abs(fu.big - f.big) < 0.002, k + ': the largest word is the same share of the width', [f.big, e3.big, fu.big].map((v) => (v * 100).toFixed(2) + '%').join(', '));
    check(overlap(f.g, e3.g) > 0.8, k + ': the words fill the same shape in the preview and the export', overlap(f.g, e3.g).toFixed(2));
    if (k === 'coffee') check(f.corner === 0 && e3.corner === 0, 'coffee: no island of words from the window at the top left', f.corner + ', ' + e3.corner);
  }

  // ---- an older Word cloud keeps its grid in pixels, so it exports as it did ----
  {
    await A(() => { const S = window.__sungfluence; S.doc.out.width = 3671; S.doc.text.layers[0].cloudGrid = 0; S.scheduleText(0); }); await wait(p);
    const f = await previewSum(), e = await exportSum();
    check(e.n > f.n * 1.3, 'a Word cloud without the fixed grid (an older project) still packs more, smaller words at full size', f.n + ' in the preview, ' + e.n + ' in the export');
    await A(() => { const S = window.__sungfluence; S.doc.text.layers[0].cloudGrid = 300; S.doc.out.width = 1600; S.scheduleText(0); }); await wait(p);
  }

  // ---- the recipe picture of the signature look is a small copy of the art ----
  {
    await A(() => { const S = window.__sungfluence; S.doc.text.applied = false; S.applyTextArt(); S.ui.lookTab = 'recipes'; S.buildPanel(); }); await wait(p);
    let drawn = false;
    for (let i = 0; i < 60 && !drawn; i++) { await p.waitForTimeout(500); drawn = await A(() => { const c = document.getElementById('rt-0'); return !!(c && c.dataset.drawn); }); }
    // a panel rebuild can swap in a fresh card that is not drawn yet, so read until the card has its picture
    const read = () => A(() => {
      const S = window.__sungfluence, rt = document.getElementById('rt-0'), side = rt.height;
      const a = document.createElement('canvas'); a.width = a.height = side; const ax = a.getContext('2d'); ax.imageSmoothingQuality = 'high'; ax.drawImage(S.canvas, 0, 0, side, side);
      const lum = (c, x0) => { const d = c.getContext('2d').getImageData(x0, 0, side, side).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 765; };
      return { thumb: lum(rt, (rt.width - side) / 2), art: lum(a, 0) };
    });
    let cmp = await read();
    for (let i = 0; i < 40 && cmp.thumb < 0.01; i++) { await p.waitForTimeout(500); cmp = await read(); }
    check(drawn && Math.abs(cmp.thumb - cmp.art) < 0.05, 'face: the Word cloud recipe picture is as light as the art itself, not a dark blob', JSON.stringify(cmp));
    await A(() => { const S = window.__sungfluence; S.ui.lookTab = 'styles'; S.buildPanel(); });
  }

  // ---- one dark swatch, Warm black, named under Printed on ----
  {
    const sw = await A(() => { const S = window.__sungfluence; S.ui.tab = 'output'; S.buildPanel(); const b = [...document.querySelectorAll('#sec-paper .swatches .sw[aria-label$=" paper"]')].map((q) => q.getAttribute('aria-label')); return { b, note: document.getElementById('printedOnNote').textContent, paper: S.doc.out.paper }; });
    check(sw.b.includes('Warm black paper') && !sw.b.includes('Black paper'), 'the dark swatch is Warm black, not a second black that looks the same', sw.b.join(', '));
    check(sw.paper === '#15120f' && sw.note.includes('(Warm black)'), 'the Printed on note names the swatch', sw.note);
  }
  check(!errs.length, 'no page errors', errs.join(' | '));
  await ctx.close();

  // ---- dark theme: the warm black artboard keeps its edge ----
  {
    const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const q = await c2.newPage();
    await q.goto(url); await q.waitForTimeout(2000); await wait(q);
    const sh = await q.evaluate(() => getComputedStyle(document.getElementById('art')).boxShadow);
    check(/rgba\(255, 255, 255, 0\.1\d*\) 0px 0px 0px 1px/.test(sh), 'in the dark theme a hairline goes around the artboard', sh.slice(0, 60));
    await c2.close();
  }

  // ---- the fallback note on a fresh start and on a narrow window ----
  {
    const c3 = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const q = await c3.newPage();
    await q.goto(url); await q.waitForTimeout(2000); await wait(q);
    await q.evaluate(() => window.__sungfluence.useSample('camera')); await wait(q);
    await q.click('#cta button');
    const seen = [];
    for (let i = 0; i < 12; i++) { await q.waitForTimeout(1000); seen.push(await q.evaluate(() => { const t = document.getElementById('toast'); return t.hidden ? '' : /^No clear shape/.test(t.textContent) ? 'note' : /^New to/.test(t.textContent) ? 'welcome' : 'other'; })); }
    const lastNote = seen.lastIndexOf('note'), firstWelcome = seen.indexOf('welcome');
    check(lastNote >= 5 && (firstWelcome < 0 || firstWelcome > lastNote), 'a fresh start keeps the fallback note on screen; the welcome hint waits for it', seen.join(' '));
    await c3.close();
    const c4 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const m = await c4.newPage();
    await m.goto(url); await m.waitForTimeout(2000); await wait(m);
    await m.evaluate(() => { const S = window.__sungfluence; S.prefs.welcomed = true; S.prefs.reveal = 'none'; return S.useSample('camera'); }); await wait(m);
    await m.evaluate(() => window.__sungfluence.applyTextArt()); await wait(m); await m.waitForTimeout(400);
    const box = await m.evaluate(() => { const t = document.getElementById('toast'), bt = t.querySelector('button'), z = document.getElementById('zoomBar') || document.querySelector('.zoombar, .statusbar, .bottombar'); return { t: t.getBoundingClientRect().toJSON(), bh: bt ? bt.getBoundingClientRect().height : 0, sw: document.documentElement.scrollWidth, z: z ? z.getBoundingClientRect().top : null }; });
    await m.screenshot({ path: __dirname + '/out/cloudgrid-390-note.png' });
    check(box.t.width >= 300 && box.t.left >= 15 && box.t.right <= 375, 'on a 390 px window the note is nearly as wide as the window', Math.round(box.t.width) + ' px');
    check(box.bh > 0 && box.bh < 24 && box.t.height < 80, 'its Word cloud button stays on one line and the note is short', Math.round(box.bh) + ' px button, ' + Math.round(box.t.height) + ' px note');
    check(box.t.bottom < 844 - 90, 'the note sits above the zoom bar and the paper chip', Math.round(box.t.bottom));
    check(box.sw <= 390, 'no sideways scroll', box.sw);
    await c4.close();
  }
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all cloud grid checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
