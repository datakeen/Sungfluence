// Settings every style shares, judged on the sample cat: the soft fade, Shadow against Riso offset, Outline,
// the see-through Cut out sheet, turned letters and words with room, a shape word that fits the artboard,
// short texts with marks that start each row at a new place, the Fit colors note, and the Word cloud recipe's
// clean shape. Older projects keep their look.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(60); } await p.waitForTimeout(150); };
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
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; return window.__sungfluence.useSample('cat'); }); await wait(p);
  await A(() => window.__sungfluence.applyTextArt()); await wait(p);
  // one layer of a style, on white paper
  const use = async (mode, over) => {
    await A(([mode, over]) => {
      const S = window.__sungfluence;
      S.doc.out.width = 1600; S.doc.out.paper = '#ffffff'; S.doc.out.transparent = false;
      S.doc.text.layers = [S.newLayer(mode, over || {})]; S.doc.text.sel = 0; S.doc.text.applied = true; S.doc.text.source = 'photo';
      S.buildPanel(); S.setView('text'); S.scheduleText(0);
    }, [mode, over]);
    await wait(p);
  };
  const items = () => A(() => window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text').map((q) => ({ s: q.s, x: q.x, y: q.y, size: q.size, rot: q.rot || 0, a: q.a ?? 1, w: window.Sungfluence.measure(q.s, q.size, q.weight || 400, q.font || 'sans'), align: q.align })));

  // ---- Focus and fade: a soft vignette ----
  const L0 = await A(() => window.__sungfluence.newLayer('rows'));
  check(L0.focusAffect === 'both' && L0.fr > 0.7, 'a new fade fades color and density together, over a wider shape', L0.focusAffect + ', size ' + L0.fr);
  await use('rows', { focus: 'ellipse' });
  const fade = await A(() => {
    const S = window.__sungfluence, o = S.out, its = o.layers[0].items.filter((q) => q.t === 'text');
    const ring = (r0, r1) => its.filter((q) => { const d = Math.hypot((q.x - o.W / 2) / (o.W / 2), (q.y - o.H / 2) / (o.H / 2)); return d >= r0 && d < r1; });
    const avg = (l) => l.reduce((s, q) => s + (q.a ?? 1), 0) / Math.max(1, l.length);
    return { inA: avg(ring(0, 0.3)), midA: avg(ring(0.55, 0.7)), outA: avg(ring(0.85, 1)), inN: ring(0, 0.3).length, midN: ring(0.55, 0.7).length };
  });
  check(fade.inA > 0.97 && fade.midA < fade.inA - 0.1 && fade.outA < 0.5 && fade.outA < fade.midA - 0.2, 'the letters fade smoothly from the middle outward', 'opacity ' + fade.inA.toFixed(2) + ', ' + fade.midA.toFixed(2) + ', ' + fade.outA.toFixed(2));
  // the fade thins whole words: a word that stays keeps all its letters
  const byWord = () => A(() => { const m = {}; for (const q of window.__sungfluence.out.layers[0].items) if (q.wd != null) m[q.wd] = (m[q.wd] || 0) + 1; return m; });
  const wFade = await byWord();
  await use('rows', {}); const wAll = await byWord();
  const kept = Object.keys(wFade), broken = kept.filter((k) => wFade[k] !== wAll[k]).length;
  check(kept.length > 100 && kept.length < Object.keys(wAll).length && broken === 0, 'the fade leaves out whole words, never letters from inside a word', broken + ' of ' + kept.length + ' words lost a letter');
  // Word mosaic: the silhouette stays, the words fade toward the edge
  await use('mosaic', {}); const mAll = await A(() => window.__sungfluence.out.layers[0].items.length);
  await use('mosaic', { focus: 'ellipse' });
  const mF = await A(() => { const t = window.__sungfluence.out.layers[0].items; return { n: t.length, faded: t.filter((q) => (q.a ?? 1) < 0.9).length }; });
  check(mF.n > mAll * 0.75 && mF.faded > mF.n * 0.1, 'Word mosaic with a fade keeps the picture and fades its words', mF.n + ' of ' + mAll + ' words, ' + mF.faded + ' faded');
  await p.locator('#art').screenshot({ path: __dirname + '/out/shared-fade.png' });

  // ---- Shadow and Riso offset ----
  await use('rows', { effect: 'shadow', letterFill: 'ink' });
  const sh = await A(() => {
    const C = window.Sungfluence, L = window.__sungfluence.out.layers[0], it = L.items.find((q) => q.t === 'text');
    const u = C.underOf(L, it), c = C.parseColor(u.fill), f = C.parseColor(it.fill);
    return { orange: c[0] > c[2] + 0.25, deep: 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 0.4, a: u.a, off: u.off / it.size };
  });
  check(!sh.orange && sh.deep && sh.a < 0.6 && sh.off > 0.05, 'Shadow is an even, see-through deep tone of the paper, set off by a share of the letter size, not the orange offset ink', 'opacity ' + sh.a);
  const shArt = await A(() => { const c = window.__sungfluence.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let warm = 0, n = 0; for (let i = 0; i < d.length; i += 64) { if (d[i] < 250) { n++; if (d[i] - d[i + 2] > 40) warm++; } } return warm / Math.max(1, n); });
  check(shArt < 0.05, 'the shadow does not tint the portrait', (shArt * 100).toFixed(1) + '% warm pixels');
  await p.locator('#art').screenshot({ path: __dirname + '/out/shared-shadow.png' });
  await A(() => { const S = window.__sungfluence; S.doc.out.paper = '#111113'; S.scheduleText(0); }); await wait(p);
  const shD = await A(() => { const C = window.Sungfluence, L = window.__sungfluence.out.layers[0]; const c = C.parseColor(C.underOf(L, L.items.find((q) => q.t === 'text')).fill); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; });
  check(shD > 0.3, 'on dark paper the shadow is a light glow, so it shows', shD.toFixed(2));
  await A(() => { const S = window.__sungfluence; S.doc.out.paper = '#ffffff'; Object.assign(S.curLayer(), { shadowFrom: 'color', shadowColor: '#2244aa', shadowAlpha: 0.5 }); S.scheduleText(0); }); await wait(p);
  const shC = await A(() => { const C = window.Sungfluence, L = window.__sungfluence.out.layers[0]; const u = C.underOf(L, L.items.find((q) => q.t === 'text')); return [u.fill, u.a]; });
  check(shC[0] === '#2244aa' && shC[1] === 0.5, 'Shadow can take one color of its own, at the strength chosen', shC.join(', '));
  await use('rows', { effect: 'riso', letterFill: 'ink' });
  const riso = await A(() => { const c = window.__sungfluence.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let warm = 0, n = 0; for (let i = 0; i < d.length; i += 64) { if (d[i] < 250) { n++; if (d[i] - d[i + 2] > 40) warm++; } } return warm / Math.max(1, n); });
  check(riso > shArt + 0.1, 'Riso offset keeps its colored second ink', (riso * 100).toFixed(1) + '% warm pixels');

  // ---- Outline ----
  await use('rows', { effect: 'outline', letterFill: 'ink' });
  const ol = await A(() => {
    const C = window.Sungfluence, L = window.__sungfluence.out.layers[0], t = L.items.filter((q) => q.t === 'text');
    const thin = { t: 'text', size: 40, weight: 100 }, bold = { t: 'text', size: 40, weight: 900 };
    return { min: L.outlineMin, small: C.outlineOn(L, { size: L.outlineMin * 0.5 }), big: C.outlineOn(L, { size: L.outlineMin * 2 }), thin: C.outlineWidth(thin), bold: C.outlineWidth(bold), n: t.length };
  });
  check(!ol.small && ol.big, 'letters too small for an outline stay solid; bigger ones are outlined');
  check(ol.bold > ol.thin * 2 && ol.bold < 40 * 0.07, 'the outline is thin, and bold letters get a heavier one, so the tones still read', ol.thin.toFixed(2) + ' to ' + ol.bold.toFixed(2) + ' px on a 40 px letter');
  await p.locator('#art').screenshot({ path: __dirname + '/out/shared-outline.png' });

  // ---- Turn each 0 and 90: turned letters and words have room ----
  const overlap = (list) => {
    // turned boxes against their neighbors in the same row, a little inside the letters
    let bad = 0, n = 0;
    const box = (q) => { const c = Math.abs(Math.cos(q.rot)), s = Math.abs(Math.sin(q.rot)), w = q.w * 0.9, h = q.size * 0.65; return { x: q.x, y: q.y, hw: (c * w + s * h) / 2, hh: (s * w + c * h) / 2 }; };
    const B = list.filter((q) => q.align === 'center').map(box).sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 1; i < B.length; i++) { const a = B[i - 1], c = B[i]; if (Math.abs(a.y - c.y) > 0.5) continue; n++; if (c.x - a.x < (a.hw + c.hw) * 0.9) bad++; }
    return n ? bad / n : 1;
  };
  await use('rows', { turn: 'each', turnSet: [0, 90], letterFill: 'ink' });
  const rowsTurn = await items();
  const angles = [...new Set(rowsTurn.map((q) => Math.round(q.rot * 180 / Math.PI)))].sort((a, b) => a - b);
  check(angles.join() === '0,90', 'Text portrait: both angles are used', angles.join(', '));
  const ov = overlap(rowsTurn);
  const up = rowsTurn.filter((q) => Math.abs(q.rot) < 0.01), side = rowsTurn.filter((q) => Math.abs(q.rot) > 1.5);
  const meanSize = (l) => l.reduce((a, q) => a + q.size, 0) / Math.max(1, l.length);
  check(side.length > 50 && meanSize(side) > meanSize(up) * 0.8, 'Text portrait: turned letters keep their size; the row makes room for them', meanSize(side).toFixed(1) + ' against ' + meanSize(up).toFixed(1) + ' px');
  check(ov < 0.05, 'Text portrait: turned letters do not run into the next letter', (ov * 100).toFixed(1) + '% of neighbors touch');
  await p.locator('#art').screenshot({ path: __dirname + '/out/shared-turn-rows.png' });
  await use('mosaic', { turn: 'each', turnSet: [0, 90] });
  const words = await A(() => {
    const L = window.__sungfluence.out.layers[0], C = window.Sungfluence;
    const t = L.items.filter((q) => q.t === 'text').map((q) => { const w = C.measure(q.s, q.size, q.weight || 400, q.font || 'sans') * 0.94, h = q.size * 0.68, c = Math.cos(q.rot || 0), s = Math.sin(q.rot || 0); return { x: q.x, y: q.y, c, s, hw: w / 2, hh: h / 2 }; });
    const proj = (b, ax, ay) => Math.abs(b.c * ax + b.s * ay) * b.hw + Math.abs(-b.s * ax + b.c * ay) * b.hh;
    const hits = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; for (const [ax, ay] of [[a.c, a.s], [-a.s, a.c], [b.c, b.s], [-b.s, b.c]]) if (Math.abs(dx * ax + dy * ay) >= proj(a, ax, ay) + proj(b, ax, ay)) return false; return true; };
    let bad = 0;
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (Math.abs(t[i].x - t[j].x) < 400 && Math.abs(t[i].y - t[j].y) < 400 && hits(t[i], t[j])) bad++;
    const turned = t.filter((q) => Math.abs(q.s) > 0.9).length;
    return { n: t.length, bad, turned };
  });
  check(words.n > 150 && words.turned > words.n * 0.2 && words.bad <= words.n * 0.01, 'Word mosaic: many words turn, and turned words do not pile onto others', words.turned + ' of ' + words.n + ' turned, ' + words.bad + ' overlapping pairs');
  await p.locator('#art').screenshot({ path: __dirname + '/out/shared-turn-mosaic.png' });

  // ---- Draw on In shape: the whole shape word fits, with a margin ----
  for (const w of [1600, 3671]) {
    await use('rows', { region: 'inside', regionShape: 'text', regionText: 'LOVE' });
    await A((w) => { const S = window.__sungfluence; S.doc.out.width = w; S.doc.text.layers[0].pxW = 1600; S.scheduleText(0); }, w); await wait(p);
    const sh2 = await A(() => {
      const o = window.__sungfluence.out, t = o.layers[0].items.filter((q) => q.t === 'text');
      const xs = t.map((q) => q.x / o.W).sort((a, b) => a - b);
      // the E: the letters in the last tenth of the word's width
      const x0 = xs[0], x1 = xs[xs.length - 1], lastE = t.filter((q) => q.x / o.W > x1 - (x1 - x0) * 0.12).length;
      return { x0, x1, lastE, n: t.length };
    });
    check(sh2.x0 > 0.03 && sh2.x1 < 0.97 && sh2.lastE > sh2.n * 0.04, 'In shape, ' + w + ' px: LOVE sits inside the artboard and its E is filled', 'from ' + (sh2.x0 * 100).toFixed(1) + '% to ' + (sh2.x1 * 100).toFixed(1) + '%, ' + sh2.lastE + ' letters in the E');
  }
  await p.locator('#art').screenshot({ path: __dirname + '/out/shared-love.png' });

  // ---- a short text with marks: each row starts at its own place ----
  await use('rows', { text: '[love]{#c0392b} and **light** ', letterFill: 'ink' });
  const starts = await A(() => {
    const t = window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text');
    const rows = new Map(); for (const q of t) { const k = Math.round(q.y); if (!rows.has(k)) rows.set(k, []); rows.get(k).push(q); }
    // where the red word sits on each row, as a share of the row; rows that started alike would line up
    const firstRed = [...rows.values()].map((r) => { r.sort((a, b) => a.x - b.x); const q = r.find((z) => /c0392b/i.test(z.fill)); return q ? Math.round(q.x / 4) : null; }).filter((v) => v !== null);
    const steps = new Set(); for (let i = 1; i < firstRed.length; i++) steps.add(firstRed[i] - firstRed[i - 1]);
    return { rows: firstRed.length, steps: steps.size };
  });
  check(starts.rows > 20 && starts.steps > starts.rows * 0.3, 'a short text with marks does not line its marked words up in diagonal stripes', starts.steps + ' different steps over ' + starts.rows + ' rows');
  await use('rows', { text: 'every picture is a story told in letters and every letter keeps a little of the light every picture is a story told in letters and every letter keeps a little of the light', letterFill: 'ink', minInk: -1 });
  const flowOn = await A(() => {
    const t = window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text'), y0 = t[0].y;
    return t.filter((q) => Math.abs(q.y - y0) < 0.5).map((q) => q.s).join('').slice(0, 12);
  });
  check(flowOn === 'EVERYPICTURE', 'a long plain text starts at its beginning and reads on', flowOn);

  // ---- Fit colors: a word when it changes nothing ----
  await use('rows', { colorFit: 'strong' });
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; S.buildPanel(); });
  const note1 = await A(() => [...document.querySelectorAll('.note[data-live]')].map((n) => n.hidden ? '' : n.textContent).join(' '));
  check(/Letter fill/.test(note1), 'Fit colors says why it changes nothing when the letters show the photo', note1);
  await use('rows', { colorFit: 'strong', letterFill: 'ink', color: 'ink', inkColor: '#000000' });
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; S.buildPanel(); });
  const note2 = await A(() => [...document.querySelectorAll('.note[data-live]')].map((n) => n.hidden ? '' : n.textContent).join(' '));
  check(/nothing needed to change/.test(note2), 'and says so when every color already stands out', note2);

  // ---- the Outlined cloud recipe: a clean shape ----
  const cloud = {};
  for (const k of ['cat', 'rocket', 'face', 'coffee']) {
    await A((k) => window.__sungfluence.useSample(k), k); await wait(p);
    await A(() => { const S = window.__sungfluence; S.doc.out.width = 1600; S.applyRecipe(S.RECIPES.find((r) => r.name === 'Outlined cloud')); }); await wait(p);
    cloud[k] = await A(() => { const o = window.__sungfluence.out.layers[0], W = window.__sungfluence.out.W, H = window.__sungfluence.out.H;
      const r = o.items.filter((q) => q.t === 'rect'), m = Math.min(W, H) * 0.02;
      // the outline keeps clear of the edges of the artboard, so it always closes
      const clear = r.every((q) => q.x > m && q.y > m && q.x + q.w < W - m && q.y + q.h < H - m);
      return { rough: o.stats.rough, rects: r.length, words: o.items.filter((q) => q.t === 'text').length, fellBack: !!o.stats.fellBack, clear }; });
    await p.locator('#art').screenshot({ path: __dirname + '/out/shared-cloud-' + k + '.png' });
  }
  check(cloud.cat.rough < 2 && cloud.cat.rects > 100 && cloud.cat.words > 300, 'Outlined cloud recipe, cat: one clean shape with its outline', JSON.stringify(cloud.cat));
  check(cloud.rocket.rough < 2 && cloud.rocket.rects > 100, 'Outlined cloud recipe, rocket: a clean shape with its outline', JSON.stringify(cloud.rocket));
  check(cloud.cat.clear && cloud.rocket.clear && !cloud.cat.fellBack && !cloud.rocket.fellBack, 'Outlined cloud recipe: the cat and the rocket keep their own shape, and the outline closes inside the artboard', JSON.stringify([cloud.cat, cloud.rocket]));
  // face and coffee have no clear shape to read by tone: the words fill a clean oval with a closed outline
  check(cloud.face.fellBack && cloud.face.clear && cloud.face.rects > 100 && cloud.face.words > 300, 'Outlined cloud recipe, face: no clear shape, so a clean oval', JSON.stringify(cloud.face));
  check(cloud.coffee.fellBack && cloud.coffee.clear && cloud.coffee.words > 300, 'Outlined cloud recipe, coffee: no clear shape, so a clean oval', JSON.stringify(cloud.coffee));

  // ---- older projects keep their look ----
  const proj = await A(() => {
    const S = window.__sungfluence;
    S.doc.text.layers = [S.newLayer('rows', { effect: 'shadow', focus: 'ellipse', letterFill: 'cut' })]; S.doc.text.sel = 0;
    const old = JSON.parse(JSON.stringify(S.projectData()));
    old.text.layers.forEach((L) => { for (const k of ['focusAffect', 'fr', 'fs', 'shadowFrom', 'shadowColor', 'shadowAlpha', 'risoTone', 'fillSheetSee']) delete L[k]; });
    return old;
  });
  await A((d) => window.__sungfluence.openProject(d), proj); await wait(p);
  const oldL = await A(() => { const L = window.__sungfluence.curLayer(); return { focusAffect: L.focusAffect, fr: L.fr, fs: L.fs, shadowFrom: L.shadowFrom, shadowAlpha: L.shadowAlpha, risoTone: L.risoTone, fillSheetSee: L.fillSheetSee }; });
  check(oldL.focusAffect === 'density' && oldL.fr === 0.55 && oldL.fs === 0.45 && oldL.shadowFrom === 'color' && oldL.shadowAlpha === 1 && oldL.risoTone === false && oldL.fillSheetSee === 0, 'a project from before keeps its fade, shadow, riso and sheet', JSON.stringify(oldL));
  const oldSh = await A(() => { const C = window.Sungfluence, L = window.__sungfluence.out.layers[0]; return C.underOf(L, L.items.find((q) => q.t === 'text')).fill; });
  check(oldSh === '#e4572e', 'and its shadow stays in the offset ink', oldSh);

  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all shared settings checks passed');
  process.exit(fails ? 1 : 0);
})();
