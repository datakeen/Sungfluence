/* ===================== Part 3d: snapping ===================== */
/* While drawing and editing vectors, the pointer snaps to useful places. Everything is in image pixels.
   snapAt(ix, iy, o) returns the snapped point and leaves a hint (ui.snapHint) that the overlay draws.
   o: { e: the pointer event (Alt turns snapping off), p: evPos(e), anchor: [x, y] the point drawn from,
        skipPath: a path left out (the one being edited; a Set or an array of paths works too), skipNode: [path, index],
        skipObjs: Set of object ids, refs: more [x, y] points to line up with, live: the pen's own points,
        rays: [{ a: [x, y], u: unit direction, label, to: [x, y] }] directions to snap along (a handle aiming at the next point),
        noTrack: do not remember the snapped point } */
const SNAP_KINDS = [
  ['end', 'End points'], ['point', 'Points and corners'], ['mid', 'Mid points'], ['center', 'Centers'], ['inter', 'Intersections'],
  ['line', 'On lines'], ['ext', 'Extensions'], ['perp', 'Perpendicular'], ['tan', 'Tangent and handle aim'], ['centerline', 'Centerlines of outlines'], ['baseline', 'Text baselines'], ['track', 'Track from points you rest on'],
  ['guides', 'Line up with other points'], ['spacing', 'Equal spacing'], ['angle', '15° angles'], ['grid', 'Grid'], ['rulerGuides', 'Guides from the rulers'],
  ['edge', 'Edges in the photo']
];
/* the snap menu, in groups */
const SNAP_GROUPS = [['Points', ['end', 'point', 'mid', 'center', 'inter']], ['Lines', ['line', 'ext', 'perp', 'tan', 'centerline', 'baseline', 'track']],
  ['Alignment', ['guides', 'spacing', 'angle', 'grid', 'rulerGuides']], ['Photo', ['edge']]];
function snapMenuItems() {
  const out = [{ id: 'snap.on' }];
  SNAP_GROUPS.forEach(([head, ks]) => { out.push({ sep: true }, { head }); ks.forEach((k) => out.push({ id: 'snap.' + k })); });
  return out;
}
const SNAP_DEFAULTS = { on: true, end: true, point: true, mid: true, center: true, inter: true, ext: true, perp: true, tan: true, centerline: true, line: true, baseline: true, edge: false, guides: true, spacing: true, track: true, angle: true, grid: false, rulerGuides: true };
prefs.snap = Object.assign({}, SNAP_DEFAULTS, prefs.snap || {});
prefs.grid = Object.assign({ show: false, size: 0 }, prefs.grid || {});
/* the order wins when several snaps are about as close */
const SNAP_RANK = ['end', 'inter', 'gcross', 'center', 'mid', 'centerline', 'point', 'perp', 'aim', 'tan', 'xext', 'ginter', 'baseline', 'ext', 'edge', 'line'];
const SNAP_LABEL = { end: 'end point', point: 'point', mid: 'mid point', center: 'center', inter: 'intersection', ext: 'extension', perp: 'perpendicular', tan: 'tangent',
  line: 'on line', baseline: 'baseline', edge: 'photo edge', angle: 'angle', grid: 'grid', guides: 'lined up', xext: 'extension meets line', centerline: 'centerline',
  aim: 'aims at next point', spacing: 'equal spacing', guide: 'on guide', gcross: 'guides cross', ginter: 'guide meets line' };
function setSnap(k) { prefs.snap[k] = !prefs.snap[k]; savePrefs(); buildOptbar(); syncMenus(); }
function gridSize() { return prefs.grid.size > 0 ? prefs.grid.size : Math.max(4, Math.round(Math.min(iw, ih) / 24)); }

/* ---------- what can be snapped to, made once per change ---------- */
let snapCache = null;
function snapGeom() {
  const linesOn = !!layerOf('lines').visible;
  const key = linesOn + '|' + vecVer + '|' + objVer + '|' + doc.lines.paths.length + '|' + doc.objects.length + '|' + JSON.stringify(cropRect()) + '|' + iw + 'x' + ih;
  // while dragging, what moves is left out anyway, so the geometry from the start of the drag is kept
  if (snapCache && drag && snapCache.drag === drag) return snapCache;
  if (snapCache && snapCache.key === key) { snapCache.drag = drag; return snapCache; }
  const pts = [], polys = [], ends = [], bases = [], boxes = [];
  const id = (x, y) => [x, y];
  // lines of the Vector layer (none while the layer is hidden)
  for (const path of linesOn ? doc.lines.paths : []) {
    if (path.hidden || !path.nodes || !path.nodes.length) continue;
    const N = path.nodes, fl = flatten(path, id, 1).map((q) => [q[0], q[1]]);
    polys.push({ src: path, pts: fl });
    N.forEach((n, i) => pts.push({ x: n.x, y: n.y, kind: !path.closed && (i === 0 || i === N.length - 1) ? 'end' : 'point', src: path, i }));
    // the middle of each piece of the line
    const segs = path.closed ? N.length : N.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = N[i], b = N[(i + 1) % N.length];
      const p1 = [a.x + (a.ox || 0), a.y + (a.oy || 0)], p2 = [b.x + (b.ix || 0), b.y + (b.iy || 0)];
      pts.push({ x: 0.125 * a.x + 0.375 * p1[0] + 0.375 * p2[0] + 0.125 * b.x, y: 0.125 * a.y + 0.375 * p1[1] + 0.375 * p2[1] + 0.125 * b.y, kind: 'mid', src: path });
    }
    if (path.closed && fl.length > 2) { const c = polyCentroid(fl); pts.push({ x: c[0], y: c[1], kind: 'center', src: path }); }
    if (!path.closed && fl.length > 1) {
      // the direction a line leaves its ends, for extensions
      const dir = (a, b) => { const L = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [(a[0] - b[0]) / L, (a[1] - b[1]) / L]; };
      const k = Math.min(3, fl.length - 1);
      ends.push({ x: fl[0][0], y: fl[0][1], u: dir(fl[0], fl[k]), src: path, traced: !!path.traced });
      ends.push({ x: fl[fl.length - 1][0], y: fl[fl.length - 1][1], u: dir(fl[fl.length - 1], fl[fl.length - 1 - k]), src: path, traced: !!path.traced });
    }
  }
  // shapes, text and images
  for (const o of doc.objects) {
    if (o.hidden || !layerOf(o.layer).visible) continue;
    const L = (lx, ly) => fromLocal(o, lx, ly), w = o.w / 2, h = o.h / 2;
    pts.push(Object.assign({ kind: 'center', obj: o.id }, ptObj(L(0, 0))));
    let outline;
    if (o.type === 'ellipse') {
      outline = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; outline.push(L(Math.cos(a) * w, Math.sin(a) * h)); }
      [[w, 0], [-w, 0], [0, h], [0, -h]].forEach((q) => pts.push(Object.assign({ kind: 'point', obj: o.id }, ptObj(L(q[0], q[1])))));
    } else if (o.type === 'polygon' || o.type === 'star') {
      outline = polyPoints(o).map((q) => L(q[0], q[1])); outline.push(outline[0]);
      outline.slice(0, -1).forEach((q, i) => { pts.push(Object.assign({ kind: 'point', obj: o.id }, ptObj(q))); const n = outline[i + 1]; pts.push({ x: (q[0] + n[0]) / 2, y: (q[1] + n[1]) / 2, kind: 'mid', obj: o.id }); });
    } else {
      outline = [[-w, -h], [w, -h], [w, h], [-w, h], [-w, -h]].map((q) => L(q[0], q[1]));
      outline.slice(0, -1).forEach((q, i) => { pts.push(Object.assign({ kind: 'point', obj: o.id }, ptObj(q))); const n = outline[i + 1]; pts.push({ x: (q[0] + n[0]) / 2, y: (q[1] + n[1]) / 2, kind: 'mid', obj: o.id }); });
    }
    if (o.type !== 'text') polys.push({ obj: o.id, pts: outline });
    boxes.push(Object.assign({ obj: o.id }, objBounds([o])));
    if (o.type === 'text') {
      // each line of text sits on a baseline, about 0.8 of the size below the top of the line
      String(o.text || '').split('\n').forEach((s, i) => {
        const y = -h + i * o.size * o.lh + o.size * (o.lh - 1) / 2 + o.size * 0.8;
        bases.push({ obj: o.id, a: L(-w, y), b: L(w, y) });
      });
    }
  }
  // the artboard: corners, middles of the sides and the center
  const cr = cropRect(), x0 = cr.x * iw, y0 = cr.y * ih, x1 = x0 + cr.w * iw, y1 = y0 + cr.h * ih;
  [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach((q) => pts.push({ x: q[0], y: q[1], kind: 'point', board: true }));
  [[(x0 + x1) / 2, y0], [x1, (y0 + y1) / 2], [(x0 + x1) / 2, y1], [x0, (y0 + y1) / 2]].forEach((q) => pts.push({ x: q[0], y: q[1], kind: 'mid', board: true }));
  pts.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, kind: 'center', board: true });
  polys.push({ board: true, pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]] });
  // points that others line up with: all but the inside points of traced lines (those join once the pointer rests on them)
  polys.forEach((P) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; P.pts.forEach((q) => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }); P.box = [x0, y0, x1, y1]; });
  // boxes of drawn lines too, for equal spacing (traced lines are too many and too small)
  polys.forEach((P) => { if (P.src && !P.src.traced) boxes.push({ src: P.src, x: P.box[0], y: P.box[1], w: P.box[2] - P.box[0], h: P.box[3] - P.box[1] }); });
  const refs = pts.filter((q) => (q.kind === 'end' || q.kind === 'center' || q.kind === 'point') && !(q.src && q.src.traced));
  snapCache = { key, pts, polys, ends, bases, boxes, refs, drag };
  return snapCache;
}
const ptObj = (q) => ({ x: q[0], y: q[1] });
function polyCentroid(fl) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < fl.length; i++) { const p = fl[i], q = fl[(i + 1) % fl.length], c = p[0] * q[1] - q[0] * p[1]; a += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; }
  if (Math.abs(a) < 1e-6) { let x = 0, y = 0; fl.forEach((q) => { x += q[0]; y += q[1]; }); return [x / fl.length, y / fl.length]; }
  return [cx / (3 * a), cy / (3 * a)];
}
/* points the pointer rested on lately: guides and extensions run from them (AutoCAD calls it object snap tracking) */
const snapTrack = [];
function trackPoint(c) {
  if (!prefs.snap.track || !['end', 'mid', 'center', 'inter', 'point'].includes(c.kind)) return;
  const i = snapTrack.findIndex((q) => Math.abs(q.x - c.x) < 1e-6 && Math.abs(q.y - c.y) < 1e-6);
  if (i >= 0) snapTrack.splice(i, 1);
  snapTrack.push({ x: c.x, y: c.y, kind: c.kind });
  if (snapTrack.length > 4) snapTrack.shift();
}
function clearTrack() { snapTrack.length = 0; }
/* where the ray from a along u crosses the segment b-c */
function rayCross(a, u, b, c) {
  const s = [c[0] - b[0], c[1] - b[1]], den = u[0] * s[1] - u[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((b[0] - a[0]) * s[1] - (b[1] - a[1]) * s[0]) / den, v = ((b[0] - a[0]) * u[1] - (b[1] - a[1]) * u[0]) / den;
  return t > 0 && v >= 0 && v <= 1 ? [a[0] + t * u[0], a[1] + t * u[1]] : null;
}

/* strong edges of the photo, from the analysis copy: one map per photo */
let edgeCache = null;
function edgeMap() {
  if (!src) return null;
  if (edgeCache && edgeCache.src === src) return edgeCache;
  const { w, h, lum } = src, mag = new Float32Array(w * h);
  let top = 1e-6;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, gx = lum[i + 1] - lum[i - 1], gy = lum[i + w] - lum[i - w];
    const m = gx * gx + gy * gy; mag[i] = m; if (m > top) top = m;
  }
  const hist = new Uint32Array(256);
  for (let i = 0; i < mag.length; i++) hist[Math.min(255, Math.floor(mag[i] / top * 255))]++;
  let acc = 0, bin = 255;
  for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc >= mag.length * 0.9) { bin = k; break; } }
  edgeCache = { src, mag, thr: (bin + 1) / 256 * top };
  return edgeCache;
}

/* ---------- geometry ---------- */
function nearOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1e-9;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1);
  return [ax + t * dx, ay + t * dy, t];
}
function segCross(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
}

/* ---------- the snap itself ---------- */
function snapTol(p) { return 8 / ((p ? p.k : 1) * imgScale(artGeom())); }
const degOf = (q) => { const d = Math.round(-q * 180 / Math.PI); return d === -180 ? 180 : d || 0; };
/* Shift: 15 degree steps from the anchor, also with snapping off */
function angleStep(ix, iy, an) {
  const dx = ix - an[0], dy = iy - an[1], L = Math.hypot(dx, dy);
  if (L < 1e-9) return [ix, iy];
  const q = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * Math.PI / 12, x = an[0] + Math.cos(q) * L, y = an[1] + Math.sin(q) * L;
  ui.snapHint = { x, y, kind: 'angle', from: an, deg: degOf(q) };
  return [x, y];
}
function snapAt(ix, iy, o) {
  o = o || {};
  ui.snapHint = null;
  const S = prefs.snap;
  if (!S.on || !origImg || (o.e && o.e.altKey)) return origImg && o.anchor && o.e && o.e.shiftKey ? angleStep(ix, iy, o.anchor) : [ix, iy];
  const tol = snapTol(o.p), G = snapGeom();
  const sp = o.skipPath, skipP = !sp ? () => false : sp instanceof Set ? (src) => sp.has(src) : Array.isArray(sp) ? (src) => sp.includes(src) : (src) => src === sp;
  const skipObj = (q) => q.obj != null && o.skipObjs && o.skipObjs.has(q.obj);
  const skipSrc = (q) => (q.src && skipP(q.src)) || skipObj(q);
  const cands = [];
  const add = (x, y, kind, extra) => { const d = Math.hypot(x - ix, y - iy); if (d <= tol) cands.push(Object.assign({ x, y, kind, d }, extra || {})); };

  // points: ends, corners, middles, centers
  for (const q of G.pts) {
    if (!S[q.kind] || skipObj(q)) continue;
    if (q.src && skipP(q.src) && !(o.skipNode && q.src === o.skipNode[0] && q.i != null && q.i !== o.skipNode[1])) continue;
    if (Math.abs(q.x - ix) > tol || Math.abs(q.y - iy) > tol) continue;
    add(q.x, q.y, q.kind);
  }
  // the line being drawn with the pen: its own points, so it can close or meet itself
  if (o.live) o.live.forEach((q, i) => S.point && add(q[0], q[1], i === 0 ? 'end' : 'point'));

  // pieces of lines near the pointer, for intersections, perpendicular, tangent and "on line";
  // a wider ring for centerlines, which look for the two sides of a stroke around the pointer
  const near = [], wide = [], R = S.centerline ? tol * 5 : tol * 2;
  for (const P of G.polys) {
    if (skipSrc(P)) continue;
    const bx = P.box;
    if (bx[0] - R > ix || bx[2] + R < ix || bx[1] - R > iy || bx[3] + R < iy) continue;
    const pts = P.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (Math.min(a[0], b[0]) - R > ix || Math.max(a[0], b[0]) + R < ix || Math.min(a[1], b[1]) - R > iy || Math.max(a[1], b[1]) + R < iy) continue;
      const q = nearOnSeg(ix, iy, a[0], a[1], b[0], b[1]);
      const d = Math.hypot(q[0] - ix, q[1] - iy);
      if (d > R) continue;
      const s = { P, i, a, b, q, d };
      wide.push(s);
      if (d <= tol * 2) near.push(s);
    }
  }
  // centerline: halfway between the two sides of an outline stroke or a converted letter
  if (S.centerline && wide.length > 1) {
    const W = wide.length > 40 ? wide.sort((a, b) => a.d - b.d).slice(0, 40) : wide;
    for (let m = 0; m < W.length; m++) for (let n = m + 1; n < W.length; n++) {
      const A = W[m], B = W[n];
      if (A.P === B.P) { const k = Math.abs(A.i - B.i), L = A.P.pts.length - 1; if (Math.min(k, L - k) <= 2) continue; }
      const ua = [A.b[0] - A.a[0], A.b[1] - A.a[1]], ub = [B.b[0] - B.a[0], B.b[1] - B.a[1]], la = Math.hypot(ua[0], ua[1]) || 1, lb = Math.hypot(ub[0], ub[1]) || 1;
      if (Math.abs(ua[0] * ub[0] + ua[1] * ub[1]) / (la * lb) < 0.97) continue;
      const gx = B.q[0] - A.q[0], gy = B.q[1] - A.q[1], gap = Math.hypot(gx, gy);
      if (gap < tol * 0.5 || gap > tol * 8) continue;
      // the sides face each other, one on each side of the pointer
      if (Math.abs(gx * ua[0] + gy * ua[1]) / la > gap * 0.35) continue;
      if ((A.q[0] - ix) * (B.q[0] - ix) + (A.q[1] - iy) * (B.q[1] - iy) > 0) continue;
      // only near the middle, so the pointer can still land on a side
      const mx = (A.q[0] + B.q[0]) / 2, my = (A.q[1] + B.q[1]) / 2;
      if (Math.hypot(mx - ix, my - iy) > Math.max(gap * 0.3, tol * 0.4)) continue;
      add(mx, my, 'centerline', { from: [A.q[0], A.q[1]], from2: [B.q[0], B.q[1]] });
    }
  }
  if (S.inter) {
    for (let m = 0; m < near.length; m++) for (let n = m + 1; n < near.length; n++) {
      const A = near[m], B = near[n];
      if (A.P === B.P && Math.abs(A.i - B.i) <= 1) continue;
      const x = segCross(A.a, A.b, B.a, B.b);
      if (x) add(x[0], x[1], 'inter');
    }
  }
  if (S.line) near.forEach((s) => s.d <= tol && add(s.q[0], s.q[1], 'line'));
  // guides from the rulers: where two cross, and where one meets a line
  const GL = snapGuides(), gv = GL.filter((q) => q.axis === 'x' && Math.abs(q.at - ix) <= tol), gh = GL.filter((q) => q.axis === 'y' && Math.abs(q.at - iy) <= tol);
  gv.forEach((a) => gh.forEach((b) => add(a.at, b.at, 'gcross')));
  if (S.inter) near.forEach((s) => {
    gv.forEach((a) => { const x = segCross(s.a, s.b, [a.at, iy - tol * 4], [a.at, iy + tol * 4]); if (x) add(x[0], x[1], 'ginter'); });
    gh.forEach((b) => { const x = segCross(s.a, s.b, [ix - tol * 4, b.at], [ix + tol * 4, b.at]); if (x) add(x[0], x[1], 'ginter'); });
  });
  const an = o.anchor;
  if (an && S.perp) near.forEach((s) => {
    const q = nearOnSeg(an[0], an[1], s.a[0], s.a[1], s.b[0], s.b[1]);
    if (q[2] > 0.001 && q[2] < 0.999) add(q[0], q[1], 'perp', { from: an });
  });
  if (an && S.tan) near.forEach((s) => {
    const pts = s.P.pts, f = (j) => {
      const p = pts[j], pa = pts[Math.max(0, j - 1)], pb = pts[Math.min(pts.length - 1, j + 1)];
      return (p[0] - an[0]) * (pb[1] - pa[1]) - (p[1] - an[1]) * (pb[0] - pa[0]);
    };
    const f0 = f(s.i), f1 = f(s.i + 1);
    if (f0 === 0 || f0 * f1 < 0) { const t = f0 / ((f0 - f1) || 1); add(s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t, 'tan', { from: an }); }
  });
  // directions given by the caller: a handle that aims at the next point, or goes on straight from the line
  if (o.rays && S.tan) o.rays.forEach((r) => {
    const t = (ix - r.a[0]) * r.u[0] + (iy - r.a[1]) * r.u[1];
    if (t > tol) add(r.a[0] + r.u[0] * t, r.a[1] + r.u[1] * t, 'aim', { from: r.a, from2: r.to || null, label: r.label });
  });
  if (S.ext) {
    const tracked = (E) => snapTrack.some((q) => Math.abs(q.x - E.x) < 1e-6 && Math.abs(q.y - E.y) < 1e-6);
    const rays = [];
    for (const E of G.ends) {
      if (skipSrc(E) || (E.traced && !tracked(E))) continue;
      const vx = ix - E.x, vy = iy - E.y, t = vx * E.u[0] + vy * E.u[1];
      if (t <= tol) continue;
      const px = E.x + E.u[0] * t, py = E.y + E.u[1] * t;
      if (Math.hypot(px - ix, py - iy) > tol * 2) continue;
      rays.push(E);
      add(px, py, 'ext', { from: [E.x, E.y] });
    }
    // an extension meeting a line, or another extension
    for (const E of rays) {
      for (const sg of near) { if (sg.P.src && sg.P.src === E.src) continue; const x = rayCross([E.x, E.y], E.u, sg.a, sg.b); if (x) add(x[0], x[1], 'xext', { from: [E.x, E.y] }); }
      for (const F of rays) {
        if (F === E) continue;
        const x = rayCross([E.x, E.y], E.u, [F.x, F.y], [F.x + F.u[0] * 1e5, F.y + F.u[1] * 1e5]);
        if (x) add(x[0], x[1], 'xext', { from: [E.x, E.y], from2: [F.x, F.y] });
      }
    }
  }
  if (S.baseline) for (const B of G.bases) {
    if (skipObj(B)) continue;
    const q = nearOnSeg(ix, iy, B.a[0], B.a[1], B.b[0], B.b[1]);
    add(q[0], q[1], 'baseline', { line: [B.a, B.b] });
  }
  // while a photo job runs, src still has the last crop, so its edges would land in the wrong place
  if (S.edge && !jobs.src) {
    const E = edgeMap(), cr = cropRect();
    if (E) {
      const sx = (ix / iw - cr.x) / cr.w * src.w, sy = (iy / ih - cr.y) / cr.h * src.h, k = src.w / (cr.w * iw), r = Math.max(1, Math.round(tol * k));
      let best = -1, bx = 0, by = 0;
      for (let y = Math.max(1, Math.round(sy) - r); y <= Math.min(src.h - 2, Math.round(sy) + r); y++) for (let x = Math.max(1, Math.round(sx) - r); x <= Math.min(src.w - 2, Math.round(sx) + r); x++) {
        const m = E.mag[y * src.w + x];
        if (m >= E.thr && m - Math.hypot(x - sx, y - sy) * E.thr * 0.05 > best) { best = m - Math.hypot(x - sx, y - sy) * E.thr * 0.05; bx = x; by = y; }
      }
      if (best >= 0) add(((bx + 0.5) / src.w * cr.w + cr.x) * iw, ((by + 0.5) / src.h * cr.h + cr.y) * ih, 'edge');
    }
  }

  if (cands.length) {
    cands.forEach((c) => { c.score = c.d / tol + SNAP_RANK.indexOf(c.kind) * 0.12; });
    cands.sort((a, b) => a.score - b.score);
    const c = cands[0];
    if (!o.noTrack) trackPoint(c);
    ui.snapHint = { x: c.x, y: c.y, kind: c.kind, from: c.from, from2: c.from2, line: c.line, label: c.label };
    return [c.x, c.y];
  }
  // points to line up with: drawn points, points rested on, the anchor, the pen's own points, the neighbours of an edited point
  const refs = [];
  if (S.guides) {
    G.refs.forEach((q) => { if (!skipObj(q) && !(q.src && skipP(q.src) && (!o.skipNode || q.src !== o.skipNode[0] || q.i == null || q.i === o.skipNode[1]))) refs.push(q); });
    snapTrack.forEach((q) => refs.push(q));
    if (an) refs.push({ x: an[0], y: an[1] });
    (o.refs || []).forEach((q) => refs.push({ x: q[0], y: q[1] }));
    (o.live || []).forEach((q) => refs.push({ x: q[0], y: q[1] }));
  }
  // guides from the rulers line points up across or down (a vertical guide has no y, a horizontal one no x)
  const guideRefs = GL.map((q) => (q.axis === 'x' ? { x: q.at, y: NaN, guide: true } : { x: NaN, y: q.at, guide: true }));
  // directions from the anchor: 15 degree steps (Shift always)
  if (an && (S.angle || (o.e && o.e.shiftKey))) {
    const dx = ix - an[0], dy = iy - an[1], L = Math.hypot(dx, dy);
    if (L > tol) {
      const a = Math.atan2(dy, dx), st = Math.PI / 12, q = Math.round(a / st) * st;
      // near the ray in screen pixels, not in degrees, so far from the anchor it does not grab everything
      if ((o.e && o.e.shiftKey) || Math.abs(L * Math.sin(a - q)) <= tol) {
        const u = [Math.cos(q), Math.sin(q)];
        let x = an[0] + u[0] * L, y = an[1] + u[1] * L, gv = null, gh = null, dv = tol, dh = tol;
        for (const r of refs.concat(guideRefs)) {
          if (r.x === an[0] && r.y === an[1]) continue;
          if (Math.abs(u[0]) > 0.05 && Math.abs(r.x - x) < dv && (r.x - an[0]) / u[0] > 0) { dv = Math.abs(r.x - x); gv = r; }
          if (Math.abs(u[1]) > 0.05 && Math.abs(r.y - y) < dh && (r.y - an[1]) / u[1] > 0) { dh = Math.abs(r.y - y); gh = r; }
        }
        if (gv && (!gh || dv <= dh)) { gh = null; const t = (gv.x - an[0]) / u[0]; x = gv.x; y = an[1] + u[1] * t; }
        else if (gh) { gv = null; const t = (gh.y - an[1]) / u[1]; y = gh.y; x = an[0] + u[0] * t; }
        ui.snapHint = { x, y, kind: 'angle', from: an, deg: degOf(q), gx: gv && !gv.guide ? [gv.x, gv.y] : null, gy: gh && !gh.guide ? [gh.x, gh.y] : null, onGuide: !!((gv && gv.guide) || (gh && gh.guide)) };
        return [x, y];
      }
    }
  }
  // line up with other points, and the grid, each direction on its own
  let x = ix, y = iy, gx = null, gy = null, bestX = tol, bestY = tol;
  if (S.guides || guideRefs.length) {
    for (const q of (S.guides ? refs : []).concat(guideRefs)) {
      const ddx = Math.abs(q.x - ix), ddy = Math.abs(q.y - iy);
      if (ddx < bestX) { bestX = ddx; x = q.x; gx = q; }
      if (ddy < bestY) { bestY = ddy; y = q.y; gy = q; }
    }
  }
  // with the grid on, points always land on it, unless they line up with another point
  if (S.grid) {
    const s = gridSize();
    if (!gx) { x = Math.round(ix / s) * s; gx = { grid: true }; }
    if (!gy) { y = Math.round(iy / s) * s; gy = { grid: true }; }
  }
  if (gx || gy) {
    const onGuide = (gx && gx.guide) || (gy && gy.guide);
    ui.snapHint = { x, y, kind: onGuide ? 'guide' : (gx && gx.grid) || (gy && gy.grid) ? 'grid' : 'guides', gx: gx && !gx.grid && !gx.guide ? [gx.x, gx.y] : null, gy: gy && !gy.grid && !gy.guide ? [gy.x, gy.y] : null };
    return [x, y];
  }
  return [ix, iy];
}
/* moving shapes: the moved box's corners, middles and center snap; the shapes move by the same amount.
   objs: the moved objects (or null); opt: { box: the moved box at the start, keys: more [x, y] points that snap (the ends of a line),
   skipPath: a path or a Set or an array of paths that move too } */
function snapMove(objs, dx, dy, e, p, opt) {
  ui.snapHint = null;
  if (!prefs.snap.on || (e && e.altKey) || (e && e.shiftKey)) return [dx, dy];
  opt = opt || {};
  const skipObjs = new Set((objs || []).map((o) => o.id));
  const b = opt.box || objBounds(objs);
  const keys = (opt.keys || []).map((q) => [q[0] + dx, q[1] + dy]).concat([[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.5, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]].map(([u, v]) => [b.x + u * b.w + dx, b.y + v * b.h + dy]));
  let best = null;
  const tol = snapTol(p);
  for (const k of keys) {
    const r = snapAt(k[0], k[1], { p, skipObjs, skipPath: opt.skipPath, noTrack: true });
    if (!ui.snapHint) continue;
    const hint = ui.snapHint;
    // a real point (an end, a center) wins over just lining up or the grid
    const d = Math.hypot(r[0] - k[0], r[1] - k[1]) / tol + (hint.kind === 'guides' || hint.kind === 'grid' ? 1 : 0);
    if (!best || d < best.d) best = { d, ox: r[0] - k[0], oy: r[1] - k[1], hint };
  }
  // equal spacing, when nothing better than lining up was found
  if (prefs.snap.spacing && (!best || best.hint.kind === 'guides' || best.hint.kind === 'grid')) {
    const sp = opt.skipPath, skip = (r) => (r.obj != null && skipObjs.has(r.obj)) || (r.src && sp && (sp === r.src || (sp instanceof Set && sp.has(r.src)) || (Array.isArray(sp) && sp.includes(r.src))));
    const ox0 = best ? best.ox : 0, oy0 = best ? best.oy : 0;
    const m = spacingSnap({ x: b.x + dx + ox0, y: b.y + dy + oy0, w: b.w, h: b.h }, snapGeom().boxes.filter((r) => !skip(r)), tol);
    if (m.x || m.y) {
      const ox = m.x ? ox0 + m.x.shift : ox0, oy = m.y ? oy0 + m.y.shift : oy0;
      const marks = (m.x ? m.x.marks : []).concat(m.y ? m.y.marks : []), last = marks[marks.length - 1];
      // the label goes by the gap next to the moved box
      ui.snapHint = { kind: 'spacing', x: (last[0] + last[2]) / 2, y: (last[1] + last[3]) / 2, marks };
      return [dx + ox, dy + oy];
    }
  }
  ui.snapHint = best ? best.hint : null;
  return best ? [dx + best.ox, dy + best.oy] : [dx, dy];
}
/* equal spacing for a moved box b among other boxes, along x and along y on its own.
   In a row (boxes that overlap b across), b's gap to its neighbour can match a gap between two other boxes,
   or b can sit halfway between its two neighbours. Returns { x: { shift, marks }, y: ... } for the axes that snap. */
function spacingSnap(b, boxes, tol) {
  const out = {};
  [['x', 'y', 'w', 'h'], ['y', 'x', 'h', 'w']].forEach(([P, Q, LP, LQ]) => {
    const row = boxes.filter((r) => r[LP] > 0 && r[Q] < b[Q] + b[LQ] && r[Q] + r[LQ] > b[Q]);
    if (!row.length) return;
    const s0 = (r) => r[P], s1 = (r) => r[P] + r[LP], lo = b[P], hi = b[P] + b[LP];
    let left = null, right = null;
    row.forEach((r) => {
      if (s1(r) <= lo + tol && s0(r) < lo && (!left || s1(r) > s1(left))) left = r;
      if (s0(r) >= hi - tol && s1(r) > hi && (!right || s0(r) < s0(right))) right = r;
    });
    if (!left && !right) return;
    // gaps between neighbours in the row
    const sorted = row.slice().sort((a, c) => s0(a) - s0(c)), gaps = [];
    for (let i = 0; i + 1 < sorted.length; i++) {
      const a = sorted[i], c = sorted[i + 1], g = s0(c) - s1(a);
      if (g > tol) gaps.push({ g, a: s1(a), b: s0(c), q: (Math.max(a[Q], c[Q]) + Math.min(a[Q] + a[LQ], c[Q] + c[LQ])) / 2 });
    }
    const mq = b[Q] + b[LQ] / 2, opts = [];
    gaps.forEach((G) => {
      if (left) opts.push({ shift: s1(left) + G.g - lo, gaps: [G, { a: s1(left), b: s1(left) + G.g, q: mq }] });
      if (right) opts.push({ shift: s0(right) - G.g - hi, gaps: [G, { a: s0(right) - G.g, b: s0(right), q: mq }] });
    });
    if (left && right && s0(right) - s1(left) > b[LP] + 2 * tol) {
      const g = (s0(right) - s1(left) - b[LP]) / 2;
      opts.push({ shift: s1(left) + g - lo, gaps: [{ a: s1(left), b: s1(left) + g, q: mq }, { a: s0(right) - g, b: s0(right), q: mq }] });
    }
    let best = null;
    opts.forEach((o) => { if (Math.abs(o.shift) <= tol && (!best || Math.abs(o.shift) < Math.abs(best.shift))) best = o; });
    if (!best) return;
    // the marks: one line across each equal gap, with short ends
    best.marks = best.gaps.map((G) => (P === 'x' ? [G.a, G.q, G.b, G.q] : [G.q, G.a, G.q, G.b]));
    out[P] = best;
  });
  return out;
}

/* ---------- drawing the hint and the grid ---------- */
function snapOverlay(g, k) {
  const parts = [], col = '#ff2d78', u = (px) => (px / k).toFixed(2), A = (q) => img2art(q[0], q[1], g);
  if (prefs.grid.show && origImg) {
    const s = gridSize(), cr = cropRect(), sc = imgScale(g) * k;
    if (s * sc >= 6) {
      const x0 = Math.ceil(cr.x * iw / s) * s, x1 = (cr.x + cr.w) * iw, y0 = Math.ceil(cr.y * ih / s) * s, y1 = (cr.y + cr.h) * ih;
      let d = '';
      for (let x = x0; x <= x1; x += s) { const a = A([x, cr.y * ih]), b = A([x, y1]); d += 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'V' + b[1].toFixed(1); }
      for (let y = y0; y <= y1; y += s) { const a = A([cr.x * iw, y]), b = A([x1, y]); d += 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'H' + b[0].toFixed(1); }
      parts.push('<path d="' + d + '" stroke="#7a7a8c" stroke-opacity=".35" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/>');
    }
  }
  const h = ui.snapHint;
  if (h && (drag !== null || ['pen', 'shape', 'text'].includes(ui.tool))) {
    const [x, y] = A([h.x, h.y]), r = 6 / k;
    const line = (a, b, dash) => { const p1 = A(a), p2 = A(b); return '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="' + col + '" stroke-width="1" ' + (dash ? 'stroke-dasharray="4 3" ' : '') + 'vector-effect="non-scaling-stroke"/>'; };
    if (h.from) parts.push(line(h.from, [h.x, h.y], true));
    if (h.from2) parts.push(line(h.from2, [h.x, h.y], true));
    if (h.line) parts.push(line(h.line[0], h.line[1], false));
    if (h.gx) parts.push(line(h.gx, [h.x, h.y], true));
    if (h.gy) parts.push(line(h.gy, [h.x, h.y], true));
    // equal gaps: a line across each, with short ends
    if (h.marks) h.marks.forEach((m) => {
      const a = A([m[0], m[1]]), b = A([m[2], m[3]]), across = m[1] === m[3], t = r * 0.8;
      parts.push('<path d="M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1] + (across ? 'M' + a[0] + ' ' + (a[1] - t) + 'V' + (a[1] + t) + 'M' + b[0] + ' ' + (b[1] - t) + 'V' + (b[1] + t)
        : 'M' + (a[0] - t) + ' ' + a[1] + 'H' + (a[0] + t) + 'M' + (b[0] - t) + ' ' + b[1] + 'H' + (b[0] + t)) + '" stroke="' + col + '" stroke-width="1.4" fill="none" vector-effect="non-scaling-stroke"/>');
    });
    const s = 'fill="none" stroke="' + col + '" stroke-width="1.6" vector-effect="non-scaling-stroke"';
    const mark = {
      end: '<rect x="' + (x - r) + '" y="' + (y - r) + '" width="' + 2 * r + '" height="' + 2 * r + '" ' + s + '/>',
      point: '<rect x="' + (x - r * 0.7) + '" y="' + (y - r * 0.7) + '" width="' + 1.4 * r + '" height="' + 1.4 * r + '" ' + s + '/>',
      mid: '<path d="M' + x + ' ' + (y - r) + 'L' + (x + r) + ' ' + (y + r * 0.8) + 'L' + (x - r) + ' ' + (y + r * 0.8) + 'Z" ' + s + '/>',
      center: '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + s + '/><path d="M' + (x - r * 0.5) + ' ' + y + 'H' + (x + r * 0.5) + 'M' + x + ' ' + (y - r * 0.5) + 'V' + (y + r * 0.5) + '" ' + s + '/>',
      inter: '<path d="M' + (x - r) + ' ' + (y - r) + 'L' + (x + r) + ' ' + (y + r) + 'M' + (x + r) + ' ' + (y - r) + 'L' + (x - r) + ' ' + (y + r) + '" ' + s + '/>',
      perp: '<path d="M' + (x - r) + ' ' + (y - r) + 'V' + (y + r) + 'H' + (x + r) + 'M' + (x - r) + ' ' + y + 'H' + x + 'V' + (y + r) + '" ' + s + '/>',
      xext: '<path d="M' + (x - r) + ' ' + (y - r) + 'L' + (x + r) + ' ' + (y + r) + 'M' + (x + r) + ' ' + (y - r) + 'L' + (x - r) + ' ' + (y + r) + '" ' + s + '/><circle cx="' + x + '" cy="' + y + '" r="' + r * 0.45 + '" ' + s + '/>',
      tan: '<circle cx="' + x + '" cy="' + (y + r * 0.4) + '" r="' + r * 0.6 + '" ' + s + '/><path d="M' + (x - r) + ' ' + (y - r * 0.2) + 'H' + (x + r) + '" ' + s + '/>'
    }[h.kind] || '<path d="M' + (x - r) + ' ' + y + 'H' + (x + r) + 'M' + x + ' ' + (y - r) + 'V' + (y + r) + '" ' + s + '/>';
    if (h.kind !== 'spacing') parts.push(mark);
    const label = h.label || (h.kind === 'angle' ? h.deg + '°' + (h.onGuide ? ' · on guide' : h.gx || h.gy ? ' · lined up' : '') : SNAP_LABEL[h.kind]);
    // equal spacing: the label sits centered over the gap, clear of the boxes
    const sp = h.kind === 'spacing';
    if (!h.noLabel) parts.push('<text x="' + (sp ? x : x + r * 1.6) + '" y="' + (y - r * (sp ? 1.8 : 1.4)) + '"' + (sp ? ' text-anchor="middle"' : '') + ' font-size="' + u(12) + '" font-weight="600" font-family="Inter, sans-serif" fill="' + col + '" stroke="#fff" stroke-width="' + u(3.5) + '" paint-order="stroke">' + label + '</text>');
  }
  // points the pointer rested on: small crosses, lines are tracked from them
  if (snapTrack.length && prefs.snap.on && (drag !== null || ['pen', 'shape', 'text', 'direct'].includes(ui.tool))) {
    const r = 3.5 / k;
    snapTrack.forEach((q) => { const [x, y] = A([q.x, q.y]); parts.push('<path d="M' + (x - r) + ' ' + y + 'H' + (x + r) + 'M' + x + ' ' + (y - r) + 'V' + (y + r) + '" stroke="' + col + '" stroke-opacity=".7" stroke-width="1.2" fill="none" vector-effect="non-scaling-stroke"/>'); });
  }
  return parts.join('');
}
