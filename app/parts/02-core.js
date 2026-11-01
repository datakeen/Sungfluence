/* ===================== Part 2: document, pipeline, jobs, compositing ===================== */
let uid = 1;
function newLayer(mode, over) {
  const L = Object.assign({ mode }, COMMON_DEFAULTS, MODES[mode].defaults, over || {});
  L.id = uid++;
  return L;
}
/* Three layers. Their stacking order lives in doc.order, top first.
   Objects (shapes, text, images) sit on the Photo layer (they become part of the photo that text art reads) or on the Vector layer. */
const doc = {
  fileName: 'cat.jpg', imageURL: SAMPLES.cat, sample: 'cat', blank: null,
  photo: Object.assign({}, LAYER_DEFAULTS, PHOTO_DEFAULTS),
  removed: { show: 'checker', color: '#ff3b7f', inText: false },
  lines: Object.assign({}, LAYER_DEFAULTS, { paths: [], color: '#0a84ff', width: 0 }),
  text: Object.assign({}, LAYER_DEFAULTS, { applied: false, locked: false, source: 'photo', layers: [newLayer('rows', { text: 'whiskers sunbeam purr nap tabby paws meow' })], sel: 0 }),
  objects: [],
  order: ['text', 'lines', 'photo'],
  out: { paper: '#111113', transparent: false, margin: 0, colorModel: 'rgb', width: 1600, print: 'A3', dpi: 300, mock: 'artboard', shirt: '#1b1b1d', mixPhoto: 0.35, gentle: false }
};
const ui = {
  view: 'photo', tab: 'photo', tool: 'hand', zoom: 'fit', quality: 'fast', open: {},
  wand: { tol: 0.16, contiguous: true, mode: 'new' }, brush: { size: 40, mode: 'add' }, lasso: { mode: 'new' },
  trace: { kind: 'dark', threshold: 0.5, amount: 0.09, skipWide: true },
  selPath: null, selNode: null, selObjs: [], suggestion: null,
  shape: { kind: 'rect', sides: 6, points: 5, inner: 0.45, radius: 0 }, objLayer: 'lines',
  cropDraft: null, cropCustom: [5, 4],
  compare: { on: false, pos: 0.5, left: 'original', right: 'current' },
  rep: { mode: 'line', count: 4, dx: 120, dy: 0, rot: 0, scale: 100, fade: 0, cols: 3, rows: 3, gx: 20, gy: 20, radius: 300, turn: true, path: null }
};

let origImg = null, iw = 0, ih = 0;
let master = null;              // full image at mask resolution: { w, h, data (ImageData), base (floats) }
let remCanvas = null, selCanvas = null, selTint = null;
let hasRemoval = false, hasSelection = false;
let baseSrc = null, src = null; // analysis copies at about 800 px, cropped
let photoCanvas = null, photoKept = null, remVis = null;
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
  const H = baseSrc ? Math.round(W * baseSrc.h / baseSrc.w) : Math.round(W * 0.66);
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
  if (!objs.length && !warpOn(P)) return origImg;
  const key = objVer + '|' + [P.bulge, P.twirl, P.warpX, P.warpY, P.warpR].join(',') + '|' + iw + 'x' + ih + '|' + imgVer;
  if (photoSrcCache && photoSrcCache.key === key) return photoSrcCache.c;
  const k = Math.min(1, 2400 / Math.max(iw, ih));
  const c = mk(Math.round(iw * k), Math.round(ih * k)), x = c.getContext('2d');
  if (warpOn(P)) x.drawImage(warpCanvas(origImg, c.width, c.height, P), 0, 0);
  else x.drawImage(origImg, 0, 0, c.width, c.height);
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
function finishSrc(t, P) {
  const { w, h, r, g, b, lum } = t, n = w * h;
  const any = P.hue || P.shadows || P.highlights || P.sepia || P.posterize >= 2 || P.threshold > 0 || P.vignette || P.grain || P.pixelate >= 1;
  if (!any) return t;
  if (P.pixelate >= 1) {
    const bs = Math.max(1, Math.round(P.pixelate * w / 400));
    for (let y0 = 0; y0 < h; y0 += bs) for (let x0 = 0; x0 < w; x0 += bs) {
      let sr = 0, sg = 0, sb = 0, cnt = 0;
      for (let y = y0; y < Math.min(h, y0 + bs); y++) for (let x = x0; x < Math.min(w, x0 + bs); x++) { const i = y * w + x; sr += r[i]; sg += g[i]; sb += b[i]; cnt++; }
      sr /= cnt; sg /= cnt; sb /= cnt;
      for (let y = y0; y < Math.min(h, y0 + bs); y++) for (let x = x0; x < Math.min(w, x0 + bs); x++) { const i = y * w + x; r[i] = sr; g[i] = sg; b[i] = sb; }
    }
  }
  // hue rotation matrix, the same one CSS hue-rotate uses
  const a = (P.hue || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const H = [0.213 + ca * 0.787 - sa * 0.213, 0.715 - ca * 0.715 - sa * 0.715, 0.072 - ca * 0.072 + sa * 0.928,
    0.213 - ca * 0.213 + sa * 0.143, 0.715 + ca * 0.285 + sa * 0.140, 0.072 - ca * 0.072 - sa * 0.283,
    0.213 - ca * 0.213 - sa * 0.787, 0.715 - ca * 0.715 + sa * 0.715, 0.072 + ca * 0.928 + sa * 0.072];
  const lv = P.posterize >= 2 ? Math.round(P.posterize) - 1 : 0;
  for (let i = 0; i < n; i++) {
    let R = r[i], G = g[i], B = b[i];
    if (P.hue) { const r0 = R, g0 = G, b0 = B; R = H[0] * r0 + H[1] * g0 + H[2] * b0; G = H[3] * r0 + H[4] * g0 + H[5] * b0; B = H[6] * r0 + H[7] * g0 + H[8] * b0; }
    if (P.shadows || P.highlights) {
      const l = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      const d = P.shadows * 0.45 * (1 - l) * (1 - l) * (1 - l) + P.highlights * 0.45 * l * l * l;
      R += d; G += d; B += d;
    }
    if (P.sepia) {
      const sr = 0.393 * R + 0.769 * G + 0.189 * B, sg = 0.349 * R + 0.686 * G + 0.168 * B, sb = 0.272 * R + 0.534 * G + 0.131 * B;
      R += (sr - R) * P.sepia; G += (sg - G) * P.sepia; B += (sb - B) * P.sepia;
    }
    if (P.vignette) {
      const x = (i % w) / w - 0.5, y = ((i / w) | 0) / h - 0.5, v = 1 - P.vignette * smooth01((Math.hypot(x, y) - 0.25) / 0.5);
      R *= v; G *= v; B *= v;
    }
    if (P.grain) {
      const x = Math.round((i % w) / w * 1600), y = Math.round(((i / w) | 0) / h * 1600);
      const nz = (((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) + 1) % 1 - 0.5;
      R += nz * P.grain * 0.35; G += nz * P.grain * 0.35; B += nz * P.grain * 0.35;
    }
    if (lv) { R = Math.round(clamp(R, 0, 1) * lv) / lv; G = Math.round(clamp(G, 0, 1) * lv) / lv; B = Math.round(clamp(B, 0, 1) * lv) / lv; }
    if (P.threshold > 0) { const l = 0.2126 * R + 0.7152 * G + 0.0722 * B; R = G = B = l >= P.threshold ? 1 : 0; }
    r[i] = clamp(R, 0, 1); g[i] = clamp(G, 0, 1); b[i] = clamp(B, 0, 1);
    lum[i] = 0.2126 * r[i] + 0.7152 * g[i] + 0.0722 * b[i];
  }
  return t;
}
function smooth01(x) { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); }
/* the analysis copy text art reads: prepared, treated and filtered */
function srcFrom(img, maxSide, cr, P, rem) {
  const b = C.prepare(img, maxSide, cr);
  return finishSrc(C.treat(b, Object.assign({}, P, { keepMask: rem ? keepFrom(rem, cr, b.w, b.h) : null })), P);
}

/* ---------------- photo pipeline ---------------- */
function rebuildBase() { if (origImg) { baseSrc = C.prepare(photoSrc(), 800, cropRect()); rebuildSrc(); } }
function rebuildSrc() { if (baseSrc) src = finishSrc(C.treat(baseSrc, Object.assign({}, doc.photo, { keepMask: keepFor(baseSrc.w, baseSrc.h) })), doc.photo); }
/* text art reads the live photo, or the photo as it was when the text art was locked */
function textSource() { return doc.text.locked && lockSnap ? lockSnap.src : src; }
function lockText(on) {
  if (on) lockSnap = { src, img: (() => { const s = photoSrc(), c = mk(s.width || s.naturalWidth, s.height || s.naturalHeight); c.getContext('2d').drawImage(s, 0, 0); return c; })(), photo: clone(doc.photo), crop: Object.assign({}, cropRect()), rem: hasRemoval ? (() => { const c = mk(remCanvas.width, remCanvas.height); c.getContext('2d').drawImage(remCanvas, 0, 0); return c; })() : null };
  else lockSnap = null;
  doc.text.locked = !!on;
  if (!on && doc.text.applied) scheduleText(0);
}
function rebuildPhotoView() {
  if (!origImg || !baseSrc) return;
  // the on-screen photo never needs more than about 1800 px; compose scales it to the artboard
  const g0 = artGeom(), cap = Math.min(1, 1800 / Math.max(g0.W, g0.H));
  const g = { W: Math.max(1, Math.round(g0.W * cap)), H: Math.max(1, Math.round(g0.H * cap)) };
  const v = photoLayerCanvas(Math.max(g.W, g.H), cropRect(), doc.photo, g.W, g.H);
  photoCanvas = v.photo;
  photoKept = mk(g.W, g.H);
  remVis = mk(g.W, g.H);
  const pk = photoKept.getContext('2d'), rv = remVis.getContext('2d');
  pk.drawImage(photoCanvas, 0, 0);
  if (hasRemoval) {
    const cr = cropRect();
    const sx = cr.x * remCanvas.width, sy = cr.y * remCanvas.height, sw = cr.w * remCanvas.width, sh = cr.h * remCanvas.height;
    pk.globalCompositeOperation = 'destination-out'; pk.drawImage(remCanvas, sx, sy, sw, sh, 0, 0, g.W, g.H); pk.globalCompositeOperation = 'source-over';
    rv.fillStyle = doc.removed.show === 'color' ? doc.removed.color : checkerPattern(rv);
    rv.fillRect(0, 0, g.W, g.H);
    rv.globalCompositeOperation = 'destination-in'; rv.drawImage(remCanvas, sx, sy, sw, sh, 0, 0, g.W, g.H); rv.globalCompositeOperation = 'source-over';
  }
}
/* the edited photo at a given size: { photo } with no removal applied */
function photoLayerCanvas(maxSide, cr, P, W, H) {
  const p = C.prepare(photoSrc(P), maxSide, cr);
  const t = finishSrc(C.treat(p, Object.assign({}, P, { feather: 0 })), P);
  const photo = mk(W, H);
  const tmp = mk(t.w, t.h); tmp.getContext('2d').putImageData(C.toImageData(t), 0, 0);
  photo.getContext('2d').drawImage(tmp, 0, 0, W, H);
  return { photo };
}
let checkerCache = null;
function checkerPattern(x) {
  if (!checkerCache) {
    checkerCache = mk(16, 16); const c = checkerCache.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 16, 16); c.fillStyle = '#d4d4d8'; c.fillRect(0, 0, 8, 8); c.fillRect(8, 8, 8, 8);
  }
  return x.createPattern(checkerCache, 'repeat');
}
function photoChanged(what) {
  if (what === 'crop' || what === 'source') { if (what === 'source') refreshMaster(); rebuildBase(); } else rebuildSrc();
  rebuildPhotoView(); compose();
  if (doc.text.applied && !doc.text.locked) scheduleText();
  queueHistory(); thumbsSoon();
}
function maskChanged() {
  rebuildSrc(); rebuildPhotoView(); compose();
  if (doc.text.applied && !doc.text.locked) scheduleText();
  snapshotMask(); queueHistory(); thumbsSoon();
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
    return paths.map((p) => ({ text: p.text, pts: flatten(p, (x, y) => [(x - cr.x * iw) * kx, (y - cr.y * ih) * ky], kx) })).filter((p) => p.pts.length > 1);
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
  if (P.mode === 'paths' || (MODES[P.mode] && MODES[P.mode].usesLines)) P.__pathsFn = pathsFn();
  return P;
}
function sceneFor(layers, scale, over) {
  return Object.assign({ width: doc.out.width, scale, paper: doc.out.paper, transparent: doc.out.transparent, margin: doc.out.margin, colorModel: doc.out.colorModel, layers: layers.map(engineLayer) }, over || {});
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
  yield* remap(C.drawGen(c.getContext('2d', { willReadFrequently: true }), o, 1, { noPaper: true }), 0.86, 1, 'Drawing the letters');
  return { out: o, canvas: c };
}
let textTimer = null;
function scheduleText(delay) {
  clearTimeout(textTimer);
  textTimer = setTimeout(startText, delay ?? 140);
}
function startText() {
  if (!src || !doc.text.applied || ui.cropDraft) return;
  if (!activeLayers().length) { textCanvas = null; out = null; compose(); return; }
  runJob('text', textGen(), (res) => {
    out = res.out; textCanvas = res.canvas;
    compose(); updatePrint(); updatePalette(); statusIdle();
  });
}

/* Work runs in short slices so the window stays responsive. Gentle mode uses shorter slices and longer rests. */
const jobs = {};
function runJob(kind, gen, onDone, onFail) {
  if (jobs[kind]) jobs[kind].cancelled = true;
  const j = { kind, cancelled: false, start: performance.now(), progress: { stage: 'Starting', p: 0 } };
  jobs[kind] = j;
  const step = () => {
    if (j.cancelled) return;
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
  st.textContent = q + (n ? ' · ' + n.toLocaleString() + ' glyphs' : '');
}

/* ---------------- compositing the three layers ---------------- */
const gco = (b) => (!b || b === 'normal' ? 'source-over' : b);
/* Draws the layers, bottom to top, in doc.order. S holds canvases sized to the artboard (photo ones to its inner area).
   opt.only limits the layers drawn; otherwise each layer's eye decides. */
function composeTo(x, g, S, opt) {
  opt = opt || {};
  const TW = g.TW, TH = g.TH;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, TW, TH);
  if (opt.ground === 'paper') { x.fillStyle = doc.out.paper; x.fillRect(0, 0, TW, TH); }
  else if (opt.ground === 'checker') { x.fillStyle = checkerPattern(x); x.fillRect(0, 0, TW, TH); }
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
      x.drawImage(S.text, 0, 0, TW, TH);
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
  for (const p of doc.lines.paths) {
    if (!p.stroke || p.hidden) continue;
    const pts = flatten(p, (a, b) => [a, b], 1);
    if (pts.length < 2) continue;
    x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); if (p.closed) x.closePath();
    if (p.fill && p.closed) { x.fillStyle = p.fill; x.fill(); }
    x.strokeStyle = p.stroke; x.lineWidth = p.sw || p.width || 4; x.lineCap = 'round'; x.lineJoin = 'round'; x.globalAlpha = p.opacity ?? 1; x.stroke(); x.globalAlpha = 1;
  }
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
  const S = { photo: photoKept, removed: hasRemoval ? remVis : null, text: textShown() ? textCanvas : null, vector: vectorCanvas(g), removedInText: doc.removed.inText && hasRemoval ? remVis : null };
  if (ui.cropDraft) composeTo(x, g, { photo: photoKept, removed: S.removed }, { only: ['photo'], ground: '#808080', ignoreOpacity: true });
  else if (mock) composeTo(x, g, { text: S.text, vector: S.vector }, { only: ['text', 'lines'], ground: doc.out.transparent ? (doc.out.mock === 'paper' ? '#ffffff' : null) : 'paper' });
  else {
    composeTo(x, g, S, { mixFade: ui.view === 'mix', ground: doc.out.transparent ? 'checker' : 'paper' });
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
  syncViewSeg();
}
