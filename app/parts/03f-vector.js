/* ===================== Part 3f: vector paths: paint, groups, text to paths, distort ===================== */
/* Paths live in doc.lines.paths, in image pixels. New, optional fields (old projects simply do not have them):
   group     paths that share it form one compound shape; they are selected, moved, filled and distorted together.
             The paint of a group (fill, fillRule, stroke, sw, opacity) is the paint of its first path.
   fill      a color string, or { type: 'linear', angle, stops } or { type: 'radial', cx, cy, r, stops },
             stops a list of [offset, '#hex'].
   fillRule  'evenodd' keeps the holes of letters open; 'nonzero'. Paths without it use 'nonzero', as before.
   fillOnly  the fill shows even without a stroke. Older paths showed their fill only with a stroke. */
ui.selPaths = []; ui.inGroup = null;
ui.vec = { keep: false, fit: true };
ui.distort = { op: 'bulge', amt: 0, R: 0, angle: 0, taper: false, px: 0, py: 0, key: '' };

/* ---------------- paint ---------------- */
const pathFillShown = (p) => !!(p.fill && p.closed && (p.stroke || p.fillOnly));
const FILL_PRESETS = [
  ['Ember', [[0, '#6f3b1f'], [0.55, '#c8553d'], [1, '#e8a33d']]],
  ['Ocean', [[0, '#14213d'], [1, '#0a84ff']]],
  ['Sunset', [[0, '#ffd166'], [1, '#c8553d']]],
  ['Mint', [[0, '#0b6e4f'], [1, '#9ee6c0']]]
];
function pathsBounds(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  list.forEach((p) => flatten(p, (a, b) => [a, b], 1).forEach(([a, b]) => { if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; }));
  if (x0 === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/* the gradient line or circle in image pixels, shared by the canvas, SVG and PDF so all three draw the same thing */
function gradGeom(f, b) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  if (f.type === 'radial') return { cx: cx + (f.cx ?? 0) * b.w, cy: cy + (f.cy ?? 0) * b.h, r: Math.max(1, Math.hypot(b.w, b.h) / 2 * (f.r ?? 1)) };
  const a = (f.angle || 0) * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
  const half = Math.max(0.5, (Math.abs(ux) * b.w + Math.abs(uy) * b.h) / 2);
  return { x1: cx - ux * half, y1: cy - uy * half, x2: cx + ux * half, y2: cy + uy * half };
}
/* a gradient fill turns and flips with its shape: deg turns it (clockwise on screen), flip is 'x' or 'y'.
   Plain color fills have nothing to turn. */
function turnFill(p, deg, flip) {
  const f = p && p.fill;
  if (!f || typeof f !== 'object' || (!deg && !flip)) return;
  if (f.type === 'radial') {
    let x = f.cx ?? 0, y = f.cy ?? 0;
    if (deg) { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); [x, y] = [x * c - y * s, x * s + y * c]; }
    if (flip === 'x') x = -x;
    if (flip === 'y') y = -y;
    f.cx = Math.abs(x) < 1e-9 ? 0 : x; f.cy = Math.abs(y) < 1e-9 ? 0 : y;
  } else {
    let a = (f.angle || 0) + (deg || 0);
    if (flip === 'x') a = 180 - a;
    if (flip === 'y') a = -a;
    f.angle = ((a % 360) + 540) % 360 - 180;
  }
}
const fillStops = (f) => (f && Array.isArray(f.stops) && f.stops.length ? f.stops : [[0, '#111111'], [1, '#ffffff']]);
function paintOf(x, f, b) {
  if (!f || typeof f === 'string') return f;
  const G = gradGeom(f, b);
  const gr = f.type === 'radial' ? x.createRadialGradient(G.cx, G.cy, 0, G.cx, G.cy, G.r) : x.createLinearGradient(G.x1, G.y1, G.x2, G.y2);
  fillStops(f).forEach(([o, c]) => gr.addColorStop(clamp(o, 0, 1), c));
  return gr;
}
/* a color that stands for a fill, for swatches and contrast: a gradient counts as its middle stop */
function fillColorOf(f) {
  if (!f) return null;
  if (typeof f === 'string') return f;
  const st = fillStops(f); return st[Math.floor((st.length - 1) / 2)][1];
}
/* paths that share p.group are one compound shape, drawn with one fill, so the holes of letters stay open */
function pathUnits(paths) {
  const units = [], byGroup = new Map();
  for (const p of paths) {
    if (p.hidden) continue;
    if (p.group == null) { units.push([p]); continue; }
    let u = byGroup.get(p.group);
    if (!u) { u = []; byGroup.set(p.group, u); units.push(u); }
    u.push(p);
  }
  return units.filter((u) => u[0].stroke || u.some(pathFillShown));
}
const unitRule = (lead) => lead.fillRule || (lead.group != null ? 'evenodd' : 'nonzero');
function unitTrace(x, unit) {
  x.beginPath();
  unit.forEach((p) => { const pts = flatten(p, (a, c) => [a, c], 1); if (pts.length < 2) return; pts.forEach(([a, c], i) => (i ? x.lineTo(a, c) : x.moveTo(a, c))); if (p.closed) x.closePath(); });
}
/* draws the paths, the context maps image pixels to the target */
function drawPathUnits(x, paths) {
  for (const unit of pathUnits(paths)) {
    const lead = unit[0], fp = unit.find(pathFillShown);
    unitTrace(x, unit);
    x.globalAlpha = lead.opacity ?? 1;
    if (fp) { x.fillStyle = paintOf(x, fp.fill, pathsBounds(unit)); x.fill(unitRule(lead)); }
    if (lead.stroke) { x.strokeStyle = lead.stroke; x.lineWidth = lead.sw || lead.width || 4; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); }
    x.globalAlpha = 1;
  }
}
function pathD(p) {
  const N = p.nodes; if (!N || N.length < 2) return '';
  let d = 'M' + nf(N[0].x) + ' ' + nf(N[0].y);
  const segs = p.closed ? N.length : N.length - 1;
  for (let i = 0; i < segs; i++) { const a = N[i], b = N[(i + 1) % N.length]; d += 'C' + [a.x + (a.ox || 0), a.y + (a.oy || 0), b.x + (b.ix || 0), b.y + (b.iy || 0), b.x, b.y].map(nf).join(' '); }
  return p.closed ? d + 'Z' : d;
}
/* one <path> per shape or group, with its gradient (ids are unique per file: 'vg' and the path id) */
function unitSVG(unit) {
  const lead = unit[0], fp = unit.find(pathFillShown);
  let defs = '', fill = 'none';
  if (fp) {
    const f = fp.fill;
    if (typeof f === 'string') fill = f;
    else {
      const G = gradGeom(f, pathsBounds(unit)), id = 'vg' + lead.id;
      const st = fillStops(f).map(([o, c]) => '<stop offset="' + nf(clamp(o, 0, 1)) + '" stop-color="' + c + '"/>').join('');
      defs = f.type === 'radial' ? '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + nf(G.cx) + '" cy="' + nf(G.cy) + '" r="' + nf(G.r) + '">' + st + '</radialGradient>'
        : '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + nf(G.x1) + '" y1="' + nf(G.y1) + '" x2="' + nf(G.x2) + '" y2="' + nf(G.y2) + '">' + st + '</linearGradient>';
      fill = 'url(#' + id + ')';
    }
  }
  const d = unit.map(pathD).filter(Boolean).join(' ');
  if (!d) return '';
  return defs + '<path d="' + d + '" fill="' + fill + '"' + (fp ? ' fill-rule="' + unitRule(lead) + '"' : '') + (lead.stroke ? ' stroke="' + lead.stroke + '" stroke-width="' + nf(lead.sw || lead.width || 4) + '" stroke-linecap="round" stroke-linejoin="round"' : '')
    + ((lead.opacity ?? 1) < 1 ? ' opacity="' + nf(lead.opacity) + '"' : '') + '/>';
}

/* ---------------- selection of paths and groups ---------------- */
/* ui.selPaths holds the selected path ids; ui.selPath stays the first one, so older code keeps working.
   Code that sets ui.selPath on its own selects just that one path. */
function selectedPathIds() {
  if (ui.selPath == null) return [];
  return ui.selPaths[0] === ui.selPath ? ui.selPaths.slice() : [ui.selPath];
}
function selectedPaths() { return selectedPathIds().map(findPath).filter(Boolean); }
function setPathSel(ids) { ui.selPaths = ids.slice(); ui.selPath = ids.length ? ids[0] : null; ui.selNode = null; }
function groupMembers(p) { return p.group == null ? [p] : doc.lines.paths.filter((q) => q.group === p.group); }
function expandGroups(list) {
  const ids = [];
  list.forEach((p) => groupMembers(p).forEach((q) => { if (!ids.includes(q.id)) ids.push(q.id); }));
  return ids;
}
const selGroupId = () => { const g = selectedPaths().find((p) => p.group != null); return g ? g.group : null; };
/* the path under the pointer: on its line, or inside a filled shape */
function hitPath(p) {
  const near = nearestPath(p, 7);
  if (near) return near;
  const [ix, iy] = toImg(p), units = pathUnits(doc.lines.paths);
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i];
    if (!u.some(pathFillShown)) continue;
    unitTrace(mctx2, u);
    if (mctx2.isPointInPath(ix, iy, unitRule(u[0]))) return u[0];
  }
  return null;
}
/* the box of the selected paths, as an object box, so the Select tool can show its handles */
function pathSelBox() {
  const sel = selectedPaths();
  if (!sel.length || ui.selObjs.length) return null;
  const b = pathsBounds(sel);
  if (b.w < 0.5 && b.h < 0.5) return null;
  return { x: b.x, y: b.y, w: Math.max(b.w, 0.5), h: Math.max(b.h, 0.5), rot: 0 };
}
/* every point and handle of the paths, from a saved copy, through f (an affine map keeps curves exact) */
function mapPathsFrom(list, base, f) {
  list.forEach((p, i) => {
    p.nodes = base[i].map((n0) => {
      const n = Object.assign({}, n0), [x, y] = f(n0.x, n0.y), [ax, ay] = f(n0.x + (n0.ox || 0), n0.y + (n0.oy || 0)), [bx, by] = f(n0.x + (n0.ix || 0), n0.y + (n0.iy || 0));
      n.x = x; n.y = y; n.ox = ax - x; n.oy = ay - y; n.ix = bx - x; n.iy = by - y;
      return n;
    });
  });
}
const nodesOf = (list) => list.map((p) => clone(p.nodes));

/* ---------------- groups ---------------- */
/* a shape object as a path in image pixels, with its paint */
function shapeToPath(o) {
  const w = o.w / 2, h = o.h / 2, K = 0.5523;
  let nodes;
  const node = (x, y, ix, iy, ox, oy) => ({ x, y, ix: ix || 0, iy: iy || 0, ox: ox || 0, oy: oy || 0 });
  if (o.type === 'ellipse') nodes = [node(0, -h, -w * K, 0, w * K, 0), node(w, 0, 0, -h * K, 0, h * K), node(0, h, w * K, 0, -w * K, 0), node(-w, 0, 0, h * K, 0, -h * K)];
  else if (o.type === 'rect') {
    const r = Math.min(o.radius || 0, w, h), c = r * K;
    nodes = r > 0 ? [node(-w + r, -h, -c, 0), node(w - r, -h, 0, 0, c, 0), node(w, -h + r, 0, -c), node(w, h - r, 0, 0, 0, c), node(w - r, h, c, 0), node(-w + r, h, 0, 0, -c, 0), node(-w, h - r, 0, c), node(-w, -h + r, 0, 0, 0, -c)]
      : [node(-w, -h), node(w, -h), node(w, h), node(-w, h)];
  } else nodes = polyPoints(o).map(([a, b]) => node(a, b));
  const fx = o.flipX ? -1 : 1, fy = o.flipY ? -1 : 1;
  const map = (lx, ly) => fromLocal(o, lx * fx, ly * fy);
  nodes = nodes.map((n) => { const [x, y] = map(n.x, n.y), [ax, ay] = map(n.x + n.ox, n.y + n.oy), [bx, by] = map(n.x + n.ix, n.y + n.iy); return { x, y, ox: ax - x, oy: ay - y, ix: bx - x, iy: by - y }; });
  return { id: uid++, closed: true, traced: false, text: '', width: newLineWidth(), nodes, fill: o.fill || null, fillOnly: true, fillRule: 'nonzero',
    stroke: o.stroke && o.sw > 0 ? o.stroke : null, sw: o.sw, opacity: o.opacity ?? 1 };
}
const PAINT_KEYS = ['fill', 'fillRule', 'fillOnly', 'stroke', 'sw', 'opacity'];
function copyPaint(from, to) { PAINT_KEYS.forEach((k) => { if (from[k] === undefined) delete to[k]; else to[k] = clone(from[k]); }); }
function groupable() {
  const units = new Set(selectedPaths().map((p) => (p.group != null ? 'g' + p.group : 'p' + p.id)));
  return units.size + selectedObjs().filter((o) => o.type !== 'image').length > 1;
}
function groupSelection() {
  const objs = selectedObjs().filter((o) => o.type !== 'image');
  const texts = objs.filter((o) => o.type === 'text'), shapes = objs.filter((o) => o.type !== 'text');
  const before = expandGroups(selectedPaths());
  const finish = (extraIds) => {
    const made = shapes.filter((o) => doc.objects.includes(o)).map(shapeToPath);
    if (made.length) { const gone = new Set(shapes.map((o) => o.id)); doc.objects = doc.objects.filter((o) => !gone.has(o.id)); doc.lines.paths.push(...made); }
    const list = [...new Set(before.concat(extraIds || [], made.map((p) => p.id)))].map(findPath).filter(Boolean);
    if (list.length < 2) { toast('Select two or more lines or shapes to group.'); linesChanged(); return; }
    const g = uid++;
    list.forEach((p) => { p.group = g; });
    // a group is drawn where its first path is, so its paths stay together in the stacking order
    reorderGroup(g, list);
    const painted = list.find((p) => pathFillShown(p) || p.stroke);
    if (painted && painted !== list[0]) copyPaint(painted, list[0]);
    if (list[0].fill && !list[0].fillRule) list[0].fillRule = 'evenodd';
    setPathSel(list.map((p) => p.id)); ui.selObjs = []; ui.inGroup = null;
    if (ui.tool !== 'select') setTool('select');
    objVer++; doc.lines.visible = true;
    linesChanged(); if (['photo', 'lines'].includes(ui.tab)) buildPanel(); buildOptbar();
    toast('Grouped ' + list.length + ' parts', { label: 'Undo', fn: undo });
  };
  clearTimeout(histTimer); commitHistory();
  // text is turned into outlines first, then grouped with the rest
  if (texts.length) convertTextToPaths('outline', { list: texts, keep: false, fit: false, quiet: true, then: finish });
  else finish([]);
}
/* puts all paths of group g where the first of them was, in the given order */
function reorderGroup(g, members) {
  const all = doc.lines.paths;
  const at = all.findIndex((p) => p.group === g);
  const rest = all.filter((p) => p.group !== g);
  const before = all.slice(0, at).filter((p) => p.group !== g).length;
  doc.lines.paths = rest.slice(0, before).concat(members, rest.slice(before));
}
function ungroupSelection() {
  const groups = [...new Set(selectedPaths().map((p) => p.group).filter((g) => g != null))];
  if (!groups.length) { toast('Select a group first.'); return; }
  let n = 0;
  groups.forEach((g) => {
    const members = doc.lines.paths.filter((p) => p.group === g), lead = members[0];
    members.forEach((p) => { if (p !== lead) copyPaint(lead, p); if (!p.fillRule && p.fill) p.fillRule = 'nonzero'; delete p.group; n++; });
    if (!lead.fillRule && lead.fill) lead.fillRule = 'evenodd';
  });
  ui.inGroup = null;
  linesChanged(); buildPanel(); buildOptbar();
  toast('Ungrouped ' + n + ' parts', { label: 'Undo', fn: undo });
}

/* ---------------- text to paths ---------------- */
/* marching squares on the alpha of the letters: closed contours at the 50% edge, exact to a fraction of a pixel */
const MS_NEXT = [null, [[3, 2]], [[2, 1]], [[3, 1]], [[1, 0]], [[3, 0], [1, 2]], [[2, 0]], [[3, 0]], [[0, 3]], [[0, 2]], [[0, 1], [2, 3]], [[0, 1]], [[1, 3]], [[1, 2]], [[2, 3]], null];
const MS_STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]], MS_OPP = [2, 3, 0, 1];
function* contoursGen(a, w, h) {
  const T = 128, CW = w + 1;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : a[y * w + x]);
  const caseOf = (x, y) => (at(x, y) >= T ? 8 : 0) | (at(x + 1, y) >= T ? 4 : 0) | (at(x + 1, y + 1) >= T ? 2 : 0) | (at(x, y + 1) >= T ? 1 : 0);
  const lerp = (v0, v1) => (T - v0) / ((v1 - v0) || 1);
  // a point on edge e (0 top, 1 right, 2 bottom, 3 left) of cell (x, y); the corners of a cell are pixel centers
  const ept = (x, y, e) => {
    if (e === 0) return [x + lerp(at(x, y), at(x + 1, y)) + 0.5, y + 0.5];
    if (e === 1) return [x + 1.5, y + lerp(at(x + 1, y), at(x + 1, y + 1)) + 0.5];
    if (e === 2) return [x + lerp(at(x, y + 1), at(x + 1, y + 1)) + 0.5, y + 1.5];
    return [x + 0.5, y + lerp(at(x, y), at(x, y + 1)) + 0.5];
  };
  const seen = new Uint8Array(CW * (h + 1)), loops = [];
  for (let y = -1; y < h; y++) {
    if ((y & 31) === 0) yield { stage: 'Finding the outlines', p: (y + 1) / (h + 1) };
    for (let x = -1; x < w; x++) {
      const c = caseOf(x, y); const nx = MS_NEXT[c]; if (!nx) continue;
      for (const [e0] of nx) {
        if (seen[(y + 1) * CW + x + 1] & (1 << e0)) continue;
        const pts = []; let cx = x, cy = y, ein = e0, guard = 0;
        while (guard++ < 4e6) {
          const ci = (cy + 1) * CW + cx + 1;
          if (seen[ci] & (1 << ein)) break;
          seen[ci] |= 1 << ein;
          const pair = (MS_NEXT[caseOf(cx, cy)] || []).find((q) => q[0] === ein); if (!pair) break;
          pts.push(ept(cx, cy, pair[1]));
          cx += MS_STEP[pair[1]][0]; cy += MS_STEP[pair[1]][1]; ein = MS_OPP[pair[1]];
        }
        if (pts.length > 4) loops.push(pts);
      }
    }
  }
  return loops;
}
function rdpLoop(pts, eps) { // closed: split at the far point so both halves keep their ends
  let far = 0, fd = -1;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = rdp2(pts.slice(0, far + 1), eps), b = rdp2(pts.slice(far).concat([pts[0]]), eps);
  return a.concat(b.slice(1, -1));
}
/* corners stay sharp, the rest gets smooth handles: Catmull-Rom tangents only where the turn is gentle */
function fitNodes(pts, closed, cornerDeg) {
  const n = pts.length, lim = (cornerDeg ?? 40) * Math.PI / 180;
  return pts.map((p, i) => {
    const A = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], B = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const v1 = [p[0] - A[0], p[1] - A[1]], v2 = [B[0] - p[0], B[1] - p[1]];
    const turn = Math.abs(Math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1]));
    const end = !closed && (i === 0 || i === n - 1);
    if (end || turn > lim) return { x: p[0], y: p[1], ix: 0, iy: 0, ox: 0, oy: 0 };
    const tx = B[0] - A[0], ty = B[1] - A[1], L = Math.hypot(tx, ty) || 1, l1 = Math.hypot(v1[0], v1[1]) / 3, l2 = Math.hypot(v2[0], v2[1]) / 3;
    return { x: p[0], y: p[1], ix: -tx / L * l1, iy: -ty / L * l1, ox: tx / L * l2, oy: ty / L * l2 };
  });
}
/* the text drawn upright in black, larger than on the artwork when it is small, with a map back to image pixels.
   The whole line is drawn by the browser, so Urdu and Arabic keep their joined words. */
function textRaster(o) {
  const ext = (o.w + o.size * 0.8) * (o.h + o.size * 0.8);
  const k = Math.min(clamp(160 / o.size, 1, 6), Math.sqrt(3e6 / Math.max(1, ext)), 8000 / (o.w + o.size * 0.8), 8000 / (o.h + o.size * 0.8));
  const pad = Math.ceil(o.size * 0.4 * k);
  const W = Math.ceil(o.w * k) + pad * 2, H = Math.ceil(o.h * k) + pad * 2;
  const c = mk(W, H), x = c.getContext('2d', { willReadFrequently: true });
  x.setTransform(k, 0, 0, k, W / 2, H / 2);
  drawObject(x, Object.assign({}, o, { x: -o.w / 2, y: -o.h / 2, rot: 0, flipX: false, flipY: false, opacity: 1, _editing: false, fill: o.fill ? '#000' : null, stroke: o.stroke && o.sw > 0 ? '#000' : null }));
  const d = x.getImageData(0, 0, W, H).data, a = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3];
  const toImg = (px, py) => fromLocal(o, (px - W / 2) / k * (o.flipX ? -1 : 1), (py - H / 2) / k * (o.flipY ? -1 : 1));
  return { a, W, H, k, toImg };
}
/* kind 'outline': the edges of the letters as closed paths, one group, filled even-odd.
   kind 'centerline': the middle of each stroke as open lines, as wide as the stroke. */
function* textToPathsGen(objs, kind) {
  const res = [];
  for (let oi = 0; oi < objs.length; oi++) {
    const o = objs[oi], R = textRaster(o), grp = uid++, made = [];
    const part = (a, b) => (v) => ({ stage: kind === 'outline' ? 'Finding the outlines' : 'Finding the middle of the strokes', p: (oi + a + (b - a) * clamp(v.p || 0, 0, 1)) / objs.length });
    yield part(0, 0)({ p: 0 });
    if (kind === 'outline') {
      const loops = yield* remapGen(contoursGen(R.a, R.W, R.H), part(0, 0.8));
      for (let i = 0; i < loops.length; i++) {
        if ((i & 15) === 15) yield part(0.8, 1)({ p: i / loops.length });
        const s = rdpLoop(loops[i], 0.45);
        if (s.length < 3) continue;
        made.push({ id: uid++, group: grp, closed: true, traced: false, text: '', width: Math.max(4, Math.round(o.size / 8)),
          fill: outlineFill(o), fillOnly: true, fillRule: 'evenodd', stroke: o.stroke && o.sw > 0 ? o.stroke : null, sw: o.sw, opacity: o.opacity ?? 1,
          nodes: fitNodes(s.map(([px, py]) => R.toImg(px, py)), true, 38) });
      }
    } else {
      const n = R.W * R.H, lum = new Float32Array(n);
      for (let i = 0; i < n; i++) lum[i] = 1 - R.a[i] / 255;
      const paths = yield* remapGen(C.traceGen({ w: R.W, h: R.H, lum, keep: null }, { kind: 'dark', threshold: 0.5, skipWide: false, minLen: 4, smooth: 1, simplify: 0.6, spurK: 1.2 }), part(0, 1));
      for (const p of paths) {
        const avgR = p.pts.reduce((s, q) => s + q[2], 0) / p.pts.length / R.k;
        const pts = p.closed ? rdpLoop(p.pts, 0.8) : rdp2(p.pts, 0.8);
        if (pts.length < 2) continue;
        made.push({ id: uid++, group: grp, closed: !!p.closed, traced: false, text: '', width: Math.max(2, avgR * 2), fill: null,
          stroke: o.fill || o.stroke || defaultInk(), sw: Math.max(1, avgR * 2), opacity: o.opacity ?? 1,
          nodes: fitNodes(pts.map(([px, py]) => R.toImg(px, py)), !!p.closed, 50) });
      }
    }
    res.push({ o, made, group: grp });
  }
  return res;
}
/* text in the plain default ink gets a warm gradient as outlines, so the first result already looks designed;
   a color you chose is kept */
function outlineFill(o) {
  const c = String(o.fill || '').toLowerCase();
  return !c || c === '#111111' || c === '#ffffff' ? defaultGradient('linear') : o.fill;
}
function* remapGen(gen, f) { let r; while (!(r = gen.next()).done) yield f(r.value || {}); return r.value; }
/* scales a list of paths about their middle so they fill most of the artboard, and centers them */
function fitPathsToArtboard(list, frac) {
  const b = pathsBounds(list); if (b.w < 1 || b.h < 1) return;
  const cr = cropRect(), AW = cr.w * iw, AH = cr.h * ih, s = Math.min(AW * (frac || 0.8) / b.w, AH * (frac || 0.8) / b.h);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, tx = cr.x * iw + AW / 2, ty = cr.y * ih + AH / 2;
  mapPathsFrom(list, nodesOf(list), (x, y) => [tx + (x - cx) * s, ty + (y - cy) * s]);
  list.forEach((p) => { if (p.sw) p.sw *= s; if (p.width) p.width *= s; });
}
/* the selected text becomes paths. opt: keep (leave the text too), fit (fill the artboard), list, then(ids), quiet */
function convertTextToPaths(kind, opt) {
  opt = opt || {};
  const list = opt.list || selectedObjs().filter((o) => o.type === 'text');
  if (!list.length) { toast('Select some text first, with the Select tool (V).'); return false; }
  const keep = opt.keep ?? ui.vec.keep, fit = opt.fit ?? ui.vec.fit;
  clearTimeout(histTimer); commitHistory();
  commitTextEdit();
  runJob('vector', textToPathsGen(list, kind), (res) => {
    statusIdle();
    const made = [].concat(...res.map((r) => r.made));
    if (!made.length) { toast('No letters were found in that text.'); return; }
    if (fit) fitPathsToArtboard(made, 0.8);
    // the new paths take the place of the text in the stacking order: on top of the lines
    doc.lines.paths.push(...made);
    if (!keep) { const ids = new Set(list.map((o) => o.id)); doc.objects = doc.objects.filter((o) => !ids.has(o.id)); ui.selObjs = ui.selObjs.filter((id) => !ids.has(id)); }
    if (list.some((o) => o.layer === 'photo') && !keep) refreshPhotoObjects(true);
    doc.lines.visible = true; objVer++;
    setPathSel(made.map((p) => p.id)); ui.selObjs = []; ui.inGroup = null;
    if (opt.then) { opt.then(made.map((p) => p.id)); return; }
    if (ui.tool !== 'select') setTool('select');
    linesChanged(); buildStack(); if (['photo', 'lines'].includes(ui.tab)) buildPanel(); buildOptbar();
    if (!opt.quiet) toast((kind === 'outline' ? 'Turned the text into ' + made.length + ' outlines' : 'Turned the text into ' + made.length + ' center lines') + (fit ? ', sized to the artboard.' : '.'), { label: 'Undo', fn: undo });
  });
  return true;
}
const hasTextSel = () => selectedObjs().some((o) => o.type === 'text');

/* ---------------- distortions around a pivot ---------------- */
function splitSeg(a, b) { // de Casteljau at t = 0.5, exact
  const P0 = [a.x, a.y], P1 = [a.x + (a.ox || 0), a.y + (a.oy || 0)], P2 = [b.x + (b.ix || 0), b.y + (b.iy || 0)], P3 = [b.x, b.y];
  const m = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  const q0 = m(P0, P1), q1 = m(P1, P2), q2 = m(P2, P3), r0 = m(q0, q1), r1 = m(q1, q2), s = m(r0, r1);
  a.ox = q0[0] - a.x; a.oy = q0[1] - a.y; b.ix = q2[0] - b.x; b.iy = q2[1] - b.y;
  return { x: s[0], y: s[1], ix: r0[0] - s[0], iy: r0[1] - s[1], ox: r1[0] - s[0], oy: r1[1] - s[1] };
}
/* more points on long pieces, so a strong bend still follows the map; the shape itself does not change */
function densify(p, maxLen) {
  const N = p.nodes; if (!N || N.length < 2) return;
  const out2 = [], segs = p.closed ? N.length : N.length - 1, nodes = N.map((n) => Object.assign({}, n));
  const rec = (a, b, depth) => {
    const L = Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(a.ox || 0, a.oy || 0) + Math.hypot(b.ix || 0, b.iy || 0);
    if (L <= maxLen || depth > 5) { out2.push(b); return; }
    const mid = splitSeg(a, b); rec(a, mid, depth + 1); rec(mid, b, depth + 1);
  };
  out2.push(nodes[0]);
  for (let i = 0; i < segs; i++) rec(nodes[i], nodes[(i + 1) % nodes.length], 0);
  if (p.closed) { const last = out2.pop(); nodes[0].ix = last.ix; nodes[0].iy = last.iy; }
  p.nodes = out2;
}
/* op: bulge | pinch | twist | stretch | arc. P: px, py (pivot), R (reach), amt, angle (degrees), taper */
function distortFn(op, P) {
  const { px, py } = P, R = Math.max(1, P.R), amt = P.amt || 0, ang = (P.angle || 0) * Math.PI / 180, ux = Math.cos(ang), uy = Math.sin(ang);
  const fall = (d) => { const t = clamp(1 - d / R, 0, 1); return t * t * (3 - 2 * t); }; // smooth falloff, 1 at the pivot, 0 at the reach
  if (op === 'bulge' || op === 'pinch') {
    const a = op === 'pinch' ? -clamp(amt, -1, 0.9) : clamp(amt, -0.9, 1);
    return (x, y) => { const dx = x - px, dy = y - py, d = Math.hypot(dx, dy); if (d >= R) return [x, y]; const k = 1 + a * fall(d); return [px + dx * k, py + dy * k]; };
  }
  if (op === 'twist') return (x, y) => { const dx = x - px, dy = y - py, d = Math.hypot(dx, dy), a = amt * Math.PI * fall(d), c = Math.cos(a), s = Math.sin(a); return [px + dx * c - dy * s, py + dx * s + dy * c]; };
  if (op === 'stretch') {
    const a = Math.max(-0.9, amt);
    return (x, y) => { const dx = x - px, dy = y - py, along = dx * ux + dy * uy, across = -dx * uy + dy * ux; const g = 1 + a * (P.taper ? fall(Math.abs(across)) : 1); const a2 = along * g; return [px + a2 * ux - across * uy, py + a2 * uy + across * ux]; };
  }
  if (op === 'arc') return (x, y) => { // bends the axis through the pivot into a circle of radius R / amt; sizes across it are kept
    if (Math.abs(amt) < 1e-3) return [x, y];
    const dx = x - px, dy = y - py, along = dx * ux + dy * uy, across = -dx * uy + dy * ux;
    const rad = R / amt, th = along / rad, rr = rad - across, a2 = rr * Math.sin(th), c2 = rad - rr * Math.cos(th);
    return [px + a2 * ux - c2 * uy, py + a2 * uy + c2 * ux];
  };
  return (x, y) => [x, y];
}
function distortPaths(list, op, P) {
  const f = distortFn(op, P), safe = (x, y) => { const r = f(x, y); return Number.isFinite(r[0]) && Number.isFinite(r[1]) ? r : [x, y]; };
  list.forEach((p) => {
    densify(p, Math.max(4, P.R / 8));
    p.nodes.forEach((n) => { const [x, y] = safe(n.x, n.y), [ax, ay] = safe(n.x + (n.ox || 0), n.y + (n.oy || 0)), [bx, by] = safe(n.x + (n.ix || 0), n.y + (n.iy || 0)); n.x = x; n.y = y; n.ox = ax - x; n.oy = ay - y; n.ix = bx - x; n.iy = by - y; });
  });
  vecVer++;
}
/* the Distort tool works on the selected lines and groups, or on every line when nothing is selected */
function distortTargets() {
  const sel = selectedPaths();
  return (sel.length ? expandGroups(sel).map(findPath) : doc.lines.paths.filter((p) => !p.hidden)).filter((p) => p && p.nodes && p.nodes.length > 1);
}
function distortPivot(list) {
  const D = ui.distort, key = list.map((p) => p.id).join(',');
  if (D.key !== key || !D.R) {
    const b = pathsBounds(list);
    D.key = key; D.px = b.x + b.w / 2; D.py = b.y + b.h / 2; D.R = Math.max(20, Math.max(b.w, b.h) * 0.6);
  }
  return D;
}
let distSess = null;
/* a distortion is redone from a saved copy every time, so dragging never piles up errors */
function distortSession(list, fresh) {
  const key = list.map((p) => p.id).join(',');
  if (fresh || !distSess || distSess.key !== key || distSess.ver !== vecVer) distSess = { key, list, base: nodesOf(list), ver: vecVer };
  return distSess;
}
function distortApply(final) {
  const s = distSess; if (!s) return;
  s.list.forEach((p, i) => { p.nodes = clone(s.base[i]); });
  const D = ui.distort;
  distortPaths(s.list, D.op, { px: D.px, py: D.py, R: D.R, amt: D.amt, angle: D.angle, taper: D.taper });
  if (final) linesChanged(); else compose();
  s.ver = vecVer;
}
/* sliders and buttons change the last distortion, or start one on the current shapes */
function distortTweak() {
  const list = distortTargets(); if (!list.length) return;
  distortSession(list, false);
  distortApply(true); drawOverlay();
}
function distortDown(p, ix, iy, e) {
  const list = distortTargets();
  if (!list.length) { toast('Draw some lines, or turn text into outlines, to distort them.'); return; }
  const D = distortPivot(list), g = artGeom(), [pax, pay] = img2art(D.px, D.py, g), tol = 10 / p.k, sc = imgScale(g);
  if (Math.hypot(pax - p.ax, pay - p.ay) < tol) { drag = { kind: 'distPivot', list }; return; }
  const dR = Math.hypot(ix - D.px, iy - D.py);
  if (Math.abs(dR - D.R) * sc < tol) { drag = { kind: 'distReach', list }; return; }
  distortSession(list, true);
  D.amt = 0;
  const ux = Math.cos(D.angle * Math.PI / 180), uy = Math.sin(D.angle * Math.PI / 180), dx = ix - D.px, dy = iy - D.py;
  drag = { kind: 'distAmt', list, d0: Math.max(1, dR), a0: Math.atan2(dy, dx), sweep: 0, last: Math.atan2(dy, dx), along0: dx * ux + dy * uy, across0: -dx * uy + dy * ux };
}
function distortMove(p, ix, iy, e) {
  const d = drag, D = ui.distort;
  if (d.kind === 'distPivot') {
    [D.px, D.py] = snapAt(ix, iy, { e, p });
    if (distSess && distSess.ver === vecVer && D.amt) distortApply(false); else drawOverlay();
    drawOverlay(); return;
  }
  if (d.kind === 'distReach') {
    D.R = Math.max(4, Math.hypot(ix - D.px, iy - D.py));
    if (distSess && distSess.ver === vecVer && D.amt) distortApply(false);
    drawOverlay(); return;
  }
  const dx = ix - D.px, dy = iy - D.py, ux = Math.cos(D.angle * Math.PI / 180), uy = Math.sin(D.angle * Math.PI / 180);
  let amt = 0;
  if (D.op === 'bulge') amt = (Math.hypot(dx, dy) - d.d0) / D.R;
  else if (D.op === 'pinch') amt = (d.d0 - Math.hypot(dx, dy)) / D.R;
  else if (D.op === 'twist') { const a = Math.atan2(dy, dx); let da = a - d.last; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; d.sweep += da; d.last = a; amt = d.sweep / Math.PI; }
  else if (D.op === 'stretch') { const along = dx * ux + dy * uy; amt = (Math.abs(along) - Math.abs(d.along0)) / Math.max(D.R * 0.5, 1); }
  else if (D.op === 'arc') { const across = -dx * uy + dy * ux; amt = -(across - d.across0) / D.R * 2; }
  D.amt = Math.round(clamp(amt, -2, 2) * 100) / 100;
  distortApply(false); drawOverlay();
  const v = document.querySelector('#optbar [data-k="distAmt"] .val'); if (v) v.textContent = Math.round(D.amt * 100) + '%';
}
function distortEnd(d) {
  if (d.kind === 'distAmt' && distSess) distortApply(true);
  else if (distSess && distSess.ver === vecVer && ui.distort.amt) distortApply(true);
  buildOptbar(); drawOverlay();
}
function distortOverlay(g, k) {
  if (ui.tool !== 'distort' || ui.cropDraft) return '';
  const list = distortTargets(); if (!list.length) return '';
  const D = distortPivot(list), col = '#ff3b7f';
  const [ax, ay] = img2art(D.px, D.py, g), r = D.R * imgScale(g), s = 7 / k;
  const ux = Math.cos(D.angle * Math.PI / 180), uy = Math.sin(D.angle * Math.PI / 180);
  const parts = ['<circle cx="' + ax + '" cy="' + ay + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="1.2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>'];
  if (D.op === 'stretch' || D.op === 'arc') parts.push('<line x1="' + (ax - ux * r) + '" y1="' + (ay - uy * r) + '" x2="' + (ax + ux * r) + '" y2="' + (ay + uy * r) + '" stroke="' + col + '" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>');
  parts.push('<rect x="' + (ax + r - s / 2) + '" y="' + (ay - s / 2) + '" width="' + s + '" height="' + s + '" fill="#fff" stroke="' + col + '" stroke-width="1.3" vector-effect="non-scaling-stroke"/>');
  parts.push('<circle cx="' + ax + '" cy="' + ay + '" r="' + s + '" fill="rgba(255,255,255,.85)" stroke="' + col + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/>');
  parts.push('<path d="M' + (ax - s * 1.6) + ' ' + ay + 'H' + (ax + s * 1.6) + 'M' + ax + ' ' + (ay - s * 1.6) + 'V' + (ay + s * 1.6) + '" stroke="' + col + '" stroke-width="1.2" vector-effect="non-scaling-stroke"/>');
  return parts.join('');
}
const DIST_OPS = [['bulge', 'Bulge'], ['pinch', 'Pinch'], ['twist', 'Twist'], ['stretch', 'Stretch'], ['arc', 'Arc']];
function buildDistortBar(bar) {
  const D = ui.distort, list = distortTargets();
  if (list.length) distortPivot(list);
  bar.appendChild(optSeg(DIST_OPS, D.op, (v) => { D.op = v; D.amt = 0; distSess = null; buildOptbar(); drawOverlay(); }, 'Distortion'));
  const amt = optRange('Amount', -2, 2, 0.01, D.amt, (v) => Math.round(v * 100) + '%', (v) => { D.amt = v; distortTweak(); });
  amt.dataset.k = 'distAmt'; bar.appendChild(amt);
  const maxR = Math.max(50, Math.round(Math.max(iw, ih)));
  bar.appendChild(optRange('Reach', 10, maxR, 1, Math.round(clamp(D.R || 100, 10, maxR)), (v) => Math.round(v) + ' px', (v) => { D.R = v; if (distSess && distSess.ver === vecVer && D.amt) distortTweak(); else drawOverlay(); }));
  if (D.op === 'stretch' || D.op === 'arc') bar.appendChild(optRange('Angle', -90, 90, 1, D.angle, (v) => Math.round(v) + '°', (v) => { D.angle = v; if (distSess && distSess.ver === vecVer && D.amt) distortTweak(); else drawOverlay(); }));
  if (D.op === 'stretch') { const lab = el('label'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!D.taper; cb.onchange = () => { D.taper = cb.checked; if (distSess && distSess.ver === vecVer && D.amt) distortTweak(); }; lab.append(cb, document.createTextNode('Only near the line')); bar.appendChild(lab); }
  bar.appendChild(optBtn('Center the point', () => { D.key = ''; D.R = 0; distSess = null; D.amt = 0; const l = distortTargets(); if (l.length) distortPivot(l); buildOptbar(); drawOverlay(); }, false, !list.length));
  bar.appendChild(el('span', 'hint', list.length ? 'Drag on the picture to ' + D.op + ' ' + (selectedPathIds().length ? 'the selection' : 'every line') + '. Drag the round point to move the center, the dashed ring to set how far it reaches.' : 'Draw lines, or turn text into outlines, then drag here to distort them.'));
}
/* the old Bend lines buttons: a bulge around the middle of the artboard */
function warpLines(amount) {
  const sel = selectedPaths(), list = sel.length ? expandGroups(sel).map(findPath) : doc.lines.paths;
  if (!list.length) { toast('There are no lines to bend yet.'); return; }
  const cr = cropRect(), cx = (cr.x + cr.w / 2) * iw, cy = (cr.y + cr.h / 2) * ih, R = Math.min(cr.w * iw, cr.h * ih) * 0.6;
  distortPaths(list, 'bulge', { px: cx, py: cy, R, amt: amount });
  linesChanged();
}

/* ---------------- fills ---------------- */
function defaultGradient(type, from) {
  const st = clone(type === 'radial' ? FILL_PRESETS[2][1] : FILL_PRESETS[0][1]);
  if (from && typeof from === 'object' && from.stops) return Object.assign({}, type === 'radial' ? { type, cx: 0, cy: 0, r: 1 } : { type, angle: from.angle ?? 90 }, { stops: clone(from.stops) });
  return type === 'radial' ? { type, cx: 0, cy: 0, r: 1, stops: st } : { type, angle: 90, stops: st };
}
let lastFill = null;
/* gives paths a fill that shows with or without a stroke */
function setFill(list, f) {
  list.forEach((p) => {
    if (!p.closed) return;
    p.fill = f ? clone(f) : null;
    if (f) { p.fillOnly = true; if (!p.fillRule) p.fillRule = p.group != null ? 'evenodd' : 'nonzero'; }
  });
  if (f) lastFill = clone(f);
}
function fillAll() {
  const closed = doc.lines.paths.filter((p) => p.closed && !p.hidden);
  if (!closed.length) { toast('There are no closed shapes to fill. Close a line with the Pen, or turn text into outlines.'); return; }
  const lead = selectedPaths().find((p) => p.fill);
  setFill(closed, (lead && lead.fill) || lastFill || defaultGradient('linear'));
  doc.lines.visible = true;
  linesChanged(); if (ui.tab === 'lines') buildPanel();
  toast('Filled ' + closed.length + ' closed shapes', { label: 'Undo', fn: undo });
}
/* the Fill part of the Vector panel, for the selected paths */
function buildFillControls(s, list) {
  const closed = list.filter((p) => p.closed);
  if (!closed.length) return;
  const lead = list[0], f = (closed.find((p) => p.fill) || {}).fill || null, on = !!f && closed.some(pathFillShown);
  const ch = () => { linesChanged(); };
  const fk = { on };
  s.appendChild(makeControl(fk, T('on', 'Fill the inside', { idp: 'vf-' }), () => { setFill(closed, fk.on ? (f || lastFill || lead.stroke || defaultInk()) : null); ch(); buildPanel(); }));
  if (!on) return;
  const kind = typeof f === 'string' ? 'solid' : f.type;
  const ks = { kind };
  s.appendChild(makeControl(ks, Object.assign(S('kind', 'Fill with', [['solid', 'Solid'], ['linear', 'Linear'], ['radial', 'Radial']]), { idp: 'vf-', rebuild: () => {} }), () => {
    setFill(closed, ks.kind === 'solid' ? fillColorOf(f) : defaultGradient(ks.kind, typeof f === 'object' ? f : null)); ch(); buildPanel();
  }));
  if (kind === 'solid') s.appendChild(colorRow('Fill', f, (v) => { setFill(closed, v); ch(); }));
  else {
    const st = fillStops(f);
    const upd = (fn) => { const g = clone(f); fn(g); setFill(closed, g); ch(); };
    s.appendChild(colorRow('From', st[0][1], (v) => upd((g) => { g.stops[0][1] = v; })));
    s.appendChild(colorRow('To', st[st.length - 1][1], (v) => upd((g) => { g.stops[g.stops.length - 1][1] = v; })));
    if (kind === 'linear') { const a = { angle: f.angle || 0 }; s.appendChild(makeControl(a, R('angle', 'Angle', 0, 360, 5, { idp: 'vf-' }), () => upd((g) => { g.angle = a.angle; }))); }
    else { const r = { r: f.r ?? 1 }; s.appendChild(makeControl(r, R('r', 'Size', 0.2, 2, 0.05, { idp: 'vf-' }), () => upd((g) => { g.r = r.r; }))); }
    const row = el('div', 'swatches');
    row.appendChild(optBtn('Swap', () => { upd((g) => { g.stops = g.stops.map(([o, c]) => [1 - o, c]).reverse(); }); buildPanel(); }));
    FILL_PRESETS.forEach(([name, stops]) => {
      const b = el('button', 'sw'); b.type = 'button'; b.title = name; b.setAttribute('aria-label', 'Gradient ' + name);
      b.style.background = 'linear-gradient(90deg,' + stops.map(([o, c]) => c + ' ' + Math.round(o * 100) + '%').join(',') + ')';
      b.onclick = () => { upd((g) => { g.stops = clone(stops); }); buildPanel(); };
      row.appendChild(b);
    });
    s.appendChild(row);
  }
  const eo = { on: unitRule(lead) === 'evenodd' };
  s.appendChild(makeControl(eo, T('on', 'Leave holes open (even-odd)', { idp: 'vfe-' }), () => { list.forEach((p) => { p.fillRule = eo.on ? 'evenodd' : 'nonzero'; }); ch(); }));
}

/* ---------------- the Vector panel: text to lines, and text effects ---------------- */
function buildConvertSection(p) {
  if (!hasTextSel()) return;
  const s = sec(p, 'Turn the text into lines');
  s.appendChild(el('span', 'note', 'Outlines follow the edges of the letters and can be filled, distorted and filled with words. Center lines run down the middle of each stroke, for Line text and strokes.'));
  const g = el('div', 'grid2');
  g.append(optBtn('Convert to outlines', () => convertTextToPaths('outline'), true), optBtn('Convert to centerlines', () => convertTextToPaths('centerline')));
  s.appendChild(g);
  s.appendChild(makeControl(ui.vec, T('fit', 'Size them to fill the artboard', { idp: 'vc-' }), () => {}));
  s.appendChild(makeControl(ui.vec, T('keep', 'Keep the text as well', { idp: 'vc-' }), () => {}));
}
function buildGroupRow(s) {
  const r = el('div', 'grid2');
  r.append(optBtn('Group', () => runCommand('vector.group'), false, !groupable()), optBtn('Ungroup', () => runCommand('vector.ungroup'), false, selGroupId() == null));
  s.appendChild(r);
}
function hasFilledShapes() { return doc.lines.paths.some((p) => !p.hidden && p.closed && (pathFillShown(p) || (p.group != null && pathFillShown(groupMembers(p)[0])))); }
function buildTextEffectSection(p) {
  const closed = doc.lines.paths.some((q) => q.closed && !q.hidden), any = doc.lines.paths.length > 0;
  if (!any) return;
  const s = sec(p, 'Text effect');
  s.appendChild(el('span', 'note', 'Fill the closed shapes with your words, or write along the lines. The words come from the Text art panel.'));
  const g = el('div', 'grid2');
  g.append(optBtn('Fill the shapes with words', () => runCommand('vector.wordsInShapes'), true, !closed), optBtn('Write along the lines', () => runCommand('vector.alongLines')));
  s.appendChild(g);
}
/* Word cloud inside the closed vector shapes, in a color that reads on their fill */
function wordsInShapes() {
  if (!doc.lines.paths.some((p) => p.closed && !p.hidden)) { toast('There are no closed shapes yet. Turn text into outlines, or close a line with the Pen.'); return; }
  if (!hasFilledShapes()) setFill(doc.lines.paths.filter((p) => p.closed && !p.hidden), lastFill || defaultGradient('linear'));
  const fresh = !doc.text.applied;
  if (fresh) applyTextArt();
  // the words sit in the shapes, not on the photo, so a new text art starts on white paper
  if (fresh) doc.out.paper = '#ffffff';
  const L = curLayer();
  if (L.mode !== 'cloud' && L.mode !== 'calligram') setLayerStyle('cloud');
  const fp = doc.lines.paths.find((p) => p.closed && pathFillShown(p));
  const ink = fp && isDarkHex(fillColorOf(fp.fill)) ? '#fff4e0' : '#111111';
  Object.assign(curLayer(), { maskSource: 'vector', maskInvert: false, color: 'ink', inkColor: ink }, curLayer().mode === 'cloud' ? { gradient: 'center' } : {});
  if (doc.text.source === 'lines') doc.text.source = 'both';
  doc.lines.visible = true; doc.text.visible = true;
  ui.tab = 'text'; buildTabs(); buildPanel(); setView('text'); scheduleText(0); queueHistory();
  toast('The words now fill the vector shapes. Change the words in the Text art panel.', { label: 'Undo', fn: undo });
}

/* ---------------- the PDF for print carries the Vector layer ---------------- */
const vectorInPrint = () => !!(doc.lines.visible && (doc.lines.paths.length || doc.objects.some((q) => q.layer !== 'photo' && !q.hidden)));
/* the text art drawn without paper (tc), with the Vector layer under or over it as in the layer order, at the same size */
function withVector(tc) {
  if (!vectorInPrint()) return tc;
  const s = tc.width / artGeom(1).TW, gs = artGeom(s);
  const c = mk(tc.width, tc.height);
  composeTo(c.getContext('2d'), Object.assign({}, gs, { TW: tc.width, TH: tc.height }), { text: tc, vector: vectorCanvas(gs, 1) }, { only: ['text', 'lines'], ground: doc.out.transparent ? null : 'paper' });
  return c;
}
