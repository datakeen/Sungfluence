/* ===================== Part 5: history, files, export, AI helpers, keys, boot ===================== */
const hist = [], future = [];
let histTimer = null, restoring = false, lastDoc = null;
/* a history step: everything except which layers are shown, and except image pixels (they live in imgStore and assets) */
function docOf() {
  const o = Object.assign({}, doc.out); delete o.mock; delete o.gentle;
  return JSON.stringify({ photo: doc.photo, removed: doc.removed, lines: doc.lines, text: doc.text, objects: doc.objects, order: doc.order, out: o, mask: maskVer, img: imgVer },
    (k, v) => (k === 'visible' || k === '_editing' ? undefined : v));
}
function queueHistory() { if (restoring) return; clearTimeout(histTimer); histTimer = setTimeout(commitHistory, 450); }
function commitHistory() {
  const d = docOf();
  if (d === lastDoc) return;
  if (lastDoc !== null) { hist.push(lastDoc); if (hist.length > 80) hist.shift(); future.length = 0; }
  lastDoc = d;
  updateUndoButtons(); autosave();
}
function applyDoc(d) {
  const s = JSON.parse(d);
  restoring = true;
  commitTextEdit();
  const vis = { photo: doc.photo.visible, lines: doc.lines.visible, text: doc.text.visible };
  doc.photo = Object.assign({ visible: vis.photo }, s.photo); doc.removed = s.removed;
  doc.lines = Object.assign({ visible: vis.lines }, s.lines); doc.text = Object.assign({ visible: vis.text }, s.text);
  doc.objects = s.objects || []; doc.order = s.order || ['text', 'lines', 'photo'];
  if (doc.text.locked && !lockSnap) doc.text.locked = false;
  Object.assign(doc.out, s.out);
  restoreImage(s.img);
  restoreMask(s.mask);
  ui.selObjs = ui.selObjs.filter((id) => findObj(id));
  objVer++; vecVer++; photoSrcCache = null; refreshMaster();
  rebuildBase();
  rebuildPhotoView(); buildAll(); compose();
  if (doc.text.applied) scheduleText(0); else { out = null; textCanvas = null; }
  lastDoc = d; restoring = false;
  updateUndoButtons(); autosave();
}
function undo() { clearTimeout(histTimer); commitHistory(); if (!hist.length) return; future.push(lastDoc); applyDoc(hist.pop()); }
function redo() { if (!future.length) return; hist.push(lastDoc); applyDoc(future.pop()); }
function updateUndoButtons() { $('undoBtn').disabled = !hist.length; $('redoBtn').disabled = !future.length; syncMenus(); }
$('undoBtn').onclick = undo; $('redoBtn').onclick = redo;

const SAVE_KEY = 'sungfluence-session-v3';
let saveTimer = null;
function projectData() {
  const o = Object.assign({}, doc.out); delete o.mock;
  const used = {}; doc.objects.forEach((q) => { if (q.asset && assets[q.asset]) used[q.asset] = assets[q.asset]; });
  return { app: 'sungfluence', v: 4, fileName: doc.fileName, image: doc.imageURL, blank: doc.blank, photo: doc.photo, removed: doc.removed, lines: doc.lines, text: Object.assign({}, doc.text, { locked: false }), out: o,
    objects: doc.objects, order: doc.order, assets: used,
    mask: hasRemoval ? rleEncode(alphaOf(remCanvas)) : null, maskW: master ? master.w : 0, maskH: master ? master.h : 0 };
}
function autosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(projectData())); } catch (e) { /* storage full or blocked */ } }, 900);
}

/* ---------------- loading ---------------- */
function loadImageURL(url, name) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 2000 / Math.max(im.naturalWidth, im.naturalHeight));
      let keepURL = url, work = im;
      const isPng = url.startsWith('data:image/png');
      if (k < 1 || !(url.startsWith('data:image/jpeg') || isPng)) {
        const c = mk(Math.round(im.naturalWidth * k), Math.round(im.naturalHeight * k));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        keepURL = isPng ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
        // work on the stored size, so lines and objects line up again when the project is reopened
        work = c;
      }
      doc.imageURL = keepURL; doc.fileName = name || 'image';
      origImg = work; iw = work.naturalWidth || work.width; ih = work.naturalHeight || work.height;
      photoSrcCache = null; doc.objects = []; ui.selObjs = [];
      storeImage();
      setupMasks();
      // transparent pixels in a PNG count as already removed
      const a = master.data.data; let any = false;
      const ra = new Uint8ClampedArray(master.w * master.h);
      for (let i = 0; i < ra.length; i++) if (a[i * 4 + 3] < 128) { ra[i] = 255; any = true; }
      if (any) { putAlpha(remCanvas, ra); hasRemoval = true; }
      rebuildBase();
      ui.suggestion = suggestFor(baseSrc);
      rebuildPhotoView();
      $('fileName').textContent = doc.fileName;
      res();
    };
    im.onerror = () => rej(new Error('That file could not be read as an image.'));
    im.src = url;
  });
}
function freshImage() {
  commitTextEdit();
  if (ui.tool === 'crop') { ui.cropDraft = null; ui.tool = 'hand'; buildRail(); }
  doc.text.applied = false; doc.text.locked = false; lockSnap = null; doc.lines.paths = []; doc.objects = []; out = null; textCanvas = null;
  doc.photo = Object.assign({}, LAYER_DEFAULTS, PHOTO_DEFAULTS); doc.blank = null;
  Object.assign(doc.lines, { visible: true, opacity: 1, blend: 'normal' }); Object.assign(doc.text, { visible: true, opacity: 1, blend: 'normal' });
  doc.order = ['text', 'lines', 'photo'];
  ui.selPath = null; ui.selObjs = []; ui.view = 'photo'; ui.zoom = 'fit'; ui.ctaDismissed = false;
  objVer++; vecVer++; photoSrcCache = null;
  rebuildBase(); rebuildPhotoView();
  snapshotMask(); buildAll(); setView('photo'); statusIdle(); queueHistory();
}
function loadFile(file, asPicture) {
  if (!file) return;
  if (/\.sungfluence$/i.test(file.name) || /zip/.test(file.type)) { openProjectZip(file); return; }
  if (/\.json$/i.test(file.name) || file.type === 'application/json') {
    file.text().then((t) => openProject(JSON.parse(t))).catch(() => toast('That project file could not be opened.'));
    return;
  }
  if (!file.type.startsWith('image/')) { toast('Choose an image file, such as JPG or PNG.'); return; }
  // a PNG or SVG exported with its style settings brings the look back onto the open photo
  if (!asPicture && origImg && /png|svg/.test(file.type)) {
    recipeInFile(file).then((r) => { if (!(r && applySavedRecipe(r, file.name, file))) loadFile(file, true); });
    return;
  }
  const fr = new FileReader();
  fr.onload = () => loadImageURL(fr.result, file.name).then(() => { doc.sample = null; buildSamples(); freshImage(); }).catch((e) => toast(e.message));
  fr.readAsDataURL(file);
}
function openProject(p) {
  if (!p || !['sungfluence', 'charcoal'].includes(p.app) || !p.image) { toast('That file is not a SungFluence project.'); return Promise.resolve(false); }
  return loadImageURL(p.image, p.fileName).then(() => {
    if (p.v >= 3) {
      doc.photo = migratePhoto(Object.assign({}, p.photo || {}));
      Object.assign(doc.removed, p.removed || {});
      doc.lines = Object.assign({}, LAYER_DEFAULTS, { paths: [], color: '#0a84ff', width: 0 }, p.lines || {});
      doc.text = Object.assign({}, LAYER_DEFAULTS, { applied: false, source: 'photo', layers: [], sel: 0 }, p.text || {}, { locked: false });
      Object.assign(doc.out, p.out || {});
      Object.assign(assets, p.assets || {});
      doc.objects = Array.isArray(p.objects) ? p.objects : [];
      doc.objects.forEach((q) => { q.id = uid++; });
      doc.order = Array.isArray(p.order) && p.order.length === 3 ? p.order : ['text', 'lines', 'photo'];
      doc.blank = p.blank || null;
      objVer++; vecVer++; photoSrcCache = null; refreshMaster();
    } else {
      // projects from version 2
      doc.photo = migratePhoto(Object.assign({}, p.photo || {}));
      Object.assign(doc.out, { paper: p.paper || '#ffffff', transparent: !!p.transparent, margin: p.margin || 0, colorModel: p.colorModel || 'rgb', width: p.width || 1600 });
      doc.text = { visible: true, applied: true, source: 'photo', layers: p.layers || [], sel: 0 };
    }
    const missing = [...new Set(doc.text.layers.filter((L) => !MODES[L.mode]).map((L) => String(L.mode).replace(/^plugin:/, '')))];
    if (missing.length) setTimeout(() => toast('This project used a plugin that is not loaded: ' + missing.join(', ') + '. Load it, then open the project again.'), 400);
    doc.text.layers = doc.text.layers.filter((L) => MODES[L.mode]).map((L) => newLayer(L.mode, Object.assign({}, L, { id: undefined })));
    if (!doc.text.layers.length) doc.text.layers = [newLayer('rows')];
    doc.text.sel = clamp(doc.text.sel || 0, 0, doc.text.layers.length - 1);
    doc.lines.paths.forEach((q) => { q.id = uid++; });
    if (p.mask && p.maskW === master.w && p.maskH === master.h) { putAlpha(remCanvas, rleDecode(p.mask, master.w * master.h)); hasRemoval = true; }
    doc.sample = null;
    rebuildBase(); rebuildPhotoView(); snapshotMask();
    buildSamples(); buildAll();
    if (p.v >= 4) compose(); else setView(doc.text.applied ? 'text' : 'photo');
    if (doc.text.applied) scheduleText(0);
    lastDoc = docOf(); statusIdle();
    return true;
  }).catch(() => { toast('The photo inside that project could not be read.'); return false; });
}
/* Small thumbnails, made once. Full-size samples as button backgrounds made the browser decode and scale them again and again. */
const thumbCache = {};
function sampleThumb(k) {
  if (!thumbCache[k]) thumbCache[k] = new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const c = mk(96, 96), x = c.getContext('2d'), s = Math.min(im.naturalWidth, im.naturalHeight);
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, 96, 96);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    im.onerror = () => res(SAMPLES[k]);
    im.src = SAMPLES[k];
  });
  return thumbCache[k];
}
function useSample(k) { return loadImageURL(SAMPLES[k], k + '.jpg').then(() => { doc.sample = k; buildSamples(); freshImage(); }); }
function newSquare() { createArtboard(Object.assign({ dpi: 300, cell: 24, bg: '#ffffff' }, ARTBOARDS[0])); }
function buildSamples() {
  const box = $('samples'); box.replaceChildren();
  const blank = el('button', 'thumb-new', '+'); blank.type = 'button';
  blank.setAttribute('aria-label', 'Blank square artboard, 2000 by 2000 pixels'); blank.title = 'Blank square artboard (2000 × 2000 px). Shift-click for more sizes.';
  blank.setAttribute('aria-pressed', String(!!doc.blank));
  blank.onclick = (e) => { if (e.shiftKey) openNewArtboard(); else newSquare(); };
  box.appendChild(blank);
  Object.keys(SAMPLES).forEach((k) => {
    const b = el('button', 'thumb'); b.type = 'button';
    sampleThumb(k).then((u) => { b.style.backgroundImage = 'url(' + u + ')'; });
    b.setAttribute('aria-label', 'Use sample image ' + k); b.title = 'Sample: ' + k;
    b.setAttribute('aria-pressed', String(doc.sample === k));
    b.onclick = () => useSample(k);
    box.appendChild(b);
  });
}
$('fileInput').onchange = (e) => { loadFile(e.target.files[0]); e.target.value = ''; };
['dragenter', 'dragover'].forEach((t) => wrap.addEventListener(t, (e) => { e.preventDefault(); $('dropHint').hidden = false; }));
['dragleave', 'drop'].forEach((t) => wrap.addEventListener(t, (e) => { e.preventDefault(); if (t === 'dragleave' && wrap.contains(e.relatedTarget)) return; $('dropHint').hidden = true; }));
wrap.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) loadFile(f); });
document.addEventListener('paste', (e) => {
  if (/INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
  const items = e.clipboardData ? Array.from(e.clipboardData.items) : [];
  const it = items.find((i) => i.type.startsWith('image/'));
  const vectorish = ui.tab === 'lines' || ['select', 'shape', 'text'].includes(ui.tool);
  if (it) { e.preventDefault(); if (vectorish && origImg) placeImageFile(it.getAsFile()); else loadFile(it.getAsFile()); return; }
  if (objClipboard && objClipboard.length && origImg) { e.preventDefault(); pasteObjects(); }
});
/* In the desktop app on a Mac, Cmd C goes through the menu, so shapes are also copied on the copy event */
document.addEventListener('copy', (e) => {
  if (/INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName) || !ui.selObjs.length) return;
  e.preventDefault(); copyObjects();
});
let objClipboard = null;
function copyObjects() {
  if (!ui.selObjs.length) return false;
  objClipboard = clone(selectedObjs());
  toast('Copied ' + objClipboard.length + ' object' + (objClipboard.length === 1 ? '' : 's'));
  return true;
}
function pasteObjects() {
  if (!objClipboard || !objClipboard.length || !origImg) return false;
  const off = Math.max(10, Math.round(iw / 60));
  const copies = objClipboard.map((o) => cloneObj(o, off, off));
  objClipboard = copies.map((o) => clone(o));
  doc.objects.push(...copies); ui.selObjs = copies.map((o) => o.id);
  if (ui.tool !== 'select') setTool('select');
  objChanged({ final: true, list: copies });
  return true;
}
function saveProject() { saveProjectFile(); }
function duplicateSelection() { if (ui.selObjs.length) duplicateObjects(); else duplicateLayer(doc.text.sel); }
function deselectAll() { selClear(); if (ui.selObjs.length) { ui.selObjs = []; drawOverlay(); buildOptbar(); } }
function selectAllObjects() {
  const all = doc.objects.filter((o) => !o.hidden && layerOf(o.layer).visible).map((o) => o.id);
  if (!all.length) return;
  if (ui.tool !== 'select') setTool('select');
  ui.selObjs = all; ui.selPath = null; drawOverlay(); buildOptbar(); if (['photo', 'lines'].includes(ui.tab)) buildPanel();
}
function showView(v) { if (v !== 'photo' && !doc.text.applied) applyTextArt(); else setView(v); }

/* ---------------- compare with the original ---------------- */
function showOriginal(on) {
  if (!origImg) return;
  if (!on) { compose(); return; }
  const g = artGeom(), cr = cropRect();
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(origImg, cr.x * iw, cr.y * ih, cr.w * iw, cr.h * ih, g.m, g.m, g.W, g.H);
}
const cmp = $('compareBtn');
cmp.addEventListener('pointerdown', () => showOriginal(true));
['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => cmp.addEventListener(t, () => showOriginal(false)));

/* ---------------- export ---------------- */
async function saveFile(filename, data) {
  const dl = await dlP;
  if (dl) {
    try { await dl.save({ filename, data }); return true; }
    catch (e) {
      if (e && e.code === 'declined') return false;
      if (e && e.code === 'rate_limited') { toast('A save is already waiting for your answer.'); return false; }
      toast('This view cannot save files. Try opening the artifact in its own tab.');
      return false;
    }
  }
  const blob = data instanceof Blob ? data : new Blob([data]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
function baseName() { return (doc.fileName || 'sungfluence').replace(/\.[a-z0-9]+$/i, '') + '-sungfluence' + (doc.out.colorModel !== 'rgb' ? '-' + doc.out.colorModel : ''); }
const printTag = () => doc.out.print.replace(/\W+/g, '');
function printScaleFor(o) { const g = printGeom(); return Math.min(g.needPx / o.W, 9000 / Math.max(o.W, o.H)); }
/* the full-size render, sliced like every other job */
function* fullGen(scaleOf, drawOpts) {
  yield { stage: 'Preparing the full-size photo', p: 0.01 };
  const L = doc.text.locked && lockSnap;
  const fsrc = L ? srcFrom(lockSnap.img, 1600, lockSnap.crop, lockSnap.photo, lockSnap.rem) : srcFrom(photoSrc(), 1600, cropRect(), doc.photo, hasRemoval ? remCanvas : null);
  const o = yield* remap(C.renderGen(fsrc, sceneFor(activeLayers(), 1)), 0.03, scaleOf ? 0.7 : 0.98, null);
  if (!scaleOf) return { out: o };
  const s = scaleOf(o);
  const c = mk(Math.round(o.W * s), Math.round(o.H * s));
  yield* remap(C.drawGen(c.getContext('2d'), o, s, drawOpts), 0.7, 0.99, 'Drawing at full size');
  return { out: o, canvas: c };
}
function runExport(scaleOf, fn) {
  if (!doc.text.applied) { toast('Apply text art first, or export the photo itself.'); return; }
  runJob('export', fullGen(scaleOf), async (res) => { try { await fn(res); } catch (e) { toast('Export failed. ' + (e && e.message ? e.message : '')); } });
}
/* the layers at full artboard size. only: which layers, or null for the ones that are shown */
function* fullLayersGen(only) {
  const g = artGeom(1), S = {};
  const want = (id) => (only ? only.includes(id) : layerOf(id).visible);
  yield { stage: 'Preparing the photo', p: 0.02 };
  if (want('photo')) {
    S.photo = photoLayerCanvas(Math.max(g.W, g.H), cropRect(), doc.photo, g.W, g.H).photo;
    if (hasRemoval) { const x = S.photo.getContext('2d'), cr = cropRect(); x.globalCompositeOperation = 'destination-out'; x.drawImage(remCanvas, cr.x * remCanvas.width, cr.y * remCanvas.height, cr.w * remCanvas.width, cr.h * remCanvas.height, 0, 0, g.W, g.H); }
  }
  if (want('lines')) S.vector = vectorCanvas(g, 1);
  let o = null;
  if (want('text') && doc.text.applied && activeLayers().length) {
    const r = yield* remap(fullGen(() => 1, { noPaper: true }), 0.05, 0.97, null);
    S.text = r.canvas; o = r.out;
  }
  return { g, S, out: o };
}
function runLayersExport(only, fn) {
  if (!origImg) return;
  runJob('export', fullLayersGen(only), async (res) => { try { await fn(res); } catch (e) { console.error(e); toast('Export failed. ' + (e && e.message ? e.message : '')); } });
}
function flatPNG(only, suffix, opt) {
  runLayersExport(only, async ({ g, S }) => {
    const c = mk(g.TW, g.TH);
    composeTo(c.getContext('2d'), g, S, Object.assign({ only, mixFade: !only && ui.view === 'mix', ground: doc.out.transparent ? null : 'paper' }, opt || {}));
    if (opt && opt.jpg) {
      // JPG has no transparency: put the paper color under everything
      const j = mk(c.width, c.height), jx = j.getContext('2d'); jx.fillStyle = doc.out.paper; jx.fillRect(0, 0, j.width, j.height); jx.drawImage(c, 0, 0);
      await saveFile(baseName() + suffix + '.jpg', await toBlob(j, 'image/jpeg', opt.jpg)); return;
    }
    const png = await toBlob(c, 'image/png');
    await saveFile(baseName() + suffix + '.png', opt && opt.recipe ? await pngWithRecipe(png, recipeData()) : png);
  });
}
function vectorSVG() {
  const g = artGeom(1);
  const body = objectsSVGGroup(g, 'lines');
  const needFonts = doc.objects.some((q) => q.type === 'text');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + g.TW + '" height="' + g.TH + '" viewBox="0 0 ' + g.TW + ' ' + g.TH + '">\n' + (needFonts ? '<style>' + FONT_IMPORT + '</style>\n' : '') + body + '\n</svg>\n';
}
/* everything as one SVG: the photo as an embedded picture, vector shapes, and text art as live letters, in the layer order */
function fullSVG(only, recipe) {
  runLayersExport(only && only.length ? only : null, async ({ g, S, out: o }) => {
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + g.TW + '" height="' + g.TH + '" viewBox="0 0 ' + g.TW + ' ' + g.TH + '">', '<style>' + FONT_IMPORT + '</style>'];
    if (!doc.out.transparent) parts.push('<rect width="100%" height="100%" fill="' + doc.out.paper + '"/>');
    const attrs = (L, extra) => ' opacity="' + nf((L.opacity ?? 1) * (extra || 1)) + '"' + (L.blend && L.blend !== 'normal' ? ' style="mix-blend-mode:' + L.blend + '"' : '');
    for (let i = doc.order.length - 1; i >= 0; i--) {
      const id = doc.order[i], L = layerOf(id);
      if (only && only.length ? !only.includes(id) : !L.visible) continue;
      if (id === 'photo' && S.photo) {
        const fade = ui.view === 'mix' && doc.order.indexOf('text') < doc.order.indexOf('photo') && S.text ? doc.out.mixPhoto : 1;
        parts.push('<g id="photo"' + attrs(L, fade) + '><image x="' + g.m + '" y="' + g.m + '" width="' + g.W + '" height="' + g.H + '" preserveAspectRatio="none" href="' + S.photo.toDataURL('image/png') + '"/></g>');
      } else if (id === 'lines') {
        const v = objectsSVGGroup(g, 'lines'); if (v) parts.push('<g id="vector"' + attrs(L) + '>' + v + '</g>');
      } else if (id === 'text' && o) {
        const t = C.toSVG(Object.assign({}, o, { transparent: true }), null).split('\n');
        parts.push('<g id="text-art"' + attrs(L) + '>' + t.slice(1, -1).join('\n') + '</g>');
      }
    }
    parts.push('</svg>');
    const svg = parts.join('\n');
    await saveFile(baseName() + '-layers.svg', recipe ? svgWithRecipe(svg, recipeData()) : svg);
  });
}
const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&amp;family=JetBrains+Mono:wght@400;700&amp;family=Playfair+Display:wght@400..900&amp;family=Oswald:wght@200..700&amp;family=Noto+Naskh+Arabic:wght@400..700&amp;family=Special+Elite&amp;display=swap');";
function loadScript(u) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = () => rej(new Error('A helper library could not load.')); document.head.appendChild(s); }); }
const VENDOR = Object.assign({ jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' }, window.SUNGFLUENCE_VENDOR || {});
async function jsPDFReady() { if (!window.jspdf) await loadScript(VENDOR.jspdf); return window.jspdf.jsPDF; }
async function zipReady() { if (!window.JSZip) await loadScript(VENDOR.jszip); return window.JSZip; }

async function cmykPDF(o) {
  const jsPDF = await jsPDFReady();
  const g = printGeom(), k = g.aw / o.W;
  const pdf = new jsPDF({ orientation: g.land ? 'landscape' : 'portrait', unit: 'mm', format: [g.pw, g.ph].sort((a, b) => a - b), compress: true });
  const cm = (c) => { const p = C.parseColor(c); return C.rgbToCmyk(p[0], p[1], p[2]).map((v) => +v.toFixed(4)).concat([p[3]]); };
  const gst = new Map();
  const alpha = (a) => { const q = Math.round(Math.min(1, a) * 20) / 20; if (!gst.has(q)) gst.set(q, new pdf.GState({ opacity: q, 'stroke-opacity': q })); pdf.setGState(gst.get(q)); };
  if (!o.transparent) { const p = cm(o.paperOriginal || o.paper); pdf.setFillColor(p[0], p[1], p[2], p[3]); pdf.rect(0, 0, g.pw, g.ph, 'F'); }
  const pdfFont = (f) => (f === 'mono' || f === 'typewriter') ? 'courier' : f === 'serif' ? 'times' : 'helvetica';
  const latin = /^[\x20-\x7E -ÿ]+$/;
  let skipped = 0;
  const X = (px) => g.x + px * k, Y = (py) => g.y + py * k;
  const text = (s, it, x, y, outline) => {
    pdf.setFont(pdfFont(it.font), (it.weight >= 600 ? 'bold' : '') + (it.italic ? 'italic' : '') || 'normal');
    pdf.setFontSize(Math.max(0.5, it.size * k / 0.3528));
    const rot = it.rot || 0; let x0 = X(x), y0 = Y(y);
    if (it.align === 'center') { const w = pdf.getTextWidth(s); x0 -= Math.cos(rot) * w / 2; y0 -= Math.sin(rot) * w / 2; }
    const opt = { baseline: 'middle' }; if (rot) opt.angle = -rot * 180 / Math.PI; if (outline) opt.renderingMode = 'stroke';
    pdf.text(s, x0, y0, opt);
  };
  const glyph = (ch, x, y, it, fillC, outline, colW) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x2800 && code <= 0x28FF) {
      const bits = code - 0x2800, cw = (colW || it.size * 0.6) * k, h4 = it.size * k;
      for (const [dx, dy, b] of [[0, 0, 1], [0, 1, 2], [0, 2, 4], [1, 0, 8], [1, 1, 16], [1, 2, 32], [0, 3, 64], [1, 3, 128]]) if (bits & b) pdf.circle(X(x) + (dx + 0.5) * cw / 2, Y(y) - h4 / 2 + (dy + 0.5) * h4 / 4, cw * 0.17, 'F');
      return;
    }
    if ('▀█░▒▓'.includes(ch)) {
      const cw = (colW || it.size * 0.6) * k, h = it.size * k;
      if (ch !== '█' && ch !== '▀') alpha(fillC[4] * ({ '░': 0.25, '▒': 0.5, '▓': 0.75 })[ch]);
      pdf.rect(X(x), Y(y) - h / 2, cw, ch === '▀' ? h / 2 : h, 'F'); return;
    }
    if (!latin.test(ch)) { skipped++; return; }
    text(ch, it, x, y, outline);
  };
  const srcFill = (it) => (o.colorModel === 'cmyk' && it.fillOriginal) ? it.fillOriginal : it.fill;
  for (const L of o.layers) {
    const passes = (L.effect === 'shadow' || L.effect === 'riso') ? ['under', 'main'] : ['main'];
    for (const pass of passes) for (const it of L.items) {
      if (pass === 'under' && it.t === 'rect') continue;
      const fc = cm(pass === 'under' ? L.effectColor : srcFill(it));
      pdf.setFillColor(fc[0], fc[1], fc[2], fc[3]); pdf.setTextColor(fc[0], fc[1], fc[2], fc[3]); pdf.setDrawColor(fc[0], fc[1], fc[2], fc[3]);
      alpha(L.opacity * fc[4] * (it.a ?? 1));
      const off = pass === 'under' ? (L.effect === 'riso' ? 0.12 : 0.08) * it.size : 0;
      if (it.t === 'rect') { pdf.rect(X(it.x), Y(it.y), it.w * k, it.h * k, 'F'); continue; }
      const outline = pass === 'main' && L.effect === 'outline';
      if (outline) pdf.setLineWidth(Math.max(0.05, it.size * 0.045 * k));
      if (it.mono) { Array.from(it.s).forEach((ch, i) => { if (ch !== ' ' && ch !== '⠀') glyph(ch, it.x + i * it.mono + off, it.y + off, it, fc, outline, it.mono); }); continue; }
      if (it.s.length > 1) { if (latin.test(it.s)) text(it.s, it, it.x + off, it.y + off, outline); else skipped++; }
      else glyph(it.s, it.x + off, it.y + off, it, fc, outline);
    }
  }
  alpha(1);
  await saveFile(baseName() + '-' + printTag() + '-cmyk.pdf', pdf.output('blob'));
  if (skipped) toast(skipped.toLocaleString() + ' non-Latin letters are not in the CMYK PDF. Use the SVG or the raster PDF for those.');
}
async function separations(c) {
  const JSZip = await zipReady();
  const w = c.width, h = c.height;
  const d = c.getContext('2d').getImageData(0, 0, w, h).data;
  const zip = new JSZip();
  const plate = mk(w, h), px = plate.getContext('2d'), img = px.createImageData(w, h), o = img.data;
  const names = ['cyan', 'magenta', 'yellow', 'black'];
  for (let ch = 0; ch < 4; ch++) {
    for (let i = 0; i < w * h; i++) {
      const r = d[i * 4] / 255, gg = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255, kk = 1 - Math.max(r, gg, b);
      const v = (ch === 3 ? kk : (kk >= 0.999 ? 0 : (1 - [r, gg, b][ch] - kk) / (1 - kk))) * (d[i * 4 + 3] / 255);
      o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = Math.round(255 * (1 - v)); o[i * 4 + 3] = 255;
    }
    px.putImageData(img, 0, 0);
    zip.file((ch + 1) + '-' + names[ch] + '.png', await toBlob(plate, 'image/png'));
  }
  zip.file('read-me.txt', 'SungFluence CMYK plates\n\nEach PNG is one ink. Black means full ink, white means none.\nSize: ' + w + ' x ' + h + ' px.\nThe split uses a simple RGB to CMYK formula, not an ICC profile.\n');
  await saveFile(baseName() + '-plates.zip', await zip.generateAsync({ type: 'blob' }));
}
async function photoCutout() {
  const cr = cropRect();
  const k = Math.min(1, 4000 / Math.max(cr.w * iw, cr.h * ih));
  const W = Math.round(cr.w * iw * k), H = Math.round(cr.h * ih * k);
  const c = photoLayerCanvas(Math.max(W, H), cr, doc.photo, W, H).photo, x = c.getContext('2d');
  if (hasRemoval) { x.globalCompositeOperation = 'destination-out'; x.drawImage(remCanvas, cr.x * remCanvas.width, cr.y * remCanvas.height, cr.w * remCanvas.width, cr.h * remCanvas.height, 0, 0, c.width, c.height); }
  await saveFile((doc.fileName || 'photo').replace(/\.[a-z0-9]+$/i, '') + '-cutout.png', await toBlob(c, 'image/png'));
}
/* the formats live in 06-export.js; the Export button opens the Export window */
function closeMenu() { $('exportMenu').hidden = true; $('exportBtn').setAttribute('aria-expanded', 'false'); }
$('exportBtn').onclick = (e) => { e.stopPropagation(); openExport(); };
document.addEventListener('click', (e) => {
  if (!$('exportMenu').hidden && !$('exportMenu').contains(e.target)) closeMenu();
  if (!$('help').hidden && !$('help').contains(e.target) && e.target !== $('helpBtn')) toggleHelp(false);
});

/* ---------------- optional AI helpers (only inside claude.ai, through window.claude) ---------------- */
let aiReady = false;
async function photoBlob() {
  const cr = cropRect(), w0 = iw * cr.w, h0 = ih * cr.h, k = Math.min(1, 900 / Math.max(w0, h0));
  const c = mk(Math.round(w0 * k), Math.round(h0 * k));
  c.getContext('2d').drawImage(origImg, cr.x * iw, cr.y * ih, w0, h0, 0, 0, c.width, c.height);
  return toBlob(c, 'image/jpeg', 0.85);
}
async function imageOpts(sample) {
  const lim = await sample.limits().catch(() => null);
  if (lim && lim.images && origImg) return { images: await photoBlob(), has: true };
  return { has: false };
}
function aiError(e) {
  const code = e && e.code;
  if (code === 'cancelled') return;
  if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { aiReady = false; $('aiForm').hidden = true; buildPanel(); toast('The AI helper is not available on this page.'); return; }
  if (code === 'rate_limited') { toast('The AI helper is busy. Try again in a minute.'); return; }
  if (code === 'invalid_json') { toast('The AI helper answered in an unexpected format. Try once more.'); return; }
  if (code === 'refused') { toast('The AI helper declined that request. Try describing the look differently.'); return; }
  toast('The AI helper could not answer just now. Try again.');
}
function allControls(mode) { return MODES[mode].controls.concat(MODES[mode].more, COMMON_MORE, FOCUS_CTL, EFFECT_CTL); }
function specFor(mode) {
  return allControls(mode).filter((c) => !['palette', 'printon'].includes(c.type)).map((c) => {
    if (c.type === 'range') return c.key + ' (' + c.min + '..' + c.max + ')';
    if (c.type === 'toggle') return c.key + ' (true/false)';
    if (c.type === 'seg' || c.type === 'select') return c.key + ' (' + c.options.map((o) => o[0]).join('|') + ')';
    if (c.type === 'colormode') return 'color (' + c.options.join('|') + ')';
    if (c.type === 'ramp') return 'rampName (' + Object.keys(RAMPS).join('|') + ')';
    if (c.type === 'ink') return c.key + ' (#hex)';
    return c.key + ' (string)';
  }).join(', ') + ', inkColor (#hex), inkColor2 (#hex)';
}
function cleanLayer(raw) {
  if (!raw || !MODES[raw.mode]) return null;
  const o = {};
  allControls(raw.mode).forEach((c) => {
    const v = raw[c.key];
    if (v === undefined || v === null) return;
    if (c.type === 'range' && isFinite(+v)) o[c.key] = Math.min(c.max, Math.max(c.min, +v));
    else if (c.type === 'toggle') o[c.key] = !!v;
    else if ((c.type === 'seg' || c.type === 'select') && c.options.some((x) => x[0] === v)) o[c.key] = v;
    else if (c.type === 'colormode' && c.options.includes(v)) o.color = v;
    else if (c.type === 'ramp' && RAMPS[v]) o.rampName = v;
    else if ((c.type === 'text' || c.type === 'textarea') && typeof v === 'string' && v.trim()) o[c.key] = v.slice(0, 3000);
  });
  ['inkColor', 'inkColor2', 'effectColor'].forEach((k) => { if (typeof raw[k] === 'string' && /^#[0-9a-f]{6}$/i.test(raw[k])) o[k] = raw[k]; });
  return newLayer(raw.mode, o);
}
async function direct(request) {
  const sample = await sampleP;
  if (!sample || !request.trim() || !src) return;
  const btn = $('aiBtn'); btn.disabled = true;
  $('status').textContent = 'Designing the look';
  try {
    const im = await imageOpts(sample);
    const modes = Object.keys(MODES).filter((m) => !MODES[m].plugin).map((m) => '- ' + m + ' (' + MODES[m].name + (m === 'paths' ? ', text along traced or drawn lines' : '') + '): ' + specFor(m)).join('\n');
    const prompt = [
      'You are the art director inside SungFluence, an app that turns an image into typographic art made only of letters and characters.',
      im.has ? 'The attached image is the one being converted.' : 'You cannot see the image; its file is called "' + doc.fileName + '".',
      'The person asked for: "' + request.slice(0, 600) + '"',
      'Design it as 1 to 3 stacked layers, first layer at the bottom. A layer with mode "paths" writes text along lines; set "trace" to dark, light or edges to create those lines from the image (dark follows black strokes, light follows white strokes, edges finds outlines). Other modes place letters by the image tones.',
      'Available layer modes and their options:\n' + modes,
      'Page options: paper (#hex), transparent (true for T-shirts, stickers and overlays), colorModel (rgb|cmyk|ansi|gray|bw), margin (0..0.2). Photo options: gray, invert (true/false), contrast (0.4..2.5), brightness (-0.4..0.4).',
      'Text options must hold real words that suit the image and the request, in the language the person used. For words, give 8 to 16 lines separated by \\n.',
      'Reply with only JSON: {"paper":"#rrggbb","transparent":false,"colorModel":"rgb","trace":null,"photo":{},"layers":[{"mode":"flow","text":"..."}],"note":"one short sentence"}'
    ].join('\n\n');
    const res = await sample.json(prompt, im.has ? { images: im.images } : {});
    const layers = (res && Array.isArray(res.layers) ? res.layers : []).slice(0, 3).map(cleanLayer).filter(Boolean);
    if (!layers.length) { toast('The AI helper answered without usable layers. Try once more.'); statusIdle(); return; }
    if (res.paper && /^#[0-9a-f]{6}$/i.test(res.paper)) doc.out.paper = res.paper;
    if (typeof res.transparent === 'boolean') doc.out.transparent = res.transparent;
    if (MODELS.some((m) => m[0] === res.colorModel)) doc.out.colorModel = res.colorModel;
    if (isFinite(+res.margin)) doc.out.margin = clamp(+res.margin, 0, 0.2);
    if (res.photo && typeof res.photo === 'object') {
      const p = res.photo;
      ['gray', 'invert'].forEach((k) => { if (typeof p[k] === 'boolean') doc.photo[k] = p[k]; });
      if (isFinite(+p.contrast)) doc.photo.contrast = clamp(+p.contrast, 0.4, 2.5);
      if (isFinite(+p.brightness)) doc.photo.brightness = clamp(+p.brightness, -0.4, 0.4);
      rebuildSrc(); rebuildPhotoView();
    }
    const hasPaths = layers.some((L) => L.mode === 'paths'), hasPhoto = layers.some((L) => L.mode !== 'paths');
    const finish = () => {
      doc.text.layers = layers; doc.text.source = hasPaths && hasPhoto ? 'both' : hasPaths ? 'lines' : 'photo';
      doc.text.sel = layers.length - 1; doc.text.applied = true;
      buildAll(); setView('text'); scheduleText(0); queueHistory(); thumbsSoon();
      toast(typeof res.note === 'string' && res.note ? res.note.slice(0, 140) : 'New look applied', { label: 'Undo', fn: undo });
    };
    if (hasPaths && ['dark', 'light', 'edges'].includes(res.trace)) { ui.trace.kind = res.trace; traceNow(finish); }
    else if (hasPaths && !doc.lines.paths.length) { ui.trace.kind = (ui.suggestion && ui.suggestion.trace) || 'dark'; traceNow(finish); }
    else finish();
  } catch (e) { aiError(e); statusIdle(); }
  finally { btn.disabled = false; }
}
async function suggestText(L, key, btn) {
  const sample = await sampleP;
  if (!sample) return;
  btn.disabled = true; btn.textContent = 'Thinking';
  try {
    const im = await imageOpts(sample);
    const hint = (L[key] || '').slice(0, 300), about = im.has ? 'the attached image' : 'an image called "' + doc.fileName + '"';
    const prompt = key === 'words'
      ? 'Write words for a word-mosaic artwork made from ' + about + '. The current words, which may also be a theme hint, are: "' + hint + '". Match their language. Reply with only a JSON array of 14 short words or two-word phrases, most important first.'
      : 'Write the text that will be repeated to draw ' + about + ' in letters. The current text, which may also be a theme hint, is: "' + hint + '". Match its language. Write one or two sentences, about 30 words, with no quotation marks. Reply with only JSON: {"text": "..."}';
    const res = await sample.json(prompt, Object.assign({ cache: false }, im.has ? { images: im.images } : {}));
    let val = null;
    if (key === 'words' && Array.isArray(res)) val = res.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 24).join('\n');
    if (key !== 'words' && res && typeof res.text === 'string') val = res.text.trim();
    if (!val) { toast('The AI helper answered in an unexpected format. Try once more.'); return; }
    L[key] = val; buildPanel(); queueHistory();
    if (doc.lines.paths.includes(L)) linesChanged(); else scheduleText(0);
    toast('New text from the AI helper', { label: 'Undo', fn: undo });
  } catch (e) { aiError(e); }
  finally { btn.disabled = false; btn.textContent = 'Suggest'; }
}
$('aiForm').addEventListener('submit', (e) => { e.preventDefault(); direct($('aiInput').value); });
sampleP.then((s) => { if (s) { aiReady = true; $('aiForm').hidden = false; buildPanel(); } });

/* ---------------- keyboard ---------------- */
const SHORTCUTS = [
  ['1 / 2 / 3', 'Photo, Mix and Text views'], ['H', 'Move around'], ['Z', 'Zoom tool'], ['C', 'Crop'], ['W', 'Magic wand'], ['L', 'Lasso'], ['B', 'Selection brush'], ['Y', 'Liquify, Alt restores'],
  ['V', 'Select objects'], ['U', 'Shapes'], ['T', 'Text'], ['P', 'Pen'], ['N', 'Pencil'], ['A', 'Edit points of lines'],
  ['Shift / Alt', 'Add to or subtract from a selection'], ['Alt drag', 'Copy objects while moving'], ['Arrows', 'Nudge objects, Shift for 10 px'], ['Space', 'Hold to move with any tool'],
  ['Enter', 'Finish a pen line, apply a crop'], ['Delete', 'Delete the selected object, line or point'],
  ['Alt while dragging', 'Move freely, without snapping'], ['Shift while drawing', 'Straight lines in 15° steps'],
  [MOD + ' K', 'Find any command'], [MOD + ' O', 'Open an image or a project'], [MOD + ' A', 'Select all shapes'], [MOD + ' ;', 'Snapping on or off'], [MOD + " '", 'Show the grid'],
  [MOD + ' C / V', 'Copy and paste objects'], [MOD + ' D', 'Deselect'], [MOD + ' J', 'Duplicate objects or text layer'], [MOD + ' Z', 'Undo'], ['Shift ' + MOD + ' Z', 'Redo'], [MOD + ' S', 'Save project'], [MOD + ' E', 'Export window'],
  [MOD + ' + / − / 0', 'Zoom in, out, fit'], [MOD + ' 1 / 2', 'Actual size, zoom to selection'], [MOD + ' scroll or pinch', 'Smooth zoom'], ['Shift N', 'New artboard'],
  ['/', 'Compare with a divider'], ['Hold \\', 'Show the original photo'], ['F1', 'Help and tutorial'], ['Esc', 'Cancel, close menus']
];
function toggleHelp(force) {
  const h = $('help');
  const show = force === undefined ? h.hidden : force;
  if (show) {
    h.replaceChildren(el('span', 'sec-t', 'Keyboard shortcuts'));
    SHORTCUTS.forEach(([k, t]) => { const d = el('div'); d.append(el('span', null, t), el('kbd', null, k)); h.appendChild(d); });
    const ab = el('div', 'help-foot');
    ab.append(optBtn('Help and tutorial (F1)', () => { toggleHelp(false); openHelp(); }, true), optBtn('Settings…', () => { toggleHelp(false); openSettings(); }), optBtn('About and license', () => { toggleHelp(false); openAbout(); }));
    h.appendChild(ab);
    const r = $('helpBtn').getBoundingClientRect(); h.style.top = (r.bottom + 6 + window.scrollY) + 'px';
  }
  h.hidden = !show; $('helpBtn').setAttribute('aria-expanded', String(show));
}
$('helpBtn').onclick = (e) => { e.stopPropagation(); toggleHelp(); };
document.addEventListener('keydown', (e) => {
  const ae = document.activeElement;
  const typing = ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.type !== 'range' && ae.type !== 'checkbox';
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === 'Escape') {
    closeMenu(); closeMenus(); toggleHelp(false); toggleZoomMenu(false);
    if (!$('dlgScrim').hidden) { closeDialog(); return; }
    if (!$('libScrim').hidden) closeLibrary();
    if (pen) { pen = null; ui.snapHint = null; drawOverlay(); }
    if (ui.tool === 'crop') setTool('hand');
    else if (ui.selObjs.length && !typing) { ui.selObjs = []; drawOverlay(); buildOptbar(); if (['photo', 'lines'].includes(ui.tab)) buildPanel(); }
    return;
  }
  if (!$('libScrim').hidden || !$('dlgScrim').hidden) { if (e.key === 'F1') { e.preventDefault(); openHelp(); } return; }
  // every other shortcut belongs to a command (05c-commands.js)
  if (runShortcut(e, typing)) { toggleHelp(false); return; }
  if (typing || mod) return;
  if (e.key === ' ' && !spaceDown) { spaceDown = true; wrapClass(); e.preventDefault(); return; }
  if (e.key === '\\' && !e.repeat) { showOriginal(true); return; }
  if (e.key === 'Enter' && ui.tool === 'pen') { finishPen(); return; }
  if (e.key === 'Enter' && ui.tool === 'crop') { cropApply(); return; }
  if (e.key === 'Enter' && ui.tool === 'select' && ui.selObjs.length === 1 && selectedObjs()[0].type === 'text') { e.preventDefault(); editText(selectedObjs()[0]); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && (ui.selObjs.length || ['direct', 'pen', 'pencil', 'select'].includes(ui.tool))) { if (deleteSelection()) e.preventDefault(); return; }
  if (e.key.startsWith('Arrow') && ui.selObjs.length) {
    const st = (e.shiftKey ? 10 : 1) / imgScale(artGeom()) * (canvas.width / (parseFloat(canvas.style.width) || canvas.width));
    if (nudgeObjects(e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0)) e.preventDefault();
    return;
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key === ' ') { spaceDown = false; wrapClass(); }
  if (e.key === '\\') showOriginal(false);
});

/* ---------------- boot ---------------- */
function setQuality(v) { if (ui.quality === v) return; ui.quality = v; buildQuality(); rebuildPhotoView(); compose(); if (doc.text.applied) scheduleText(0); statusIdle(); syncMenus(); }
function buildQuality() {
  const s = $('qualitySeg'); s.replaceChildren();
  QUALITY.forEach(([v, t]) => {
    const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(ui.quality === v));
    b.title = v === 'full' ? 'Work at full size' : 'Work on a smaller copy for speed; exports stay full size';
    b.onclick = () => setQuality(v);
    s.appendChild(b);
  });
}
function buildAll() { buildStack(); buildTabs(); buildPanel(); buildOptbar(); }
buildRail(); buildQuality(); buildOptbar(); buildTabs(); buildMenubar(); syncMenus();
$('newBtn').onclick = openNewArtboard;
let restored = null;
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) restored = JSON.parse(raw); } catch (e) { restored = null; }
function startFresh() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  doc.text.layers = [newLayer('rows', { text: 'whiskers sunbeam purr nap tabby paws meow' })]; doc.text.sel = 0;
  Object.assign(doc.out, { paper: '#111113', transparent: false, margin: 0, colorModel: 'rgb', width: 1600, mock: 'artboard' });
  loadImageURL(SAMPLES.cat, 'cat.jpg').then(() => { doc.sample = 'cat'; buildSamples(); freshImage(); hist.length = 0; future.length = 0; lastDoc = docOf(); updateUndoButtons(); });
}
const boot = pluginsReady.then(() => ((restored && ['sungfluence', 'charcoal'].includes(restored.app) && restored.image)
  ? openProject(restored).then((ok) => { if (ok) toast('Restored your last session', { label: 'Start fresh', fn: startFresh }); else startFresh(); })
  : loadImageURL(SAMPLES.cat, 'cat.jpg').then(() => { buildSamples(); freshImage(); lastDoc = docOf(); welcomeOnce(); })));
Promise.resolve(boot).then(() => {
  buildSamples(); statusIdle();
  const faces = ['400 20px Inter', '900 20px Inter', '200 20px Inter', '400 20px "JetBrains Mono"', '700 20px "Playfair Display"', '600 20px Oswald', '700 20px Oswald', '400 20px "Special Elite"'];
  Promise.race([Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)).concat(['400 20px "Noto Naskh Arabic"', '700 20px "Noto Naskh Arabic"', '400 20px "Noto Nastaliq Urdu"', '700 20px "Noto Nastaliq Urdu"'].map((f) => document.fonts.load(f, 'خودی کو').catch(() => null)))), new Promise((r) => setTimeout(r, 5000))]).then(() => { C.resetCaches(); if (doc.text.applied) scheduleText(0); thumbsSoon(); });
});
window.__sungfluence = { doc, ui, prefs, setZoom, zoomTo, displayZoom, toggleSplit, createArtboard, cropApply, setCropRatio, rotateImage, flipImage, newObject, addObject, quickAdd, stepRepeat, selectedObjs, lockText, moveLayerTo, compose, flatPNG, vectorSVG, objectsSVGGroup, get canvas() { return canvas; }, get imgSize() { return [iw, ih]; }, jobs, sceneFor, activeLayers, previewScale, get src() { return src; }, loadPluginText, usePluginStyle, runPluginCode, applyTextArt, traceNow, setTool, setView, undo, redo, selectBackground, removeBackground, openLibrary, libApply, libState, useSample, printGeom, MODES, revealing, applyMotion, setSplitAngle, buildSplitBar, toggleSplit, prefs, photoChanged, rebuildBase, rebuildPhotoView, EXPORTS, EXPORTERS, openExport, runExporter, exporterOpts, recipeFromPNG, recipeFromSVG, codeFor, RECIPES, applyRecipe, get out() { return out; }, get hasRemoval() { return hasRemoval; }, loadImageURL, freshImage, scheduleText, buildPanel, curLayer, setLayerStyle, openPlugins, guideHandles, guideLayer, artGeom, photoPalette, openHelp, runCommand, COMMANDS, snapAt, gridSize, linesChanged,
  toScreen: (x, y) => { const g = artGeom(), q = img2art(x, y, g), r = canvas.getBoundingClientRect(); return [r.left + q[0] * r.width / canvas.width, r.top + q[1] * r.height / canvas.height]; },
  get snapHint() { return ui.snapHint; }, get pen() { return pen; } };
