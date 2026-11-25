// The Vector layer: text to outlines and centerlines, groups, the Distort tool, gradient fills,
// words inside vector shapes, and the Vector layer in SVG, PDF and project files.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const OUT = __dirname + '/out'; fs.mkdirSync(OUT, { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(60); } await p.waitForTimeout(150); };
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
  const shot = async (name) => { const url = await A(() => window.__sungfluence.canvas.toDataURL('image/png')); fs.writeFileSync(OUT + '/' + name + '.png', Buffer.from(url.split(',')[1], 'base64')); };
  await A(() => { const S = window.__sungfluence; S.prefs.reveal = 'none'; return S.useSample('coffee'); }); await wait(p);
  await A(() => document.fonts.ready);
  // long tasks, to check that no step freezes the window
  await A(() => { window.__long = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ entryTypes: ['longtask'] }); });
  const longest = async () => { const v = await A(() => { const m = Math.max(0, ...window.__long); window.__long = []; return Math.round(m); }); return v; };
  await A(() => { const S = window.__sungfluence; S.doc.photo.visible = false; S.doc.out.paper = '#fbf7f0'; S.compose(); });
  const addText = (o) => A((o) => {
    const S = window.__sungfluence; S.ui.objLayer = 'lines'; S.quickAdd('text', o);
    const [iw, ih] = S.imgSize, t = S.selectedObjs()[0]; t.x = (iw - t.w) / 2; t.y = (ih - t.h) / 2; Object.assign(t, o.extra || {}); S.linesChanged();
    return { id: t.id, x: t.x, y: t.y, w: t.w, h: t.h };
  }, o);
  // the color on the artwork at an image point
  const pix = (x, y) => A(([x, y]) => { const S = window.__sungfluence, [ax, ay] = S.img2art(x, y); return Array.from(S.canvas.getContext('2d').getImageData(Math.round(ax), Math.round(ay), 1, 1).data); }, [x, y]);
  const lum = (c) => (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11);
  const clearLines = () => A(() => { const S = window.__sungfluence; S.doc.lines.paths = []; S.doc.objects = S.doc.objects.filter((o) => o.layer === 'photo'); S.ui.selObjs = []; S.setPathSel([]); S.linesChanged(); });

  // ---- 1. outlines ----
  await addText({ text: 'Coffee', font: 'serif', weight: 900, size: 260 });
  await A(() => { window.__sungfluence.ui.vec.fit = false; window.__sungfluence.commitHistory(); });
  await shot('v01-text');
  await longest();
  check(await A(() => window.__sungfluence.runCommand('vector.toOutlines')), 'Convert text to outlines runs from the Object menu command');
  await wait(p);
  const long1 = await longest();
  const o1 = await A(() => { const S = window.__sungfluence, P = S.doc.lines.paths; return { n: P.length, closed: P.filter((q) => q.closed).length, groups: new Set(P.map((q) => q.group)).size, texts: S.doc.objects.filter((o) => o.type === 'text').length, sel: S.selectedPathIds().length, rule: P[0] && P[0].fillRule }; });
  check(o1.closed >= 7 && o1.closed === o1.n, 'Coffee becomes closed outlines', o1.n);
  check(o1.groups === 1 && o1.sel === o1.n, 'all outlines are one group, and it is selected');
  check(o1.texts === 0, 'the text object is replaced');
  check(o1.rule === 'evenodd', 'outlines fill even-odd');
  await shot('v02-outlines');
  // even-odd: a contour inside another (the hole of an o or e) is paper, the letter around it is ink
  const holes = await A(() => {
    const S = window.__sungfluence, P = S.doc.lines.paths, bb = P.map((q) => S.pathsBounds([q]));
    const out = [];
    bb.forEach((B, i) => bb.forEach((O, j) => { if (i !== j && B.x > O.x && B.y > O.y && B.x + B.w < O.x + O.w && B.y + B.h < O.y + O.h && B.w > 8) out.push({ hole: [B.x + B.w / 2, B.y + B.h / 2], ink: [(O.x + B.x) / 2, B.y + B.h / 2] }); }));
    return out;
  });
  let holeOK = holes.length > 0, inkOK = holes.length > 0;
  for (const h of holes.slice(0, 3)) { if (lum(await pix(...h.hole)) < 200) holeOK = false; if (lum(await pix(...h.ink)) > 190) inkOK = false; }
  check(holeOK, 'the holes of the letters stay open', holes.length + ' holes');
  check(inkOK, 'the letters around the holes are filled');
  await A(() => window.__sungfluence.undo()); await wait(p);
  const u1 = await A(() => { const S = window.__sungfluence; return { paths: S.doc.lines.paths.length, texts: S.doc.objects.filter((o) => o.type === 'text').length }; });
  check(u1.paths === 0 && u1.texts === 1, 'one undo brings the text back');
  await A(() => window.__sungfluence.redo()); await wait(p);
  check(await A(() => window.__sungfluence.doc.lines.paths.length) === o1.n, 'redo turns it into outlines again');

  // ---- 4. gradients on the outlines ----
  await A(() => { const S = window.__sungfluence; S.setFill(S.doc.lines.paths, { type: 'linear', angle: 90, stops: [[0, '#000000'], [1, '#ffffff']] }); S.linesChanged(); });
  const stem = await A(() => { const S = window.__sungfluence, P = S.doc.lines.paths, B = S.pathsBounds(P); return B; });
  // the first letter, C, has ink near its left edge at the middle height; compare top and bottom of the whole group instead
  const gt = await A(() => {
    const S = window.__sungfluence, P = S.doc.lines.paths, B = S.pathsBounds(P), c = S.canvas.getContext('2d');
    // the darkest and the lightest ink found in the top and bottom fifth of the letters
    const band = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y += 3) for (let x = B.x; x < B.x + B.w; x += 3) { const [ax, ay] = S.img2art(x, y); const d = c.getImageData(Math.round(ax), Math.round(ay), 1, 1).data; if (Math.abs(d[0] - 251) + Math.abs(d[2] - 240) > 12) { s += d[0]; n++; } } return n ? s / n : -1; };
    return { top: band(B.y + B.h * 0.05, B.y + B.h * 0.25), bottom: band(B.y + B.h * 0.75, B.y + B.h * 0.95) };
  });
  check(gt.top >= 0 && gt.bottom > gt.top + 60, 'a linear gradient goes from dark at the top to light at the bottom', Math.round(gt.top) + ' to ' + Math.round(gt.bottom));
  const svg = await A(() => window.__sungfluence.vectorSVG());
  check(/<linearGradient id="vg\d+" gradientUnits="userSpaceOnUse"/.test(svg) && /fill-rule="evenodd"/.test(svg) && (svg.match(/<path /g) || []).length === 1, 'the SVG has one compound path with its gradient and even-odd holes');
  fs.writeFileSync(OUT + '/v03-outline-gradient.svg', svg);
  await A(() => { const S = window.__sungfluence; S.setFill(S.doc.lines.paths, { type: 'radial', cx: 0, cy: 0, r: 1, stops: [[0, '#ffd166'], [1, '#c8553d']] }); S.linesChanged(); });
  check(/<radialGradient /.test(await A(() => window.__sungfluence.vectorSVG())), 'radial gradients go into the SVG too');
  await A(() => { const S = window.__sungfluence; S.setFill(S.doc.lines.paths, { type: 'linear', angle: 90, stops: [[0, '#6f3b1f'], [0.55, '#c8553d'], [1, '#e8a33d']] }); S.linesChanged(); });
  await shot('v04-outline-ember');

  // ---- 6. distort ----
  const before = await A(() => { const S = window.__sungfluence; return JSON.stringify(S.doc.lines.paths.map((q) => q.nodes)); });
  const dist = await A(() => {
    const S = window.__sungfluence, P = S.doc.lines.paths, B = S.pathsBounds(P), px = B.x + B.w / 2, py = B.y + B.h / 2, R = B.w * 0.6;
    const n0 = P.reduce((a, q) => a + q.nodes.length, 0);
    const far = (list) => Math.max(...list.map((q) => Math.max(...q.nodes.map((n) => Math.hypot(n.x - px, n.y - py)))));
    const f0 = far(P);
    const copy = JSON.parse(JSON.stringify(P));
    S.distortPaths(copy, 'twist', { px, py, R, amt: 0.5 });
    const n1 = copy.reduce((a, q) => a + q.nodes.length, 0);
    const bul = JSON.parse(JSON.stringify(P)); S.distortPaths(bul, 'bulge', { px, py, R, amt: -0.9 });
    const arc = JSON.parse(JSON.stringify(P)); S.distortPaths(arc, 'arc', { px, py, R, amt: 1.2 });
    const st = JSON.parse(JSON.stringify(P)); S.distortPaths(st, 'stretch', { px, py, R, amt: 1, angle: 30, taper: true });
    const nan = (l) => l.some((q) => q.nodes.some((n) => ['x', 'y', 'ix', 'iy', 'ox', 'oy'].some((k) => !Number.isFinite(n[k]))));
    return { n0, n1, f0, f1: far(copy), nan: nan(copy) || nan(bul) || nan(arc) || nan(st) };
  });
  check(dist.n1 >= dist.n0, 'distorting adds points where it needs them', dist.n0 + ' to ' + dist.n1);
  check(Math.abs(dist.f1 - dist.f0) < dist.f0 * 0.01, 'a twist keeps every point at its distance from the center');
  check(!dist.nan, 'bulge, pinch at -90%, twist, stretch and arc never make a broken point');
  // the tool itself: drag on the canvas, one undo step
  await A(() => { const S = window.__sungfluence; S.commitHistory(); S.setTool('distort'); const D = S.ui.distort; D.op = 'twist'; D.key = ''; S.buildPanel(); });
  const drag = await A(() => { const S = window.__sungfluence, D = S.ui.distort; S.distortTargets(); S.setTool('distort'); const a = S.toScreen(D.px + D.R * 0.5, D.py), b = S.toScreen(D.px, D.py + D.R * 0.5); return { a, b }; });
  await p.mouse.move(drag.a[0], drag.a[1]); await p.mouse.down();
  for (let i = 1; i <= 8; i++) { const t = i / 8 * Math.PI / 2; await p.mouse.move(drag.a[0] + (drag.b[0] - drag.a[0]) * Math.sin(t), drag.a[1] + (drag.b[1] - drag.a[1]) * Math.sin(t)); }
  await p.mouse.up(); await wait(p); await p.waitForTimeout(600);
  const twisted = await A(() => ({ amt: window.__sungfluence.ui.distort.amt, j: JSON.stringify(window.__sungfluence.doc.lines.paths.map((q) => q.nodes)) }));
  check(twisted.j !== before && Math.abs(twisted.amt) > 0.1, 'dragging with the Distort tool twists the letters', 'amount ' + twisted.amt);
  await shot('v05-twist');
  await A(() => window.__sungfluence.undo()); await wait(p);
  check(await A(() => JSON.stringify(window.__sungfluence.doc.lines.paths.map((q) => q.nodes))) === before, 'one undo returns the exact points from before the drag');
  // an arc, then a bulge, for the picture
  await A(() => { const S = window.__sungfluence, D = S.ui.distort; D.op = 'arc'; D.key = ''; D.amt = 0.55; const l = S.distortTargets(); S.distortSession(l, true); const B = S.pathsBounds(l); Object.assign(D, { px: B.x + B.w / 2, py: B.y + B.h / 2, R: B.w / 2, key: l.map((q) => q.id).join(',') }); S.distortApply(true); });
  await A(() => { const S = window.__sungfluence, D = S.ui.distort, l = S.distortTargets(), B = S.pathsBounds(l); Object.assign(D, { op: 'bulge', amt: 0.5, px: B.x + B.w / 2, py: B.y + B.h / 2, R: B.w * 0.45 }); S.distortSession(l, true); S.distortApply(true); });
  await wait(p);
  await shot('v06-arc-bulge');

  // ---- 7. words inside the vector shapes ----
  await A(() => window.__sungfluence.setTool('select'));
  await longest();
  await A(() => window.__sungfluence.runCommand('vector.wordsInShapes')); await wait(p);
  const cloud = await A(() => {
    const S = window.__sungfluence, o = S.out, L = S.curLayer(), [iw, ih] = S.imgSize, k = o.W / iw;
    const c = document.createElement('canvas').getContext('2d'), path = new Path2D();
    S.doc.lines.paths.forEach((q) => { const pts = []; const N = q.nodes; for (let i = 0; i < N.length; i++) { const a = N[i], b2 = N[(i + 1) % N.length]; for (let t = 0; t < 1; t += 0.1) { const u = 1 - t; pts.push([u * u * u * a.x + 3 * u * u * t * (a.x + a.ox) + 3 * u * t * t * (b2.x + b2.ix) + t * t * t * b2.x, u * u * u * a.y + 3 * u * u * t * (a.y + a.oy) + 3 * u * t * t * (b2.y + b2.iy) + t * t * t * b2.y]); } } pts.forEach(([x, y], i) => (i ? path.lineTo(x * k, y * k) : path.moveTo(x * k, y * k))); path.closePath(); });
    const it = o.layers[0].items.filter((q) => q.t === 'text');
    const inside = it.filter((q) => c.isPointInPath(path, q.x, q.y, 'evenodd')).length;
    return { mode: L.mode, src: L.maskSource, n: it.length, inside };
  });
  check(cloud.mode === 'cloud' && cloud.src === 'vector', 'Fill the shapes with words makes a Word cloud shaped by the vector shapes');
  check(cloud.n > 40 && cloud.inside >= cloud.n * 0.95, 'the words sit inside the letters', cloud.inside + ' of ' + cloud.n);
  const long7 = await longest();
  await shot('v07-words-in-shapes');
  check(await A(() => window.__sungfluence.MODES.calligram.controls[0].options.some((o) => o[0] === 'vector')), 'Calligram can use the vector shapes too');
  // the words follow the shapes when they move, also while the text art reads the photo
  const wordsX = () => A(() => { const it = window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text'); return it.reduce((s, q) => s + q.x, 0) / it.length; });
  const shiftShapes = (dx) => A((dx) => { const S = window.__sungfluence; S.doc.text.source = 'photo'; S.doc.lines.paths.forEach((q) => q.nodes.forEach((n) => { n.x += dx; })); S.linesChanged(); }, dx);
  const wx0 = await wordsX(), wk = await A(() => window.__sungfluence.out.W / window.__sungfluence.imgSize[0]);
  await shiftShapes(120); await p.waitForTimeout(400); await wait(p);
  const wx1 = await wordsX();
  check(wx1 - wx0 > 80 * wk, 'moving the shapes moves the words in them', ((wx1 - wx0) / wk).toFixed(0) + ' image px');
  await shiftShapes(-120); await p.waitForTimeout(400); await wait(p);

  // ---- PDF ----
  const grab = async (id) => {
    const dl = p.waitForEvent('download', { timeout: 90000 });
    await A((id) => { const S = window.__sungfluence, x = S.EXPORTERS.find((e) => e.id === id); S.runExporter(x, S.exporterOpts(x)); }, id);
    const d = await dl; const f = path.join(OUT, 'v-' + d.suggestedFilename()); await d.saveAs(f); return f;
  };
  const pdfText = (f) => { const buf = fs.readFileSync(f), s = buf.toString('latin1'); let all = s; const re = /stream\r?\n/g; let m; while ((m = re.exec(s))) { const end = s.indexOf('endstream', m.index); try { all += zlib.inflateSync(buf.subarray(m.index + m[0].length, end)).toString('latin1'); } catch (e) { /* not compressed */ } } return all; };
  const cm = pdfText(await grab('pdf-cmyk'));
  check(/(^|\s)W\*?\s+n\s/.test(cm) && (cm.match(/ c\n/g) || []).length > 50, 'the CMYK PDF has the vector letters as curves, with the gradient clipped to them');
  // text art mirrored over the Vector layer: the shapes under the letters stay the right way round, with no wrong warning
  const pdfStreams = (f) => { const buf = fs.readFileSync(f), s = buf.toString('latin1'); let all = ''; const re = /stream\r?\n/g; let m; while ((m = re.exec(s))) { const end = s.indexOf('endstream', m.index); try { all += zlib.inflateSync(buf.subarray(m.index + m[0].length, end)).toString('latin1'); } catch (e) { /* not compressed */ } } return all; };
  await A(() => { const S = window.__sungfluence, o = S.doc.order.filter((k) => k !== 'lines'); o.splice(o.indexOf('text') + 1, 0, 'lines'); window.__order0 = S.doc.order.slice(); S.doc.order = o; S.doc.text.flipX = true; document.getElementById('toast').textContent = ''; S.compose(); });
  const mir = pdfStreams(await grab('pdf-cmyk'));
  const mirToast = await A(() => document.getElementById('toast').textContent);
  const iMir = mir.search(/q -1 0 0 1 [\d.]+ 0 cm/), iCurve = mir.indexOf(' c\n');
  check(iMir > 0 && iCurve >= 0 && iCurve < iMir, 'a mirrored CMYK PDF draws the Vector layer under the letters before the mirror starts', 'curves at ' + iCurve + ', mirror at ' + iMir);
  check(!/cannot mirror/.test(mirToast), 'a mirror that worked gives no warning', mirToast.slice(0, 60));
  await A(() => { const S = window.__sungfluence; S.doc.order = window.__order0; S.doc.text.flipX = false; S.compose(); });
  const pr = await grab('pdf-print');
  check(fs.statSync(pr).size > 10000, 'the PDF for print is made');
  const wv = await A(() => { const S = window.__sungfluence, c = document.createElement('canvas'); c.width = 800; c.height = Math.round(800 * S.artGeom(1).TH / S.artGeom(1).TW); const r = S.withVector(c), x = r.getContext('2d'); const d = x.getImageData(0, 0, r.width, r.height).data; let ink = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 200 && d[i + 3] > 200) ink++; return ink; });
  check(wv > 1000, 'the PDF for print draws the Vector layer with the letters', wv + ' px');

  // ---- project files ----
  const proj = await A(() => { const S = window.__sungfluence; const d = JSON.parse(JSON.stringify(S.projectData())); return d; });
  await A(() => window.__sungfluence.doc.lines.paths = []);
  await A((d) => window.__sungfluence.openProject(d), proj); await wait(p);
  const re = await A(() => { const P = window.__sungfluence.doc.lines.paths; return { n: P.length, g: new Set(P.map((q) => q.group)).size, fill: P[0] && P[0].fill, fo: P.every((q) => q.fillOnly), rule: P[0] && P[0].fillRule }; });
  check(re.n === proj.lines.paths.length && re.g === 1 && re.fill && re.fill.type === 'linear' && re.fo && re.rule === 'evenodd', 'a saved project brings back the outlines, their group and their gradient');

  // ---- 5. fill without a stroke, and old projects ----
  // Fill the shapes with words may have picked a dark paper for the photo; these checks read the colors on light paper
  await A(() => { const S = window.__sungfluence; S.doc.text.visible = false; S.doc.out.paper = '#fbf7f0'; });
  await clearLines();
  const sq = (x, y, s, extra) => Object.assign({ id: Math.floor(Math.random() * 1e9), closed: true, width: 8, text: '', traced: false, nodes: [[x, y], [x + s, y], [x + s, y + s], [x, y + s]].map(([a, b2]) => ({ x: a, y: b2, ix: 0, iy: 0, ox: 0, oy: 0 })) }, extra);
  await A(([a, b2]) => { const S = window.__sungfluence; S.doc.lines.paths.push(a, b2); S.linesChanged(); }, [sq(100, 100, 200, { fill: '#c8553d', fillOnly: true, stroke: null }), sq(400, 100, 200, { fill: '#c8553d', stroke: null })]);
  await wait(p);
  const f1 = await pix(200, 200), f2 = await pix(500, 200);
  check(Math.abs(f1[0] - 200) < 12 && f1[1] < 100, 'a fill shows without a stroke', f1.slice(0, 3).join(','));
  check(lum(f2) > 230, 'an old line with a fill but no stroke still shows nothing, as before', f2.slice(0, 3).join(','));
  await shot('v08-fill-only');

  // ---- 9. groups and the commands ----
  await clearLines();
  await A(() => { const S = window.__sungfluence; S.setTool('select'); S.ui.objLayer = 'lines'; S.quickAdd('rect'); S.quickAdd('ellipse'); });
  await A(() => document.activeElement && document.activeElement.blur());
  await A(() => { const S = window.__sungfluence; S.ui.selObjs = S.doc.objects.filter((o) => o.layer === 'lines').map((o) => o.id); });
  await p.keyboard.press('Control+g'); await wait(p);
  const g1 = await A(() => { const S = window.__sungfluence, P = S.doc.lines.paths; return { n: P.length, g: new Set(P.map((q) => q.group)).size, grouped: P.every((q) => q.group != null), objs: S.doc.objects.filter((o) => o.layer === 'lines').length }; });
  check(g1.n === 2 && g1.g === 1 && g1.grouped && g1.objs === 0, 'Ctrl G turns two shapes into paths in one group');
  await p.keyboard.press('Control+Shift+g'); await wait(p);
  check(await A(() => window.__sungfluence.doc.lines.paths.every((q) => q.group == null)), 'Ctrl Shift G ungroups them');
  check(await A(() => window.__sungfluence.runCommand('vector.group')) && await A(() => new Set(window.__sungfluence.doc.lines.paths.map((q) => q.group)).size === 1), 'the Group command groups the selected paths again');
  // the Select tool picks the whole group with one click, and a double-click goes into it
  const pt = await A(() => { const S = window.__sungfluence, q = S.doc.lines.paths[0], B = S.pathsBounds([q]); S.setPathSel([]); S.ui.selObjs = []; S.setTool('select'); return S.toScreen(B.x + B.w / 2, B.y + B.h / 2); });
  await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(150);
  check(await A(() => window.__sungfluence.selectedPathIds().length) === 2, 'one click selects the whole group');
  await p.mouse.dblclick(pt[0], pt[1]); await p.waitForTimeout(150);
  check(await A(() => window.__sungfluence.selectedPathIds().length === 1 && window.__sungfluence.ui.inGroup != null), 'a double-click goes into the group');
  await p.keyboard.press('Escape');
  check(await A(() => window.__sungfluence.COMMANDS.get('tool.distort').keys[0]) === 'shift+d', 'the Distort tool has the key Shift D');
  check(await A(() => !!document.querySelector('#menubar') && [...document.querySelectorAll('#menubar > button')].some((b) => b.textContent === 'Object')), 'there is an Object menu');

  // ---- 2. Urdu and Arabic, turned and flipped text ----
  await clearLines();
  const ar = await addText({ text: 'محبت', font: 'nastaliq', weight: 400, size: 240 });
  await p.waitForTimeout(400);
  await A(() => window.__sungfluence.runCommand('vector.toOutlines')); await wait(p);
  const arr = await A(() => { const S = window.__sungfluence, P = S.doc.lines.paths, B = S.pathsBounds(P); return { n: P.length, g: new Set(P.map((q) => q.group)).size, w: B.w }; });
  check(arr.n > 0 && arr.g === 1, 'an Urdu word becomes one group of outlines', arr.n + ' paths');
  check(Math.abs(arr.w - ar.w) < ar.w * 0.08, 'the word is traced whole, as wide as the text', Math.round(arr.w) + ' vs ' + Math.round(ar.w));
  await A(() => { const S = window.__sungfluence; S.setFill(S.doc.lines.paths, { type: 'linear', angle: 0, stops: [[0, '#14213d'], [1, '#0a84ff']] }); S.linesChanged(); });
  await shot('v09-urdu-outline');
  await clearLines();
  const tr = await addText({ text: 'Turn', font: 'sans', weight: 700, size: 200, extra: { rot: 30, flipX: true, fill: '#202020' } });
  // where the ink is on the artwork, before and after: the outlines must cover the same place
  const inkBox = () => A(() => { const c = window.__sungfluence.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { if (d[(y * c.width + x) * 4] < 100) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } return { x0, y0, x1, y1, n }; });
  const ib0 = await inkBox();
  await A(() => window.__sungfluence.runCommand('vector.toOutlines')); await wait(p);
  const ib1 = await inkBox();
  check(['x0', 'y0', 'x1', 'y1'].every((k) => Math.abs(ib0[k] - ib1[k]) <= 2) && Math.abs(ib0.n - ib1.n) < ib0.n * 0.05, 'turned and flipped text keeps its turn, mirror and place', JSON.stringify([ib0, ib1]));
  await shot('v10-turned');

  // ---- 3. centerlines ----
  await clearLines();
  const fl = await addText({ text: 'flow', font: 'sans', weight: 400, size: 320 });
  await longest();
  await A(() => window.__sungfluence.runCommand('vector.toCenterlines')); await wait(p);
  const long3 = await longest();
  const cl = await A((fl) => {
    const S = window.__sungfluence, P = S.doc.lines.paths;
    const bar = P.filter((q) => { const B = S.pathsBounds([q]); return !q.closed && B.w > B.h * 3 && B.x + B.w / 2 < fl.x + fl.w * 0.3 && B.y + B.h / 2 < fl.y + fl.h * 0.6; });
    return { n: P.length, open: P.filter((q) => !q.closed).length, bar: bar.length, stroke: P.every((q) => q.stroke && q.sw > 2) };
  }, fl);
  check(cl.n >= 5 && cl.n <= 12, 'flow becomes a handful of center lines', cl.n);
  check(cl.bar >= 1, 'the crossbar of the f is kept');
  check(cl.stroke, 'center lines are drawn as strokes as thick as the letters');
  await shot('v11-centerlines');
  check(long1 < 220 && long3 < 220 && long7 < 310, 'no step freezes the window', 'outline ' + long1 + ' ms, centerline ' + long3 + ' ms, words ' + long7 + ' ms');

  // ---- fit to the artboard, the default ----
  await clearLines();
  await addText({ text: 'Fit', font: 'serif', weight: 700, size: 80 });
  await A(() => { window.__sungfluence.ui.vec.fit = true; window.__sungfluence.runCommand('vector.toOutlines'); }); await wait(p);
  const fit = await A(() => { const S = window.__sungfluence, B = S.pathsBounds(S.doc.lines.paths), [iw, ih] = S.imgSize; return { w: B.w / iw, h: B.h / ih, cx: (B.x + B.w / 2) / iw, cy: (B.y + B.h / 2) / ih }; });
  check((Math.abs(fit.w - 0.8) < 0.02 || Math.abs(fit.h - 0.8) < 0.02) && Math.abs(fit.cx - 0.5) < 0.01 && Math.abs(fit.cy - 0.5) < 0.01, 'converted text is sized to the artboard and centered', JSON.stringify(fit));
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'lines'; S.buildPanel(); });
  check(await A(() => /Fill with/.test(document.getElementById('panel').textContent) && /Text effect/.test(document.getElementById('panel').textContent)), 'the Vector panel shows the fill and the text effect');
  await p.screenshot({ path: OUT + '/v12-panel.png' });

  // ---- gradient fills turn and flip with their shapes ----
  const same = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180) < 1e-6;
  const tf = await A(() => {
    const S = window.__sungfluence, L = { fill: { type: 'linear', angle: 90, stops: [] } }, R = { fill: { type: 'radial', cx: 0.25, cy: 0, r: 1, stops: [] } };
    S.turnFill(L, 90); const a1 = L.fill.angle; S.turnFill(L, 0, 'x'); const a2 = L.fill.angle; S.turnFill(L, 30, null); S.turnFill(L, 0, 'y'); const a3 = L.fill.angle;
    S.turnFill(R, 90); const r1 = [R.fill.cx, R.fill.cy]; S.turnFill(R, 0, 'y'); const r2 = [R.fill.cx, R.fill.cy];
    return { a1, a2, a3, r1, r2 };
  });
  check(same(tf.a1, 180) && same(tf.a2, 0) && same(tf.a3, -30) && Math.abs(tf.r1[0]) < 1e-9 && Math.abs(tf.r1[1] - 0.25) < 1e-9 && Math.abs(tf.r2[1] + 0.25) < 1e-9, 'a turn or a mirror moves the gradient direction and the radial center', JSON.stringify(tf));
  await clearLines();
  await A(() => { const S = window.__sungfluence, [iw, ih] = S.imgSize, n = (x, y) => ({ x, y, ix: 0, iy: 0, ox: 0, oy: 0 }); S.doc.lines.paths.push({ id: 9801, closed: true, width: 0, text: '', fillOnly: true, fill: { type: 'linear', angle: 90, stops: [[0, '#000000'], [1, '#ffffff']] }, nodes: [n(iw * 0.3, ih * 0.3), n(iw * 0.5, ih * 0.3), n(iw * 0.5, ih * 0.6), n(iw * 0.3, ih * 0.6)] }); S.linesChanged(); });
  await A(() => window.__sungfluence.rotateImage(1)); await wait(p);
  const ga1 = await A(() => window.__sungfluence.findPath(9801).fill.angle);
  await A(() => window.__sungfluence.flipVectorLayer('x')); await wait(p);
  const ga2 = await A(() => window.__sungfluence.findPath(9801).fill.angle);
  await A(() => window.__sungfluence.flipImage('y')); await wait(p);
  const ga3 = await A(() => window.__sungfluence.findPath(9801).fill.angle);
  check(same(ga1, 180) && same(ga2, 0) && same(ga3, 0), 'Rotate right, Flip the Vector layer and Flip the picture turn the gradient with the shapes', [ga1, ga2, ga3].join(', '));

  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all vector checks passed');
  process.exit(fails ? 1 : 0);
})();
