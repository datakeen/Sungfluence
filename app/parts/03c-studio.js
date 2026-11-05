/* ===================== Part 3c: crop, compare, image transforms, artboards, settings ===================== */

/* ---------------- dialogs ---------------- */
function openDialog(title, build, wide) {
  const sc = $('dlgScrim'), d = $('dlg');
  d.replaceChildren(); d.className = 'dialog' + (wide ? ' wide' : '');
  const head = el('div', 'sheet-h'); const h2 = el('h2', null, title); h2.id = 'dlgTitle';
  const close = el('button', 'btn btn-quiet', 'Close'); close.type = 'button'; close.onclick = closeDialog;
  head.append(h2, close);
  const body = el('div', 'dlg-body');
  d.append(head, body);
  build(body, d);
  sc.hidden = false;
  const f = body.querySelector('button, input, select'); if (f) f.focus();
}
function closeDialog() { $('dlgScrim').hidden = true; }
$('dlgScrim').addEventListener('click', (e) => { if (e.target === $('dlgScrim')) closeDialog(); });
function numInput(label, val, onchange, opt) {
  opt = opt || {};
  const w = el('label', 'num'); w.append(el('span', null, label));
  const i = el('input'); i.type = 'number'; i.value = val; if (opt.min !== undefined) i.min = opt.min; if (opt.max !== undefined) i.max = opt.max; i.step = opt.step || 'any';
  i.oninput = () => { if (i.value !== '' && isFinite(+i.value)) onchange(+i.value); };
  w.appendChild(i);
  if (opt.unit) w.appendChild(el('small', null, opt.unit));
  return w;
}

/* ---------------- crop ---------------- */
const isFull = (r) => r.x < 0.0005 && r.y < 0.0005 && r.w > 0.9995 && r.h > 0.9995;
function cropRatioValue(name) {
  if (!name || name === 'free') return null;
  if (name === 'original') return iw / ih;
  if (name === 'custom') return Math.max(0.01, ui.cropCustom[0]) / Math.max(0.01, ui.cropCustom[1]);
  const [a, b] = name.split(':').map(Number); return a / b;
}
/* the largest box of a pixel ratio inside the photo, centered near (cx, cy) */
function ratioBox(ratio, cx, cy) {
  const rn = ratio * ih / iw;
  let w = 1, h = 1;
  if (rn < 1) w = rn; else h = 1 / rn;
  return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
}
function cropStart() {
  if (ui.cropDraft || !origImg) return;
  ui.cropDraft = Object.assign({}, doc.photo.crop || FULL());
  const rv = cropRatioValue(doc.photo.ratio);
  if (rv && !doc.photo.crop) ui.cropDraft = ratioBox(rv, 0.5, 0.5);
  rebuildBase(); rebuildPhotoView(); compose(); buildOptbar();
  if (ui.tab === 'photo') buildPanel();
}
function cropCancel() {
  if (!ui.cropDraft) return;
  ui.cropDraft = null;
  rebuildBase(); rebuildPhotoView(); compose();
  if (ui.tab === 'photo') buildPanel();
}
function cropApply() {
  const d = ui.cropDraft; if (!d) return;
  ui.cropDraft = null;
  doc.photo.crop = isFull(d) ? null : { x: +d.x.toFixed(5), y: +d.y.toFixed(5), w: +d.w.toFixed(5), h: +d.h.toFixed(5) };
  if (ui.tool === 'crop') setTool('hand');
  photoChanged('crop');
  ui.zoom = 'fit'; layoutStage();
  if (ui.tab === 'photo') buildPanel();
  toast('Cropped', { label: 'Undo', fn: undo });
}
function cropReset() { if (ui.cropDraft) { ui.cropDraft = FULL(); doc.photo.ratio = 'free'; drawOverlay(); buildOptbar(); } else { doc.photo.crop = null; photoChanged('crop'); buildPanel(); } }
function setCropRatio(v) {
  doc.photo.ratio = v;
  const rv = cropRatioValue(v);
  if (!ui.cropDraft) { setTool('crop'); return; }
  if (rv) { const d = ui.cropDraft; ui.cropDraft = ratioBox(rv, d.x + d.w / 2, d.y + d.h / 2); }
  drawOverlay(); buildOptbar();
  if (ui.tab === 'photo') buildPanel();
}
function cropBoxArt(g) { const d = ui.cropDraft; const [x0, y0] = img2art(d.x * iw, d.y * ih, g), [x1, y1] = img2art((d.x + d.w) * iw, (d.y + d.h) * ih, g); return { x0, y0, x1, y1 }; }
function cropHandles(g) {
  const b = cropBoxArt(g), mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
  return [[-1, -1, b.x0, b.y0], [0, -1, mx, b.y0], [1, -1, b.x1, b.y0], [1, 0, b.x1, my], [1, 1, b.x1, b.y1], [0, 1, mx, b.y1], [-1, 1, b.x0, b.y1], [-1, 0, b.x0, my]].map(([hx, hy, ax, ay]) => ({ hx, hy, ax, ay }));
}
function cropHit(p) {
  const g = artGeom(), tol = 11 / p.k;
  const h = cropHandles(g).find((q) => Math.hypot(q.ax - p.ax, q.ay - p.ay) < tol);
  if (h) return h;
  const b = cropBoxArt(g);
  return p.ax > b.x0 && p.ax < b.x1 && p.ay > b.y0 && p.ay < b.y1 ? 'inside' : null;
}
function cropCursor(p) {
  const h = cropHit(p);
  if (h === 'inside') return 'move';
  if (h) return h.hx * h.hy > 0 ? 'nwse-resize' : h.hx * h.hy < 0 ? 'nesw-resize' : h.hx ? 'ew-resize' : 'ns-resize';
  return 'crosshair';
}
function cropDown(p, ix, iy) {
  const nx = clamp(ix / iw, 0, 1), ny = clamp(iy / ih, 0, 1), h = cropHit(p), orig = Object.assign({}, ui.cropDraft);
  if (h === 'inside') drag = { kind: 'cropMove', start: [nx, ny], orig };
  else if (h) drag = { kind: 'cropHandle', hx: h.hx, hy: h.hy, orig };
  else drag = { kind: 'cropNew', start: [nx, ny], orig };
}
function cropMove(ix, iy, e) {
  const d = drag, o = d.orig, nx = clamp(ix / iw, 0, 1), ny = clamp(iy / ih, 0, 1);
  if (d.kind === 'cropMove') { ui.cropDraft = { x: clamp(o.x + nx - d.start[0], 0, 1 - o.w), y: clamp(o.y + ny - d.start[1], 0, 1 - o.h), w: o.w, h: o.h }; drawOverlay(); return; }
  const ratio = cropRatioValue(doc.photo.ratio) || (e.shiftKey ? (o.w * iw) / (o.h * ih) : null);
  const rn = ratio ? ratio * ih / iw : null, min = 0.01;
  let L = o.x, R = o.x + o.w, T = o.y, B = o.y + o.h, hx = d.hx, hy = d.hy;
  if (d.kind === 'cropNew') { hx = nx >= d.start[0] ? 1 : -1; hy = ny >= d.start[1] ? 1 : -1; L = R = d.start[0]; T = B = d.start[1]; }
  if (hx === -1) L = Math.min(nx, R - min); if (hx === 1) R = Math.max(nx, L + min);
  if (hy === -1) T = Math.min(ny, B - min); if (hy === 1) B = Math.max(ny, T + min);
  if (rn) {
    let w = R - L, h = B - T;
    if (hx && hy) { if (w / h > rn) w = h * rn; else h = w / rn; if (hx < 0) L = R - w; else R = L + w; if (hy < 0) T = B - h; else B = T + h; }
    else if (hx) { h = w / rn; const cy = (o.y + o.y + o.h) / 2; T = cy - h / 2; B = cy + h / 2; }
    else if (hy) { w = h * rn; const cx = (o.x + o.x + o.w) / 2; L = cx - w / 2; R = cx + w / 2; }
    if (L < -1e-6 || T < -1e-6 || R > 1 + 1e-6 || B > 1 + 1e-6) return;
  }
  ui.cropDraft = { x: clamp(L, 0, 1), y: clamp(T, 0, 1), w: clamp(R, 0, 1) - clamp(L, 0, 1), h: clamp(B, 0, 1) - clamp(T, 0, 1) };
  drawOverlay();
}
function cropOverlay(g, k) {
  const b = cropBoxArt(g), s = 9 / k, w = b.x1 - b.x0, h = b.y1 - b.y0, d = ui.cropDraft;
  const parts = ['<path d="M0 0H' + g.TW + 'V' + g.TH + 'H0Z M' + b.x0 + ' ' + b.y0 + 'V' + b.y1 + 'H' + b.x1 + 'V' + b.y0 + 'Z" fill="rgba(0,0,0,.55)" fill-rule="evenodd"/>'];
  for (let i = 1; i < 3; i++) parts.push('<line x1="' + (b.x0 + w * i / 3) + '" y1="' + b.y0 + '" x2="' + (b.x0 + w * i / 3) + '" y2="' + b.y1 + '" stroke="#fff" stroke-opacity=".45" stroke-width="1" vector-effect="non-scaling-stroke"/><line x1="' + b.x0 + '" y1="' + (b.y0 + h * i / 3) + '" x2="' + b.x1 + '" y2="' + (b.y0 + h * i / 3) + '" stroke="#fff" stroke-opacity=".45" stroke-width="1" vector-effect="non-scaling-stroke"/>');
  parts.push('<rect x="' + b.x0 + '" y="' + b.y0 + '" width="' + w + '" height="' + h + '" fill="none" stroke="#fff" stroke-width="1.6" vector-effect="non-scaling-stroke"/>');
  cropHandles(g).forEach((q) => parts.push('<rect x="' + (q.ax - s / 2) + '" y="' + (q.ay - s / 2) + '" width="' + s + '" height="' + s + '" fill="#fff" stroke="#111" stroke-width="1" vector-effect="non-scaling-stroke"/>'));
  const label = Math.round(d.w * iw) + ' × ' + Math.round(d.h * ih) + ' px';
  parts.push('<text x="' + (b.x0 + 6 / k) + '" y="' + (b.y0 + 18 / k) + '" font-size="' + (12 / k) + '" fill="#fff" stroke="#000" stroke-opacity=".5" stroke-width="' + (3 / k) + '" paint-order="stroke" font-family="system-ui, sans-serif">' + label + '</text>');
  return parts.join('');
}
function buildCropBar(bar) {
  const r = doc.photo.ratio || 'free';
  bar.appendChild(optSeg(CROP_RATIOS.concat([['custom', 'Custom']]), r, setCropRatio, 'Crop shape'));
  if (r === 'custom') {
    bar.append(numInput('W', ui.cropCustom[0], (v) => { ui.cropCustom[0] = v; setCropRatio('custom'); }, { min: 0.1 }), numInput('H', ui.cropCustom[1], (v) => { ui.cropCustom[1] = v; setCropRatio('custom'); }, { min: 0.1 }));
  }
  if (/^\d+:\d+$/.test(r)) bar.appendChild(optBtn('Swap ⇄', () => { const [a, b] = r.split(':'); const flip = b + ':' + a; if (CROP_RATIOS.some((q) => q[0] === flip)) setCropRatio(flip); else { ui.cropCustom = [+b, +a]; setCropRatio('custom'); } }));
  bar.appendChild(el('span', 'div'));
  bar.append(optBtn('⟲', () => rotateImage(-1)), optBtn('⟳', () => rotateImage(1)), optBtn('Flip ↔', () => flipImage('x')), optBtn('Flip ↕', () => flipImage('y')));
  [...bar.querySelectorAll('.btn')].slice(-4, -2).forEach((b, i) => { b.title = i ? 'Rotate right' : 'Rotate left'; b.setAttribute('aria-label', b.title); });
  bar.appendChild(el('span', 'div'));
  bar.append(optBtn('Reset', cropReset), optBtn('Cancel', () => setTool('hand')), optBtn('Apply crop', cropApply, true));
  bar.appendChild(el('span', 'hint', 'Drag the corners or sides. Drag inside to move. Shift keeps the shape. Enter applies.'));
}

/* ---------------- image versions, so undo can bring back a rotated or resized photo ---------------- */
let imgVer = 0;
const imgStore = new Map();
function storeImage() {
  imgVer++;
  imgStore.set(imgVer, { img: origImg, url: doc.imageURL });
  if (imgStore.size > 12) imgStore.delete(imgStore.keys().next().value);
}
function restoreImage(ver) {
  if (ver === imgVer || !imgStore.has(ver)) return false;
  const s = imgStore.get(ver);
  origImg = s.img; iw = s.img.naturalWidth || s.img.width; ih = s.img.naturalHeight || s.img.height;
  doc.imageURL = s.url; imgVer = ver; photoSrcCache = null;
  setupMasks(); maskVer = -1;
  return true;
}
/* bake a transform into the photo. M maps old image pixels to new ones: [a, b, c, d, e, f] like canvas setTransform. */
function bakeImage(M, nw, nh, opt) {
  opt = opt || {};
  clearTimeout(histTimer); commitHistory();
  const ck = Math.min(1, 3000 / Math.max(nw, nh));
  const F = M.map((v) => v * ck);
  const c = mk(Math.round(nw * ck), Math.round(nh * ck)), x = c.getContext('2d');
  if (opt.bg && opt.bg !== 'transparent') { x.fillStyle = opt.bg; x.fillRect(0, 0, c.width, c.height); }
  x.setTransform(F[0], F[1], F[2], F[3], F[4], F[5]); x.drawImage(origImg, 0, 0, iw, ih); x.setTransform(1, 0, 0, 1, 0, 0);
  const P = (px, py) => [F[0] * px + F[2] * py + F[4], F[1] * px + F[3] * py + F[5]], V = (vx, vy) => [F[0] * vx + F[2] * vy, F[1] * vx + F[3] * vy];
  doc.lines.paths.forEach((p) => p.nodes.forEach((n) => {
    const [x0, y0] = P(n.x, n.y), [ix0, iy0] = V(n.ix || 0, n.iy || 0), [ox0, oy0] = V(n.ox || 0, n.oy || 0);
    Object.assign(n, { x: x0, y: y0, ix: ix0, iy: iy0, ox: ox0, oy: oy0 }); if (n.w) n.w *= ck;
  }));
  doc.lines.paths.forEach((p) => { p.width *= ck; if (p.sw) p.sw *= ck; });
  doc.objects.forEach((o) => {
    const [cx, cy] = P(o.x + o.w / 2, o.y + o.h / 2);
    o.w *= ck; o.h *= ck; if (o.size) o.size *= ck; if (o.sw) o.sw *= ck;
    o.x = cx - o.w / 2; o.y = cy - o.h / 2;
    if (opt.rot) o.rot = (((o.rot || 0) + opt.rot) % 360 + 540) % 360 - 180;
    if (opt.flip === 'x') { o.flipX = !o.flipX; o.rot = -(o.rot || 0); }
    if (opt.flip === 'y') { o.flipY = !o.flipY; o.rot = -(o.rot || 0); }
  });
  if (doc.photo.crop) {
    const cr = doc.photo.crop, a = P(cr.x * iw, cr.y * ih), b = P((cr.x + cr.w) * iw, (cr.y + cr.h) * ih);
    const x0 = Math.min(a[0], b[0]) / c.width, x1 = Math.max(a[0], b[0]) / c.width, y0 = Math.min(a[1], b[1]) / c.height, y1 = Math.max(a[1], b[1]) / c.height;
    doc.photo.crop = { x: clamp(x0, 0, 1), y: clamp(y0, 0, 1), w: clamp(x1, 0, 1) - clamp(x0, 0, 1), h: clamp(y1, 0, 1) - clamp(y0, 0, 1) };
    if (isFull(doc.photo.crop)) doc.photo.crop = null;
  }
  if (ui.cropDraft) { const d = ui.cropDraft, a = P(d.x * iw, d.y * ih), b = P((d.x + d.w) * iw, (d.y + d.h) * ih); ui.cropDraft = { x: Math.min(a[0], b[0]) / c.width, y: Math.min(a[1], b[1]) / c.height, w: Math.abs(b[0] - a[0]) / c.width, h: Math.abs(b[1] - a[1]) / c.height }; }
  // the removal mask follows the photo
  const oldRem = hasRemoval ? remCanvas : null, oldIw = iw, oldIh = ih;
  origImg = c; iw = c.width; ih = c.height;
  const hasAlpha = opt.bg === 'transparent' || hasRemoval;
  doc.imageURL = hasAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.92);
  photoSrcCache = null;
  setupMasks();
  // old image pixels -> new mask pixels, with q old image pixels per source pixel
  const rx = remCanvas.getContext('2d'), s = master.w / iw;
  const setT = (q) => rx.setTransform(F[0] * s * q, F[1] * s * q, F[2] * s * q, F[3] * s * q, F[4] * s, F[5] * s);
  if (opt.bg === 'transparent') {
    rx.fillStyle = '#fff'; rx.fillRect(0, 0, remCanvas.width, remCanvas.height);
    rx.globalCompositeOperation = 'destination-out'; setT(1); rx.fillRect(0, 0, oldIw, oldIh);
    rx.setTransform(1, 0, 0, 1, 0, 0); rx.globalCompositeOperation = 'source-over'; hasRemoval = true;
  }
  if (oldRem) { setT(oldIw / oldRem.width); rx.drawImage(oldRem, 0, 0); rx.setTransform(1, 0, 0, 1, 0, 0); hasRemoval = true; }
  storeImage(); snapshotMask();
  objVer++; vecVer++;
  rebuildBase(); rebuildPhotoView(); buildAll(); compose();
  if (doc.text.applied && !doc.text.locked) scheduleText(0);
  queueHistory(); thumbsSoon(); statusIdle();
}
function rotateImage(dir) {
  const M = dir > 0 ? [0, 1, -1, 0, ih, 0] : [0, -1, 1, 0, 0, iw];
  bakeImage(M, ih, iw, { rot: dir > 0 ? 90 : -90 });
}
function flipImage(axis) { bakeImage(axis === 'x' ? [-1, 0, 0, 1, iw, 0] : [1, 0, 0, -1, 0, ih], iw, ih, { flip: axis }); }
function openCanvasSize() {
  const st = { w: iw, h: ih, ax: 0.5, ay: 0.5, bg: 'transparent' };
  openDialog('Canvas size', (body) => {
    body.appendChild(el('p', 'note', 'Add space around the photo, or trim it. Lines, shapes and text stay where they are on the photo.'));
    const row = el('div', 'row2');
    row.append(numInput('Width', st.w, (v) => { st.w = Math.round(v); }, { min: 16, unit: 'px' }), numInput('Height', st.h, (v) => { st.h = Math.round(v); }, { min: 16, unit: 'px' }));
    body.appendChild(row);
    body.appendChild(el('span', 'lab', 'Photo sits at'));
    const grid = el('div', 'anchor');
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', 'Anchor ' + ['top', 'middle', 'bottom'][y] + ' ' + ['left', 'center', 'right'][x]); b.setAttribute('aria-pressed', String(st.ax === x / 2 && st.ay === y / 2)); b.onclick = () => { st.ax = x / 2; st.ay = y / 2; grid.querySelectorAll('button').forEach((q) => q.setAttribute('aria-pressed', String(q === b))); }; grid.appendChild(b); }
    body.appendChild(grid);
    body.appendChild(el('span', 'lab', 'New area'));
    body.appendChild(optSeg([['transparent', 'Clear'], ['#ffffff', 'White'], ['#000000', 'Black'], [doc.out.paper, 'Paper color']], st.bg, (v) => { st.bg = v; body.querySelectorAll('.seg')[0].querySelectorAll('button').forEach((q, i) => q.setAttribute('aria-pressed', String(['transparent', '#ffffff', '#000000', doc.out.paper][i] === v))); }, 'New area'));
    const go = optBtn('Change canvas size', () => { closeDialog(); bakeImage([1, 0, 0, 1, (st.w - iw) * st.ax, (st.h - ih) * st.ay], st.w, st.h, { bg: st.bg }); }, true);
    body.appendChild(go);
  });
}

/* ---------------- compare: a divider with one look on each side ---------------- */
const COMPARE_KINDS = [['original', 'Original photo'], ['photo', 'Edited photo'], ['lines', 'Vector'], ['text', 'Text art'], ['photo+lines', 'Photo and vector'], ['text+lines', 'Text art and vector'], ['current', 'What you see']];
function compareCanvas(kind, g, S) {
  const c = mk(g.TW, g.TH), x = c.getContext('2d');
  if (kind === 'original') {
    x.fillStyle = '#808080'; x.fillRect(0, 0, g.TW, g.TH);
    const cr = cropRect(); x.drawImage(origImg, cr.x * iw, cr.y * ih, cr.w * iw, cr.h * ih, g.m, g.m, g.W, g.H);
    return c;
  }
  const ground = doc.out.transparent ? 'checker' : 'paper';
  if (kind === 'current') composeTo(x, g, S, { mixFade: ui.view === 'mix', ground });
  else composeTo(x, g, Object.assign({}, S, { text: S.text || textCanvas }), { only: kind.split('+'), ground });
  return c;
}
/* The compare divider is a line at any angle. angle 0 is up and down (left and right sides), 90 is across (top and bottom).
   pos 0..1 slides it along its normal over the whole picture. The first side is where (p - c) · n < 0. */
function splitGeom(W, H) {
  const a = (ui.compare.angle || 0) * Math.PI / 180, nx = Math.cos(a), ny = Math.sin(a), dx = -ny, dy = nx;
  const L = Math.abs(W * nx) + Math.abs(H * ny), k = (clamp(ui.compare.pos, 0, 1) - 0.5) * L;
  const cx = W / 2 + nx * k, cy = H / 2 + ny * k;
  // where the line enters and leaves the picture
  let t0 = -1e9, t1 = 1e9;
  [[dx, cx, W], [dy, cy, H]].forEach(([d, c, M]) => {
    if (Math.abs(d) < 1e-9) return;
    const a1 = (0 - c) / d, a2 = (M - c) / d;
    t0 = Math.max(t0, Math.min(a1, a2)); t1 = Math.min(t1, Math.max(a1, a2));
  });
  if (t1 < t0) { t0 = 0; t1 = 0; }
  return { nx, ny, dx, dy, cx, cy, L, t0, t1 };
}
const splitAcross = () => { const a = Math.abs(((ui.compare.angle || 0) % 180 + 180) % 180); return a > 45 && a < 135; };
function drawSplit(x, g, S) {
  if (ui.compare.right !== 'current') { x.globalAlpha = 1; x.drawImage(compareCanvas(ui.compare.right, g, S), 0, 0); }
  const L = compareCanvas(ui.compare.left, g, S), q = splitGeom(g.TW, g.TH), B = (g.TW + g.TH) * 2;
  x.save(); x.beginPath();
  x.moveTo(q.cx + q.dx * B, q.cy + q.dy * B); x.lineTo(q.cx - q.dx * B, q.cy - q.dy * B);
  x.lineTo(q.cx - q.dx * B - q.nx * B, q.cy - q.dy * B - q.ny * B); x.lineTo(q.cx + q.dx * B - q.nx * B, q.cy + q.dy * B - q.ny * B);
  x.closePath(); x.clip();
  x.clearRect(0, 0, g.TW, g.TH); x.drawImage(L, 0, 0); x.restore();
}
const kindName = (k) => (COMPARE_KINDS.find((q) => q[0] === k) || [k, k])[1];
function layoutSplit() {
  const on = ui.compare.on && !ui.cropDraft && !!origImg;
  $('splitH').hidden = !on; $('splitBar').hidden = !on;
  $('splitBtn').setAttribute('aria-pressed', String(ui.compare.on));
  if (!on) return;
  // the divider sits on the artwork itself, which on paper or a shirt is smaller than the frame
  const h = $('splitH'), w = canvas.offsetWidth, ht = canvas.offsetHeight;
  const q = splitGeom(w, ht), len = Math.max(24, q.t1 - q.t0), mid = (q.t0 + q.t1) / 2;
  const mx = canvas.offsetLeft + q.cx + q.dx * mid, my = canvas.offsetTop + q.cy + q.dy * mid;
  Object.assign(h.style, { left: mx + 'px', top: (my - len / 2) + 'px', height: len + 'px', bottom: 'auto', transform: 'rotate(' + (ui.compare.angle || 0) + 'deg)' });
  h.style.cursor = splitAcross() ? 'ns-resize' : 'ew-resize';
  h.setAttribute('aria-valuenow', String(Math.round(ui.compare.pos * 100)));
  // labels stay upright
  ['splitTagL', 'splitTagR'].forEach((id) => { $(id).style.transform = 'rotate(' + (-(ui.compare.angle || 0)) + 'deg)'; });
  $('splitTagL').textContent = kindName(ui.compare.left); $('splitTagR').textContent = kindName(ui.compare.right);
  const sides = splitAcross() ? ['Top', 'Bottom'] : ['Left', 'Right'];
  const bl = $('splitBar').querySelectorAll('.split-side');
  if (bl.length === 2) { bl[0].textContent = sides[0]; bl[1].textContent = sides[1]; }
}
const SPLIT_ANGLES = [[0, '│', 'Up and down'], [90, '─', 'Across'], [-45, '╲', 'Slanted down to the right'], [45, '╱', 'Slanted up to the right']];
function buildSplitBar() {
  const b = $('splitBar'); b.replaceChildren();
  const pick = (side) => {
    const s = el('select'); s.setAttribute('aria-label', side === 'left' ? 'First side shows' : 'Second side shows');
    COMPARE_KINDS.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; if (ui.compare[side] === v) o.selected = true; s.appendChild(o); });
    s.onchange = () => { ui.compare[side] = s.value; compose(); };
    return s;
  };
  const swap = el('button', 'icon-btn', '⇄'); swap.type = 'button'; swap.title = 'Swap sides'; swap.setAttribute('aria-label', 'Swap sides');
  swap.onclick = () => { [ui.compare.left, ui.compare.right] = [ui.compare.right, ui.compare.left]; buildSplitBar(); compose(); };
  const x = el('button', 'icon-btn', '×'); x.type = 'button'; x.title = 'Close compare'; x.setAttribute('aria-label', 'Close compare'); x.onclick = () => toggleSplit(false);
  // the direction of the divider: four quick choices, and any angle with the slider or Shift and the arrow keys
  const dir = el('div', 'seg split-dir'); dir.setAttribute('role', 'group'); dir.setAttribute('aria-label', 'Divider direction');
  SPLIT_ANGLES.forEach(([a, sym, name]) => {
    const bt = el('button', null, sym); bt.type = 'button'; bt.title = name; bt.setAttribute('aria-label', name);
    bt.setAttribute('aria-pressed', String((ui.compare.angle || 0) === a));
    bt.onclick = () => { setSplitAngle(a); buildSplitBar(); };
    dir.appendChild(bt);
  });
  const ang = el('input'); ang.type = 'range'; ang.min = -90; ang.max = 90; ang.step = 1; ang.value = ui.compare.angle || 0; ang.className = 'split-angle';
  ang.setAttribute('aria-label', 'Divider angle'); ang.title = 'Divider angle. Shift and the arrow keys on the divider turn it too.';
  ang.oninput = () => { setSplitAngle(+ang.value); dir.querySelectorAll('button').forEach((bt, i) => bt.setAttribute('aria-pressed', String(SPLIT_ANGLES[i][0] === +ang.value))); };
  const sides = splitAcross() ? ['Top', 'Bottom'] : ['Left', 'Right'];
  b.append(el('span', 'split-side', sides[0]), pick('left'), swap, pick('right'), el('span', 'split-side', sides[1]), dir, ang, x);
}
function setSplitAngle(a) { ui.compare.angle = clamp(Math.round(a), -90, 90); compose(); }
function toggleSplit(force) {
  ui.compare.on = force === undefined ? !ui.compare.on : !!force;
  if (ui.compare.on) buildSplitBar();
  compose();
}
$('splitBtn').onclick = () => toggleSplit();
(function splitDrag() {
  const h = $('splitH');
  h.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); h.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const r = canvas.getBoundingClientRect(), q = splitGeom(r.width, r.height);
      const px = ev.clientX - r.left - r.width / 2, py = ev.clientY - r.top - r.height / 2;
      ui.compare.pos = clamp((px * q.nx + py * q.ny) / q.L + 0.5, 0, 1); compose();
    };
    const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  });
  h.addEventListener('keydown', (e) => {
    const k = e.key, fwd = k === 'ArrowRight' || k === 'ArrowDown', back = k === 'ArrowLeft' || k === 'ArrowUp';
    if (!fwd && !back) return;
    e.preventDefault();
    if (e.shiftKey) { setSplitAngle((ui.compare.angle || 0) + (fwd ? 5 : -5)); buildSplitBar(); return; }
    ui.compare.pos = clamp(ui.compare.pos + (back ? -0.02 : 0.02), 0, 1); compose();
  });
})();


/* ---------------- new artboard ---------------- */
function artboardPx(st) {
  const u = st.unit;
  const f = u === 'px' ? 1 : u === 'in' ? st.dpi : u === 'mm' ? st.dpi / 25.4 : u === 'cm' ? st.dpi / 2.54 : st.cell;
  return [Math.max(16, Math.round(st.w * f)), Math.max(16, Math.round(st.h * f))];
}
function openNewArtboard() {
  const st = Object.assign({ dpi: 300, cell: 24, bg: '#ffffff' }, ARTBOARDS[0]);
  openDialog('New artboard', (body) => {
    const presets = el('div', 'presets');
    const form = el('div', 'dlg-form');
    const info = el('div', 'print-big');
    const render = () => {
      presets.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.name === st.name)));
      form.replaceChildren();
      form.appendChild(optSeg(UNITS, st.unit, (v) => { const [pw, ph] = artboardPx(st); st.unit = v; const f = artboardPx(Object.assign({}, st, { w: 1, h: 1 }))[0] || 1; st.w = +(pw / Math.max(1, v === 'px' ? 1 : f)).toFixed(v === 'px' || v === 'cells' ? 0 : 2); st.h = +(ph / Math.max(1, v === 'px' ? 1 : f)).toFixed(v === 'px' || v === 'cells' ? 0 : 2); st.name = null; render(); }, 'Units'));
      const row = el('div', 'row2');
      const unitName = st.unit === 'cells' ? 'cells' : st.unit;
      row.append(numInput('Width', st.w, (v) => { st.w = v; st.name = null; upd(); }, { min: 1, unit: unitName }), numInput('Height', st.h, (v) => { st.h = v; st.name = null; upd(); }, { min: 1, unit: unitName }));
      if (['in', 'mm', 'cm'].includes(st.unit)) row.appendChild(numInput('Resolution', st.dpi, (v) => { st.dpi = v; upd(); }, { min: 36, max: 1200, unit: 'dpi' }));
      if (st.unit === 'cells') row.appendChild(numInput('Cell size', st.cell, (v) => { st.cell = v; upd(); }, { min: 1, unit: 'px' }));
      form.appendChild(row);
      form.appendChild(el('span', 'lab', 'Background'));
      const bg = el('div', 'swatches');
      [['#ffffff', 'White'], ['#f3efe6', 'Cream'], ['#111113', 'Black'], ['transparent', 'Clear']].forEach(([h, n]) => { const b = el('button', 'sw' + (h === 'transparent' ? ' sw-clear' : '')); b.type = 'button'; if (h !== 'transparent') b.style.background = h; b.title = n; b.setAttribute('aria-label', n + ' background'); b.setAttribute('aria-pressed', String(st.bg === h)); b.onclick = () => { st.bg = h; render(); }; bg.appendChild(b); });
      const ci = el('input'); ci.type = 'color'; ci.value = st.bg === 'transparent' ? '#ffffff' : st.bg; ci.setAttribute('aria-label', 'Custom background color'); ci.oninput = () => { st.bg = ci.value; };
      bg.appendChild(ci); form.appendChild(bg);
      form.appendChild(info);
      if (st.unit === 'cells') form.appendChild(el('span', 'note', 'A grid of cells is handy for pixel art, cross-stitch and ASCII layouts. Pick a matching Columns value in the ASCII or Braille style.'));
      upd();
    };
    const upd = () => { const [w, h] = artboardPx(st); info.textContent = w.toLocaleString() + ' × ' + h.toLocaleString() + ' px' + (w > 8000 || h > 8000 ? ' (large, exports may be slow)' : ''); };
    ARTBOARDS.forEach((a) => {
      const b = el('button', 'preset'); b.type = 'button'; b.dataset.name = a.name;
      const ar = a.w / a.h, pw = ar >= 1 ? 26 : Math.round(26 * ar), ph = ar >= 1 ? Math.round(26 / ar) : 26;
      const ic = el('i'); ic.style.width = pw + 'px'; ic.style.height = ph + 'px';
      b.append(ic, el('b', null, a.name), el('small', null, a.w + ' × ' + a.h + ' ' + (a.unit === 'cells' ? 'cells' : a.unit)));
      b.onclick = () => { Object.assign(st, a); render(); };
      presets.appendChild(b);
    });
    body.append(presets, form);
    const go = optBtn('Create artboard', () => { closeDialog(); createArtboard(st); }, true);
    body.appendChild(go);
    render();
  }, true);
}
function createArtboard(st) {
  const [w, h] = artboardPx(st);
  const k = Math.min(1, 2000 / Math.max(w, h));
  const c = mk(Math.round(w * k), Math.round(h * k)), x = c.getContext('2d');
  if (st.bg !== 'transparent') { x.fillStyle = st.bg; x.fillRect(0, 0, c.width, c.height); }
  const name = (st.name || 'Artboard') + ' ' + w + '×' + h;
  return loadImageURL(c.toDataURL('image/png'), name).then(() => {
    doc.sample = null; buildSamples(); freshImage();
    doc.blank = { bg: st.bg, w, h };
    doc.out.width = clamp(w, 200, 12000);
    if (st.unit !== 'px' && st.unit !== 'cells') doc.out.dpi = st.dpi;
    if (st.bg !== 'transparent') doc.out.paper = st.bg; else doc.out.transparent = true;
    rebuildPhotoView(); compose(); buildAll(); buildSamples(); statusIdle(); queueHistory();
    setTool('text');
    toast('Blank artboard, ' + w + ' × ' + h + ' px. Add text, shapes or lines, or place an image.');
  });
}

/* ---------------- settings ---------------- */
function openSettings() {
  openDialog('Settings', (body) => {
    const set = (k, v) => { prefs[k] = v; savePrefs(); };
    const s1 = sec(body, 'Zoom');
    s1.appendChild(makeControl(prefs, R('zoomSpeed', 'Wheel and pinch speed', 0.2, 3, 0.05, { idp: 'pf-' }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, T('zoomSmooth', 'Glide smoothly to the new size', { idp: 'pf-' }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, R('zoomDuration', 'Glide time (ms)', 40, 500, 10, { idp: 'pf-' }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, Object.assign(S('wheel', 'Mouse wheel alone', [['scroll', 'Scrolls'], ['zoom', 'Zooms']]), { idp: 'pf-', rebuild: () => openSettings() }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, Object.assign(S('zoomAnchor', 'Zoom toward', [['cursor', 'The cursor'], ['center', 'The center']]), { idp: 'pf-', rebuild: () => openSettings() }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, Object.assign(SEL('zoomStep', 'Plus and minus buttons step by', [[1.1, '10%'], [1.25, '25%'], [1.5, '50%'], [2, '100% (double)']]), { idp: 'pf-' }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, Object.assign(SEL('zoomMax', 'Largest zoom', [[8, '800%'], [16, '1600%'], [32, '3200%'], [64, '6400%']]), { idp: 'pf-' }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, T('zoomInvert', 'Reverse wheel direction', { idp: 'pf-' }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, Object.assign(S('dblClick', 'Double-click with Move', [['toggle', 'Fit and 100%'], ['none', 'Nothing']]), { idp: 'pf-', rebuild: () => openSettings() }), () => savePrefs()));
    s1.appendChild(makeControl(prefs, T('pixelated', 'Sharp pixels when zoomed in far', { idp: 'pf-' }), () => { savePrefs(); layoutStage(); }));
    s1.appendChild(makeControl(prefs, T('zoomHud', 'Show the zoom size while zooming', { idp: 'pf-' }), () => savePrefs()));
    const rs = optBtn('Reset zoom settings', () => { ['zoomSpeed', 'zoomSmooth', 'zoomDuration', 'wheel', 'zoomAnchor', 'zoomStep', 'zoomMax', 'zoomInvert', 'dblClick', 'pixelated', 'zoomHud'].forEach((k) => set(k, PREF_DEFAULTS[k])); openSettings(); });
    rs.classList.add('btn-quiet'); s1.appendChild(rs);
    const sn = sec(body, 'Snapping and grid');
    sn.appendChild(makeControl(prefs.snap, T('on', 'Snap while drawing and moving', { idp: 'pf-sn-' }), () => { savePrefs(); buildOptbar(); }));
    sn.appendChild(makeControl(prefs.grid, T('show', 'Show the grid', { idp: 'pf-g-' }), () => { savePrefs(); drawOverlay(); }));
    sn.appendChild(numInput('Grid size', prefs.grid.size || gridSize(), (v) => { prefs.grid.size = Math.max(1, Math.round(v)); savePrefs(); drawOverlay(); }, { min: 1, max: 2000, step: 1, unit: 'image pixels' }));
    sn.appendChild(el('span', 'note', 'Choose what to snap to under View → Snapping, or with the small arrow next to Snap. Hold Alt to place something freely.'));
    const s2 = sec(body, 'Look');
    s2.appendChild(makeControl(prefs, Object.assign(S('theme', 'Theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]), { idp: 'pf-', rebuild: () => { applyTheme(); openSettings(); } }), () => savePrefs()));
    const sm = sec(body, 'Motion');
    sm.appendChild(makeControl(prefs, Object.assign(S('motion', 'Animations', [['full', 'Full'], ['calm', 'Calm'], ['off', 'Off']]), { idp: 'pf-', rebuild: () => { applyMotion(); openSettings(); } }), () => savePrefs()));
    sm.appendChild(makeControl(prefs, Object.assign(S('reveal', 'When text art appears', [['fly', 'Letters fly in'], ['fade', 'Fade in'], ['none', 'At once']]), { idp: 'pf-', rebuild: () => openSettings() }), () => savePrefs()));
    sm.appendChild(el('span', 'note', 'If your computer is set to reduce motion, SungFluence keeps still whatever you choose here.'));
    const s3 = sec(body, 'This computer');
    s3.appendChild(makeControl(doc.out, T('gentle', 'Gentle on this computer', { idp: 'pf-' }), () => {}));
    s3.appendChild(el('span', 'note', 'Settings are saved on this computer only.'));
  });
}
$('settingsBtn').onclick = openSettings;

/* ---------------- about and license ---------------- */
function openAbout() {
  openDialog('About SungFluence', (body) => {
    const v = window.SUNGFLUENCE_VERSION || '';
    body.append(el('p', null, 'SungFluence ' + v + '. A small design studio that turns images into art made of letters.'),
      el('p', 'note', 'Free and open source software. Made by Ahmed Bilal. Copyright (C) 2026 Ahmed Bilal and contributors.'),
      el('p', 'note', 'This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.'));
    const links = el('div', 'row2');
    const a1 = el('a', 'btn', 'Source code'); a1.href = 'https://github.com/datakeen/Sungfluence'; a1.target = '_blank'; a1.rel = 'noopener';
    const a2 = el('a', 'btn', 'GNU AGPL v3 license'); a2.href = 'https://www.gnu.org/licenses/agpl-3.0.html'; a2.target = '_blank'; a2.rel = 'noopener';
    const a3 = el('a', 'btn', 'LinkedIn'); a3.href = 'https://www.linkedin.com/in/abilal/'; a3.target = '_blank'; a3.rel = 'noopener';
    const a4 = el('a', 'btn', 'Send feedback'); a4.href = 'https://github.com/datakeen/Sungfluence/issues'; a4.target = '_blank'; a4.rel = 'noopener'; a4.title = 'Report a bug or share an idea on GitHub';
    links.append(a1, a2, a3, a4); body.appendChild(links);
    body.appendChild(el('p', 'note', 'If you change SungFluence and let people use it over a network, the license asks you to offer them your changed source code too.'));
  });
}

/* ---------------- on-canvas guides for the selected text layer: the fade shape and the spiral's reach ---------------- */
/* Distances in a fade shape are measured in picture heights (see focusDist in the engine). */
const RTL_TEXT = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
function guideLayer() {
  if (ui.tab !== 'text' || !doc.text.applied || doc.out.mock !== 'artboard' || ui.cropDraft || !textShown() || ui.compare.on) return null;
  const L = curLayer();
  if (!L || L.hidden || !activeLayers().includes(L)) return null;
  const fade = L.focus && L.focus !== 'none' && ui.open.focus;
  const spiral = L.mode === 'spiral';
  return fade || spiral ? { L, fade, spiral } : null;
}
function fadeFrame(L, g) {
  const a = (L.fa || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const cx = g.m + (L.fx ?? 0.5) * g.W, cy = g.m + (L.fy ?? 0.5) * g.H, H = g.H, asp = g.W / g.H;
  // local (x, y) in picture heights -> overlay pixels
  const at = (x, y) => [cx + (x * ca - y * sa) * H, cy + (x * sa + y * ca) * H];
  const local = (px, py) => { const X = (px - cx) / H, Y = (py - cy) / H; return [X * ca + Y * sa, -X * sa + Y * ca, X, Y]; };
  return { a, cx, cy, H, asp, at, local };
}
/* the handles of the current guides, in overlay pixels. k = screen pixels per overlay pixel */
function guideHandles(G, g, k) {
  const hs = [];
  if (G.fade) {
    const L = G.L, F = fadeFrame(L, g), fr = L.fr ?? 0.55, fs = L.fs ?? 0.45, kind = L.focus;
    const out = (fr + fs / 2) * 0.5, mid = fr * 0.5, far = 26 / k / F.H;
    hs.push({ id: 'f-move', at: [F.cx, F.cy], shape: 'dot' });
    if (kind === 'circle') {
      const s = 0.5 * Math.min(F.asp, 1);
      hs.push({ id: 'f-size', at: [F.cx, F.cy - fr * s * F.H] }, { id: 'f-soft', at: [F.cx, F.cy + (fr + fs / 2) * s * F.H] });
    } else if (kind === 'ellipse') {
      hs.push({ id: 'f-size', at: F.at(0, -mid) }, { id: 'f-width', at: F.at(mid * F.asp * (L.fe ?? 1), 0) }, { id: 'f-soft', at: F.at(0, out) }, { id: 'f-turn', at: F.at(0, -mid - far), shape: 'round', base: -Math.PI / 2 });
    } else if (kind === 'vertical') {
      hs.push({ id: 'f-size', at: F.at(0, -mid) }, { id: 'f-soft', at: F.at(0, out) }, { id: 'f-turn', at: F.at(Math.min(0.3 * F.asp, 0.45), 0), shape: 'round', base: 0 });
    } else {
      hs.push({ id: 'f-size', at: F.at(mid * F.asp, 0) }, { id: 'f-soft', at: F.at(-out * F.asp, 0) }, { id: 'f-turn', at: F.at(0, -0.3), shape: 'round', base: -Math.PI / 2 });
    }
  }
  if (G.spiral) {
    const L = G.L, R = C.spiralReach(L, g.W, g.H), cx = g.m + R.cx, cy = g.m + R.cy, a0 = (L.a0 ?? -90) * Math.PI / 180;
    const startR = L.start === 'outside' ? R.r1 : Math.max(R.r0, 14 / k), endR = L.start === 'outside' ? Math.max(R.r0, 14 / k) : R.r1;
    hs.push({ id: 's-move', at: [cx, cy], shape: 'dot' });
    // a handle beyond the artboard is pulled back to its edge, so it can always be reached
    const reach = (ang, rr) => {
      const c = Math.cos(ang), sn = Math.sin(ang);
      const tx = c > 1e-6 ? (g.TW - cx) / c : c < -1e-6 ? -cx / c : Infinity, ty = sn > 1e-6 ? (g.TH - cy) / sn : sn < -1e-6 ? -cy / sn : Infinity;
      const t = Math.min(rr, tx, ty);
      return [cx + t * c, cy + t * sn];
    };
    // the end handle points at the farthest corner, where the end circle stays on the artboard longest
    const far = Math.atan2((R.cy < g.H / 2 ? g.H : 0) - R.cy, (R.cx < g.W / 2 ? g.W : 0) - R.cx);
    hs.push({ id: 's-start', at: reach(a0, startR), shape: 'round' });
    hs.push({ id: 's-end', at: reach(L.start === 'outside' ? a0 + Math.PI : far, endR) });
  }
  return hs;
}
function guideOverlay(g, k) {
  const G = guideLayer();
  if (!G) return '';
  const parts = [], col = '#ff9f0a', u = (px) => (px / k).toFixed(2);
  const line = (d, dash, w) => '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 1.4) + '"' + (dash ? ' stroke-dasharray="5 4"' : '') + ' vector-effect="non-scaling-stroke"/>';
  if (G.fade) {
    const L = G.L, F = fadeFrame(L, g), fr = L.fr ?? 0.55, fs = L.fs ?? 0.45, kind = L.focus, deg = (L.fa || 0);
    const rings = [[fr, false], [fr - fs / 2, true], [fr + fs / 2, true]].filter(([d]) => d > 0.005);
    for (const [d, dash] of rings) {
      if (kind === 'circle') {
        const r = d * 0.5 * Math.min(F.asp, 1) * F.H;
        parts.push('<circle cx="' + F.cx + '" cy="' + F.cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="1.4"' + (dash ? ' stroke-dasharray="5 4"' : '') + ' vector-effect="non-scaling-stroke"/>');
      } else if (kind === 'ellipse') {
        const rx = d * 0.5 * F.asp * (L.fe ?? 1) * F.H, ry = d * 0.5 * F.H;
        parts.push('<ellipse cx="' + F.cx + '" cy="' + F.cy + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + deg + ' ' + F.cx + ' ' + F.cy + ')" fill="none" stroke="' + col + '" stroke-width="1.4"' + (dash ? ' stroke-dasharray="5 4"' : '') + ' vector-effect="non-scaling-stroke"/>');
      } else {
        const big = 3 * Math.max(1, F.asp);
        for (const s of [-1, 1]) {
          const p = kind === 'vertical' ? [F.at(-big, s * d * 0.5), F.at(big, s * d * 0.5)] : [F.at(s * d * 0.5 * F.asp, -big), F.at(s * d * 0.5 * F.asp, big)];
          parts.push(line('M' + p[0].join(' ') + 'L' + p[1].join(' '), dash));
        }
      }
    }
    const turn = guideHandles(G, g, k).find((h) => h.id === 'f-turn');
    if (turn) parts.push(line('M' + F.cx + ' ' + F.cy + 'L' + turn.at.join(' '), true, 1));
  }
  if (G.spiral) {
    const L = G.L, R = C.spiralReach(L, g.W, g.H), cx = g.m + R.cx, cy = g.m + R.cy;
    if (R.r0 > 1) parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R.r0 + '" fill="none" stroke="' + col + '" stroke-width="1.2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>');
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R.r1 + '" fill="none" stroke="' + col + '" stroke-width="1.4" vector-effect="non-scaling-stroke"/>');
    // an arrow from the start handle shows which way the text runs
    const st = guideHandles(G, g, k).find((h) => h.id === 's-start');
    const auto = RTL_TEXT.test(L.text || '') ? -1 : 1, dir = L.turn === 'cw' ? 1 : L.turn === 'ccw' ? -1 : auto;
    const rr = Math.hypot(st.at[0] - cx, st.at[1] - cy) || 1, a0 = Math.atan2(st.at[1] - cy, st.at[0] - cx), sweep = dir * Math.min(0.9, 48 / k / rr);
    const pts = []; for (let i = 0; i <= 8; i++) { const a = a0 + sweep * i / 8; pts.push((cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1)); }
    const ae = a0 + sweep, ex = cx + rr * Math.cos(ae), ey = cy + rr * Math.sin(ae), tx = -Math.sin(ae) * dir, ty = Math.cos(ae) * dir, hl = 7 / k;
    parts.push(line('M' + pts.join('L'), false, 2));
    parts.push('<path d="M' + (ex - tx * hl - ty * hl * 0.7) + ' ' + (ey - ty * hl + tx * hl * 0.7) + 'L' + ex + ' ' + ey + 'L' + (ex - tx * hl + ty * hl * 0.7) + ' ' + (ey - ty * hl - tx * hl * 0.7) + '" fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke"/>');
  }
  // lines stay on the artboard; handles may sit just outside it
  const lines = '<defs><clipPath id="guideClip"><rect x="0" y="0" width="' + g.TW + '" height="' + g.TH + '"/></clipPath></defs><g clip-path="url(#guideClip)">' + parts.join('') + '</g>';
  parts.length = 0;
  for (const h of guideHandles(G, g, k)) {
    const [x, y] = h.at;
    if (h.shape === 'dot') parts.push('<circle cx="' + x + '" cy="' + y + '" r="' + u(6) + '" fill="' + col + '" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke"><title>Drag to move</title></circle>');
    else if (h.shape === 'round') parts.push('<circle cx="' + x + '" cy="' + y + '" r="' + u(5) + '" fill="#fff" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke"><title>' + (h.id === 's-start' ? 'Drag: where the text starts' : 'Drag to turn') + '</title></circle>');
    else { const s = 9 / k; parts.push('<rect x="' + (x - s / 2) + '" y="' + (y - s / 2) + '" width="' + s + '" height="' + s + '" fill="#fff" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke"><title>' + ({ 'f-size': 'Drag to change the size', 'f-width': 'Drag to change the width', 'f-soft': 'Drag to change the softness', 's-end': 'Drag: where the text ends' })[h.id] + '</title></rect>'); }
  }
  return '<g class="guide">' + lines + parts.join('') + '</g>';
}
function guideHit(p) {
  const G = guideLayer();
  if (!G) return null;
  const g = artGeom();
  // the last handles drawn are on top
  return guideHandles(G, g, p.k).reverse().find((h) => Math.hypot(h.at[0] - p.ax, h.at[1] - p.ay) < 10 / p.k) || null;
}
function guideDown(p) {
  const h = guideHit(p);
  if (!h) return false;
  const G = guideLayer();
  drag = { kind: 'guide', id: h.id, L: G.L, off: [h.at[0] - p.ax, h.at[1] - p.ay], base: h.base || 0 };
  return true;
}
function guideMove(p, e) {
  const d = drag, L = d.L, g = artGeom();
  const ax = p.ax + d.off[0], ay = p.ay + d.off[1];
  const fu = (ax - g.m) / g.W, fv = (ay - g.m) / g.H;
  const snap = (deg) => e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
  if (d.id === 'f-move') { L.fx = +clamp(fu, 0, 1).toFixed(3); L.fy = +clamp(fv, 0, 1).toFixed(3); }
  else if (d.id === 's-move') { L.cx = +clamp(fu, 0, 1).toFixed(3); L.cy = +clamp(fv, 0, 1).toFixed(3); }
  else if (d.id.startsWith('f-')) {
    const F = fadeFrame(L, g), [x, y, X, Y] = F.local(ax, ay), fr = L.fr ?? 0.55;
    const circ = L.focus === 'circle', col = L.focus === 'horizontal';
    // the distance this pointer would have in the fade's own measure
    const dist = circ ? Math.hypot(X, Y) / (0.5 * Math.min(F.asp, 1)) : col ? Math.abs(x) / (0.5 * F.asp) : Math.abs(y) / 0.5;
    if (d.id === 'f-size') L.fr = +clamp(dist, 0.05, 1.6).toFixed(3);
    else if (d.id === 'f-soft') L.fs = +clamp(2 * (dist - fr), 0.02, 1.2).toFixed(3);
    else if (d.id === 'f-width') L.fe = +clamp(Math.abs(x) / (0.5 * F.asp * fr), 0.2, 3).toFixed(3);
    else if (d.id === 'f-turn') {
      let deg = (Math.atan2(Y, X) - d.base) * 180 / Math.PI;
      // the shapes look the same after half a turn, so keep the angle between -90 and 90
      while (deg > 90) deg -= 180;
      while (deg < -90) deg += 180;
      L.fa = snap(deg);
    }
  } else {
    const R = C.spiralReach(L, g.W, g.H), cx = g.m + R.cx, cy = g.m + R.cy;
    const r = Math.hypot(ax - cx, ay - cy) / R.maxR, ang = Math.atan2(ay - cy, ax - cx) * 180 / Math.PI;
    const inner = (d.id === 's-start') === (L.start !== 'outside');
    if (inner) L.r0 = +clamp(r < 0.03 ? 0 : r, 0, Math.max(0, (L.r1 ?? 1) - 0.03)).toFixed(3);
    else L.r1 = +clamp(r, Math.max(0.05, (L.r0 || 0) + 0.03), 1).toFixed(3);
    if (d.id === 's-start') L.a0 = snap(ang);
  }
  drawOverlay();
  scheduleText(90);
}
function guideEnd() { queueHistory(); buildControls(); }
