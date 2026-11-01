/* ===================== Part 3b: objects (shapes, text, images) ===================== */
/* Objects live in doc.objects, in image pixels like lines. o.layer is 'photo' (baked into the photo that text art reads)
   or 'lines' (the Vector layer). x, y, w, h is the box before rotation; rot is in degrees around the box center.
   Image pixels are kept in assets, outside the history, so undo stays light. */
const assets = {};
const assetImgs = new Map();
function addAsset(url) { const id = 'a' + (uid++) + '-' + Math.random().toString(36).slice(2, 7); assets[id] = url; return id; }
function assetImg(id) {
  if (!id || !assets[id]) return null;
  let im = assetImgs.get(id);
  if (!im) {
    im = new Image();
    im.onload = () => { objVer++; vecVer++; if (doc.objects.some((o) => o.asset === id && o.layer === 'photo')) refreshPhotoObjects(true); else compose(); };
    im.src = assets[id]; assetImgs.set(id, im);
  }
  return im;
}
const OBJ_NAMES = { rect: 'Rectangle', ellipse: 'Ellipse', polygon: 'Polygon', star: 'Star', text: 'Text', image: 'Image' };
function defaultInk() {
  const ground = doc.blank && doc.photo.visible ? (doc.blank.bg === 'transparent' ? doc.out.paper : doc.blank.bg) : doc.photo.visible ? '#000000' : doc.out.paper;
  return isDarkHex(ground) ? '#ffffff' : '#111111';
}
function newObject(type, over) {
  const base = { id: uid++, type, layer: ui.objLayer === 'photo' ? 'photo' : 'lines', x: 0, y: 0, w: 100, h: 100, rot: 0, flipX: false, flipY: false,
    fill: '#e8a33d', stroke: null, sw: Math.max(2, Math.round(iw / 300)), opacity: 1, radius: 0, sides: ui.shape.sides, points: ui.shape.points, inner: ui.shape.inner, hidden: false };
  if (type === 'text') Object.assign(base, { fill: defaultInk(), text: 'Your text', font: 'condensed', size: Math.max(24, Math.round(Math.min(iw, ih) / 9)), weight: 700, italic: false, align: 'left', lh: 1.1, ls: 0 });
  const o = Object.assign(base, over || {});
  if (type === 'text') measureText(o);
  return o;
}
const mctx2 = mk(8, 8).getContext('2d');
function textFont(o, size) { return (o.italic ? 'italic ' : '') + (o.weight || 400) + ' ' + (size ?? o.size) + 'px ' + (C.FONTS[o.font] || o.font); }
function measureText(o) {
  mctx2.font = textFont(o);
  const lines = String(o.text || ' ').split('\n');
  const w = Math.max(4, ...lines.map((s) => mctx2.measureText(s || ' ').width + (o.ls || 0) * o.size * Math.max(0, Array.from(s).length - 1)));
  const h = Math.max(4, lines.length * o.size * o.lh);
  // keep the aligned edge still while the text changes
  if (o._m) { if (o.align === 'center') o.x += (o.w - w) / 2; else if (o.align === 'right') o.x += o.w - w; }
  o.w = w; o.h = h; o._m = 1;
}
function shapePath(x, o) {
  const w = o.w, h = o.h;
  if (o.type === 'rect') { const r = Math.min(o.radius || 0, w / 2, h / 2); if (r > 0 && x.roundRect) x.roundRect(-w / 2, -h / 2, w, h, r); else x.rect(-w / 2, -h / 2, w, h); }
  else if (o.type === 'ellipse') x.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  else polyPoints(o).forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  if (o.type === 'polygon' || o.type === 'star') x.closePath();
}
function polyPoints(o) {
  const w = o.w / 2, h = o.h / 2, pts = [];
  if (o.type === 'polygon') { const n = Math.max(3, Math.round(o.sides || 6)); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; pts.push([Math.cos(a) * w, Math.sin(a) * h]); } }
  else { const n = Math.max(3, Math.round(o.points || 5)); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? (o.inner || 0.45) : 1; pts.push([Math.cos(a) * w * r, Math.sin(a) * h * r]); } }
  return pts;
}
/* draw one object; the context maps image pixels to the target */
function drawObject(x, o) {
  if (o._editing) return;
  x.save();
  x.globalAlpha *= (o.opacity ?? 1);
  x.translate(o.x + o.w / 2, o.y + o.h / 2);
  if (o.rot) x.rotate(o.rot * Math.PI / 180);
  x.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
  if (o.type === 'image') {
    const im = assetImg(o.asset);
    if (im && im.complete && im.naturalWidth) x.drawImage(im, -o.w / 2, -o.h / 2, o.w, o.h);
  } else if (o.type === 'text') {
    x.font = textFont(o); x.textBaseline = 'top'; x.textAlign = o.align || 'left';
    if ('letterSpacing' in x) x.letterSpacing = ((o.ls || 0) * o.size) + 'px';
    const tx = o.align === 'center' ? 0 : o.align === 'right' ? o.w / 2 : -o.w / 2;
    String(o.text || '').split('\n').forEach((s, i) => {
      const ty = -o.h / 2 + i * o.size * o.lh + o.size * (o.lh - 1) / 2;
      if (o.stroke && o.sw > 0) { x.strokeStyle = o.stroke; x.lineWidth = o.sw; x.lineJoin = 'round'; x.strokeText(s, tx, ty); }
      if (o.fill) { x.fillStyle = o.fill; x.fillText(s, tx, ty); }
    });
  } else {
    x.beginPath(); shapePath(x, o);
    if (o.fill) { x.fillStyle = o.fill; x.fill(); }
    if (o.stroke && o.sw > 0) { x.strokeStyle = o.stroke; x.lineWidth = o.sw; x.lineJoin = 'round'; x.stroke(); }
  }
  x.restore();
}
function selectedObjs() { return ui.selObjs.map((id) => doc.objects.find((o) => o.id === id)).filter(Boolean); }
function findObj(id) { return doc.objects.find((o) => o.id === id); }

/* ---------------- geometry helpers ---------------- */
function toLocal(o, ix, iy) { const cx = o.x + o.w / 2, cy = o.y + o.h / 2, a = -(o.rot || 0) * Math.PI / 180, dx = ix - cx, dy = iy - cy; return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; }
function fromLocal(o, lx, ly) { const cx = o.x + o.w / 2, cy = o.y + o.h / 2, a = (o.rot || 0) * Math.PI / 180; return [cx + lx * Math.cos(a) - ly * Math.sin(a), cy + lx * Math.sin(a) + ly * Math.cos(a)]; }
function hitObject(ix, iy, tol) {
  tol = tol || 0;
  for (let i = doc.objects.length - 1; i >= 0; i--) {
    const o = doc.objects[i];
    if (o.hidden || o.locked || !layerOf(o.layer).visible) continue;
    const [lx, ly] = toLocal(o, ix, iy);
    if (Math.abs(lx) <= o.w / 2 + tol && Math.abs(ly) <= o.h / 2 + tol) return o;
  }
  return null;
}
function objBounds(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  list.forEach((o) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const [x, y] = fromLocal(o, a * o.w / 2, b * o.h / 2); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function handlesOf(o, g, k) {
  const out2 = [];
  [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].forEach(([hx, hy]) => { const [x, y] = fromLocal(o, hx * o.w / 2, hy * o.h / 2); const [ax, ay] = img2art(x, y, g); out2.push({ hx, hy, ax, ay }); });
  const off = 26 / k / imgScale(g);
  const [rx, ry] = fromLocal(o, 0, -o.h / 2 - off); const [ax, ay] = img2art(rx, ry, g);
  out2.push({ rot: true, ax, ay });
  return out2;
}

/* ---------------- updates ---------------- */
let photoObjRaf = 0;
/* objects on the photo change what text art reads, so the photo is rebuilt (once per frame while dragging) */
function refreshPhotoObjects(final) {
  cancelAnimationFrame(photoObjRaf);
  const run = () => { photoSrcCache = null; refreshMaster(); rebuildBase(); rebuildPhotoView(); compose(); if (final && doc.text.applied && !doc.text.locked) scheduleText(); if (final) thumbsSoon(); };
  if (final) run(); else photoObjRaf = requestAnimationFrame(run);
}
function objChanged(opt) {
  opt = opt || {};
  objVer++; vecVer++;
  const list = opt.list || selectedObjs();
  if (opt.photo || list.some((o) => o.layer === 'photo')) refreshPhotoObjects(!!opt.final);
  else compose();
  if (opt.final) { queueHistory(); buildStack(); if (['photo', 'lines'].includes(ui.tab)) buildPanel(); buildOptbar(); }
}
function addObject(o, edit) {
  doc.objects.push(o);
  ui.selObjs = [o.id]; ui.selPath = null;
  if (o.layer === 'lines' && !doc.lines.visible) doc.lines.visible = true;
  objChanged({ final: true, list: [o] });
  if (edit && o.type === 'text') editText(o);
}
function deleteObjects() {
  const sel = selectedObjs(); if (!sel.length) return;
  const photo = sel.some((o) => o.layer === 'photo');
  doc.objects = doc.objects.filter((o) => !ui.selObjs.includes(o.id));
  ui.selObjs = [];
  objChanged({ final: true, photo, list: [] });
}
function cloneObj(o, dx, dy) { const c = clone(o); c.id = uid++; c.x += dx || 0; c.y += dy || 0; delete c._editing; return c; }
function duplicateObjects() {
  const sel = selectedObjs(); if (!sel.length) return;
  const off = Math.max(10, Math.round(iw / 60));
  const copies = sel.map((o) => cloneObj(o, off, off));
  doc.objects.push(...copies); ui.selObjs = copies.map((o) => o.id);
  objChanged({ final: true, list: copies });
}
function flipObjects(axis) { const sel = selectedObjs(); sel.forEach((o) => { if (axis === 'x') o.flipX = !o.flipX; else o.flipY = !o.flipY; }); objChanged({ final: true }); }
function arrangeObjects(how) {
  const sel = selectedObjs(); if (!sel.length) return;
  const rest = doc.objects.filter((o) => !sel.includes(o));
  if (how === 'front') doc.objects = rest.concat(sel);
  else if (how === 'back') doc.objects = sel.concat(rest);
  else {
    const arr = doc.objects.slice();
    const idxs = sel.map((o) => arr.indexOf(o)).sort((a, b) => (how === 'forward' ? b - a : a - b));
    idxs.forEach((i) => { const j = how === 'forward' ? i + 1 : i - 1; if (j >= 0 && j < arr.length && !sel.includes(arr[j])) { [arr[i], arr[j]] = [arr[j], arr[i]]; } });
    doc.objects = arr;
  }
  objChanged({ final: true });
}
function moveObjectsToLayer(layer) {
  const sel = selectedObjs(); if (!sel.length) return;
  sel.forEach((o) => { o.layer = layer; });
  objChanged({ final: true, photo: true });
  toast(layer === 'photo' ? 'Moved to the Photo layer. Text art now draws it too.' : 'Moved to the Vector layer.');
}
/* align to the artboard (the crop box) */
function alignObjects(how) {
  const sel = selectedObjs(); if (!sel.length) return;
  const cr = cropRect(), B = { x: cr.x * iw, y: cr.y * ih, w: cr.w * iw, h: cr.h * ih };
  sel.forEach((o) => {
    const b = objBounds([o]);
    if (how === 'left') o.x += B.x - b.x; if (how === 'right') o.x += B.x + B.w - (b.x + b.w); if (how === 'center') o.x += B.x + B.w / 2 - (b.x + b.w / 2);
    if (how === 'top') o.y += B.y - b.y; if (how === 'bottom') o.y += B.y + B.h - (b.y + b.h); if (how === 'middle') o.y += B.y + B.h / 2 - (b.y + b.h / 2);
  });
  objChanged({ final: true });
}
function nudgeObjects(dx, dy) {
  const sel = selectedObjs();
  if (!sel.length) return false;
  sel.forEach((o) => { o.x += dx; o.y += dy; });
  objChanged({}); clearTimeout(nudgeObjects.t); nudgeObjects.t = setTimeout(() => objChanged({ final: true }), 350);
  return true;
}
function zoomToSelection() {
  const sel = selectedObjs();
  const g = artGeom();
  if (!sel.length) { zoomTo('fit'); return; }
  const b = objBounds(sel), pad = Math.max(b.w, b.h) * 0.15;
  const [ax0, ay0] = img2art(b.x - pad, b.y - pad, g), [ax1, ay1] = img2art(b.x + b.w + pad, b.y + b.h + pad, g);
  zoomToRect(ax0, ay0, ax1, ay1);
}

/* ---------------- select tool ---------------- */
function selectDown(p, ix, iy, e) {
  const g = artGeom(), tol = 9 / p.k;
  const sel = selectedObjs();
  if (sel.length === 1 && !sel[0].locked) {
    const o = sel[0];
    for (const h of handlesOf(o, g, p.k)) {
      if (Math.hypot(h.ax - p.ax, h.ay - p.ay) > tol) continue;
      if (h.rot) { drag = { kind: 'objRotate', o, a0: Math.atan2(iy - (o.y + o.h / 2), ix - (o.x + o.w / 2)), r0: o.rot || 0 }; return; }
      drag = { kind: 'objScale', o, hx: h.hx, hy: h.hy, o0: { x: o.x, y: o.y, w: o.w, h: o.h, size: o.size, sw: o.sw } }; return;
    }
  }
  const hit = hitObject(ix, iy, 4 / p.k / imgScale(g));
  if (hit) {
    if (e.shiftKey) ui.selObjs = ui.selObjs.includes(hit.id) ? ui.selObjs.filter((id) => id !== hit.id) : ui.selObjs.concat(hit.id);
    else if (!ui.selObjs.includes(hit.id)) ui.selObjs = [hit.id];
    ui.selPath = null;
    let moving = selectedObjs();
    if (e.altKey && moving.length) {
      const copies = moving.map((o) => cloneObj(o, 0, 0));
      doc.objects.push(...copies); ui.selObjs = copies.map((o) => o.id); moving = copies;
    }
    drag = { kind: 'objMove', start: [ix, iy], last: [ix, iy], objs: moving, orig: moving.map((o) => [o.x, o.y]) };
  } else {
    const path = nearestPath(p, 7);
    if (path) { ui.selObjs = []; ui.selPath = path.id; ui.selNode = null; drag = { kind: 'path', path, last: [ix, iy] }; }
    else { if (!e.shiftKey) ui.selObjs = []; ui.selPath = null; drag = { kind: 'marquee', a: [ix, iy], b: [ix, iy] }; }
  }
  drawOverlay(); buildOptbar(); if (['photo', 'lines'].includes(ui.tab)) buildPanel();
}
function objDragMove(ix, iy, e, p) {
  const d = drag;
  if (d.kind === 'marquee') { d.b = [ix, iy]; drawOverlay(); return; }
  if (d.kind === 'shapeDraw') { shapeDrag(ix, iy, e, p); return; }
  if (d.kind === 'objMove') {
    let dx = ix - d.start[0], dy = iy - d.start[1];
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    // snap the moved box: measure from where the shapes started
    d.objs.forEach((o, i) => { o.x = d.orig[i][0]; o.y = d.orig[i][1]; });
    [dx, dy] = snapMove(d.objs, dx, dy, e, p);
    d.objs.forEach((o, i) => { o.x = d.orig[i][0] + dx; o.y = d.orig[i][1] + dy; });
    d.moved = true;
    objChanged({ list: d.objs });
  } else if (d.kind === 'objRotate') {
    const o = d.o, a = Math.atan2(iy - (o.y + o.h / 2), ix - (o.x + o.w / 2));
    let r = d.r0 + (a - d.a0) * 180 / Math.PI;
    if (e.shiftKey) r = Math.round(r / 15) * 15;
    o.rot = ((r % 360) + 540) % 360 - 180;
    objChanged({ list: [o] });
  } else if (d.kind === 'objScale') {
    const o = d.o, o0 = d.o0;
    const tmp = Object.assign({}, o, { x: o0.x, y: o0.y, w: o0.w, h: o0.h });
    const [lx, ly] = toLocal(tmp, ix, iy);
    let nw = d.hx ? Math.max(2, d.hx * lx + o0.w / 2) : o0.w, nh = d.hy ? Math.max(2, d.hy * ly + o0.h / 2) : o0.h;
    const keep = o.type === 'text' || ((o.type === 'image') !== e.shiftKey);
    if (keep && d.hx && d.hy) { const s = Math.max(nw / o0.w, nh / o0.h); nw = o0.w * s; nh = o0.h * s; }
    else if (keep && o.type === 'text') { const s = d.hx ? nw / o0.w : nh / o0.h; nw = o0.w * s; nh = o0.h * s; }
    const clx = d.hx ? -d.hx * o0.w / 2 + d.hx * nw / 2 : 0, cly = d.hy ? -d.hy * o0.h / 2 + d.hy * nh / 2 : 0;
    const [cx, cy] = fromLocal(tmp, clx, cly);
    o.w = nw; o.h = nh; o.x = cx - nw / 2; o.y = cy - nh / 2;
    if (o.type === 'text') o.size = o0.size * nh / o0.h;
    objChanged({ list: [o] });
  }
}
function objDragEnd(d) {
  if (d.kind === 'marquee') {
    const x0 = Math.min(d.a[0], d.b[0]), x1 = Math.max(d.a[0], d.b[0]), y0 = Math.min(d.a[1], d.b[1]), y1 = Math.max(d.a[1], d.b[1]);
    if (x1 - x0 > 2 && y1 - y0 > 2) {
      const hits = doc.objects.filter((o) => !o.hidden && layerOf(o.layer).visible && o.x + o.w / 2 >= x0 && o.x + o.w / 2 <= x1 && o.y + o.h / 2 >= y0 && o.y + o.h / 2 <= y1).map((o) => o.id);
      ui.selObjs = [...new Set(ui.selObjs.concat(hits))];
    }
    drawOverlay(); buildOptbar(); if (['photo', 'lines'].includes(ui.tab)) buildPanel();
    return;
  }
  if (d.kind === 'shapeDraw') { shapeEnd(d); return; }
  objChanged({ final: true, list: d.objs || [d.o] });
}
function hoverCursor(p) {
  let cur = '';
  if (ui.tool === 'select') {
    const sel = selectedObjs();
    if (sel.length === 1) { const h = handlesOf(sel[0], artGeom(), p.k).find((q) => Math.hypot(q.ax - p.ax, q.ay - p.ay) < 9 / p.k); if (h) cur = h.rot ? 'grab' : (h.hx * h.hy > 0 ? 'nwse-resize' : h.hx * h.hy < 0 ? 'nesw-resize' : h.hx ? 'ew-resize' : 'ns-resize'); }
    if (!cur) { const [ix, iy] = toImg(p); if (hitObject(ix, iy)) cur = 'move'; }
  } else if (ui.tool === 'crop') cur = cropCursor(p);
  wrap.style.cursor = cur;
}

/* ---------------- shape and text tools ---------------- */
function shapeDown(ix, iy, e) {
  if (ui.shape.kind === 'line') {
    const path = { id: uid++, closed: false, width: newLineWidth(), text: '', traced: false, stroke: defaultInk(), sw: Math.max(2, Math.round(iw / 250)), nodes: [{ x: ix, y: iy, ix: 0, iy: 0, ox: 0, oy: 0 }, { x: ix, y: iy, ix: 0, iy: 0, ox: 0, oy: 0 }] };
    doc.lines.paths.push(path); ui.selPath = path.id; ui.selObjs = [];
    drag = { kind: 'shapeDraw', line: path, start: [ix, iy] };
    return;
  }
  const o = newObject(ui.shape.kind, { x: ix, y: iy, w: 1, h: 1 });
  doc.objects.push(o); ui.selObjs = [o.id]; ui.selPath = null;
  drag = { kind: 'shapeDraw', o, start: [ix, iy] };
}
function shapeDrag(ix, iy, e, p) {
  const d = drag;
  if (!e.shiftKey) [ix, iy] = snapAt(ix, iy, { e, p, anchor: d.line ? d.start : null, skipPath: d.line || null, skipObjs: d.o ? new Set([d.o.id]) : null });
  let dx = ix - d.start[0], dy = iy - d.start[1];
  if (d.line) {
    if (e.shiftKey) { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, L = Math.hypot(dx, dy); dx = Math.cos(a) * L; dy = Math.sin(a) * L; }
    Object.assign(d.line.nodes[1], { x: d.start[0] + dx, y: d.start[1] + dy });
    vecVer++; compose(); return;
  }
  if (e.shiftKey) { const s = Math.max(Math.abs(dx), Math.abs(dy)); dx = Math.sign(dx || 1) * s; dy = Math.sign(dy || 1) * s; }
  const o = d.o;
  o.x = Math.min(d.start[0], d.start[0] + dx); o.y = Math.min(d.start[1], d.start[1] + dy); o.w = Math.max(1, Math.abs(dx)); o.h = Math.max(1, Math.abs(dy));
  objChanged({ list: [o] });
}
function shapeEnd(d) {
  const tiny = Math.max(2, 6 / (canvas.getBoundingClientRect().width / canvas.width) / imgScale(artGeom()));
  if (d.line) {
    const [a, b] = d.line.nodes;
    if (Math.hypot(b.x - a.x, b.y - a.y) < tiny) { b.x = a.x + Math.min(iw, ih) / 4; }
    linesChanged(); if (ui.tab === 'lines') buildPanel(); buildOptbar();
    return;
  }
  const o = d.o;
  if (o.w < tiny && o.h < tiny) { const s = Math.min(iw, ih) / 5; o.x -= s / 2; o.y -= s / 2; o.w = s; o.h = s; }
  objChanged({ final: true, list: [o] });
}
function textDown(p, ix, iy) {
  const hit = hitObject(ix, iy);
  if (hit && hit.type === 'text') { ui.selObjs = [hit.id]; editText(hit); drawOverlay(); return; }
  const o = newObject('text');
  o.x = ix; o.y = iy - o.h / 2;
  addObject(o, true);
}

/* type straight on the artwork */
let textEdit = null;
function editText(o) {
  commitTextEdit();
  const ta = el('textarea', 'text-edit'); ta.value = o.text; ta.spellcheck = false; ta.setAttribute('aria-label', 'Text');
  frame.appendChild(ta);
  o._editing = true; textEdit = { o, ta, before: o.text };
  objChanged({ list: [o] });
  positionTextEdit();
  ta.oninput = () => { o.text = ta.value; measureText(o); positionTextEdit(); };
  ta.onkeydown = (e) => { if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); e.stopPropagation(); commitTextEdit(); } };
  ta.onblur = () => setTimeout(commitTextEdit, 0);
  setTimeout(() => { ta.focus(); ta.select(); }, 0);
}
function positionTextEdit() {
  if (!textEdit) return;
  const { o, ta } = textEdit, g = artGeom();
  const [ax, ay] = img2art(o.x, o.y, g), cssK = (parseFloat(canvas.style.width) || canvas.width) / g.TW, s = imgScale(g) * cssK;
  Object.assign(ta.style, { left: ax * cssK + 'px', top: ay * cssK + 'px', width: Math.max(40, o.w * s + o.size * s) + 'px', height: Math.max(20, o.h * s + 4) + 'px',
    font: textFont(o, o.size * s), lineHeight: String(o.lh), letterSpacing: (o.ls || 0) * o.size * s + 'px', textAlign: o.align, color: o.fill || '#000',
    transform: o.rot ? 'rotate(' + o.rot + 'deg)' : '', transformOrigin: (o.w * s / 2) + 'px ' + (o.h * s / 2) + 'px' });
}
function commitTextEdit() {
  if (!textEdit) return;
  const { o, ta } = textEdit; textEdit = null;
  ta.remove(); delete o._editing;
  if (!String(o.text).trim()) { doc.objects = doc.objects.filter((q) => q !== o); ui.selObjs = ui.selObjs.filter((id) => id !== o.id); objChanged({ final: true, list: [o], photo: o.layer === 'photo' }); return; }
  measureText(o);
  objChanged({ final: true, list: [o] });
}

/* ---------------- step and repeat ---------------- */
/* copies of the selection along a line, in a grid, around a circle, or along one of the drawn lines */
function pathPoints(path) { return flatten(path, (x, y) => [x, y], 1); }
function stepRepeat() {
  const objs = selectedObjs(), path = !objs.length ? findPath(ui.selPath) : null;
  if (!objs.length && !path) { toast('Select a shape, text, image or line first.'); return; }
  const R = ui.rep, made = [], madePaths = [];
  const b = objs.length ? objBounds(objs) : (() => { const pts = pathPoints(path); const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; })();
  const gc = [b.x + b.w / 2, b.y + b.h / 2];
  /* place one copy: move the group center to (px, py), turn it by rot degrees and scale it by s */
  const place = (px, py, rot, s, alpha) => {
    const a = rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const tf = (x, y) => { const dx = (x - gc[0]) * s, dy = (y - gc[1]) * s; return [px + dx * ca - dy * sa, py + dx * sa + dy * ca]; };
    objs.forEach((o) => {
      const c = cloneObj(o), [cx, cy] = tf(o.x + o.w / 2, o.y + o.h / 2);
      c.w = o.w * s; c.h = o.h * s; if (c.type === 'text') c.size = o.size * s;
      c.x = cx - c.w / 2; c.y = cy - c.h / 2; c.rot = (o.rot || 0) + rot; c.opacity = (o.opacity ?? 1) * alpha;
      made.push(c);
    });
    if (path) {
      const c = clone(path); c.id = uid++; c.traced = false;
      c.nodes.forEach((n) => { const [x, y] = tf(n.x, n.y); const vi = [(n.ix || 0) * s, (n.iy || 0) * s], vo = [(n.ox || 0) * s, (n.oy || 0) * s]; n.x = x; n.y = y; n.ix = vi[0] * ca - vi[1] * sa; n.iy = vi[0] * sa + vi[1] * ca; n.ox = vo[0] * ca - vo[1] * sa; n.oy = vo[0] * sa + vo[1] * ca; });
      madePaths.push(c);
    }
  };
  const n = Math.max(1, Math.round(R.count));
  if (R.mode === 'line') for (let i = 1; i <= n; i++) place(gc[0] + R.dx * i, gc[1] + R.dy * i, R.rot * i, Math.pow(R.scale / 100, i), 1 - R.fade * i / (n + 1));
  else if (R.mode === 'grid') for (let r = 0; r < R.rows; r++) for (let c = 0; c < R.cols; c++) { if (!r && !c) continue; place(gc[0] + c * (b.w + R.gx), gc[1] + r * (b.h + R.gy), 0, 1, 1); }
  else if (R.mode === 'circle') {
    const cc = [gc[0], gc[1] + R.radius];
    for (let i = 1; i < n + 1; i++) { const a = i * 2 * Math.PI / (n + 1); const dx = gc[0] - cc[0], dy = gc[1] - cc[1]; place(cc[0] + dx * Math.cos(a) - dy * Math.sin(a), cc[1] + dx * Math.sin(a) + dy * Math.cos(a), R.turn ? a * 180 / Math.PI : 0, 1, 1); }
  } else if (R.mode === 'path') {
    const target = findPath(R.path) || doc.lines.paths.find((q) => q !== path);
    if (!target) { toast('Draw or trace a line to place copies along.'); return; }
    const pts = pathPoints(target), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1], cnt = n + 1;
    for (let i = 0; i < cnt; i++) {
      const at = target.closed ? L * i / cnt : L * i / Math.max(1, cnt - 1);
      let j = 1; while (j < cum.length - 1 && cum[j] < at) j++;
      const t = (at - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1), p0 = pts[j - 1], p1 = pts[j];
      const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI;
      place(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, R.turn ? ang : 0, 1, 1);
    }
  }
  doc.objects.push(...made); doc.lines.paths.push(...madePaths);
  if (made.length) ui.selObjs = objs.map((o) => o.id).concat(made.map((o) => o.id));
  if (madePaths.length) linesChanged();
  objChanged({ final: true, list: objs.concat(made) });
  toast('Made ' + (made.length || madePaths.length) + ' copies', { label: 'Undo', fn: undo });
}
/* bulge or pinch the lines themselves, around the center of the selection or the artboard */
function warpLines(amount) {
  const sel = findPath(ui.selPath), list = sel ? [sel] : doc.lines.paths;
  if (!list.length) { toast('There are no lines to bend yet.'); return; }
  const cr = cropRect(), cx = (cr.x + cr.w / 2) * iw, cy = (cr.y + cr.h / 2) * ih, R = Math.min(cr.w * iw, cr.h * ih) * 0.6;
  const f = (x, y) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) / R; if (d >= 1) return [x, y]; const k = 1 + amount * (1 - d) * (1 - d); return [cx + dx * k, cy + dy * k]; };
  list.forEach((p) => p.nodes.forEach((n) => { const [x, y] = f(n.x, n.y), [ax, ay] = f(n.x + (n.ox || 0), n.y + (n.oy || 0)), [bx, by] = f(n.x + (n.ix || 0), n.y + (n.iy || 0)); n.x = x; n.y = y; n.ox = ax - x; n.oy = ay - y; n.ix = bx - x; n.iy = by - y; }));
  linesChanged();
}
/* the photo under the selection becomes an image object you can move, copy and repeat */
function selectionToObject() {
  if (!hasSelection) { toast('Select part of the photo first.'); return; }
  const a = alphaOf(selCanvas), w = selCanvas.width, h = selCanvas.height;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return;
  const sx = iw / w, sy = ih / h, bx = x0 * sx, by = y0 * sy, bw = (x1 - x0 + 1) * sx, bh = (y1 - y0 + 1) * sy;
  const ps = photoSrc(), pk = (ps.width || ps.naturalWidth) / iw;
  const c = mk(Math.round(bw * pk), Math.round(bh * pk)), x = c.getContext('2d');
  x.drawImage(ps, bx * pk, by * pk, bw * pk, bh * pk, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(selCanvas, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, c.width, c.height);
  const o = newObject('image', { asset: addAsset(c.toDataURL('image/png')), x: bx, y: by, w: bw, h: bh, fill: null, layer: 'lines' });
  selClear(true);
  addObject(o);
  setTool('select');
  toast('Copied to an image object on the Vector layer. Move it, or make copies with Step and repeat.');
}
function placeImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = mk(Math.round(im.naturalWidth * k), Math.round(im.naturalHeight * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const cr = cropRect(), bw = cr.w * iw, bh = cr.h * ih, s = Math.min(bw * 0.5 / c.width, bh * 0.5 / c.height);
      const o = newObject('image', { asset: addAsset(c.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92)), w: c.width * s, h: c.height * s, fill: null });
      o.x = cr.x * iw + (bw - o.w) / 2; o.y = cr.y * ih + (bh - o.h) / 2;
      addObject(o); setTool('select');
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}
const placeInput = el('input'); placeInput.type = 'file'; placeInput.accept = 'image/*'; placeInput.hidden = true; document.body.appendChild(placeInput);
placeInput.onchange = () => { placeImageFile(placeInput.files[0]); placeInput.value = ''; };
function quickAdd(type) {
  const cr = cropRect(), bw = cr.w * iw, bh = cr.h * ih, s = Math.min(bw, bh) / 4;
  const o = newObject(type, type === 'text' ? {} : { w: s, h: s });
  o.x = cr.x * iw + (bw - o.w) / 2; o.y = cr.y * ih + (bh - o.h) / 2;
  addObject(o, type === 'text');
  if (ui.tool !== 'select' && type !== 'text') setTool('select');
}

/* ---------------- overlay ---------------- */
function objectOverlay(g, k) {
  const parts = [], sel = selectedObjs(), col = '#0a84ff';
  if (!sel.length && !(drag && drag.kind === 'marquee')) return '';
  const objTool = ['select', 'shape', 'text'].includes(ui.tool);
  sel.forEach((o) => {
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => img2art(...fromLocal(o, a * o.w / 2, b * o.h / 2), g));
    parts.push('<path d="M' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z" fill="none" stroke="' + col + '" stroke-width="1.3" vector-effect="non-scaling-stroke"' + (o.layer === 'photo' ? ' stroke-dasharray="5 3"' : '') + '/>');
  });
  if (sel.length === 1 && objTool && !textEdit) {
    const s = 8 / k, hs = handlesOf(sel[0], g, k), top = hs.find((h) => h.hx === 0 && h.hy === -1), rh = hs.find((h) => h.rot);
    parts.push('<line x1="' + top.ax + '" y1="' + top.ay + '" x2="' + rh.ax + '" y2="' + rh.ay + '" stroke="' + col + '" stroke-width="1" vector-effect="non-scaling-stroke"/>');
    hs.forEach((h) => parts.push(h.rot ? '<circle cx="' + h.ax + '" cy="' + h.ay + '" r="' + (s * 0.6) + '" fill="#fff" stroke="' + col + '" stroke-width="1.3" vector-effect="non-scaling-stroke"/>'
      : '<rect x="' + (h.ax - s / 2) + '" y="' + (h.ay - s / 2) + '" width="' + s + '" height="' + s + '" fill="#fff" stroke="' + col + '" stroke-width="1.3" vector-effect="non-scaling-stroke"/>'));
  }
  if (drag && drag.kind === 'marquee') {
    const [a0, b0] = img2art(drag.a[0], drag.a[1], g), [a1, b1] = img2art(drag.b[0], drag.b[1], g);
    parts.push('<rect x="' + Math.min(a0, a1) + '" y="' + Math.min(b0, b1) + '" width="' + Math.abs(a1 - a0) + '" height="' + Math.abs(b1 - b0) + '" fill="rgba(10,132,255,.08)" stroke="' + col + '" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>');
  }
  return parts.join('');
}

/* ---------------- SVG ---------------- */
const escX = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nf = (v) => Math.round(v * 100) / 100;
function objectSVG(o) {
  const tr = 'translate(' + nf(o.x + o.w / 2) + ' ' + nf(o.y + o.h / 2) + ')' + (o.rot ? ' rotate(' + nf(o.rot) + ')' : '') + (o.flipX || o.flipY ? ' scale(' + (o.flipX ? -1 : 1) + ' ' + (o.flipY ? -1 : 1) + ')' : '');
  const paint = 'fill="' + (o.fill || 'none') + '"' + (o.stroke && o.sw > 0 ? ' stroke="' + o.stroke + '" stroke-width="' + nf(o.sw) + '" stroke-linejoin="round"' : '') + ((o.opacity ?? 1) < 1 ? ' opacity="' + nf(o.opacity) + '"' : '');
  const w = o.w, h = o.h;
  if (o.type === 'image') return assets[o.asset] ? '<image transform="' + tr + '" x="' + nf(-w / 2) + '" y="' + nf(-h / 2) + '" width="' + nf(w) + '" height="' + nf(h) + '" preserveAspectRatio="none" href="' + assets[o.asset] + '"' + ((o.opacity ?? 1) < 1 ? ' opacity="' + nf(o.opacity) + '"' : '') + '/>' : '';
  if (o.type === 'rect') return '<rect transform="' + tr + '" x="' + nf(-w / 2) + '" y="' + nf(-h / 2) + '" width="' + nf(w) + '" height="' + nf(h) + '"' + (o.radius ? ' rx="' + nf(Math.min(o.radius, w / 2, h / 2)) + '"' : '') + ' ' + paint + '/>';
  if (o.type === 'ellipse') return '<ellipse transform="' + tr + '" rx="' + nf(w / 2) + '" ry="' + nf(h / 2) + '" ' + paint + '/>';
  if (o.type === 'polygon' || o.type === 'star') return '<polygon transform="' + tr + '" points="' + polyPoints(o).map(([a, b]) => nf(a) + ',' + nf(b)).join(' ') + '" ' + paint + '/>';
  if (o.type === 'text') {
    const fam = (C.FONTS[o.font] || o.font).replace(/"/g, "'"), tx = o.align === 'center' ? 0 : o.align === 'right' ? w / 2 : -w / 2;
    const anchor = o.align === 'center' ? 'middle' : o.align === 'right' ? 'end' : 'start';
    const spans = String(o.text || '').split('\n').map((s, i) => '<tspan x="' + nf(tx) + '" y="' + nf(-h / 2 + i * o.size * o.lh + o.size * (o.lh - 1) / 2) + '">' + escX(s) + '</tspan>').join('');
    return '<text transform="' + tr + '" font-family="' + fam + '" font-size="' + nf(o.size) + '" font-weight="' + o.weight + '"' + (o.italic ? ' font-style="italic"' : '') + (o.ls ? ' letter-spacing="' + nf(o.ls * o.size) + '"' : '') + ' text-anchor="' + anchor + '" dominant-baseline="text-before-edge" ' + paint + ' xml:space="preserve">' + spans + '</text>';
  }
  return '';
}
function pathSVG(p) {
  const N = p.nodes; if (!N || N.length < 2) return '';
  let d = 'M' + nf(N[0].x) + ' ' + nf(N[0].y);
  const segs = p.closed ? N.length : N.length - 1;
  for (let i = 0; i < segs; i++) { const a = N[i], b = N[(i + 1) % N.length]; d += 'C' + [a.x + (a.ox || 0), a.y + (a.oy || 0), b.x + (b.ix || 0), b.y + (b.iy || 0), b.x, b.y].map(nf).join(' '); }
  if (p.closed) d += 'Z';
  return '<path d="' + d + '" fill="' + (p.fill && p.closed ? p.fill : 'none') + '" stroke="' + p.stroke + '" stroke-width="' + nf(p.sw || p.width || 4) + '" stroke-linecap="round" stroke-linejoin="round"' + ((p.opacity ?? 1) < 1 ? ' opacity="' + nf(p.opacity) + '"' : '') + '/>';
}
/* the group of objects of one layer, mapped onto an artboard of geometry g */
function objectsSVGGroup(g, layer) {
  const M = imgTransform(g).map(nf);
  const body = (layer === 'lines' ? doc.lines.paths.filter((p) => p.stroke && !p.hidden).map(pathSVG) : []).concat(doc.objects.filter((o) => (o.layer === 'photo') === (layer === 'photo') && !o.hidden).map(objectSVG)).join('\n');
  return body ? '<g transform="matrix(' + M.join(' ') + ')">\n' + body + '\n</g>' : '';
}
