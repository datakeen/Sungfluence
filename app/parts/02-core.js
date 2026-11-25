/* ===================== Part 2: document, pipeline, jobs, compositing ===================== */
let uid = 1;
function newLayer(mode, over) {
  const L = Object.assign({ mode }, COMMON_DEFAULTS, MODES[mode].defaults, over || {});
  L.id = uid++;
  // the pixel sizes of the defaults and the recipes are set for BASE_W and follow the artboard (see BASE_W)
  if (L.pxW === undefined) L.pxW = BASE_W;
  // Flow lines used to take its letter size as a multiple of the line spacing. Older projects and
  // recipes carry that multiple, so turn it into a size in pixels and leave their spacing alone.
  if (mode === 'flow' && over && over.size === undefined && typeof over.scale === 'number') {
    L.size = (over.spacing ?? 12) * over.scale;
    L.autoSpace = false;
  }
  // "Brighten dark colors" and "Deepen pale colors" (colorLift) became Fit colors to the paper. An older layer that
  // used it on photo colors fits its colors; one that did not keeps its exact colors (LEGACY_COMMON).
  if ('colorLift' in L) {
    if (L.colorLift > 0 && L.color === 'image' && L.colorFit === 'off') L.colorFit = L.colorLift >= 0.5 ? 'strong' : 'gentle';
    delete L.colorLift;
  }
  return L;
}
/* Three layers. Their stacking order lives in doc.order, top first.
   Objects (shapes, text, images) sit on the Photo layer (they become part of the photo that text art reads) or on the Vector layer. */
const doc = {
  fileName: 'coffee.jpg', imageURL: SAMPLES.coffee, sample: 'coffee', blank: null,
  photo: Object.assign({}, LAYER_DEFAULTS, PHOTO_DEFAULTS),
  removed: { show: 'checker', color: '#ff3b7f', inText: false },
  lines: Object.assign({}, LAYER_DEFAULTS, { paths: [], color: '#0a84ff', width: 0 }),
  text: Object.assign({}, LAYER_DEFAULTS, { applied: false, locked: false, source: 'photo', flipX: false, flipY: false, layers: [newLayer('rows', { text: 'whiskers sunbeam purr nap tabby paws meow' })], sel: 0 }),
  objects: [],
  order: ['text', 'lines', 'photo'],
  out: { paper: '#ffffff', transparent: false, margin: 0, colorModel: 'rgb', width: 1600, print: 'A3', dpi: 300, orient: 'auto', printRot: 0, pageMargin: null, printW: 300, printH: 400, printUnit: 'mm', mock: 'artboard', shirt: '#1b1b1d', mixPhoto: 0.35, gentle: false, printedOn: 'auto' }
};
const ui = {
  view: 'photo', tab: 'photo', tool: 'hand', zoom: 'fit', quality: 'fast', open: {},
  wand: { tol: 0.16, contiguous: true, mode: 'new' }, brush: { size: 40, mode: 'add' }, liquify: { mode: 'push', size: 120, strength: 0.5 }, liqFast: false, mockZoom: 1, lasso: { mode: 'new' },
  trace: { kind: 'dark', threshold: 0.5, amount: 0.09, skipWide: true },
  selPath: null, selNode: null, selObjs: [], suggestion: null,
  shape: { kind: 'rect', sides: 6, points: 5, inner: 0.45, radius: 0 }, objLayer: 'lines',
  cropDraft: null, cropCustom: [5, 4],
  compare: { on: false, pos: 0.5, angle: 0, left: 'original', right: 'current' },
  rep: { mode: 'line', count: 4, dx: 120, dy: 0, rot: 0, scale: 100, fade: 0, cols: 3, rows: 3, gx: 20, gy: 20, radius: 300, turn: true, path: null }
};

let origImg = null, iw = 0, ih = 0;
let master = null;              // full image at mask resolution: { w, h, data (ImageData), base (floats) }
let remCanvas = null, selCanvas = null, selTint = null;
let hasRemoval = false, hasSelection = false;
let baseSrc = null, src = null; // analysis copies at about 800 px, cropped
let photoCanvas = null, photoKept = null, remVis = null, remVisKey = '', remVisGeom = null;
let textCanvas = null, out = null;
let lockSnap = null;            // the photo as it was when the text art was locked
const canvas = $('art'), ctx = canvas.getContext('2d');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const layerOf = (id) => (id === 'photo' ? doc.photo : id === 'lines' ? doc.lines : doc.text);

/* ---------------- geometry ---------------- */
const FULL = () => ({ x: 0, y: 0, w: 1, h: 1 });
/* While the crop tool is open the whole photo is shown, so the box can grow back. */
function cropRect() {
  if (!origImg || ui.cropDraft || !doc.photo.crop) return FULL();
  return doc.photo.crop;
}
/* projects from before version 3.1 stored a ratio frame and a position instead of a crop box */
function migratePhoto(p) {
  if (p.crop === undefined && p.frame && p.frame !== 'original' && iw && ih) {
    const [a, b] = p.frame.split(':').map(Number), target = a / b, ia = iw / ih;
    let w = 1, h = 1;
    if (target > ia) h = ia / target; else w = target / ia;
    p.crop = { x: (1 - w) * (p.cropX ?? 0.5), y: (1 - h) * (p.cropY ?? 0.5), w, h };
    p.ratio = p.frame;
  }
  delete p.frame; delete p.cropX; delete p.cropY;
  return Object.assign({}, LAYER_DEFAULTS, PHOTO_DEFAULTS, p);
}
function previewScale() {
  const q = QUALITY.find((x) => x[0] === ui.quality) || QUALITY[0];
  return q[2] ? Math.min(1, q[2] / doc.out.width) : 1;
}
function artGeom(scale) {
  const k = scale ?? previewScale();
  const W = Math.round(doc.out.width * k);
  const bd = baseDims || baseSrc;
  const H = bd ? Math.round(W * bd.h / bd.w) : Math.round(W * 0.66);
  const m = Math.round(W * (doc.out.margin || 0));
  return { k, W, H, m, TW: W + 2 * m, TH: H + 2 * m };
}
/* image pixels <-> artboard pixels (artboard includes the margin) */
function img2art(x, y, g) { const cr = cropRect(); return [g.m + (x / iw - cr.x) / cr.w * g.W, g.m + (y / ih - cr.y) / cr.h * g.H]; }
function art2img(ax, ay, g) { const cr = cropRect(); return [((ax - g.m) / g.W * cr.w + cr.x) * iw, ((ay - g.m) / g.H * cr.h + cr.y) * ih]; }
function imgScale(g) { return g.W / (cropRect().w * iw); }
/* a canvas transform that maps image pixels onto the artboard */
function imgTransform(g) { const cr = cropRect(), sx = g.W / (cr.w * iw), sy = g.H / (cr.h * ih); return [sx, 0, 0, sy, g.m - cr.x * iw * sx, g.m - cr.y * ih * sy]; }

/* ---------------- masks ---------------- */
function setupMasks() {
  const k = Math.min(1, 1200 / Math.max(iw, ih));
  const mw = Math.max(8, Math.round(iw * k)), mh = Math.max(8, Math.round(ih * k));
  master = { w: mw, h: mh, data: null, base: null };
  refreshMaster();
  remCanvas = mk(mw, mh); selCanvas = mk(mw, mh); selTint = mk(mw, mh);
  hasRemoval = false; hasSelection = false;
}
/* the wand reads what you see: the photo with its distortion and photo objects */
function refreshMaster() {
  if (!master) return;
  const c = mk(master.w, master.h), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(photoSrc(), 0, 0, master.w, master.h);
  master.data = x.getImageData(0, 0, master.w, master.h); master.base = null;
}
function alphaOf(c) { const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data; const a = new Uint8ClampedArray(c.width * c.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; return a; }
function putAlpha(c, a) {
  const x = c.getContext('2d'), img = x.createImageData(c.width, c.height), d = img.data;
  for (let i = 0; i < a.length; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = a[i]; }
  x.putImageData(img, 0, 0);
}
function anyAlpha(c) { const a = alphaOf(c); for (let i = 0; i < a.length; i += 7) if (a[i] > 8) return true; return false; }
function refreshSelTint() {
  const x = selTint.getContext('2d');
  x.clearRect(0, 0, selTint.width, selTint.height);
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#0a84ff'; x.fillRect(0, 0, selTint.width, selTint.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(selCanvas, 0, 0);
  x.globalCompositeOperation = 'source-over';
}
/* keep weights (1 = keep) for an analysis image of size w x h */
function keepFrom(rem, cr, w, h) {
  const c = mk(w, h), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(rem, cr.x * rem.width, cr.y * rem.height, cr.w * rem.width, cr.h * rem.height, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, k = new Float32Array(w * h);
  for (let i = 0; i < k.length; i++) k[i] = 1 - d[i * 4 + 3] / 255;
  return k;
}
function keepFor(w, h) { return hasRemoval ? keepFrom(remCanvas, cropRect(), w, h) : null; }
const maskStore = new Map();
let maskVer = 0;
function snapshotMask() {
  maskVer++;
  maskStore.set(maskVer, hasRemoval ? alphaOf(remCanvas) : null);
  if (maskStore.size > 24) maskStore.delete(maskStore.keys().next().value);
}
function restoreMask(ver) {
  if (ver === maskVer || !maskStore.has(ver)) return false;
  const a = maskStore.get(ver);
  remCanvas.getContext('2d').clearRect(0, 0, remCanvas.width, remCanvas.height);
  if (a && a.length === remCanvas.width * remCanvas.height) putAlpha(remCanvas, a);
  hasRemoval = !!a; maskVer = ver;
  return true;
}
function rleEncode(a) {
  const outp = []; let cur = 0, run = 0;
  for (let i = 0; i < a.length; i++) { const v = a[i] > 127 ? 1 : 0; if (v === cur) run++; else { outp.push(run); cur = v; run = 1; } }
  outp.push(run);
  return outp.map((n) => n.toString(36)).join(',');
}
function rleDecode(s, n) { const a = new Uint8ClampedArray(n); let i = 0, v = 0; for (const t of s.split(',')) { const r = parseInt(t, 36) || 0; if (v) a.fill(255, i, i + r); i += r; v ^= 1; } return a; }

/* ---------------- photo source: the image, its distortion, and objects placed on the photo ---------------- */
let photoSrcCache = null, objVer = 0;
const warpOn = (P) => Math.abs(P.bulge) > 0.001 || Math.abs(P.twirl) > 0.5;
function photoSrc(P) {
  P = P || doc.photo;
  const objs = doc.objects.filter((o) => o.layer === 'photo' && !o.hidden);
  if (!objs.length && !warpOn(P) && !liqOn(P)) return origImg;
  // while a Liquify stroke is being painted, a smaller copy keeps the brush smooth
  const cap = ui.liqFast ? 720 : 2400;
  const key = objVer + '|' + [P.bulge, P.twirl, P.warpX, P.warpY, P.warpR].join(',') + '|' + (liqOn(P) ? liqKey(P.liquify) : '') + '|' + cap + '|' + iw + 'x' + ih + '|' + imgVer;
  if (photoSrcCache && photoSrcCache.key === key) return photoSrcCache.c;
  const k = Math.min(1, cap / Math.max(iw, ih));
  const c = mk(Math.round(iw * k), Math.round(ih * k)), x = c.getContext('2d');
  let base = origImg;
  // the brushed photo is worked out at up to 1600 px, which is what text art reads, so letting go of the brush stays quick
  if (liqOn(P)) { const q = Math.min(1, 1600 / Math.max(c.width, c.height)); base = liquifyCanvas(origImg, Math.round(c.width * q), Math.round(c.height * q), P); }
  if (warpOn(P)) x.drawImage(warpCanvas(base, c.width, c.height, P), 0, 0);
  else x.drawImage(base, 0, 0, c.width, c.height);
  x.setTransform(k, 0, 0, k, 0, 0);
  objs.forEach((o) => drawObject(x, o));
  x.setTransform(1, 0, 0, 1, 0, 0);
  photoSrcCache = { key, c };
  return c;
}
/* bulge or pinch, and twirl, around a center. Inverse mapping with bilinear sampling. */
function warpCanvas(img, w, h, P) {
  const s = mk(w, h), sx = s.getContext('2d', { willReadFrequently: true });
  sx.drawImage(img, 0, 0, w, h);
  const sd = sx.getImageData(0, 0, w, h), d = sd.data, o = new ImageData(w, h), od = o.data;
  const cx = P.warpX * w, cy = P.warpY * h, R = Math.max(4, P.warpR * Math.min(w, h)), b = P.bulge, tw = P.twirl * Math.PI / 180;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let dx = x - cx, dy = y - cy;
    const dist = Math.hypot(dx, dy) / R;
    if (dist < 1) {
      const f = 1 - b * (1 - dist) * (1 - dist);
      dx *= f; dy *= f;
      if (tw) { const a = tw * (1 - dist) * (1 - dist), ca = Math.cos(a), sa = Math.sin(a); const tx = dx * ca - dy * sa; dy = dx * sa + dy * ca; dx = tx; }
    }
    const fx = clamp(cx + dx, 0, w - 1.001), fy = clamp(cy + dy, 0, h - 1.001), x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
    const p00 = (y0 * w + x0) * 4, p10 = p00 + 4, p01 = p00 + w * 4, p11 = p01 + 4;
    for (let c = 0; c < 4; c++) od[i + c] = (d[p00 + c] * (1 - ax) + d[p10 + c] * ax) * (1 - ay) + (d[p01 + c] * (1 - ax) + d[p11 + c] * ax) * ay;
  }
  const outC = mk(w, h); outC.getContext('2d').putImageData(o, 0, 0);
  return outC;
}
/* pixel filters after the engine's treatment: hue, shadows, highlights, sepia, posterize, threshold, vignette, grain, pixelate */

/* ---------------- photo to silhouette ----------------
   One setting turns a photo into a clean two-tone shape: Otsu's method finds the split point between
   light and dark by itself, then the shape is closed and opened to lose specks and ragged edges,
   and the holes inside it are filled. Word cloud, Calligram and the other shape styles then read it cleanly. */
function otsuThreshold(lum, n) {
  const hist = new Int32Array(256);
  for (let i = 0; i < n; i++) hist[clamp(Math.round(lum[i] * 255), 0, 255)]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, bestVar = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > bestVar) { bestVar = v; best = t; }
  }
  return best / 255;
}
/* a box minimum or maximum over a square, done in two passes. Each pass keeps a sliding count of set
   pixels, so the cost does not grow with the radius. Past the edge counts as nothing. */
function morph(src, w, h, rad, grow) {
  if (rad < 1) return src;
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  const pass = (a, b, len, lines, step, stride) => {
    for (let l = 0; l < lines; l++) {
      const o = l * stride;
      let s = 0, c = 0;
      for (let k = 0; k < rad && k < len; k++) { s += a[o + k * step]; c++; }
      for (let x = 0; x < len; x++) {
        if (x + rad < len) { s += a[o + (x + rad) * step]; c++; }
        if (x - rad - 1 >= 0) { s -= a[o + (x - rad - 1) * step]; c--; }
        b[o + x * step] = grow ? (s > 0 ? 1 : 0) : (s === c ? 1 : 0);
      }
    }
  };
  pass(src, tmp, w, h, 1, w); pass(tmp, out, h, w, w, 1);
  return out;
}
/* anything not joined to the edge of the picture is a hole inside the shape, so it is filled in */
function fillHoles(m, w, h) {
  const n = w * h, seen = new Uint8Array(n), stack = new Int32Array(n);
  let top = 0;
  const push = (i) => { if (!seen[i] && !m[i]) { seen[i] = 1; stack[top++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (top) {
    const i = stack[--top], x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = seen[i] ? 0 : 1;
  return out;
}
/* The shape is worked out on a copy of at most SIL_SIDE pixels and scaled up for bigger copies.
   So the photo view, the text art and the exports all show the same shape, and a big copy costs no more.
   silCache keeps the last shape, keyed by the photo and its settings (silKey). */
const SIL_SIDE = 820;
let silCache = null, baseVer = 0;
const silKey = (P, ver) => (ver ?? baseVer) + '|' + JSON.stringify(P);
function silhouetteMask(lum, w, h, P) {
  const n = w * h;
  const thr = P.silThreshold > 0 ? P.silThreshold : otsuThreshold(lum, n);
  let m = new Uint8Array(n);
  const dark = !P.silInvert;
  for (let i = 0; i < n; i++) m[i] = ((lum[i] < thr) === dark) ? 1 : 0;
  const rad = Math.max(1, Math.round(P.silhouette * 0.012 * Math.max(w, h)));
  m = morph(m, w, h, rad, 1); m = morph(m, w, h, rad, 0);   // close: lose the gaps
  m = morph(m, w, h, rad, 0); m = morph(m, w, h, rad, 1);   // open: lose the specks
  if (P.silFill !== false) m = fillHoles(m, w, h);
  return m;
}
/* average the tones down to fit side, for working out the shape */
function shrinkLum(lum, w, h, side) {
  const k = side / Math.max(w, h), sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
  const sum = new Float32Array(sw * sh), cnt = new Float32Array(sw * sh);
  for (let y = 0; y < h; y++) {
    const o = Math.min(sh - 1, (y * sh / h) | 0) * sw;
    for (let x = 0; x < w; x++) { const j = o + Math.min(sw - 1, (x * sw / w) | 0); sum[j] += lum[y * w + x]; cnt[j]++; }
  }
  for (let j = 0; j < sum.length; j++) sum[j] /= cnt[j] || 1;
  return { lum: sum, w: sw, h: sh };
}
/* a shape mask scaled smoothly to w x h, then cut at the middle so its edge stays clean */
function scaleMask(s, w, h) {
  if (s.w === w && s.h === h) return s.m;
  const a = mk(s.w, s.h), ax = a.getContext('2d'), id = ax.createImageData(s.w, s.h);
  for (let i = 0; i < s.m.length; i++) id.data[i * 4 + 3] = s.m[i] ? 255 : 0;
  ax.putImageData(id, 0, 0);
  const c = mk(w, h), cx = c.getContext('2d', { willReadFrequently: true });
  cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
  cx.drawImage(a, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  return m;
}
/* the shape as a picture: black on white, scaled smoothly */
function silhouetteCanvas(s, W, H) {
  const a = mk(s.w, s.h), ax = a.getContext('2d'), id = ax.createImageData(s.w, s.h);
  for (let i = 0; i < s.m.length; i++) { const v = s.m[i] ? 0 : 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  ax.putImageData(id, 0, 0);
  const c = mk(W, H), cx = c.getContext('2d');
  cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
  cx.drawImage(a, 0, 0, W, H);
  return c;
}
function silhouetteSrc(t, P, key) {
  const { w, h, r, g, b, lum } = t, n = w * h;
  let m;
  if (key && silCache && silCache.key === key) m = scaleMask(silCache, w, h);
  else {
    const s = Math.max(w, h) > SIL_SIDE ? shrinkLum(lum, w, h, SIL_SIDE) : { lum, w, h };
    const sm = { w: s.w, h: s.h, m: silhouetteMask(s.lum, s.w, s.h, P) };
    if (key) silCache = Object.assign({ key }, sm);
    m = scaleMask(sm, w, h);
  }
  for (let i = 0; i < n; i++) { const v = m[i] ? 0 : 1; r[i] = v; g[i] = v; b[i] = v; lum[i] = v; }
  return t;
}

/* hue, tone and effects after the engine treatment. cache: the shape of a silhouette may be kept and reused (see silCache) */
const drain = (gen) => { let r; while (!(r = gen.next()).done); return r.value; };
/* cache: true keeps the shape under silKey(P); a string is the key to use */
function finishSrc(t, P, cache) { return drain(finishSrcGen(t, P, cache)); }
function* finishSrcGen(t, P, cache) {
  const { w, h, r, g, b, lum } = t, n = w * h;
  const any = P.hue || P.shadows || P.highlights || P.sepia || P.posterize >= 2 || P.threshold > 0 || P.vignette || P.grain || P.pixelate >= 1;
  if (!any && !(P.silhouette > 0)) return t;
  if (any) {
    if (P.pixelate >= 1) {
      const bs = Math.max(1, Math.round(P.pixelate * w / 400));
      for (let y0 = 0; y0 < h; y0 += bs) { pixelateRow(t, bs, y0); if ((y0 / bs & 15) === 15) yield { stage: 'Photo effects', p: y0 / h * 0.3 }; }
    }
    // hue rotation matrix, the same one CSS hue-rotate uses
    const a = (P.hue || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const c = { t, hue: P.hue || 0, shadows: P.shadows || 0, highlights: P.highlights || 0, sepia: P.sepia || 0, vignette: P.vignette || 0, grain: P.grain || 0, threshold: P.threshold || 0,
      lv: P.posterize >= 2 ? Math.round(P.posterize) - 1 : 0,
      H: [0.213 + ca * 0.787 - sa * 0.213, 0.715 - ca * 0.715 - sa * 0.715, 0.072 - ca * 0.072 + sa * 0.928,
        0.213 - ca * 0.213 + sa * 0.143, 0.715 + ca * 0.285 + sa * 0.140, 0.072 - ca * 0.072 - sa * 0.283,
        0.213 - ca * 0.213 - sa * 0.787, 0.715 - ca * 0.715 + sa * 0.715, 0.072 + ca * 0.928 + sa * 0.072] };
    for (let i0 = 0; i0 < n; i0 += 1 << 17) { filterRange(c, i0, Math.min(n, i0 + (1 << 17))); yield { stage: 'Photo effects', p: 0.3 + 0.6 * i0 / n }; }
  }
  return P.silhouette > 0 ? silhouetteSrc(t, P, typeof cache === 'string' ? cache : cache ? silKey(P) : null) : t;
}
/* the pixel loops of finishSrcGen, as plain functions the browser can speed up */
function pixelateRow(t, bs, y0) {
  const { w, h, r, g, b } = t;
  for (let x0 = 0; x0 < w; x0 += bs) {
    let sr = 0, sg = 0, sb = 0, cnt = 0;
    for (let y = y0; y < Math.min(h, y0 + bs); y++) for (let x = x0; x < Math.min(w, x0 + bs); x++) { const i = y * w + x; sr += r[i]; sg += g[i]; sb += b[i]; cnt++; }
    sr /= cnt; sg /= cnt; sb /= cnt;
    for (let y = y0; y < Math.min(h, y0 + bs); y++) for (let x = x0; x < Math.min(w, x0 + bs); x++) { const i = y * w + x; r[i] = sr; g[i] = sg; b[i] = sb; }
  }
}
function filterRange(c, i0, i1) {
  const { w, h, r, g, b, lum } = c.t, { hue, shadows, highlights, sepia, vignette, grain, threshold, lv, H } = c;
  for (let i = i0; i < i1; i++) {
    let R = r[i], G = g[i], B = b[i];
    if (hue) { const r0 = R, g0 = G, b0 = B; R = H[0] * r0 + H[1] * g0 + H[2] * b0; G = H[3] * r0 + H[4] * g0 + H[5] * b0; B = H[6] * r0 + H[7] * g0 + H[8] * b0; }
    if (shadows || highlights) {
      const l = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      const d = shadows * 0.45 * (1 - l) * (1 - l) * (1 - l) + highlights * 0.45 * l * l * l;
      R += d; G += d; B += d;
    }
    if (sepia) {
      const sr = 0.393 * R + 0.769 * G + 0.189 * B, sg = 0.349 * R + 0.686 * G + 0.168 * B, sb = 0.272 * R + 0.534 * G + 0.131 * B;
      R += (sr - R) * sepia; G += (sg - G) * sepia; B += (sb - B) * sepia;
    }
    if (vignette) {
      const x = (i % w) / w - 0.5, y = ((i / w) | 0) / h - 0.5, v = 1 - vignette * smooth01((Math.hypot(x, y) - 0.25) / 0.5);
      R *= v; G *= v; B *= v;
    }
    if (grain) {
      const x = Math.round((i % w) / w * 1600), y = Math.round(((i / w) | 0) / h * 1600);
      const nz = (((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) + 1) % 1 - 0.5;
      R += nz * grain * 0.35; G += nz * grain * 0.35; B += nz * grain * 0.35;
    }
    if (lv) { R = Math.round(clamp(R, 0, 1) * lv) / lv; G = Math.round(clamp(G, 0, 1) * lv) / lv; B = Math.round(clamp(B, 0, 1) * lv) / lv; }
    if (threshold > 0) { const l = 0.2126 * R + 0.7152 * G + 0.0722 * B; R = G = B = l >= threshold ? 1 : 0; }
    r[i] = clamp(R, 0, 1); g[i] = clamp(G, 0, 1); b[i] = clamp(B, 0, 1);
    lum[i] = 0.2126 * r[i] + 0.7152 * g[i] + 0.0722 * b[i];
  }
}
function smooth01(x) { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); }
/* the analysis copy text art reads: prepared, treated and filtered */
function srcFrom(img, maxSide, cr, P, rem) {
  const b = C.prepare(img, maxSide, cr);
  return finishSrc(C.treat(b, Object.assign({}, P, { keepMask: rem ? keepFrom(rem, cr, b.w, b.h) : null })), P, P === doc.photo);
}

/* ---------------- photo pipeline ---------------- */
/* baseFrom is the picture baseSrc was read from, so the photo view knows whether src still shows the photo */
let baseFrom = null, srcState = null;
function rebuildBase() { if (origImg) { stopPhotoJobs(); baseFrom = photoSrc(); baseSrc = C.prepare(baseFrom, 800, cropRect()); baseVer++; rebuildSrc(); } }
function rebuildSrc() { if (baseSrc) { stopPhotoJobs(); srcState = photoState(); src = finishSrc(C.treat(baseSrc, Object.assign({}, doc.photo, { keepMask: keepFor(baseSrc.w, baseSrc.h) })), doc.photo, true); drainSrcReady(); } }
/* While a photo job runs, src still holds the last crop and size, but cropRect(), iw and ih are already new.
   Work that reads src and maps it into the image waits for the new copy: fn runs now, or when the job is done. */
let srcReady = [];
function whenSrcReady(fn) { if (!jobs.src) fn(); else srcReady.push(fn); }
function drainSrcReady() { const list = srcReady; srcReady = []; list.forEach((fn) => fn()); }
/* The same work as rebuildBase or rebuildSrc, then the photo view, text art and thumbnails, done as a job in
   short slices so a change to the photo never freezes the window. While it runs, baseSrc and src still hold the
   last copy; baseDims already has the new size, so the artboard takes its new shape at once.
   newBase: the picture or the crop changed, so the 800 px copy is read again. */
let srcToken = 0, baseDims = null;
function stopPhotoJobs() { srcToken++; baseDims = null; ['src', 'photo'].forEach((k) => { if (jobs[k]) { jobs[k].cancelled = true; delete jobs[k]; } }); }
function prepDims(img, maxSide, cr) {
  const iw0 = img.naturalWidth || img.width, ih0 = img.naturalHeight || img.height, w0 = cr.w * iw0, h0 = cr.h * ih0, k = Math.min(1, maxSide / Math.max(w0, h0));
  return { w: Math.max(8, Math.round(w0 * k)), h: Math.max(8, Math.round(h0 * k)) };
}
function rebuildPhotoSoon(newBase) {
  if (!origImg || !baseSrc) return;
  stopPhotoJobs();
  const token = srcToken, ver = baseVer + (newBase ? 1 : 0), from = newBase ? photoSrc() : baseFrom, cr = Object.assign({}, cropRect()), P = Object.assign({}, doc.photo), state = photoState();
  const g = photoViewGeom();
  if (newBase) {
    baseDims = prepDims(from, 800, cr);
    // a small copy at once, so the picture keeps up; the sharp one follows
    const q = finishSrc(C.treat(C.prepare(from, 400, cr), Object.assign({}, P, { feather: 0 })), P, false);
    setPhotoView(drain(photoDrawGen(q, photoViewGeom().W, photoViewGeom().H)), photoViewGeom());
  } else if (photoCanvas && photoCanvas.width === g.W && photoCanvas.height === g.H) setPhotoView(photoCanvas, g);   // the removed areas show at once
  compose();
  runJob('src', (function* () {
    const base = newBase ? yield* C.prepareGen(from, 800, cr) : baseSrc;
    const keepMask = hasRemoval ? keepFrom(remCanvas, cr, base.w, base.h) : null;
    const t = yield* C.treatGen(base, Object.assign({}, P, { keepMask }));
    return { base, s: yield* finishSrcGen(t, P, silKey(P, ver)) };
  })(), (res) => {
    if (token !== srcToken) return;
    if (newBase) { baseFrom = from; baseSrc = res.base; }
    baseVer = ver; baseDims = null;
    src = res.s; srcState = state;
    rebuildPhotoView(); compose();
    // locked text art waits only when an edit to it came in while this job ran
    if (doc.text.applied && (!doc.text.locked || ui.textWaiting)) { ui.textWaiting = false; scheduleText(0); }
    drainSrcReady();
    thumbsSoon(); statusIdle();
    if (ui.tab === 'photo' && newBase) buildPanel();
  }, () => { ui.textWaiting = false; drainSrcReady(); });
}
/* text art reads the live photo, or the photo as it was when the text art was locked */
function textSource() { return doc.text.locked && lockSnap ? lockSnap.src : src; }
function lockText(on) {
  if (on) lockSnap = { src, img: (() => { const s = photoSrc(), c = mk(s.width || s.naturalWidth, s.height || s.naturalHeight); c.getContext('2d').drawImage(s, 0, 0); return c; })(), photo: clone(doc.photo), crop: Object.assign({}, cropRect()), rem: hasRemoval ? (() => { const c = mk(remCanvas.width, remCanvas.height); c.getContext('2d').drawImage(remCanvas, 0, 0); return c; })() : null };
  else lockSnap = null;
  doc.text.locked = !!on;
  if (!on && doc.text.applied) scheduleText(0);
}
/* The photo view shows at once from src, the 800 px copy that text art reads and that has the same
   treatment. The full-size view follows as a job in short slices, so no change to the photo freezes the window. */
const photoState = () => JSON.stringify([cropRect(), doc.photo]);
function photoViewGeom() {
  // the on-screen photo never needs more than about 1800 px; compose scales it to the artboard
  const g0 = artGeom(), cap = Math.min(1, 1800 / Math.max(g0.W, g0.H));
  return { W: Math.max(1, Math.round(g0.W * cap)), H: Math.max(1, Math.round(g0.H * cap)) };
}
function rebuildPhotoView() {
  if (!origImg || !baseSrc) return;
  const g = photoViewGeom(), cr = cropRect(), P = Object.assign({}, doc.photo), state = photoState();
  // while the photo is being read again, the last view is only resized; the job draws the new one when done
  if (jobs.src && photoCanvas) { const c = mk(g.W, g.H); c.getContext('2d').drawImage(photoCanvas, 0, 0, g.W, g.H); setPhotoView(c, g); return; }
  const from = photoSrc();
  const fresh = src && baseFrom === from && srcState === state;
  const q = fresh ? src : finishSrc(C.treat(C.prepare(from, 800, cr), Object.assign({}, P, { feather: 0 })), P, true);
  setPhotoView(drain(photoDrawGen(q, g.W, g.H)), g);
  // the full-size view, when the screen can show more than the quick copy has
  const fw = from.naturalWidth || from.width, fh = from.naturalHeight || from.height;
  const side = Math.min(Math.max(g.W, g.H), Math.max(cr.w * fw, cr.h * fh));
  if (side > Math.max(q.w, q.h) + 8) {
    runJob('photo', photoLayerGen(side, cr, P, g.W, g.H), (v) => {
      if (photoState() !== state || photoSrc() !== from) return;
      const now = photoViewGeom();
      if (now.W !== g.W || now.H !== g.H) return;
      setPhotoView(v.photo, g); compose();
      if (!Object.keys(jobs).length) statusIdle();
    });
  } else if (jobs.photo) { jobs.photo.cancelled = true; delete jobs.photo; hudUpdate(); }
}
/* photo is the edited photo at the view size; the removal mask is laid over it here */
function setPhotoView(photo, g) {
  photoCanvas = photo;
  if (fillWanted() && !doc.text.locked) redrawFill(30);
  photoKept = mk(g.W, g.H);
  remVis = mk(g.W, g.H); remVisKey = ''; remVisGeom = null;
  const pk = photoKept.getContext('2d');
  pk.drawImage(photoCanvas, 0, 0);
  if (hasRemoval) {
    const cr = cropRect();
    const sx = cr.x * remCanvas.width, sy = cr.y * remCanvas.height, sw = cr.w * remCanvas.width, sh = cr.h * remCanvas.height;
    pk.globalCompositeOperation = 'destination-out'; pk.drawImage(remCanvas, sx, sy, sw, sh, 0, 0, g.W, g.H); pk.globalCompositeOperation = 'source-over';
    remVisGeom = { g, sx, sy, sw, sh };
    removedShown();
  }
}
/* The removed areas as the Photo layer shows them: a color, or squares in the tones of the paper at the size of
   the normal checker. Drawn again only when the zoom, the paper or the color changes. */
function removedShown() {
  if (!remVis || !remVisGeom) return remVis;
  const { g, sx, sy, sw, sh } = remVisGeom, a = artGeom(), cap = g.W / Math.max(1, a.W);
  // remVis is the photo at view size: one of its pixels is 1 / cap artboard pixels
  // with a transparent background a removed area is clear in the file too, so Show transparency as Black or White
  // paints it plain as well. On a paper background it keeps the checkerboard: the file gets the paper there.
  const plain = doc.removed.show === 'color' ? doc.removed.color : removedGround();
  const color = !!plain, cell = color ? 0 : Math.round(checkerCell(a)) * cap, gm = a.m * cap;
  const key = color ? 'c' + plain : 'k' + cell + paperClass() + gm;
  if (key === remVisKey) return remVis;
  remVisKey = key;
  const rv = remVis.getContext('2d');
  rv.globalCompositeOperation = 'source-over'; rv.setTransform(1, 0, 0, 1, 0, 0); rv.clearRect(0, 0, g.W, g.H);
  // the squares start at the corner of the artboard, as the checker under a transparent paper does
  rv.setTransform(1, 0, 0, 1, -gm, -gm);
  rv.fillStyle = color ? plain : checkerPattern(rv, cell, paperClass());
  rv.fillRect(gm, gm, g.W, g.H);
  rv.setTransform(1, 0, 0, 1, 0, 0);
  rv.globalCompositeOperation = 'destination-in'; rv.drawImage(remCanvas, sx, sy, sw, sh, 0, 0, g.W, g.H); rv.globalCompositeOperation = 'source-over';
  return remVis;
}
/* a treated copy drawn onto a canvas of W x H */
function* photoDrawGen(t, W, H) {
  const { w, h } = t, tmp = mk(w, h), tx = tmp.getContext('2d'), band = Math.max(1, Math.floor((1 << 17) / w));
  for (let y0 = 0; y0 < h; y0 += band) {
    const bh = Math.min(band, h - y0), id = new ImageData(w, bh);
    rgbaRange(t, id.data, y0 * w, (y0 + bh) * w); tx.putImageData(id, 0, y0);
    yield { stage: 'Drawing the photo', p: y0 / h };
  }
  if (w === W && h === H) return tmp;
  const photo = mk(W, H);
  photo.getContext('2d').drawImage(tmp, 0, 0, W, H);
  return photo;
}
function rgbaRange(t, d, a, e) { for (let i = a; i < e; i++) { const j = (i - a) * 4; d[j] = t.r[i] * 255; d[j + 1] = t.g[i] * 255; d[j + 2] = t.b[i] * 255; d[j + 3] = 255; } }
/* the edited photo at a given size: { photo } with no removal applied */
function* photoLayerGen(maxSide, cr, P, W, H) {
  // a silhouette replaces the whole photo, so a known shape is simply drawn at the size asked for
  if (P.silhouette > 0 && silCache && silCache.key === silKey(P)) return { photo: silhouetteCanvas(silCache, W, H) };
  const p = yield* C.prepareGen(photoSrc(P), maxSide, cr);
  const t0 = yield* C.treatGen(p, Object.assign({}, P, { feather: 0 }));
  const t = yield* finishSrcGen(t0, P, true);
  return { photo: yield* photoDrawGen(t, W, H) };
}
function photoLayerCanvas(maxSide, cr, P, W, H) { return drain(photoLayerGen(maxSide, cr, P, W, H)); }
/* The checkerboard that means "clear in the file". Its squares are about 9 screen pixels at the current zoom,
   so it reads as a checkerboard at any picture size, and its tones follow the paper the art is made for, so the
   letters show on it as they will in print. cell: the size of a square in artboard pixels. */
const checkerCache = new Map();
// light and gray: at least 50 levels apart, so the board reads next to fine letters. Dark: a quieter 25 levels,
// so small mid-gray letters do not turn to texture on it; the edge of a clear artboard is outlined anyway
const CHECKER_TONES = { light: ['#ffffff', '#c3c3ca'], gray: ['#aeaeb3', '#7a7a7f'], dark: ['#3d3d42', '#242428'] };
/* What clear areas show on screen: the checkerboard, or plain black or white (View > Show transparency as). A view
   setting kept in the preferences, never in the project, the undo history or an exported file. */
/* removed photo areas follow Show transparency as only while the background is transparent */
function removedGround() { const c = clearGround(); return doc.out.transparent && c !== 'checker' ? c : null; }
/* the checker size the artboard was last composed with, so a zoom that changes it can draw it again */
let composedCell = 0;
function checkerShown() {
  if (isMock()) return false;
  return (doc.out.transparent && clearGround() === 'checker') || (hasRemoval && doc.removed.show !== 'color' && !removedGround());
}
/* after a zoom settles: the squares were drawn for the old zoom, so draw them again at about 9 screen pixels */
function checkerSettle() {
  if (!origImg || !checkerShown() || Math.round(checkerCell()) === composedCell) return false;
  compose(); return true;
}
function transpShow() { const v = prefs.transpShow; return v === 'black' || v === 'white' ? v : 'checker'; }
function clearGround() { const v = transpShow(); return v === 'black' ? '#000000' : v === 'white' ? '#ffffff' : 'checker'; }
function setTranspShow(v) {
  prefs.transpShow = TRANSP_SHOW.some((q) => q[0] === v) ? v : 'checker'; savePrefs();
  remVisKey = '';
  // a rebuilt panel loses the focus: give it back to the same choice, so the keyboard keeps its place
  const a = document.activeElement, back = a && a.closest && a.closest('#transpShow') ? prefs.transpShow : null;
  if (origImg) { compose(); buildPanel(); }
  if (back) { const b = document.querySelector('#transpShow button[data-v="' + back + '"]'); if (b) b.focus(); }
  syncMenus();
}
/* exact: the size of a square in the pixels of x. The tile is drawn at a whole number of pixels and the pattern
   scaled to the exact size, so the normal, the sharp and the removed-area checkers keep the same squares. */
function checkerPattern(x, exact, cls) {
  exact = clamp(exact || 8, 0.5, 256);
  const cell = clamp(Math.round(exact), 2, 256);
  const t = CHECKER_TONES[cls] || CHECKER_TONES.light, key = cell + t[0];
  let cv = checkerCache.get(key);
  if (!cv) {
    cv = mk(cell * 2, cell * 2); const c = cv.getContext('2d');
    c.fillStyle = t[0]; c.fillRect(0, 0, cell * 2, cell * 2); c.fillStyle = t[1]; c.fillRect(0, 0, cell, cell); c.fillRect(cell, cell, cell, cell);
    if (checkerCache.size >= 6) checkerCache.delete(checkerCache.keys().next().value);
    checkerCache.set(key, cv);
  }
  const pat = x.createPattern(cv, 'repeat'), k = exact / cell;
  if (Math.abs(k - 1) > 1e-6 && pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().scale(k));
  return pat;
}
/* artboard pixels for 9 screen pixels at the current zoom. g: the artboard about to be drawn, when the canvas
   has not taken its size yet (a new picture) */
function checkerCell(g) {
  const tw = g ? g.TW : canvas.width, th = g ? g.TH : canvas.height;
  const z = !isMock() && ui.zoom === 'fit' ? fitScale(tw, th) : displayZoom(), per = tw ? z * designW() / tw : 1;
  return isFinite(per) && per > 0 ? 9 / per : 8;
}
function photoChanged(what) {
  if (what === 'source') refreshMaster();
  rebuildPhotoSoon(what === 'crop' || what === 'source');
  queueHistory();
}
function maskChanged() {
  rebuildPhotoSoon(false);
  snapshotMask(); queueHistory();
  if (ui.tab === 'photo') buildPanel();
}

/* ---------------- lines: bezier nodes in image pixels ---------------- */
function flatten(path, map, k) {
  const N = path.nodes, outp = [];
  if (!N || !N.length) return outp;
  const r0 = (n) => (n.w ?? path.width / 2) * k;
  const segs = path.closed ? N.length : N.length - 1;
  if (segs <= 0) { const [x, y] = map(N[0].x, N[0].y); return [[x, y, r0(N[0])]]; }
  for (let i = 0; i < segs; i++) {
    const a = N[i], b = N[(i + 1) % N.length];
    const p0 = map(a.x, a.y), p1 = map(a.x + (a.ox || 0), a.y + (a.oy || 0)), p2 = map(b.x + (b.ix || 0), b.y + (b.iy || 0)), p3 = map(b.x, b.y);
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
    const steps = clamp(Math.ceil(len / 3), 1, 80);
    for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      outp.push([x, y, r0(a) * u + r0(b) * t]);
    }
  }
  return outp;
}
/* Catmull-Rom handles turn a point list into smooth, editable curves */
function smoothNodes(pts, closed) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = (b[0] - a[0]) / 6, ty = (b[1] - a[1]) / 6;
    const end = !closed && (i === 0 || i === n - 1);
    return { x: p[0], y: p[1], w: p[2], ix: end && i === 0 ? 0 : -tx, iy: end && i === 0 ? 0 : -ty, ox: end && i === n - 1 ? 0 : tx, oy: end && i === n - 1 ? 0 : ty };
  });
}
function pathsFn() {
  const cr = cropRect(), paths = doc.lines.paths;
  return (W, H) => {
    const kx = W / (cr.w * iw), ky = H / (cr.h * ih);
    // a group is filled when its first path is (closed shapes feed the Vector shapes mask of Word cloud and Calligram)
    const lead = new Map(); paths.forEach((p) => { if (p.group != null && !lead.has(p.group)) lead.set(p.group, pathFillShown(p)); });
    return paths.map((p) => ({ text: p.text, closed: !!p.closed, fill: !!(p.closed && (pathFillShown(p) || lead.get(p.group))), group: p.group ?? 'p' + p.id, hidden: !!p.hidden, pts: flatten(p, (x, y) => [(x - cr.x * iw) * kx, (y - cr.y * ih) * ky], kx) })).filter((p) => p.pts.length > 1);
  };
}

/* ---------------- text art jobs ---------------- */
function activeLayers() {
  const s = doc.text.source;
  return doc.text.layers.filter((L) => s === 'both' || (s === 'lines') === (L.mode === 'paths'));
}
function engineLayer(L) {
  const P = Object.assign({}, L);
  if (!P.inkColor) delete P.inkColor;
  if (P.mode === 'grid') P.ramp = P.rampName === 'Custom' ? (P.ramp || RAMPS.Classic) : RAMPS[P.rampName] || RAMPS.Classic;
  if (P.mode === 'paths' || P.maskSource === 'vector' || (MODES[P.mode] && MODES[P.mode].usesLines)) P.__pathsFn = pathsFn();
  return P;
}
function sceneFor(layers, scale, over) {
  return Object.assign({ width: doc.out.width, scale, flipX: !!doc.text.flipX, flipY: !!doc.text.flipY, paper: doc.out.paper, transparent: doc.out.transparent, margin: doc.out.margin, colorModel: doc.out.colorModel, paperClass: paperClass(), ground: groundHex(), layers: layers.map(engineLayer) }, over || {});
}
function* remap(gen, a, b, stage) {
  let r;
  while (!(r = gen.next()).done) { const v = r.value || {}; yield { stage: stage || v.stage || 'Working', p: a + (b - a) * clamp(v.p || 0, 0, 1) }; }
  return r.value;
}
function* textGen() {
  const g = artGeom();
  const o = yield* remap(C.renderGen(textSource(), sceneFor(activeLayers(), g.k)), 0, 0.86);
  const c = mk(o.W, o.H);
  // a software canvas draws each letter right away, inside the sliced job. A GPU canvas would save all of them
  // for the first time it is shown, and that one step could freeze the window for most of a second.
  syncFill(o);
  yield* remap(C.drawGen(c.getContext('2d', { willReadFrequently: true }), o, 1, Object.assign({ noPaper: true }, fillOpts(fillBase()))), 0.86, 1, 'Drawing the letters');
  return { out: o, canvas: c };
}
/* ---------------- letter fill ----------------
   A filled layer shows the photo through its letters. The engine draws the letters as a mask and lays the
   picture in; this part hands it the picture: the photo as the Photo layer shows it, crop, edits and removed
   areas included. Locked text art keeps the photo it was locked with. The soft photo is blurred once for each
   picture and softness, at a reduced size, and kept, so moving the slider never blurs the full photo again. */
const FILL_KEYS = C.FILL_KEYS;
let fillCache = new WeakMap(), lockFill = null, fillTimer = null, fillDirty = false;
function fillBase() {
  if (doc.text.locked && lockSnap) {
    if (!lockFill || lockFill.snap !== lockSnap) lockFill = { snap: lockSnap, c: drain(photoDrawGen(lockSnap.src, lockSnap.src.w, lockSnap.src.h)) };
    return lockFill.c;
  }
  return photoKept;
}
const fillOpts = (base) => (base ? { fillImage: (L) => fillPictureGen(base, L) } : {});
/* the picture for one layer: the photo, blurred for a soft photo, with Photo strength laid on, in the output
   color model like the letters. fillPictureGen makes it in slices; fillPicture is the same picture at once. */
function fillPicture(base, L) { return drain(fillPictureGen(base, L)); }
function* fillPictureGen(base, L) {
  if (!base) return null;
  const soft = C.fillSoftOn(L), pop = clamp(+L.fillPop || 0, 0, 1), model = doc.out.colorModel || 'rgb';
  // drawn on a shape: the letters there must show even where the photo is as light as the paper
  const shape = L.shapeRegion ? (paperClass() === 'dark' ? 'up' : 'down') : '';
  if (!soft && pop < 0.01 && model === 'rgb' && !shape) return base;
  const key = (soft ? clamp(+L.fillSoft || 0.012, 0.001, 0.2).toFixed(4) : '0') + '|' + pop.toFixed(2) + '|' + model + '|' + shape;
  let m = fillCache.get(base);
  if (!m) { m = new Map(); fillCache.set(base, m); }
  if (m.has(key)) return m.get(key);
  let c = soft ? softPhoto(base, clamp(+L.fillSoft || 0.012, 0.001, 0.2)) : base;
  if (pop >= 0.01) c = popPhoto(c, pop);
  if (shape) c = toneInPhoto(c, shape);
  if (model !== 'rgb') c = yield* modelPhotoGen(c, model);
  if (m.size >= 6) m.delete(m.keys().next().value);
  m.set(key, c);
  return c;
}
/* Output color for the picture in the letters: Gray and B/W with canvas filters where they exist, in bands of
   rows; 16 colors and the CMYK proof (and the others without filters) one band of rows at a time, with the
   engine's own mapping read through a 6 bit table. */
function* modelPhotoGen(src0, model) {
  const w = src0.width, h = src0.height, c = mk(w, h), x = c.getContext('2d', { willReadFrequently: true });
  if ((model === 'gray' || model === 'bw') && typeof x.filter === 'string') {
    // the filter runs over bands of rows, so a very large picture never makes one long task
    x.filter = model === 'gray' ? 'grayscale(1)' : 'grayscale(1) contrast(100000)';
    const fb = Math.max(1, Math.floor((1 << 21) / Math.max(1, w)));
    for (let y0 = 0; y0 < h; y0 += fb) {
      const bh = Math.min(fb, h - y0);
      x.drawImage(src0, 0, y0, w, bh, 0, y0, w, bh);
      yield { stage: 'Coloring the photo for the letters', p: (y0 + bh) / h };
    }
    x.filter = 'none';
    return c;
  }
  x.clearRect(0, 0, w, h); x.drawImage(src0, 0, 0);
  // a 6 bits per channel table, filled as colors turn up, so each color is worked out once
  const lut = new Int32Array(1 << 18).fill(-1);
  const band = Math.max(1, Math.floor((1 << 17) / Math.max(1, w)));
  for (let y0 = 0; y0 < h; y0 += band) {
    const bh = Math.min(band, h - y0), id = x.getImageData(0, y0, w, bh), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const q = ((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2);
      let v = lut[q];
      if (v < 0) { const o = C.modelRGB(model, d[i] / 255, d[i + 1] / 255, d[i + 2] / 255); v = lut[q] = (Math.round(o[0] * 255) << 16) | (Math.round(o[1] * 255) << 8) | Math.round(o[2] * 255); }
      d[i] = v >> 16 & 255; d[i + 1] = v >> 8 & 255; d[i + 2] = v & 255;
    }
    x.putImageData(id, 0, y0);
    yield { stage: 'Coloring the photo for the letters', p: (y0 + bh) / h };
  }
  return c;
}
/* The blur radius is a share of the longer side of the picture, so the preview and every export blur alike.
   The photo is made smaller first, to a size where the radius is a few pixels, and blurred there: quick at any
   photo size, and the softness hides the smaller size when it is drawn large again. */
function softPhoto(base, soft) {
  const bw = base.width, bh = base.height, long = Math.max(bw, bh);
  const side = Math.min(long, clamp(Math.round(8 / soft), 160, 1200)), k = side / long;
  const w = Math.max(1, Math.round(bw * k)), h = Math.max(1, Math.round(bh * k)), r = soft * side;
  // the edges are mirrored outward first, so the blur does not pull in darkness from outside the photo
  const pad = Math.ceil(r * 2.5) + 1, ext = mk(w + 2 * pad, h + 2 * pad), ex = ext.getContext('2d');
  for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) {
    ex.setTransform(i ? -1 : 1, 0, 0, j ? -1 : 1, pad + (i > 0 ? 2 * w : 0), pad + (j > 0 ? 2 * h : 0));
    ex.drawImage(base, 0, 0, w, h);
  }
  const c = mk(w, h), x = c.getContext('2d');
  if (typeof x.filter === 'string') { x.filter = 'blur(' + r.toFixed(2) + 'px)'; x.drawImage(ext, -pad, -pad); x.filter = 'none'; }
  else {
    // no canvas filters: shrink to about the radius and grow back, which blurs as well
    const t = mk(Math.max(2, Math.round(w / Math.max(1, r))), Math.max(2, Math.round(h / Math.max(1, r))));
    t.getContext('2d').drawImage(ext, pad, pad, w, h, 0, 0, t.width, t.height);
    x.imageSmoothingQuality = 'high'; x.drawImage(t, 0, 0, w, h);
  }
  return c;
}
/* Photo strength: richer color and a little more contrast inside the letters, where small shapes read as flat */
function popPhoto(src0, pop) {
  const c = mk(src0.width, src0.height), x = c.getContext('2d');
  if (typeof x.filter !== 'string') return src0;
  x.filter = 'saturate(' + (1 + 0.9 * pop).toFixed(3) + ') contrast(' + (1 + 0.35 * pop).toFixed(3) + ')';
  x.drawImage(src0, 0, 0); x.filter = 'none';
  return c;
}
/* The photo kept off the paper's own tone: on light paper even its whites become a middle gray (down), on
   dark paper its blacks a middle gray (up), so every letter of a shape word reads at least half as strong as
   the ink, while the tones keep their order */
function toneInPhoto(src0, dir) {
  const c = mk(src0.width, src0.height), x = c.getContext('2d');
  if (typeof x.filter !== 'string') return src0;
  x.filter = dir === 'up' ? 'contrast(0.75) brightness(1.6)' : 'contrast(0.7) brightness(0.52)';
  x.drawImage(src0, 0, 0); x.filter = 'none';
  return c;
}
/* the letters are laid out already; a fill setting is copied onto them by layer id */
function syncFill(o) {
  if (!o) return;
  for (const R of o.layers) { const L = doc.text.layers.find((q) => q.id === R.id); if (L) for (const k of FILL_KEYS) R[k] = L[k]; }
}
/* A change to the fill only draws the letters again, without laying them out again */
function redrawFill(delay) {
  clearTimeout(fillTimer);
  fillTimer = setTimeout(() => {
    if (!doc.text.applied || !out || !textCanvas) return;
    if (jobs.text) { fillDirty = true; return; }
    const o = out;
    runJob('text', (function* () {
      syncFill(o);
      const c = mk(o.W, o.H);
      yield* C.drawGen(c.getContext('2d', { willReadFrequently: true }), o, 1, Object.assign({ noPaper: true }, fillOpts(fillBase())));
      return c;
    })(), (c) => {
      if (out !== o) return;
      textCanvas = c; stopReveal(); compose(); statusIdle();
      if (fillDirty) { fillDirty = false; redrawFill(0); }
    });
  }, delay ?? 60);
}
const fillWanted = () => doc.text.applied && activeLayers().some((L) => C.fillOn(L));
let textTimer = null;
function scheduleText(delay) {
  clearTimeout(textTimer);
  textTimer = setTimeout(startText, delay ?? 140);
}
function startText() {
  if (!src || !doc.text.applied || ui.cropDraft) return;
  // the photo is being read again; text art starts when it is done. Locked text art reads its own copy and goes on.
  if (jobs.src && !(doc.text.locked && lockSnap)) { ui.textWaiting = true; return; }
  if (!activeLayers().length) { textCanvas = null; out = null; compose(); return; }
  runJob('text', textGen(), (res) => {
    out = res.out; textCanvas = res.canvas;
    if (fillDirty) { fillDirty = false; redrawFill(0); }
    // the first look kept the photo on screen while it was drawn. The letters now land on the photo, and the
    // photo gives way to the paper once they are all in place.
    const fromPhoto = ui.textWhenDrawn;
    if (fromPhoto) setView(ui.revealNext ? 'mix' : 'text');
    if (ui.revealNext) { ui.revealNext = false; startReveal(fromPhoto ? () => { if (ui.view === 'mix') setView('text'); } : null); } else stopReveal();
    compose(); updatePrint(); updatePalette(); statusIdle();
  });
}

/* Work runs in short slices so the window stays responsive. Gentle mode uses shorter slices and longer rests. */
const jobs = {};
function runJob(kind, gen, onDone, onFail, onCancel) {
  if (jobs[kind]) jobs[kind].cancelled = true;
  const j = { kind, cancelled: false, start: performance.now(), progress: { stage: 'Starting', p: 0 } };
  jobs[kind] = j;
  const step = () => {
    // onCancel: for a caller that waits on the job, so a stopped job does not leave it waiting forever
    if (j.cancelled) { if (onCancel) { if (jobs[kind] === j) delete jobs[kind]; onCancel(); } return; }
    const budget = doc.out.gentle ? 6 : 14, rest = doc.out.gentle ? 24 : 1;
    const t0 = performance.now();
    let r, last = null;
    try {
      do { r = gen.next(); if (!r.done && r.value) last = r.value; } while (!r.done && performance.now() - t0 < budget);
    } catch (e) {
      if (jobs[kind] === j) delete jobs[kind];
      hudUpdate(); console.error(e);
      toast('Could not finish: ' + (e && e.message ? e.message : e));
      if (onFail) onFail(e);
      return;
    }
    if (r.done) { if (jobs[kind] === j) delete jobs[kind]; hudUpdate(); onDone(r.value); return; }
    if (last) j.progress = last;
    hudUpdate();
    setTimeout(step, rest);
  };
  setTimeout(step, 0);
  hudUpdate();
  return j;
}
function hudUpdate() {
  const list = Object.values(jobs).filter((j) => !j.cancelled);
  const j = list[list.length - 1];
  const hud = $('hud');
  if (!j) { hud.hidden = true; return; }
  const age = performance.now() - j.start;
  const pct = Math.round(clamp(j.progress.p || 0, 0, 1) * 100);
  $('status').textContent = j.progress.stage + ' · ' + pct + '%';
  $('status').classList.add('busy');
  if (age < 180) { setTimeout(hudUpdate, 190 - age); return; }
  hud.hidden = false;
  $('hudStage').textContent = j.progress.stage;
  $('hudPct').textContent = pct + '%';
  $('hudBar').style.width = pct + '%';
}
$('hudCancel').onclick = () => { for (const k of Object.keys(jobs)) { jobs[k].cancelled = true; delete jobs[k]; } hudUpdate(); statusIdle(); toast('Stopped. The last finished result is still shown.'); };
function statusIdle() {
  const st = $('status'); st.classList.remove('busy');
  if (!origImg) { st.textContent = 'Open an image to start'; return; }
  const g = artGeom();
  const n = out ? out.layers.reduce((a, l) => a + l.items.length, 0) : 0;
  const q = previewScale() < 1 ? 'preview ' + g.TW + ' × ' + g.TH + ' px, exports at ' + (doc.out.width + 2 * Math.round(doc.out.width * doc.out.margin)) + ' px' : g.TW + ' × ' + g.TH + ' px';
  st.textContent = q + (n ? ' · ' + n.toLocaleString() + ' letters' : '');
}

/* ---------------- compositing the three layers ---------------- */
const gco = (b) => (!b || b === 'normal' ? 'source-over' : b);
/* Draws the layers, bottom to top, in doc.order. S holds canvases sized to the artboard (photo ones to its inner area).
   opt.only limits the layers drawn; otherwise each layer's eye decides. */
function composeTo(x, g, S, opt) {
  opt = opt || {};
  const TW = g.TW, TH = g.TH;
  // opt.view composes only the part of the picture the window is showing, at the resolution of the
  // screen. Everything below still works in artboard pixels, so only the transform changes.
  const v = opt.view;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, v ? v.cw : TW, v ? v.ch : TH);
  if (v) x.setTransform(v.s, 0, 0, v.s, -v.x * v.s, -v.y * v.s);
  if (opt.ground === 'paper') { x.fillStyle = doc.out.paper; x.fillRect(0, 0, TW, TH); }
  else if (opt.ground === 'checker' && v) {
    // the sharp redraw gets its squares at the resolution of the screen, so their edges stay crisp
    // the pattern starts where the artboard starts on screen, so its squares line up with the normal view
    // each edge sits on the whole screen pixel nearest to where the normal checker puts it: edges stay crisp,
    // and rounding never adds up, so the squares do not drift away from the normal view across the screen
    const C = Math.round(checkerCell()), t = CHECKER_TONES[paperClass()] || CHECKER_TONES.light, k = C * v.s;
    const ex = (i) => Math.round(i * k - v.x * v.s), ey = (j) => Math.round(j * k - v.y * v.s);
    const i0 = Math.floor(v.x / C), i1 = Math.ceil((v.x + v.cw / v.s) / C), j0 = Math.floor(v.y / C), j1 = Math.ceil((v.y + v.ch / v.s) / C);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = t[0]; x.fillRect(0, 0, v.cw, v.ch);
    if ((i1 - i0) * (j1 - j0) < 40000) {
      x.fillStyle = t[1];
      for (let j = j0; j < j1; j++) { const y0 = ey(j), y1 = ey(j + 1); for (let i = i0 + ((i0 + j) & 1); i < i1; i += 2) x.fillRect(ex(i), y0, ex(i + 1) - ex(i), y1 - y0); }
    }
    x.setTransform(v.s, 0, 0, v.s, -v.x * v.s, -v.y * v.s);
  } else if (opt.ground === 'checker') { composedCell = Math.round(checkerCell()); x.fillStyle = checkerPattern(x, composedCell, paperClass()); x.fillRect(0, 0, TW, TH); }
  else if (opt.ground) { x.fillStyle = opt.ground; x.fillRect(0, 0, TW, TH); }
  const on = (id) => (opt.only ? opt.only.includes(id) : layerOf(id).visible);
  const textBelowOrder = doc.order.indexOf('text') < doc.order.indexOf('photo');
  for (let i = doc.order.length - 1; i >= 0; i--) {
    const id = doc.order[i], L = layerOf(id);
    if (!on(id)) continue;
    let a = opt.ignoreOpacity ? 1 : (L.opacity ?? 1);
    if (id === 'photo' && opt.mixFade && textBelowOrder && on('text') && S.text) a *= doc.out.mixPhoto;
    x.globalAlpha = a; x.globalCompositeOperation = opt.ignoreOpacity ? 'source-over' : gco(L.blend);
    if (id === 'photo' && S.photo) {
      if (S.removed) x.drawImage(S.removed, g.m, g.m, g.W, g.H);
      x.drawImage(S.photo, g.m, g.m, g.W, g.H);
    } else if (id === 'text' && S.text) {
      if (S.removedInText && !on('photo')) { x.globalAlpha = 0.6; x.drawImage(S.removedInText, g.m, g.m, g.W, g.H); x.globalAlpha = a; }
      if (v) x.drawImage(S.text, v.x, v.y, v.cw / v.s, v.ch / v.s);
      else x.drawImage(S.text, 0, 0, TW, TH);
    } else if (id === 'lines' && S.vector) x.drawImage(S.vector, 0, 0, TW, TH);
  }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
}
/* stroked lines and objects on the Vector layer */
let vecCache = null, vecVer = 0;
function vectorCanvas(g, scale) {
  const key = vecVer + '|' + objVer + '|' + g.TW + 'x' + g.TH + '|' + JSON.stringify(cropRect());
  if (!scale && vecCache && vecCache.key === key) return vecCache.c;
  const c = mk(g.TW, g.TH), x = c.getContext('2d');
  drawVectorLayer(x, g);
  if (!scale) vecCache = { key, c };
  return c;
}
function drawVectorLayer(x, g) {
  const M = imgTransform(g);
  x.save(); x.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  // strokes and fills, a group as one shape (03f-vector.js)
  drawPathUnits(x, doc.lines.paths);
  doc.objects.filter((o) => o.layer !== 'photo' && !o.hidden).forEach((o) => drawObject(x, o));
  x.restore();
}
function textShown() { return doc.text.visible && doc.text.applied && !!textCanvas; }
function compose() {
  if (!origImg || !photoCanvas) return;
  const g = artGeom();
  const TW = g.TW, TH = g.TH;
  if (canvas.width !== TW || canvas.height !== TH) { canvas.width = TW; canvas.height = TH; }
  const mock = doc.out.mock !== 'artboard';
  const x = ctx;
  if (hasRemoval) composedCell = Math.round(checkerCell());
  const S = { photo: photoKept, removed: hasRemoval ? removedShown() : null, text: textShown() ? (revealing() ? revealFrame() : textCanvas) : null, vector: vectorCanvas(g), removedInText: doc.removed.inText && hasRemoval ? removedShown() : null };
  if (ui.cropDraft) composeTo(x, g, { photo: photoKept, removed: S.removed }, { only: ['photo'], ground: '#808080', ignoreOpacity: true });
  else if (mock) {
    // on paper or a shirt, the sheet or the shirt shows through a transparent background
    composeTo(x, g, { text: S.text, vector: S.vector }, { only: ['text', 'lines'], ground: doc.out.transparent ? null : 'paper' });
    if (ui.compare.on) drawSplit(x, g, S);
  }
  else {
    composeTo(x, g, S, { mixFade: ui.view === 'mix', ground: doc.out.transparent ? clearGround() : 'paper' });
    if (ui.compare.on) drawSplit(x, g, S);
  }
  if (hasSelection && !mock && (doc.photo.visible || ui.cropDraft)) {
    const cr = cropRect();
    x.globalAlpha = 0.38;
    x.drawImage(selTint, cr.x * selTint.width, cr.y * selTint.height, cr.w * selTint.width, cr.h * selTint.height, g.m, g.m, g.W, g.H);
    x.globalAlpha = 1;
  }
  canvas.setAttribute('aria-label', 'Artwork: ' + doc.order.filter((id) => layerOf(id).visible).map((id) => LAYER_NAMES[id]).join(', '));
  layoutStage();
  drawOverlay();
  updateCTA();
  updatePaperNote();
  syncViewSeg();
  scheduleCrisp();
}

/* ---------------- sharp redraw when zoomed in ----------------
   The artwork canvas holds one pixel per artboard pixel, so zooming past 100% enlarges those pixels
   and the letters go blocky. Once the view settles, the part of the picture on screen is drawn again
   at the resolution of the screen, from the letters that are already worked out. No second layout,
   and never larger than the window, so the work does not grow with the zoom. */
let crispCanvas = null, crispText = null, crispTimer = null;
function crispWanted() {
  if (!out || !textCanvas || !src || ui.cropDraft || revealing() || doc.out.mock !== 'artboard' || ui.compare.on) return false;
  if (!doc.text.visible || !doc.text.applied) return false;
  // from the numbers only: reading the canvas off the page here would force a layout on every compose.
  // Zoomed in, the letters are drawn again sharp. Zoomed far out, as on a phone, they are drawn again at the
  // size they show, because a fine screen of letters shrunk as a picture shows stripes (moire).
  const r = displayZoom() * designW() / canvas.width;
  return r > 1.2 || r < 0.45;
}
let crispShown = false;
function hideCrisp() { if (crispShown) { const c = $('crisp'); if (c) c.hidden = true; crispShown = false; } }
let crispJob = 0;
function scheduleCrisp(delay) {
  // Nothing here may read the page: this runs after every compose, and asking for a size or a
  // position would make the browser lay the page out again in the middle of the drawing work.
  // Whether a sharp redraw is wanted at all is decided later, in the timer.
  if (crispTimer) clearTimeout(crispTimer);
  crispJob++;
  if (jobs.crisp) jobs.crisp.cancelled = true;
  hideCrisp();
  crispTimer = setTimeout(() => { if (!checkerSettle()) drawCrisp(); }, delay ?? 200);
}
/* The piece of the artboard the window is showing, in canvas pixels, with how many screen pixels
   each one gets. Returns null when there is nothing worth drawing. */
function crispView() {
  const cr = canvas.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
  const left = Math.max(cr.left, wr.left), top = Math.max(cr.top, wr.top);
  const right = Math.min(cr.right, wr.right), bottom = Math.min(cr.bottom, wr.bottom);
  if (right - left < 8 || bottom - top < 8) return null;
  const perCanvas = cr.width / canvas.width;
  // the screen's own pixels, and no more: a 4K window is about 8 million, whatever the zoom
  const s = perCanvas * Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.min(4096, Math.round((right - left) * (s / perCanvas)));
  const ch = Math.min(4096, Math.round((bottom - top) * (s / perCanvas)));
  return { x: (left - cr.left) / perCanvas, y: (top - cr.top) / perCanvas, s, cw, ch,
    cssLeft: left - cr.left, cssTop: top - cr.top, cssW: right - left, cssH: bottom - top };
}
function drawCrisp() {
  crispTimer = null;
  if (!crispWanted()) return;
  const v = crispView();
  if (!v) return;
  const g = artGeom();
  if (!crispText || crispText.width !== v.cw || crispText.height !== v.ch) crispText = mk(v.cw, v.ch);
  if (!crispCanvas) crispCanvas = $('crisp');
  if (crispCanvas.width !== v.cw || crispCanvas.height !== v.ch) { crispCanvas.width = v.cw; crispCanvas.height = v.ch; }
  const tx = crispText.getContext('2d', { willReadFrequently: true });
  const mine = crispJob;
  runJob('crisp', (function* () {
    yield* C.drawGen(tx, out, v.s, Object.assign({ noPaper: true, view: v }, fillOpts(fillBase())));
    const S = { photo: photoKept, removed: hasRemoval ? removedShown() : null, text: crispText, vector: vectorCanvas(g),
      removedInText: doc.removed.inText && hasRemoval ? removedShown() : null };
    composeTo(crispCanvas.getContext('2d'), g, S, { view: v, mixFade: ui.view === 'mix', ground: doc.out.transparent ? clearGround() : 'paper' });
  })(), () => {
    if (mine !== crispJob || !crispWanted()) return;
    Object.assign(crispCanvas.style, { left: v.cssLeft + 'px', top: v.cssTop + 'px', width: v.cssW + 'px', height: v.cssH + 'px' });
    crispCanvas.hidden = false; crispShown = true;
    statusIdle();
  });
}
