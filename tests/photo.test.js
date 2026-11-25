// The photo pipeline: see-through PNGs read as white paper, automatic tones for new photos, levels,
// midtones and clarity, the preview matching the export, no long freezes on silhouette or rotate,
// Reset and undo, and projects keeping their photo settings.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } await p.waitForTimeout(250); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
// the rule in DEVELOPMENT.md: aim for 220 ms, never more than 310 ms
const LIMIT = 310;
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; }); await wait(p);

  // ---- a see-through PNG reads as white paper ----
  await A(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300;
    const x = c.getContext('2d');
    x.fillStyle = '#202020'; x.fillRect(120, 80, 160, 140);       // a dark shape
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(300, 20, 80, 40); // a soft shadow, partly see-through
    const S = window.__sungfluence;
    return S.loadImageURL(c.toDataURL('image/png'), 'see-through.png').then(() => { S.doc.sample = null; S.freshImage(); });
  });
  await wait(p);
  const tp = await A(() => {
    const S = window.__sungfluence, s = S.baseSrc, at = (q, fx, fy) => q.lum[Math.floor(fy * q.h) * q.w + Math.floor(fx * q.w)];
    return { corner: at(s, 0.02, 0.02), shape: at(s, 0.5, 0.5), shadow: at(s, 0.85, 0.13), removed: S.hasRemoval, mean: S.photoStats(s).mean };
  });
  check(tp.removed, 'the see-through part counts as removed');
  check(tp.corner > 0.95, 'the see-through part reads as white, not black', tp.corner.toFixed(2));
  check(tp.shape < 0.2, 'the shape keeps its own dark tone', tp.shape.toFixed(2));
  check(tp.shadow > 0.25 && tp.shadow < 0.6, 'a half see-through shadow reads blended with white', tp.shadow.toFixed(2));
  check(tp.mean < 0.3, 'photo numbers skip the removed part', tp.mean.toFixed(2));
  await A(() => window.__sungfluence.runCommand('image.restoreAll')); await wait(p);
  const back = await A(() => {
    const S = window.__sungfluence, s = S.src, c = S.photoCanvas.getContext('2d').getImageData(4, 4, 1, 1).data;
    const o = S.compareCanvas('original', S.artGeom(), {}).getContext('2d').getImageData(4, 4, 1, 1).data;
    return { removed: S.hasRemoval, src: s.lum[2 * s.w + 2], view: c[0], orig: o[0] };
  });
  check(!back.removed && back.src > 0.95 && back.view > 240, 'after Bring everything back the area is white', back.src.toFixed(2) + ', view ' + back.view);
  check(back.orig > 240, 'Compare shows the original photo on white too', back.orig);

  // ---- automatic tones on the samples ----
  const auto = {};
  for (const k of ['coffee', 'cat', 'face', 'rocket']) {
    await A((k) => window.__sungfluence.useSample(k), k); await wait(p);
    auto[k] = await A(() => {
      const S = window.__sungfluence, ph = S.doc.photo, med = (a) => { const s = Float32Array.from(a).sort(); return s[s.length >> 1]; };
      return { gamma: ph.gamma, lo: ph.levelLo, hi: ph.levelHi, clarity: ph.clarity, sharpen: ph.sharpen, saturation: ph.saturation, before: med(S.baseSrc.lum), after: med(S.src.lum), touched: S.photoTouched() };
    });
    const a = auto[k];
    check(a.gamma >= 0.75 && a.gamma <= 1.7 && a.lo >= 0 && a.lo <= 0.2 && a.hi >= 0.75 && a.hi <= 1 && a.clarity <= 0.35 && a.sharpen <= 0.3 && a.saturation >= 1 && a.saturation <= 1.2,
      k + ': automatic tones stay in sensible ranges', JSON.stringify({ g: a.gamma, lo: a.lo, hi: a.hi, cl: a.clarity, sh: a.sharpen, sat: a.saturation }));
  }
  check(auto.coffee.after > auto.coffee.before + 0.08, 'the dark coffee photo gets lighter midtones', auto.coffee.before.toFixed(2) + ' to ' + auto.coffee.after.toFixed(2));
  check(auto.coffee.touched, 'the automatic tones show as changed, so Reset can take them off');
  check(auto.rocket.gamma === 1, 'the bright rocket sky is left as it is');

  // ---- Reset, undo and Auto tone ----
  await A(() => window.__sungfluence.useSample('coffee')); await wait(p);
  await A(() => window.__sungfluence.runCommand('image.resetEffects')); await wait(p);
  const rs = await A(() => { const S = window.__sungfluence, ph = S.doc.photo; return { g: ph.gamma, hi: ph.levelHi, cl: ph.clarity, touched: S.photoTouched() }; });
  check(rs.g === 1 && rs.hi === 1 && rs.cl === 0 && !rs.touched, 'Reset every effect gives the plain photo back', JSON.stringify(rs));
  await A(() => window.__sungfluence.undo()); await wait(p);
  check(await A(() => window.__sungfluence.doc.photo.gamma) === auto.coffee.gamma, 'undo brings the automatic tones back');
  await A(() => window.__sungfluence.runCommand('image.resetEffects')); await wait(p);
  await A(() => window.__sungfluence.runCommand('image.autoTone')); await wait(p);
  check(await A(() => window.__sungfluence.doc.photo.gamma) === auto.coffee.gamma, 'Auto tone sets the same tones again');

  // ---- the setting for new photos ----
  await A(() => window.__sungfluence.openSettings());
  check(await p.locator('#c-pf-autoPhoto').count() === 1, 'Settings has the switch for new photos');
  await A(() => { document.getElementById('dlgScrim').hidden = true; const S = window.__sungfluence; S.prefs.autoPhoto = false; return S.useSample('coffee'); }); await wait(p);
  check(await A(() => !window.__sungfluence.photoTouched()), 'with the switch off a new photo opens plain');
  await A(() => { window.__sungfluence.prefs.autoPhoto = true; });

  // ---- levels, midtones and clarity ----
  const meanOf = () => A(() => { const s = window.__sungfluence.src; let m = 0; for (let i = 0; i < s.lum.length; i++) m += s.lum[i]; return m / s.lum.length; });
  const detailOf = () => A(() => { const s = window.__sungfluence.src; let d = 0; for (let i = 1; i < s.lum.length; i++) d += Math.abs(s.lum[i] - s.lum[i - 1]); return d / s.lum.length; });
  const setP = async (o) => { await A((o) => { const S = window.__sungfluence; Object.assign(S.doc.photo, o); S.photoChanged('adjust'); }, o); await wait(p); };
  const m0 = await meanOf(), d0 = await detailOf();
  await setP({ gamma: 1.6 }); const m1 = await meanOf();
  check(m1 > m0 + 0.05, 'Midtones above 1 lighten the photo', m0.toFixed(3) + ' to ' + m1.toFixed(3));
  await setP({ gamma: 1, levelLo: 0.15 }); const m2 = await meanOf();
  check(m2 < m0 - 0.03, 'a higher black point darkens the photo', m2.toFixed(3));
  await setP({ levelLo: 0, levelHi: 0.7 }); const m3 = await meanOf();
  check(m3 > m0 + 0.03, 'a lower white point brightens the photo', m3.toFixed(3));
  await setP({ levelHi: 1, clarity: 1 }); const d1 = await detailOf();
  check(d1 > d0 * 1.05, 'clarity raises the contrast between nearby areas', d0.toFixed(4) + ' to ' + d1.toFixed(4));

  // ---- the preview matches the export ----
  await setP({ gamma: 1.4, clarity: 0.4, sharpen: 0.6, levelLo: 0.05 });
  const match = await A(() => {
    const S = window.__sungfluence, view = S.photoCanvas, W = view.width, H = view.height;
    const g = S.artGeom(1), ex = S.photoLayerCanvas(Math.max(g.W, g.H), { x: 0, y: 0, w: 1, h: 1 }, S.doc.photo, g.W, g.H).photo;
    const t = document.createElement('canvas'); t.width = W; t.height = H; const x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(ex, 0, 0, W, H);
    const a = view.getContext('2d').getImageData(0, 0, W, H).data, e = x.getImageData(0, 0, W, H).data;
    let d = 0; for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - e[i]) + Math.abs(a[i + 1] - e[i + 1]) + Math.abs(a[i + 2] - e[i + 2]);
    return { diff: d / (a.length / 4 * 3), view: W + 'x' + H, exp: g.W + 'x' + g.H };
  });
  check(match.diff < 5, 'the photo in the export looks like the preview', match.diff.toFixed(2) + ' levels apart, ' + match.view + ' vs ' + match.exp);
  await A(() => window.__sungfluence.resetPhoto()); await wait(p);

  // ---- no long freezes ----
  await A(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ type: 'longtask' }); });
  const longest = async (fn) => {
    await wait(p); await A(() => { window.__lt = []; });
    await A(fn); await wait(p);
    return Math.round(Math.max(0, ...(await A(() => window.__lt))));
  };
  await A(() => window.__sungfluence.runCommand('view.quality.full')); await wait(p);
  await A(() => window.__sungfluence.applyTextArt()); await wait(p);
  // started from a timer, so the work is a task of the page that the long-task observer sees
  const silOn = await longest(() => { setTimeout(() => window.__sungfluence.runCommand('image.silhouette'), 0); });
  check(silOn < LIMIT, 'turning the silhouette on stays under ' + LIMIT + ' ms', silOn + ' ms');
  check(await A(() => { const s = window.__sungfluence.src; let k = 0; for (let i = 0; i < s.lum.length; i++) if (s.lum[i] === 0 || s.lum[i] === 1) k++; return k === s.lum.length; }), 'the silhouette is two-tone');
  const silOff = await longest(() => { setTimeout(() => window.__sungfluence.runCommand('image.silhouette'), 0); });
  check(silOff < LIMIT, 'turning it off stays under ' + LIMIT + ' ms', silOff + ' ms');
  const size0 = await A(() => window.__sungfluence.imgSize);
  const rot = await longest(() => { setTimeout(() => window.__sungfluence.runCommand('image.rotateRight'), 0); });
  check(rot < LIMIT, 'rotating stays under ' + LIMIT + ' ms', rot + ' ms');
  const after = await A(() => { const S = window.__sungfluence; return { size: S.imgSize, base: [S.baseSrc.w, S.baseSrc.h], g: S.artGeom() }; });
  check(after.size[0] === size0[1] && after.base[0] < after.base[1] === size0[1] < size0[0], 'the photo and its copy turn together', after.size.join('x') + ', copy ' + after.base.join('x'));
  const flip = await longest(() => { setTimeout(() => window.__sungfluence.runCommand('image.flipH'), 0); });
  check(flip < LIMIT, 'flipping stays under ' + LIMIT + ' ms', flip + ' ms');
  const url = await A(() => { const S = window.__sungfluence; S.rotateImage(-1); return (S.projectData().image || '').slice(0, 11); });
  check(url === 'data:image/', 'a project saved right after turning the photo has the turned photo in it', url);
  await wait(p);
  const fast = await longest(() => { setTimeout(() => window.__sungfluence.runCommand('view.quality.fast'), 0); });
  const full = await longest(() => { setTimeout(() => window.__sungfluence.runCommand('view.quality.full'), 0); });
  check(Math.max(fast, full) < LIMIT, 'switching the preview quality stays under ' + LIMIT + ' ms', fast + ' / ' + full + ' ms');
  const crop = await longest(() => { setTimeout(() => window.__sungfluence.setTool('crop'), 0); });
  check(crop < LIMIT, 'opening the crop tool stays under ' + LIMIT + ' ms', crop + ' ms');
  await A(() => window.__sungfluence.setTool('hand')); await wait(p);
  const bg = await longest(() => { setTimeout(() => window.__sungfluence.runCommand('image.removeBg'), 0); });
  check(bg < LIMIT, 'removing the background stays under ' + LIMIT + ' ms', bg + ' ms');
  await A(() => window.__sungfluence.runCommand('image.autoTone')); await wait(p);
  const rst = await longest(() => { setTimeout(() => window.__sungfluence.runCommand('image.resetEffects'), 0); });
  check(rst < LIMIT, 'resetting the effects stays under ' + LIMIT + ' ms', rst + ' ms');
  console.log('     longest tasks (ms): silhouette ' + silOn + '/' + silOff + ', rotate ' + rot + ', flip ' + flip + ', crop ' + crop + ', background ' + bg + ', reset ' + rst);

  // ---- projects keep their photo settings ----
  await A(() => window.__sungfluence.useSample('face')); await wait(p);
  const saved = await A(() => { const S = window.__sungfluence; S.doc.photo.gamma = 1.23; S.doc.photo.clarity = 0.45; return JSON.parse(JSON.stringify(S.projectData())); });
  await A(() => window.__sungfluence.useSample('rocket')); await wait(p);
  await A((d) => window.__sungfluence.openProject(d), saved); await wait(p);
  const kept = await A(() => window.__sungfluence.doc.photo);
  check(kept.gamma === 1.23 && kept.clarity === 0.45 && kept.levelHi === saved.photo.levelHi, 'a project opens with its own photo settings, not new automatic ones', kept.gamma + ', ' + kept.clarity);

  // ---- locked text art: an edit made while the photo is read again is not lost ----
  await A(() => { const S = window.__sungfluence; S.applyTextArt(); }); await wait(p);
  const lk = await A(() => {
    const S = window.__sungfluence; S.lockText(true);
    window.__out0 = S.out;
    S.doc.photo.brightness = (S.doc.photo.brightness || 0) + 0.1; S.photoChanged('adjust');
    const busy = !!S.jobs.src;
    S.curLayer().textScale = 1.3; S.scheduleText(0);
    return busy;
  });
  await wait(p);
  const lkDone = await A(() => { const S = window.__sungfluence, r = S.out !== window.__out0 && S.out.layers.length > 0; S.lockText(false); return r; });
  check(lk && lkDone, 'with text art locked, a text edit made while the photo is busy still shows', 'photo busy: ' + lk);
  await wait(p);

  // ---- tracing right after a crop reads the cropped photo ----
  const tb = () => A(() => { const S = window.__sungfluence, P = S.doc.lines.paths.filter((q) => q.traced); return P.length ? S.pathsBounds(P) : null; });
  const tr0 = await A(() => {
    const S = window.__sungfluence; S.doc.lines.paths = [];
    S.doc.photo.crop = { x: 0.25, y: 0.2, w: 0.5, h: 0.6 }; S.photoChanged('crop');
    const busy = !!S.jobs.src;
    S.traceNow();
    return busy;
  });
  await wait(p);
  const tbNow = await tb();
  await A(() => window.__sungfluence.traceNow()); await wait(p);
  const tbLater = await tb();
  const [iwC, ihC] = await A(() => window.__sungfluence.imgSize);
  const tbSame = tbNow && tbLater && ['x', 'y', 'w', 'h'].every((k) => Math.abs(tbNow[k] - tbLater[k]) < 0.01 * Math.max(iwC, ihC));
  check(tr0 && tbSame, 'Trace lines right after a crop gives the same lines as a moment later', JSON.stringify([tbNow, tbLater].map((q) => q && [q.x, q.y, q.w, q.h].map(Math.round))));
  // and edge snapping does not use the old copy of the photo while the new one is being made
  const edgeBusy = await A(() => {
    const S = window.__sungfluence, [w, h] = S.imgSize, was = S.prefs.snap.edge; S.prefs.snap.edge = true;
    S.doc.photo.crop = { x: 0.2, y: 0.2, w: 0.6, h: 0.6 }; S.photoChanged('crop');
    const busy = !!S.jobs.src; let hit = 0;
    for (let i = 0; i < 200; i++) { S.snapAt(w * (0.2 + 0.6 * ((i * 37) % 200) / 200), h * (0.2 + 0.6 * ((i * 91) % 200) / 200), { p: { k: 1 }, noTrack: true }); if (S.snapHint && S.snapHint.kind === 'edge') hit++; }
    S.prefs.snap.edge = was;
    return { busy, hit };
  });
  check(edgeBusy.busy && edgeBusy.hit === 0, 'edges in the photo do not snap while the photo is being read again', JSON.stringify(edgeBusy));
  await wait(p);
  await A(() => { const S = window.__sungfluence; S.doc.photo.crop = null; S.doc.lines.paths = []; S.photoChanged('crop'); }); await wait(p);

  // ---- file names and an empty Vector layer ----
  check(await A(() => window.__sungfluence.safeStem('Square 2000×2000')) === 'Square-2000x2000', 'save names lose spaces and the × sign');
  check(await A(() => window.__sungfluence.safeStem('خودی کو.png')) === 'خودی-کو', 'save names keep letters in any script');
  await A(() => { const S = window.__sungfluence; S.doc.lines.paths = []; S.doc.objects = []; });
  let downloaded = false; p.once('download', () => { downloaded = true; });
  await A(() => window.__sungfluence.runExporter(window.__sungfluence.EXPORTERS.find((x) => x.id === 'svg-vector'), {}));
  await p.waitForTimeout(800);
  const toastText = await A(() => (document.querySelector('.toast') || {}).textContent || '');
  check(!downloaded && /empty/i.test(toastText), 'an empty Vector layer gives a message instead of an empty file', toastText.slice(0, 60));

  await p.screenshot({ path: __dirname + '/out/photo.png' });
  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all photo checks passed');
  process.exit(fails ? 1 : 0);
})();
