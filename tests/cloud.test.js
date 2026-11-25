// Word cloud: words packed inside a silhouette, their weights, the angles they turn to, the shape outline,
// the one-click silhouette that makes a clean shape out of a photo, and the Word cloud Apply text art makes where it picks one.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(80); } await p.waitForTimeout(250); };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2200);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => window.__sungfluence.useSample('rocket')); await p.waitForTimeout(1300);
  // these checks start from a plain Word cloud with its own defaults on white, not from the flagship first look
  const set = async (over) => { await A((o) => { const S = window.__sungfluence; if (S.curLayer().mode !== 'cloud') { S.usePluginStyle('cloud'); S.doc.text.layers[0] = S.newLayer('cloud', {}); S.doc.out.paper = '#ffffff'; } Object.assign(S.curLayer(), o); S.scheduleText(0); }, over); await wait(p); };
  const texts = () => A(() => window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text'));
  const words = 'moon: 5\nrocket\nlaunch\norbit\nstars\nfuel\nsky';

  // everything lands inside the shape
  await A(() => { window.__sungfluence.doc.out.paper = '#ffffff'; });
  await set({ words, maskSource: 'circle', maxSize: 90, minSize: 6, color: 'ink', inkColor: '#14213d', gradient: 'none', rotSet: [0], shapeOutline: 0 });
  const g = await A(() => { const S = window.__sungfluence, o = S.out; return { W: o.W, H: o.H, m: o.margin || 0 }; });
  const inside = await A(([W, H]) => {
    const S = window.__sungfluence, r = Math.min(W, H) * 0.46;
    const out = S.out.layers[0].items.filter((i) => i.t === 'text');
    const far = out.filter((i) => Math.hypot(i.x - W / 2, i.y - H / 2) > r);
    return { n: out.length, far: far.length };
  }, [g.W, g.H]);
  check(inside.n > 80 && inside.far === 0, inside.n + ' words placed, every one inside the circle');
  await p.locator('#art').screenshot({ path: __dirname + '/out/wc1-circle.png' });

  // whole words, never letter by letter, so Urdu and Arabic keep their joined shapes
  const whole = await A(() => {
    const S = window.__sungfluence;
    Object.assign(S.curLayer(), { words: 'خودی\nکو\nبلند', maskSource: 'circle' });
    return new Promise((res) => { S.scheduleText(0); setTimeout(() => res(S.out.layers[0].items.filter((i) => i.t === 'text').map((i) => i.s)), 2500); });
  });
  check(whole.length > 10 && whole.every((s) => ['خودی', 'کو', 'بلند'].includes(s)), 'Urdu words are placed whole, never a letter at a time (' + whole.length + ' placed)');

  // the heaviest word comes out biggest and most often
  await set({ words, maskSource: 'circle', maxSize: 90, minSize: 8 });
  const byWord = await A(() => {
    const out = window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text'), m = {};
    out.forEach((i) => { m[i.s] = m[i.s] || { n: 0, max: 0 }; m[i.s].n++; m[i.s].max = Math.max(m[i.s].max, i.size); });
    return m;
  });
  const others = Object.keys(byWord).filter((k) => k !== 'moon');
  check(byWord.moon && others.every((k) => byWord.moon.max >= byWord[k].max), 'the word given ": 5" comes out the biggest (' + Math.round(byWord.moon.max) + ' px)');
  check(byWord.moon.n > (byWord[others[0]] || { n: 0 }).n, 'and it appears more often (' + byWord.moon.n + ' times)');

  // each word turns in place, to one of the angles asked for
  await set({ rotSet: [-90, 0, 90], rotAngle: 0, rotTilt: 0 });
  const angs = await A(() => [...new Set(window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text').map((i) => Math.round((i.rot || 0) * 180 / Math.PI)))].sort((a, b) => a - b));
  check(angs.length === 3 && angs.join(',') === '-90,0,90', 'words take the angles asked for: ' + angs.join('°, ') + '°');
  await set({ rotSet: [0], rotAngle: 30, rotTilt: 10 });
  const spread = await A(() => window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text').map((i) => Math.round((i.rot || 0) * 180 / Math.PI)));
  check(Math.min(...spread) >= 18 && Math.max(...spread) <= 42, 'an overall turn of 30° with 10° of tilt lands between ' + Math.min(...spread) + '° and ' + Math.max(...spread) + '°');
  await p.locator('#art').screenshot({ path: __dirname + '/out/wc2-angles.png' });

  // bigger words toward the middle
  await set({ rotSet: [0], rotAngle: 0, rotTilt: 0, gradient: 'center', gradientAmount: 1, maxSize: 110, minSize: 7 });
  const spots = await A(([W, H]) => {
    const out = window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text');
    const d = (i) => Math.hypot(i.x - W / 2, i.y - H / 2);
    const big = out.filter((i) => i.size > 50), small = out.filter((i) => i.size < 15);
    const avg = (a) => a.reduce((n, i) => n + d(i), 0) / Math.max(1, a.length);
    return { big: big.length, small: small.length, bigD: avg(big), smallD: avg(small) };
  }, [g.W, g.H]);
  check(spots.big > 0 && spots.bigD < spots.smallD, 'with "toward the middle", big words sit closer to the centre (' + Math.round(spots.bigD) + ' px against ' + Math.round(spots.smallD) + ' px)');

  // the outline of the shape
  await set({ shapeOutline: 8, shapeColor: '#b4420c' });
  const rects = await A(() => { const it = window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'rect'); return { n: it.length, col: it.length ? it[0].fill : '' }; });
  check(rects.n > 100 && /b4420c/i.test(rects.col), 'the shape outline is drawn, so every export carries it (' + rects.n + ' pieces)');
  await set({ shapeOutline: 0 });
  check(await A(() => window.__sungfluence.out.layers[0].items.every((i) => i.t === 'text')), 'with the outline off, nothing is drawn for it');

  // the one-click silhouette
  await A(() => { const S = window.__sungfluence; S.doc.photo.silhouette = 0; S.photoChanged('source'); }); await wait(p);
  await A(() => window.__sungfluence.runCommand('image.silhouette')); await wait(p);
  const tone = await A(() => {
    const S = window.__sungfluence, s = S.src;
    let dark = 0, light = 0, mid = 0;
    for (let i = 0; i < s.lum.length; i += 7) { const v = s.lum[i]; if (v < 0.1) dark++; else if (v > 0.9) light++; else mid++; }
    return { dark, light, mid, on: S.doc.photo.silhouette };
  });
  check(tone.on > 0 && tone.mid === 0 && tone.dark > 0 && tone.light > 0, 'the silhouette leaves only two tones, no shades in between');
  await p.locator('#art').screenshot({ path: __dirname + '/out/wc3-silhouette.png' });
  const inv = await A(() => {
    const S = window.__sungfluence, before = S.src.lum.slice(0, 200).reduce((n, v) => n + v, 0);
    S.doc.photo.silInvert = true; S.photoChanged('source');
    return new Promise((res) => setTimeout(() => res({ before, after: S.src.lum.slice(0, 200).reduce((n, v) => n + v, 0) }), 1200));
  });
  check(inv.before !== inv.after, 'swapping which part is the shape turns it around');
  await A(() => { const S = window.__sungfluence; S.doc.photo.silInvert = false; S.photoChanged('source'); }); await wait(p);

  // the shape of the photo feeds the word cloud
  await set({ maskSource: 'image', threshold: 0.5, maxSize: 140, minSize: 5, shapeOutline: 5, gradient: 'center' });
  const onShape = await A(() => {
    const S = window.__sungfluence, o = S.out, out = o.layers[0].items.filter((i) => i.t === 'text');
    let off = 0;
    out.forEach((i) => { const sx = Math.min(S.src.w - 1, Math.max(0, Math.floor(i.x / o.W * S.src.w))), sy = Math.min(S.src.h - 1, Math.max(0, Math.floor(i.y / o.H * S.src.h))); if (S.src.lum[sy * S.src.w + sx] > 0.5) off++; });
    return { n: out.length, off };
  });
  check(onShape.n > 100 && onShape.off / onShape.n < 0.06, onShape.n + ' words follow the silhouette of the photo (' + onShape.off + ' off it)');
  await p.locator('#art').screenshot({ path: __dirname + '/out/wc4-photo.png' });

  // the window must not freeze
  const lt = await A(() => {
    const L = []; const ob = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration))));
    ob.observe({ entryTypes: ['longtask'] });
    const S = window.__sungfluence;
    Object.assign(S.curLayer(), { maxSize: 160, minSize: 4, density: 1.6 });
    S.scheduleText(0);
    return new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); ob.disconnect(); res(L.sort((a, b) => b - a).slice(0, 3)); } }, 100); });
  });
  console.log('     longest tasks while filling the shape (ms):', lt.join(', ') || 'none');
  check(!lt.length || lt[0] < 260, 'filling the shape keeps the window alive (longest ' + (lt[0] || 0) + ' ms)');

  // Apply text art starts from the flagship Word cloud (see flagship.test.js); the photo picks its shape and
  // colors, so the first Word cloud already shows its subject
  const first = {};
  for (const k of ['coffee', 'cat', 'face', 'rocket', 'loaf']) {
    if (k === 'loaf') {
      // a drawn picture: a warm brown loaf with white paper all around it, the kind of picture that gets a Word cloud
      await A(async () => {
        const W = 1200, c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, W, W);
        const g = x.createRadialGradient(W * .45, W * .45, 10, W / 2, W / 2, W * .3); g.addColorStop(0, '#e0a46a'); g.addColorStop(1, '#8a5a2b');
        x.fillStyle = g; x.beginPath(); x.ellipse(W / 2, W / 2, W * .3, W * .2, 0, 0, 7); x.fill();
        const S = window.__sungfluence; S.prefs.reveal = 'none'; await S.loadImageURL(c.toDataURL(), 'loaf.png'); S.freshImage();
      });
    } else await A((k) => { window.__sungfluence.prefs.reveal = 'none'; return window.__sungfluence.useSample(k); }, k);
    await wait(p);
    const cta = await A(() => { const c = document.getElementById('cta'), sg = window.__sungfluence.ui.suggestion; return { shown: !c.hidden, text: c.textContent, note: sg && sg.note }; });
    // the card offers the suggested style and why, or, when the photo starts in another style than the Word cloud, that note alone
    check(cta.shown && cta.note && (/Suggested: [A-Z][a-z ]+\. /.test(cta.text) || /Word cloud is one click away\.$/.test(cta.note)) && cta.text.includes(cta.note), k + ': the card offers a style and says why: "' + cta.note + '"');
    const r = await A(() => {
      const S = window.__sungfluence, L = [];
      const ob = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration))));
      ob.observe({ entryTypes: ['longtask'] });
      S.applyTextArt();
      return new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); ob.disconnect(); res(L.sort((a, b) => b - a)[0] || 0); } }, 100); });
    });
    await wait(p);
    first[k] = await A(() => {
      // the mean tone of the photo under the words, against the whole photo
      const S = window.__sungfluence, o = S.out, s = S.baseSrc, it = o.layers[0].items.filter((i) => i.t === 'text');
      let all = 0, under = 0;
      for (let i = 0; i < s.lum.length; i++) all += s.lum[i];
      it.forEach((i) => { const x = Math.min(s.w - 1, Math.max(0, Math.floor(i.x / o.W * s.w))), y = Math.min(s.h - 1, Math.max(0, Math.floor(i.y / o.H * s.h))); under += s.lum[y * s.w + x]; });
      const L = S.curLayer();
      return { n: it.length, under: under / Math.max(1, it.length), all: all / s.lum.length, mode: L.mode, shape: L.maskSource, paper: S.doc.out.paper, color: L.color, fellBack: !!(o.layers[0].stats && o.layers[0].stats.fellBack) };
    });
    first[k].long = r;
    const f = first[k];
    if (f.mode === 'cloud') check(f.n >= 250 && f.n <= 3000, k + ': Apply text art makes a Word cloud of a sensible number of words (' + f.n + ', shape: ' + f.shape + ')');
    else console.log('     ' + k + ': Apply text art picks ' + f.mode + ' here, not a Word cloud');
    check(r < 260, k + ': and keeps the window alive while it does (longest task ' + r + ' ms)');
    await p.locator('#art').screenshot({ path: __dirname + '/out/wc5-first-' + k + '.png' });
  }
  check(first.coffee.paper === '#15120f' && first.coffee.mode === 'cloud', 'coffee: the lit cup starts as the flagship Word cloud on warm black paper (' + first.coffee.paper + ')');
  // the loaf sits on white paper and gets a Word cloud: the words go on it, not on the background, in its own colors.
  check(first.loaf.mode === 'cloud', 'loaf: one clear subject with paper all around gets a Word cloud');
  check(first.loaf.under < first.loaf.all - 0.08, 'loaf: the words sit on the subject, not the white background (' + first.loaf.under.toFixed(2) + ' against ' + first.loaf.all.toFixed(2) + ')');
  check(first.loaf.color === 'image', 'loaf: a brown subject on white keeps its colors (' + first.loaf.color + ')');
  // a dark tower full of struts would be a plain cone as a Word cloud on dark paper, so it starts as a Halftone
  check(first.rocket.mode === 'halftone', 'rocket: the detailed launch tower starts as a Halftone, which keeps its struts (' + first.rocket.mode + ')');

  // the old projects keep their shape: a cloud without the new setting reads the dark parts, as before
  const side = await A(() => {
    const S = window.__sungfluence;
    S.doc.out.paper = '#ffffff';
    S.doc.text.layers = [S.newLayer('cloud', { maskSource: 'image', threshold: 0.5 })]; S.doc.text.sel = 0;
    delete S.doc.text.layers[0].maskInvert;
    S.scheduleText(0);
    const avg = () => { const o = S.out, s = S.baseSrc, it = o.layers[0].items.filter((i) => i.t === 'text'); let u = 0; it.forEach((i) => { u += s.lum[Math.min(s.h - 1, Math.floor(i.y / o.H * s.h)) * s.w + Math.min(s.w - 1, Math.floor(i.x / o.W * s.w))]; }); return u / Math.max(1, it.length); };
    const done = () => new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); res(); } }, 100); });
    return done().then(() => { const a = avg(); S.curLayer().maskInvert = true; S.scheduleText(0); return done().then(() => ({ dark: a, light: avg() })); });
  });
  check(side.dark < side.light - 0.1, 'Swap the shape and the space around it moves the words from the dark parts to the light parts (' + side.dark.toFixed(2) + ' to ' + side.light.toFixed(2) + ')');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' word cloud checks failed' : 'all word cloud checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
