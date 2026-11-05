/* ===================== Part 3e: Liquify, brushing the photo into new shapes ===================== */
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Strokes live in doc.photo.liquify, so undo, autosave and project files keep them:
//   { m: mode, r: radius as a share of the photo's long side, s: strength 0..1, pts: [[x, y], ...] in 0..1 photo units }
// A displacement field on a coarse grid (LIQ_GRID cells along the long side) is built from the strokes.
// For every pixel it says where to read the photo from, so it is an inverse mapping, like the bulge and twirl.
// Each brush dab composes with what is already there: new(p) = d + old(p + d).

const LIQ_GRID = 256;
const LIQ_MODES = [['push', 'Push'], ['bloat', 'Bloat'], ['pucker', 'Pucker'], ['twirlR', 'Twirl right'], ['twirlL', 'Twirl left'], ['restore', 'Restore']];
let liqField = null; // { key, gw, gh, dx, dy } in grid cells
const liqOn = (P) => Array.isArray(P.liquify) && P.liquify.length > 0;
const liqKey = (L) => L.length + ':' + L.reduce((n, s) => n + s.pts.length, 0) + ':' + (L.length ? L[L.length - 1].pts.slice(-1).join(',') : '');
function liqNewField() {
  const big = Math.max(iw, ih);
  const gw = Math.max(2, Math.round(LIQ_GRID * iw / big)), gh = Math.max(2, Math.round(LIQ_GRID * ih / big));
  return { key: '', gw, gh, dx: new Float32Array(gw * gh), dy: new Float32Array(gw * gh) };
}
function liqSample(F, a, x, y) {
  const fx = clamp(x, 0, F.gw - 1.001), fy = clamp(y, 0, F.gh - 1.001), x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, i = y0 * F.gw + x0;
  return (a[i] * (1 - ax) + a[i + 1] * ax) * (1 - ay) + (a[i + F.gw] * (1 - ax) + a[i + F.gw + 1] * ax) * ay;
}
/* one dab of the brush at (cx, cy) in 0..1 units; v is the drag direction for Push */
function liqDab(F, mode, cx, cy, r, s, v) {
  const big = Math.max(F.gw, F.gh), R = Math.max(1.5, r * big), X = cx * (F.gw - 1), Y = cy * (F.gh - 1);
  const x0 = Math.max(0, Math.floor(X - R)), x1 = Math.min(F.gw - 1, Math.ceil(X + R)), y0 = Math.max(0, Math.floor(Y - R)), y1 = Math.min(F.gh - 1, Math.ceil(Y + R));
  const ndx = new Float32Array((x1 - x0 + 1) * (y1 - y0 + 1)), ndy = new Float32Array(ndx.length);
  const vx = v ? v[0] * (F.gw - 1) : 0, vy = v ? v[1] * (F.gh - 1) : 0;
  let k = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++, k++) {
    const i = y * F.gw + x, ox = x - X, oy = y - Y, q = (ox * ox + oy * oy) / (R * R);
    if (q >= 1) { ndx[k] = F.dx[i]; ndy[k] = F.dy[i]; continue; }
    const f = (1 - q) * (1 - q);
    if (mode === 'restore') { const keep = 1 - f * s * 0.35; ndx[k] = F.dx[i] * keep; ndy[k] = F.dy[i] * keep; continue; }
    let dx = 0, dy = 0;
    if (mode === 'push') { dx = -vx * f * s; dy = -vy * f * s; }
    else if (mode === 'bloat' || mode === 'pucker') { const g = (mode === 'bloat' ? -1 : 1) * f * s * 0.12; dx = ox * g; dy = oy * g; }
    else { const a = (mode === 'twirlR' ? -1 : 1) * f * s * 0.18, ca = Math.cos(a), sa = Math.sin(a); dx = ox * ca - oy * sa - ox; dy = ox * sa + oy * ca - oy; }
    ndx[k] = dx + liqSample(F, F.dx, x + dx, y + dy); ndy[k] = dy + liqSample(F, F.dy, x + dx, y + dy);
  }
  k = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++, k++) { const i = y * F.gw + x; F.dx[i] = ndx[k]; F.dy[i] = ndy[k]; }
}
/* every dab of one stroke, spaced along the path; Bloat, Pucker and Twirl also repeat where the brush rested */
function liqStroke(F, st, from) {
  const step = Math.max(0.004, st.r * 0.25);
  for (let j = Math.max(0, from || 0); j < st.pts.length; j++) {
    const p = st.pts[j], prev = j ? st.pts[j - 1] : p;
    const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    if (st.m === 'push') {
      if (!j) continue;
      const n = Math.max(1, Math.ceil(d / step));
      for (let t = 1; t <= n; t++) liqDab(F, 'push', prev[0] + (p[0] - prev[0]) * t / n, prev[1] + (p[1] - prev[1]) * t / n, st.r, st.s, [(p[0] - prev[0]) / n, (p[1] - prev[1]) / n]);
    } else {
      const n = j ? Math.max(1, Math.ceil(d / step)) : 1;
      for (let t = 1; t <= n; t++) liqDab(F, st.m, prev[0] + (p[0] - prev[0]) * t / n, prev[1] + (p[1] - prev[1]) * t / n, st.r, st.s);
    }
  }
}
function liqFieldFor(P) {
  const key = liqKey(P.liquify) + '|' + iw + 'x' + ih;
  if (liqField && liqField.key === key) return liqField;
  const F = liqNewField();
  P.liquify.forEach((st) => liqStroke(F, st));
  F.key = key; liqField = F;
  return F;
}
/* the photo pushed through the field, at w × h */
function liquifyCanvas(img, w, h, P) {
  const F = liqFieldFor(P);
  const s = mk(w, h), sx = s.getContext('2d', { willReadFrequently: true });
  sx.drawImage(img, 0, 0, w, h);
  const d = sx.getImageData(0, 0, w, h).data, o = new ImageData(w, h), od = o.data;
  const gx = (F.gw - 1) / Math.max(1, w - 1), gy = (F.gh - 1) / Math.max(1, h - 1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, cx = x * gx, cy = y * gy;
    const fx = clamp(x + liqSample(F, F.dx, cx, cy) / gx, 0, w - 1.001), fy = clamp(y + liqSample(F, F.dy, cx, cy) / gy, 0, h - 1.001);
    const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
    const p00 = (y0 * w + x0) * 4, p10 = p00 + 4, p01 = p00 + w * 4, p11 = p01 + 4;
    for (let c = 0; c < 4; c++) od[i + c] = (d[p00 + c] * (1 - ax) + d[p10 + c] * ax) * (1 - ay) + (d[p01 + c] * (1 - ax) + d[p11 + c] * ax) * ay;
  }
  const outC = mk(w, h); outC.getContext('2d').putImageData(o, 0, 0);
  return outC;
}

/* ---------------- the tool ---------------- */
let liqTimer = null, liqHold = null, liqRedraw = 0;
function liqBrushR(p) { return ui.liquify.size / 2 / p.k / imgScale(artGeom()) / Math.max(iw, ih); }
function liqPoint(p) { const [ix, iy] = toImg(p); return [clamp(ix / iw, 0, 1), clamp(iy / ih, 0, 1)]; }
function liqDown(p, e) {
  if (!doc.photo.visible) setView('photo');
  commitHistory();
  if (!Array.isArray(doc.photo.liquify)) doc.photo.liquify = [];
  const mode = e.altKey ? 'restore' : ui.liquify.mode;
  const st = { m: mode, r: +liqBrushR(p).toFixed(5), s: ui.liquify.strength, pts: [liqPoint(p).map((v) => +v.toFixed(5))] };
  doc.photo.liquify.push(st);
  drag = { kind: 'liquify', st, last: [p.cx, p.cy] };
  liqApplyLive(st, 0);
  // holding still keeps bloating, puckering or twirling, as in other editors
  clearInterval(liqHold);
  if (mode !== 'push') liqHold = setInterval(() => { if (!drag || drag.st !== st) { clearInterval(liqHold); return; } st.pts.push(st.pts[st.pts.length - 1].slice()); liqApplyLive(st, st.pts.length - 1); }, 70);
}
function liqMove(p) {
  const st = drag.st, q = liqPoint(p).map((v) => +v.toFixed(5)), last = st.pts[st.pts.length - 1];
  if (Math.hypot(q[0] - last[0], q[1] - last[1]) < st.r * 0.08) return;
  st.pts.push(q);
  liqApplyLive(st, st.pts.length - 1);
}
/* adds the dabs from point 'from' on to the field, then redraws a small preview of the photo, at most every 80 ms */
function liqApplyLive(st, from) {
  const L = doc.photo.liquify;
  // the field must hold every earlier stroke; replay them once when it does not (after undo, say)
  if (from === 0) liqFieldFor({ liquify: L.slice(0, -1) });
  liqStroke(liqField, st, from);
  liqField.key = liqKey(L) + '|' + iw + 'x' + ih;
  ui.liqFast = true;
  const now = performance.now();
  if (now - liqRedraw > 80) { liqRedraw = now; photoSrcCache = null; rebuildPhotoView(); compose(); } // text art catches up when the stroke ends
}
function liqUp() {
  clearInterval(liqHold); liqHold = null;
  ui.liqFast = false; photoSrcCache = null;
  photoChanged('source');
  if (ui.tab === 'photo') buildPanel();
}
function liqReset() {
  if (!liqOn(doc.photo)) return;
  commitHistory();
  doc.photo.liquify = []; liqField = null; photoSrcCache = null;
  photoChanged('source'); buildOptbar();
  toast('Liquify removed', { label: 'Undo', fn: undo });
}
