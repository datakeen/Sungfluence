/* ===================== Part 4: inspector, panels, controls, library ===================== */
const SVGI = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const EYE = SVGI('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>');
const TRASH = SVGI('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>');
const UP = SVGI('<path d="M12 19V5M6 11l6-6 6 6"/>');
const DUP = SVGI('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>');
const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

/* ---------------- toast ---------------- */
let toastTimer = null;
/* a short slide and fade when the panel shows another tab */
function panelIn() { const p = $('panel'); p.classList.remove('panel-in'); void p.offsetWidth; p.classList.add('panel-in'); }
function toast(msg, action) {
  const t = $('toast');
  t.classList.remove('toast-in'); void t.offsetWidth; t.classList.add('toast-in');
  t.replaceChildren(el('span', null, msg));
  if (action) { const b = el('button', null, action.label); b.type = 'button'; b.onclick = () => { t.hidden = true; action.fn(); }; t.appendChild(b); }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, action ? 7000 : 3600);
}

/* ---------------- views and tabs ----------------
   The eyes in the layer stack decide what shows. The three views are quick presets that set those eyes. */
function setView(v) {
  if (v === 'photo') { doc.photo.visible = true; doc.text.visible = false; }
  else if (v === 'mix') { doc.photo.visible = true; doc.text.visible = true; }
  else if (v === 'text') { doc.text.visible = true; doc.photo.visible = false; }
  ui.view = v;
  buildStack(); compose();
}
function syncViewSeg() {
  const p = doc.photo.visible, t = doc.text.visible && doc.text.applied;
  ui.view = p && !t ? 'photo' : t && !p ? 'text' : p && t ? (ui.view === 'mix' ? 'mix' : 'layers') : 'none';
  document.querySelectorAll('#viewSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === ui.view)));
}
document.querySelectorAll('#viewSeg button').forEach((b) => { b.onclick = () => { if ((b.dataset.view !== 'photo') && !doc.text.applied) { applyTextArt(); return; } setView(b.dataset.view); }; });
const TABS = [['photo', 'Photo'], ['lines', 'Vector'], ['text', 'Text art'], ['output', 'Output']];
function buildTabs() {
  const t = $('tabs'); t.replaceChildren();
  TABS.forEach(([id, name]) => { const b = el('button', null, name); b.type = 'button'; b.setAttribute('aria-pressed', String(ui.tab === id)); b.onclick = () => { if (ui.tab === id) return; ui.tab = id; buildTabs(); buildPanel(); panelIn(); }; t.appendChild(b); });
}
const GRIP = SVGI('<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/>');
function toggleLayerVisible(id) {
  const L = layerOf(id);
  L.visible = !L.visible;
  if (id === 'text' && L.visible && !doc.text.applied) { applyTextArt(); return; }
  buildStack(); compose();
}
function buildStack() {
  const box = $('stack'); box.replaceChildren();
  const tl = activeLayers();
  const nObj = (layer) => doc.objects.filter((o) => (o.layer === 'photo') === (layer === 'photo')).length;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const info = {
    text: { ic: '<b style="font-family:Oswald,sans-serif;font-size:13px">A</b>', sub: doc.text.applied ? (tl.map((L) => MODES[L.mode].name).join(' + ') || 'No layers') + (doc.text.locked ? ' · locked' : '') : 'Not applied yet' },
    lines: { ic: SVGI(ICON.pen), sub: [doc.lines.paths.length ? plural(doc.lines.paths.length, 'line') : '', nObj('lines') ? plural(nObj('lines'), 'object') : ''].filter(Boolean).join(', ') || 'None yet' },
    photo: { ic: SVGI('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>'), sub: doc.fileName + (hasRemoval ? ' · areas removed' : '') + (nObj('photo') ? ' · ' + plural(nObj('photo'), 'object') : '') }
  };
  doc.order.forEach((id) => {
    const L = layerOf(id), name = LAYER_NAMES[id];
    const row = el('div', 'stack-row'); row.setAttribute('aria-current', String(ui.tab === id)); row.draggable = true; row.dataset.id = id;
    const grip = el('span', 'grip'); grip.innerHTML = GRIP; grip.title = 'Drag to change the order';
    const eye = el('button', 'icon-btn'); eye.type = 'button'; eye.innerHTML = EYE;
    eye.setAttribute('aria-label', (L.visible ? 'Hide ' : 'Show ') + name); eye.setAttribute('aria-pressed', String(L.visible));
    eye.onclick = () => toggleLayerVisible(id);
    const nm = el('button', 'nm'); nm.type = 'button';
    const ic = el('span', 'ic'); ic.innerHTML = info[id].ic;
    const tx = el('span'); tx.style.display = 'grid'; tx.style.minWidth = '0'; tx.append(el('b', null, name + ((L.opacity ?? 1) < 1 ? '  ' + Math.round(L.opacity * 100) + '%' : '') + (L.blend && L.blend !== 'normal' ? ' · ' + (BLENDS.find((b) => b[0] === L.blend) || ['', ''])[1] : '')), el('small', null, info[id].sub));
    nm.append(ic, tx);
    nm.onclick = () => { ui.tab = id; if (id !== 'text' && id !== 'output') ui.objLayer = id; buildTabs(); buildPanel(); buildStack(); };
    row.append(grip, nm, eye);
    row.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-layer', id); e.dataTransfer.effectAllowed = 'move'; row.classList.add('dragging'); });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('text/x-layer')) { e.preventDefault(); e.stopPropagation(); row.classList.add('drop'); } });
    row.addEventListener('dragleave', () => row.classList.remove('drop'));
    row.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); row.classList.remove('drop'); const from = e.dataTransfer.getData('text/x-layer'); if (from && from !== id) moveLayerTo(from, doc.order.indexOf(id)); });
    box.appendChild(row);
  });
}
function moveLayerTo(id, idx) {
  const o = doc.order.filter((x) => x !== id);
  o.splice(clamp(idx, 0, o.length), 0, id);
  doc.order = o;
  buildStack(); compose(); queueHistory();
  if (['photo', 'lines', 'text'].includes(ui.tab)) buildPanel();
}
/* opacity, blend and order for one of the three layers */
function buildLayerSection(p, id) {
  const L = layerOf(id), i = doc.order.indexOf(id);
  const s = sec(p, 'Layer', (() => { const b = el('span', 'note', (i === 0 ? 'Top' : i === 2 ? 'Bottom' : 'Middle') + ' of the stack'); return b; })());
  s.appendChild(makeControl(L, R('opacity', 'Opacity', 0, 1, 0.01, { idp: 'ly' + id + '-' }), () => { compose(); queueHistory(); buildStack(); }));
  s.appendChild(makeControl(L, Object.assign(SEL('blend', 'Blend', BLENDS), { idp: 'ly' + id + '-' }), () => { compose(); queueHistory(); buildStack(); }));
  const g = el('div', 'grid2');
  g.append(optBtn('Move up', () => moveLayerTo(id, i - 1), false, i === 0), optBtn('Move down', () => moveLayerTo(id, i + 1), false, i === 2));
  s.appendChild(g);
  if (id === 'text' && doc.text.applied) {
    s.appendChild(makeControl(doc.text, T('locked', 'Keep this text art while I edit the photo', { idp: 'ly-' }), () => { lockText(doc.text.locked); buildStack(); queueHistory(); }));
    s.appendChild(el('span', 'note', 'Locked text art stays as it is now. Change or cut the photo, then put it above the text art: the text shows through where the photo is clear.'));
  }
  return s;
}
function buildPanel() {
  const p = $('panel'); p.replaceChildren();
  if (ui.tab === 'photo') buildPhotoPanel(p);
  else if (ui.tab === 'lines') buildLinesPanel(p);
  else if (ui.tab === 'text') buildTextPanel(p);
  else buildOutputPanel(p);
  buildStack();
  drawOverlay();
  syncMenus();
}
function sec(parent, title, right) {
  const s = el('div', 'sec');
  if (title) { const h = el('div', 'sec-h'); h.appendChild(el('span', 'sec-t', title)); if (right) h.appendChild(right); s.appendChild(h); }
  parent.appendChild(s);
  return s;
}

/* ---------------- generic controls ---------------- */
function fmt(c, v) {
  if (['hue', 'twirl', 'rot', 'fa', 'a0'].includes(c.key)) return Math.round(v) + '°';
  if (['posterize', 'pixelate'].includes(c.key) && v < (c.key === 'posterize' ? 2 : 1)) return 'Off';
  if (c.key === 'threshold' && c.idp === 'p-' && v <= 0) return 'Off';
  if (['opacity', 'vertical', 'detail', 'jitter', 'margin', 'mixPhoto', 'tol', 'threshold', 'amount', 'sepia', 'vignette', 'grain', 'bulge', 'warpX', 'warpY', 'warpR', 'shadows', 'highlights', 'fade', 'inner', 'alpha', 'alphaTone', 'colorLift', 'r0', 'r1', 'scale'].includes(c.key)) return Math.round(v * 100) + '%';
  if (c.step >= 1) return String(Math.round(v));
  return Number(v).toFixed(c.step < 0.05 ? 2 : 1);
}
function makeControl(obj, c, after) {
  if (c.show && !c.show(obj)) return null;
  if (c.type === 'note') return el('span', 'note', c.text);
  const id = 'c-' + (c.idp || '') + c.key;
  const w = el('div', 'ctl');
  const live = after || ((d) => { queueHistory(); scheduleText(d); });
  if (c.type === 'range') {
    const row = el('div', 'ctl-row');
    const lab = el('label', null, c.label); lab.htmlFor = id;
    const val = el('span', 'val', fmt(c, obj[c.key]));
    const inp = el('input'); inp.type = 'range'; inp.id = id; inp.min = c.min; inp.max = c.max; inp.step = c.step; inp.value = obj[c.key];
    inp.oninput = () => { obj[c.key] = +inp.value; val.textContent = fmt(c, obj[c.key]); live(); if (c.key === 'opacity') buildLayers(); };
    row.append(lab, val); w.append(row, inp);
  } else if (c.type === 'toggle') {
    const lab = el('label', 'switch'); lab.htmlFor = id;
    lab.append(el('span', null, c.label));
    const inp = el('input'); inp.type = 'checkbox'; inp.id = id; inp.checked = !!obj[c.key]; inp.setAttribute('role', 'switch');
    inp.onchange = () => { obj[c.key] = inp.checked; live(0); if (c.rebuild) c.rebuild(); };
    lab.appendChild(inp); w.appendChild(lab);
  } else if (c.type === 'seg' || c.type === 'colormode') {
    const lab = el('span', 'lab', c.label); lab.id = id + '-l';
    const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-labelledby', id + '-l');
    const opts = c.type === 'colormode' ? c.options.map((o) => [o, COLOR_LABEL[o]]) : c.options;
    opts.forEach(([v, t]) => {
      const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(obj[c.key] === v));
      b.onclick = () => { obj[c.key] = v; (c.rebuild || (() => { buildPanel(); }))(); live(0); };
      seg.appendChild(b);
    });
    w.append(lab, seg);
    if (c.type === 'colormode' && obj.color !== 'image' && obj.color !== 'fill') w.appendChild(inkPicker(obj, 'inkColor', obj.color === 'duotone' ? 'Shadows' : 'Ink'));
    if (c.type === 'colormode' && obj.color === 'duotone') w.appendChild(inkPicker(obj, 'inkColor2', 'Highlights'));
    if (c.type === 'colormode' && obj.color === 'image') {
      // the photo's own colors: averaged under each letter, made stronger, or kept bright on dark paper
      const box = el('div', 'sub-ctl');
      [T('colorAvg', 'Average the color under each letter'), R('saturation', 'Color strength', 0, 2.5, 0.05), R('colorLift', isDarkHex(doc.out.paper) ? 'Brighten dark colors' : 'Deepen pale colors', 0, 1, 0.01)]
        .forEach((cc) => { const n = makeControl(obj, cc, after); if (n) box.appendChild(n); });
      w.appendChild(box);
    }
  } else if (c.type === 'select' || c.type === 'ramp') {
    const lab = el('label', 'lab', c.label); lab.htmlFor = id;
    const s = el('select'); s.id = id;
    const opts = c.type === 'ramp' ? Object.keys(RAMPS).map((k) => [k, k + '   ' + RAMPS[k].trim().slice(0, 14)]).concat([['Custom', 'Custom']]) : c.options;
    opts.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; if (String(obj[c.key]) === String(v)) o.selected = true; s.appendChild(o); });
    s.onchange = () => { const hit = opts.find((o) => String(o[0]) === s.value); obj[c.key] = hit ? hit[0] : s.value; if (c.type === 'ramp' && s.value === 'Custom' && !obj.ramp) obj.ramp = RAMPS.Classic; buildPanel(); live(0); };
    w.append(lab, s);
    if (c.type === 'ramp' && obj.rampName === 'Custom') {
      const t = el('input'); t.type = 'text'; t.id = id + '-custom'; t.value = obj.ramp; t.setAttribute('aria-label', 'Custom characters'); t.style.fontFamily = 'var(--mono)';
      t.oninput = () => { obj.ramp = t.value || ' #'; live(250); };
      w.append(t, el('span', 'note', 'Type characters in any order. SungFluence measures the ink in each one and sorts them.'));
    }
  } else if (c.type === 'text' || c.type === 'textarea') {
    const row = el('div', 'ctl-row');
    const lab = el('label', null, c.label); lab.htmlFor = id;
    row.appendChild(lab);
    const t = el(c.type === 'text' ? 'input' : 'textarea'); t.id = id;
    if (c.type === 'text') t.type = 'text';
    t.value = obj[c.key] || ''; t.dir = 'auto';
    if (c.type === 'textarea') t.rows = c.rows || (c.key === 'words' ? 5 : 3);
    t.oninput = () => { obj[c.key] = t.value; live(350); };
    if (['text', 'words'].includes(c.key)) {
      const tools = el('div', 'row2');
      const lb = el('button', 'mini-btn', 'Library'); lb.type = 'button';
      lb.title = 'Pick words, phrases or characters from ready-made sets';
      lb.onclick = () => openLibrary({ obj, key: c.key, kind: c.key === 'words' ? 'list' : (obj.mode === 'halftone' ? 'glyphs' : 'text'), label: MODES[obj.mode] ? MODES[obj.mode].name : 'line' });
      tools.appendChild(lb);
      if (aiReady && obj.mode !== 'halftone') {
        const sb = el('button', 'mini-btn', 'Suggest'); sb.type = 'button'; sb.title = 'Ask the AI helper for text that suits this photo';
        sb.onclick = () => suggestText(obj, c.key, sb);
        tools.appendChild(sb);
      }
      row.appendChild(tools);
    }
    w.append(row, t);
  } else if (c.type === 'ink') {
    w.appendChild(inkPicker(obj, c.key, c.label));
  } else if (c.type === 'palette') {
    const p = el('div', 'palette'); p.id = 'paletteOut';
    w.append(el('span', 'note', 'Each ink is one screen or one print run.'), p);
  } else if (c.type === 'printon') {
    const lab = el('span', 'lab', c.label);
    const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Print on');
    const dark = isDarkHex(doc.out.paper);
    [['dark', 'Dark, white letters'], ['light', 'Light, black letters']].forEach(([v, t]) => {
      const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String((v === 'dark') === dark));
      b.onclick = () => { setPrintOn(v, obj); };
      seg.appendChild(b);
    });
    w.append(lab, seg);
  }
  return w;
}
function setPrintOn(v, L) {
  doc.out.paper = v === 'dark' ? '#111113' : '#ffffff';
  if (L) { L.color = 'ink'; L.inkColor = v === 'dark' ? '#ffffff' : '#111111'; }
  if (doc.out.mock === 'shirt') doc.out.shirt = v === 'dark' ? '#1b1b1d' : '#f6f6f4';
  buildPanel(); compose(); queueHistory(); scheduleText(0);
}
function inkPicker(obj, key, label) {
  const box = el('div', 'swatches');
  box.setAttribute('role', 'group'); box.setAttribute('aria-label', label + ' color');
  box.appendChild(el('span', 'val', label));
  const cur = obj[key] || (isDarkHex(doc.out.paper) ? '#f2efe6' : '#111111');
  INKS.forEach((h) => {
    const b = el('button', 'sw'); b.type = 'button'; b.style.background = h;
    b.setAttribute('aria-label', label + ' ' + h); b.setAttribute('aria-pressed', String(cur.toLowerCase() === h));
    b.onclick = () => { obj[key] = h; buildPanel(); queueHistory(); scheduleText(0); };
    box.appendChild(b);
  });
  const ci = el('input'); ci.type = 'color'; ci.value = cur.length === 7 ? cur : '#111111'; ci.id = 'c-' + key; ci.setAttribute('aria-label', 'Custom ' + label.toLowerCase() + ' color');
  ci.title = 'Any color';
  ci.oninput = () => { obj[key] = ci.value; queueHistory(); scheduleText(); };
  box.appendChild(ci);
  if (window.EyeDropper) {
    const ed = el('button', 'sw sw-pick'); ed.type = 'button'; ed.innerHTML = PICK_ICON; ed.title = 'Pick a color from the screen'; ed.setAttribute('aria-label', 'Pick ' + label.toLowerCase() + ' color from the screen');
    ed.onclick = async () => { try { const r = await new window.EyeDropper().open(); obj[key] = r.sRGBHex; buildPanel(); queueHistory(); scheduleText(0); } catch (e) { /* cancelled */ } };
    box.appendChild(ed);
  }
  const pal = photoPalette();
  if (pal.length) {
    const row = el('div', 'swatches photo-sw'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Colors from the photo');
    row.appendChild(el('span', 'val', 'From the photo'));
    pal.forEach((h) => {
      const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.title = h;
      b.setAttribute('aria-label', label + ' ' + h + ' from the photo'); b.setAttribute('aria-pressed', String(cur.toLowerCase() === h));
      b.onclick = () => { obj[key] = h; buildPanel(); queueHistory(); scheduleText(0); };
      row.appendChild(b);
    });
    const wrapBox = el('div'); wrapBox.append(box, row); return wrapBox;
  }
  return box;
}
const PICK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4l6 6M17 3l4 4-3 3-4-4zM14 7L5 16v3h3l9-9"/></svg>';
/* The main colors of the photo, found once per picture with a few rounds of k-means */
let palCache = { src: null, list: [] };
function photoPalette() {
  if (!src) return [];
  if (palCache.src === src) return palCache.list;
  const n = src.w * src.h, pts = [];
  const step = Math.max(1, Math.floor(n / 3000));
  for (let i = 0; i < n; i += step) if (!src.keep || src.keep[i] > 0.5) pts.push([src.r[i], src.g[i], src.b[i]]);
  const k = 6, cs = [];
  for (let j = 0; j < k && pts.length; j++) cs.push(pts[Math.floor((j + 0.5) / k * pts.length)].slice());
  for (let it = 0; it < 8; it++) {
    const acc = cs.map(() => [0, 0, 0, 0]);
    for (const p of pts) { let bi = 0, bd = 9; cs.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = j; } }); const a = acc[bi]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; }
    acc.forEach((a, j) => { if (a[3]) cs[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  const hex = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
  const list = Array.from(new Set(cs.map((c) => '#' + hex(c[0]) + hex(c[1]) + hex(c[2]))))
    .sort((a, b) => parseInt(a.slice(1), 16) % 256 + (parseInt(a.slice(1), 16) >> 8) % 256 - (parseInt(b.slice(1), 16) % 256 + (parseInt(b.slice(1), 16) >> 8) % 256));
  palCache = { src, list };
  return list;
}
function isDarkHex(h) { const n = parseInt((h || '#fff').slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255 < 0.45; }
function disclosure(key, label, list, obj, after) {
  const det = el('details', 'more'); det.open = !!ui.open[key];
  det.ontoggle = () => { ui.open[key] = det.open; if (key === 'focus') drawOverlay(); };
  const sum = el('summary'); sum.innerHTML = CHEV; sum.appendChild(document.createTextNode(label));
  const inner = el('div', 'inner');
  list.forEach((c) => { const n = makeControl(obj, c, after); if (n) inner.appendChild(n); });
  det.append(sum, inner);
  return det;
}

/* ---------------- Photo panel ---------------- */
let warpTimer = null;
function buildPhotoPanel(p) {
  const ph = doc.photo;
  const pc = (what) => (d) => photoChanged(what);
  if (selectedObjs().length) buildObjectSection(p);
  buildLayerSection(p, 'photo');
  let s = sec(p, 'Crop and turn');
  s.appendChild(optSeg(CROP_RATIOS, ph.ratio || 'free', (v) => setCropRatio(v), 'Crop shape'));
  const cg = el('div', 'grid2');
  cg.append(optBtn(ui.cropDraft ? 'Apply crop' : 'Crop on the canvas', () => (ui.cropDraft ? cropApply() : setTool('crop')), true), optBtn('Reset crop', cropReset, false, !ph.crop && !ui.cropDraft));
  s.appendChild(cg);
  if (ph.crop) s.appendChild(el('span', 'note', 'Cropped to ' + Math.round(ph.crop.w * iw) + ' × ' + Math.round(ph.crop.h * ih) + ' px of the photo.'));
  const tg = el('div', 'grid4');
  tg.append(optBtn('⟲ Left', () => rotateImage(-1)), optBtn('⟳ Right', () => rotateImage(1)), optBtn('Flip ↔', () => flipImage('x')), optBtn('Flip ↕', () => flipImage('y')));
  s.appendChild(tg);
  s.appendChild(optBtn('Canvas size…', openCanvasSize));
  s = sec(p, 'Adjust');
  [R('brightness', 'Brightness', -0.4, 0.4, 0.01), R('contrast', 'Contrast', 0.4, 2.5, 0.05), R('saturation', 'Color strength', 0, 2.5, 0.05),
    R('temperature', 'Warmth', -1, 1, 0.02), R('tint', 'Tint', -1, 1, 0.02)].forEach((c) => { c.idp = 'p-'; s.appendChild(makeControl(ph, c, pc())); });
  s.appendChild(makeControl(ph, T('gray', 'Grayscale', { idp: 'p-' }), pc()));
  s.appendChild(makeControl(ph, T('invert', 'Invert, light becomes dark', { idp: 'p-' }), pc()));
  s.appendChild(disclosure('photoMore', 'Detail', [R('sharpen', 'Sharpen', 0, 1.5, 0.05, { idp: 'p-' }), R('smooth', 'Smooth', 0, 6, 0.5, { idp: 'p-' })], ph, pc()));
  s.appendChild(disclosure('photoTone', 'Color and tone', [R('hue', 'Hue', -180, 180, 1), R('shadows', 'Shadows', -1, 1, 0.02), R('highlights', 'Highlights', -1, 1, 0.02), R('sepia', 'Sepia', 0, 1, 0.02), R('vignette', 'Vignette', -1, 1, 0.02)].map((c) => Object.assign(c, { idp: 'p-' })), ph, pc()));
  s.appendChild(disclosure('photoFx', 'Effects', [R('grain', 'Grain', 0, 1, 0.02), R('posterize', 'Posterize', 0, 16, 1), R('threshold', 'Black and white cut', 0, 0.95, 0.01), R('pixelate', 'Pixelate', 0, 40, 1)].map((c) => Object.assign(c, { idp: 'p-' })), ph, pc()));
  const warp = () => { clearTimeout(warpTimer); warpTimer = setTimeout(() => photoChanged('source'), 90); };
  s.appendChild(disclosure('photoWarp', 'Bulge and twirl', [R('bulge', 'Bulge or pinch', -1, 1, 0.02), R('twirl', 'Twirl', -360, 360, 5), R('warpX', 'Center, across', 0, 1, 0.01), R('warpY', 'Center, down', 0, 1, 0.01), R('warpR', 'Size', 0.05, 1, 0.01)].map((c) => Object.assign(c, { idp: 'p-' })), ph, warp));
  { const lq = el('div', 'row2'); lq.append(optBtn('Liquify by hand (Y)', () => setTool('liquify')), optBtn('Reset liquify', liqReset, false, !liqOn(ph))); s.appendChild(lq); s.appendChild(el('span', 'note', 'Liquify brushes the photo: push it around, bloat, pucker or twirl a spot, and Alt restores it.')); }
  s = sec(p, 'Text and shapes on the photo');
  s.appendChild(el('span', 'note', 'These become part of the photo, so text art draws them too. Use the Vector panel for objects that float above.'));
  const og = el('div', 'grid4');
  og.append(optBtn('Text', () => { ui.objLayer = 'photo'; quickAdd('text'); }), optBtn('Rectangle', () => { ui.objLayer = 'photo'; quickAdd('rect'); }), optBtn('Ellipse', () => { ui.objLayer = 'photo'; quickAdd('ellipse'); }), optBtn('Image…', () => { ui.objLayer = 'photo'; placeInput.click(); }));
  s.appendChild(og);
  s = sec(p, 'Remove areas');
  s.appendChild(el('span', 'note', 'Removed areas get no text and stay clear in transparent exports. Select with the wand, lasso or brush, then remove. Refine at any time.'));
  const r1 = el('div', 'grid3');
  [['wand', 'Wand'], ['lasso', 'Lasso'], ['brush', 'Brush']].forEach(([t, n]) => { const b = el('button', 'btn', n); b.type = 'button'; if (ui.tool === t) b.classList.add('btn-primary'); b.onclick = () => setTool(t); r1.appendChild(b); });
  s.appendChild(r1);
  const r2 = el('div', 'grid2');
  r2.append(optBtn('Remove background', removeBackground, true), optBtn('Select background', () => selectBackground(ui.bgTol)));
  s.appendChild(r2);
  const bg = { tol: ui.bgTol ?? 0.12 };
  s.appendChild(makeControl(bg, R('tol', 'Background tolerance', 0.03, 0.4, 0.01, { idp: 'bg-' }), () => { ui.bgTol = bg.tol; }));
  const r3 = el('div', 'grid3');
  r3.append(optBtn('Remove', selRemove, false, !hasSelection), optBtn('Keep only', selKeepOnly, false, !hasSelection), optBtn('Restore', selRestore, false, !hasSelection || !hasRemoval));
  s.appendChild(r3);
  s.appendChild(makeControl(ph, R('feather', 'Edge softness', 0, 4, 1, { idp: 'p-' }), pc()));
  if (hasRemoval) s.appendChild(optBtn('Bring everything back', clearRemoval));
  s = sec(p, 'Show removed areas as');
  s.appendChild(makeControl(doc.removed, Object.assign(S('show', 'Pattern', [['checker', 'Checkerboard'], ['color', 'Color']]), { idp: 'r-', rebuild: () => buildPanel() }), () => { rebuildPhotoView(); compose(); }));
  if (doc.removed.show === 'color') {
    const row = el('div', 'swatches');
    ['#ff3b7f', '#34c759', '#0a84ff', '#ffcc00'].forEach((h) => { const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.setAttribute('aria-label', 'Show removed areas in ' + h); b.setAttribute('aria-pressed', String(doc.removed.color === h)); b.onclick = () => { doc.removed.color = h; rebuildPhotoView(); compose(); buildPanel(); }; row.appendChild(b); });
    s.appendChild(row);
  }
  s.appendChild(makeControl(doc.removed, T('inText', 'Also show them in Text view', { idp: 'r-' }), () => compose()));
  s.appendChild(el('span', 'note', 'This is only for checking. Exports never include the pattern.'));
  const reset = el('button', 'mini-btn', 'Reset photo adjustments'); reset.type = 'button';
  reset.onclick = () => { Object.assign(doc.photo, PHOTO_DEFAULTS); photoChanged('crop'); buildPanel(); };
  sec(p).appendChild(reset);
}

/* ---------------- Lines panel ---------------- */
function traceNow(after) {
  if (!src) return;
  const o = { kind: ui.trace.kind, threshold: ui.trace.threshold, amount: ui.trace.amount, skipWide: ui.trace.skipWide, smooth: 0, simplify: 1.0 };
  const cr = cropRect(), s0 = src;
  runJob('trace', remap(C.traceGen(s0, o), 0, 1), (paths) => {
    const kx = cr.w * iw / s0.w, ky = cr.h * ih / s0.h;
    doc.lines.paths = doc.lines.paths.filter((p) => !p.traced);
    for (const p of paths) {
      const pts = p.pts.map(([x, y, r]) => [cr.x * iw + x * kx, cr.y * ih + y * ky, r * kx]);
      doc.lines.paths.push({ id: uid++, traced: true, closed: !!p.closed, width: 0, text: '', nodes: smoothNodes(pts, !!p.closed) });
    }
    ui.selPath = null; doc.lines.visible = true;
    linesChanged();
    if (ui.tab === 'lines') buildPanel();
    toast('Traced ' + paths.length + ' lines. Edit them with the Select tool.');
    if (after) after(paths);
  });
}
function updateLineInfo() {
  const info = document.getElementById('lineCount');
  if (!info) return;
  const t = doc.lines.paths.filter((p) => p.traced).length, d = doc.lines.paths.length - t;
  info.textContent = (t ? t + ' traced' : '') + (t && d ? ', ' : '') + (d ? d + ' drawn' : '') + (t || d ? '' : 'No lines yet');
}
function buildLinesPanel(p) {
  if (selectedObjs().length) buildObjectSection(p);
  buildLayerSection(p, 'lines');
  let s = sec(p, 'Add');
  const ag = el('div', 'grid3');
  const add = (t) => () => { ui.objLayer = 'lines'; quickAdd(t); };
  ag.append(optBtn('Text', add('text')), optBtn('Rectangle', add('rect')), optBtn('Ellipse', add('ellipse')), optBtn('Polygon', add('polygon')), optBtn('Star', add('star')), optBtn('Image…', () => { ui.objLayer = 'lines'; placeInput.click(); }));
  s.appendChild(ag);
  s.appendChild(el('span', 'note', 'Or use the Shape (U) and Text (T) tools on the canvas. Select (V) moves, scales and rotates.'));
  if (selectedObjs().length || ui.selPath) buildRepeatSection(p);
  s = sec(p, 'Trace from the photo');
  s.appendChild(el('span', 'note', 'Turns the strokes of a drawing into lines that text can follow. Dark lines follows black strokes, Light lines follows white ones, Outlines finds edges in a photo.'));
  s.appendChild(makeControl(ui.trace, Object.assign(S('kind', 'Follow', [['dark', 'Dark lines'], ['light', 'Light lines'], ['edges', 'Outlines']]), { idp: 'tr-', rebuild: () => buildPanel() }), () => {}));
  if (ui.trace.kind === 'edges') s.appendChild(makeControl(ui.trace, R('amount', 'How many edges', 0.03, 0.25, 0.01, { idp: 'tr-' }), () => {}));
  else {
    s.appendChild(makeControl(ui.trace, R('threshold', 'Light and dark split', 0.1, 0.9, 0.01, { idp: 'tr-' }), () => {}));
    s.appendChild(makeControl(ui.trace, T('skipWide', 'Skip wide areas like margins', { idp: 'tr-' }), () => {}));
  }
  const tb = optBtn('Trace lines', () => traceNow(), true); s.appendChild(tb);
  s = sec(p, 'Draw your own');
  const r1 = el('div', 'grid3');
  [['pen', 'Pen'], ['pencil', 'Pencil'], ['direct', 'Select']].forEach(([t, n]) => { const b = el('button', 'btn', n); b.type = 'button'; if (ui.tool === t) b.classList.add('btn-primary'); b.onclick = () => setTool(t); r1.appendChild(b); });
  s.appendChild(r1);
  const lw = { w: doc.lines.width || Math.max(4, Math.round(iw / 40)) };
  s.appendChild(makeControl(lw, R('w', 'Width of new lines', 1, Math.max(20, Math.round(iw / 15)), 1, { idp: 'ln-' }), () => { doc.lines.width = lw.w; }));
  s.appendChild(el('span', 'note', 'Line width sets the letter height when text follows the line width.'));
  const sel = findPath(ui.selPath);
  s = sec(p, sel ? 'Selected line' : 'Lines');
  if (sel) {
    const pw = { width: sel.width || Math.round((sel.nodes.reduce((a, n) => a + (n.w || 0), 0) / sel.nodes.length) * 2) || 6 };
    s.appendChild(makeControl(pw, R('width', 'Width', 1, Math.max(30, Math.round(iw / 10)), 1, { idp: 'sl-' }), () => { sel.width = pw.width; sel.nodes.forEach((n) => { delete n.w; }); linesChanged(); }));
    s.appendChild(makeControl(sel, TA('text', 'Text on this line only', { idp: 'sl-' }), () => { linesChanged(); }));
    s.appendChild(el('span', 'note', 'Leave it empty to use the text of the Line text layer.'));
    const sk = { on: !!sel.stroke };
    s.appendChild(makeControl(sk, T('on', 'Draw this line as a stroke', { idp: 'sl-' }), () => { sel.stroke = sk.on ? (sel.stroke || defaultInk()) : null; if (!sel.sw) sel.sw = Math.max(2, Math.round((sel.width || 8) / 2)); linesChanged(); buildPanel(); }));
    if (sel.stroke) {
      s.appendChild(colorRow('Stroke', sel.stroke, (v) => { sel.stroke = v; linesChanged(); }));
      s.appendChild(makeControl(sel, R('sw', 'Stroke width', 1, Math.max(40, Math.round(iw / 20)), 1, { idp: 'sl-' }), () => { linesChanged(); }));
      if (sel.closed) { const fk = { on: !!sel.fill }; s.appendChild(makeControl(fk, T('on', 'Fill the inside', { idp: 'slf-' }), () => { sel.fill = fk.on ? '#e8a33d' : null; linesChanged(); buildPanel(); })); if (sel.fill) s.appendChild(colorRow('Fill', sel.fill, (v) => { sel.fill = v; linesChanged(); })); }
    }
    s.appendChild(optBtn('Delete this line', deleteSelection));
  } else {
    const info = el('span', 'note'); info.id = 'lineCount'; s.appendChild(info);
    s.appendChild(el('span', 'note', 'With the Select tool, click a line to give it its own text or width.'));
  }
  const r2 = el('div', 'grid2');
  r2.append(optBtn('Clear traced', () => { doc.lines.paths = doc.lines.paths.filter((q) => !q.traced); ui.selPath = null; linesChanged(); buildPanel(); }),
    optBtn('Clear drawn', () => { doc.lines.paths = doc.lines.paths.filter((q) => q.traced); ui.selPath = null; linesChanged(); buildPanel(); }));
  s.appendChild(r2);
  const cs = el('div', 'swatches'); cs.appendChild(el('span', 'val', 'Line color on screen'));
  ['#0a84ff', '#ff3b7f', '#34c759', '#ff9f0a'].forEach((h) => { const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.setAttribute('aria-label', 'Show lines in ' + h); b.setAttribute('aria-pressed', String(doc.lines.color === h)); b.onclick = () => { doc.lines.color = h; drawOverlay(); buildPanel(); }; cs.appendChild(b); });
  s.appendChild(cs);
  updateLineInfo();
  s = sec(p, 'Use the lines');
  s.appendChild(el('span', 'note', 'Text art can follow these lines. Choose Lines or Both as the source in the Text art panel.'));
  s.appendChild(optBtn('Write text along these lines', () => useLines(), true, !doc.lines.paths.length));
  s = sec(p, 'Bend lines');
  const bend = { amt: 0.35 };
  s.appendChild(makeControl(bend, R('amt', 'Amount', 0.05, 1, 0.05, { idp: 'bl-' }), () => {}));
  const bg = el('div', 'grid2');
  bg.append(optBtn('Bulge out', () => warpLines(bend.amt), false, !doc.lines.paths.length), optBtn('Pinch in', () => warpLines(-bend.amt), false, !doc.lines.paths.length));
  s.appendChild(bg);
  s.appendChild(el('span', 'note', findPath(ui.selPath) ? 'Bends the selected line.' : 'Bends every line around the middle of the artboard.'));
}
function colorRow(label, val, onchange) {
  const box = el('div', 'swatches'); box.appendChild(el('span', 'val', label));
  ['#111111', '#ffffff', '#e8a33d', '#c8553d', '#0a84ff', '#34c759'].forEach((h) => { const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.setAttribute('aria-label', label + ' ' + h); b.setAttribute('aria-pressed', String((val || '').toLowerCase() === h)); b.onclick = () => { onchange(h); box.querySelectorAll('.sw').forEach((q) => q.setAttribute('aria-pressed', String(q === b))); ci.value = h; }; box.appendChild(b); });
  const ci = el('input'); ci.type = 'color'; ci.value = val && val.length === 7 ? val : '#111111'; ci.setAttribute('aria-label', 'Custom ' + label.toLowerCase() + ' color');
  ci.oninput = () => onchange(ci.value);
  box.appendChild(ci);
  return box;
}
/* properties of the selected shapes, text and images */
function buildObjectSection(p) {
  const sel = selectedObjs(); if (!sel.length) return;
  const o = sel[0], one = sel.length === 1;
  const del = el('button', 'mini-btn', 'Delete'); del.type = 'button'; del.onclick = deleteObjects;
  const s = sec(p, one ? OBJ_NAMES[o.type] + (o.layer === 'photo' ? ' on the photo' : '') : sel.length + ' objects', del);
  s.classList.add('obj-sec');
  const live = () => { objChanged({ list: sel }); queueHistory(); };
  if (one) {
    const g = el('div', 'grid-num');
    const r1 = (v) => Math.round(v * 10) / 10;
    g.append(numInput('X', r1(o.x), (v) => { o.x = v; live(); }), numInput('Y', r1(o.y), (v) => { o.y = v; live(); }),
      numInput('W', r1(o.w), (v) => { if (v > 0) { if (o.type === 'text') { o.size *= v / o.w; measureText(o); } else o.w = v; live(); } }), numInput('H', r1(o.h), (v) => { if (v > 0 && o.type !== 'text') { o.h = v; live(); } }),
      numInput('Angle', r1(o.rot || 0), (v) => { o.rot = v; live(); }, { unit: '°' }));
    s.appendChild(g);
    if (o.type === 'text') {
      const ta = el('textarea'); ta.value = o.text; ta.rows = 3; ta.dir = 'auto'; ta.setAttribute('aria-label', 'Text');
      ta.oninput = () => { o.text = ta.value; measureText(o); live(); };
      s.appendChild(ta);
      const tf = { font: o.font, size: Math.round(o.size), weight: o.weight, italic: o.italic, align: o.align, lh: o.lh, ls: o.ls };
      const upd = () => { Object.assign(o, tf); measureText(o); live(); };
      s.appendChild(makeControl(tf, Object.assign({}, FONT, { idp: 'ot-' }), () => { upd(); buildPanel(); }));
      s.appendChild(makeControl(tf, R('size', 'Size', 4, Math.max(400, Math.round(ih / 2)), 1, { idp: 'ot-' }), upd));
      s.appendChild(makeControl(tf, R('weight', 'Weight', 100, 900, 100, { idp: 'ot-' }), upd));
      s.appendChild(makeControl(tf, Object.assign(S('align', 'Align', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']]), { idp: 'ot-', rebuild: () => {} }), () => { upd(); buildPanel(); }));
      s.appendChild(makeControl(tf, T('italic', 'Italic', { idp: 'ot-' }), upd));
      s.appendChild(disclosure('objText', 'Spacing', [R('lh', 'Line height', 0.7, 2.5, 0.05, { idp: 'ot-' }), R('ls', 'Letter spacing', -0.1, 1, 0.01, { idp: 'ot-' })], tf, upd));
    }
    if (o.type === 'rect') s.appendChild(makeControl(o, R('radius', 'Round corners', 0, Math.round(Math.min(o.w, o.h) / 2), 1, { idp: 'or-' }), live));
    if (o.type === 'polygon') s.appendChild(makeControl(o, R('sides', 'Sides', 3, 12, 1, { idp: 'or-' }), live));
    if (o.type === 'star') { s.appendChild(makeControl(o, R('points', 'Points', 3, 16, 1, { idp: 'or-' }), live)); s.appendChild(makeControl(o, R('inner', 'Inner size', 0.15, 0.9, 0.01, { idp: 'or-' }), live)); }
  }
  if (o.type !== 'image') {
    const fk = { on: !!o.fill };
    s.appendChild(makeControl(fk, T('on', 'Fill', { idp: 'of-' }), () => { sel.forEach((q) => { if (q.type !== 'image') q.fill = fk.on ? (q.fill || o.fill || '#e8a33d') : null; }); live(); buildPanel(); }));
    if (o.fill) s.appendChild(colorRow('Fill', o.fill, (v) => { sel.forEach((q) => { if (q.type !== 'image') q.fill = v; }); live(); }));
    const sk = { on: !!o.stroke, sw: o.sw || 2 };
    s.appendChild(makeControl(sk, T('on', 'Outline', { idp: 'os-' }), () => { sel.forEach((q) => { q.stroke = sk.on ? (q.stroke || '#111111') : null; }); live(); buildPanel(); }));
    if (o.stroke) {
      s.appendChild(colorRow('Outline', o.stroke, (v) => { sel.forEach((q) => { q.stroke = v; }); live(); }));
      s.appendChild(makeControl(sk, R('sw', 'Outline width', 0.5, Math.max(40, Math.round(iw / 25)), 0.5, { idp: 'os-' }), () => { sel.forEach((q) => { q.sw = sk.sw; }); live(); }));
    }
  }
  const op = { opacity: o.opacity ?? 1 };
  s.appendChild(makeControl(op, R('opacity', 'Opacity', 0, 1, 0.01, { idp: 'oo-' }), () => { sel.forEach((q) => { q.opacity = op.opacity; }); live(); }));
  const lay = { layer: o.layer };
  s.appendChild(makeControl(lay, Object.assign(S('layer', 'On layer', [['photo', 'Photo'], ['lines', 'Vector']]), { idp: 'ol-', rebuild: () => {} }), () => moveObjectsToLayer(lay.layer)));
  const ar = el('div', 'grid4');
  ar.append(optBtn('Front', () => arrangeObjects('front')), optBtn('Forward', () => arrangeObjects('forward')), optBtn('Backward', () => arrangeObjects('backward')), optBtn('Back', () => arrangeObjects('back')));
  s.appendChild(ar);
  const al = el('div', 'grid6'); al.setAttribute('aria-label', 'Align to the artboard');
  [['left', '⇤', 'Align left'], ['center', '↔', 'Center across'], ['right', '⇥', 'Align right'], ['top', '⤒', 'Align top'], ['middle', '↕', 'Center down'], ['bottom', '⤓', 'Align bottom']].forEach(([k, t, n]) => { const b = optBtn(t, () => alignObjects(k)); b.title = n; b.setAttribute('aria-label', n); al.appendChild(b); });
  s.appendChild(al);
  const ex = el('div', 'grid3');
  ex.append(optBtn('Duplicate', duplicateObjects), optBtn('Flip ↔', () => flipObjects('x')), optBtn('Flip ↕', () => flipObjects('y')));
  s.appendChild(ex);
  if (ui.tab !== 'lines') buildRepeatSection(p);
}
/* step and repeat settings */
function buildRepeatSection(p) {
  const rp = ui.rep;
  const s = sec(p, 'Step and repeat');
  s.appendChild(makeControl(rp, Object.assign(S('mode', 'Copies go', [['line', 'In a line'], ['grid', 'Grid'], ['circle', 'Circle'], ['path', 'Along a line']]), { idp: 'rp-', rebuild: () => buildPanel() }), () => {}));
  const row = el('div', 'grid-num');
  if (rp.mode === 'line') {
    s.appendChild(makeControl(rp, R('count', 'Copies', 1, 60, 1, { idp: 'rp-' }), () => {}));
    row.append(numInput('Step across', rp.dx, (v) => { rp.dx = v; }, { unit: 'px' }), numInput('Step down', rp.dy, (v) => { rp.dy = v; }, { unit: 'px' }));
    s.appendChild(row);
    s.appendChild(makeControl(rp, R('rot', 'Turn each copy', -180, 180, 1, { idp: 'rp-' }), () => {}));
    s.appendChild(makeControl(rp, R('scale', 'Size of each copy (%)', 50, 150, 1, { idp: 'rp-' }), () => {}));
    s.appendChild(makeControl(rp, R('fade', 'Fade out', 0, 1, 0.05, { idp: 'rp-' }), () => {}));
  } else if (rp.mode === 'grid') {
    row.append(numInput('Columns', rp.cols, (v) => { rp.cols = Math.max(1, Math.round(v)); }, { min: 1 }), numInput('Rows', rp.rows, (v) => { rp.rows = Math.max(1, Math.round(v)); }, { min: 1 }),
      numInput('Gap across', rp.gx, (v) => { rp.gx = v; }, { unit: 'px' }), numInput('Gap down', rp.gy, (v) => { rp.gy = v; }, { unit: 'px' }));
    s.appendChild(row);
  } else if (rp.mode === 'circle') {
    s.appendChild(makeControl(rp, R('count', 'Copies', 1, 60, 1, { idp: 'rp-' }), () => {}));
    row.append(numInput('Radius', rp.radius, (v) => { rp.radius = v; }, { unit: 'px' }));
    s.appendChild(row);
    s.appendChild(makeControl(rp, T('turn', 'Turn copies around the center', { idp: 'rp-' }), () => {}));
  } else {
    const others = doc.lines.paths.filter((q) => q.id !== ui.selPath);
    if (!others.length) s.appendChild(el('span', 'note', 'Draw or trace a line first. The copies spread evenly along it.'));
    else {
      if (!others.some((q) => q.id === rp.path)) rp.path = others[0].id;
      s.appendChild(makeControl(rp, Object.assign(SEL('path', 'Along', others.map((q) => [q.id, 'Line ' + (doc.lines.paths.indexOf(q) + 1) + (q.traced ? ', traced' : q.stroke ? ', stroke' : ', drawn')])), { idp: 'rp-' }), () => {}));
      s.appendChild(makeControl(rp, R('count', 'Copies', 1, 120, 1, { idp: 'rp-' }), () => {}));
      s.appendChild(makeControl(rp, T('turn', 'Turn copies to follow the line', { idp: 'rp-' }), () => {}));
    }
  }
  s.appendChild(optBtn('Make copies', stepRepeat, true));
}
function useLines() {
  if (!doc.text.layers.some((L) => L.mode === 'paths')) doc.text.layers.push(newLayer('paths', { inkColor: isDarkHex(doc.out.paper) ? '#ffffff' : '#111111' }));
  doc.text.source = doc.text.source === 'photo' ? 'lines' : doc.text.source;
  doc.text.sel = doc.text.layers.findIndex((L) => L.mode === 'paths');
  doc.text.applied = true;
  ui.tab = 'text'; buildTabs(); buildPanel(); setView('text'); scheduleText(0); queueHistory();
}

/* ---------------- Text art panel ---------------- */
function buildTextPanel(p) {
  if (doc.text.applied) buildLayerSection(p, 'text');
  let s = sec(p, 'Text art uses');
  s.appendChild(makeControl(doc.text, Object.assign(S('source', 'Source', [['photo', 'Photo'], ['lines', 'Lines'], ['both', 'Both']]), { idp: 'ts-', rebuild: () => { ensureSource(); buildPanel(); } }), () => { queueHistory(); scheduleText(0); }));
  s.appendChild(el('span', 'note', doc.text.source === 'photo' ? 'Letters are placed by the tones of the photo.' : doc.text.source === 'lines' ? 'Letters follow the lines from the Lines layer.' : 'Photo layers and line layers are both drawn.'));
  if (!doc.text.applied) s.appendChild(optBtn('Apply text art', () => applyTextArt(), true));
  if (doc.text.source !== 'lines') {
    s = sec(p, 'Start from a recipe');
    const box = el('div', 'recipes'); box.id = 'recipes'; s.appendChild(box);
    RECIPES.forEach((r, i) => {
      const b = el('button', 'recipe-card'); b.type = 'button';
      const c = el('canvas'); c.width = 180; c.height = 120; c.id = 'rt-' + i; c.setAttribute('aria-hidden', 'true');
      b.append(c, el('span', null, r.name));
      b.onclick = () => applyRecipe(r);
      box.appendChild(b);
    });
    thumbsSoon(50);
  } else {
    s = sec(p, 'Quick looks for lines');
    const g = el('div', 'grid2');
    [['White letters, dark shirt', 'dark'], ['Black letters, light shirt', 'light']].forEach(([n, v]) => g.appendChild(optBtn(n, () => setPrintOn(v, doc.text.layers.find((L) => L.mode === 'paths')))));
    s.appendChild(g);
  }
  s = sec(p, 'Layers', (() => { const b = el('button', 'mini-btn', '+ Add layer'); b.type = 'button'; b.onclick = addTextLayer; return b; })());
  const lb = el('div', 'layers'); lb.id = 'layers'; s.appendChild(lb); buildLayers();
  s = sec(p, 'Style');
  const tiles = el('div', 'tiles'); tiles.id = 'tiles'; s.appendChild(tiles); buildTiles();
  const ctlBox = el('div', 'sec'); ctlBox.id = 'controls'; p.appendChild(ctlBox); buildControls();
}
function ensureSource() {
  const s = doc.text.source;
  if (s !== 'photo' && !doc.text.layers.some((L) => L.mode === 'paths')) {
    doc.text.layers.push(newLayer('paths', { inkColor: isDarkHex(doc.out.paper) ? '#ffffff' : '#111111' }));
    if (!doc.lines.paths.length) toast('There are no lines yet. Trace or draw some in the Lines panel.', { label: 'Open Lines', fn: () => { ui.tab = 'lines'; buildTabs(); buildPanel(); } });
  }
  if (s !== 'lines' && !doc.text.layers.some((L) => L.mode !== 'paths')) doc.text.layers.unshift(newLayer('rows'));
  const act = activeLayers();
  if (!act.includes(doc.text.layers[doc.text.sel])) doc.text.sel = doc.text.layers.indexOf(act[act.length - 1]);
}
function addTextLayer() {
  const lineMode = doc.text.source === 'lines';
  doc.text.layers.push(lineMode ? newLayer('paths', { inkColor: isDarkHex(doc.out.paper) ? '#ffffff' : '#111111' }) : newLayer('mosaic', { region: 'dark', regionT: 0.55, threshold: 0.55, maxSize: 60 }));
  doc.text.sel = doc.text.layers.length - 1;
  buildPanel(); queueHistory(); scheduleText(0);
}
function curLayer() { return doc.text.layers[doc.text.sel] || doc.text.layers[0]; }
function buildLayers() {
  const box = document.getElementById('layers'); if (!box) return;
  box.replaceChildren();
  const act = activeLayers();
  for (let i = doc.text.layers.length - 1; i >= 0; i--) {
    const L = doc.text.layers[i];
    const row = el('div', 'layer' + (act.includes(L) ? '' : ' off'));
    row.setAttribute('aria-current', String(i === doc.text.sel));
    const eye = el('button', 'icon-btn'); eye.type = 'button'; eye.innerHTML = EYE;
    eye.setAttribute('aria-label', (L.hidden ? 'Show ' : 'Hide ') + MODES[L.mode].name + ' layer'); eye.setAttribute('aria-pressed', String(!L.hidden));
    eye.onclick = () => { L.hidden = !L.hidden; buildLayers(); queueHistory(); scheduleText(0); };
    const name = el('button', 'layer-name'); name.type = 'button';
    name.textContent = MODES[L.mode].name;
    const note = [];
    if (!act.includes(L)) note.push('not used by ' + doc.text.source);
    if (L.region === 'dark' || L.region === 'light') note.push(L.region + ' tones');
    if (L.region === 'inside' || L.region === 'outside') note.push(L.region + ' ' + (L.regionShape === 'text' ? '"' + L.regionText + '"' : L.regionShape));
    if (L.focus !== 'none') note.push('fade');
    if (L.opacity < 1) note.push(Math.round(L.opacity * 100) + '%');
    if (note.length) name.appendChild(el('small', null, note.join(' · ')));
    name.onclick = () => { doc.text.sel = i; buildPanel(); };
    row.append(eye, name);
    const dup = el('button', 'icon-btn'); dup.type = 'button'; dup.innerHTML = DUP; dup.setAttribute('aria-label', 'Duplicate layer'); dup.onclick = () => duplicateLayer(i);
    row.appendChild(dup);
    if (i < doc.text.layers.length - 1) { const up = el('button', 'icon-btn'); up.type = 'button'; up.innerHTML = UP; up.setAttribute('aria-label', 'Move layer up'); up.onclick = () => { const t = doc.text.layers[i]; doc.text.layers[i] = doc.text.layers[i + 1]; doc.text.layers[i + 1] = t; doc.text.sel = i + 1; buildPanel(); queueHistory(); scheduleText(0); }; row.appendChild(up); }
    if (doc.text.layers.length > 1) { const del = el('button', 'icon-btn'); del.type = 'button'; del.innerHTML = TRASH; del.setAttribute('aria-label', 'Delete layer'); del.onclick = () => { doc.text.layers.splice(i, 1); doc.text.sel = Math.min(doc.text.sel, doc.text.layers.length - 1); buildPanel(); queueHistory(); scheduleText(0); toast('Layer deleted', { label: 'Undo', fn: undo }); }; row.appendChild(del); }
    box.appendChild(row);
  }
}
function duplicateLayer(i) {
  const c = JSON.parse(JSON.stringify(doc.text.layers[i])); c.id = uid++;
  doc.text.layers.splice(i + 1, 0, c); doc.text.sel = i + 1;
  buildPanel(); queueHistory(); scheduleText(0);
}
function buildTiles() {
  const box = document.getElementById('tiles'); if (!box) return;
  box.replaceChildren();
  const cur = curLayer();
  const entries = Object.entries(MODES);
  const core = entries.filter(([, m]) => !m.plugin), extra = entries.filter(([, m]) => m.plugin);
  const tile = ([k, m], into) => {
    const b = el('button', 'tile' + (m.plugin ? ' plug' : '')); b.type = 'button';
    b.setAttribute('aria-pressed', String(cur.mode === k));
    if (m.plugin) b.title = 'Extra effect: ' + (m.plugin.description || m.name);
    const g = el('span', 'g'); g.innerHTML = m.glyph; g.setAttribute('aria-hidden', 'true');
    b.append(g, el('span', 'l', m.name));
    b.onclick = () => setLayerStyle(k);
    into.appendChild(b);
  };
  core.forEach((e) => tile(e, box));
  const parent = box.parentNode;
  let xb = document.getElementById('extraTiles');
  if (!xb) {
    const h = el('div', 'sec-h extra-h');
    h.appendChild(el('span', 'sec-t', 'Extra effects'));
    const mb = el('button', 'mini-btn', 'Plugins…'); mb.type = 'button'; mb.title = 'Add, remove or make extra effects'; mb.onclick = () => openPlugins();
    h.appendChild(mb);
    xb = el('div', 'tiles'); xb.id = 'extraTiles';
    parent.append(h, xb);
  }
  xb.replaceChildren();
  extra.forEach((e) => tile(e, xb));
  const add = el('button', 'tile tile-add'); add.type = 'button'; add.title = 'Load an effect from a plugin file';
  const g = el('span', 'g', '+'); g.setAttribute('aria-hidden', 'true');
  add.append(g, el('span', 'l', 'Add effect'));
  add.onclick = () => pluginInput.click();
  xb.appendChild(add);
}
function setLayerStyle(k) {
  const cur = curLayer(), m = MODES[k];
  if (!m || !cur || cur.mode === k) return;
  revealSoon();
  const keep = {};
  Object.keys(COMMON_DEFAULTS).forEach((c) => { keep[c] = cur[c]; });
  if (cur.text && cur.mode !== 'halftone' && 'text' in m.defaults && k !== 'halftone') keep.text = cur.text;
  if (cur.mode === 'mosaic' && 'text' in m.defaults && k !== 'halftone') keep.text = cur.words.split('\n').join(' ');
  if (k === 'mosaic' && cur.text && cur.mode !== 'halftone') keep.words = cur.text.split(/\s+/).filter(Boolean).join('\n');
  if (m.defaults.inkColor) delete keep.inkColor;
  const n = newLayer(k, keep);
  if (k === 'paths') n.inkColor = isDarkHex(doc.out.paper) ? '#ffffff' : '#111111';
  doc.text.layers[doc.text.sel] = n;
  if ((k === 'paths') !== (cur.mode === 'paths') && doc.text.source !== 'both') { doc.text.source = 'both'; toast('Text art now uses both the photo and the lines.'); }
  buildPanel(); queueHistory(); scheduleText(0);
}
function buildControls() {
  const box = document.getElementById('controls'); if (!box) return;
  const L = curLayer();
  const M = MODES[L.mode];
  const head = el('div', 'sec-h');
  head.append(el('span', 'sec-t', M.name + ' settings'));
  const vb = el('button', 'mini-btn', 'Variations'); vb.type = 'button'; vb.onclick = () => showVariations();
  head.appendChild(vb);
  box.replaceChildren(head);
  const vbox = el('div'); vbox.id = 'varBox'; vbox.hidden = true; box.appendChild(vbox);
  const about = M.about || (M.plugin && M.plugin.description);
  if (about) box.appendChild(el('p', 'note style-about', String(about).slice(0, 220)));
  M.controls.forEach((c) => { const n = makeControl(L, c); if (n) box.appendChild(n); });
  const letters = letterControls(L, M);
  if (letters.length) box.appendChild(disclosure('letters', 'Letters: weight, spacing, italic' + (L.italic ? ' (italic)' : ''), letters, L));
  box.appendChild(disclosure('focus', 'Focus and fade' + (L.focus !== 'none' ? ' (on)' : ''), FOCUS_CTL, L, (d) => { queueHistory(); scheduleText(d); drawOverlay(); }));
  box.appendChild(disclosure('fx', 'Opacity, effects and inks' + (L.effect !== 'none' || L.jitter > 0 || L.limitColors || L.alpha < 1 || L.alphaTone > 0 ? ' (on)' : ''), EFFECT_CTL, L));
  box.appendChild(disclosure('more', 'More controls', M.more.concat(L.mode === 'paths' ? COMMON_MORE.filter((c) => ['opacity', 'seed'].includes(c.key)) : COMMON_MORE), L));
  updatePalette();
  drawOverlay();
}

/* ---------------- recipes, suggestion, apply ---------------- */
function recipeLayers(r) {
  const oldText = doc.text.layers.map((L) => L.text).find((t) => t && t.length > 3 && t !== LINE_TEXT);
  return r.layers.map(([m, o]) => {
    const L = newLayer(m, o);
    if (oldText && 'text' in MODES[m].defaults && m !== 'halftone') L.text = oldText;
    // after a cutout the subject itself is the shape to fill
    if (hasRemoval && m === 'mosaic' && L.region === 'all') L.threshold = 0;
    if (hasRemoval && m === 'calligram') L.maskSource = 'cutout';
    return L;
  });
}
function applyRecipe(r) {
  revealSoon();
  doc.out.paper = r.paper; doc.out.transparent = !!r.transparent;
  const lineLayers = doc.text.layers.filter((L) => L.mode === 'paths');
  doc.text.layers = recipeLayers(r).concat(doc.text.source === 'both' ? lineLayers : []);
  if (doc.text.source === 'lines') doc.text.source = 'photo';
  doc.text.sel = Math.max(0, recipeLayers(r).length - 1);
  doc.text.applied = true;
  buildPanel(); if (ui.view === 'photo') setView('text'); scheduleText(0); queueHistory();
  toast('Applied ' + r.name, { label: 'Undo', fn: undo });
}
function suggestFor(s) {
  if (!s) return { kind: 'photo', recipe: RECIPES[0] };
  let bin = 0, sat = 0, dark = 0;
  const n = s.w * s.h;
  for (let i = 0; i < n; i++) {
    const l = s.lum[i];
    if (l < 0.18 || l > 0.82) bin++;
    if (l < 0.5) dark++;
    sat += Math.max(s.r[i], s.g[i], s.b[i]) - Math.min(s.r[i], s.g[i], s.b[i]);
  }
  bin /= n; sat /= n; dark /= n;
  if (bin > 0.86 && sat < 0.08) return { kind: 'lines', name: 'Line text', trace: dark < 0.62 ? 'dark' : 'light', note: 'This looks like a line drawing, so the text will follow the center of each stroke.' };
  if (sat > 0.16) return { kind: 'photo', recipe: RECIPES[0], name: RECIPES[0].name, note: 'A colorful photo, so the letters take their colors from it.' };
  return { kind: 'photo', recipe: RECIPES[1], name: RECIPES[1].name, note: 'A soft-toned photo, so the text flows along its shapes like an engraving.' };
}
function updateCTA() {
  const c = $('cta');
  const blankEmpty = doc.blank && !doc.objects.some((o) => o.layer === 'photo');
  const show = !!origImg && !doc.text.applied && doc.out.mock === 'artboard' && !jobs.trace && ui.tool === 'hand' && !ui.ctaDismissed && !ui.cropDraft && !blankEmpty;
  c.hidden = !show;
  if (!show) return;
  const sg = ui.suggestion || suggestFor(baseSrc);
  if (c.dataset.for === doc.fileName + sg.name) return;
  c.dataset.for = doc.fileName + sg.name;
  c.replaceChildren(el('h2', null, 'Turn this into text art'), el('p', null, 'Suggested: ' + sg.name + '. ' + sg.note + ' You can change everything afterwards.'));
  const row = el('div', 'row');
  const go = optBtn('Apply text art', () => applyTextArt(), true);
  const pick = optBtn('Choose a style', () => { ui.tab = 'text'; buildTabs(); buildPanel(); });
  const later = optBtn('Not now', () => { ui.ctaDismissed = true; updateCTA(); });
  later.classList.add('btn-quiet');
  row.append(go, pick, later);
  c.appendChild(row);
}
function applyTextArt() {
  if (!src) return;
  if (!doc.text.applied) revealSoon();
  const sg = ui.suggestion || suggestFor(baseSrc);
  if (doc.text.applied) { setView('text'); return; }
  if (sg.kind === 'lines') {
    ui.trace.kind = sg.trace;
    traceNow(() => {
      doc.out.paper = '#111113';
      doc.text.layers = [newLayer('paths', { inkColor: '#ffffff' })];
      doc.text.source = 'lines'; doc.text.sel = 0; doc.text.applied = true;
      ui.tab = 'text'; buildTabs(); buildPanel(); setView('text'); scheduleText(0); queueHistory();
      toast('White letters for a dark shirt. Switch to black letters in the Line text settings.');
    });
    return;
  }
  doc.out.paper = sg.recipe.paper;
  doc.text.layers = recipeLayers(sg.recipe); doc.text.source = 'photo';
  doc.text.sel = doc.text.layers.length - 1; doc.text.applied = true;
  ui.tab = 'text'; buildTabs(); buildPanel(); setView('text'); scheduleText(0); queueHistory();
}

/* ---------------- recipe thumbnails and variations ---------------- */
let thumbJob = 0, thumbTimer = null;
function thumbsSoon(d) { clearTimeout(thumbTimer); thumbTimer = setTimeout(renderThumbs, d ?? 700); }
/* thumbnails and variations read a small copy of the photo, so they never block a slow computer */
let thumbSrcCache = null;
function thumbSource() {
  if (!origImg || !src) return src;
  if (thumbSrcCache && thumbSrcCache.key === src) return thumbSrcCache.s;
  const b = C.prepare(origImg, 400, cropRect());
  const s = C.treat(b, Object.assign({}, doc.photo, { keepMask: keepFor(b.w, b.h) }));
  thumbSrcCache = { key: src, s };
  return s;
}
/* draw one thumbnail in small steps; the caller decides how long each step may run */
function* thumbGen(c, scene) {
  const o = yield* C.renderGen(thumbSource(), scene);
  const tmp = mk(o.W, o.H);
  yield* C.drawGen(tmp.getContext('2d'), o, 1, { forcePaper: true });
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  const k = Math.max(c.width / o.W, c.height / o.H), w = o.W * k, h = o.H * k;
  x.drawImage(tmp, (c.width - w) / 2, (c.height - h) / 2, w, h);
}
/* runs a list of thumbnail jobs, 8 ms at a time, and steps aside while the main artwork renders */
function sliceThumbs(list, alive) {
  let i = 0, gen = null;
  const tick = () => {
    if (!alive()) return;
    if (Object.keys(jobs).length) { setTimeout(tick, 250); return; }
    const t0 = performance.now();
    while (performance.now() - t0 < 8) {
      if (!gen) {
        if (i >= list.length) return;
        const [c, scene] = list[i]();
        if (!c) { i++; continue; }
        gen = thumbGen(c, scene);
      }
      try { if (gen.next().done) { gen = null; i++; } } catch (e) { gen = null; i++; }
    }
    setTimeout(tick, 16);
  };
  tick();
}
function renderThumbs() {
  if (!src || !document.getElementById('rt-0')) return;
  const job = ++thumbJob;
  sliceThumbs(RECIPES.map((r, i) => () => [document.getElementById('rt-' + i), { width: doc.out.width, scale: 360 / doc.out.width, coarse: 2.2, paper: r.paper, layers: recipeLayers(r).map(engineLayer) }]), () => job === thumbJob);
}
function mutate(L, Rn) {
  const M = MODES[L.mode];
  const pool = M.controls.concat(M.more).filter((c) => ['range', 'seg', 'select', 'colormode', 'ramp'].includes(c.type) && !['cx', 'cy', 'size'].includes(c.key) || (c.key === 'size' && L.mode !== 'paths'));
  const v = JSON.parse(JSON.stringify(L));
  v.seed = 1 + Math.floor(Rn() * 98);
  const n = 2 + Math.floor(Rn() * 2);
  for (let i = 0; i < n && pool.length; i++) {
    const c = pool[Math.floor(Rn() * pool.length)];
    if (c.type === 'range') { const span = c.max - c.min; v[c.key] = Math.round((c.min + span * (0.15 + 0.7 * Rn())) / c.step) * c.step; }
    else if (c.type === 'colormode') v.color = c.options[Math.floor(Rn() * c.options.length)];
    else if (c.type === 'ramp') v.rampName = Object.keys(RAMPS)[Math.floor(Rn() * 5)];
    else if (c.options) v[c.key] = c.options[Math.floor(Rn() * c.options.length)][0];
  }
  if (Rn() < 0.3 && v.color !== 'image' && L.mode !== 'paths') v.inkColor = INKS[Math.floor(Rn() * INKS.length)];
  return v;
}
let varSeed = 11;
function showVariations() {
  const box = $('varBox');
  if (!box || !src) return;
  box.hidden = false; box.replaceChildren();
  const grid = el('div', 'vars');
  let a = (varSeed += 7919);
  const Rn = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const L = curLayer();
  const variants = Array.from({ length: 6 }, () => mutate(L, Rn));
  variants.forEach((v, i) => {
    const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', 'Use variation ' + (i + 1));
    const c = el('canvas'); c.width = 240; c.height = 160; b.appendChild(c);
    b.onclick = () => { doc.text.layers[doc.text.sel] = Object.assign(v, { id: L.id }); buildPanel(); queueHistory(); scheduleText(0); };
    grid.appendChild(b);
  });
  const foot = el('div', 'row2');
  const again = el('button', 'mini-btn', 'Show six more'); again.type = 'button'; again.onclick = showVariations;
  const close = el('button', 'mini-btn', 'Close'); close.type = 'button'; close.onclick = () => { box.hidden = true; };
  foot.append(again, close);
  box.append(grid, foot);
  const layersFor = (v) => activeLayers().map((x) => (x === L ? v : x));
  const vjob = ++varJob;
  sliceThumbs(variants.map((v, i) => () => [grid.children[i] && grid.children[i].firstChild, sceneFor(layersFor(v), 480 / doc.out.width, { coarse: 1.6 })]), () => vjob === varJob && !box.hidden && box.isConnected);
}
let varJob = 0;

/* ---------------- Output panel ---------------- */
function buildOutputPanel(p) {
  const o = doc.out;
  const oc = (rebuildView) => () => { if (rebuildView) { rebuildPhotoView(); } compose(); queueHistory(); scheduleText(0); };
  // the background: on the T-shirt preview it is the shirt, so the swatches are shirt colors and set both
  const shirt = o.mock === 'shirt';
  let s = sec(p, shirt ? 'T-shirt color (background)' : 'Paper color (background)');
  const sw = el('div', 'swatches'); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', shirt ? 'T-shirt color' : 'Paper color');
  (shirt ? SHIRTS : PAPERS).forEach(([h, n]) => {
    const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.setAttribute('aria-label', n + (shirt ? ' shirt' : ' paper')); b.title = n;
    b.setAttribute('aria-pressed', String(o.paper.toLowerCase() === h));
    b.onclick = () => { o.paper = h; if (shirt) o.shirt = h; inkForPaper(); buildPanel(); compose(); queueHistory(); scheduleText(0); };
    sw.appendChild(b);
  });
  const ci = el('input'); ci.type = 'color'; ci.id = 'c-paper'; ci.value = o.paper; ci.setAttribute('aria-label', shirt ? 'Custom T-shirt color' : 'Custom paper color');
  ci.oninput = () => { o.paper = ci.value; if (shirt) o.shirt = ci.value; compose(); queueHistory(); scheduleText(); };
  ci.onchange = () => { if (inkForPaper()) { buildPanel(); scheduleText(0); } };
  sw.appendChild(ci); s.appendChild(sw);
  s.appendChild(makeControl(o, T('transparent', 'Transparent background', { idp: 'o-' }), oc()));
  s.appendChild(el('span', 'note', o.transparent
    ? 'The background is left out of the file. The letters are still chosen to show on ' + (shirt ? 'this shirt color' : 'this paper color') + ', so keep it close to what you will print on. Formats without transparency, such as JPG, fill it with this color.'
    : (shirt ? 'The letters are chosen to show on this shirt color. Turn on Transparent background to print only the letters.' : 'The color behind the letters. Turn on Transparent background for T-shirts, stickers and overlays.')));
  s = sec(p, 'Color and size');
  s.appendChild(makeControl(o, Object.assign(S('colorModel', 'Output color', MODELS), { idp: 'o-', rebuild: () => buildPanel() }), oc()));
  s.appendChild(el('span', 'note', MODEL_NOTE[o.colorModel]));
  s.appendChild(makeControl(o, R('margin', 'Margin', 0, 0.2, 0.01, { idp: 'o-' }), () => { rebuildPhotoView(); compose(); queueHistory(); scheduleText(); }));
  const widths = [[1200, '1200 px'], [1600, '1600 px'], [2400, '2400 px'], [3600, '3600 px']];
  if (!widths.some((w) => w[0] === o.width)) widths.push([o.width, o.width + ' px']);
  const wchg = () => { rebuildPhotoView(); compose(); queueHistory(); scheduleText(0); thumbsSoon(); statusIdle(); };
  s.appendChild(makeControl(o, Object.assign(S('width', 'Artboard width', widths), { idp: 'o-', rebuild: () => buildPanel() }), wchg));
  const cw = el('div', 'row2');
  let wTimer = null;
  cw.appendChild(numInput('Exact width', o.width, (v) => { clearTimeout(wTimer); wTimer = setTimeout(() => { o.width = clamp(Math.round(v), 200, 12000); wchg(); }, 500); }, { min: 200, max: 12000, unit: 'px' }));
  s.appendChild(cw);
  s.appendChild(el('span', 'note', 'Letter sizes are in artboard pixels. While you work, a smaller preview is drawn; exports always use the full artboard. The height follows the photo or crop.'));
  s = sec(p, 'Preview');
  s.appendChild(makeControl(o, Object.assign(S('mock', 'Show on', [['artboard', 'Artboard'], ['paper', 'Paper'], ['shirt', 'T-shirt']]), { idp: 'o-', rebuild: () => {
    // the shirt preview starts from the paper color, so what you see is what the letters were chosen for
    if (o.mock === 'shirt') o.shirt = o.paper;
    buildPanel(); compose();
  } }), () => compose()));
  if (o.mock !== 'artboard') s.appendChild(el('span', 'note', 'Zoom with Ctrl and the wheel or the buttons below. Drag to move around. Drawing tools work on the Artboard view.'));
  s.appendChild(makeControl(o, R('mixPhoto', 'Photo strength in Mix view', 0.05, 1, 0.05, { idp: 'o-' }), () => compose()));
  s = sec(p, 'Print');
  const pchg = () => { updatePrint(); layoutStage(); queueHistory(); };
  const pr = el('div', 'ctl');
  const lab = el('label', 'lab', 'Print size'); lab.htmlFor = 'c-print';
  const sl = el('select'); sl.id = 'c-print';
  PRINT_GROUPS.forEach(([g, sizes]) => {
    const og = el('optgroup'); og.label = g;
    Object.keys(sizes).forEach((k) => { const op = el('option', null, k); op.value = k; if (k === o.print) op.selected = true; og.appendChild(op); });
    sl.appendChild(og);
  });
  const cop = el('option', null, 'Custom size…'); cop.value = CUSTOM_PRINT; if (o.print === CUSTOM_PRINT) cop.selected = true; sl.appendChild(cop);
  sl.onchange = () => { o.print = sl.value; buildPanel(); pchg(); };
  pr.append(lab, sl); s.appendChild(pr);
  if (o.print === CUSTOM_PRINT) {
    const row = el('div', 'row2');
    const f = { mm: 1, cm: 10, in: 25.4 }[o.printUnit] || 1;
    let t = null; const later = (fn) => { clearTimeout(t); t = setTimeout(() => { fn(); pchg(); }, 350); };
    row.append(numInput('Width', +(o.printW / f).toFixed(2), (v) => later(() => { o.printW = clamp(v * f, 10, 5000); }), { min: 0.5, max: 5000, unit: o.printUnit }),
      numInput('Height', +(o.printH / f).toFixed(2), (v) => later(() => { o.printH = clamp(v * f, 10, 5000); }), { min: 0.5, max: 5000, unit: o.printUnit }));
    s.appendChild(row);
    s.appendChild(makeControl(o, Object.assign(S('printUnit', 'Units', [['mm', 'mm'], ['cm', 'cm'], ['in', 'inches']]), { idp: 'o-', rebuild: () => buildPanel() }), () => {}));
  }
  s.appendChild(makeControl(o, Object.assign(S('orient', 'Page', [['auto', 'Fit the art'], ['portrait', 'Portrait'], ['landscape', 'Landscape']]), { idp: 'o-', rebuild: () => buildPanel() }), pchg));
  s.appendChild(makeControl(o, R('printRot', 'Turn the art on the page', -180, 180, 1, { idp: 'o-' }), () => { o.printRot = Math.round(o.printRot); pchg(); }));
  const rq = el('div', 'row2 quick');
  [-90, -45, 0, 45, 90, 180].forEach((a) => { const b = el('button', 'mini-btn', (a > 0 ? '+' : '') + a + '°'); b.type = 'button'; b.setAttribute('aria-pressed', String((o.printRot || 0) === a)); b.onclick = () => { o.printRot = a; buildPanel(); pchg(); }; rq.appendChild(b); });
  s.appendChild(rq);
  const mrow = el('div', 'row2');
  mrow.appendChild(numInput('Page margin', o.pageMargin == null ? '' : o.pageMargin, (v) => { o.pageMargin = clamp(v, 0, 300); pchg(); }, { min: 0, max: 300, step: 1, unit: 'mm' }));
  const auto = optBtn('Auto', () => { o.pageMargin = null; buildPanel(); pchg(); }); auto.classList.add('btn-quiet'); auto.setAttribute('aria-pressed', String(o.pageMargin == null)); mrow.appendChild(auto);
  s.appendChild(mrow);
  // resolution: the common choices as buttons, and any number in the field
  const dl = el('span', 'lab', 'Resolution (dpi)'); dl.id = 'c-dpi-l';
  const dseg = el('div', 'seg'); dseg.setAttribute('role', 'group'); dseg.setAttribute('aria-labelledby', 'c-dpi-l');
  DPI_PRESETS.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(o.dpi === v)); b.onclick = () => { o.dpi = v; buildPanel(); pchg(); }; dseg.appendChild(b); });
  const dctl = el('div', 'ctl'); dctl.append(dl, dseg); s.appendChild(dctl);
  const drow = el('div', 'row2'); let dT = null;
  drow.appendChild(numInput('Any dpi', o.dpi, (v) => { clearTimeout(dT); dT = setTimeout(() => { o.dpi = clamp(Math.round(v), 30, 2400); buildPanel(); pchg(); }, 500); }, { min: 30, max: 2400, step: 1, unit: 'dpi' }));
  s.appendChild(drow);
  s.appendChild(el('span', 'note', DPI_NOTE(o.dpi)));
  const hb = el('button', 'mini-btn', 'Which dpi should I use?'); hb.type = 'button'; hb.onclick = () => openHelp('printing'); s.appendChild(hb);
  const po = el('div', 'print'); po.id = 'printOut'; s.appendChild(po);
  updatePrint();
  s = sec(p, 'Performance');
  s.appendChild(makeControl(o, T('gentle', 'Gentle on this computer', { idp: 'o-' }), () => {}));
  s.appendChild(el('span', 'note', 'Works in shorter bursts with longer rests, so other apps stay fast. Results take a little longer.'));
}
/* When the new paper hides a layer's ink (navy letters on black paper, say), switch that ink to one that shows, and say so. */
function luminanceOf(hex) { const c = C.parseColor(hex); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
function contrastOf(a, b) { const x = luminanceOf(a), y = luminanceOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function inkForPaper() {
  const paper = doc.out.paper, dark = isDarkHex(paper), fixed = [];
  doc.text.layers.forEach((L) => {
    if (!['ink', 'duotone'].includes(L.color) || !L.inkColor) return;
    if (contrastOf(L.inkColor, paper) >= 2.2) return;
    fixed.push(MODES[L.mode] ? MODES[L.mode].name : L.mode);
    L.inkColor = dark ? '#f2efe6' : '#14213d';
  });
  if (fixed.length) toast('Changed the ink of ' + fixed.join(', ') + ' to ' + (dark ? 'light' : 'dark') + ', so it shows on this paper', { label: 'Undo', fn: undo });
  return fixed.length > 0;
}
/* a one-line hint for the chosen resolution; the Printing help page has the details and sources */
function DPI_NOTE(d) {
  if (d < 100) return d + ' dpi: only for screens. A screen ignores dpi and shows pixels, so this does not make anything sharper or softer there.';
  if (d < 200) return d + ' dpi: posters and banners seen from a few steps away, and the usual minimum for T-shirt printing.';
  if (d < 400) return d + ' dpi: the common choice for prints seen up close, such as photos, books, flyers and cards.';
  return d + ' dpi: fine line art and small text on some printers. Ask your printer first: most photo prints gain nothing above 300.';
}
const MAX_PRINT_PX = 9000;
function printPaper() {
  const o = doc.out;
  if (o.print === CUSTOM_PRINT) return [Math.min(o.printW, o.printH), Math.max(o.printW, o.printH), undefined, o.printW > o.printH];
  return PRINTS[o.print] || PRINTS.A3;
}
function printGeom() {
  const o = doc.out, P = printPaper();
  const [a, b] = P;
  const g = artGeom(1);
  const ar = g.TW / g.TH;
  const rot = ((o.printRot || 0) % 360) * Math.PI / 180, c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
  // how wide and tall the turned artwork is, per unit of its own width
  const bw = c + sn / ar, bh = sn + c / ar;
  const land = o.orient === 'landscape' ? true : o.orient === 'portrait' ? false : bw >= bh;
  const pw = land ? Math.max(a, b) : Math.min(a, b), ph = land ? Math.min(a, b) : Math.max(a, b);
  const m = o.pageMargin != null ? Math.min(o.pageMargin, Math.min(pw, ph) * 0.45) : P[2] === 0 ? 0 : 0.06 * Math.min(pw, ph);
  const aw = Math.max(1, Math.min((pw - 2 * m) / bw, (ph - 2 * m) / bh)), ah = aw / ar;
  const want = Math.round(aw / 25.4 * o.dpi);
  const needPx = Math.min(want, Math.round(MAX_PRINT_PX * Math.min(1, ar)));
  return { pw, ph, aw, ah, x: (pw - aw) / 2, y: (ph - ah) / 2, m, land, rot: o.printRot || 0, needPx, needH: Math.round(needPx / ar), capped: needPx < want,
    realDpi: Math.round(needPx / (aw / 25.4)), TW: g.TW, TH: g.TH, name: o.print === CUSTOM_PRINT ? Math.round(a) + ' × ' + Math.round(b) + ' mm' : o.print };
}
function updatePrint() {
  const box = document.getElementById('printOut');
  if (!box || !origImg) return;
  const g = printGeom();
  const sub = el('div', 'print-sub');
  sub.appendChild(el('div', null, g.name + ', ' + (g.land ? 'landscape' : 'portrait') + (g.m > 0.5 ? ', ' + Math.round(g.m) + ' mm margins' : ', no margin') + (g.rot ? ', art turned ' + g.rot + '°' : '') + '.'));
  sub.appendChild(el('div', null, 'Needs ' + g.needPx.toLocaleString() + ' × ' + g.needH.toLocaleString() + ' px at ' + g.realDpi + ' dpi. Print exports use exactly that size.'));
  if (g.capped) sub.appendChild(el('div', 'warn', 'That is more than ' + MAX_PRINT_PX.toLocaleString() + ' px, the largest SungFluence draws, so print exports use ' + g.realDpi + ' dpi at this size.'));
  if (g.rot) sub.appendChild(el('div', null, 'The turned art shows on the Paper preview and in the PDF for print. PNG files and the CMYK PDF keep the art straight.'));
  if (out) {
    const k = 1 / (out.W / g.TW);
    out.layers.forEach((L) => {
      if (!L.grid) return;
      const pt = L.grid.size * k * (g.aw / g.TW) / 0.3528;
      sub.appendChild(el('div', pt < 4 ? 'warn' : null, MODES[L.mode].name + ': ' + L.grid.cols + ' × ' + L.grid.rows + ' characters at ' + pt.toFixed(1) + ' pt' + (pt < 4 ? ', which reads as texture rather than letters.' : '.')));
    });
  }
  if (doc.out.transparent) sub.appendChild(el('div', 'ok', 'Transparent background: kept clear in PNG, SVG, PDF and the text outputs. JPG cannot be transparent, so a JPG gets the ' + (doc.out.mock === 'shirt' ? 'T-shirt' : 'paper') + ' color (' + doc.out.paper + ') behind the letters. Change that color above to choose it.'));
  box.replaceChildren(el('div', 'print-big', Math.round(g.aw) + ' × ' + Math.round(g.ah) + ' mm'), sub);
}
function updatePalette() {
  const box = document.getElementById('paletteOut');
  if (!box || !out) return;
  const L = curLayer();
  const r = out.layers.find((x) => x.id === L.id);
  box.replaceChildren();
  if (!r || !r.palette) return;
  r.palette.forEach((h, idx) => {
    // a color input styled as a chip: click to choose another color for this ink
    const lab = el('label', 'ink-chip'); lab.title = 'Click to change this ink';
    const inp = el('input'); inp.type = 'color'; inp.value = h.length === 7 ? h : '#000000'; inp.setAttribute('aria-label', 'Ink ' + (idx + 1) + ', ' + h);
    inp.style.background = h;
    inp.onchange = () => { L.inkSwap = (L.inkSwap || []).slice(); L.inkSwap[idx] = inp.value; queueHistory(); scheduleText(0); };
    lab.appendChild(inp); box.appendChild(lab);
  });
  if (L.inkSwap && L.inkSwap.some(Boolean)) {
    const rb = el('button', 'mini-btn', 'Use the found inks'); rb.type = 'button';
    rb.onclick = () => { L.inkSwap = null; queueHistory(); scheduleText(0); };
    box.appendChild(rb);
  }
  box.appendChild(el('span', 'note', 'Click an ink to choose another color. ' + r.palette.join('  ')));
}

/* ---------------- text library sheet ---------------- */
const libState = { tab: 'words', focus: 'Positive', checked: { words: new Set(['Positive']), phrases: new Set(['Positive']), chars: new Set(['Capital letters']) }, shuffle: true, count: 24, length: 60, target: null };
function openLibrary(target) {
  libState.target = target;
  if (target.kind === 'glyphs') libState.tab = 'chars';
  renderLibrary();
  $('libScrim').hidden = false;
  const f = $('library').querySelector('button'); if (f) f.focus();
}
function closeLibrary() { $('libScrim').hidden = true; }
$('libScrim').addEventListener('click', (e) => { if (e.target === $('libScrim')) closeLibrary(); });
function libItems() {
  const kind = libState.tab, sets = [...libState.checked[kind]];
  if (kind === 'chars') {
    const pool = Array.from(sets.map((n) => LIB.chars[n] || '').join(''));
    if (!pool.length) return [];
    let a = Date.now() % 2147483647 || 7;
    const Rn = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
    return Array.from({ length: libState.length }, () => pool[Math.floor(Rn() * pool.length)]);
  }
  let items = [].concat(...sets.map((n) => LIB[kind][n] || []));
  items = [...new Set(items)];
  if (libState.shuffle) for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items.slice(0, libState.count);
}
function libResult() {
  const items = libItems(), t = libState.target;
  if (libState.tab === 'chars') return t && t.kind === 'list' ? items.join('\n') : items.join(t && t.kind === 'glyphs' ? '' : ' ');
  if (t && t.kind === 'list') return items.join('\n');
  return items.join(libState.tab === 'phrases' ? ' · ' : ' ');
}
function renderLibrary() {
  const sh = $('library'); sh.replaceChildren();
  const kind = libState.tab;
  const head = el('div', 'sheet-h');
  const h2 = el('h2', null, 'Text library'); h2.id = 'libTitle';
  const close = el('button', 'btn btn-quiet', 'Close'); close.type = 'button'; close.onclick = closeLibrary;
  head.append(h2, close);
  const tabs = el('div', 'sheet-tabs');
  tabs.appendChild(optSeg([['words', 'Words'], ['phrases', 'Phrases'], ['chars', 'Characters']], kind, (v) => { libState.tab = v; libState.focus = Object.keys(LIB[v])[0]; renderLibrary(); }, 'Library section'));
  if (kind !== 'chars') {
    const shf = el('label', 'switch'); shf.style.gap = '8px'; const cb = el('input'); cb.type = 'checkbox'; cb.checked = libState.shuffle; cb.setAttribute('role', 'switch'); cb.onchange = () => { libState.shuffle = cb.checked; renderLibrary(); }; shf.append(el('span', null, 'Shuffle'), cb);
    tabs.append(shf, optRange('How many', 4, 80, 1, libState.count, (v) => String(v), (v) => { libState.count = v; updLibPreview(); }));
  } else tabs.appendChild(optRange('Length', 4, 400, 1, libState.length, (v) => String(v), (v) => { libState.length = v; updLibPreview(); }));
  const body = el('div', 'sheet-body');
  const sets = el('div', 'sets');
  Object.keys(LIB[kind]).forEach((name) => {
    const row = el('div', 'set'); row.setAttribute('aria-current', String(libState.focus === name));
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = libState.checked[kind].has(name); cb.setAttribute('aria-label', 'Use ' + name);
    cb.onchange = () => { cb.checked ? libState.checked[kind].add(name) : libState.checked[kind].delete(name); updLibPreview(); };
    const b = el('button', null, name); b.type = 'button'; b.onclick = () => { libState.focus = name; renderLibrary(); };
    const n = kind === 'chars' ? Array.from(LIB.chars[name]).length : LIB[kind][name].length;
    row.append(cb, b, el('small', null, String(n)));
    sets.appendChild(row);
  });
  const addSet = el('button', 'mini-btn', '+ New set'); addSet.type = 'button'; addSet.style.margin = '8px';
  addSet.onclick = () => { let i = 1; while (LIB[kind]['My set ' + i]) i++; const nm = 'My set ' + i; LIB[kind][nm] = kind === 'chars' ? '' : []; libState.focus = nm; libState.checked[kind].add(nm); saveLibrary(LIB); renderLibrary(); };
  sets.appendChild(addSet);
  const items = el('div', 'items');
  const name = libState.focus in LIB[kind] ? libState.focus : Object.keys(LIB[kind])[0];
  const builtIn = name in LIB_DEFAULT[kind];
  const ih2 = el('div', 'sec-h'); ih2.appendChild(el('span', 'sec-t', name));
  const acts = el('div', 'row2');
  if (builtIn) { const rs = el('button', 'mini-btn', 'Reset'); rs.type = 'button'; rs.onclick = () => { LIB[kind][name] = JSON.parse(JSON.stringify(LIB_DEFAULT[kind][name])); saveLibrary(LIB); renderLibrary(); }; acts.appendChild(rs); }
  else { const dl = el('button', 'mini-btn', 'Delete set'); dl.type = 'button'; dl.onclick = () => { delete LIB[kind][name]; libState.checked[kind].delete(name); libState.focus = Object.keys(LIB[kind])[0]; saveLibrary(LIB); renderLibrary(); }; acts.appendChild(dl); }
  ih2.appendChild(acts);
  items.appendChild(ih2);
  if (kind === 'chars') {
    const ta = el('textarea', 'field'); ta.value = LIB.chars[name]; ta.rows = 3; ta.style.fontSize = '18px'; ta.setAttribute('aria-label', 'Characters in ' + name);
    ta.oninput = () => { LIB.chars[name] = ta.value.replace(/\s+/g, ''); saveLibrary(LIB); updLibPreview(); };
    items.append(ta, el('span', 'note', 'Type or paste any characters. The generator picks from every ticked set at random.'));
  } else {
    const chips = el('div', 'chips');
    LIB[kind][name].forEach((w, i) => {
      const c = el('span', 'chip', w);
      const x = el('button'); x.type = 'button'; x.innerHTML = '&times;'; x.setAttribute('aria-label', 'Remove ' + w);
      x.onclick = () => { LIB[kind][name].splice(i, 1); saveLibrary(LIB); renderLibrary(); };
      c.appendChild(x); chips.appendChild(c);
    });
    items.appendChild(chips);
    const add = el('input', 'field'); add.type = 'text'; add.placeholder = kind === 'words' ? 'Add a word, press Enter' : 'Add a phrase, press Enter'; add.setAttribute('aria-label', 'Add to ' + name);
    add.onkeydown = (e) => { if (e.key === 'Enter' && add.value.trim()) { e.preventDefault(); add.value.split(/[,\n]+/).map((v) => v.trim()).filter(Boolean).forEach((v) => LIB[kind][name].push(v)); saveLibrary(LIB); renderLibrary(); const a2 = $('library').querySelector('.items input.field'); if (a2) a2.focus(); } };
    items.appendChild(add);
    items.appendChild(el('span', 'note', 'Tick sets on the left to mix them. Your changes are saved on this device.'));
  }
  body.append(sets, items);
  const foot = el('div', 'sheet-f');
  const pv = el('div', 'preview-text'); pv.id = 'libPreview';
  const t = libState.target;
  const use = optBtn(t ? 'Use for ' + t.label : 'Use', () => libApply(false), true);
  const addTo = optBtn('Add to current text', () => libApply(true));
  const btns = el('div', 'row2'); btns.append(addTo, use);
  foot.append(pv, btns);
  sh.append(head, tabs, body, foot);
  updLibPreview();
}
function updLibPreview() { const pv = document.getElementById('libPreview'); if (pv) pv.textContent = libResult() || 'Tick at least one set.'; }
function libApply(append) {
  const t = libState.target; if (!t) { closeLibrary(); return; }
  const v = libResult();
  if (!v) { toast('Tick at least one set first.'); return; }
  const sep = t.kind === 'list' ? '\n' : t.kind === 'glyphs' ? '' : ' · ';
  t.obj[t.key] = append && t.obj[t.key] ? t.obj[t.key] + sep + v : v;
  closeLibrary(); buildPanel(); queueHistory();
  if (doc.lines.paths.includes(t.obj)) linesChanged(); else scheduleText(0);
  toast('Text updated', { label: 'Undo', fn: undo });
}
