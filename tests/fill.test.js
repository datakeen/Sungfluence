// Letter fill: the photo seen through the letters, a soft photo, and letters cut out of a sheet.
// Checks the pixels inside and outside the letters, How much shows, exports (PNG, SVG, PDF),
// project files, mirrored text art, the T-shirt preview and that changing the softness never freezes.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(60); } await p.waitForTimeout(150); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; return window.__sungfluence.useSample('face'); }); await wait(p);
  // these checks use the big words of a plain Word cloud: a Halftone first, then the Word cloud with its own defaults
  await A(() => { window.__sungfluence.applyTextArt('halftone'); window.__sungfluence.setLayerStyle('cloud'); }); await wait(p);
  // white paper and black ink, so ink, photo and paper are easy to tell apart
  await A(() => { const S = window.__sungfluence; S.doc.out.paper = '#ffffff'; S.doc.out.transparent = false; Object.assign(S.curLayer(), { color: 'ink', inkColor: '#000000', textScale: 1.4 }); S.setView('text'); S.scheduleText(0); });
  await wait(p);

  // the panel has the section
  await A(() => { window.__sungfluence.ui.open.finish = true; window.__sungfluence.buildPanel(); });
  const sec = await A(() => [...document.querySelectorAll('#controls summary')].map((s) => s.textContent));
  check(sec.some((t) => /^Finish: letter fill/.test(t)), 'the shared settings have a Finish section with Letter fill', sec.join(', '));
  check(await A(() => window.__sungfluence.curLayer().letterFill) === 'ink', 'a new layer starts with ink colors');

  // a fill change only draws the letters again: same layout, so the masks line up
  const setFill = async (o) => { await A((o) => { const S = window.__sungfluence; Object.assign(S.curLayer(), o); S.redrawFill(0); }, o); await wait(p); };
  // inside: pixels where the ink letters are solid. outside: where there is no letter at all
  await A(() => {
    const S = window.__sungfluence, t = S.textCanvas, d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    const inside = [], outside = [];
    for (let i = 0; i < t.width * t.height; i += 7) { if (d[i * 4 + 3] === 255) inside.push(i); else if (d[i * 4 + 3] === 0) outside.push(i); }
    window.__mask = { inside, outside, w: t.width, h: t.height, items: S.out.layers[0].items.length };
  });
  // the photo as the letters see it, at the size of the text canvas
  const stats = (mode) => A((mode) => {
    const S = window.__sungfluence, t = S.textCanvas, M = window.__mask, g = S.artGeom();
    const ph = document.createElement('canvas'); ph.width = t.width; ph.height = t.height;
    const px = ph.getContext('2d'); px.drawImage(S.photoCanvas, g.m, g.m, g.W, g.H);
    const pd = px.getImageData(0, 0, ph.width, ph.height).data, d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    const art = S.canvas.getContext('2d').getImageData(0, 0, S.canvas.width, S.canvas.height).data;
    let dIn = 0, aIn = 0, aOut = 0, dark = 0, paperOut = 0;
    for (const i of M.inside) { aIn += d[i * 4 + 3]; dIn += Math.abs(d[i * 4] - pd[i * 4]) + Math.abs(d[i * 4 + 1] - pd[i * 4 + 1]) + Math.abs(d[i * 4 + 2] - pd[i * 4 + 2]); }
    for (const i of M.outside) { aOut += d[i * 4 + 3]; if (d[i * 4] < 40 && d[i * 4 + 1] < 40 && d[i * 4 + 2] < 40 && d[i * 4 + 3] > 250) dark++; if (art[i * 4] > 250 && art[i * 4 + 1] > 250 && art[i * 4 + 2] > 250) paperOut++; }
    return { diffIn: dIn / M.inside.length / 3, alphaIn: aIn / M.inside.length, alphaOut: aOut / M.outside.length, sheetOut: dark / M.outside.length, paperOut: paperOut / M.outside.length, n: M.inside.length, mode };
  }, mode);
  const ink = await stats('ink');
  check(ink.n > 500, 'there are letters to test', ink.n);
  await setFill({ letterFill: 'photo', fillShow: 1, fillPop: 0 });
  const ph = await stats('photo');
  check(await A(() => window.__sungfluence.out.layers[0].items.length === window.__mask.items), 'changing the fill keeps the letters where they are');
  check(ph.diffIn < 10 && ink.diffIn > ph.diffIn * 3, 'The photo: inside the letters are the photo colors', 'off by ' + ph.diffIn.toFixed(1) + ', ink was off by ' + ink.diffIn.toFixed(1));
  check(ph.alphaIn > 250 && ph.alphaOut < 1, 'The photo: the letters are solid and nothing shows outside them', ph.alphaIn.toFixed(0) + ' / ' + ph.alphaOut.toFixed(2));
  check(ph.paperOut > 0.99, 'The photo: outside the letters is the paper', (ph.paperOut * 100).toFixed(1) + '%');
  await p.locator('#art').screenshot({ path: __dirname + '/out/fill-photo.png' });

  await setFill({ letterFill: 'soft', fillSoft: 0.02 });
  const soft = await stats('soft');
  check(soft.diffIn > ph.diffIn + 2 && soft.diffIn < 40, 'A soft photo: the photo is there, blurred', 'off by ' + soft.diffIn.toFixed(1));
  await p.locator('#art').screenshot({ path: __dirname + '/out/fill-soft.png' });

  check(await A(() => window.__sungfluence.newLayer('rows').fillSheetSee > 0), 'a new layer starts with a sheet that lets a little of the photo through');
  await setFill({ letterFill: 'cut', fillSheet: '#101010', fillCutSoft: false, fillSheetSee: 0 });
  const cut = await stats('cut');
  check(cut.sheetOut > 0.99, 'Cut out: the sheet covers everything outside the letters', (cut.sheetOut * 100).toFixed(1) + '%');
  check(cut.diffIn < 10, 'Cut out: the photo shows through the holes', 'off by ' + cut.diffIn.toFixed(1));
  await p.locator('#art').screenshot({ path: __dirname + '/out/fill-cut.png' });
  await setFill({ fillShow: 0 });
  const cut0 = await stats('cut0');
  check(cut0.alphaIn < 1 && cut0.sheetOut > 0.99, 'Cut out at 0%: the holes show the ground, the sheet stays', cut0.alphaIn.toFixed(2));
  // the photo in the sheet, in a deep tone; the holes show the photo, a little brighter
  await setFill({ fillShow: 1, fillSheetSee: 0.85 });
  const cutSee = await stats('cutSee');
  check(cutSee.sheetOut < cut.sheetOut - 0.3 && cutSee.alphaOut > 250 && cutSee.diffIn < 25, 'Cut out, photo in the sheet: the photo shows in the sheet, and in the holes', 'solid sheet on ' + (cutSee.sheetOut * 100).toFixed(1) + '% outside the letters, holes off by ' + cutSee.diffIn.toFixed(1));
  await p.locator('#art').screenshot({ path: __dirname + '/out/fill-cut-see.png' });
  await setFill({ fillSheetSee: 0 });
  await setFill({ letterFill: 'photo', fillShow: 0 });
  const ph0 = await stats('photo0');
  check(ph0.alphaIn < 1 && ph0.paperOut > 0.99, 'How much shows at 0%: the letters let the paper through', ph0.alphaIn.toFixed(2));
  await setFill({ fillShow: 0.5 });
  const ph5 = await stats('photo50');
  check(Math.abs(ph5.alphaIn - 127.5) < 6, 'How much shows at 50%: the letters are half see-through', ph5.alphaIn.toFixed(0));
  await setFill({ fillShow: 1, fillPop: 0.3 });

  // the sharp redraw when zoomed in shows the fill too
  await A(() => window.__sungfluence.setZoom(4)); await p.waitForTimeout(800); await wait(p);
  const crisp = await A(() => {
    const c = document.getElementById('crisp'); if (c.hidden) return null;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let colored = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 13) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); if (mx < 250) { n++; if (mx - mn > 18) colored++; } }
    return n ? colored / n : 0;
  });
  check(crisp !== null && crisp > 0.2, 'the sharp zoomed redraw shows the photo in the letters', crisp === null ? 'not shown' : (crisp * 100).toFixed(0) + '% colored');
  await A(() => window.__sungfluence.setZoom('fit')); await p.waitForTimeout(300);

  // ---- exports ----
  const grab = async (id, opts) => {
    const dl = p.waitForEvent('download', { timeout: 120000 });
    await A(([id, opts]) => { const S = window.__sungfluence, x = S.EXPORTERS.find((e) => e.id === id); S.runExporter(x, Object.assign(S.exporterOpts(x), opts || {})); }, [id, opts]);
    const d = await dl; const f = path.join(__dirname, 'out', 'fill-' + d.suggestedFilename()); await d.saveAs(f); return f;
  };
  // PNG: at Full quality the preview is drawn at export size. The export lays the letters out again from a
  // larger copy of the photo, so the letters may sit a little differently; what they are filled with must be
  // the same picture the preview fills them with, pixel for pixel inside each letter.
  await A(() => window.__sungfluence.setQuality('full')); await wait(p);
  const same = async () => {
    const f = await grab('png-view');
    const b64 = fs.readFileSync(f).toString('base64');
    return A(async (b64) => {
      const S = window.__sungfluence, im = new Image();
      await new Promise((r) => { im.onload = r; im.src = 'data:image/png;base64,' + b64; });
      const a = S.canvas, w = a.width, h = a.height, g = S.artGeom();
      if (im.width !== w || im.height !== h) return { size: false };
      const t = document.createElement('canvas'); t.width = w; t.height = h; const x = t.getContext('2d'); x.drawImage(im, 0, 0);
      const e = x.getImageData(0, 0, w, h).data;
      const fp = document.createElement('canvas'); fp.width = w; fp.height = h; const fx = fp.getContext('2d');
      fx.fillStyle = '#fff'; fx.fillRect(0, 0, w, h); fx.drawImage(S.fillPreview(), g.m, g.m, g.W, g.H);
      const pv = fx.getImageData(0, 0, w, h).data, v = a.getContext('2d').getImageData(0, 0, w, h).data;
      const ink = (d, i) => d[i] < 225 || d[i + 1] < 225 || d[i + 2] < 225;
      // pixels well inside a letter: they and their neighbours two pixels away are all inked
      const diffIn = (d) => {
        let s = 0, n = 0;
        for (let y = 2; y < h - 2; y += 2) for (let X = 2; X < w - 2; X += 2) {
          const i = (y * w + X) * 4;
          if (!ink(d, i) || !ink(d, i - 8) || !ink(d, i + 8) || !ink(d, i - 8 * w) || !ink(d, i + 8 * w)) continue;
          s += Math.abs(d[i] - pv[i]) + Math.abs(d[i + 1] - pv[i + 1]) + Math.abs(d[i + 2] - pv[i + 2]); n++;
        }
        return { diff: s / Math.max(1, n) / 3, n };
      };
      return { size: true, png: diffIn(e), view: diffIn(v) };
    }, b64);
  };
  await setFill({ letterFill: 'photo', fillPop: 0.3 }); const sPh = await same();
  await setFill({ letterFill: 'soft', fillSoft: 0.015 }); const sSoft = await same();
  check(sPh.size && sSoft.size, 'the PNG has the size of the preview');
  check(sPh.png.n > 500 && sPh.png.diff < 6 && sPh.view.diff < 6, 'PNG: the letters hold the same photo as the preview', 'off by ' + sPh.png.diff.toFixed(2) + ', preview ' + sPh.view.diff.toFixed(2) + ', ' + sPh.png.n + ' pixels');
  check(sSoft.png.n > 500 && sSoft.png.diff < 6 && sSoft.view.diff < 6, 'PNG: the letters hold the same soft photo as the preview', 'off by ' + sSoft.png.diff.toFixed(2) + ', preview ' + sSoft.view.diff.toFixed(2));

  await setFill({ letterFill: 'photo' });
  let svg = fs.readFileSync(await grab('svg-art'), 'utf8');
  check(/<mask id="fill-1-letters"/.test(svg) && /mask="url\(#fill-1-letters\)"[^>]*><image /.test(svg) && /href="data:image\/(jpeg|png);base64,/.test(svg), 'SVG: the photo is an image masked by the letters');
  svg = fs.readFileSync(await grab('svg-view'), 'utf8');
  check(/<mask id="fill-1-letters"/.test(svg), 'SVG of the visible layers carries the mask as well');
  await setFill({ letterFill: 'cut' });
  svg = fs.readFileSync(await grab('svg-art'), 'utf8');
  check(/<mask id="fill-1-holes"/.test(svg) && /mask="url\(#fill-1-holes\)"/.test(svg), 'SVG: Cut out is a sheet with a mask of the letters');
  await setFill({ letterFill: 'photo' });
  const pdfText = (f) => { const buf = fs.readFileSync(f), s = buf.toString('latin1'); let all = s; const re = /stream\r?\n/g; let m; while ((m = re.exec(s))) { const end = s.indexOf('endstream', m.index); try { all += zlib.inflateSync(buf.subarray(m.index + m[0].length, end)).toString('latin1'); } catch (e) { /* not compressed */ } } return all; };
  let f = await grab('pdf-cmyk');
  let t = pdfText(f);
  check(t.slice(0, 4) === '%PDF' && /\/Subtype \/Image/.test(t), 'CMYK PDF: the filled layer goes in as a picture');
  f = await grab('pdf-print');
  check(fs.readFileSync(f).slice(0, 4).toString() === '%PDF' && fs.statSync(f).size > 20000, 'PDF for print works', Math.round(fs.statSync(f).size / 1000) + ' KB');
  // text-only exports ignore the fill
  f = await grab('txt-plain', { cols: 60, chars: 'ramp' });
  check(fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).length > 10, 'plain text still works with a filled layer');

  // ---- project files ----
  await setFill({ letterFill: 'soft', fillSoft: 0.03, fillShow: 0.8 });
  const rt = await A(async () => {
    const S = window.__sungfluence, data = JSON.parse(JSON.stringify(S.projectData()));
    S.curLayer().letterFill = 'ink';
    await S.openProject(data);
    const L = S.curLayer();
    const old = JSON.parse(JSON.stringify(data));
    old.text.layers.forEach((q) => { delete q.letterFill; delete q.fillShow; delete q.fillSoft; delete q.fillSheet; delete q.fillCutSoft; delete q.fillPop; });
    const now = { fill: L.letterFill, soft: L.fillSoft, show: L.fillShow };
    await S.openProject(old);
    return { now, old: S.curLayer().letterFill };
  });
  await wait(p);
  check(rt.now.fill === 'soft' && rt.now.soft === 0.03 && rt.now.show === 0.8, 'a project keeps the letter fill', JSON.stringify(rt.now));
  check(rt.old === 'ink', 'a project saved before letter fill opens with ink colors');

  // ---- mirrored text art ----
  await A(() => window.__sungfluence.setQuality('fast')); await wait(p);
  await A(() => { const S = window.__sungfluence; S.doc.text.flipX = true; Object.assign(S.curLayer(), { letterFill: 'photo', fillShow: 1, fillPop: 0 }); S.scheduleText(0); }); await wait(p);
  const mir = await A(() => {
    const S = window.__sungfluence, t = S.textCanvas, g = S.artGeom(), d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    const cmp = (flip) => {
      const ph = document.createElement('canvas'); ph.width = t.width; ph.height = t.height; const x = ph.getContext('2d');
      if (flip) x.setTransform(-1, 0, 0, 1, t.width, 0);
      x.drawImage(S.photoCanvas, g.m, g.m, g.W, g.H);
      const pd = x.getImageData(0, 0, t.width, t.height).data;
      let s = 0, n = 0;
      for (let i = 0; i < d.length; i += 28) if (d[i + 3] === 255) { s += Math.abs(d[i] - pd[i]) + Math.abs(d[i + 1] - pd[i + 1]) + Math.abs(d[i + 2] - pd[i + 2]); n++; }
      return s / Math.max(1, n) / 3;
    };
    return { mirrored: cmp(true), straight: cmp(false) };
  });
  check(mir.mirrored < 10 && mir.straight > mir.mirrored * 2, 'mirrored text art mirrors the photo in its letters too', mir.mirrored.toFixed(1) + ' vs ' + mir.straight.toFixed(1));
  await A(() => { const S = window.__sungfluence; S.doc.text.flipX = false; S.scheduleText(0); }); await wait(p);

  // ---- T-shirt preview ----
  const shirt = await A(() => {
    const S = window.__sungfluence; S.doc.out.mock = 'shirt'; S.compose();
    const t = S.textCanvas, a = S.canvas;
    if (a.width !== t.width) return { ok: false, why: a.width + ' vs ' + t.width };
    const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data, v = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
    let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 28) if (d[i + 3] === 255) { s += Math.abs(d[i] - v[i]) + Math.abs(d[i + 1] - v[i + 1]) + Math.abs(d[i + 2] - v[i + 2]); n++; }
    return { ok: true, diff: s / Math.max(1, n) / 3 };
  });
  check(shirt.ok && shirt.diff < 3, 'on the T-shirt the letters still show the photo', shirt.ok ? shirt.diff.toFixed(2) : shirt.why);
  await p.locator('#art').screenshot({ path: __dirname + '/out/fill-shirt.png' });
  await A(() => { const S = window.__sungfluence; S.doc.out.mock = 'artboard'; S.compose(); });

  // ---- no freezing while the softness slider moves ----
  await A(() => { const S = window.__sungfluence; S.curLayer().letterFill = 'soft'; S.ui.open.finish = true; S.buildPanel(); S.redrawFill(0); }); await wait(p);
  const lt = await A(async () => {
    const L = []; const ob = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration))));
    ob.observe({ entryTypes: ['longtask'] });
    const inp = document.getElementById('c-fillSoft');
    for (const v of [0.004, 0.008, 0.016, 0.025, 0.035, 0.05, 0.002, 0.012]) { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 160)); }
    await new Promise((res) => { const t = setInterval(() => { if (!Object.keys(window.__sungfluence.jobs).length) { clearInterval(t); res(); } }, 100); });
    ob.disconnect();
    return { lt: L.sort((a, b) => b - a).slice(0, 3), soft: window.__sungfluence.curLayer().fillSoft };
  });
  console.log('     longest tasks while moving Softness (ms):', lt.lt.join(', ') || 'none');
  check(lt.soft === 0.012, 'the Softness slider sets the softness');
  check(!lt.lt.length || lt.lt[0] < 220, 'moving Softness keeps the window alive (longest ' + (lt.lt[0] || 0) + ' ms)');

  // ---- the default sheet follows Printed on, and the Sheet picker shows the color drawn ----
  await A(() => { const S = window.__sungfluence; Object.assign(S.curLayer(), { letterFill: 'cut', fillSheet: null, fillCutSoft: false, fillShow: 1 }); S.doc.out.paper = '#ffffff'; S.doc.out.printedOn = 'dark'; S.ui.tab = 'text'; S.ui.open.finish = true; S.scheduleText(0); });
  await wait(p);
  const sheet = await A(() => {
    const S = window.__sungfluence, C = window.Sungfluence, o = S.out, L = o.layers[0]; S.buildPanel();
    const inp = document.getElementById('c-fillSheet'), t = S.textCanvas, d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
    let s = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 11) if (d[i + 3] === 255) { s += d[i]; n++; }
    return { cls: o.paperClass, drawn: C.sheetColorOf(L, o), shown: inp && inp.value, mean: s / Math.max(1, n), light: C.lightnessOf(C.sheetColorOf(L, o)) };
  });
  check(sheet.cls === 'dark' && sheet.light > 70 && sheet.mean > 150, 'Cut out on paper set to Dark by hand: the default sheet is light', sheet.drawn + ', drawn at ' + Math.round(sheet.mean));
  check(sheet.shown === sheet.drawn, 'the Sheet picker shows the color that is drawn', sheet.shown + ' vs ' + sheet.drawn);
  // the Sheet picker draws the letters again without a new layout, and the soft photo switch shows Softness
  const cheap = await A(async () => {
    const S = window.__sungfluence, o1 = S.out, sw = document.getElementById('c-fillSheet').closest('.swatches').querySelectorAll('.sw')[1];
    sw.click(); const pick = S.curLayer().fillSheet;
    await new Promise((r) => setTimeout(r, 400)); await new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); res(); } }, 50); });
    const r = { same: S.out === o1, pick };
    const sw2 = () => document.getElementById('c-fillCutSoft');
    r.before = !!document.getElementById('c-fillSoft'); sw2().click(); r.on = !!document.getElementById('c-fillSoft'); sw2().click(); r.off = !!document.getElementById('c-fillSoft');
    return r;
  });
  await wait(p);
  check(cheap.same && !!cheap.pick, 'picking a sheet color only draws the letters again, with no new layout', cheap.pick);
  check(!cheap.before && cheap.on && !cheap.off, 'Soft photo in the holes shows and hides Softness at once');
  await A(() => { const S = window.__sungfluence; S.doc.out.printedOn = 'auto'; S.curLayer().fillSheet = null; });
  // a chosen sheet color is drawn exactly as chosen, only the default sheet is fitted to the paper
  const live = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence;
    Object.assign(S.curLayer(), { letterFill: 'cut', fillSheet: '#f2efe6', colorFit: 'gentle' }); S.doc.out.paper = '#ffffff'; S.scheduleText(0);
    await new Promise((r) => setTimeout(r, 300)); await new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); res(); } }, 50); });
    const L = S.out.layers[0], r = { chosen: C.sheetColorOf(L, S.out), fitted: C.fitColor('#f2efe6', '#ffffff', 'light', 'gentle'), fit: !!L.__fit };
    S.curLayer().fillSheet = null;
    return r;
  });
  check(live.fit && live.chosen === '#f2efe6' && live.fitted !== '#f2efe6', 'Cut out: a chosen Sheet color is drawn as chosen, not fitted to the paper', live.chosen + ' (fitting would give ' + live.fitted + ')');
  // on gray paper the default sheet is whichever of the two stands further from the paper
  const graySheet = await A(() => {
    const C = window.Sungfluence, of = (g) => C.fillSheetOf({}, { paperClass: 'gray', ground: g });
    return { mid: of('#8a8a8a'), deep: of('#5a5a5a'), cls: [C.paperClassOf('#8a8a8a'), C.paperClassOf('#5a5a5a')] };
  });
  check(graySheet.cls.join() === 'gray,gray' && graySheet.mid === '#161616' && graySheet.deep === '#f2efe6', 'Cut out on gray paper: the default sheet is the one with more contrast', 'light gray ' + graySheet.mid + ', deep gray ' + graySheet.deep);
  // the ink picker falls back to the ink of Printed on, not to the paper color
  const pick = await A(() => {
    const S = window.__sungfluence, L = S.curLayer(), keep = [L.color, L.inkColor, L.letterFill], r = {};
    Object.assign(L, { color: 'ink', inkColor: null, letterFill: 'ink' }); S.doc.out.paper = '#ffffff'; S.ui.tab = 'text';
    S.doc.out.printedOn = 'dark'; S.buildPanel(); r.dark = (document.getElementById('c-inkColor') || {}).value;
    S.doc.out.printedOn = 'light'; S.buildPanel(); r.light = (document.getElementById('c-inkColor') || {}).value;
    S.doc.out.printedOn = 'auto'; [L.color, L.inkColor, L.letterFill] = keep; S.buildPanel();
    return r;
  });
  check(pick.dark === '#f2efe6' && pick.light === '#111111', 'the Ink picker shows a light ink when Printed on is Dark, even on white paper', pick.dark + ' / ' + pick.light);
  await wait(p);

  // ---- Output color reaches the filled letters: the photo and the sheet, in the preview and the exports ----
  const model = async (m, fill) => {
    await A(([m, fill]) => { const S = window.__sungfluence; S.doc.out.colorModel = m; Object.assign(S.curLayer(), { letterFill: fill, fillSheet: '#cc2222', fillPop: 0.3 }); S.scheduleText(0); }, [m, fill]);
    await wait(p);
    return A(() => {
      const S = window.__sungfluence, C = window.Sungfluence, pic = S.fillPreview(), d = pic.getContext('2d').getImageData(0, 0, pic.width, pic.height).data;
      const t = S.textCanvas, e = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
      const ansi = new Set(['000000', 'aa0000', '00aa00', 'aa5500', '0000aa', 'aa00aa', '00aaaa', 'aaaaaa', '555555', 'ff5555', '55ff55', 'ffff55', '5555ff', 'ff55ff', '55ffff', 'ffffff']);
      const hx = (q, i) => [q[i], q[i + 1], q[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      let colored = 0, notBW = 0, notAnsi = 0, n = 0, tc = 0, tn = 0;
      for (let i = 0; i < d.length; i += 4 * 17) { if (d[i + 3] < 255) continue; n++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 3) colored++; if ((d[i] !== 0 && d[i] !== 255) || colored && 0) notBW += (d[i] > 3 && d[i] < 252) ? 1 : 0; if (!ansi.has(hx(d, i))) notAnsi++; }
      for (let i = 0; i < e.length; i += 4 * 17) { if (e[i + 3] < 255) continue; tn++; if (Math.max(e[i], e[i + 1], e[i + 2]) - Math.min(e[i], e[i + 1], e[i + 2]) > 6) tc++; }
      const sh = C.sheetColorOf(S.out.layers[0], S.out);
      return { colored: colored / n, notBW: notBW / n, notAnsi: notAnsi / n, textColored: tc / Math.max(1, tn), sheet: sh, n };
    });
  };
  const mGray = await model('gray', 'cut');
  check(mGray.colored < 0.01 && mGray.textColored < 0.01, 'Output color Gray: the photo in the letters and the sheet are gray', Math.round(mGray.colored * 100) + '% colored in the picture, ' + Math.round(mGray.textColored * 100) + '% in the letters');
  check(/^#([0-9a-f]{2})\1\1$/.test(mGray.sheet), 'and the sheet color is mapped to gray', mGray.sheet);
  const pngGray = fs.readFileSync(await grab('png-view'));
  const pngColored = await A(async (b64) => {
    const im = new Image(); await new Promise((r) => { im.onload = r; im.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let k = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 13) { n++; if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 6) k++; }
    return k / n;
  }, pngGray.toString('base64'));
  check(pngColored < 0.01, 'the PNG export in Gray has no color in the filled letters either', Math.round(pngColored * 100) + '% colored');
  const mBW = await model('bw', 'photo');
  check(mBW.notBW < 0.02, 'Output color B/W: the photo in the letters is black and white', Math.round(mBW.notBW * 100) + '% in between');
  const mAnsi = await model('ansi', 'photo');
  check(mAnsi.notAnsi < 0.01, 'Output color 16 colors: the photo in the letters uses the 16 colors', Math.round(mAnsi.notAnsi * 100) + '% other colors');
  const mCmyk = await model('cmyk', 'photo');
  const mRgb = await model('rgb', 'photo');
  check(mCmyk.colored > 0.05 && mRgb.colored > 0.05 && mCmyk.n > 100, 'CMYK proof and RGB keep the photo in color');
  await A(() => { const S = window.__sungfluence; S.curLayer().fillSheet = null; });

  // ---- the CMYK PDF fills its letters with a photo at print size, and a stopped job does not hang ----
  const fsz = await A(() => {
    const S = window.__sungfluence, g = S.fullGen(null, null, S.pdfFillScale); let r; while (!(r = g.next()).done);
    const o = r.value.out, L = o.layers.find(window.Sungfluence.fillOn), c = r.value.fill(L);
    return { w: c.width, want: Math.min(6000, Math.round((o.W - 2 * (o.margin || 0)) * S.pdfFillScale(o))), oW: o.W };
  });
  check(fsz.w > fsz.oW && Math.abs(fsz.w - fsz.want) <= 2, 'CMYK PDF: the photo in the letters is made at print size, not at 1600 px', fsz.w + ' px, want ' + fsz.want + ', layout ' + fsz.oW);
  const stopped = await A(() => new Promise((res) => {
    const S = window.__sungfluence, j = S.runJob('t-stop', (function* () { for (;;) yield {}; })(), () => res('done'), () => res('failed'), () => res('stopped'));
    setTimeout(() => { j.cancelled = true; }, 60); setTimeout(() => res('hung'), 3000);
  }));
  check(stopped === 'stopped', 'a stopped job tells the export that waits on it', stopped);
  // a CMYK PDF whose filled layer fails says so once, not twice
  const fails1 = await A(() => new Promise((res) => {
    const S = window.__sungfluence, t = document.getElementById('toast'), seen = [];
    const ob = new MutationObserver(() => { const m = t.textContent; if (!t.hidden && m && seen[seen.length - 1] !== m) seen.push(m); });
    ob.observe(t, { childList: true, subtree: true, characterData: true, attributes: true });
    S.runExport(null, (r) => S.cmykPDF(r.out, () => { throw new Error('test failure'); }), null, S.pdfFillScale);
    setTimeout(() => { ob.disconnect(); res(seen); }, 5000);
  }));
  check(fails1.length === 1, 'a failed CMYK fill shows one message, not two', fails1.join(' | ') || 'none');
  // the picture goes into the PDF as PNG bytes from toBlob, which this jsPDF reads, with its clear parts kept
  const bytesOk = await A(async () => {
    const S = window.__sungfluence; await S.jsPDFReady();
    const c = document.createElement('canvas'); c.width = 40; c.height = 30; const x = c.getContext('2d'); x.fillStyle = 'rgba(200,30,30,0.5)'; x.fillRect(5, 5, 20, 10);
    const b = await new Promise((r) => c.toBlob(r, 'image/png')), u = new Uint8Array(await b.arrayBuffer());
    try { const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: [100, 100] }); pdf.addImage(u, 'PNG', 0, 0, 40, 30); return /\/SMask/.test(pdf.output()); } catch (e) { return 'threw ' + e.message; }
  });
  check(bytesOk === true, 'jsPDF takes the PNG bytes of the fill picture and keeps its transparency', String(bytesOk));
  // the CMYK proof of the photo in the letters uses the color table, and no step of it holds the page long
  const mp = await A(() => {
    const S = window.__sungfluence, c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 3000, 2000); gr.addColorStop(0, '#ff2200'); gr.addColorStop(0.5, '#22cc88'); gr.addColorStop(1, '#2233ff'); x.fillStyle = gr; x.fillRect(0, 0, 3000, 2000);
    const r = {};
    for (const m of ['cmyk', 'gray']) {
      const g = S.modelPhotoGen(c, m), all0 = performance.now(); let worst = 0, steps = 0, q;
      do { const t0 = performance.now(); q = g.next(); worst = Math.max(worst, performance.now() - t0); steps++; } while (!q.done);
      r[m] = { worst: Math.round(worst), steps, all: Math.round(performance.now() - all0) };
    }
    return r;
  });
  check(mp.cmyk.worst < 220 && mp.cmyk.all < 4000, 'CMYK proof of a 6 MP photo in the letters: no step over 220 ms', 'longest ' + mp.cmyk.worst + ' ms, all ' + mp.cmyk.all + ' ms in ' + mp.cmyk.steps + ' steps');
  check(mp.gray.worst < 220 && mp.gray.steps > 1, 'Gray on a large photo is drawn in bands, each under 220 ms', 'longest ' + mp.gray.worst + ' ms in ' + mp.gray.steps + ' steps');

  // ---- SVG: letter opacity and the Outline effect reach the mask ----
  const svgM = await A(() => {
    const C = window.Sungfluence, it = (a) => ({ t: 'text', s: 'A', x: 20, y: 20, size: 30, weight: 700, font: 'sans', fill: '#000000', a });
    const o = { W: 100, H: 60, paper: '#ffffff', layers: [{ items: [it(0.5), it(1)], opacity: 1, blend: 'source-over', mode: 'rows', effect: 'outline', letterFill: 'cut', fillShow: 1 }] };
    return C.toSVG(o, null, { fillHref: () => 'data:image/png;base64,AAAA' });
  });
  const lettersMask = (/<mask id="fill-1-letters"[\s\S]*?<\/mask>/.exec(svgM) || [''])[0], holesMask = (/<mask id="fill-1-holes"[\s\S]*?<\/mask>/.exec(svgM) || [''])[0];
  check(/maskUnits="userSpaceOnUse"/.test(lettersMask) && /stroke="#ffffff"/.test(lettersMask) && /fill="none"/.test(lettersMask), 'SVG: with Outline the photo shows in the outlines, as on the canvas');
  check(/stroke-opacity="0.5"/.test(lettersMask) && /stroke-opacity="0.5"/.test(holesMask) && /stroke="#000000"/.test(holesMask), 'SVG: a half see-through letter is half see-through in the masks');
  const svgSee = await A(() => {
    const C = window.Sungfluence, it = { t: 'text', s: 'A', x: 20, y: 20, size: 30, weight: 700, font: 'sans', fill: '#000000' };
    return C.toSVG({ W: 100, H: 60, paper: '#ffffff', layers: [{ items: [it], opacity: 1, blend: 'source-over', mode: 'rows', effect: 'none', letterFill: 'cut', fillShow: 1, fillSheetSee: 0.4 }] }, null, { fillHref: () => 'data:image/png;base64,AAAA' });
  });
  check(/<g mask="url\(#fill-1-holes\)"><image [^>]*\/><rect [^>]*fill-opacity="0.6"/.test(svgSee.replace(/\n/g, '')), 'SVG: a see-through sheet carries the photo under it, as on the canvas');
  // with the app's sheet picture (the photo in a deep tone), the SVG carries that picture as the sheet
  const svgTone = await A(() => {
    const C = window.Sungfluence, it = { t: 'text', s: 'A', x: 20, y: 20, size: 30, weight: 700, font: 'sans', fill: '#000000' };
    return C.toSVG({ W: 100, H: 60, paper: '#ffffff', layers: [{ items: [it], opacity: 1, blend: 'source-over', mode: 'rows', effect: 'none', letterFill: 'cut', fillShow: 1, fillSheetSee: 0.85 }] }, null, { fillHref: () => 'data:image/png;base64,AAAA', sheetHref: () => 'data:image/jpeg;base64,BBBB' });
  });
  check(/<g mask="url\(#fill-1-holes\)"><rect [^>]*\/><image [^>]*href="data:image\/jpeg;base64,BBBB"/.test(svgTone.replace(/\n/g, '')), 'SVG: the sheet with the photo in a deep tone, as on the canvas');

  // every style takes a fill, plugins included
  const styles = await A(async () => {
    const S = window.__sungfluence, bad = [];
    for (const k of Object.keys(S.MODES).filter((m) => m !== 'paths')) {
      S.setLayerStyle(k); Object.assign(S.curLayer(), { letterFill: 'photo', fillShow: 1 }); S.scheduleText(0);
      await new Promise((r) => setTimeout(r, 300));
      await new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); res(); } }, 80); });
      if (S.curLayer().letterFill !== 'photo' || (S.out && S.out.layers[0] && S.out.layers[0].letterFill !== 'photo')) bad.push(k);
    }
    return bad;
  });
  check(!styles.length, 'the fill is kept in every style, plugins too', styles.join(', ') || 'all');

  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all letter fill checks passed');
  process.exit(fails ? 1 : 0);
})();
