/* ===================== Part 3g: rulers and guides ===================== */
/* Rulers run along the top and the left of the stage. They measure the artboard in output pixels (the size of an export),
   with 0 at the artboard's top-left corner, or in millimeters or inches of the printed size from the Output panel.
   Guides are lines across the stage, kept in doc.guides as { id, axis, at }: axis 'x' is a vertical guide at x = at,
   axis 'y' a horizontal one at y = at, both in image pixels like lines and shapes, so they stay on the art when it is resized.
   They are drawn on the overlay only, so they never reach an export. */
const RULER = 20;
const GUIDE_COLOR = '#00b4d8', GUIDE_HOT = '#0077b6';
const RULER_UNITS = [['px', 'Pixels'], ['mm', 'Millimeters'], ['in', 'Inches']];
prefs.guides = Object.assign({ show: true, lock: false }, prefs.guides || {});
if (!RULER_UNITS.some(([u]) => u === prefs.rulerUnit)) prefs.rulerUnit = 'px';
doc.guides = Array.isArray(doc.guides) ? doc.guides : [];
ui.rg = { hover: null, draft: null, pointer: null };
let guideUid = 1;
const rulerH = $('rulerH'), rulerV = $('rulerV'), rulerCorner = $('rulerCorner');

/* ---------- measuring ---------- */
const rulersShown = () => !!prefs.rulers && !isMock();
/* output pixels per unit */
function unitPx(u) {
  u = u || prefs.rulerUnit;
  if (u === 'px') return 1;
  const g = printGeom(), mm = artGeom(1).TW / Math.max(1e-6, g.aw);
  return u === 'in' ? mm * 25.4 : mm;
}
/* a guide's place in output pixels from the artboard's top-left corner, and back */
function guideOut(G) { const q = img2art(G.axis === 'x' ? G.at : 0, G.axis === 'y' ? G.at : 0, artGeom(1)); return G.axis === 'x' ? q[0] : q[1]; }
function outToImg(axis, v) { const q = art2img(axis === 'x' ? v : 0, axis === 'y' ? v : 0, artGeom(1)); return axis === 'x' ? q[0] : q[1]; }
function fmtUnit(v, u) {
  u = u || prefs.rulerUnit;
  const d = u === 'px' ? (Math.abs(v) < 10 ? 1 : 0) : u === 'mm' ? 1 : 2;
  return String(+v.toFixed(d)).replace('-', '−') + ' ' + u;
}
/* screen position of output pixel 0 and screen pixels per output pixel */
function rulerMap() {
  const r = canvas.getBoundingClientRect(), G1 = artGeom(1);
  return { ox: r.left, oy: r.top, s: (r.width || 1) / G1.TW, G1 };
}
/* nice steps for the numbered ticks, and how many smaller ticks go between them */
const RULER_STEPS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
function rulerStep(pxPerUnit) {
  const step = RULER_STEPS.find((s) => s * pxPerUnit >= 58) || RULER_STEPS[RULER_STEPS.length - 1];
  const lead = +String(step).replace(/^0\.0*/, '')[0];
  const subs = String(step).includes('25') ? [5] : lead === 2 ? [4, 2] : lead === 5 ? [5] : [10, 5, 2];
  const sub = subs.find((n) => step / n * pxPerUnit >= 5) || 1;
  return { step, sub };
}

/* ---------- drawing the rulers ---------- */
let rulerRaf = 0;
function drawRulersSoon() { if (!rulerRaf) rulerRaf = requestAnimationFrame(() => { rulerRaf = 0; drawRulers(); }); }
function layoutRulers() {
  const on = rulersShown();
  viewport.classList.toggle('has-rulers', on);
  $('rulers').hidden = !on;
  return on;
}
function rulerColors() {
  const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
  return { bg: v('--panel'), out: v('--well'), well: v('--well'), tick: v('--fg3'), text: v('--fg2'), edge: v('--line-strong'), mark: v('--fg'), guide: GUIDE_COLOR };
}
function drawRulers() {
  if (!layoutRulers()) return;
  const C = rulerColors(), M = rulerMap(), u = prefs.rulerUnit, upx = unitPx(u), ppu = M.s * upx, st = rulerStep(ppu);
  const dpr = window.devicePixelRatio || 1;
  [[rulerH, 'x'], [rulerV, 'y']].forEach(([cv, axis]) => {
    const r = cv.getBoundingClientRect(), W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const len = axis === 'x' ? r.width : r.height, base = axis === 'x' ? M.ox - r.left : M.oy - r.top;
    // along: screen position in this ruler of a value in units
    const at = (v) => base + v * ppu;
    // outside the artboard the ruler is a shade darker, like the pasteboard
    x.fillStyle = C.bg; x.fillRect(0, 0, r.width, r.height);
    x.fillStyle = C.out; x.globalAlpha = 0.55; x.fillRect(0, 0, r.width, r.height); x.globalAlpha = 1;
    // the artboard's own stretch of the ruler is a touch brighter
    const a0 = at(0), a1 = at((axis === 'x' ? M.G1.TW : M.G1.TH) / upx);
    x.fillStyle = C.bg;
    if (axis === 'x') x.fillRect(a0, 0, a1 - a0, r.height); else x.fillRect(0, a0, r.width, a1 - a0);
    // the edge next to the stage
    x.fillStyle = C.edge;
    if (axis === 'x') x.fillRect(0, r.height - 1, r.width, 1); else x.fillRect(r.width - 1, 0, 1, r.height);
    const v0 = Math.floor(-base / ppu / st.step) * st.step, v1 = (len - base) / ppu;
    const minor = st.step / st.sub;
    x.fillStyle = C.tick;
    const tick = (p, size) => { const q = Math.round(p * dpr) / dpr; if (axis === 'x') x.fillRect(q, RULER - 1 - size, 1 / dpr * Math.max(1, Math.round(dpr)), size); else x.fillRect(RULER - 1 - size, q, size, 1 / dpr * Math.max(1, Math.round(dpr))); };
    for (let i = 0, v = v0; v <= v1 + st.step; i++, v = v0 + i * minor) {
      const n = Math.round((v - v0) / minor), major = n % st.sub === 0, half = st.sub % 2 === 0 && n % st.sub === st.sub / 2;
      tick(at(v), major ? RULER - 1 : half ? 7 : 4);
    }
    // numbers next to the long ticks
    x.fillStyle = C.text; x.font = '500 9.5px ' + getComputedStyle(document.body).fontFamily; x.textBaseline = 'top';
    const dec = st.step < 0.1 ? 2 : st.step < 1 ? (st.step === 0.25 ? 2 : 1) : 0;
    for (let v = v0; v <= v1; v += st.step) {
      const p = at(v), txt = String(+v.toFixed(dec)).replace('-', '−');
      // a number cut off at the start of the ruler is left out
      if (p < 0) continue;
      if (axis === 'x') x.fillText(txt, Math.round(p) + 3, 2);
      else { x.save(); x.translate(2, Math.round(p) + 3); x.rotate(-Math.PI / 2); x.textAlign = 'right'; x.fillText(txt, 0, 0); x.restore(); }
    }
    // guides show on the rulers as short marks
    if (prefs.guides.show) {
      x.fillStyle = C.guide;
      doc.guides.forEach((G) => { if (G.axis !== axis) return; const p = at(guideOut(G) / upx); if (axis === 'x') x.fillRect(Math.round(p) - 1, RULER - 6, 2, 5); else x.fillRect(RULER - 6, Math.round(p) - 1, 5, 2); });
    }
    // where the pointer is
    const pt = ui.rg.pointer;
    if (pt) {
      const p = axis === 'x' ? pt.x - r.left : pt.y - r.top;
      // kept inside the ruler, so it never pokes out past its ends
      const q = clamp(Math.round(p * dpr) / dpr, 0, len - 1);
      if (p >= 0 && p <= len) { x.fillStyle = C.mark; if (axis === 'x') x.fillRect(q, 0, 1, RULER - 1); else x.fillRect(0, q, RULER - 1, 1); }
    }
  });
}
function toggleRulers() {
  if (isMock()) { toast('Rulers show on the Artboard view.'); return; }
  prefs.rulers = !prefs.rulers; savePrefs(); layoutRulers(); layoutStage(); drawOverlay(); drawRulers(); }
function setRulerUnit(u) { prefs.rulerUnit = u; savePrefs(); rulerCornerLabel(); drawRulers(); drawOverlay(); }
/* the corner shows the unit the rulers count in */
function rulerCornerLabel() { $('rulerUnitTag').textContent = prefs.rulerUnit; rulerCorner.title = 'Rulers in ' + RULER_UNITS.find(([u]) => u === prefs.rulerUnit)[1].toLowerCase() + '. Click for units and guides.'; }
rulerCornerLabel();
wrap.addEventListener('scroll', drawRulersSoon, { passive: true });
viewport.addEventListener('pointermove', (e) => { if (!rulersShown()) return; ui.rg.pointer = { x: e.clientX, y: e.clientY }; drawRulersSoon(); }, { passive: true });
viewport.addEventListener('pointerleave', () => { if (ui.rg.pointer && !ui.rg.draft) { ui.rg.pointer = null; drawRulersSoon(); } });
if (window.ResizeObserver) new ResizeObserver(drawRulersSoon).observe(viewport);
if (window.matchMedia) { const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', drawRulersSoon); }
new MutationObserver(drawRulersSoon).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- the menu on the corner and on a right-click ---------- */
function rulerMenuItems() {
  return [{ head: 'Units' }].concat(RULER_UNITS.map(([u, t]) => Object.assign(item('view.rulerUnit.' + u), { label: t })), [SEP, { head: 'Guides' }, item('view.newGuide'), item('view.guides'), item('view.lockGuides'), item('view.clearGuides'), SEP, item('view.rulers')]);
}
function openRulerMenu(x, y) { closeMenus(); dropMenu(resolveMenu(rulerMenuItems()), x, y, 0); }
rulerCorner.onclick = (e) => { e.stopPropagation(); const r = rulerCorner.getBoundingClientRect(); openRulerMenu(r.left, r.bottom + 2); };
[rulerH, rulerV].forEach((cv) => cv.addEventListener('contextmenu', (e) => { e.preventDefault(); openRulerMenu(e.clientX, e.clientY); }));

/* ---------- guides: snapping while one is placed or moved ---------- */
/* v: the guide's place in image pixels; it snaps to the artboard's edges and center and to points of lines and shapes */
function guideSnap(axis, v, e, k) {
  ui.snapHint = null;
  if (!prefs.snap.on || (e && e.altKey && !ui.rg.draft) || !origImg) return v;
  const G = snapGeom(), tol = 8 / ((k || 1) * imgScale(artGeom()));
  let best = null;
  for (const q of G.pts) {
    if (!['end', 'point', 'mid', 'center'].includes(q.kind) || (!q.board && !prefs.snap[q.kind])) continue;
    const d = Math.abs((axis === 'x' ? q.x : q.y) - v);
    if (d <= tol && (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) < 1e-9 && q.board && !best.q.board))) best = { d, q };
  }
  // other guides do not pull, so two guides can sit close together
  if (!best) return v;
  const q = best.q;
  // the place and the snap share one tag (rulerGuideTag), so the overlay's own label is left out
  ui.snapHint = { x: q.x, y: q.y, kind: q.kind, label: q.board ? (q.kind === 'center' ? 'artboard center' : 'artboard edge') : undefined, noLabel: true };
  if (q.board && q.kind === 'mid') ui.snapHint.label = (axis === 'x' ? Math.abs(q.x - (cropRect().x + cropRect().w / 2) * iw) < 1e-6 : Math.abs(q.y - (cropRect().y + cropRect().h / 2) * ih) < 1e-6) ? 'artboard center' : 'artboard edge';
  return axis === 'x' ? q.x : q.y;
}

/* ---------- guides: placing one from a ruler ---------- */
function rulerDown(e, fromTop) {
  if (e.button !== 0 || !origImg || isMock()) return;
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  settleHistory();
  ui.rg.draft = { fromTop, axis: null, at: null, inside: false };
  drag = { kind: 'newGuide' };
  if (!prefs.guides.show) { prefs.guides.show = true; savePrefs(); }
  rulerDragMove(e);
}
function rulerDragMove(e) {
  const D = ui.rg.draft; if (!D) return;
  ui.rg.pointer = { x: e.clientX, y: e.clientY };
  // the top ruler gives a horizontal guide, the left one a vertical guide; Alt swaps them, as in Illustrator
  D.axis = (D.fromTop !== e.altKey) ? 'y' : 'x';
  const p = evPos(e), [ix, iy] = toImg(p), wr = wrap.getBoundingClientRect();
  D.inside = e.clientX >= wr.left && e.clientX <= wr.right && e.clientY >= wr.top && e.clientY <= wr.bottom;
  D.at = D.inside ? guideSnap(D.axis, D.axis === 'x' ? ix : iy, e, p.k) : null;
  if (!D.inside) ui.snapHint = null;
  drawOverlay(); drawRulersSoon();
}
function rulerUp(e) {
  const D = ui.rg.draft; if (!D) return;
  rulerDragMove(e);
  ui.rg.draft = null; drag = null; ui.snapHint = null;
  if (D.inside && D.at != null) addGuide(D.axis, D.at);
  else drawOverlay();
  drawRulersSoon();
}
[[rulerH, true], [rulerV, false]].forEach(([cv, top]) => {
  cv.addEventListener('pointerdown', (e) => rulerDown(e, top));
  cv.addEventListener('pointermove', (e) => { if (ui.rg.draft) rulerDragMove(e); });
  cv.addEventListener('pointerup', rulerUp);
  cv.addEventListener('pointercancel', () => { ui.rg.draft = null; drag = null; ui.snapHint = null; drawOverlay(); drawRulersSoon(); });
});
function addGuide(axis, at) {
  const G = { id: guideUid++, axis, at };
  doc.guides.push(G);
  guidesChanged();
  return G;
}
/* each guide change is its own step in the history */
function guidesChanged() { clearTimeout(histTimer); commitHistory(); drawOverlay(); drawRulersSoon(); syncMenus(); }
/* a change still waiting to be saved in the history (a shape just drawn) is saved before a guide moves,
   so the guide's move never ends up in that step */
function settleHistory() { clearTimeout(histTimer); commitHistory(); }
function clearGuides() {
  if (!doc.guides.length) return;
  doc.guides = []; ui.rg.hover = null;
  guidesChanged();
  toast('Guides cleared', { label: 'Undo', fn: undo });
}
function toggleGuides() { prefs.guides.show = !prefs.guides.show; savePrefs(); ui.rg.hover = null; drawOverlay(); drawRulersSoon(); }
function lockGuides() { prefs.guides.lock = !prefs.guides.lock; savePrefs(); ui.rg.hover = null; drawOverlay(); }

/* ---------- guides: moving, deleting, typing a place ---------- */
/* the Hand, Zoom, Select and Edit points tools pick up guides; with any tool, hold Ctrl (Cmd on a Mac) */
function guidesGrabbable(e) { return prefs.guides.show && !prefs.guides.lock && doc.out.mock === 'artboard' && !ui.cropDraft && !spaceDown && (['hand', 'zoom', 'select', 'direct'].includes(ui.tool) || (e && (e.ctrlKey || e.metaKey))); }
/* how close to a guide counts as on it, in screen pixels: a finger needs more room than a mouse */
const guideReach = (e) => e && (e.pointerType === 'touch' || e.pointerType === 'pen') ? 12 : 5;
function guideAt(p, reach) {
  if (!prefs.guides.show || !doc.guides.length) return null;
  const g = artGeom();
  let best = null, bd = reach || 5;
  for (const G of doc.guides) {
    const q = img2art(G.axis === 'x' ? G.at : 0, G.axis === 'y' ? G.at : 0, g), d = Math.abs((G.axis === 'x' ? p.ax - q[0] : p.ay - q[1]) * p.k);
    if (d <= bd) { bd = d; best = G; }
  }
  return best;
}
/* true when the Select or Edit points tool would pick up something here: a handle, a shape, a line or a point.
   Those come first, as in Illustrator, so a shape snapped onto a guide can still be moved and resized from that side. */
function artUnder(p) {
  const g = artGeom(), near = (ax, ay, t) => Math.hypot(ax - p.ax, ay - p.ay) <= t / p.k;
  if (ui.tool === 'select') {
    const sel = selectedObjs(), box = sel.length === 1 && !sel[0].locked ? sel[0] : pathSelBox();
    if (box && handlesOf(box, g, p.k).some((h) => near(h.ax, h.ay, 9))) return true;
    const [ix, iy] = toImg(p);
    return !!(hitObject(ix, iy, 4 / p.k / imgScale(g)) || (doc.lines.visible && hitPath(p)));
  }
  if (ui.tool === 'direct') {
    const at = (x, y) => { const q = img2art(x, y, g); return near(q[0], q[1], 8); };
    const sel = findPath(ui.selPath);
    if (sel && sel.nodes.some((n) => ((n.ox || n.oy) && at(n.x + n.ox, n.y + n.oy)) || ((n.ix || n.iy) && at(n.x + n.ix, n.y + n.iy)))) return true;
    if (doc.lines.paths.some((q) => q.nodes.some((n) => at(n.x, n.y)))) return true;
    return !!nearestPath(p, 7);
  }
  return false;
}
/* the guide a press or a hover would pick up; Ctrl (Cmd) picks the guide even over a shape */
function pickGuide(e, p) {
  if (!guidesGrabbable(e)) return null;
  const G = guideAt(p, guideReach(e));
  if (!G || e.ctrlKey || e.metaKey) return G;
  return artUnder(p) ? null : G;
}
function onRuler(e) { const wr = wrap.getBoundingClientRect(); return rulersShown() && (e.clientY < wr.top || e.clientX < wr.left); }
/* a pointer place like evPos, kept just inside the stage */
function stagePos(e) {
  const wr = wrap.getBoundingClientRect();
  return evPos({ clientX: clamp(e.clientX, wr.left + 3, wr.right - 3), clientY: clamp(e.clientY, wr.top + 3, wr.bottom - 3) });
}
function rulerGuideDown(e, p) {
  const G = pickGuide(e, p);
  if (!G) return false;
  settleHistory();
  drag = { kind: 'rguide', G, from: G.at, moved: false };
  ui.rg.hover = G.id;
  drawOverlay();
  return true;
}
function rulerGuideMove(e, p) {
  const d = drag, G = d.G, [ix, iy] = toImg(p);
  d.moved = true;
  d.off = onRuler(e);
  // over a ruler the guide stays under the pointer, held at the stage's edge, and the tag says it will go
  if (d.off) { const q = toImg(stagePos(e)); G.at = G.axis === 'x' ? q[0] : q[1]; ui.snapHint = null; }
  else G.at = guideSnap(G.axis, G.axis === 'x' ? ix : iy, e, p.k);
  wrap.style.cursor = d.off ? 'default' : G.axis === 'x' ? 'col-resize' : 'row-resize';
  drawOverlay(); drawRulersSoon();
}
function rulerGuideEnd(d, e) {
  wrap.style.cursor = '';
  if (!d.moved) return;
  if (e && e.type === 'pointercancel') { d.G.at = d.from; return; }
  // dropped back on a ruler: the guide goes away
  if (e && onRuler(e)) { doc.guides = doc.guides.filter((q) => q !== d.G); ui.rg.hover = null; }
  if (d.G.at !== d.from || !doc.guides.includes(d.G)) guidesChanged();
}
/* the cursor over a guide; returns true when the pointer is on one */
function rulerGuideHover(e, p) {
  const G = pickGuide(e, p), id = G ? G.id : null;
  if (id !== ui.rg.hover) { ui.rg.hover = id; drawOverlay(); }
  if (G) wrap.style.cursor = G.axis === 'x' ? 'col-resize' : 'row-resize';
  return !!G;
}
function editGuide(G) { guideDialog(G); }
function newGuide() { if (origImg && !isMock()) guideDialog(null); }
/* one small dialog types a guide's place: for a guide that is there (Move, Delete), or for a new one (Add) */
let lastNewAxis = 'y';
function guideDialog(G) {
  const u = prefs.rulerUnit, upx = unitPx(u), dec = u === 'px' ? 1 : 2, G1 = artGeom(1);
  const st = { axis: G ? G.axis : lastNewAxis };
  const centerOf = (axis) => +((axis === 'x' ? G1.TW : G1.TH) / 2 / upx).toFixed(dec);
  st.val = G ? +(guideOut(G) / upx).toFixed(dec) : centerOf(st.axis);
  openDialog(G ? (G.axis === 'x' ? 'Vertical guide' : 'Horizontal guide') : 'New guide', (body, d) => {
    d.classList.add('guide-dlg');
    const note = el('p', 'note');
    const field = el('div', 'guide-field');
    const apply = () => {
      if (!isFinite(st.val)) return;
      closeDialog();
      const at = outToImg(st.axis, st.val * upx);
      if (G) { G.at = at; guidesChanged(); }
      else { settleHistory(); if (!prefs.guides.show) { prefs.guides.show = true; savePrefs(); } addGuide(st.axis, at); }
    };
    const draw = () => {
      note.textContent = 'Distance from the ' + (st.axis === 'x' ? 'left' : 'top') + ' edge of the artboard.';
      const row = numInput(st.axis === 'x' ? 'X' : 'Y', st.val, (v) => { st.val = v; }, { unit: u });
      row.classList.add('guide-num');
      const inp = row.querySelector('input');
      inp.setAttribute('aria-label', (st.axis === 'x' ? 'X' : 'Y') + ' position in ' + u);
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); apply(); } });
      field.replaceChildren(row);
    };
    if (!G) {
      const seg = optSeg([['y', 'Horizontal'], ['x', 'Vertical']], st.axis, (v) => {
        st.axis = v; st.val = centerOf(v); lastNewAxis = v;
        seg.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(['y', 'x'][i] === v)));
        draw(); const i = field.querySelector('input'); if (i) { i.focus(); i.select(); }
      }, 'Direction');
      body.appendChild(seg);
    }
    draw();
    body.append(field, note);
    const bar = el('div', 'dlg-actions');
    if (G) { const del = optBtn('Delete guide', () => { closeDialog(); doc.guides = doc.guides.filter((q) => q !== G); ui.rg.hover = null; guidesChanged(); }); del.classList.add('btn-quiet', 'btn-danger'); bar.appendChild(del); }
    bar.appendChild(el('span', 'grow'));
    bar.append(optBtn('Cancel', closeDialog), optBtn(G ? 'Move guide' : 'Add guide', apply, true));
    body.appendChild(bar);
  });
  const i = $('dlg').querySelector('.guide-num input'); if (i) { i.focus(); i.select(); }
}
/* image changes that move the pixels (rotate, flip, canvas size) move the guides too */
function moveGuides(P) {
  doc.guides.forEach((G) => {
    const a = P(G.axis === 'x' ? G.at : 0, G.axis === 'y' ? G.at : 0), b = P(G.axis === 'x' ? G.at : 1, G.axis === 'y' ? G.at : 1);
    // a guide stays a straight line across or down; after a quarter turn it changes direction
    const vertical = Math.abs(a[0] - b[0]) < Math.abs(a[1] - b[1]);
    G.axis = vertical ? 'x' : 'y'; G.at = vertical ? a[0] : a[1];
  });
}

/* ---------- guides on the overlay ---------- */
function rulerGuideOverlay(g, k) {
  const parts = [], far = 1e5, ln = (axis, a, col, w, op, dash) => {
    const q = img2art(axis === 'x' ? a : 0, axis === 'y' ? a : 0, g), v = (axis === 'x' ? q[0] : q[1]).toFixed(2);
    return axis === 'x' ? '<line x1="' + v + '" y1="' + -far + '" x2="' + v + '" y2="' + far + '" stroke="' + col + '" stroke-width="' + w + '"' + (op ? ' stroke-opacity="' + op + '"' : '') + (dash ? ' stroke-dasharray="5 4" style="stroke:var(--warn)"' : '') + ' vector-effect="non-scaling-stroke" shape-rendering="crispEdges"/>'
      : '<line x1="' + -far + '" y1="' + v + '" x2="' + far + '" y2="' + v + '" stroke="' + col + '" stroke-width="' + w + '"' + (op ? ' stroke-opacity="' + op + '"' : '') + (dash ? ' stroke-dasharray="5 4" style="stroke:var(--warn)"' : '') + ' vector-effect="non-scaling-stroke" shape-rendering="crispEdges"/>';
  };
  if (prefs.guides.show) doc.guides.forEach((G) => {
    const moving = drag && drag.kind === 'rguide' && drag.G === G;
    // held at the stage's edge over a ruler: dashed in the warning color, it goes when you let go
    if (moving && drag.off) { parts.push(ln(G.axis, G.at, GUIDE_HOT, 2, 0, true)); return; }
    const hot = G.id === ui.rg.hover || moving;
    parts.push(ln(G.axis, G.at, hot ? GUIDE_HOT : GUIDE_COLOR, hot ? 1.5 : 1, prefs.guides.lock ? 0.7 : 0));
  });
  // the guide being pulled from a ruler
  const D = ui.rg.draft;
  if (D && D.at != null) parts.push(ln(D.axis, D.at, GUIDE_HOT, 1.5));
  return parts.join('');
}
/* the tag next to the pointer while a guide is pulled or moved: its place and what it snapped to, or that it will be deleted.
   It is drawn last, over everything, in the same small rounded style as the rest of the app. */
let tagCtx = null;
function rulerGuideTag(g, k) {
  const D = ui.rg.draft, mv = drag && drag.kind === 'rguide' && drag.moved ? drag : null;
  const it = D && D.at != null ? { axis: D.axis, at: D.at } : mv ? mv.G : null;
  if (!it || !ui.rg.pointer) return '';
  const h = ui.snapHint, snapped = h && h.noLabel ? (h.label || SNAP_LABEL[h.kind] || '') : '';
  const del = !!(mv && mv.off);
  const txt = del ? 'Release to delete' : (it.axis === 'x' ? 'X ' : 'Y ') + fmtUnit(guideOut(it) / unitPx()) + (snapped ? ' · ' + snapped : '');
  const font = getComputedStyle(document.body).fontFamily;
  if (!tagCtx) tagCtx = document.createElement('canvas').getContext('2d');
  tagCtx.font = '500 11px ' + font;
  const W = Math.ceil(tagCtx.measureText(txt).width) + 16, H = 20;
  // next to the pointer, kept inside the stage
  const r = canvas.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), pt = ui.rg.pointer;
  let sx = pt.x + 14, sy = pt.y + 16;
  if (sx + W > wr.right - 6) sx = pt.x - 14 - W;
  if (sy + H > wr.bottom - 6) sy = pt.y - 16 - H;
  sx = clamp(sx, wr.left + 6, Math.max(wr.left + 6, wr.right - 6 - W)); sy = clamp(sy, wr.top + 6, Math.max(wr.top + 6, wr.bottom - 6 - H));
  const x = (sx - r.left) / k, y = (sy - r.top) / k, u = (n) => (n / k).toFixed(2);
  return '<g class="guide-tag"><rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + u(W) + '" height="' + u(H) + '" rx="' + u(5) + '" style="fill:var(--panel);stroke:' + (del ? 'var(--warn)' : 'var(--line-strong)') + '" stroke-width="1" vector-effect="non-scaling-stroke"/>'
    + '<text x="' + (x + 8 / k).toFixed(2) + '" y="' + (y + 14 / k).toFixed(2) + '" font-size="' + u(11) + '" font-weight="500" style="fill:' + (del ? 'var(--warn)' : 'var(--fg)') + ';font-family:' + font.replace(/"/g, "'") + '">' + txt + '</text></g>';
}
/* guide lines for snapping, in image pixels */
function snapGuides() { return prefs.guides.show && prefs.snap.rulerGuides ? doc.guides : []; }
