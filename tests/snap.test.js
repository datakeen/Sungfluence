// Snapping on real lines: kinds that need the line geometry, the hint on hover, traced lines that must not
// grab the pointer everywhere, and snapping while moving a line. Also centerlines, an extension meeting a line,
// equal spacing, rotate steps, a handle aiming at the next point, the Shape tool's line with Shift,
// a hidden Vector layer, and the speed of snapAt with hundreds of traced lines.
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('./browser');
const SRC = path.resolve(__dirname, '../src/index.html');
const OUT = process.env.SNAP_OUT || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(250); };
let failed = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!ok) failed++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sungfluence-prefs-v1', JSON.stringify({ welcomed: true })); } catch (e) { /* ignore */ } });
  await p.goto(require('url').pathToFileURL(SRC).href);
  await p.waitForTimeout(2000);
  const S = (f, a) => p.evaluate(f, a);
  const scr = (x, y) => S(([x, y]) => window.__sungfluence.toScreen(x, y), [x, y]);
  await S(() => { const t = document.getElementById('typeHere'); if (t) t.remove(); window.__sungfluence.setView('photo'); });
  const geo = await S(() => {
    const A = window.__sungfluence, [w, h] = A.imgSize, n = (x, y) => ({ x, y, ix: 0, iy: 0, ox: 0, oy: 0 });
    // an X of two diagonals (crossing at 0.5w, 0.4h, where no end lines up) and a short line across
    A.doc.lines.paths.push({ id: 9101, closed: false, width: 6, text: '', traced: false, nodes: [n(w * 0.2, h * 0.2), n(w * 0.8, h * 0.6)] });
    A.doc.lines.paths.push({ id: 9102, closed: false, width: 6, text: '', traced: false, nodes: [n(w * 0.2, h * 0.6), n(w * 0.9, h * 0.25)] });
    A.doc.lines.paths.push({ id: 9103, closed: false, width: 6, text: '', traced: false, nodes: [n(w * 0.1, h * 0.85), n(w * 0.3, h * 0.85)] });
    A.linesChanged();
    return { w, h, k: A.canvas.getBoundingClientRect().width / A.canvas.width, px: 1000 / (A.toScreen(1000, 0)[0] - A.toScreen(0, 0)[0]) };
  });
  const snap = (x, y, o) => S(([x, y, o, k]) => { const A = window.__sungfluence; const r = A.snapAt(x, y, Object.assign({ p: { k }, noTrack: true }, o || {})); return { r, h: A.snapHint }; }, [x, y, o || {}, geo.k]);
  const { w, h, px } = geo; // px: image pixels per screen pixel
  // A: y = 0.2h + (x - 0.2w) * (0.4h / 0.6w); B: y = 0.6h - (x - 0.2w) * (0.35h / 0.7w); they cross at x = 0.2w + 0.4w / (2/3 + 1/2)
  const cx = w * 0.2 + w * 0.4 / (2 / 3 + 0.5), cy = h * 0.2 + (cx - w * 0.2) * (0.4 * h) / (0.6 * w);
  let s = await snap(cx + 3, cy - 2);
  check('two drawn lines snap where they cross', s.h && s.h.kind === 'inter' && Math.abs(s.r[0] - cx) < 0.5 && Math.abs(s.r[1] - cy) < 0.5, JSON.stringify(s.h));
  s = await snap(w * 0.35 + 2, h * 0.3 + 6);
  check('a point near a drawn line lands on it', s.h && s.h.kind === 'line', JSON.stringify(s.h));
  s = await snap(w * 0.6, h * 0.85 + 2);
  check('past the end of a line it snaps to the extension', s.h && s.h.kind === 'ext' && Math.abs(s.r[1] - h * 0.85) < 0.01, JSON.stringify(s.h));
  // angle snapping is a distance from the ray, not a cone that grows with distance
  s = await snap(w * 0.5 + w * 0.4, h * 0.95 - w * 0.4 * Math.tan(3 * Math.PI / 180), { anchor: [w * 0.5, h * 0.95] });
  check('far from the anchor a 3° miss is not pulled to 0°', !s.h || s.h.kind !== 'angle', JSON.stringify(s.h));

  // the hint shows on hover, before anything is drawn
  await S(() => window.__sungfluence.setTool('shape'));
  // the middle of the bottom edge of the artboard
  const bm = await scr(w / 2, h);
  await p.mouse.move(bm[0] + 3, bm[1] - 2); await p.waitForTimeout(150);
  check('hovering with the Shape tool draws the snap hint', await S(() => !!window.__sungfluence.snapHint && /ff2d78/.test(document.getElementById('overlay').innerHTML)));

  // moving a line with the Select tool: its end snaps to another line's end
  await S(() => window.__sungfluence.setTool('select'));
  const from = await scr(w * 0.2, h * 0.85);
  const to = await scr(w * 0.2 + 4, h * 0.6 + 3);
  await p.mouse.move(from[0], from[1]); await p.mouse.down(); await p.mouse.move(to[0], to[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150);
  const n0 = await S(() => { const n = window.__sungfluence.doc.lines.paths.find((q) => q.id === 9103).nodes[0]; return [n.x, n.y]; });
  check('a moved line snaps (its middle lands on the end of another line)', Math.abs(n0[0] - w * 0.1) < 0.01 && Math.abs(n0[1] - h * 0.6) < 0.01, n0.map(Math.round).join(','));

  // ---- more kinds, each on its own lines ----
  const setPaths = (list) => S((list) => {
    const A = window.__sungfluence, n = (q) => ({ x: q[0], y: q[1], ix: q[2] || 0, iy: q[3] || 0, ox: q[4] || 0, oy: q[5] || 0 });
    A.doc.lines.paths = list.map((P) => ({ id: P.id, closed: !!P.closed, width: 6, text: '', traced: false, stroke: '#e33', sw: 4, nodes: P.nodes.map(n) }));
    A.doc.objects.length = 0; A.ui.selObjs = []; A.ui.selPath = null; A.linesChanged(); A.compose();
  }, list);
  const shot = async (name, a, c) => {
    const q0 = await scr(a[0], a[1]), q1 = await scr(c[0], c[1]);
    await p.screenshot({ path: path.join(OUT, name), clip: { x: Math.min(q0[0], q1[0]), y: Math.min(q0[1], q1[1]), width: Math.abs(q1[0] - q0[0]), height: Math.abs(q1[1] - q0[1]) } });
  };

  // centerline: the two sides of a thin closed outline, like a stroke of a converted letter
  const g = 20 * px, cy0 = h * 0.5;
  await setPaths([{ id: 9301, closed: true, nodes: [[w * 0.3, cy0], [w * 0.7, cy0], [w * 0.7, cy0 + g], [w * 0.3, cy0 + g]] }]);
  s = await snap(w * 0.4 + 2 * px, cy0 + g / 2 + 2.5 * px);
  check('between the two sides of an outline it snaps to the centerline', s.h && s.h.kind === 'centerline' && Math.abs(s.r[1] - (cy0 + g / 2)) < 0.01 * px, JSON.stringify(s.h));
  s = await snap(w * 0.4, cy0 + 3 * px);
  check('right next to one side it lands on that side, not the centerline', s.h && s.h.kind === 'line', JSON.stringify(s.h));
  await S(() => window.__sungfluence.setTool('pen'));
  const cq = await scr(w * 0.42, cy0 + g / 2 + 3 * px);
  await p.mouse.move(cq[0], cq[1]); await p.waitForTimeout(150);
  await shot('snap-centerline.png', [w * 0.3, cy0 - 60 * px], [w * 0.55, cy0 + g + 60 * px]);

  // an extension meeting another line
  await setPaths([{ id: 9201, nodes: [[w * 0.15, h * 0.3], [w * 0.35, h * 0.4]] }, { id: 9202, nodes: [[w * 0.6, h * 0.2], [w * 0.65, h * 0.8]] }]);
  // the ray from (0.35w, 0.4h) along (0.2w, 0.1h) meets the line x = 0.6w + (y - 0.2h) / 0.6h * 0.05w
  const t = (0.6 + 0.2 / 0.6 * 0.05 - 0.35) / (0.2 - 0.1 / 0.6 * 0.05), X = [w * (0.35 + 0.2 * t), h * (0.4 + 0.1 * t)];
  s = await snap(X[0] + 3 * px, X[1] - 2 * px);
  check('where an extension meets a line it snaps there', s.h && s.h.kind === 'xext' && Math.hypot(s.r[0] - X[0], s.r[1] - X[1]) < 0.01 * px, JSON.stringify(s.h));
  await S(() => { window.__sungfluence.ui.snapHint = null; });
  const xq = await scr(X[0] + 3 * px, X[1] - 2 * px);
  await p.mouse.move(xq[0], xq[1]); await p.waitForTimeout(150);
  await shot('snap-xext.png', [w * 0.12, h * 0.15], [w * 0.8, h * 0.7]);

  // a hidden Vector layer gives nothing to snap to
  await S(() => { window.__sungfluence.doc.lines.visible = false; });
  s = await snap(w * 0.35 + 2 * px, h * 0.4 + 2 * px);
  check('lines on a hidden Vector layer do not snap', !s.h || (s.h.kind !== 'end' && s.h.kind !== 'line'), JSON.stringify(s.h));
  await S(() => { window.__sungfluence.doc.lines.visible = true; });
  s = await snap(w * 0.35 + 2 * px, h * 0.4 + 2 * px);
  check('shown again, they snap again', s.h && s.h.kind === 'end', JSON.stringify(s.h));

  // the Shape tool's line with Shift keeps 15 degree steps, like the pen
  await setPaths([]);
  await S(() => { const A = window.__sungfluence; A.setTool('shape'); A.ui.shape.kind = 'line'; });
  const l0 = await scr(w * 0.3, h * 0.6);
  await p.mouse.move(l0[0], l0[1]); await p.keyboard.down('Shift'); await p.mouse.down();
  await p.mouse.move(l0[0] + 200 * Math.cos(Math.PI / 180 * 33), l0[1] - 200 * Math.sin(Math.PI / 180 * 33), { steps: 6 });
  await p.mouse.up(); await p.keyboard.up('Shift'); await p.waitForTimeout(100);
  const la = await S(() => { const P = window.__sungfluence.doc.lines.paths, L = P[P.length - 1]; if (!L) return null; const [a, b] = L.nodes; return -Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; });
  check('a Shape line with Shift turns in 15° steps', la !== null && Math.abs(la - 30) < 0.01, la);

  // equal spacing: a box moved into a row of two lands with the same gap
  await setPaths([]);
  await S(() => {
    const A = window.__sungfluence, [w, h] = A.imgSize;
    [0.1, 0.3, 0.62].forEach((x) => { A.quickAdd('rect'); const o = A.selectedObjs()[0]; o.x = w * x; o.y = h * 0.3; o.w = w * 0.1; o.h = h * 0.1; o.rot = 0; });
    A.setTool('select'); A.compose();
  });
  const c0 = await scr(w * 0.67, h * 0.35), c1 = await scr(w * 0.55, h * 0.35);
  await p.mouse.move(c0[0], c0[1]); await p.mouse.down(); await p.mouse.move(c1[0] + 4, c1[1] + 1, { steps: 8 }); await p.waitForTimeout(100);
  const spHint = await S(() => window.__sungfluence.snapHint && window.__sungfluence.snapHint.kind);
  await shot('snap-spacing.png', [w * 0.05, h * 0.2], [w * 0.75, h * 0.5]);
  await p.mouse.up(); await p.waitForTimeout(100);
  const ox = await S(() => window.__sungfluence.selectedObjs()[0].x);
  check('a moved box keeps the same gap as the boxes beside it', spHint === 'spacing' && Math.abs(ox - w * 0.5) < 0.01 * px, spHint + ' x=' + (ox / w).toFixed(4) + 'w');

  // rotating: near a 15° step it clicks into it and says so
  const rot = async (deg) => {
    const o = await S(() => { const o = window.__sungfluence.selectedObjs()[0]; o.rot = 0; window.__sungfluence.compose(); return { cx: o.x + o.w / 2, cy: o.y + o.h / 2, top: o.y }; });
    const c = await scr(o.cx, o.cy), tq = await scr(o.cx, o.top);
    const hx = tq[0], hy = tq[1] - 26, R = c[1] - hy, a = -Math.PI / 2 + deg * Math.PI / 180;
    await p.mouse.move(hx, hy); await p.mouse.down(); await p.mouse.move(c[0] + R * Math.cos(a), c[1] + R * Math.sin(a), { steps: 6 }); await p.waitForTimeout(80);
    const hint = await S(() => window.__sungfluence.snapHint && window.__sungfluence.snapHint.label);
    if (deg === 44) await shot('snap-rotate.png', [o.cx - w * 0.12, o.cy - h * 0.15], [o.cx + w * 0.12, o.cy + h * 0.15]);
    await p.mouse.up(); await p.waitForTimeout(60);
    return { r: await S(() => window.__sungfluence.selectedObjs()[0].rot), hint };
  };
  let rr = await rot(44);
  check('turning a shape near 45° clicks into 45°', Math.abs(Math.abs(rr.r) - 45) < 1e-6 && /turned/.test(rr.hint || ''), JSON.stringify(rr));
  rr = await rot(52);
  check('away from a step it turns freely', Math.abs(Math.abs(rr.r) - 52) < 1.5 && !rr.hint, JSON.stringify(rr));

  // ---- a line and a shape selected together, moved with the Select tool ----
  // the line's end touches the shape's corner; a third line is something to snap to
  const mixed = async () => {
    await setPaths([{ id: 9501, nodes: [[w * 0.3, h * 0.3], [w * 0.5, h * 0.3]] }, { id: 9502, nodes: [[w * 0.35, h * 0.6], [w * 0.25, h * 0.6 + w * 0.1]] }]);
    await S(() => {
      const A = window.__sungfluence, [w, h] = A.imgSize;
      A.quickAdd('rect'); const o = A.selectedObjs()[0]; o.x = w * 0.5; o.y = h * 0.3; o.w = w * 0.1; o.h = h * 0.1; o.rot = 0;
      A.ui.selObjs = [o.id]; A.setPathSel([9501]); A.setTool('select'); A.compose();
    });
  };
  const where = () => S(() => { const A = window.__sungfluence, o = A.doc.objects[A.doc.objects.length - 1], n = A.findPath(9501).nodes[0]; return { o: [o.x, o.y], n: [n.x, n.y], objs: A.ui.selObjs.length, paths: A.selectedPathIds().length }; });
  await mixed();
  await S(() => { const A = window.__sungfluence; A.doc.lines.paths = A.doc.lines.paths.filter((q) => q.id !== 9502); A.linesChanged(); A.prefs.snap.guides = false; A.prefs.snap.spacing = false; });
  // a small move by the line (lining up is off, so only real points could pull it): before, the shape's corner
  // snapped back to where the moving line's end had been
  let m0 = await scr(w * 0.4, h * 0.3), m1 = [m0[0] + 5, m0[1] + 4];
  await p.mouse.move(m0[0], m0[1]); await p.mouse.down(); await p.mouse.move(m1[0], m1[1], { steps: 5 }); await p.waitForTimeout(80);
  const smallHint = await S(() => JSON.stringify(window.__sungfluence.snapHint));
  await p.mouse.up(); await p.waitForTimeout(100);
  let mw = await where();
  await S(() => { const A = window.__sungfluence; A.prefs.snap.guides = true; A.prefs.snap.spacing = true; });
  check('a small move of a line and a shape together does not stick to where the line was', Math.abs(mw.n[0] - (w * 0.3 + 5 * px)) < 1.5 * px && Math.abs(mw.o[0] - (w * 0.5 + 5 * px)) < 1.5 * px, ((mw.n[0] - w * 0.3) / px).toFixed(1) + ' px ' + smallHint);
  // dragged by the shape, the line comes along, and the box around both snaps (its left middle, which only the line reaches, lands on the third line's end)
  await mixed();
  m0 = await scr(w * 0.55, h * 0.35); m1 = await scr(w * 0.6 + 3 * px, h * 0.6 + 3 * px);
  await p.mouse.move(m0[0], m0[1]); await p.mouse.down(); await p.mouse.move(m1[0], m1[1], { steps: 8 }); await p.waitForTimeout(80);
  const mixHint = await S(() => window.__sungfluence.snapHint && window.__sungfluence.snapHint.kind);
  await p.mouse.up(); await p.waitForTimeout(100);
  mw = await where();
  check('dragging a shape keeps the line selected with it, and both move', mw.objs === 1 && mw.paths === 1 && Math.abs((mw.n[0] - w * 0.3) - (mw.o[0] - w * 0.5)) < 1e-6 && Math.abs((mw.n[1] - h * 0.3) - (mw.o[1] - h * 0.3)) < 1e-6 && mw.o[1] > h * 0.4, JSON.stringify(mw));
  check('the box around the line and the shape snaps', mixHint === 'end' && Math.abs(mw.n[0] - w * 0.35) < 0.01 * px && Math.abs(mw.n[1] - h * 0.55) < 0.01 * px, mixHint + ' ' + mw.n.map((v) => Math.round(v)).join(','));

  // ---- turning lines with the handle clicks into 15° steps, and a gradient turns with the shape ----
  const sq = w * 0.1;
  await setPaths([{ id: 9601, closed: true, nodes: [[w * 0.4, h * 0.4], [w * 0.4 + sq, h * 0.4], [w * 0.4 + sq, h * 0.4 + sq], [w * 0.4, h * 0.4 + sq]] }]);
  await S(() => { const A = window.__sungfluence, q = A.findPath(9601); q.fill = { type: 'linear', angle: 90, stops: [[0, '#000000'], [1, '#ffffff']] }; q.fillOnly = true; A.setPathSel([9601]); A.setTool('select'); A.compose(); });
  const pc = await scr(w * 0.4 + sq / 2, h * 0.4 + sq / 2), pt = await scr(w * 0.4 + sq / 2, h * 0.4);
  const prR = pc[1] - (pt[1] - 26), pa = -Math.PI / 2 + 44 * Math.PI / 180;
  await p.mouse.move(pt[0], pt[1] - 26); await p.mouse.down(); await p.mouse.move(pc[0] + prR * Math.cos(pa), pc[1] + prR * Math.sin(pa), { steps: 6 }); await p.waitForTimeout(80);
  const prHint = await S(() => window.__sungfluence.snapHint && window.__sungfluence.snapHint.label);
  await p.mouse.up(); await p.waitForTimeout(100);
  const pr = await S(([cx, cy]) => { const q = window.__sungfluence.findPath(9601), n = q.nodes[0]; return { a: Math.atan2(n.y - cy, n.x - cx) * 180 / Math.PI, fill: q.fill.angle }; }, [w * 0.4 + sq / 2, h * 0.4 + sq / 2]);
  check('turning lines near 45° clicks into 45°', /turned 45/.test(prHint || '') && Math.abs(pr.a - (-90)) < 1e-6, prHint + ' ' + pr.a);
  check('a gradient fill turns with its shape', Math.abs(pr.fill - 135) < 1e-6, pr.fill);

  // ---- an Alt-click on a line copies it as an undo step, even without a drag ----
  await setPaths([{ id: 9701, nodes: [[w * 0.3, h * 0.5], [w * 0.6, h * 0.5]] }]);
  await S(() => { const A = window.__sungfluence; A.commitHistory(); A.findPath(9701).nodes[1].y += 1; A.commitHistory(); A.undo(); A.setPathSel([]); A.ui.selObjs = []; A.setTool('select'); A.compose(); });
  const redo0 = await S(() => !document.getElementById('redoBtn').disabled);
  const ac0 = await scr(w * 0.45, h * 0.5);
  await p.mouse.move(ac0[0], ac0[1]); await p.keyboard.down('Alt'); await p.mouse.down(); await p.mouse.up(); await p.keyboard.up('Alt'); await p.waitForTimeout(700);
  const ac = await S(() => ({ n: window.__sungfluence.doc.lines.paths.length, redo: !document.getElementById('redoBtn').disabled }));
  check('an Alt-click copy of a line is saved as a step of its own', redo0 && ac.n === 2 && !ac.redo, JSON.stringify(Object.assign({ redo0 }, ac)));

  // a curve handle can aim at the next point
  await setPaths([{ id: 9401, nodes: [[w * 0.3, h * 0.7, 0, 0, w * 0.05, h * 0.06], [w * 0.6, h * 0.6]] }]);
  await S(() => { const A = window.__sungfluence; A.setTool('direct'); A.ui.selPath = 9401; A.compose(); });
  const hq = await scr(w * 0.35, h * 0.76);
  // a point a little off the straight line from the first point to the second
  const ux = w * 0.3, uy = -h * 0.1, ul = Math.hypot(ux, uy), along = w * 0.1;
  const aimAt = [w * 0.3 + ux / ul * along - uy / ul * 3 * px, h * 0.7 + uy / ul * along + ux / ul * 3 * px];
  const aq = await scr(aimAt[0], aimAt[1]);
  await p.mouse.move(hq[0], hq[1]); await p.mouse.down(); await p.mouse.move(aq[0], aq[1], { steps: 6 }); await p.waitForTimeout(80);
  const aimHint = await S(() => window.__sungfluence.snapHint && window.__sungfluence.snapHint.label);
  await shot('snap-handle-aim.png', [w * 0.25, h * 0.5], [w * 0.65, h * 0.8]);
  await p.mouse.up(); await p.waitForTimeout(60);
  const hd = await S(() => { const n = window.__sungfluence.doc.lines.paths[0].nodes[0]; return [n.ox, n.oy]; });
  const cross = (hd[0] * uy - hd[1] * ux) / (Math.hypot(hd[0], hd[1]) * ul);
  check('a handle dragged near the line to the next point aims right at it', aimHint === 'aims at next point' && Math.abs(cross) < 1e-6, aimHint + ' ' + cross);
  await S(() => window.__sungfluence.setTool('select'));

  // traced lines must not grab the pointer everywhere
  await S(() => window.__sungfluence.useSample('coffee')); await wait(p);
  await S(() => window.__sungfluence.traceNow()); await wait(p);
  const share = await S((k) => { const A = window.__sungfluence, [w, h] = A.imgSize; let rnd = 3, hit = 0; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 1000; i++) { A.snapAt(w * R(), h * R(), { p: { k }, noTrack: true }); if (A.snapHint) hit++; } return hit / 1000; }, geo.k);
  check('with a traced photo most of the canvas is still free', share < 0.5, Math.round(share * 100) + '% snapped');

  // speed: hundreds of traced lines on the rocket
  await S(() => window.__sungfluence.useSample('rocket')); await wait(p);
  await S(() => window.__sungfluence.traceNow()); await wait(p);
  const speed = await S(() => {
    const A = window.__sungfluence, [w, h] = A.imgSize, k = A.canvas.getBoundingClientRect().width / A.canvas.width;
    A.snapAt(1, 1, { p: { k } });
    // the best of three rounds, so a busy computer does not fail the test
    let ms = Infinity, worst = Infinity;
    for (let rep = 0; rep < 3; rep++) {
      let rnd = 7, wr = 0; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
      const t0 = performance.now();
      for (let i = 0; i < 2000; i++) { const t1 = performance.now(); A.snapAt(w * R(), h * R(), { p: { k }, anchor: [w / 2, h / 2], noTrack: true }); wr = Math.max(wr, performance.now() - t1); }
      ms = Math.min(ms, (performance.now() - t0) / 2000); worst = Math.min(worst, wr);
    }
    return { paths: A.doc.lines.paths.length, ms, worst };
  });
  check('snapAt stays quick with hundreds of traced lines', speed.paths > 200 && speed.ms < 1 && speed.worst < 16, speed.paths + ' paths, ' + speed.ms.toFixed(3) + ' ms per call, worst ' + speed.worst.toFixed(1) + ' ms');
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(failed ? failed + ' check(s) failed' : 'all snapping checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
