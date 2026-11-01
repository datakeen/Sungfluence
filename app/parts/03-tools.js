/* ===================== Part 3: stage, zoom, tools, overlay ===================== */
const viewport = $('viewport'), wrap = $('canvasWrap'), frame = $('frame'), overlay = $('overlay');
const designW = () => doc.out.width * (1 + 2 * (doc.out.margin || 0));
const ZOOM_MIN = 0.02;
function fitScale() {
  const pad = 56;
  const k = Math.min((wrap.clientWidth - pad) / canvas.width, (wrap.clientHeight - pad) / canvas.height);
  return Math.max(0.02, Math.min(k, 1.6)) * canvas.width / designW();
}
let shirtSVG = null;
function displayZoom() { return ui.zoom === 'fit' ? fitScale() : ui.zoom; }
function clampZoom(z) { return clamp(z, ZOOM_MIN, prefs.zoomMax || 16); }
const canPan = () => wrap.scrollWidth > wrap.clientWidth + 1 || wrap.scrollHeight > wrap.clientHeight + 1;
function wrapClass() { wrap.className = 'canvas-wrap tool-' + ui.tool + (spaceDown ? ' tool-hand' : '') + (canPan() ? ' can-pan' : '') + (drag && drag.kind === 'pan' ? ' panning' : ''); }
function layoutStage() {
  const mock = doc.out.mock !== 'artboard';
  ['zoomIn', 'zoomOut', 'zoomFit', 'zoomPct'].forEach((id) => { $(id).disabled = mock; });
  $('zoomPct').textContent = mock ? 'Fit' : Math.round(displayZoom() * 100) + '%';
  $('zoomFit').setAttribute('aria-pressed', String(!mock && ui.zoom === 'fit'));
  frame.className = 'frame';
  frame.removeAttribute('style');
  canvas.removeAttribute('style');
  if (shirtSVG && doc.out.mock !== 'shirt') { shirtSVG.remove(); shirtSVG = null; }
  overlay.style.display = mock ? 'none' : '';
  if (!mock) {
    const z = displayZoom();
    const w = Math.max(1, Math.round(designW() * z)), h = Math.max(1, Math.round(w * canvas.height / canvas.width));
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    if (prefs.pixelated && w / canvas.width > 2) canvas.style.imageRendering = 'pixelated';
    frame.style.width = w + 'px'; frame.style.height = h + 'px';
    Object.assign(overlay.style, { width: w + 'px', height: h + 'px' });
    layoutSplit(); positionTextEdit(); wrapClass();
    return;
  }
  layoutSplit();
  const availW = wrap.clientWidth - 56, availH = wrap.clientHeight - 56;
  if (doc.out.mock === 'paper') {
    const g = printGeom();
    const k = Math.min(availW / g.pw, availH / g.ph);
    frame.classList.add('sheet');
    frame.style.width = Math.round(g.pw * k) + 'px'; frame.style.height = Math.round(g.ph * k) + 'px';
    frame.style.setProperty('--sheet', doc.out.transparent ? '#ffffff' : doc.out.paper);
    canvas.style.width = Math.round(g.aw * k) + 'px'; canvas.style.height = Math.round(g.ah * k) + 'px';
  } else {
    const k = Math.min(availW / 400, availH / 440);
    frame.classList.add('shirt');
    frame.style.width = Math.round(400 * k) + 'px'; frame.style.height = Math.round(440 * k) + 'px';
    if (!shirtSVG) {
      frame.insertAdjacentHTML('afterbegin', '<svg class="shirt-art" viewBox="0 0 400 440" aria-hidden="true"><defs><linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".10"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs><path id="shirtBody" d="M150 20 L70 45 L10 120 L55 165 L95 140 L95 430 L305 430 L305 140 L345 165 L390 120 L330 45 L250 20 Q200 70 150 20 Z"/><path d="M150 20 L70 45 L10 120 L55 165 L95 140 L95 430 L305 430 L305 140 L345 165 L390 120 L330 45 L250 20 Q200 70 150 20 Z" fill="url(#shade)"/><path d="M150 20 Q200 70 250 20" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="5"/></svg>');
      shirtSVG = frame.querySelector('svg.shirt-art');
    }
    shirtSVG.querySelector('#shirtBody').setAttribute('fill', doc.out.shirt);
    const maxW = 400 * 0.34 * k, maxH = 440 * 0.42 * k;
    const s = Math.min(maxW / canvas.width, maxH / canvas.height);
    const w = canvas.width * s, h = canvas.height * s;
    canvas.style.width = Math.round(w) + 'px'; canvas.style.height = Math.round(h) + 'px';
    canvas.style.left = Math.round(200 * k - w / 2) + 'px'; canvas.style.top = Math.round(96 * k) + 'px';
  }
  wrapClass();
}

/* ---------------- zoom ----------------
   Zoom keeps the point under the cursor still. Wheel and pinch zoom are proportional to how far you scroll,
   and glide to the new size. Speed, glide, steps and limits are in Settings. */
function setZoom(z, anchor, quick) {
  if (doc.out.mock !== 'artboard') return;
  const before = displayZoom();
  ui.zoom = z === 'fit' ? 'fit' : clampZoom(z);
  const after = displayZoom();
  const ax = anchor ? anchor.x : wrap.clientWidth / 2, ay = anchor ? anchor.y : wrap.clientHeight / 2;
  const fx = (wrap.scrollLeft + ax - frame.offsetLeft) / before, fy = (wrap.scrollTop + ay - frame.offsetTop) / before;
  layoutStage();
  if (ui.zoom !== 'fit') { wrap.scrollLeft = fx * after + frame.offsetLeft - ax; wrap.scrollTop = fy * after + frame.offsetTop - ay; }
  else { wrap.scrollLeft = 0; wrap.scrollTop = 0; }
  wrapClass();
  if (!quick) drawOverlay();
  zoomHud();
}
let zAnim = null;
function zoomTo(z, anchor, smooth) {
  z = z === 'fit' ? 'fit' : clampZoom(z);
  if (z === 'fit' || !(smooth ?? prefs.zoomSmooth) || prefs.zoomDuration <= 0) { if (zAnim) { cancelAnimationFrame(zAnim.raf); zAnim = null; } setZoom(z, anchor); return; }
  const from = displayZoom();
  if (zAnim) cancelAnimationFrame(zAnim.raf);
  zAnim = { from, to: z, t0: performance.now(), anchor, dur: prefs.zoomDuration, raf: 0 };
  const tick = (now) => {
    const a = zAnim; if (!a) return;
    const t = clamp((now - a.t0) / a.dur, 0, 1), e = 1 - Math.pow(1 - t, 3);
    setZoom(Math.exp(Math.log(a.from) + (Math.log(a.to) - Math.log(a.from)) * e), a.anchor, t < 1);
    if (t < 1) a.raf = requestAnimationFrame(tick); else zAnim = null;
  };
  zAnim.raf = requestAnimationFrame(tick);
}
function zoomBy(f, anchor) { zoomTo((zAnim ? zAnim.to : displayZoom()) * f, anchor); }
function stepZoom(dir, anchor) { zoomBy(Math.pow(prefs.zoomStep || 1.25, dir), anchor); }
function zoomToRect(ax0, ay0, ax1, ay1) {
  // a box in artboard pixels fills the window
  const w = Math.abs(ax1 - ax0), h = Math.abs(ay1 - ay0);
  if (w < 2 || h < 2) return;
  const k = canvas.width / designW();
  const z = clampZoom(Math.min((wrap.clientWidth - 56) / (w / k), (wrap.clientHeight - 56) / (h / k)));
  if (zAnim) { cancelAnimationFrame(zAnim.raf); zAnim = null; }
  setZoom(z);
  const s = z / k;
  wrap.scrollLeft = frame.offsetLeft + Math.min(ax0, ax1) * s - (wrap.clientWidth - w * s) / 2;
  wrap.scrollTop = frame.offsetTop + Math.min(ay0, ay1) * s - (wrap.clientHeight - h * s) / 2;
}
let hudTimer = null;
function zoomHud() {
  if (!prefs.zoomHud) return;
  const h = $('zoomHud'); h.textContent = Math.round(displayZoom() * 100) + '%'; h.hidden = false;
  clearTimeout(hudTimer); hudTimer = setTimeout(() => { h.hidden = true; }, 700);
}
$('zoomIn').onclick = () => stepZoom(1);
$('zoomOut').onclick = () => stepZoom(-1);
$('zoomFit').onclick = () => zoomTo('fit');
$('zoomPct').onclick = (e) => { e.stopPropagation(); toggleZoomMenu(); };
function toggleZoomMenu(force) {
  const m = $('zoomMenu');
  const show = force === undefined ? m.hidden : force;
  m.hidden = !show;
  if (!show) return;
  m.replaceChildren();
  const k = canvas.width / designW();
  const items = [['Fit to window', () => zoomTo('fit'), MOD + ' 0'], ['Fit width', () => zoomTo((wrap.clientWidth - 56) / (canvas.width / k)), ''], ['Actual size, 100%', () => zoomTo(1), MOD + ' 1'],
    ['Zoom to selection', zoomToSelection, MOD + ' 2']].concat([0.25, 0.5, 2, 4, 8].map((z) => [Math.round(z * 100) + '%', () => zoomTo(z), '']));
  items.forEach(([t, fn, kb]) => { const b = el('button'); b.type = 'button'; b.append(el('b', null, t), el('span', null, kb)); b.onclick = () => { toggleZoomMenu(false); fn(); }; m.appendChild(b); });
  m.appendChild(el('hr'));
  const sl = optRange('Zoom', 0, 1, 0.001, Math.log(displayZoom() / ZOOM_MIN) / Math.log(prefs.zoomMax / ZOOM_MIN), (v) => Math.round(ZOOM_MIN * Math.pow(prefs.zoomMax / ZOOM_MIN, v) * 100) + '%', (v) => setZoom(ZOOM_MIN * Math.pow(prefs.zoomMax / ZOOM_MIN, v)));
  sl.classList.add('menu-range'); m.appendChild(sl);
  const st = optBtn('Zoom settings…', () => { toggleZoomMenu(false); openSettings(); }); st.classList.add('btn-quiet'); m.appendChild(st);
  const r = $('zoomPct').getBoundingClientRect();
  m.style.left = Math.round(r.left) + 'px'; m.style.top = 'auto'; m.style.bottom = Math.round(window.innerHeight - r.top + 6) + 'px';
}
wrap.addEventListener('wheel', (e) => {
  const zoomGesture = e.ctrlKey || e.metaKey || (prefs.wheel === 'zoom' && !e.shiftKey);
  if (!zoomGesture || doc.out.mock !== 'artboard') return;
  e.preventDefault();
  let dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
  if (prefs.zoomInvert) dy = -dy;
  dy = clamp(dy, -150, 150);
  const r = wrap.getBoundingClientRect();
  const anchor = prefs.zoomAnchor === 'cursor' ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
  zoomBy(Math.exp(-dy * 0.0022 * (prefs.zoomSpeed || 1)), anchor);
}, { passive: false });
window.addEventListener('resize', () => { layoutStage(); drawOverlay(); });

/* two-finger pinch and pan on touch screens */
const touches = new Map();
let pinch = null;
function pinchState() {
  const [a, b] = [...touches.values()], r = wrap.getBoundingClientRect();
  return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
}

/* ---------------- tools ---------------- */
const ICON = {
  hand: '<path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10M11 9.5V4.5a1.5 1.5 0 0 1 3 0V10M14 9.5V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6.5 7-2.6 0-4.2-1.3-5.6-3.4L3.3 13.8a1.5 1.5 0 0 1 2.4-1.8L8 14.5V11"/>',
  zoom: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5M8 10.5h5M10.5 8v5"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  wand: '<path d="M4 20L14 10M15 3v3M15 12v3M18.5 6.5l-2 2M11.5 6.5l2 2M21 9h-3M12 9H9"/>',
  lasso: '<path d="M12 4c-5 0-9 2.4-9 5.5S7 15 12 15s9-2.4 9-5.5S17 4 12 4z"/><path d="M8 14.3c-.6 1-1 2-1 3 0 1.7 1.3 2.7 3 2.7"/>',
  brush: '<path d="M9 11l6-6 4 4-6 6"/><path d="M7 13c-2 0-3 1.5-3 4 0 1-.5 2-1 2.5 1.5 1 4 1 5.5-.5 1-1 1.5-2.5 1.5-4"/>',
  select: '<path d="M5 3l13.5 7.6-5.9 1.6L9.6 18z" fill="currentColor"/>',
  shape: '<rect x="3" y="3" width="10" height="10" rx="1.5"/><circle cx="15.5" cy="15.5" r="5.5"/>',
  text: '<path d="M5 6.5V4h14v2.5M12 4v16M9 20h6"/>',
  pen: '<path d="M12 3l6 9-6 9-6-9z"/><circle cx="12" cy="12" r="1.6"/><path d="M12 13.6V21"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  direct: '<path d="M6 3l12 9-5.5 1.2L15 20l-2.6 1.1-2.6-6.6L6 18z"/>'
};
const TOOLS = [
  { id: 'hand', name: 'Move around', key: 'H', group: '' },
  { id: 'zoom', name: 'Zoom: click zooms in, Alt-click zooms out, drag a box to fill the window', key: 'Z', group: '' },
  { sep: true, label: 'Photo' },
  { id: 'crop', name: 'Crop: drag the corners and sides of the box', key: 'C', group: 'photo' },
  { id: 'wand', name: 'Magic wand: select areas of similar color', key: 'W', group: 'photo' },
  { id: 'lasso', name: 'Lasso: draw around an area', key: 'L', group: 'photo' },
  { id: 'brush', name: 'Selection brush. Alt paints away', key: 'B', group: 'photo' },
  { sep: true, label: 'Vector' },
  { id: 'select', name: 'Select: move, scale and rotate shapes, text and images', key: 'V', group: 'lines' },
  { id: 'shape', name: 'Shapes: rectangle, ellipse, polygon, star, line', key: 'U', group: 'lines' },
  { id: 'text', name: 'Text: click to type', key: 'T', group: 'lines' },
  { id: 'pen', name: 'Pen: click for corners, drag for curves', key: 'P', group: 'lines' },
  { id: 'pencil', name: 'Pencil: draw freely', key: 'N', group: 'lines' },
  { id: 'direct', name: 'Edit points of lines', key: 'A', group: 'lines' }
];
function buildRail() {
  const r = $('rail');
  r.replaceChildren();
  TOOLS.forEach((t) => {
    if (t.sep) { r.appendChild(el('div', 'sep')); r.appendChild(el('div', 'grp', t.label)); return; }
    const b = el('button', 'tool'); b.type = 'button';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[t.id] + '</svg>';
    b.setAttribute('aria-label', t.name); b.title = t.name + ' (' + t.key + ')';
    b.setAttribute('aria-pressed', String(ui.tool === t.id));
    b.onclick = () => setTool(t.id);
    r.appendChild(b);
  });
}
function setTool(id) {
  if (ui.tool === 'pen' && id !== 'pen') finishPen();
  if (ui.tool === 'crop' && id !== 'crop') cropCancel();
  commitTextEdit();
  ui.tool = id; ui.snapHint = null;
  const t = TOOLS.find((x) => x.id === id);
  const tab = t && t.group ? ((id === 'shape' || id === 'text') && ui.objLayer === 'photo' ? 'photo' : t.group) : null;
  if (tab && ui.tab !== tab) { ui.tab = tab; buildTabs(); buildPanel(); }
  if (t && t.group === 'lines' && !doc.lines.visible) { doc.lines.visible = true; buildStack(); }
  if (t && t.group === 'photo' && !doc.photo.visible) setView('photo');
  if (id === 'crop') cropStart();
  $('brushRing').hidden = id !== 'brush';
  wrapClass();
  buildRail(); buildOptbar(); drawOverlay(); layoutStage(); updateCTA();
}

/* ---------------- selection operations (photo layer) ---------------- */
function combineSelection(a, mode) {
  const cur = mode === 'new' ? null : alphaOf(selCanvas);
  const res = new Uint8ClampedArray(a.length);
  for (let i = 0; i < a.length; i++) {
    const v = a[i] ? 255 : 0;
    res[i] = mode === 'add' ? Math.max(cur[i], v) : mode === 'sub' ? (v ? 0 : cur[i]) : v;
  }
  putAlpha(selCanvas, res);
  hasSelection = res.some((v) => v > 8);
  refreshSelTint(); compose(); buildOptbar();
}
function selMode(e, base) { return e && e.shiftKey ? 'add' : e && e.altKey ? 'sub' : base; }
function selRemove() {
  if (!hasSelection) { toast('Select an area first with the wand, lasso or brush.'); return; }
  remCanvas.getContext('2d').drawImage(selCanvas, 0, 0);
  hasRemoval = true; selClear(true); maskChanged();
  toast('Removed the selected area', { label: 'Undo', fn: undo });
}
function selKeepOnly() {
  if (!hasSelection) { toast('Select the part to keep first.'); return; }
  const inv = mk(selCanvas.width, selCanvas.height), x = inv.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, inv.width, inv.height);
  x.globalCompositeOperation = 'destination-out'; x.drawImage(selCanvas, 0, 0);
  remCanvas.getContext('2d').drawImage(inv, 0, 0);
  hasRemoval = true; selClear(true); maskChanged();
  toast('Kept only the selection', { label: 'Undo', fn: undo });
}
function selRestore() {
  if (!hasSelection) { toast('Select the removed area you want back first.'); return; }
  const x = remCanvas.getContext('2d');
  x.globalCompositeOperation = 'destination-out'; x.drawImage(selCanvas, 0, 0); x.globalCompositeOperation = 'source-over';
  hasRemoval = anyAlpha(remCanvas); selClear(true); maskChanged();
}
function selInvert() {
  const a = alphaOf(selCanvas);
  for (let i = 0; i < a.length; i++) a[i] = 255 - a[i];
  putAlpha(selCanvas, a); hasSelection = true; refreshSelTint(); compose(); buildOptbar();
}
function selClear(silent) {
  selCanvas.getContext('2d').clearRect(0, 0, selCanvas.width, selCanvas.height);
  hasSelection = false; refreshSelTint();
  if (!silent) { compose(); buildOptbar(); }
}
function selGrow(px) {
  const a = alphaOf(selCanvas), w = selCanvas.width, h = selCanvas.height;
  const f = new Float32Array(a.length); for (let i = 0; i < a.length; i++) f[i] = a[i] / 255;
  const b = C.blur(f, w, h, Math.abs(px), 1);
  for (let i = 0; i < a.length; i++) a[i] = px > 0 ? (b[i] > 0.04 ? 255 : 0) : (b[i] > 0.96 ? 255 : 0);
  putAlpha(selCanvas, a); hasSelection = a.some((v) => v > 8); refreshSelTint(); compose(); buildOptbar();
}
function selectBackground(tol) {
  if (!master.base) master.base = C.prepare(photoSrc(), 1200);
  const b = master.base;
  const m = C.borderFlood(b, tol ?? 0.12);
  // borderFlood works on the analysis copy; scale it to mask size
  const c = mk(b.w, b.h); putAlpha(c, m.map((v) => v * 255));
  const s = mk(selCanvas.width, selCanvas.height); s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
  combineSelection(alphaOf(s).map((v) => v > 127 ? 1 : 0), 'new');
}
function removeBackground() {
  selectBackground(ui.bgTol ?? 0.12);
  if (!hasSelection) { toast('No plain background found at the edges. Try the wand instead.'); return; }
  selRemove();
}
function clearRemoval() {
  remCanvas.getContext('2d').clearRect(0, 0, remCanvas.width, remCanvas.height);
  hasRemoval = false; maskChanged();
}

/* ---------------- pointer handling ---------------- */
function evPos(e) {
  const r = canvas.getBoundingClientRect();
  const ax = (e.clientX - r.left) / r.width * canvas.width, ay = (e.clientY - r.top) / r.height * canvas.height;
  return { ax, ay, k: r.width / canvas.width, cx: e.clientX, cy: e.clientY };
}
function toImg(p) { return art2img(p.ax, p.ay, artGeom()); }
function toMaster(ix, iy) { return [ix * master.w / iw, iy * master.h / ih]; }
let drag = null, spaceDown = false, pen = null, hover = null;
wrap.addEventListener('pointerdown', (e) => {
  if (!origImg || doc.out.mock !== 'artboard') return;
  if (e.target.closest('.hud, .cta, .split-h, .text-edit')) return;
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { drag = null; const s = pinchState(); pinch = { d: s.d, z: displayZoom(), x: s.x, y: s.y, sl: wrap.scrollLeft, st: wrap.scrollTop }; return; }
  }
  const p = evPos(e);
  // handles of the fade shape or the spiral come first, whatever the tool
  if (e.button === 0 && !spaceDown && guideDown(p)) { e.preventDefault(); wrap.setPointerCapture(e.pointerId); return; }
  if (e.button === 1 || (e.button === 0 && (ui.tool === 'hand' || spaceDown))) {
    if (!canPan()) return;
    e.preventDefault();
    drag = { kind: 'pan', x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop };
    wrap.setPointerCapture(e.pointerId); wrapClass(); return;
  }
  if (e.button !== 0) return;
  e.preventDefault();
  wrap.setPointerCapture(e.pointerId);
  const [ix, iy] = toImg(p);
  if (ui.tool === 'zoom') { drag = { kind: 'zoomRect', a: [p.ax, p.ay], b: [p.ax, p.ay], alt: e.altKey, wr: wrap.getBoundingClientRect(), cx: e.clientX, cy: e.clientY }; return; }
  if (ui.tool === 'crop') { cropDown(p, ix, iy); return; }
  if (ui.tool === 'select') { selectDown(p, ix, iy, e); return; }
  if (ui.tool === 'shape') { const s = snapAt(ix, iy, { e, p }); shapeDown(s[0], s[1], e); return; }
  if (ui.tool === 'text') { const s = snapAt(ix, iy, { e, p }); textDown(p, s[0], s[1]); return; }
  if (ui.tool === 'wand') {
    const [mx, my] = toMaster(ix, iy);
    if (mx < 0 || my < 0 || mx >= master.w || my >= master.h) return;
    combineSelection(C.wand(master.data.data, master.w, master.h, mx, my, ui.wand.tol, ui.wand.contiguous), selMode(e, ui.wand.mode));
  } else if (ui.tool === 'lasso') {
    drag = { kind: 'lasso', pts: [[ix, iy]], mode: selMode(e, ui.lasso.mode) };
  } else if (ui.tool === 'brush') {
    drag = { kind: 'brush', sub: e.altKey || ui.brush.mode === 'sub', last: null };
    brushAt(p);
  } else if (ui.tool === 'pen') {
    const s = snapAt(ix, iy, penSnap(e, p));
    penDown(p, s[0], s[1]);
  } else if (ui.tool === 'pencil') {
    drag = { kind: 'pencil', pts: [[ix, iy]], last: [p.cx, p.cy] };
  } else if (ui.tool === 'direct') {
    directDown(p, ix, iy);
  }
});
wrap.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) {
      const s = pinchState();
      setZoom(pinch.z * s.d / pinch.d, { x: s.x, y: s.y }, true);
      wrap.scrollLeft -= s.x - pinch.x; wrap.scrollTop -= s.y - pinch.y; pinch.x = s.x; pinch.y = s.y;
      return;
    }
  }
  const p = evPos(e);
  if (ui.tool === 'brush') { const ring = $('brushRing'); const vr = viewport.getBoundingClientRect(); ring.style.left = (e.clientX - vr.left) + 'px'; ring.style.top = (e.clientY - vr.top) + 'px'; ring.style.width = ring.style.height = ui.brush.size + 'px'; }
  if (!drag && ['pen', 'shape', 'text'].includes(ui.tool)) {
    const before = JSON.stringify(ui.snapHint);
    const s = snapAt(...toImg(p), ui.tool === 'pen' ? penSnap(e, p) : { e, p });
    if (ui.tool === 'pen' && pen) { hover = s; drawOverlay(); }
    else if (JSON.stringify(ui.snapHint) !== before) drawOverlay();
  }
  if (!drag) { if (guideHit(p)) wrap.style.cursor = 'grab'; else if (ui.tool === 'select' || ui.tool === 'crop') hoverCursor(p); else wrap.style.cursor = ''; return; }
  if (drag.kind === 'pan') { wrap.scrollLeft = drag.sl - (e.clientX - drag.x); wrap.scrollTop = drag.st - (e.clientY - drag.y); return; }
  const [ix, iy] = toImg(p);
  if (drag.kind === 'zoomRect') { drag.b = [p.ax, p.ay]; drawOverlay(); }
  else if (drag.kind === 'lasso') { drag.pts.push([ix, iy]); drawOverlay(); }
  else if (drag.kind === 'brush') brushAt(p);
  else if (drag.kind === 'pencil') { if (Math.hypot(p.cx - drag.last[0], p.cy - drag.last[1]) >= 2) { drag.pts.push([ix, iy]); drag.last = [p.cx, p.cy]; drawOverlay(); } }
  else if (drag.kind === 'penHandle') { const n = pen.nodes[pen.nodes.length - 1]; const s = snapAt(ix, iy, { e, p, anchor: [n.x, n.y] }); n.ox = s[0] - n.x; n.oy = s[1] - n.y; n.ix = -n.ox; n.iy = -n.oy; drawOverlay(); }
  else if (drag.kind === 'node' || drag.kind === 'handle' || drag.kind === 'path') directMove(ix, iy, e, p);
  else if (drag.kind.startsWith('crop')) cropMove(ix, iy, e);
  else if (drag.kind === 'guide') guideMove(p, e);
  else if (drag.kind.startsWith('obj') || drag.kind === 'marquee' || drag.kind === 'shapeDraw') objDragMove(ix, iy, e, p);
});
const endDrag = (e) => {
  if (e && e.pointerType === 'touch') { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; }
  if (!drag) return;
  const d = drag; drag = null;
  ui.snapHint = null;
  wrapClass();
  if (d.kind === 'zoomRect') {
    const moved = Math.hypot((d.b[0] - d.a[0]) * evPos(e).k, (d.b[1] - d.a[1]) * evPos(e).k) > 6;
    if (moved && !d.alt) zoomToRect(d.a[0], d.a[1], d.b[0], d.b[1]);
    else stepZoom(d.alt ? -1 : 1, { x: d.cx - d.wr.left, y: d.cy - d.wr.top });
  } else if (d.kind === 'lasso' && d.pts.length > 2) {
    const c = mk(master.w, master.h), x = c.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath();
    d.pts.forEach(([ix, iy], i) => { const [mx, my] = toMaster(ix, iy); i ? x.lineTo(mx, my) : x.moveTo(mx, my); });
    x.closePath(); x.fill();
    combineSelection(alphaOf(c).map((v) => v > 127 ? 1 : 0), d.mode);
  } else if (d.kind === 'brush') {
    hasSelection = anyAlpha(selCanvas); refreshSelTint(); compose(); buildOptbar();
  } else if (d.kind === 'pencil' && d.pts.length > 2) {
    const g = artGeom(), tol = 1.4 / (evPos(e).k * imgScale(g));
    const simp = rdp2(d.pts, tol);
    addPath({ nodes: smoothNodes(simp.map(([x, y]) => [x, y, undefined]), false).map((n) => { delete n.w; return n; }) });
  } else if (d.kind === 'node' || d.kind === 'handle' || d.kind === 'path') linesChanged();
  else if (d.kind.startsWith('crop')) buildOptbar();
  else if (d.kind === 'guide') guideEnd();
  else if (d.kind.startsWith('obj') || d.kind === 'marquee' || d.kind === 'shapeDraw') objDragEnd(d);
  drawOverlay();
};
wrap.addEventListener('pointerup', endDrag);
wrap.addEventListener('pointercancel', endDrag);
wrap.addEventListener('dblclick', (e) => {
  if (ui.tool === 'pen') { finishPen(); return; }
  if (ui.tool === 'crop') { cropApply(); return; }
  if (ui.tool === 'select') { const [ix, iy] = toImg(evPos(e)); const o = hitObject(ix, iy); if (o && o.type === 'text') editText(o); return; }
  if (ui.tool === 'hand' && prefs.dblClick === 'toggle' && doc.out.mock === 'artboard') {
    const r = wrap.getBoundingClientRect();
    zoomTo(ui.zoom === 'fit' ? 1 : 'fit', { x: e.clientX - r.left, y: e.clientY - r.top });
  }
});
wrap.addEventListener('pointerleave', () => { if (ui.tool === 'brush') $('brushRing').hidden = true; if (ui.snapHint && !drag) { ui.snapHint = null; drawOverlay(); } });
wrap.addEventListener('pointerenter', () => { if (ui.tool === 'brush') $('brushRing').hidden = false; });

function brushAt(p) {
  const g = artGeom();
  const [ix, iy] = toImg(p);
  const [mx, my] = toMaster(ix, iy);
  const rad = ui.brush.size / 2 / p.k / imgScale(g) * master.w / iw;
  const x = selCanvas.getContext('2d');
  x.globalCompositeOperation = drag.sub ? 'destination-out' : 'source-over';
  x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineWidth = rad * 2;
  if (drag.last) { x.beginPath(); x.moveTo(drag.last[0], drag.last[1]); x.lineTo(mx, my); x.stroke(); }
  x.beginPath(); x.arc(mx, my, rad, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'source-over';
  drag.last = [mx, my];
  hasSelection = true; refreshSelTint(); compose();
}
function rdp2(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(), [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = eps;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > bd) { bd = d; best = i; } }
    if (best > 0) { keep[best] = 1; st.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/* ---------------- lines editing ---------------- */
function newLineWidth() { return doc.lines.width || Math.max(4, Math.round(iw / 40)); }
function addPath(p) {
  const path = Object.assign({ id: uid++, closed: false, width: newLineWidth(), text: '', traced: false }, p);
  doc.lines.paths.push(path);
  ui.selPath = path.id; ui.selNode = null;
  linesChanged();
  if (ui.tab === 'lines') buildPanel();
}
function linesChanged() {
  vecVer++;
  compose();
  if (doc.text.applied && doc.text.source !== 'photo') scheduleText(200);
  queueHistory(); buildStack();
  if (ui.tab === 'lines') updateLineInfo();
}
function penDown(p, ix, iy) {
  if (!pen) pen = { nodes: [] };
  const first = pen.nodes[0];
  if (first && pen.nodes.length >= 2) {
    const [fx, fy] = img2art(first.x, first.y, artGeom());
    if (Math.hypot((fx - p.ax) * p.k, (fy - p.ay) * p.k) < 9) { finishPen(true); return; }
  }
  pen.nodes.push({ x: ix, y: iy, ix: 0, iy: 0, ox: 0, oy: 0 });
  drag = { kind: 'penHandle' };
  drawOverlay();
}
function finishPen(close) {
  if (!pen) return;
  const nodes = pen.nodes; pen = null; hover = null;
  if (nodes.length >= 2) addPath({ nodes, closed: !!close });
  drawOverlay();
}
function findPath(id) { return doc.lines.paths.find((p) => p.id === id); }
function nearestPath(p, tolPx) {
  const g = artGeom(), k = imgScale(g), map = (x, y) => img2art(x, y, g);
  let best = null, bd = tolPx / p.k;
  for (const path of doc.lines.paths) {
    const pts = flatten(path, map, k);
    for (let i = 1; i < pts.length; i++) {
      const d = segDist(p.ax, p.ay, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      if (d < bd) { bd = d; best = path; }
    }
  }
  return best;
}
function directDown(p, ix, iy) {
  const g = artGeom(), tolArt = 8 / p.k;
  const near = (x, y) => { const [ax, ay] = img2art(x, y, g); return Math.hypot(ax - p.ax, ay - p.ay) < tolArt; };
  const sel = findPath(ui.selPath);
  if (sel) {
    for (let i = 0; i < sel.nodes.length; i++) {
      const n = sel.nodes[i];
      if ((n.ox || n.oy) && near(n.x + n.ox, n.y + n.oy)) { drag = { kind: 'handle', path: sel, i, which: 'o' }; return; }
      if ((n.ix || n.iy) && near(n.x + n.ix, n.y + n.iy)) { drag = { kind: 'handle', path: sel, i, which: 'i' }; return; }
    }
  }
  const order = sel ? [sel].concat(doc.lines.paths.filter((q) => q !== sel)) : doc.lines.paths.slice().reverse();
  for (const path of order) {
    for (let i = 0; i < path.nodes.length; i++) if (near(path.nodes[i].x, path.nodes[i].y)) { ui.selPath = path.id; ui.selNode = i; drag = { kind: 'node', path, i }; drawOverlay(); if (ui.tab === 'lines') buildPanel(); return; }
  }
  const best = nearestPath(p, 7);
  if (best) { ui.selPath = best.id; ui.selNode = null; drag = { kind: 'path', path: best, last: [ix, iy] }; }
  else { ui.selPath = null; ui.selNode = null; }
  drawOverlay();
  if (ui.tab === 'lines') buildPanel();
  buildOptbar();
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function directMove(ix, iy, e, p) {
  const d = drag;
  if (d.kind === 'node') {
    const N = d.path.nodes, nb = N[d.i - 1] || N[d.i + 1];
    [ix, iy] = snapAt(ix, iy, { e, p, skipPath: d.path, skipNode: [d.path, d.i], anchor: nb ? [nb.x, nb.y] : null });
    const n = N[d.i]; n.x = ix; n.y = iy;
  }
  else if (d.kind === 'handle') {
    const n = d.path.nodes[d.i];
    [ix, iy] = snapAt(ix, iy, { e, p, skipPath: d.path, anchor: [n.x, n.y] });
    const hx = ix - n.x, hy = iy - n.y;
    if (d.which === 'o') { n.ox = hx; n.oy = hy; if (!e.altKey) { const L = Math.hypot(n.ix, n.iy) || Math.hypot(hx, hy); const a = Math.atan2(hy, hx) + Math.PI; n.ix = Math.cos(a) * L; n.iy = Math.sin(a) * L; } }
    else { n.ix = hx; n.iy = hy; if (!e.altKey) { const L = Math.hypot(n.ox, n.oy) || Math.hypot(hx, hy); const a = Math.atan2(hy, hx) + Math.PI; n.ox = Math.cos(a) * L; n.oy = Math.sin(a) * L; } }
  } else if (d.kind === 'path') {
    const dx = ix - d.last[0], dy = iy - d.last[1];
    d.path.nodes.forEach((n) => { n.x += dx; n.y += dy; });
    d.last = [ix, iy];
  }
  if (d.path.stroke) { vecVer++; compose(); } else drawOverlay();
}
function deleteSelection() {
  if (ui.selObjs.length) { deleteObjects(); return true; }
  const path = findPath(ui.selPath);
  if (!path) return false;
  if (ui.selNode != null && path.nodes.length > 2) { path.nodes.splice(ui.selNode, 1); ui.selNode = null; }
  else { doc.lines.paths = doc.lines.paths.filter((p) => p !== path); ui.selPath = null; ui.selNode = null; }
  linesChanged(); if (ui.tab === 'lines') buildPanel(); buildOptbar();
  return true;
}

/* ---------------- overlay: lines, handles, lasso, crop box, object boxes ---------------- */
function drawOverlay() {
  if (!origImg) { overlay.innerHTML = ''; return; }
  const g = artGeom();
  overlay.setAttribute('viewBox', '0 0 ' + g.TW + ' ' + g.TH);
  overlay.setAttribute('preserveAspectRatio', 'none');
  const lineTool = ['pen', 'pencil', 'direct', 'select'].includes(ui.tool);
  const show = doc.lines.visible && (!textShown() || lineTool) && doc.out.mock === 'artboard' && !ui.cropDraft;
  const r = canvas.getBoundingClientRect();
  const k = (r.width || 1) / g.TW, u = (px) => (px / k).toFixed(2);
  const map = (x, y) => img2art(x, y, g), sk = imgScale(g);
  const parts = [];
  const col = doc.lines.color;
  if (show) {
    for (const path of doc.lines.paths) {
      const pts = flatten(path, map, sk);
      if (pts.length < 2) continue;
      const d = 'M' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + (path.closed ? 'Z' : '');
      const selected = path.id === ui.selPath;
      if (path.stroke && !selected && !lineTool) continue;
      parts.push('<path d="' + d + '" fill="none" stroke="' + col + '" stroke-opacity="' + (selected ? 1 : path.stroke ? 0.35 : 0.85) + '" stroke-width="' + (selected ? 2.6 : 1.4) + '" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"' + (path.stroke ? ' stroke-dasharray="4 3"' : '') + '/>');
    }
    const sel = findPath(ui.selPath);
    if (sel && ['pen', 'pencil', 'direct'].includes(ui.tool)) {
      sel.nodes.forEach((n, i) => {
        const [ax, ay] = map(n.x, n.y);
        for (const [hx, hy] of [[n.ix, n.iy], [n.ox, n.oy]]) {
          if (!hx && !hy) continue;
          const [bx, by] = map(n.x + hx, n.y + hy);
          parts.push('<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' + col + '" stroke-width="1" vector-effect="non-scaling-stroke"/><circle cx="' + bx + '" cy="' + by + '" r="' + u(3.5) + '" fill="#fff" stroke="' + col + '" stroke-width="1.2" vector-effect="non-scaling-stroke"/>');
        }
        const s = 7 / k;
        parts.push('<rect x="' + (ax - s / 2) + '" y="' + (ay - s / 2) + '" width="' + s + '" height="' + s + '" fill="' + (i === ui.selNode ? col : '#fff') + '" stroke="' + col + '" stroke-width="1.2" vector-effect="non-scaling-stroke"/>');
      });
    }
  }
  if (pen && pen.nodes.length) {
    const tmp = { nodes: pen.nodes, width: newLineWidth(), closed: false };
    const pts = flatten(tmp, map, sk);
    let d = 'M' + pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L');
    if (hover) { const [hx, hy] = map(hover[0], hover[1]); d += 'L' + hx.toFixed(1) + ' ' + hy.toFixed(1); }
    parts.push('<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>');
    pen.nodes.forEach((n) => { const [ax, ay] = map(n.x, n.y); const s = 7 / k; parts.push('<rect x="' + (ax - s / 2) + '" y="' + (ay - s / 2) + '" width="' + s + '" height="' + s + '" fill="#fff" stroke="' + col + '" stroke-width="1.2" vector-effect="non-scaling-stroke"/>'); });
  }
  if (drag && (drag.kind === 'lasso' || drag.kind === 'pencil')) {
    const d = 'M' + drag.pts.map(([x, y]) => map(x, y).map((v) => v.toFixed(1)).join(' ')).join('L');
    parts.push('<path d="' + d + '" fill="' + (drag.kind === 'lasso' ? 'rgba(10,132,255,.12)' : 'none') + '" stroke="' + (drag.kind === 'lasso' ? '#0a84ff' : col) + '" stroke-width="1.5" stroke-dasharray="' + (drag.kind === 'lasso' ? '4 3' : '0') + '" vector-effect="non-scaling-stroke"/>');
  }
  if (drag && drag.kind === 'zoomRect') {
    const [a, b] = [drag.a, drag.b];
    parts.push('<rect x="' + Math.min(a[0], b[0]) + '" y="' + Math.min(a[1], b[1]) + '" width="' + Math.abs(b[0] - a[0]) + '" height="' + Math.abs(b[1] - a[1]) + '" fill="rgba(10,132,255,.08)" stroke="#0a84ff" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>');
  }
  if (ui.cropDraft) parts.push(cropOverlay(g, k));
  if (doc.out.mock === 'artboard' && !ui.cropDraft) parts.push(objectOverlay(g, k));
  parts.push(guideOverlay(g, k));
  parts.push(snapOverlay(g, k));
  overlay.innerHTML = parts.join('');
}

/* ---------------- option bar ---------------- */
function optRange(label, min, max, step, val, fmt, oninput) {
  const lab = el('label'); lab.append(document.createTextNode(label));
  const inp = el('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
  inp.setAttribute('aria-label', label);
  const v = el('span', 'val', fmt(val));
  inp.oninput = () => { v.textContent = fmt(+inp.value); oninput(+inp.value); };
  lab.append(inp, v);
  return lab;
}
function optSeg(options, cur, onpick, label) {
  const s = el('div', 'seg'); s.setAttribute('role', 'group'); s.setAttribute('aria-label', label);
  options.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(cur === v)); b.onclick = () => onpick(v); s.appendChild(b); });
  return s;
}
function optBtn(label, fn, primary, disabled) { const b = el('button', 'btn' + (primary ? ' btn-primary' : ''), label); b.type = 'button'; b.onclick = fn; b.disabled = !!disabled; return b; }
function selActions(bar) {
  bar.appendChild(el('span', 'div'));
  bar.append(optBtn('Remove', selRemove, true, !hasSelection), optBtn('Keep only', selKeepOnly, false, !hasSelection), optBtn('Restore', selRestore, false, !hasSelection || !hasRemoval),
    optBtn('Invert', selInvert), optBtn('Grow', () => selGrow(3), false, !hasSelection), optBtn('Shrink', () => selGrow(-3), false, !hasSelection), optBtn('Deselect', () => selClear(), false, !hasSelection),
    optBtn('Copy to object', selectionToObject, false, !hasSelection));
}
function layerSeg(bar) {
  bar.append(el('span', 'hint', 'Put on'), optSeg([['photo', 'Photo'], ['lines', 'Vector']], ui.objLayer, (v) => { ui.objLayer = v; buildOptbar(); }, 'Layer for new objects'));
}
function buildOptbar() {
  const bar = $('optbar');
  bar.replaceChildren();
  const t = ui.tool;
  if (t === 'hand') {
    bar.appendChild(el('span', 'hint', 'Drag to move around when zoomed in. ' + MOD + ' + scroll zooms smoothly, and so does a pinch. Hold Space to move with any tool. Double-click toggles Fit and 100%.'));
  } else if (t === 'zoom') {
    bar.appendChild(el('span', 'hint', 'Click to zoom in, Alt-click to zoom out, or drag a box to fill the window.'));
    bar.append(optBtn('Fit', () => zoomTo('fit')), optBtn('100%', () => zoomTo(1)), optBtn('Zoom to selection', zoomToSelection), optBtn('Settings…', openSettings));
  } else if (t === 'crop') {
    buildCropBar(bar);
  } else if (t === 'wand') {
    bar.append(optSeg([['new', 'New'], ['add', 'Add'], ['sub', 'Subtract']], ui.wand.mode, (v) => { ui.wand.mode = v; buildOptbar(); }, 'Selection mode'),
      optRange('Tolerance', 0.02, 0.6, 0.01, ui.wand.tol, (v) => Math.round(v * 100) + '%', (v) => { ui.wand.tol = v; }));
    const lab = el('label'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = ui.wand.contiguous; cb.onchange = () => { ui.wand.contiguous = cb.checked; }; lab.append(cb, document.createTextNode('Touching only'));
    bar.appendChild(lab);
    bar.appendChild(optBtn('Select background', () => selectBackground(ui.bgTol)));
    selActions(bar);
  } else if (t === 'lasso') {
    bar.appendChild(optSeg([['new', 'New'], ['add', 'Add'], ['sub', 'Subtract']], ui.lasso.mode, (v) => { ui.lasso.mode = v; buildOptbar(); }, 'Selection mode'));
    bar.appendChild(el('span', 'hint', 'Draw around an area. Shift adds, Alt subtracts.'));
    selActions(bar);
  } else if (t === 'brush') {
    bar.append(optSeg([['add', 'Paint in'], ['sub', 'Paint away']], ui.brush.mode, (v) => { ui.brush.mode = v; buildOptbar(); }, 'Brush mode'),
      optRange('Size', 4, 200, 1, ui.brush.size, (v) => Math.round(v) + ' px', (v) => { ui.brush.size = v; }));
    selActions(bar);
  } else if (t === 'select') {
    const n = ui.selObjs.length;
    bar.appendChild(el('span', 'hint', n ? n + ' selected. Drag to move, Shift keeps a straight line, Alt-drag copies. Arrow keys nudge.' : 'Click a shape, text or image. Shift-click adds. Drag on empty space to select several. Double-click text to edit.'));
    if (n) bar.append(optBtn('Duplicate', () => duplicateObjects()), optBtn('Flip ↔', () => flipObjects('x')), optBtn('Flip ↕', () => flipObjects('y')), optBtn('To front', () => arrangeObjects('front')), optBtn('To back', () => arrangeObjects('back')), optBtn('Delete', deleteObjects));
    else if (ui.selPath) bar.append(optBtn('Delete line', () => deleteSelection()));
  } else if (t === 'shape') {
    bar.appendChild(optSeg([['rect', 'Rectangle'], ['ellipse', 'Ellipse'], ['polygon', 'Polygon'], ['star', 'Star'], ['line', 'Line']], ui.shape.kind, (v) => { ui.shape.kind = v; buildOptbar(); }, 'Shape'));
    if (ui.shape.kind === 'polygon') bar.appendChild(optRange('Sides', 3, 12, 1, ui.shape.sides, String, (v) => { ui.shape.sides = v; }));
    if (ui.shape.kind === 'star') bar.append(optRange('Points', 3, 16, 1, ui.shape.points, String, (v) => { ui.shape.points = v; }), optRange('Inner', 0.15, 0.9, 0.01, ui.shape.inner, (v) => Math.round(v * 100) + '%', (v) => { ui.shape.inner = v; }));
    layerSeg(bar);
    bar.appendChild(el('span', 'hint', 'Drag to draw. Shift keeps it even.'));
  } else if (t === 'text') {
    layerSeg(bar);
    bar.appendChild(el('span', 'hint', 'Click on the artwork to add text. On the Photo layer, text becomes part of the photo, so text art draws it too.'));
  } else if (t === 'pen') {
    bar.appendChild(el('span', 'hint', 'Click for corners, drag for curves. Click the first point to close. Enter or double-click finishes.'));
    bar.appendChild(optBtn('Finish line', () => finishPen(), false, !pen));
  } else if (t === 'pencil') {
    bar.appendChild(el('span', 'hint', 'Draw freely. The line is smoothed into editable curves when you let go.'));
  } else if (t === 'direct') {
    bar.appendChild(el('span', 'hint', 'Click a line to select it. Drag points, handles or the whole line. Alt breaks a handle pair. Delete removes.'));
    bar.appendChild(optBtn('Delete', () => deleteSelection(), false, !ui.selPath));
  }
  if (['select', 'shape', 'text', 'pen', 'direct'].includes(t)) snapButtons(bar);
  syncMenus();
}
/* Snap on or off, and a menu of what it snaps to. Alt turns it off while you drag. */
function snapButtons(bar) {
  const box = el('div', 'snapbox');
  const on = el('button', 'btn' + (prefs.snap.on ? ' on' : ''), 'Snap'); on.type = 'button';
  on.setAttribute('aria-pressed', String(!!prefs.snap.on)); on.title = 'Snap to points and lines (' + keyLabel('mod+;') + '). Hold Alt to drag freely.';
  on.onclick = () => runCommand('snap.on');
  const more = el('button', 'btn', '▾'); more.type = 'button'; more.setAttribute('aria-label', 'What to snap to'); more.title = 'What to snap to';
  more.onclick = (ev) => { ev.stopPropagation(); const r = more.getBoundingClientRect(); dropMenu(resolveMenu([{ id: 'snap.on' }, { sep: true }].concat(SNAP_KINDS.map(([k]) => ({ id: 'snap.' + k })), [{ sep: true }, { id: 'view.grid' }, { id: 'snap.gridSize' }])), r.left, r.bottom + 4, 0); };
  box.append(on, more);
  bar.appendChild(box);
}
/* the pen snaps to its own points too, and draws from its last point */
function penSnap(e, p) {
  const N = pen ? pen.nodes : [], last = N[N.length - 1];
  return { e, p, anchor: last ? [last.x, last.y] : null, live: N.map((n) => [n.x, n.y]) };
}
