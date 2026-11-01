/* ===================== Part 3d: snapping ===================== */
/* While drawing and editing vectors, the pointer snaps to useful places. Everything is in image pixels.
   snapAt(ix, iy, o) returns the snapped point and leaves a hint (ui.snapHint) that the overlay draws.
   o: { e: the pointer event (Alt turns snapping off), p: evPos(e), anchor: [x, y] the point drawn from,
        skipPath: a path left out (the one being edited), skipNode: [path, index], skipObjs: Set of object ids } */
const SNAP_KINDS = [
  ['end', 'End points'], ['point', 'Points and corners'], ['mid', 'Mid points'], ['center', 'Centers'], ['inter', 'Intersections'],
  ['ext', 'Extensions'], ['perp', 'Perpendicular'], ['tan', 'Tangent'], ['line', 'On lines'], ['baseline', 'Text baselines'],
  ['edge', 'Edges in the photo'], ['guides', 'Line up with other points'], ['angle', '15° angles'], ['grid', 'Grid']
];
const SNAP_DEFAULTS = { on: true, end: true, point: true, mid: true, center: true, inter: true, ext: true, perp: true, tan: true, line: true, baseline: true, edge: false, guides: true, angle: true, grid: false };
prefs.snap = Object.assign({}, SNAP_DEFAULTS, prefs.snap || {});
prefs.grid = Object.assign({ show: false, size: 0 }, prefs.grid || {});
/* the order wins when several snaps are about as close */
const SNAP_RANK = ['end', 'inter', 'center', 'mid', 'point', 'perp', 'tan', 'baseline', 'ext', 'edge', 'line'];
const SNAP_LABEL = { end: 'end point', point: 'point', mid: 'mid point', center: 'center', inter: 'intersection', ext: 'extension', perp: 'perpendicular', tan: 'tangent',
  line: 'on line', baseline: 'baseline', edge: 'photo edge', angle: 'angle', grid: 'grid', guides: 'lined up' };
function setSnap(k) { prefs.snap[k] = !prefs.snap[k]; savePrefs(); buildOptbar(); syncMenus(); }
function gridSize() { return prefs.grid.size > 0 ? prefs.grid.size : Math.max(4, Math.round(Math.min(iw, ih) / 24)); }

/* ---------- what can be snapped to, made once per change ---------- */
let snapCache = null;
function snapGeom() {
  const key = vecVer + '|' + objVer + '|' + doc.lines.paths.length + '|' + doc.objects.length + '|' + JSON.stringify(cropRect()) + '|' + iw + 'x' + ih;
  if (snapCache && snapCache.key === key) return snapCache;
  const pts = [], polys = [], ends = [], bases = [];
  const id = (x) => x;
  // lines of the Vector layer
  for (const path of doc.lines.paths) {
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
    if (path.closed && fl.length > 2) { let cx = 0, cy = 0; fl.forEach((q) => { cx += q[0]; cy += q[1]; }); pts.push({ x: cx / fl.length, y: cy / fl.length, kind: 'center', src: path }); }
    if (!path.closed && fl.length > 1) {
      // the direction a line leaves its ends, for extensions
      const dir = (a, b) => { const L = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [(a[0] - b[0]) / L, (a[1] - b[1]) / L]; };
      const k = Math.min(3, fl.length - 1);
      ends.push({ x: fl[0][0], y: fl[0][1], u: dir(fl[0], fl[k]), src: path });
      ends.push({ x: fl[fl.length - 1][0], y: fl[fl.length - 1][1], u: dir(fl[fl.length - 1], fl[fl.length - 1 - k]), src: path });
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
  snapCache = { key, pts, polys, ends, bases };
  return snapCache;
}
const ptObj = (q) => ({ x: q[0], y: q[1] });

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
function snapAt(ix, iy, o) {
  o = o || {};
  ui.snapHint = null;
  const S = prefs.snap;
  if (!S.on || !origImg || (o.e && o.e.altKey)) return [ix, iy];
  const tol = snapTol(o.p), G = snapGeom();
  const skipObj = (q) => q.obj != null && o.skipObjs && o.skipObjs.has(q.obj);
  const skipSrc = (q) => (o.skipPath && q.src === o.skipPath) || skipObj(q);
  const cands = [];
  const add = (x, y, kind, extra) => { const d = Math.hypot(x - ix, y - iy); if (d <= tol) cands.push(Object.assign({ x, y, kind, d }, extra || {})); };

  // points: ends, corners, middles, centers
  for (const q of G.pts) {
    if (!S[q.kind] || skipObj(q)) continue;
    if (o.skipPath && q.src === o.skipPath && !(o.skipNode && q.i != null && q.i !== o.skipNode[1])) continue;
    if (Math.abs(q.x - ix) > tol || Math.abs(q.y - iy) > tol) continue;
    add(q.x, q.y, q.kind);
  }
  // the line being drawn with the pen: its own points, so it can close or meet itself
  if (o.live) o.live.forEach((q, i) => S.point && add(q[0], q[1], i === 0 ? 'end' : 'point'));

  // pieces of lines near the pointer, for intersections, perpendicular, tangent and "on line"
  const near = [];
  for (const P of G.polys) {
    if (skipSrc(P)) continue;
    const pts = P.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (Math.min(a[0], b[0]) - tol * 2 > ix || Math.max(a[0], b[0]) + tol * 2 < ix || Math.min(a[1], b[1]) - tol * 2 > iy || Math.max(a[1], b[1]) + tol * 2 < iy) continue;
      const q = nearOnSeg(ix, iy, a[0], a[1], b[0], b[1]);
      const d = Math.hypot(q[0] - ix, q[1] - iy);
      if (d <= tol * 2) near.push({ P, i, a, b, q, d });
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
  if (S.ext) for (const E of G.ends) {
    if (skipSrc(E)) continue;
    const vx = ix - E.x, vy = iy - E.y, t = vx * E.u[0] + vy * E.u[1];
    if (t <= tol) continue;
    const px = E.x + E.u[0] * t, py = E.y + E.u[1] * t;
    add(px, py, 'ext', { from: [E.x, E.y] });
  }
  if (S.baseline) for (const B of G.bases) {
    if (skipObj(B)) continue;
    const q = nearOnSeg(ix, iy, B.a[0], B.a[1], B.b[0], B.b[1]);
    add(q[0], q[1], 'baseline', { line: [B.a, B.b] });
  }
  if (S.edge) {
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
    ui.snapHint = { x: c.x, y: c.y, kind: c.kind, from: c.from, line: c.line };
    return [c.x, c.y];
  }
  // directions from the anchor: 15 degree steps (Shift always)
  if (an && (S.angle || (o.e && o.e.shiftKey))) {
    const dx = ix - an[0], dy = iy - an[1], L = Math.hypot(dx, dy);
    if (L > tol) {
      const a = Math.atan2(dy, dx), st = Math.PI / 12, q = Math.round(a / st) * st;
      if ((o.e && o.e.shiftKey) || Math.abs(a - q) < 3.5 * Math.PI / 180) {
        const x = an[0] + Math.cos(q) * L, y = an[1] + Math.sin(q) * L;
        ui.snapHint = { x, y, kind: 'angle', from: an, deg: Math.round(-q * 180 / Math.PI) };
        return [x, y];
      }
    }
  }
  // line up with other points, and the grid, each direction on its own
  let x = ix, y = iy, gx = null, gy = null, bestX = tol, bestY = tol;
  if (S.guides) {
    const refs = G.pts.filter((q) => (q.kind === 'end' || q.kind === 'center' || q.kind === 'point') && !skipObj(q) && !(o.skipPath && q.src === o.skipPath && o.skipNode && q.i === o.skipNode[1]));
    if (an) refs.push({ x: an[0], y: an[1] });
    for (const q of refs) {
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
    ui.snapHint = { x, y, kind: (gx && gx.grid) || (gy && gy.grid) ? 'grid' : 'guides', gx: gx && !gx.grid ? [gx.x, gx.y] : null, gy: gy && !gy.grid ? [gy.x, gy.y] : null };
    return [x, y];
  }
  return [ix, iy];
}
/* moving shapes: the moved box's corners, middles and center snap; the shapes move by the same amount */
function snapMove(objs, dx, dy, e, p) {
  ui.snapHint = null;
  if (!prefs.snap.on || (e && e.altKey) || (e && e.shiftKey)) return [dx, dy];
  const skipObjs = new Set(objs.map((o) => o.id));
  const b = objBounds(objs);
  const keys = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.5, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]].map(([u, v]) => [b.x + u * b.w + dx, b.y + v * b.h + dy]);
  let best = null;
  const tol = snapTol(p);
  for (const k of keys) {
    const r = snapAt(k[0], k[1], { p, skipObjs });
    if (!ui.snapHint) continue;
    const hint = ui.snapHint;
    // a real point (an end, a center) wins over just lining up or the grid
    const d = Math.hypot(r[0] - k[0], r[1] - k[1]) / tol + (hint.kind === 'guides' || hint.kind === 'grid' ? 1 : 0);
    if (!best || d < best.d) best = { d, ox: r[0] - k[0], oy: r[1] - k[1], hint };
  }
  ui.snapHint = best ? best.hint : null;
  return best ? [dx + best.ox, dy + best.oy] : [dx, dy];
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
  if (h && drag !== null || h && (ui.tool === 'pen' && pen)) {
    const [x, y] = A([h.x, h.y]), r = 5 / k;
    const line = (a, b, dash) => { const p1 = A(a), p2 = A(b); return '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="' + col + '" stroke-width="1" ' + (dash ? 'stroke-dasharray="4 3" ' : '') + 'vector-effect="non-scaling-stroke"/>'; };
    if (h.from) parts.push(line(h.from, [h.x, h.y], true));
    if (h.line) parts.push(line(h.line[0], h.line[1], false));
    if (h.gx) parts.push(line(h.gx, [h.x, h.y], true));
    if (h.gy) parts.push(line(h.gy, [h.x, h.y], true));
    const s = 'fill="none" stroke="' + col + '" stroke-width="1.6" vector-effect="non-scaling-stroke"';
    const mark = {
      end: '<rect x="' + (x - r) + '" y="' + (y - r) + '" width="' + 2 * r + '" height="' + 2 * r + '" ' + s + '/>',
      point: '<rect x="' + (x - r * 0.7) + '" y="' + (y - r * 0.7) + '" width="' + 1.4 * r + '" height="' + 1.4 * r + '" ' + s + '/>',
      mid: '<path d="M' + x + ' ' + (y - r) + 'L' + (x + r) + ' ' + (y + r * 0.8) + 'L' + (x - r) + ' ' + (y + r * 0.8) + 'Z" ' + s + '/>',
      center: '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + s + '/><path d="M' + (x - r * 0.5) + ' ' + y + 'H' + (x + r * 0.5) + 'M' + x + ' ' + (y - r * 0.5) + 'V' + (y + r * 0.5) + '" ' + s + '/>',
      inter: '<path d="M' + (x - r) + ' ' + (y - r) + 'L' + (x + r) + ' ' + (y + r) + 'M' + (x + r) + ' ' + (y - r) + 'L' + (x - r) + ' ' + (y + r) + '" ' + s + '/>',
      perp: '<path d="M' + (x - r) + ' ' + (y - r) + 'V' + (y + r) + 'H' + (x + r) + 'M' + (x - r) + ' ' + y + 'H' + x + 'V' + (y + r) + '" ' + s + '/>',
      tan: '<circle cx="' + x + '" cy="' + (y + r * 0.4) + '" r="' + r * 0.6 + '" ' + s + '/><path d="M' + (x - r) + ' ' + (y - r * 0.2) + 'H' + (x + r) + '" ' + s + '/>'
    }[h.kind] || '<path d="M' + (x - r) + ' ' + y + 'H' + (x + r) + 'M' + x + ' ' + (y - r) + 'V' + (y + r) + '" ' + s + '/>';
    parts.push(mark);
    const label = h.kind === 'angle' ? h.deg + '°' : SNAP_LABEL[h.kind];
    parts.push('<text x="' + (x + r * 1.6) + '" y="' + (y - r * 1.4) + '" font-size="' + u(11) + '" font-family="Inter, sans-serif" fill="' + col + '" stroke="#fff" stroke-width="' + u(3) + '" paint-order="stroke">' + label + '</text>');
  }
  return parts.join('');
}
