// Style quality: Word mosaic keeps its sizes within the size range, Halftone draws no blank dots,
// Text size enlarges every letter evenly, Flow lines never writes upside down, the Text size control
// shows for every style, no style holds the window for more than about 220 ms while it renders, Spiral stays a
// round disc with a calm middle, Typewriter limits its overstrikes, and Calligram fills the subject of the photo
// with whole words.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(200); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; window.__sungfluence.applyTextArt(); }); await wait(p);

  // one layer of a style, drawn; returns its text items with sizes in artboard pixels
  const render = async (mode, over, sample) => {
    if (sample) { await A((k) => window.__sungfluence.useSample(k), sample); await p.waitForTimeout(400); await wait(p); }
    await A(([m, o]) => {
      const S = window.__sungfluence;
      S.doc.out.paper = '#ffffff'; S.doc.text.layers = [S.newLayer(m, o)]; S.doc.text.sel = 0; S.doc.text.applied = true; S.scheduleText(0);
    }, [mode, over || {}]);
    await wait(p);
    return A(() => {
      const S = window.__sungfluence, k = S.previewScale();
      return S.out.layers[0].items.filter((q) => q.t === 'text').map((q) => ({ s: q.s, size: q.size / k, rot: q.rot || 0 }));
    });
  };
  const sizes = (it) => it.map((q) => q.size);
  const lo = (a) => a.reduce((m, v) => Math.min(m, v), Infinity), hi = (a) => a.reduce((m, v) => Math.max(m, v), 0);

  // ---- Word mosaic: no word far bigger than the rest, none below the smallest size ----
  for (const sm of ['coffee', 'face']) {
    const L = await A(() => window.__sungfluence.newLayer('mosaic', {}));
    const it = await render('mosaic', {}, sm);
    const s = sizes(it), min = lo(s), max = hi(s), floor = Math.max(L.minSize, L.maxSize / L.ratio);
    check(it.length > 100, sm + ': the mosaic places plenty of words', it.length);
    check(max / min <= L.ratio * 1.08, sm + ': largest to smallest word stays within the size range', (max / min).toFixed(2) + ' of ' + L.ratio);
    check(min >= floor - 0.6, sm + ': no word is smaller than the smallest size', min.toFixed(1) + ' px, floor ' + floor.toFixed(1));
    check(max <= L.maxSize + 0.6, sm + ': no word is larger than the largest size', max.toFixed(1));
  }

  // ---- Text size: every letter 1.5 times as big ----
  const m1 = sizes(await render('mosaic', {}, 'coffee')), m15 = sizes(await render('mosaic', { textScale: 1.5 }));
  check(Math.abs(hi(m15) / hi(m1) - 1.5) < 0.03, 'Text size 1.5: the largest mosaic word is 1.5 times as big', hi(m1).toFixed(1) + ' to ' + hi(m15).toFixed(1));
  check(Math.abs(lo(m15) / lo(m1) - 1.5) < 0.06, 'Text size 1.5: the smallest mosaic word is 1.5 times as big', lo(m1).toFixed(1) + ' to ' + lo(m15).toFixed(1));
  const r1 = sizes(await render('rows', { sizeMod: false })), r15 = sizes(await render('rows', { sizeMod: false, textScale: 1.5 }));
  check(Math.abs(hi(r15) / hi(r1) - 1.5) < 0.03 && Math.abs(lo(r15) / lo(r1) - 1.5) < 0.03, 'Text size 1.5: Text portrait letters are 1.5 times as big', hi(r1).toFixed(1) + ' to ' + hi(r15).toFixed(1));
  check(r15.length < r1.length * 0.6, 'bigger letters mean fewer of them', r1.length + ' to ' + r15.length);

  // ---- Halftone: no blank dots ----
  const ht = await render('halftone', {});
  check(ht.length > 500, 'halftone draws its dots', ht.length);
  check(!ht.some((q) => !String(q.s).trim()), 'no halftone dot is a blank space', ht.filter((q) => !String(q.s).trim()).length + ' blank');
  const htw = await render('halftone', { text: 'LOVE YOU' });
  check(!htw.some((q) => !String(q.s).trim()), 'a halftone of words draws no blank dots either');

  // ---- Flow lines: no letter upside down ----
  for (const sm of ['face', 'cat']) {
    const fl = await render('flow', {}, sm);
    const deg = fl.map((q) => Math.abs(((q.rot * 180 / Math.PI) + 540) % 360 - 180));
    const over = deg.filter((d) => d > 90.5).length;
    check(fl.length > 1000 && over === 0, sm + ': every Flow lines letter turns less than 90 degrees from upright', fl.length + ' letters, ' + over + ' over, steepest ' + Math.round(hi(deg)) + ' deg');
  }

  // ---- the Text size control is there for every style, and it is kept with the layer ----
  const missing = await A(() => {
    const S = window.__sungfluence, miss = [];
    for (const m of Object.keys(S.MODES)) {
      S.doc.text.layers = [S.newLayer(m, {})]; S.doc.text.sel = 0; S.buildPanel();
      if (!document.getElementById('c-textScale')) miss.push(m);
    }
    return miss;
  });
  check(!missing.length, 'every style shows the Text size control', missing.join(', ') || 'all');
  check(await A(() => window.__sungfluence.newLayer('cloud', {}).textScale) === 1, 'a new layer starts at Text size 100%');

  // ---- no long task while a style renders ----
  await A((k) => window.__sungfluence.useSample(k), 'coffee'); await p.waitForTimeout(400); await wait(p);
  await p.waitForTimeout(800);
  const modes = await A(() => Object.keys(window.__sungfluence.MODES));
  // measured from the start of each render until it is on screen, and a moment after, while the recipe
  // thumbnails redraw in the background
  let worst = 0, worstMode = '';
  for (const m of modes) {
    await A((m) => {
      window.__lt = []; window.__lto = new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration))));
      window.__lto.observe({ entryTypes: ['longtask'] });
      const S = window.__sungfluence; S.doc.text.layers = [S.newLayer(m, {})]; S.doc.text.sel = 0; S.scheduleText(0);
    }, m);
    await wait(p);
    await p.waitForTimeout(400);
    const t = await A(() => { window.__lto.takeRecords().forEach((e) => window.__lt.push(Math.round(e.duration))); window.__lto.disconnect(); return window.__lt.sort((a, b) => b - a)[0] || 0; });
    if (t > worst) { worst = t; worstMode = m; }
  }
  check(worst <= 220, 'no task over 220 ms while any style renders', 'longest ' + worst + ' ms' + (worstMode ? ', ' + worstMode : ''));

  // a recipe saved by an older version has no tone settings: it comes back with the old defaults, like an older project does
  const legacy = await A(() => {
    const S = window.__sungfluence;
    const ok = S.applySavedRecipe({ app: 'sungfluence', kind: 'recipe', v: 1, text: { source: 'photo', sel: 0, layers: [{ mode: 'halftone', text: 'O', cols: 60 }, { mode: 'flow' }] } }, 'old.png');
    const [H, F] = S.doc.text.layers;
    return { ok, h: [H.mode, H.cols, H.localContrast, H.paperKnee, H.toneGamma, H.minDot], f: [F.mode, F.sizeFloor] };
  });
  check(legacy.ok && JSON.stringify(legacy.h) === JSON.stringify(['halftone', 60, 0, 0, 1, 0]) && JSON.stringify(legacy.f) === JSON.stringify(['flow', 0.35]), 'an older recipe keeps the look it was saved with', JSON.stringify(legacy));

  // older spiral, calligram, relief and typewriter layers keep their look
  const legacy2 = await A(() => {
    const S = window.__sungfluence;
    S.applySavedRecipe({ app: 'sungfluence', kind: 'recipe', v: 1, text: { source: 'photo', sel: 0, layers: [{ mode: 'spiral' }, { mode: 'calligram' }, { mode: 'relief' }, { mode: 'typewriter' }] } }, 'old.png');
    const [Sp, Ca, Re, Ty] = S.doc.text.layers;
    return [Sp.disc, Sp.calmCenter, Sp.pop, Sp.shortRuns, Ca.maskSource, Ca.color, Re.pop, Re.amp, Re.toneGamma, Ty.cols, Ty.strikes, Ty.localContrast, Ty.dither];
  });
  check(JSON.stringify(legacy2) === JSON.stringify([false, 0, 0, 0, 'heart', 'duotone', 0, 2.2, 1, 96, 5, 0, true]), 'older spiral, calligram, relief and typewriter layers keep their look', JSON.stringify(legacy2));

  // ---- Spiral: a round disc inside the picture, with a calm middle ----
  await A((k) => window.__sungfluence.useSample(k), 'rocket'); await p.waitForTimeout(400); await wait(p);
  // drawn straight from the engine, so nothing else on the page can get in the way
  const one = (m, o) => { const S = window.__sungfluence; return window.Sungfluence.render(S.src, S.sceneFor([S.newLayer(m, o || {})], S.previewScale(), { paper: '#ffffff' })); };
  await A((f) => { window.__one = eval(f); }, one.toString());
  const sp = await A(() => {
    const o = window.__one('spiral'), it = o.layers[0].items.filter((q) => q.t === 'text');
    const cx = o.W / 2, cy = o.H / 2, R = Math.min(o.W, o.H) / 2;
    const far = it.filter((q) => Math.hypot(q.x - cx, q.y - cy) > R).length;
    const near = it.filter((q) => Math.hypot(q.x - cx, q.y - cy) < R * 0.04);
    return { n: it.length, far, faded: near.length && near.every((q) => (q.a ?? 1) < 1) };
  });
  check(sp.n > 500 && sp.far === 0, 'a new Spiral stays inside a round disc, clear of the edges', sp.n + ' letters, ' + sp.far + ' outside');
  check(sp.faded, 'its middle starts in small, lighter letters with no empty hole, so it is not a target');

  // ---- Typewriter: no more than two characters typed on one spot ----
  const tw = await A(() => {
    const o = window.__one('typewriter'), it = o.layers[0].items.filter((q) => q.t === 'text'), G = o.layers[0].grid;
    const cellW = o.W / G.cols, cell = new Map();
    it.forEach((q) => { const key = Math.round(q.x / cellW) + ',' + Math.floor(q.y / (G.size * 1.1)); cell.set(key, (cell.get(key) || 0) + 1); });
    return { cols: G.cols, most: Math.max(...cell.values()) };
  });
  check(tw.most <= 2, 'Typewriter types at most two characters on one spot', 'most ' + tw.most + ', ' + tw.cols + ' columns');

  // ---- Calligram: follows the picture; the heart is a recipe ----
  await A((k) => window.__sungfluence.useSample(k), 'cat'); await p.waitForTimeout(400); await wait(p);
  const cal = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const cover = (o) => { const sc = S.sceneFor([S.newLayer('calligram', o)], 400 / S.doc.out.width); const r = C.render(S.src, sc); const it = r.layers[0].items; const rows = new Set(it.map((q) => Math.round(q.y))); return { n: it.length, rows: rows.size, ys: [...new Set(it.map((q) => +q.y.toFixed(3)))].sort((a, b) => a - b) }; };
    const subj = cover({}), heart = cover({ maskSource: 'heart' });
    const tile = S.sceneFor([S.newLayer('calligram', { size: 8 })], 240 / S.doc.out.width, { coarse: 3.4 });
    const ys = [...new Set(C.render(S.src, tile).layers[0].items.map((q) => q.y))].sort((a, b) => a - b);
    const steps = new Set(ys.slice(1).map((y, i) => Math.round((y - ys[i]) * 1000) / 1000));
    return { def: S.newLayer('calligram', {}).maskSource, subj: subj.n, heart: heart.n, recipe: (S.RECIPES.find((r) => r.name === 'Heart calligram') || { layers: [[0, {}]] }).layers[0][1].maskSource, steps: [...steps], whole: ys.every((y) => Math.abs(y - Math.round(y)) < 1e-6) };
  });
  check(cal.def === 'auto' && cal.subj > 50 && cal.subj !== cal.heart, 'a new Calligram fills the subject of the photo, not a heart', cal.subj + ' letters, heart ' + cal.heart);
  check(cal.recipe === 'heart', 'the Heart calligram recipe keeps the heart');
  check(cal.whole && cal.steps.length <= 2, 'small calligram rows sit on whole pixels, so thumbnails show no white bands', 'row steps ' + cal.steps.join(', '));

  // on a photo that fills the frame, the subject is one smooth shape, and no word is cut at a gap in it
  await A((k) => window.__sungfluence.useSample(k), 'face'); await p.waitForTimeout(400); await wait(p);
  const cf = await A(() => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const L = S.newLayer('calligram', {}), r = C.render(S.src, S.sceneFor([L], S.previewScale()));
    const it = r.layers[0].items.filter((q) => q.t === 'text'), size = it.length ? it[0].size : 1;
    const words = new Set(String(L.text).toUpperCase().split(/\s+/));
    const rows = new Map();
    it.forEach((q) => { const k = Math.round(q.y); if (!rows.has(k)) rows.set(k, []); rows.get(k).push(q); });
    let segs = 0, cut = [];
    for (const row of rows.values()) {
      row.sort((a, b) => a.x - b.x);
      // pieces of a row: a gap wider than any space between words is a gap in the shape
      const pieces = [[row[0]]];
      for (let i = 1; i < row.length; i++) { const gap = row[i].x - row[i - 1].x - C.measure(row[i - 1].s, size, row[i - 1].weight, row[i - 1].font); (gap > size * 1.7 ? pieces.push([row[i]]) : pieces[pieces.length - 1].push(row[i])); }
      const text = pieces.map((pc) => { let t = pc[0].s; for (let i = 1; i < pc.length; i++) { const gap = pc[i].x - pc[i - 1].x - C.measure(pc[i - 1].s, size, pc[i - 1].weight, pc[i - 1].font); t += (gap > size * 0.2 ? ' ' : '') + pc[i].s; } return t.trim().split(' '); });
      segs += pieces.length;
      // only the first word of a row and the last word of a row may be part of a split word
      text.forEach((tk, j) => { if (j < text.length - 1 && !words.has(tk[tk.length - 1])) cut.push(tk[tk.length - 1]); if (j > 0 && !words.has(tk[0])) cut.push(tk[0]); });
    }
    return { n: it.length, rows: rows.size, segs, cut: cut.slice(0, 6) };
  });
  check(cf.n > 200 && cf.segs < cf.rows * 1.6, 'on a full-frame photo the Calligram subject is one smooth shape', cf.n + ' letters, ' + cf.segs + ' pieces in ' + cf.rows + ' rows');
  check(!cf.cut.length, 'no word is cut at a gap in the shape', cf.cut.join(' '));

  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
