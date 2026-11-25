/* ===================== Part 4: inspector, panels, controls, library ===================== */
const SVGI = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const EYE = SVGI('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>');
const TRASH = SVGI('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>');
const UP = SVGI('<path d="M12 19V5M6 11l6-6 6 6"/>');
const DUP = SVGI('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>');
const RESET_ICON = SVGI('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>');
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
/* A new photo makes an open toast about the old one (Applied a recipe, Undo) out of date */
function dismissToast() { clearTimeout(toastTimer); $('toast').hidden = true; }
/* a toast with a button is showing: it offers a next step, so a hint that would replace it waits */
const toastBusy = () => { const t = $('toast'); return !t.hidden && !!t.querySelector('button'); };

/* ---------------- views and tabs ----------------
   The eyes in the layer stack decide what shows. The three views are quick presets that set those eyes. */
function setView(v) {
  ui.textWhenDrawn = false;
  if (v === 'photo') { doc.photo.visible = true; doc.text.visible = false; }
  else if (v === 'mix') { doc.photo.visible = true; doc.text.visible = true; }
  else if (v === 'text') { doc.text.visible = true; doc.photo.visible = false; }
  ui.view = v;
  if (v !== 'mix') toggleMixPop(false);
  buildStack(); compose();
}
function syncViewSeg() {
  const p = doc.photo.visible, t = doc.text.visible && doc.text.applied;
  ui.view = p && !t ? 'photo' : t && !p ? 'text' : p && t ? (ui.view === 'mix' ? 'mix' : 'layers') : 'none';
  document.querySelectorAll('#viewSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === ui.view)));
  const mb = document.querySelector('#viewSeg [data-view="mix"]');
  if (mb) mb.title = ui.view === 'mix' ? 'Click to set how strongly the photo shows' : 'Text art over a faded photo (2). Click again to set how strongly the photo shows';
}
document.querySelectorAll('#viewSeg button').forEach((b) => { b.onclick = (e) => {
  if ((b.dataset.view !== 'photo') && !doc.text.applied) { applyTextArt(); return; }
  // Mix again, once it is on: how strongly the photo shows under the text art
  if (b.dataset.view === 'mix' && ui.view === 'mix') { toggleMixPop(undefined, e.detail === 0); return; }
  setView(b.dataset.view);
}; });
/* The small window under the Mix button: Photo strength in Mix view */
function toggleMixPop(force, keyboard) {
  let m = document.getElementById('mixPop');
  const btn = document.querySelector('#viewSeg [data-view="mix"]');
  const show = force === undefined ? !(m && !m.hidden) : force;
  if (!show) { if (m) m.hidden = true; if (btn) btn.setAttribute('aria-expanded', 'false'); return; }
  if (!m) {
    m = el('div', 'dropmenu mix-pop'); m.id = 'mixPop'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Mix view');
    document.body.appendChild(m);
    document.addEventListener('pointerdown', (e) => { if (!m.hidden && !m.contains(e.target) && !(btn && btn.contains(e.target))) toggleMixPop(false); });
    // Esc closes it wherever the focus is, before any other Esc (a tool, a selection) sees the key
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.hidden) { e.stopPropagation(); e.preventDefault(); const back = m.contains(document.activeElement); toggleMixPop(false); if (back && btn) btn.focus(); } }, true);
  }
  m.replaceChildren(el('div', 'menu-h', 'Mix view'));
  const sl = optRange('Photo strength', 0.05, 1, 0.05, doc.out.mixPhoto, (v) => Math.round(v * 100) + '%', (v) => { doc.out.mixPhoto = v; compose(); queueHistory(); });
  sl.classList.add('menu-range'); sl.querySelector('input').id = 'mixPhoto';
  m.append(sl, el('p', 'note', 'How strongly the photo shows under the text art. Only the screen changes.'));
  m.hidden = false;
  if (btn) {
    btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect();
    m.style.top = Math.round(r.bottom + 6) + 'px';
    m.style.left = Math.round(Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.left + r.width / 2 - m.offsetWidth / 2))) + 'px';
  }
  if (keyboard) sl.querySelector('input').focus();
}
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
  if (c.key === 'scale' && c.idp === 'rp-') return Math.round(v) + '%';   // Step and repeat: already in percent
  if (['posterize', 'pixelate'].includes(c.key) && v < (c.key === 'posterize' ? 2 : 1)) return 'Off';
  if (c.key === 'threshold' && c.idp === 'p-' && v <= 0) return 'Off';
  if (['opacity', 'vertical', 'detail', 'jitter', 'margin', 'mixPhoto', 'tol', 'threshold', 'amount', 'sepia', 'vignette', 'grain', 'bulge', 'warpX', 'warpY', 'warpR', 'shadows', 'highlights', 'fade', 'inner', 'alpha', 'alphaTone', 'colorLift', 'r0', 'r1', 'scale', 'textScale', 'fillShow', 'fillPop', 'shadowAlpha', 'fillSheetSee'].includes(c.key) && !(c.max > 5)) return Math.round(v * 100) + '%';
  if (c.key === 'fillSoft') return (v * 100).toFixed(1) + '%';
  if (c.step >= 1) return String(Math.round(v));
  // a value between the tenths, such as 1.05, shows both decimals instead of rounding to 1.1
  return Number(v).toFixed(c.step < 0.05 || Math.abs(v * 10 - Math.round(v * 10)) > 1e-6 ? 2 : 1);
}
/* Puts a mark around whatever is selected in a text box, or takes it away again. */
function wrapMark(input, mark, obj, key, live) {
  const v = input.value, a = input.selectionStart ?? v.length, b = input.selectionEnd ?? a;
  let sel = v.slice(a, b);
  if (!sel) { toast('Select the words you want to change first.'); input.focus(); return; }
  const had = sel.startsWith(mark) && sel.endsWith(mark) && sel.length > mark.length * 2;
  sel = had ? sel.slice(mark.length, -mark.length) : mark + sel + mark;
  input.value = v.slice(0, a) + sel + v.slice(b);
  obj[key] = input.value;
  input.focus();
  input.setSelectionRange(a, a + sel.length);
  live(250);
}
/* A layer whose sizes follow the artboard (pxW, see BASE_W) shows them in pixels of the artboard as it is now */
function sizesToWidth(L) {
  if (!L || !(L.pxW > 0) || L.pxW === doc.out.width) return;
  const f = doc.out.width / L.pxW;
  PX_CTL.forEach((k) => { if (typeof L[k] === 'number') L[k] = +(L[k] * f).toFixed(2); });
  L.pxW = doc.out.width;
}
/* A pixel slider covers the same share of the artboard at any width: its range is set for BASE_W */
function pxRange(obj, c) {
  if (c.type !== 'range' || !PX_CTL.includes(c.key) || !obj || !obj.mode || doc.out.width === BASE_W) return c;
  const f = doc.out.width / BASE_W;
  return Object.assign({}, c, { min: +(c.min * f).toFixed(1), max: Math.round(c.max * f), hardMax: Math.round(hardMaxOf(c) * f) });
}
function makeControl(obj, c, after) {
  if (c.show && !c.show(obj)) return null;
  // with the silhouette on, the photo is already two-tone and the silhouette decides the shape
  if (c.key === 'threshold' && silDecides(obj)) return null;
  c = pxRange(obj, c);
  if (c.type === 'note') {
    // a live note says something about the last result, and changes when the art is made again
    if (!c.live) return qnote(c);
    const n = el('span', 'note', c.live(obj) || '');
    n.dataset.live = '1'; n.__live = () => c.live(obj); n.hidden = !n.textContent;
    return n;
  }
  const id = 'c-' + (c.idp || '') + c.key;
  const w = el('div', 'ctl');
  const live = after || ((d) => { queueHistory(); scheduleText(d); });
  if (c.type === 'range') {
    const row = el('div', 'ctl-row');
    const lab = el('label', null, c.label); lab.htmlFor = id;
    const typed = typedCtl(c), hi = hardMaxOf(c);
    // a size in pixels also gets a box to type into, so the slider's top end is not a ceiling
    const val = typed ? el('input', 'val val-num') : el('span', 'val', fmt(c, obj[c.key]));
    const inp = el('input'); inp.type = 'range'; inp.id = id; inp.min = c.min; inp.max = c.max; inp.step = c.step;
    inp.value = Math.min(c.max, obj[c.key]);
    // a size set by hand stays as it is when the artboard width changes
    const own = () => { if (PX_CTL.includes(c.key) && obj.mode && obj.pxW > 0) { sizesToWidth(obj); obj.pxW = null; } };
    const show = () => { if (typed) { val.value = String(+(+obj[c.key]).toFixed(2)); inp.value = Math.min(c.max, obj[c.key]); } else val.textContent = fmt(c, obj[c.key]); };
    if (typed) {
      val.type = 'number'; val.id = id + '-n'; val.min = c.min; val.max = hi; val.step = c.step; val.value = String(+(+obj[c.key]).toFixed(2));
      val.setAttribute('aria-label', c.label + ' in pixels');
      val.oninput = () => { if (val.value === '' || !isFinite(+val.value)) return; own(); obj[c.key] = clamp(+val.value, c.min, hi); inp.value = Math.min(c.max, obj[c.key]); live(); };
      val.onblur = show;
    }
    inp.oninput = () => { own(); obj[c.key] = +inp.value; show(); live(); if (c.key === 'opacity') buildLayers(); };
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
    if (c.type === 'colormode' && !['image', 'fill', 'palette'].includes(obj.color)) w.appendChild(inkPicker(obj, 'inkColor', obj.color === 'duotone' ? 'Shadows' : 'Ink'));
    if (c.type === 'colormode' && obj.color === 'palette') w.appendChild(palettePicker(obj, after));
    if (c.type === 'colormode' && obj.color === 'duotone') w.appendChild(inkPicker(obj, 'inkColor2', 'Highlights'));
    if (c.type === 'colormode' && obj.color === 'image') {
      // the photo's own colors: averaged under each letter or made stronger
      const box = el('div', 'sub-ctl');
      [T('colorAvg', 'Average the color under each letter'), R('saturation', 'Color strength', 0, 2.5, 0.05)]
        .forEach((cc) => { const n = makeControl(obj, cc, after); if (n) box.appendChild(n); });
      w.appendChild(box);
    }
    if (c.type === 'colormode' && obj.color !== 'fill') w.appendChild(fitControl(obj, after));
  } else if (c.type === 'angles') {
    // a row of angles that can be ticked together, so some words lie flat and others stand up
    const lab = el('span', 'lab', c.label); lab.id = id + '-l';
    const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-labelledby', id + '-l');
    (c.options || []).forEach((a) => {
      const cur = Array.isArray(obj[c.key]) ? obj[c.key] : [0];
      const on = cur.includes(a);
      const b = el('button', null, (a > 0 ? '+' : '') + a + '°'); b.type = 'button'; b.setAttribute('aria-pressed', String(on));
      b.title = on ? 'Stop using this angle' : 'Also use this angle';
      b.onclick = () => {
        const now = (Array.isArray(obj[c.key]) ? obj[c.key] : [0]).slice();
        const i = now.indexOf(a);
        if (i >= 0) { if (now.length > 1) now.splice(i, 1); } else now.push(a);
        obj[c.key] = now.sort((x, y) => x - y);
        buildPanel(); live(0);
      };
      seg.appendChild(b);
    });
    w.append(lab, seg);
    // what turns depends on the style: letters in the letter styles, words in the word styles
    const piece = c.key !== 'turnSet' || ['mosaic', 'cloud'].includes(obj.mode) ? 'word' : (obj.turnSplit || ['rows', 'grid', 'unicode', 'halftone', 'typewriter', 'spiral'].includes(obj.mode)) ? 'letter' : 'piece';
    if ((Array.isArray(obj[c.key]) ? obj[c.key] : []).length > 1) w.appendChild(el('span', 'note', 'Each ' + piece + ' takes one of these angles at random.'));
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
      w.append(t, qnote('Type characters in any order.', 'SungFluence measures the ink in each one and sorts them.'));
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
    if (['text', 'words'].includes(c.key) && obj.emph !== false) {
      // Ctrl B and Ctrl I put the marks around what is selected, the same marks anyone can type
      t.addEventListener('keydown', (e) => {
        const m = e.ctrlKey || e.metaKey;
        if (!m || e.altKey) return;
        const k = e.key.toLowerCase();
        const mark = k === 'b' ? '**' : k === 'i' ? '*' : k === 'u' ? '__' : null;
        if (!mark) return;
        e.preventDefault(); e.stopPropagation();
        wrapMark(t, mark, obj, c.key, live);
      });
    }
    if (['text', 'words'].includes(c.key)) {
      const tools = el('div', 'row2');
      if (obj.emph !== false) [['**', 'B', 'Bold (' + MOD + ' B)'], ['*', 'I', 'Italic (' + MOD + ' I)'], ['__', 'U', 'A line under (' + MOD + ' U)']].forEach(([mk, name, title]) => {
        const b = el('button', 'mini-btn mark-btn', name); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title);
        if (name === 'I') b.style.fontStyle = 'italic';
        if (name === 'B') b.style.fontWeight = '800';
        if (name === 'U') b.style.textDecoration = 'underline';
        b.onclick = () => wrapMark(t, mk, obj, c.key, live);
        tools.appendChild(b);
      });
      const tb = el('button', 'mini-btn', 'Type toolbox'); tb.type = 'button';
      tb.title = 'Styled letters, symbols, faces and decorations';
      tb.onclick = () => openTypeBox({ obj, key: c.key, kind: c.key === 'words' ? 'list' : (obj.mode === 'halftone' ? 'glyphs' : 'text'), label: MODES[obj.mode] ? MODES[obj.mode].name : 'line' });
      tools.appendChild(tb);
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
    // on a text art layer: marks on or off, with what they are behind a "?"
    if (c.hint) w.appendChild(qnote(c.hint));
    if (['text', 'words'].includes(c.key) && obj.mode && MODES[obj.mode] && obj.mode !== 'halftone') w.appendChild(marksRow(obj, live));
  } else if (c.type === 'ink') {
    w.appendChild(c.key === 'fillSheet' ? inkPicker(obj, c.key, c.label, after, sheetShown(obj)) : inkPicker(obj, c.key, c.label));
  } else if (c.type === 'palette') {
    const p = el('div', 'palette'); p.id = 'paletteOut';
    w.append(el('span', 'note', 'Each ink is one screen or one print run.'), p);
  } else if (c.type === 'printon') {
    const lab = el('span', 'lab', c.label);
    const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', c.label);
    const dark = isDarkHex(doc.out.paper);
    [['dark', 'White on dark'], ['light', 'Black on light']].forEach(([v, t]) => {
      const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String((v === 'dark') === dark));
      b.onclick = () => { setPrintOn(v, obj); };
      seg.appendChild(b);
    });
    w.append(lab, seg);
  }
  // the silhouette belongs to the shape of Word cloud and Calligram, when that shape comes from the photo
  if (c.key === 'maskSource' && SIL_MODES.includes(obj.mode) && (obj.maskSource === 'image' || obj.maskSource === 'cutout')) w.appendChild(silhouetteControls());
  return w;
}
function setPrintOn(v, L) {
  doc.out.paper = v === 'dark' ? FLAGSHIP_PAPER : '#ffffff'; doc.out.printedOn = 'auto';
  if (L) { L.color = 'ink'; L.inkColor = v === 'dark' ? '#ffffff' : '#111111'; }
  if (doc.out.mock === 'shirt') doc.out.shirt = v === 'dark' ? '#1b1b1d' : '#f6f6f4';
  buildPanel(); compose(); queueHistory(); scheduleText(0);
}
/* ---------------- the paper the art is printed on ----------------
   SungFluence assumes the art is printed on light paper. Printed on says what the ground really is: Auto reads
   it from the paper color (or the T-shirt color on the T-shirt preview), or it is set by hand. paperClass() is
   the answer every part of the app uses, and the engine gets it in the scene, so the colors fit that paper. */
const PRINTED_ON = [['auto', 'Auto'], ['light', 'Light'], ['gray', 'Gray'], ['dark', 'Dark']];
function groundHex() { return doc.out.mock === 'shirt' ? (doc.out.shirt || doc.out.paper) : doc.out.paper; }
function autoPaperClass() { return C.paperClassOf(groundHex()); }
function paperClass() { const v = doc.out.printedOn; return v === 'light' || v === 'gray' || v === 'dark' ? v : autoPaperClass(); }
function setPrintedOn(v) {
  doc.out.printedOn = PRINTED_ON.some((q) => q[0] === v) ? v : 'auto';
  buildPanel(); compose(); queueHistory(); scheduleText(0);
}
function printedOnNote() {
  // a paper from the swatches is named, so Warm black is told apart from a black of your own
  const sw = doc.out.mock === 'shirt' ? null : PAPERS.find(([h]) => h === (doc.out.paper || '').toLowerCase());
  const what = doc.out.mock === 'shirt' ? 'your T-shirt color' : 'your paper' + (sw ? ' (' + sw[1] + ')' : ''), auto = autoPaperClass();
  if (!doc.out.printedOn || doc.out.printedOn === 'auto') return 'Auto: ' + what + ' reads as ' + auto + '. The letter colors are chosen to show on it.';
  return 'Set by hand to ' + paperClass() + (auto !== paperClass() ? '. Auto would read ' + what + ' as ' + auto + ', and the preview still shows its color.' : '.');
}
function printedOnRow() {
  const w = el('div', 'ctl'), cur = doc.out.printedOn || 'auto';
  const lab = el('span', 'lab', 'Printed on'); lab.id = 'po-l';
  const seg = el('div', 'seg'); seg.id = 'printedOn'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-labelledby', 'po-l');
  PRINTED_ON.forEach(([v, t]) => {
    const b = el('button', null, t); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-pressed', String(cur === v));
    b.onclick = () => setPrintedOn(v);
    seg.appendChild(b);
  });
  const n = qnote(printedOnNote(), null, 'printedOn'); n.id = 'printedOnNote';
  w.append(lab, seg, n);
  return w;
}
/* how each Show transparency as choice looks as a small swatch */
const TRANSP_SWATCH = { checker: 'repeating-conic-gradient(#b4b4bb 0 25%, #ffffff 0 50%) 0 0 / 6px 6px', black: '#000000', white: '#ffffff' };
/* one line on what the screen shows where the file stays clear */
function transpTip() {
  if (isMock()) return 'Clear in the file. The ' + (doc.out.mock === 'shirt' ? 'T-shirt' : 'sheet') + ' shows through on this preview.';
  const v = transpShow();
  return 'Clear in the file. Shown here as ' + (v === 'checker' ? 'a checkerboard' : v) + '; change that under View > Show transparency as.';
}
/* Show transparency as: Checkerboard, Black or White. Sits under the Transparent swatch while it is on.
   It changes the screen only, so it is a preference and not part of the project. */
function transpShowRow() {
  // the Paper and T-shirt previews show the sheet or the shirt through a clear background, so the choice waits
  const mock = isMock();
  const w = el('div', 'ctl transp-show'); w.title = mock ? 'The Paper and T-shirt previews show the sheet itself.' : 'Only the screen changes. Exported files stay clear.';
  const lab = el('span', 'lab', 'Show transparency as'); lab.id = 'ts-l';
  const seg = el('div', 'seg'); seg.id = 'transpShow'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-labelledby', 'ts-l');
  TRANSP_SHOW.forEach(([v, t]) => {
    const b = el('button'); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-pressed', String(transpShow() === v));
    const i = el('i'); i.style.background = TRANSP_SWATCH[v]; i.setAttribute('aria-hidden', 'true');
    b.append(i, document.createTextNode(t));
    if (mock) b.disabled = true;
    b.onclick = () => { setTranspShow(v); transpShown(); };
    seg.appendChild(b);
  });
  w.append(lab, seg);
  if (mock) w.append(el('span', 'note', 'The Paper and T-shirt previews show the sheet itself. To see this, set Show the art on to Artboard.'));
  return w;
}
/* Out of sight, as on a phone where the panel sits below the picture, a change would go unseen: say what changed. */
function transpShown() {
  const r = frame.getBoundingClientRect(), vh = window.innerHeight || 0;
  if (r.bottom > 40 && r.top < vh - 40) return;
  const v = transpShow();
  toast('Clear areas now show as ' + (v === 'checker' ? 'a checkerboard' : v) + '. Exported files stay clear.', { label: 'Show', fn: () => frame.scrollIntoView({ block: 'center', behavior: prefs.motion === 'off' ? 'auto' : 'smooth' }) });
}
/* The words on the chip under the artboard */
function paperNoteText() {
  if (doc.out.transparent) return 'Transparent background';
  return 'Made for printing on ' + (doc.out.mock === 'shirt' ? 'a ' + paperClass() + ' T-shirt' : paperClass() + ' paper');
}
function updatePaperNote() {
  const b = $('paperChip'); if (!b) return;
  const t = paperNoteText(), hide = !origImg;
  if (b.textContent !== t) b.textContent = t;
  if (b.hidden !== hide) b.hidden = hide;
  const tip = doc.out.transparent ? transpTip() + ' The letter colors are chosen for ' + paperClass() + ' paper. Click to change.'
    : 'SungFluence assumes the picture is printed on ' + paperClass() + ' paper and chooses the letter colors for it. Click to change.';
  if (b.title !== tip) b.title = tip;
  const sw = doc.out.transparent ? TRANSP_SWATCH[transpShow()] : groundHex();
  if (b.dataset.sw !== sw) { b.dataset.sw = sw; b.style.setProperty('--sheet-chip', sw); }
}
$('paperChip').onclick = () => runCommand('paper.settings');
/* Opens the Background section: in the Text art panel once there is text art, otherwise in Output */
function openPaperSettings() {
  ui.tab = doc.text.applied ? 'text' : 'output'; buildTabs(); buildPanel();
  const s = $('sec-paper'); if (!s) return;
  s.scrollIntoView({ block: 'start' });
  s.classList.remove('flash'); requestAnimationFrame(() => s.classList.add('flash'));
  const on = doc.out.transparent ? $('sw-clear') : s.querySelector('#printedOn [aria-pressed="true"]'); if (on) on.focus({ preventScroll: true });
}
/* When Fit colors changes nothing that shows, a word on why */
function fitNote(L) {
  if (!L || (L.colorFit || 'off') === 'off') return '';
  if (C.fillOn(L)) return 'The letters show the photo (Letter fill), so this setting does not change them. Set Letters show to Ink colors to see it.';
  const R = outOf(L), F = R && R.__fit;
  if (F && F.n > 0 && !F.moved) return 'Every color here already stands out from the paper, so nothing needed to change.';
  return '';
}
/* Fit colors to the paper, for one layer, with a word on what it does here */
function fitControl(obj, after) {
  const box = el('div', 'sub-ctl fit-ctl');
  box.appendChild(makeControl(obj, Object.assign({}, FIT_CTL, { idp: 'fit-', rebuild: () => buildPanel() }), after));
  const cls = paperClass(), fit = obj.colorFit || 'off';
  const text = fit === 'off' ? ['Off keeps the exact colors.', 'Even where they fade into the paper.']
    : cls === 'light' ? ['Pale colors get deeper, so they show.', 'On light paper, dark colors stay as they are, and every color keeps its hue.']
    : cls === 'dark' ? ['Dark colors get lighter, so they show.', 'On dark paper, light colors stay as they are, and every color keeps its hue.']
    : ['Colors near the gray paper move away from it.', 'Each one goes to the lighter or darker side, whichever reads better. Every color keeps its hue.'];
  box.appendChild(qnote(text[0], text[1], 'fit'));
  if (fit !== 'off') box.appendChild(makeControl(obj, { type: 'note', live: fitNote }));
  // a solid ink that the fitting changes: say so, and show what it prints as
  if (fit !== 'off' && ['ink', 'tone', 'duotone'].includes(obj.color)) {
    const keys = obj.color === 'duotone' ? ['inkColor', 'inkColor2'] : ['inkColor'];
    keys.forEach((k) => {
      const hex = obj[k] || (k === 'inkColor2' ? '#d9732e' : isDarkHex(doc.out.paper) ? '#f2efe6' : '#111111');
      const got = C.fitColor(hex, groundHex(), cls, fit);
      if (got.toLowerCase() === hex.toLowerCase()) return;
      const n = el('span', 'note fit-adjusted');
      const a = el('i', 'fit-chip'); a.style.background = hex;
      const b = el('i', 'fit-chip'); b.style.background = got;
      n.append(a, document.createTextNode(' ' + hex + ' prints as '), b, document.createTextNode(' ' + got + ' on this paper, so it shows. Choose Off to keep your exact ' + (k === 'inkColor2' ? 'highlight color.' : 'ink.')));
      box.appendChild(n);
    });
  }
  return box;
}
/* Ready sets of colors. The set is read across the tones of the photo, so it works as a gradient. */
function palettePicker(obj, after) {
  const live = after || ((d) => { queueHistory(); scheduleText(d); });
  const box = el('div', 'sub-ctl');
  const sel = el('select'); sel.id = 'c-palette'; sel.setAttribute('aria-label', 'Set of colors');
  C.PALETTE_NAMES.forEach((nm) => { const o = el('option', null, nm); o.value = nm; if ((obj.palette || 'Ink and gold') === nm) o.selected = true; sel.appendChild(o); });
  const own = el('option', null, 'My own colors'); own.value = '__own'; if (obj.paletteColors) own.selected = true; sel.appendChild(own);
  sel.onchange = () => {
    if (sel.value === '__own') obj.paletteColors = C.paletteColors({ palette: obj.palette }).slice();
    else { obj.paletteColors = null; obj.palette = sel.value; }
    buildPanel(); live(0);
  };
  const lab = el('label', 'lab', 'Set of colors'); lab.htmlFor = 'c-palette';
  box.append(lab, sel);
  const strip = el('div', 'pal-strip');
  const list = C.paletteColors(obj);
  list.forEach((hex, i) => {
    if (obj.paletteColors) {
      const inp = el('input', 'pal-chip'); inp.type = 'color'; inp.value = hex; inp.setAttribute('aria-label', 'Color ' + (i + 1));
      inp.oninput = () => { const a = obj.paletteColors.slice(); a[obj.paletteFlip ? a.length - 1 - i : i] = inp.value; obj.paletteColors = a; live(120); };
      strip.appendChild(inp);
    } else {
      const sw = el('span', 'pal-chip'); sw.style.background = hex; sw.title = hex;
      strip.appendChild(sw);
    }
  });
  box.appendChild(strip);
  if (obj.paletteColors) {
    const row = el('div', 'row2');
    row.append(optBtn('One more color', () => { obj.paletteColors = obj.paletteColors.concat(obj.paletteColors[obj.paletteColors.length - 1]); buildPanel(); live(0); }, false, obj.paletteColors.length >= 8),
      optBtn('One fewer', () => { obj.paletteColors = obj.paletteColors.slice(0, -1); buildPanel(); live(0); }, false, obj.paletteColors.length <= 2));
    box.appendChild(row);
  }
  box.appendChild(makeControl(obj, T('paletteFlip', 'Turn the set around', { idp: 'pl-', rebuild: () => buildPanel() }), live));
  box.appendChild(makeControl(obj, T('paletteSteps', 'Steps, with no blending', { idp: 'pl-' }), live));
  box.appendChild(el('span', 'note', 'The colors run across the tones of the photo: the first for the lightest parts, the last for the darkest.'));
  return box;
}
/* The sheet of Cut out as it is drawn: the chosen or the default color, fitted to the paper, in the output color */
function sheetShown(L) {
  const R = out && out.layers.find((q) => q.id === L.id);
  const o = out || { paperClass: paperClass(), ground: groundHex(), paper: doc.out.paper, colorModel: doc.out.colorModel };
  return C.sheetColorOf({ fillSheet: L.fillSheet, __fit: R ? R.__fit : null }, Object.assign({}, o, { paperClass: paperClass(), ground: groundHex(), colorModel: doc.out.colorModel }));
}
/* after: what a change does, when it is not a new layout (the sheet only draws the letters again). shown: the color
   to show as chosen, when it is not obj[key] */
function hexDist(a, b) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  return Math.max(Math.abs((x >> 16 & 255) - (y >> 16 & 255)), Math.abs((x >> 8 & 255) - (y >> 8 & 255)), Math.abs((x & 255) - (y & 255)));
}
/* the swatch that stands for a color: the same one, or one so close that the eye cannot tell them apart */
function nearSwatch(cur, list) {
  if (!/^#[0-9a-f]{6}$/i.test(cur || '')) return null;
  const c = cur.toLowerCase();
  if (list.includes(c)) return c;
  let best = null, d = 19;
  list.forEach((h) => { const e = hexDist(c, h); if (e < d) { d = e; best = h; } });
  return best;
}
function inkPicker(obj, key, label, after, shown) {
  const wrap = el('div', 'ink-pick');
  const box = el('div', 'swatches ink-sw');
  box.setAttribute('role', 'group'); box.setAttribute('aria-label', label + ' color');
  // a short name sits at the start of the row; a longer one gets a line of its own, so the row never wraps
  const head = el('div', 'ink-head');
  if (label.length > 4) { head.appendChild(el('span', 'ink-lab', label)); wrap.appendChild(head); } else box.appendChild(el('span', 'val', label));
  // no color of its own yet: the color the letters really get
  const cur = (shown || obj[key] || (key === 'inkColor2' ? '#d9732e' : paperClass() === 'dark' ? '#f2efe6' : '#111111')).toLowerCase();
  const pal = photoPalette();
  const hit = nearSwatch(cur, INKS), palHit = hit ? null : nearSwatch(cur, pal);
  const changed = (d, rebuild) => { if (rebuild) buildPanel(); if (after) after(d); else { queueHistory(); if (d === 0) scheduleText(0); else scheduleText(); } };
  INKS.forEach((h) => {
    const b = el('button', 'sw'); b.type = 'button'; b.style.background = h;
    b.setAttribute('aria-label', label + ' ' + h); b.setAttribute('aria-pressed', String(hit === h));
    b.onclick = () => { obj[key] = h; changed(0, true); };
    box.appendChild(b);
  });
  box.appendChild(customSwatch('c-' + key, cur.length === 7 ? cur : '#111111', 'Custom ' + label.toLowerCase() + ' color', !hit && !palHit, (v) => { obj[key] = v; changed(); }, window.EyeDropper ? async () => { try { const r = await new window.EyeDropper().open(); obj[key] = r.sRGBHex; changed(0, true); } catch (e) { /* cancelled */ } } : null));
  wrap.appendChild(box);
  if (pal.length) {
    const row = el('div', 'swatches photo-sw'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Colors from the photo');
    pal.forEach((h) => {
      const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.title = h;
      b.setAttribute('aria-label', label + ' ' + h + ' from the photo'); b.setAttribute('aria-pressed', String(palHit === h));
      b.onclick = () => { obj[key] = h; changed(0, true); };
      row.appendChild(b);
    });
    // two inks (Duotone) would stack four rows of chips: there the photo's colors wait behind a small button
    if (obj.color === 'duotone' && (key === 'inkColor' || key === 'inkColor2') && !palHit) {
      const k = 'photo-sw-' + key, open = openNotes.has(k);
      const t = el('button', 'mini-btn photo-sw-btn', 'From the photo'); t.type = 'button'; t.setAttribute('aria-expanded', String(open));
      t.title = 'Colors taken from the photo';
      row.hidden = !open;
      t.onclick = () => { row.hidden = !row.hidden; if (row.hidden) openNotes.delete(k); else openNotes.add(k); t.setAttribute('aria-expanded', String(!row.hidden)); };
      if (!head.isConnected && !head.parentNode) wrap.insertBefore(head, wrap.firstChild);
      head.appendChild(t);
    } else row.insertBefore(el('span', 'val', 'From the photo'), row.firstChild);
    wrap.appendChild(row);
  }
  return wrap;
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
/* Putting the photo back as it came in. Each group can go back on its own, or all of them at once. */
const PHOTO_GROUPS = {
  adjust: ['brightness', 'contrast', 'saturation', 'temperature', 'tint', 'gray', 'invert', 'gamma', 'levelLo', 'levelHi'],
  detail: ['sharpen', 'smooth', 'clarity'],
  tone: ['hue', 'shadows', 'highlights', 'sepia', 'vignette'],
  fx: ['grain', 'posterize', 'threshold', 'pixelate'],
  warp: ['bulge', 'twirl', 'warpX', 'warpY', 'warpR'],
  sil: ['silhouette', 'silInvert', 'silThreshold', 'silFill']
};
const photoKeys = (group) => (Array.isArray(group) ? group.flatMap((g) => PHOTO_GROUPS[g] || []) : group ? PHOTO_GROUPS[group] || [] : Object.values(PHOTO_GROUPS).flat());
/* does this group (a name, a list of names, or every group when empty) take in the given one */
const groupHas = (group, g) => !group || group === g || (Array.isArray(group) && group.includes(g));
function photoTouched(group) {
  const ph = doc.photo;
  if (groupHas(group, 'warp') && Array.isArray(ph.liquify) && ph.liquify.length) return true;
  return photoKeys(group).some((k) => ph[k] !== PHOTO_DEFAULTS[k]);
}
function resetPhoto(group) {
  if (!photoTouched(group)) return;
  commitHistory();
  photoKeys(group).forEach((k) => { doc.photo[k] = PHOTO_DEFAULTS[k]; });
  if (groupHas(group, 'warp')) { doc.photo.liquify = []; liqField = null; photoSrcCache = null; }
  photoChanged('source'); buildPanel();
  toast(group ? 'Put these settings back' : 'Put every effect on the photo back', { label: 'Undo', fn: undo });
}
function resetBtn(group, label) {
  const b = el('button', 'mini-btn', label || 'Reset');
  b.type = 'button'; b.title = 'Put these settings back as they were';
  b.disabled = !photoTouched(group);
  b.onclick = () => resetPhoto(group);
  return b;
}
/* A folded part of a panel, like disclosure(), that fill() builds itself, the first time it opens.
   Remembers whether it was open. */
function foldout(key, label, fill) {
  const det = el('details', 'more'); det.open = !!ui.open[key];
  const inner = el('div', 'inner');
  let built = false;
  const build = () => { if (!built && det.open) { built = true; fill(inner); } };
  det.ontoggle = () => { ui.open[key] = det.open; build(); };
  const sum = el('summary'); sum.innerHTML = CHEV; sum.appendChild(document.createTextNode(label));
  build();
  det.append(sum, inner);
  return det;
}
/* Opacity, blend and the place in the stack, folded at the end of the Photo and Vector panels */
function layerBlending(p, id) {
  const L = layerOf(id), i = doc.order.indexOf(id), last = doc.order.length - 1;
  const on = [(L.opacity ?? 1) < 1 ? Math.round(L.opacity * 100) + '%' : '', L.blend && L.blend !== 'normal' ? (BLENDS.find((b) => b[0] === L.blend) || ['', ''])[1] : ''].filter(Boolean).join(', ');
  const s = sec(p); s.classList.add('sec-blend');
  s.appendChild(foldout('blend-' + id, 'Layer blending' + (on ? ' (' + on + ')' : ''), (inner) => {
    const after = () => { compose(); queueHistory(); buildStack(); };
    inner.appendChild(makeControl(L, R('opacity', 'Opacity', 0, 1, 0.01, { idp: 'ly' + id + '-' }), after));
    inner.appendChild(makeControl(L, Object.assign(SEL('blend', 'Blend', BLENDS), { idp: 'ly' + id + '-' }), after));
    const g = el('div', 'grid2');
    g.append(optBtn('Move up', () => moveLayerTo(id, i - 1), false, i === 0), optBtn('Move down', () => moveLayerTo(id, i + 1), false, i === last));
    inner.append(g, el('span', 'note', (i === 0 ? 'Top' : i === last ? 'Bottom' : 'Middle') + ' of the stack.'));
  }));
  return s;
}

/* The silhouette: the photo made into a clean two-tone shape. It changes the photo itself, and Word cloud and
   Calligram read it when their shape is the photo or the cutout, so it sits under their Shape control
   (see makeControl). Image > Make a silhouette turns it on and off. Self-contained, so any panel can show it. */
const SIL_MODES = ['cloud', 'calligram'];
function silDecides(L) { return SIL_MODES.includes(L.mode) && L.maskSource === 'image' && doc.photo.silhouette > 0; }
function silhouetteControls() {
  const ph = doc.photo, on = ph.silhouette > 0;
  const box = el('div', 'sub-ctl sil-ctl'); box.id = 'silCtl';
  const pc = () => photoChanged('source');
  const sw = { on };
  box.appendChild(makeControl(sw, T('on', 'Clean shape from the photo (silhouette)', { idp: 'sil-' }), () => {
    commitHistory(); ph.silhouette = sw.on ? 0.4 : 0; pc(); buildPanel(); queueHistory();
  }));
  if (on) {
    box.appendChild(makeControl(ph, R('silhouette', 'Close gaps and lose specks', 0.05, 1, 0.05, { idp: 'p-' }), pc));
    box.appendChild(makeControl(ph, R('silThreshold', 'Split point, 0 chooses it for you', 0, 1, 0.01, { idp: 'p-' }), pc));
    box.appendChild(makeControl(ph, T('silInvert', 'Swap which part is the shape', { idp: 'p-' }), pc));
    box.appendChild(makeControl(ph, T('silFill', 'Fill the holes inside', { idp: 'p-' }), pc));
    box.appendChild(el('span', 'note', 'The silhouette sets the shape, so Photo threshold is hidden while it is on. This changes the photo itself, so the Photo layer shows the shape too.'));
  } else box.appendChild(el('span', 'note', 'Makes a two-tone shape from the photo, so the words follow a clean edge.'));
  return box;
}

function buildPhotoPanel(p) {
  const ph = doc.photo;
  const pc = () => () => photoChanged();
  if (selectedObjs().length) buildObjectSection(p);
  // 1 crop and turn
  let s = sec(p, 'Crop and turn');
  const crs = optSeg(CROP_RATIOS, ph.ratio || 'free', (v) => setCropRatio(v), 'Crop shape'); crs.classList.add('seg-4');
  s.appendChild(crs);
  const cg = el('div', 'grid2');
  cg.append(optBtn(ui.cropDraft ? 'Apply crop' : 'Crop on the canvas', () => (ui.cropDraft ? cropApply() : setTool('crop')), true), optBtn('Reset crop', cropReset, false, !ph.crop && !ui.cropDraft));
  s.appendChild(cg);
  if (ph.crop) s.appendChild(el('span', 'note', 'Cropped to ' + Math.round(ph.crop.w * iw) + ' × ' + Math.round(ph.crop.h * ih) + ' px of the photo.'));
  const tg = el('div', 'grid4');
  tg.append(optBtn('⟲ Left', () => rotateImage(-1)), optBtn('⟳ Right', () => rotateImage(1)), optBtn('Flip ↔', () => flipImage('x')), optBtn('Flip ↕', () => flipImage('y')));
  s.appendChild(tg);
  s.appendChild(optBtn('Canvas size…', openCanvasSize));
  // 2 adjust: Auto tone first, the everyday sliders, the rest folded. One Reset for all of it.
  const ADJ = ['adjust', 'detail', 'tone', 'fx'];
  s = sec(p, 'Adjust', resetBtn(ADJ));
  const autoOn = autoToneOn();
  const ab = optBtn(autoOn ? 'Auto tone: on' : 'Auto tone', autoOn ? autoToneOff : autoToneNow);
  ab.setAttribute('aria-pressed', String(autoOn)); ab.classList.add('auto-tone');
  ab.title = autoOn ? 'Click to turn it off' : 'Set the tones that suit text art';
  s.appendChild(ab);
  s.appendChild(el('span', 'note', autoOn ? 'Auto tone set the midtones, the black and white point and the detail for text art. You find them under More.' : 'Sets the tones that suit text art. New photos get it when they open; you can turn that off in Settings.'));
  [R('brightness', 'Brightness', -0.4, 0.4, 0.01), R('contrast', 'Contrast', 0.4, 2.5, 0.05), R('saturation', 'Color strength', 0, 2.5, 0.05),
    R('temperature', 'Warmth', -1, 1, 0.02), R('tint', 'Tint', -1, 1, 0.02)].forEach((c) => { c.idp = 'p-'; s.appendChild(makeControl(ph, c, pc())); });
  const moreOn = photoKeysChanged(['gamma', 'levelLo', 'levelHi', 'gray', 'invert']) || photoKeysChanged(photoKeys(['detail', 'tone', 'fx']));
  s.appendChild(foldout('photoAdjMore', 'More' + (moreOn ? ' (on)' : ''), (inner) => {
    [R('gamma', 'Midtones, higher is lighter', 0.5, 2.5, 0.01), R('levelLo', 'Black point', 0, 0.4, 0.005), R('levelHi', 'White point', 0.6, 1, 0.005),
      T('gray', 'Grayscale'), T('invert', 'Invert, light becomes dark')].forEach((c) => { c.idp = 'p-'; inner.appendChild(makeControl(ph, c, pc())); });
    inner.appendChild(disclosure('photoMore', 'Detail' + (photoKeysChanged(PHOTO_GROUPS.detail) ? ' (on)' : ''), [R('sharpen', 'Sharpen', 0, 1.5, 0.05), R('smooth', 'Smooth', 0, 6, 0.5), R('clarity', 'Clarity, contrast between nearby areas', 0, 1.5, 0.05)].map((c) => Object.assign(c, { idp: 'p-' })), ph, pc()));
    inner.appendChild(disclosure('photoTone', 'Color and tone' + (photoTouched('tone') ? ' (on)' : ''), [R('hue', 'Hue', -180, 180, 1), R('shadows', 'Shadows', -1, 1, 0.02), R('highlights', 'Highlights', -1, 1, 0.02), R('sepia', 'Sepia', 0, 1, 0.02), R('vignette', 'Vignette', -1, 1, 0.02)].map((c) => Object.assign(c, { idp: 'p-' })), ph, pc()));
    inner.appendChild(disclosure('photoFx', 'Effects' + (photoTouched('fx') ? ' (on)' : ''), [R('grain', 'Grain', 0, 1, 0.02), R('posterize', 'Posterize', 0, 16, 1), R('threshold', 'Black and white cut', 0, 0.95, 0.01), R('pixelate', 'Pixelate', 0, 40, 1)].map((c) => Object.assign(c, { idp: 'p-' })), ph, pc()));
  }));
  // 3 remove background
  s = sec(p, 'Remove background');
  s.appendChild(el('span', 'note', 'Removed areas get no text and stay clear in transparent files.'));
  const r2 = el('div', 'grid2');
  r2.append(optBtn('Remove background', removeBackground, true), optBtn('Select background', () => selectBackground(ui.bgTol)));
  s.appendChild(r2);
  const bg = { tol: ui.bgTol ?? 0.12 };
  s.appendChild(makeControl(bg, R('tol', 'Background tolerance', 0.03, 0.4, 0.01, { idp: 'bg-' }), () => { ui.bgTol = bg.tol; }));
  s.appendChild(el('span', 'lab', 'Or select by hand, then remove'));
  const r1 = el('div', 'grid3');
  [['wand', 'Wand'], ['lasso', 'Lasso'], ['brush', 'Brush']].forEach(([t, n]) => { const b = el('button', 'btn', n); b.type = 'button'; if (ui.tool === t) b.classList.add('btn-primary'); b.onclick = () => setTool(t); r1.appendChild(b); });
  s.appendChild(r1);
  const r3 = el('div', 'grid3');
  r3.append(optBtn('Remove', selRemove, false, !hasSelection), optBtn('Keep only', selKeepOnly, false, !hasSelection), optBtn('Restore', selRestore, false, !hasSelection || !hasRemoval));
  s.appendChild(r3);
  s.appendChild(makeControl(ph, R('feather', 'Edge softness', 0, 4, 1, { idp: 'p-' }), pc()));
  if (hasRemoval) s.appendChild(optBtn('Bring everything back', clearRemoval));
  s.appendChild(foldout('photoShowRemoved', 'Show removed areas as' + (doc.removed.show === 'color' ? ' (color)' : ''), (inner) => {
    inner.appendChild(makeControl(doc.removed, Object.assign(S('show', 'Pattern', [['checker', removedGround() ? (transpShow() === 'black' ? 'Black' : 'White') : 'Checkerboard'], ['color', 'Color']]), { idp: 'r-', rebuild: () => buildPanel() }), () => { rebuildPhotoView(); compose(); }));
    if (doc.removed.show === 'color') {
      const row = el('div', 'swatches');
      ['#ff3b7f', '#34c759', '#0a84ff', '#ffcc00'].forEach((h) => { const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.setAttribute('aria-label', 'Show removed areas in ' + h); b.setAttribute('aria-pressed', String(doc.removed.color === h)); b.onclick = () => { doc.removed.color = h; rebuildPhotoView(); compose(); buildPanel(); }; row.appendChild(b); });
      inner.appendChild(row);
    }
    inner.appendChild(makeControl(doc.removed, T('inText', 'Also show them in Text view', { idp: 'r-' }), () => compose()));
    inner.appendChild(el('span', 'note', 'Only for checking. Exports never include the pattern.' + (doc.out.transparent && doc.removed.show !== 'color' ? ' With a transparent background, removed areas look like the other clear areas: see View > Show transparency as.' : '')));
  }));
  // 4 reshape: one fold, with its Reset (liquify included) in the header
  s = sec(p); s.classList.add('sec-fold');
  const warp = () => { clearTimeout(warpTimer); warpTimer = setTimeout(() => photoChanged('source'), 90); };
  const wf = foldout('photoWarp', 'Reshape: liquify, bulge and twirl' + (photoTouched('warp') ? ' (on)' : ''), (inner) => {
    inner.append(optBtn('Liquify by hand (Y)', () => setTool('liquify')), el('span', 'note', 'Push the photo around, bloat, pucker or twirl a spot. Alt restores it.'));
    [R('bulge', 'Bulge or pinch', -1, 1, 0.02), R('twirl', 'Twirl', -360, 360, 5), R('warpX', 'Center, across', 0, 1, 0.01), R('warpY', 'Center, down', 0, 1, 0.01), R('warpR', 'Size', 0.05, 1, 0.01)]
      .forEach((c) => { c.idp = 'p-'; inner.appendChild(makeControl(ph, c, warp)); });
  });
  const wr = resetBtn('warp'); wr.title = 'Liquify, bulge and twirl go back';
  wr.addEventListener('click', (e) => e.preventDefault());
  wf.querySelector('summary').appendChild(wr);
  s.appendChild(wf);
  // 5 draw on the photo: these become part of the photo, so the text art reads them
  s = sec(p, 'Draw on the photo');
  const og = el('div', 'grid4');
  og.append(optBtn('Text', () => drawOnPhoto('text')), optBtn('Rectangle', () => drawOnPhoto('rect')), optBtn('Ellipse', () => drawOnPhoto('ellipse')), optBtn('Image…', () => drawOnPhoto('image')));
  s.append(og, el('span', 'note', 'They become part of the photo, so the text art draws them too.'));
  // 6 layer blending, folded, then the one reset for the whole photo
  layerBlending(p, 'photo');
  const all = optBtn('Reset every effect on the photo', () => resetPhoto(), false, !photoTouched());
  all.classList.add('reset-all'); all.innerHTML = RESET_ICON + '<span>Reset every effect on the photo</span>';
  all.title = 'Adjustments, effects, the silhouette and reshaping go back. The crop stays.';
  const ra = sec(p); ra.classList.add('sec-reset'); ra.appendChild(all);
}
/* Draw on the photo: the new shape stays on the Photo layer and in the Photo panel, and shows on screen */
function drawOnPhoto(type) {
  ui.objLayer = 'photo';
  if (!doc.photo.visible) { setView('photo'); toast('Photo view is on, so you can see what you add. The text art draws it too.'); }
  if (type === 'image') { placeInput.click(); return; }
  quickAdd(type);
  if (ui.tab !== 'photo') { ui.tab = 'photo'; buildTabs(); }
  buildPanel();
  const sc = panelScroller(); if (sc) sc.scrollTop = 0;
}
function panelScroller() {
  let e = $('panel');
  while (e && !(e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement;
  return e;
}

/* ---------------- Lines panel ---------------- */
function traceNow(after, extra) {
  if (!src) return;
  // after a crop, rotate or flip, src matches the new crop only once the photo job is done
  if (jobs.src) { if (!traceNow.queued) { traceNow.queued = true; whenSrcReady(() => { traceNow.queued = false; traceNow(after, extra); }); } return; }
  const o = Object.assign({ kind: ui.trace.kind, threshold: ui.trace.threshold, amount: ui.trace.amount, skipWide: ui.trace.skipWide, levels: ui.trace.levels || 4, smooth: 0, simplify: 1.0 }, extra || {});
  const cr = cropRect(), s0 = src;
  runJob('trace', remap(o.kind === 'contours' ? contourGen(s0, o) : C.traceGen(s0, o), 0, 1), (paths) => {
    const kx = cr.w * iw / s0.w, ky = cr.h * ih / s0.h;
    doc.lines.paths = doc.lines.paths.filter((p) => !p.traced);
    // extra.width: one even width for every traced line, so the letters along them are the same size.
    // Tone lines always get one: they have no stroke of their own to measure.
    const wid = (extra && extra.width) || (o.kind === 'contours' ? Math.max(8, Math.round(Math.max(iw, ih) / 72)) : 0);
    for (const p of paths) {
      const pts = p.pts.map(([x, y, r]) => [cr.x * iw + x * kx, cr.y * ih + y * ky, r * kx]);
      const nodes = smoothNodes(pts, !!p.closed);
      if (wid) nodes.forEach((n) => { delete n.w; });
      doc.lines.paths.push({ id: uid++, traced: true, closed: !!p.closed, width: wid, text: '', nodes });
    }
    ui.selPath = null; doc.lines.visible = true;
    linesChanged();
    if (ui.tab === 'lines') buildPanel();
    toast(paths.length ? 'Traced ' + paths.length + (paths.length === 1 ? ' line' : ' lines') + '. Edit them with the Select tool.' : 'Found no lines to trace. Try another Follow choice in the Vector panel.');
    if (after) after(paths);
  });
}
/* Tone lines: the lines of equal lightness in a softened copy of the photo, like the contours of a map.
   Text along them follows the light and the shadow, so a face or an animal still reads, where the outlines
   of a busy photo break into short bits. o.levels is how many tones get a line. Returns paths in src pixels. */
function* contourGen(s0, o) {
  const sw = s0.w, sh = s0.h, k = Math.min(1, 200 / Math.max(sw, sh));
  const W = Math.max(2, Math.round(sw * k)), H = Math.max(2, Math.round(sh * k));
  const g = new Float32Array(W * H), cnt = new Float32Array(W * H), keep = s0.keep;
  for (let y = 0; y < sh; y++) {
    const oy = Math.min(H - 1, (y * k) | 0) * W;
    // removed areas count as paper, so a line runs around the subject instead of through the hole
    for (let x = 0; x < sw; x++) { const i = y * sw + x, j = oy + Math.min(W - 1, (x * k) | 0); g[j] += keep && keep[i] < 0.5 ? 1 : s0.lum[i]; cnt[j]++; }
  }
  for (let j = 0; j < g.length; j++) g[j] /= cnt[j] || 1;
  yield { stage: 'Finding tones', p: 0.1 };
  const L = C.blur(g, W, H, o.soft || 3, 2), sorted = Float32Array.from(L).sort();
  const n = clamp(Math.round(o.levels || 4), 1, 12), minLen = Math.max(sw, sh) / 8, paths = [];
  const v = (x, y) => L[y * W + x];
  // where the line crosses an edge of the grid: horizontal edges have even ids, vertical ones odd
  const cross = (id, lv) => {
    const e = id >> 1, x = e % W, y = (e / W) | 0, a = v(x, y), b = id & 1 ? v(x, y + 1) : v(x + 1, y), t = clamp((lv - a) / (b - a || 1e-6), 0, 1);
    return id & 1 ? [x, y + t] : [x + t, y];
  };
  for (let li = 0; li < n; li++) {
    const lv = sorted[Math.floor(((li + 0.5) / n) * (sorted.length - 1))];
    const segs = [], at = new Map();
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const a = v(x, y) > lv, b = v(x + 1, y) > lv, c = v(x + 1, y + 1) > lv, d = v(x, y + 1) > lv;
      if (a === b && b === c && c === d) continue;
      const top = 2 * (y * W + x), bot = 2 * ((y + 1) * W + x), left = top + 1, right = 2 * (y * W + x + 1) + 1, e = [];
      if (a !== b) e.push(top);
      if (b !== c) e.push(right);
      if (c !== d) e.push(bot);
      if (d !== a) e.push(left);
      segs.push([e[0], e[1]]);
      if (e.length === 4) segs.push([e[2], e[3]]);
    }
    segs.forEach((sg, i) => sg.forEach((id) => { const l = at.get(id); if (l) l.push(i); else at.set(id, [i]); }));
    const used = new Uint8Array(segs.length);
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const chain = segs[i].slice();
      for (const fwd of [true, false]) for (;;) {
        const end = fwd ? chain[chain.length - 1] : chain[0], nx = (at.get(end) || []).find((j) => !used[j]);
        if (nx == null) break;
        used[nx] = 1;
        const other = segs[nx][0] === end ? segs[nx][1] : segs[nx][0];
        if (fwd) chain.push(other); else chain.unshift(other);
      }
      const pts = chain.filter((_, j) => j % 2 === 0 || j === chain.length - 1).map((id) => { const [x, y] = cross(id, lv); return [(x + 0.5) / k, (y + 0.5) / k, 2]; });
      let len = 0;
      for (let j = 1; j < pts.length; j++) len += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
      // short loops are specks and texture, not the shape of the picture
      if (len >= minLen && pts.length > 2) paths.push({ pts, closed: chain.length > 3 && chain[0] === chain[chain.length - 1] });
    }
    yield { stage: 'Following tones', p: 0.1 + 0.9 * (li + 1) / n };
  }
  return paths;
}
function updateLineInfo() {
  const info = document.getElementById('lineCount');
  if (!info) return;
  const t = doc.lines.paths.filter((p) => p.traced).length, d = doc.lines.paths.length - t;
  info.textContent = (t ? t + ' traced' : '') + (t && d ? ', ' : '') + (d ? d + ' drawn' : '') + (t || d ? '' : 'No lines yet');
}
function buildLinesPanel(p) {
  if (selectedObjs().length) { buildObjectSection(p); if (!ui.selPath) buildRepeatSection(p); }
  buildConvertSection(p);
  let s = sec(p, 'Trace from the photo');
  s.appendChild(el('span', 'note', 'Turns the strokes of a drawing, or the edges and tones of a photo, into lines that text can follow.'));
  s.appendChild(makeControl(ui.trace, Object.assign(S('kind', 'Follow', [['dark', 'Dark lines'], ['light', 'Light lines'], ['edges', 'Outlines'], ['contours', 'Tones']]), { idp: 'tr-', rebuild: () => buildPanel() }), () => {}));
  if (ui.trace.kind === 'contours') {
    if (!ui.trace.levels) ui.trace.levels = 4;
    s.appendChild(makeControl(ui.trace, R('levels', 'How many tones', 2, 10, 1, { idp: 'tr-' }), () => {}));
    s.appendChild(el('span', 'note', 'One line for each tone, like the contours on a map. Best for photos: the text follows the light and the shadow.'));
  } else if (ui.trace.kind === 'edges') s.appendChild(makeControl(ui.trace, R('amount', 'How many edges', 0.03, 0.25, 0.01, { idp: 'tr-' }), () => {}));
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
  s = sec(p, 'Add shapes and text');
  const ag = el('div', 'grid3');
  const add = (t) => () => { ui.objLayer = 'lines'; quickAdd(t); };
  ag.append(optBtn('Text', add('text')), optBtn('Rectangle', add('rect')), optBtn('Ellipse', add('ellipse')), optBtn('Polygon', add('polygon')), optBtn('Star', add('star')), optBtn('Image…', () => { ui.objLayer = 'lines'; placeInput.click(); }));
  s.appendChild(ag);
  s.appendChild(el('span', 'note', 'Or use the Shape (U) and Text (T) tools on the canvas. Select (V) moves, scales and rotates.'));
  if (!doc.lines.paths.length) {
    // nothing to edit, bend or clear yet: one note in place of disabled buttons
    s = sec(p, 'Lines');
    s.appendChild(el('span', 'note', 'Trace or draw lines to edit them here. Bend lines and the text effects show up then too.'));
    if (doc.objects.some((o) => o.layer !== 'photo')) wholeVectorLayer(p);
    layerBlending(p, 'lines');
    return;
  }
  const sel = findPath(ui.selPath), selList = selectedPaths();
  s = sec(p, !sel ? 'Lines' : selList.length > 1 ? (selGroupId() != null && ui.inGroup == null ? 'Selected group, ' : 'Selected, ') + selList.length + ' parts' : 'Selected line');
  if (sel) {
    const pw = { width: sel.width || Math.round((sel.nodes.reduce((a, n) => a + (n.w || 0), 0) / sel.nodes.length) * 2) || 6 };
    s.appendChild(makeControl(pw, R('width', 'Width', 1, Math.max(30, Math.round(iw / 10)), 1, { idp: 'sl-' }), () => { sel.width = pw.width; sel.nodes.forEach((n) => { delete n.w; }); linesChanged(); }));
    s.appendChild(makeControl(sel, TA('text', 'Text on this line only', { idp: 'sl-' }), () => { linesChanged(); }));
    s.appendChild(el('span', 'note', 'Leave it empty to use the text of the Line text layer.'));
    // stroke and fill go to every selected line, so a group keeps one look
    const sk = { on: !!sel.stroke };
    s.appendChild(makeControl(sk, T('on', 'Draw this line as a stroke', { idp: 'sl-' }), () => { selList.forEach((q) => { q.stroke = sk.on ? (sel.stroke || defaultInk()) : null; if (!q.sw) q.sw = Math.max(2, Math.round((q.width || 8) / 2)); }); linesChanged(); buildPanel(); }));
    if (sel.stroke) {
      s.appendChild(colorRow('Stroke', sel.stroke, (v) => { selList.forEach((q) => { q.stroke = v; }); linesChanged(); }));
      s.appendChild(makeControl(sel, R('sw', 'Stroke width', 1, Math.max(40, Math.round(iw / 20)), 1, { idp: 'sl-' }), () => { selList.forEach((q) => { q.sw = sel.sw; }); linesChanged(); }));
    }
    buildFillControls(s, selList);
    buildGroupRow(s);
    s.appendChild(optBtn(selList.length > 1 ? 'Delete these' : 'Delete this line', deleteSelection));
  } else {
    const info = el('span', 'note'); info.id = 'lineCount'; s.appendChild(info);
    s.appendChild(el('span', 'note', 'With the Select tool, click a line to give it its own text or width.'));
  }
  const r2 = el('div', 'grid2');
  r2.append(optBtn('Clear traced', () => { doc.lines.paths = doc.lines.paths.filter((q) => !q.traced); ui.selPath = null; linesChanged(); buildPanel(); }, false, !doc.lines.paths.some((q) => q.traced)),
    optBtn('Clear drawn', () => { doc.lines.paths = doc.lines.paths.filter((q) => q.traced); ui.selPath = null; linesChanged(); buildPanel(); }, false, !doc.lines.paths.some((q) => !q.traced)));
  s.appendChild(r2);
  const cs = el('div', 'swatches'); cs.appendChild(el('span', 'val', 'Line color on screen'));
  ['#0a84ff', '#ff3b7f', '#34c759', '#ff9f0a'].forEach((h) => { const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.setAttribute('aria-label', 'Show lines in ' + h); b.setAttribute('aria-pressed', String(doc.lines.color === h)); b.onclick = () => { doc.lines.color = h; drawOverlay(); buildPanel(); }; cs.appendChild(b); });
  s.appendChild(cs);
  updateLineInfo();
  if (doc.lines.paths.some((q) => q.closed)) s.appendChild(optBtn('Fill every closed shape', () => runCommand('vector.fillAll')));
  if (ui.selPath) buildRepeatSection(p);
  wholeVectorLayer(p);
  buildTextEffectSection(p);
  s = sec(p, 'Bend lines');
  const bend = { amt: 0.35 };
  s.appendChild(makeControl(bend, R('amt', 'Amount', 0.05, 1, 0.05, { idp: 'bl-' }), () => {}));
  const bg = el('div', 'grid2');
  bg.append(optBtn('Bulge out', () => warpLines(bend.amt), false, !doc.lines.paths.length), optBtn('Pinch in', () => warpLines(-bend.amt), false, !doc.lines.paths.length));
  s.appendChild(bg);
  s.appendChild(el('span', 'note', findPath(ui.selPath) ? 'Bends the selected lines.' : 'Bends every line around the middle of the artboard.'));
  s.appendChild(optBtn('More with the Distort tool (Shift D)', () => setTool('distort'), false, !doc.lines.paths.length));
  layerBlending(p, 'lines');
}
function wholeVectorLayer(p) {
  const s = sec(p, 'The whole layer');
  const fg = el('div', 'row2');
  fg.append(optBtn('Flip all ↔', () => flipVectorLayer('x')), optBtn('Flip all ↕', () => flipVectorLayer('y')));
  s.appendChild(fg);
  s.appendChild(el('span', 'note', 'Flips the lines and the shapes together, around the middle of the picture. To flip one shape on its own, select it first.'));
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
  const s = sec(p, 'Selected: ' + (one ? OBJ_NAMES[o.type] + (o.layer === 'photo' ? ' on the photo' : '') : sel.length + ' objects'), del);
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
  // folded and tinted like the selection it copies, so it does not push the rest of the panel down
  const box = sec(p); box.classList.add('sec-fold', 'obj-sec');
  box.appendChild(foldout('repeat', 'Step and repeat', (s) => {
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
  }));
}
function useLines() {
  if (!doc.text.layers.some((L) => L.mode === 'paths')) doc.text.layers.push(newLayer('paths', { inkColor: isDarkHex(doc.out.paper) ? '#ffffff' : '#111111' }));
  doc.text.source = doc.text.source === 'photo' ? 'lines' : doc.text.source;
  doc.text.sel = doc.text.layers.findIndex((L) => L.mode === 'paths');
  doc.text.applied = true;
  ui.tab = 'text'; buildTabs(); buildPanel(); setView('text'); scheduleText(0); queueHistory();
  toast('The words now run along the lines. Change them under Words in the Text art panel.', { label: 'Undo', fn: undo });
}

/* ---------------- Text art panel ----------------
   Simple first: the look, the words, size, color and the background. Mirror, Shape, Finish and Tone are folded.
   The layers come last, with their blending folded at the very end. */
const SHUFFLE = SVGI('<path d="M3 7h3c4.5 0 6.5 10 11 10h4M3 17h3c1.7 0 3-1.4 4-3.2M13.8 10.2C14.8 8.4 16 7 18 7h3M18 4l3 3-3 3M18 14l3 3-3 3"/>');
const VARIANTS = SVGI('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>');
function buildTextPanel(p) {
  const wb = el('button', 'mini-btn', 'Every style'); wb.type = 'button'; wb.title = 'See this picture in every style at once (Shift E)';
  wb.onclick = () => openWall();
  let s = sec(p, 'Look', wb); s.id = 'sec-look';
  if (!doc.text.applied) s.appendChild(optBtn('Apply text art', () => applyTextArt(), true));
  const look = ui.lookTab === 'recipes' ? 'recipes' : 'styles';
  const tabs = el('div', 'seg look-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Look');
  [['styles', 'Styles'], ['recipes', 'Recipes']].forEach(([v, t]) => {
    const b = el('button', null, t); b.type = 'button'; b.dataset.look = v; b.id = 'look-' + v;
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(look === v)); b.setAttribute('aria-controls', 'look-panel'); b.tabIndex = look === v ? 0 : -1;
    b.onclick = () => { if (ui.lookTab === v) return; ui.lookTab = v; buildPanel(); const f = $('look-' + v); if (f) f.focus({ preventScroll: true }); };
    // arrow keys move between the two tabs, as in any tab list
    b.onkeydown = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); ui.lookTab = look === 'styles' ? 'recipes' : 'styles'; buildPanel(); const f = $('look-' + ui.lookTab); if (f) f.focus({ preventScroll: true }); } };
    tabs.appendChild(b);
  });
  s.appendChild(tabs);
  const lp = el('div', 'look-panel'); lp.id = 'look-panel'; lp.setAttribute('role', 'tabpanel'); lp.setAttribute('aria-labelledby', 'look-' + look);
  s.appendChild(lp);
  s = lp;
  if (look === 'styles') {
    const tiles = el('div', 'tiles'); tiles.id = 'tiles'; s.appendChild(tiles); buildTiles();
  } else if (doc.text.source !== 'lines') {
    const box = el('div', 'recipes'); box.id = 'recipes'; s.appendChild(box);
    RECIPES.forEach((r, i) => {
      const b = el('button', 'recipe-card' + (r.flagship ? ' flag' : '')); b.type = 'button'; b.title = 'Use the ' + r.name + ' recipe' + (r.flagship ? ', the signature look of SungFluence' : '');
      const c = el('canvas'); c.width = 176; c.height = 132; c.id = 'rt-' + i; c.setAttribute('aria-hidden', 'true');
      b.append(c, el('span', null, r.name));
      b.onclick = () => applyRecipe(r);
      box.appendChild(b);
    });
    s.appendChild(el('span', 'note', 'A recipe sets the style, the colors and the background.'));
    paintThumbs(); thumbsSoon(50);
  } else {
    s.appendChild(el('span', 'note', 'Quick looks for text along the lines.'));
    const g = el('div', 'grid2');
    [['White letters, dark shirt', 'dark'], ['Black letters, light shirt', 'light']].forEach(([n, v]) => g.appendChild(optBtn(n, () => setPrintOn(v, doc.text.layers.find((L) => L.mode === 'paths')))));
    s.appendChild(g);
  }
  // the recipe pictures get drawn in quiet moments, so the Recipes tab opens with them ready
  if (look === 'styles' && doc.text.applied && doc.text.source !== 'lines' && !recipeThumbs.running) thumbsSoon(1500);
  // before text art is applied there is no style yet, so no settings of one: Apply or a tile chooses it
  if (!doc.text.applied) {
    sec(p).appendChild(el('p', 'note pre-apply', 'Apply text art starts with a Word cloud, the signature style, shaped by this picture. Or click a style to start with it. Its settings then show here.'));
    return;
  }
  const ctlBox = el('div', 'ctl-groups'); ctlBox.id = 'controls'; p.appendChild(ctlBox); buildControls();
  s = sec(p, 'Layers', (() => { const b = el('button', 'mini-btn', '+ Add layer'); b.type = 'button'; b.onclick = addTextLayer; return b; })());
  s.id = 'sec-layers';
  const lb = el('div', 'layers'); lb.id = 'layers'; s.appendChild(lb); buildLayers();
  // the source matters only once there are lines to write along
  if (doc.lines.paths.length || doc.text.source !== 'photo') {
    s.appendChild(makeControl(doc.text, Object.assign(S('source', 'Text art uses', [['photo', 'Photo'], ['lines', 'Lines'], ['both', 'Both']]), { idp: 'ts-', rebuild: () => { ensureSource(); buildPanel(); } }), () => { queueHistory(); scheduleText(0); }));
    s.appendChild(el('span', 'note', doc.text.source === 'photo' ? 'Letters are placed by the tones of the photo.' : doc.text.source === 'lines' ? 'Letters follow the lines from the Vector layer.' : 'Photo layers and line layers are both drawn.'));
  }
  if (doc.text.applied) layerBlending(p, 'text');
}
/* Opacity, blend and order of a whole layer of the stack, folded at the end of its panel */
function layerBlending(p, id) {
  const L = layerOf(id), on = L.opacity < 1 || (L.blend && L.blend !== 'normal') || (id === 'text' && doc.text.locked);
  const box = sec(p); box.classList.add('blend-sec');
  const det = el('details', 'more blend-more'); det.id = 'sec-blend-' + id; det.open = !!ui.open['blend-' + id];
  det.ontoggle = () => { ui.open['blend-' + id] = det.open; };
  const sum = el('summary'); sum.innerHTML = CHEV; sum.appendChild(document.createTextNode('Layer blending' + (on ? ' (on)' : '')));
  const inner = el('div', 'inner');
  const s = buildLayerSection(inner, id);
  const h = s.querySelector('.sec-h'); if (h) h.remove();
  s.querySelectorAll('.note').forEach((n) => { if (!n.querySelector('.note-q') && n.textContent.length > 64) n.replaceWith(qnote(n.textContent)); });
  det.append(sum, inner); box.appendChild(det);
  return det;
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
    const b = el('button', 'tile' + (m.plugin ? ' plug' : '') + (k === FLAGSHIP_STYLE ? ' flag' : '')); b.type = 'button';
    // before text art is applied no style is in use yet, so no tile is marked
    b.setAttribute('aria-pressed', String(doc.text.applied && cur.mode === k));
    if (m.plugin) b.title = 'Extra effect: ' + (m.plugin.description || m.name);
    // the flagship style wears a small star
    if (k === FLAGSHIP_STYLE) b.title = 'Word cloud, the signature style of SungFluence';
    const g = el('span', 'g'); g.innerHTML = m.glyph; g.setAttribute('aria-hidden', 'true');
    b.append(g, el('span', 'l', m.name));
    // a tile picked before Apply text art applies that style straight away
    b.onclick = () => (doc.text.applied ? setLayerStyle(k) : usePluginStyle(k));
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
/* The same layer in another style: the shared settings and the words come across, everything else
   starts from that style's own defaults. The discovery wall uses this to draw a style before you pick it. */
function layerInStyle(cur, k) {
  const m = MODES[k];
  if (!m || !cur) return null;
  const keep = {};
  Object.keys(COMMON_DEFAULTS).forEach((c) => { keep[c] = cur[c]; });
  if (cur.text && cur.mode !== 'halftone' && 'text' in m.defaults && k !== 'halftone') keep.text = cur.text;
  if (cur.mode === 'mosaic' && 'text' in m.defaults && k !== 'halftone') keep.text = cur.words.split('\n').join(' ');
  if (k === 'mosaic' && cur.text && cur.mode !== 'halftone') keep.words = cur.text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).join('\n');
  if (m.defaults.inkColor) delete keep.inkColor;
  const n = newLayer(k, keep);
  if (k === 'paths') n.inkColor = isDarkHex(doc.out.paper) ? '#ffffff' : '#111111';
  return n;
}
function setLayerStyle(k) {
  const cur = curLayer(), m = MODES[k];
  if (!m || !cur || cur.mode === k) return;
  // a style that writes along lines has nothing to draw yet: ask, and leave Source as it is
  if ((m.lines || m.usesLines) && !doc.lines.paths.length) { askForLines(k); return; }
  revealSoon();
  const n = layerInStyle(cur, k);
  doc.text.layers[doc.text.sel] = n;
  if ((k === 'paths') !== (cur.mode === 'paths')) fitSource(k === 'paths');
  buildPanel(); queueHistory(); scheduleText(0);
}
/* Source after a layer turned into Line text, or back: the smallest change that still draws the layer.
   Line text alone uses Lines; next to photo layers it uses Both. With no Line text left, Source goes back to Photo. */
function fitSource(toLines) {
  const ls = doc.text.layers, hasP = ls.some((L) => L.mode === 'paths'), hasO = ls.some((L) => L.mode !== 'paths'), s0 = doc.text.source;
  if (toLines) {
    if (s0 === 'photo') doc.text.source = hasO ? 'both' : 'lines';
    if (doc.text.source === 'both' && s0 !== 'both') toast('Text art now draws the photo layers and the line layers.');
  } else if (!hasP) doc.text.source = 'photo';
  else if (s0 === 'lines') doc.text.source = 'both';
}
/* Line text, or a plugin that reads lines, picked while there are no lines: trace some, draw some, or keep the style */
function askForLines(k) {
  const name = MODES[k] ? MODES[k].name : 'This style';
  openDialog(name + ' needs lines', (body) => {
    body.appendChild(el('p', null, name + ' writes your words along the lines of the Vector layer. There are no lines yet.'));
    body.appendChild(el('p', 'note', 'Trace lines follows the tones of the photo now. Draw lines opens the Vector panel with the Pen.'));
    const row = el('div', 'row2 exp-go');
    const trace = optBtn('Trace lines', () => {
      closeDialog();
      // a line drawing gives its own strokes; a photo gives its outlines, which keep the subject clear
      const st = (ui.suggestion && ui.suggestion.stats) || photoStats(src);
      if (st.lines) ui.trace.kind = (ui.suggestion && ui.suggestion.trace) || 'dark';
      // a photo: the lines of its tones. Its outlines break into short bits on hair and texture, and a face
      // made of them does not read; tone lines keep the eyes, the cheeks and the shape around them.
      else { ui.trace.kind = 'contours'; ui.trace.levels = 4; }
      traceNow((paths) => { if (paths.length) usePluginStyle(k); else toast('No lines were found. Try another Follow setting in the Vector panel, or draw some.'); });
    }, true);
    const draw = optBtn('Draw lines', () => { closeDialog(); ui.tab = 'lines'; buildTabs(); buildPanel(); setTool('pen'); toast('Draw with the Pen or the Pencil, then pick ' + name + ' again.'); });
    row.append(optBtn('Cancel', closeDialog), draw, trace);
    body.appendChild(row);
  });
}
/* A note with one short line. The rest of a longer note waits behind a small "?" button. */
const openNotes = new Set();
function qnote(text, more, key) {
  if (text && typeof text === 'object') { more = text.more; text = text.text; }
  text = String(text || '');
  if (!more) {
    // a long note without a split of its own: its first sentence shows
    const m = text.length > 64 && text.match(/^(.{24,}?[.!?])\s+(\S[\s\S]*)$/);
    if (m) { text = m[1]; more = m[2]; }
  }
  const n = el('span', 'note');
  if (!more) { n.textContent = text; return n; }
  const k = key || text;
  const rest = el('span', 'note-more', ' ' + more); rest.hidden = !openNotes.has(k);
  const b = el('button', 'note-q', '?'); b.type = 'button'; b.title = 'More about this'; b.setAttribute('aria-label', 'More about this');
  b.setAttribute('aria-expanded', String(!rest.hidden));
  b.onclick = () => { rest.hidden = !rest.hidden; if (rest.hidden) openNotes.delete(k); else openNotes.add(k); b.setAttribute('aria-expanded', String(!rest.hidden)); };
  // the last word and the "?" stay together, so the button never starts a line on its own
  const cut = text.lastIndexOf(' '), tail = el('span', 'note-tail', text.slice(cut + 1) + ' ');
  tail.appendChild(b);
  n.append(document.createTextNode(text.slice(0, cut + 1)), tail, rest);
  return n;
}
/* Settings in one folded section, in small named groups: [title, controls, what a change does] */
function groupDisclosure(key, label, on, parts, obj, onToggle) {
  const det = el('details', 'more group-more'); det.open = !!ui.open[key]; det.id = 'grp-' + key;
  det.ontoggle = () => { ui.open[key] = det.open; if (onToggle) onToggle(); };
  const sum = el('summary'); sum.innerHTML = CHEV; sum.appendChild(document.createTextNode(label + (on ? ' (on)' : '')));
  const inner = el('div', 'inner');
  parts.forEach(([title, list, after]) => {
    const nodes = list.map((c) => makeControl(obj, c, after)).filter(Boolean);
    if (!nodes.length) return;
    const g = el('div', 'sub-grp');
    // a group whose first control already says its name needs no title of its own
    const first = list.find((c) => !c.show || c.show(obj));
    if (title && !(first && first.label === title)) g.appendChild(el('div', 'sub-t', title));
    nodes.forEach((n) => g.appendChild(n));
    inner.appendChild(g);
  });
  det.append(sum, inner);
  return det;
}
/* Everything that belongs to the selected layer, in the order an artist works: the style, the words, size, color,
   the background, then the folded groups. */
function buildControls() {
  const box = document.getElementById('controls'); if (!box) return;
  const L = curLayer();
  const M = MODES[L.mode];
  sizesToWidth(L);
  box.replaceChildren();
  const all = M.controls.concat(M.more || []), main = new Set(M.controls);
  const groupOf = (c) => c.type === 'colormode' || c.type === 'printon' ? 'color' : c.type === 'note' ? 'style' : Object.keys(GROUP_KEYS).find((g) => g !== 'styleMore' && GROUP_KEYS[g].includes(c.key)) || 'style';
  const pick = (g) => all.filter((c) => groupOf(c) === g);
  const add = (into, list, after) => list.forEach((c) => { const n = makeControl(L, c, after); if (n) into.appendChild(n); });
  // the style: what it does, and its own settings
  const tools = el('span', 'sec-tools');
  const sb = el('button', 'icon-btn'); sb.type = 'button'; sb.innerHTML = SHUFFLE; sb.title = 'Shuffle: lay this style out again, differently (R)'; sb.setAttribute('aria-label', 'Shuffle');
  sb.onclick = () => shuffleLayer();
  const vb = el('button', 'icon-btn'); vb.type = 'button'; vb.innerHTML = VARIANTS; vb.title = 'Variations: six takes on this style to pick from'; vb.setAttribute('aria-label', 'Variations');
  vb.onclick = () => showVariations();
  tools.append(sb, vb);
  let s = sec(box, M.name, tools); s.id = 'sec-style';
  const about = M.about || (M.plugin && M.plugin.description);
  if (about) { const n = qnote(String(about).slice(0, 220)); n.classList.add('style-about'); s.appendChild(n); }
  const vbox = el('div'); vbox.id = 'varBox'; vbox.hidden = true; s.appendChild(vbox);
  const own = pick('style'), later = (c) => !main.has(c) || GROUP_KEYS.styleMore.includes(c.key);
  add(s, own.filter((c) => !later(c)));
  const ownMore = own.filter(later);
  if (ownMore.some((c) => c.type !== 'note')) s.appendChild(disclosure('more', 'More ' + M.name + ' settings', ownMore, L));
  // the words
  const words = pick('words');
  if (words.length) {
    s = sec(box, L.mode === 'halftone' || (words.length === 1 && words[0].key === 'rampName') ? 'Characters' : 'Words'); s.id = 'sec-words';
    add(s, words);
  }
  // size: the letter size first, then the space between the lines, then one size for everything
  s = sec(box, 'Size'); s.id = 'sec-size';
  add(s, pick('size')); add(s, pick('spacing'));
  { const n = makeControl(L, TEXT_SCALE); if (n) s.appendChild(n); }
  add(s, pick('font'));
  // under More: the style's own letter settings first (Weight follows tone before the weight), then the shared ones
  const lk = pick('letters'), have = new Set(lk.map((c) => c.key));
  const shared = letterControls(L, M).filter((c) => !c.key || !have.has(c.key) || c.key === 'upper');
  const rank = { weightMod: 0, weight: 1, tracking: 2, sizeMod: 3, italic: 5, upper: 6 };
  const letters = lk.filter((c) => c.key !== 'upper' || !shared.some((x) => x.key === 'upper')).concat(shared)
    .map((c, i) => [c, (c.key ? rank[c.key] ?? 4 : 1) * 100 + i]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  if (letters.length) s.appendChild(disclosure('letters', 'More size settings' + (L.italic ? ' (italic)' : ''), letters, L));
  // color
  s = sec(box, 'Color'); s.id = 'sec-color';
  add(s, pick('color'));
  if (!all.some((c) => c.type === 'colormode')) s.appendChild(fitControl(L));
  add(s, EFFECT_CTL.filter((c) => ['limitColors', 'palette'].includes(c.key || c.type)));
  // the background, right after the colors it goes with
  if (doc.text.applied) paperBlock(box, ' A recipe sets it too.');
  // folded: mirror, shape, finish and tone
  s = sec(box); s.classList.add('folds');
  s.appendChild(mirrorSection(L));
  // Word cloud turns its words with settings of its own; they sit here, where every other style turns its text
  const cloudTurn = L.mode === 'cloud' && ((L.rotSet || [0]).some((a) => a !== 0) || L.rotAngle !== 0 || L.rotTilt > 0);
  const shapeOn = L.region !== 'all' || L.focus !== 'none' || (L.mode !== 'cloud' ? turnOn(L) : cloudTurn);
  s.appendChild(groupDisclosure('shape', 'Shape: draw on, fade, turn', shapeOn, [
    ['Draw on', DRAW_ON_CTL],
    ['Focus and fade', FOCUS_CTL, (d) => { queueHistory(); scheduleText(d); drawOverlay(); }],
    ['Turn the text', L.mode !== 'cloud' ? TURN_CTL : pick('turn')]
  ], L, () => drawOverlay()));
  const finishOn = C.fillOn(L) || L.effect !== 'none' || L.jitter > 0 || L.alpha < 1 || L.alphaTone > 0 || L.opacity < 1;
  s.appendChild(groupDisclosure('finish', 'Finish: letter fill, effects, see-through', finishOn, [
    ['Letter fill', FILL_CTL, (d) => { queueHistory(); redrawFill(d); }],
    ['Letter effect', EFFECT_CTL.filter((c) => ['effect', 'effectColor', 'jitter'].includes(c.key))],
    ['See-through', EFFECT_CTL.filter((c) => ['alpha', 'alphaTone'].includes(c.key)).concat([LAYER_OPACITY_CTL])]
  ], L));
  const toneOn = L.contrast !== 1 || L.brightness !== 0 || L.gamma !== 1 || !!L.invert || L.autoLevels === false;
  s.appendChild(groupDisclosure('tone', 'Tone: contrast, brightness, gamma', toneOn, [
    [null, TONE_SHARED_CTL.concat(pick('tone'), [{ type: 'note', text: 'The Photo panel changes the picture for every layer.', more: 'These settings change only how this layer reads it.' }])]
  ], L));
  updatePalette();
  drawOverlay();
}

/* Mirror: both kinds in one place. The writing of this layer, mirrored and laid out again, and the whole
   finished text art mirrored for an iron-on transfer. */
function mirrorSection(L) {
  const on = (L.mirror && L.mirror !== 'none') || doc.text.flipX || doc.text.flipY;
  const det = disclosure('mirror', 'Mirror' + (on ? ' (on)' : ''), MIRROR_CTL, L);
  det.id = 'sec-mirror';
  const inner = det.querySelector('.inner');
  if (doc.text.applied) {
    [T('flipX', 'Mirror the whole text art across', { idp: 'tf-', rebuild: () => buildPanel() }), T('flipY', 'Mirror the whole text art up and down', { idp: 'tf-', rebuild: () => buildPanel() })]
      .forEach((c) => inner.appendChild(makeControl(doc.text, c, () => { compose(); queueHistory(); scheduleText(0); })));
    inner.appendChild(qnote(MIRROR_ALL_NOTE));
  }
  return det;
}

/* ---------------- recipes, suggestion, apply ---------------- */
/* the text a recipe keeps: the words already typed, if any */
function recipeText() { return doc.text.layers.map((L) => L.text).find((t) => t && t.length > 3 && t !== LINE_TEXT); }
function recipeLayers(r) {
  const oldText = recipeText();
  return r.layers.map(([m, o]) => {
    const L = newLayer(m, o);
    if (oldText && 'text' in MODES[m].defaults && m !== 'halftone') L.text = oldText;
    // after a cutout the subject itself is the shape to fill
    if (hasRemoval && m === 'mosaic' && L.region === 'all') L.threshold = 0;
    if (hasRemoval && m === 'calligram' && L.maskSource === 'image') L.maskSource = 'cutout';
    // a recipe that fills the subject of the photo takes the shape Apply text art would find for this photo
    // the flagship recipe: the Word cloud Apply text art gives, on any photo
    if (o.flagship && m === 'cloud') {
      delete L.flagship;
      Object.assign(L, flagshipCloud((ui.suggestion && ui.suggestion.stats) || photoStats(src), true).layer);
      if (hasRemoval) L.maskSource = 'cutout';
    }
    if (o.shapeFromPhoto && m === 'cloud') {
      delete L.shapeFromPhoto;
      const st = (ui.suggestion && ui.suggestion.stats) || photoStats(src);
      if (!st.plain) { const c = cloudFor(st); for (const k of ['maskSource', 'maskInvert', 'threshold', 'maskSmooth']) if (k in c) L[k] = c[k]; }
    }
    return L;
  });
}
function applyRecipe(r) {
  revealSoon();
  doc.out.paper = r.paper; doc.out.transparent = !!r.transparent; doc.out.printedOn = 'auto';
  const lineLayers = doc.text.layers.filter((L) => L.mode === 'paths');
  doc.text.layers = recipeLayers(r).concat(doc.text.source === 'both' ? lineLayers : []);
  if (doc.text.source === 'lines') doc.text.source = 'photo';
  doc.text.sel = Math.max(0, recipeLayers(r).length - 1);
  doc.text.applied = true;
  buildPanel(); if (ui.view === 'photo') setView('text'); scheduleText(0); queueHistory();
  toast('Applied ' + r.name, { label: 'Undo', fn: undo });
}
/* Apply text art starts from the flagship look of SungFluence: a Word cloud that takes its shape from the photo,
   on warm black paper, in the photo's own colors (flagshipCloud). A photo that gives no clear shape for it
   starts in the style picked for that picture instead (pictureLook), and the note says so. */
function suggestFor(s) {
  const st = photoStats(s), flag = flagshipCloud(st);
  if (flag) return Object.assign(flag, { trace: st.dark < 0.62 ? 'dark' : 'light', stats: st });
  const sg = pictureLook(st);
  // a picture whose own pick is a Word cloud keeps it, on white paper, such as a bold logo
  if (sg.kind !== 'cloud') {
    sg.flagshipOff = flagshipWhyNot(st);
    // a detailed dark subject has a clear outline, but a Word cloud would keep only that
    const lost = sg.flagshipOff === 'lost', a = /^[AEIOU]/.test(sg.name) ? 'an ' : 'a ';
    sg.note = (lost ? 'A Word cloud would keep only the outline of this photo' : 'This photo has no clear shape for a Word cloud') + ', so it starts as ' + sg.name + '. Word cloud is one click away.';
    // after Apply the note sits next to its Word cloud button, so it does not need to say so
    sg.toast = (lost ? 'A Word cloud would keep only the outline here' : 'No clear shape for a Word cloud here') + ', so this is ' + a + sg.name + '.';
  }
  return sg;
}
/* The flagship Word cloud for a photo, from photoStats: the shape, the paper and the note. Returns null when
   the photo gives no usable shape for it (see flagshipWhyNot); force returns the look anyway, for a Word cloud
   the user picked. The words, their sizes and the text size are the same on every photo. */
function flagshipCloud(st, force) {
  if (!force && flagshipWhyNot(st)) return null;
  // words that read on dark paper: the photo's colors, lifted where they would sink into it. Bigger words on
  // the brightest parts, so the lit parts of the subject stand out, and words turned both ways, so the shape
  // fills closely. shapeTidy is off: the shape keeps every part the photo gives it, as the light catches it.
  const layer = { maskSource: 'image', maskInvert: false, threshold: 0.45, shapeTidy: false, rotSet: [0, -90], gradient: 'light', gradientAmount: 0.6,
    maxSize: 64, minSize: 5, color: 'image', colorFit: 'strong', edgePiece: 0.04 };
  let note;
  if (st.plain || !st.tone) {
    // a new artboard or a plain picture: the words fill the page in a pale ink
    Object.assign(layer, { maskInvert: (st.mean ?? 1) <= 0.5, color: 'ink', inkColor: '#f2efe6', gradient: 'center', gradientAmount: 0.8 });
    note = 'The words fill the page.';
  } else if (st.cut) {
    layer.maskSource = 'cutout';
    note = 'The words fill the cutout and take its colors.';
  } else if (st.tone.light) {
    // a light subject on a darker ground, such as a lit cup or face: on dark paper the light parts are the shape
    layer.threshold = +clamp(st.tone.ink - 0.04, 0.25, 0.7).toFixed(2);
    note = 'The words fill the light parts of the photo and take its colors.';
  } else {
    // a dark subject on a light ground: the shape is swapped, so the dark parts hold the words
    Object.assign(layer, { maskInvert: true, threshold: +clamp(1 - st.tone.ink, 0.25, 0.75).toFixed(2) });
    note = 'The words fill the dark parts of the photo and take its colors.';
  }
  // a soft subject, such as a flat logo, has no bright parts of its own to hold the big words: sizes are mixed all over
  if (st.soft && layer.gradient === 'light') layer.gradient = 'none';
  return { kind: 'cloud', name: MODES.cloud.name, layer, note, why: 'flagship', paper: FLAGSHIP_PAPER, flagship: true };
}
/* Why a photo gives no usable shape for the flagship Word cloud, or '' when it does. A line drawing is too thin
   to hold words; a soft picture has no outline; words spread over several subjects lose them all; a dark subject
   needs a plain, lighter ground around it, or its shape runs into the ground; a dark subject full of detail,
   such as a drawn cat or a launch tower, becomes a plain silhouette on dark paper, and what makes it (the eyes,
   the struts) is lost; and a shape that covers next to nothing, or nearly everything, shows no subject. */
function flagshipWhyNot(st) {
  if (!st || st.plain || !st.tone || st.cut) return '';
  if (st.lines) return 'lines';
  const g = st.ground;
  // a soft picture with a plain ground still has a subject, such as a flat logo; with none, the shape is a
  // band of tone across the picture, such as a sunset
  if (st.soft && (g.even < 0.4 || g.sep < 0.2 || st.tone.edge > 0.2)) return 'soft';
  if (g.main < 0.6) return 'several';
  if (!st.tone.light && (g.even < 0.4 || g.sep < 0.2)) return 'ground';
  // the light ground goes dark and the dark subject fills with words: its outline stays, its inside does not.
  // A plain dark subject, such as a loaf on white, has nothing inside to lose.
  if (!st.tone.light && (st.detailMean || 0) > 0.03) return 'lost';
  if (st.tone.cover < 0.06 || st.tone.cover > 0.85) return 'cover';
  return '';
}
/* The style picked for one picture, from photoStats: the first look of a photo with no clear shape for the
   flagship. A single clear subject with paper around it keeps its outline as a Word cloud on white. Line
   drawings and flat pictures with several subjects become a Text portrait. Faces, photos without a plain
   background, subjects that fill the frame and fine line patterns become a Halftone made of the picture's name
   and a sentence, which keeps every tone and still reads as letters up close. */
function pictureLook(st) {
  const pick = firstPick(st);
  const trace = st.dark < 0.62 ? 'dark' : 'light';
  if (pick.mode !== 'cloud') {
    const layer = {};
    let note = pick.note;
    if (pick.mode === 'halftone') {
      Object.assign(layer, halftoneLook(st, pick.why));
      note += ' Zoom in to read the letters.';
    } else if (pick.why === 'several') {
      // pale subjects, such as a white bear drawn on white, would fade into the paper: letters in the photo's
      // colors, deepened until they read on white
      Object.assign(layer, { letterFill: 'ink', color: 'image', colorFit: 'strong' });
    }
    return { kind: pick.mode, name: MODES[pick.mode].name, layer, trace, note, why: pick.why, stats: st, paper: '#ffffff' };
  }
  const layer = cloudFor(st), paper = layer.__paper;
  delete layer.__paper;
  const shape = layer.maskSource === 'cutout' ? 'the cutout' : layer.maskSource === 'detail' ? 'the sharp, detailed subject'
    : (paper !== '#ffffff') !== !!layer.maskInvert ? 'the light parts' : 'the dark parts';
  const look = layer.color === 'image' ? 'take their colors from the photo' : 'take the tones of the photo';
  const note = st.plain ? 'The words fill the page.' : (pick.note ? pick.note + ' ' : '') + 'The words fill ' + shape + ' and ' + look + '.';
  return { kind: 'cloud', name: MODES.cloud.name, layer, trace, note, why: pick.why, stats: st, paper };
}
/* The settings of a first-look halftone for a photo (photoStats), also used when the Halftone tile is the first
   style picked */
function halftoneLook(st, why) {
  // letters you can read at 100%: the name of the picture, then a sentence. A sentence, not one short word,
  // so the letters do not line up into stripes across the screen.
  const layer = { text: firstText() };
  // fine lines: small letters in plain ink, a screen finer than the lines, so their pattern stays clear
  if (why === 'thin') return Object.assign(layer, { cols: 140, toneGamma: 1 });
  // big letters that overlap in the dark parts, so the darks are deep and the picture has real contrast.
  // A light picture gets a finer screen, so its detail stays crisp. Black ink is darker than any photo
  // color, so a gray photo needs less overlap.
  const light = st.mean > 0.55, colored = st.sat >= 0.08;
  Object.assign(layer, { cols: light ? 120 : 104, scale: colored ? (light ? 1.9 : 2) : (light ? 1.6 : 1.75), toneGamma: 1 });
  // the photo's own colors, a little richer; a bright, strong color still gets its dots. A gray photo keeps the dark ink.
  if (colored) Object.assign(layer, { color: 'image', saturation: 1.2, chromaDot: 0.6 });
  return layer;
}
/* The text of a first-look halftone: the name of the picture when it is a real word, then a sentence */
const CAMERA_NAMES = /^(img|image|dsc|dscn|dscf|pxl|mvimg|photo|pic|picture|scan|screenshot|screen|shot|untitled|whatsapp|edited|copy|final|file|download|sample|new|jpeg|jpg|png|heic|webp)$/i;
function firstText() {
  const stem = String(doc.fileName || '').replace(/\.[a-z0-9]+$/i, '');
  const word = (stem.match(/[A-Za-z]{3,14}/g) || []).find((w) => !CAMERA_NAMES.test(w));
  return ((word ? word + ' ' : '') + PASSAGE).toUpperCase();
}
/* The style for a first look, from photoStats. why names the reason, for tests and the help; note says it
   to the user, from what was measured. */
function firstPick(st) {
  if (st.plain) return { mode: 'cloud', why: 'plain' };
  const g = st.ground, tone = (why, note) => ({ mode: 'halftone', why, note });
  // one compact patch of skin color, away from the edges of the picture: a face
  if (st.face) return tone('face', 'This looks like a face, so a halftone of letters keeps its features.');
  if (st.lines) {
    // black and white with no grays: lines. Lines about as wide as a row of letters, or thinner, would cut the
    // letters into pieces, so they get a fine halftone; wider strokes hold whole letters.
    if (st.stroke < 0.024) return tone('thin', 'The picture is made of fine lines, so a fine halftone of letters keeps their pattern.');
    if (st.stroke < 0.07) return { mode: 'rows', why: 'lines', note: 'This looks like a line drawing, so the letters fill its strokes.' };
    // wider than that: flat, solid shapes, such as a logo. They are judged like any other picture below.
  }
  if (st.cut) return { mode: 'cloud', why: 'cutout' };
  // a background is plain when most of the edge of the picture is one calm tone, clearly apart from the subject.
  // Near the cutoff, a calm edge around a detailed middle decides, so a small change to the photo does not flip the style.
  const even = g.even >= 0.52 || (g.even >= 0.4 && st.detail.ratio < 0.6);
  if (!even || g.sep < 0.2) {
    if (st.soft) return tone('soft', 'The picture is soft, with no sharp outlines, so a halftone of letters keeps every tone.');
    return tone('ground', 'The picture has no plain background, so a halftone of letters keeps all of its tones.');
  }
  if (g.open < 0.4) return tone('fills', 'The subject fills most of the picture, so a halftone of letters keeps its detail.');
  // a plain background: one subject keeps its outline, several flat ones each keep their colors
  if (g.main < 0.6) return { mode: 'rows', why: 'several', note: 'Several subjects sit on a plain background, so letters in rows show each one in its own colors.' };
  // a cloud of words shows only the outline, so it needs the whole outline: paper around most of the subject.
  // A subject that runs off the frame, such as a rocket on its launch pad, keeps its detail as a halftone.
  if (g.even < 0.7) return tone('edge', 'The subject runs off the edge of the picture, so a halftone of letters keeps all of its detail.');
  return { mode: 'cloud', why: 'subject', note: 'One clear subject sits on a plain background, so a cloud of words takes its outline.' };
}
/* Numbers about a photo, from one pass over its 800 px copy: tones, color, and a coarse grid of tone and
   detail that says where the subject is. The edge of the picture is taken as the background. */
function photoStats(s) {
  if (!s) return { bin: 0, sat: 0.2, dark: 0.4, mean: 0.5, lines: false, plain: true };
  // removed areas, such as the see-through part of a PNG, do not count
  const keep = hasRemoval ? keepFor(s.w, s.h) : null;
  const w = s.w, h = s.h, cs = Math.max(4, Math.ceil(Math.max(w, h) / 40)), gw = Math.ceil(w / cs), gh = Math.ceil(h / cs);
  const gl = new Float32Array(gw * gh), gd = new Float32Array(gw * gh), gn = new Float32Array(gw * gh), gk = new Float32Array(gw * gh), gs = new Float32Array(gw * gh), H = new Float64Array(256), Hm = new Float64Array(256);
  let bin = 0, sat = 0, dark = 0, mean = 0, n = 0, cut = 0, skin = 0;
  // every second pixel each way: plenty for these numbers, and a quarter of the work, so it never freezes the window
  const sk = w * h > 160000 ? 2 : 1;
  for (let y = 0; y < h; y += sk) {
    const row = ((y / cs) | 0) * gw, midY = y > h * 0.25 && y < h * 0.75;
    for (let x = 0, i = y * w; x < w; x += sk, i += sk) {
      if (keep && keep[i] < 0.5) { cut++; continue; }
      n++;
      const l = s.lum[i];
      if (l < 0.18 || l > 0.82) bin++;
      if (l < 0.5) dark++;
      mean += l;
      const k = Math.min(255, (l * 256) | 0);
      H[k]++;
      if (midY && x > w * 0.25 && x < w * 0.75) Hm[k]++;
      const r = s.r[i], gg = s.g[i], bb = s.b[i], hi = Math.max(r, gg, bb), lo = Math.min(r, gg, bb);
      sat += hi - lo;
      const g = row + ((x / cs) | 0);
      // a common rule for skin colors: warm, a little saturated, red above green above blue. Wood, coffee and
      // sand match it too, so a face is told apart by where the skin color lies (see face below), not by how much there is.
      if (r > 0.37 && gg > 0.16 && bb > 0.08 && hi - lo > 0.06 && r - gg > 0.06 && r > bb && gg > bb * 0.9 && l > 0.35 && (hi - lo) < 0.6 * hi) { skin++; gk[g]++; }
      gl[g] += l; gn[g]++; gs[g] += hi - lo;
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) gd[g] += Math.min(0.3, Math.abs(s.lum[i + 1] - s.lum[i - 1]) + Math.abs(s.lum[i + w] - s.lum[i - w]));
    }
  }
  const tot = Math.max(1, n);
  bin /= tot; sat /= tot; dark /= tot; mean /= tot; skin /= tot;
  const st = { bin, sat, dark, mean, lines: bin > 0.86 && sat < 0.08, cut: n > 64 && cut > 0.05 * w * h / (sk * sk), plain: false, skin, face: false, stroke: 0, soft: false, subjSat: sat };
  // stroke: how wide the dark lines of a black and white picture are, as a share of its longest side. The
  // middle run of dark pixels along every fourth row and column, weighted by length.
  if (st.lines) {
    const runs = [];
    const scan = (len, steps, at) => { for (let a = 0; a < steps; a += 4) { let b0 = -1; for (let b = 0; b <= len; b++) { const d = b < len && s.lum[at(a, b)] < 0.5; if (d && b0 < 0) b0 = b; if (!d && b0 >= 0) { runs.push(b - b0); b0 = -1; } } } };
    scan(w, h, (y, x) => y * w + x); scan(h, w, (x, y) => y * w + x);
    runs.sort((a, b) => a - b);
    const all = runs.reduce((a, v) => a + v, 0);
    let acc = 0;
    for (const v of runs) { acc += v; if (acc >= all / 2) { st.stroke = v / Math.max(w, h); break; } }
  }
  const pct = (f) => { let a = 0; for (let k = 0; k < 256; k++) { a += H[k]; if (a >= f * tot) return (k + 0.5) / 256; } return 1; };
  const p2 = pct(0.02), p98 = pct(0.98);
  if (n < 64 || p98 - p2 < 0.08) { st.plain = true; return st; }
  // Otsu's split of a set of values: the cut that best separates them into two groups
  const split = (vals, wts) => {
    let lo = Infinity, hi = -Infinity;
    vals.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    if (!(hi > lo)) return lo;
    const B = new Float64Array(64);
    vals.forEach((v, j) => { B[Math.min(63, ((v - lo) / (hi - lo) * 64) | 0)] += wts ? wts[j] : 1; });
    let all = 0, sumAll = 0;
    for (let k = 0; k < 64; k++) { all += B[k]; sumAll += k * B[k]; }
    let wb = 0, sb = 0, best = -1, at = 32;
    for (let k = 0; k < 63; k++) {
      wb += B[k]; sb += k * B[k];
      const wf = all - wb; if (!wb || !wf) continue;
      const d = sb / wb - (sumAll - sb) / wf, v = wb * wf * d * d;
      if (v > best) { best = v; at = k; }
    }
    return lo + (at + 1) / 64 * (hi - lo);
  };
  // the grid cells, with the ring along the edge of the picture and the middle of it
  const cells = [], ring = Math.max(1, Math.round(Math.min(gw, gh) * 0.12));
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const g = gy * gw + gx;
    if (gn[g] < cs * cs * 0.25 / (sk * sk)) continue;
    const u = (gx + 0.5) / gw, v = (gy + 0.5) / gh;
    cells.push({ l: gl[g] / gn[g], d: gd[g] / gn[g], s: gs[g] / gn[g], u, v, edge: gx < ring || gy < ring || gx >= gw - ring || gy >= gh - ring, mid: Math.abs(u - 0.5) < 0.25 && Math.abs(v - 0.5) < 0.25 });
  }
  const avg = (list, k) => list.reduce((a, c) => a + c[k], 0) / Math.max(1, list.length);
  const edge = cells.filter((c) => c.edge), mid = cells.filter((c) => c.mid);
  // the ground: how even the ring along the edge of the picture is, in tone and in detail
  const eLs = edge.map((c) => c.l).sort((a, b) => a - b), gL = eLs[eLs.length >> 1] ?? 0.5;
  const isGround = (c) => Math.abs(c.l - gL) < 0.1 && c.d < 0.05;
  const subj = cells.filter((c) => !isGround(c)), sL = avg(subj, 'l');
  // even: the share of the edge that is ground; open: the share of the whole picture that is ground
  st.ground = { l: gL, even: edge.filter(isGround).length / Math.max(1, edge.length), open: 1 - subj.length / Math.max(1, cells.length),
    sep: Math.abs(sL - gL), main: 0 };
  // the color of the subject alone: a white background would make a brown loaf look gray
  if (subj.length) st.subjSat = avg(subj, 's');
  // soft: little sharp detail anywhere, such as a sky or a gradient
  st.detailMean = avg(cells, 'd'); st.soft = st.detailMean < 0.012;
  // a face: one compact patch of skin color, a few percent to a third of the picture, that does not
  // stretch across it. Skin colors spread over the whole picture, as on wood or coffee, are not a face.
  {
    const on = new Uint8Array(gw * gh), seen = new Uint8Array(gw * gh);
    let cnt = 0;
    for (let g = 0; g < on.length; g++) if (gn[g] && gk[g] / gn[g] > 0.5) { on[g] = 1; cnt++; }
    let best = 0, box = null;
    for (let i0 = 0; i0 < on.length; i0++) {
      if (!on[i0] || seen[i0]) continue;
      const stack = [i0]; let k = 0, x0 = gw, x1 = 0, y0 = gh, y1 = 0; seen[i0] = 1;
      while (stack.length) {
        const i = stack.pop(), x = i % gw, y = (i - x) / gw; k++;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        [x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, i - gw, i + gw].forEach((j) => { if (j >= 0 && j < on.length && on[j] && !seen[j]) { seen[j] = 1; stack.push(j); } });
      }
      if (k > best) { best = k; box = [x0, y0, x1, y1]; }
    }
    if (box) {
      const bw = (box[2] - box[0] + 1) / gw, bh = (box[3] - box[1] + 1) / gh, cover = best / on.length;
      st.faceBlob = { cover: +cover.toFixed(3), share: +(best / cnt).toFixed(2), w: +bw.toFixed(2), h: +bh.toFixed(2), fill: +(best / ((box[2] - box[0] + 1) * (box[3] - box[1] + 1))).toFixed(2) };
      st.face = cover >= 0.04 && cover <= 0.32 && best / cnt >= 0.5 && bw <= 0.6 && bh <= 0.8 && st.faceBlob.fill >= 0.35;
    }
  }
  // the share of the subject that is one connected piece: 1 for a single subject, small for many separate ones
  const on = new Uint8Array(gw * gh), seen = new Uint8Array(gw * gh);
  subj.forEach((c) => { on[Math.floor(c.v * gh) * gw + Math.floor(c.u * gw)] = 1; });
  for (let i0 = 0; i0 < on.length; i0++) {
    if (!on[i0] || seen[i0]) continue;
    const stack = [i0]; let k = 0; seen[i0] = 1;
    while (stack.length) {
      const i = stack.pop(), x = i % gw; k++;
      [x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, i - gw, i + gw].forEach((j) => { if (j >= 0 && j < on.length && on[j] && !seen[j]) { seen[j] = 1; stack.push(j); } });
    }
    st.ground.main = Math.max(st.ground.main, k / Math.max(1, subj.length));
  }
  // how a candidate shape sits: its share of the picture and of the ring along the edge
  const judge = (inside) => ({ cover: cells.filter(inside).length / Math.max(1, cells.length), edge: edge.filter(inside).length / Math.max(1, edge.length) });
  // by detail: a calm background around a sharp subject
  const dCut = split(cells.map((c) => c.d));
  st.detail = Object.assign(judge((c) => c.d >= dCut), { ratio: avg(edge, 'd') / Math.max(1e-4, avg(mid, 'd')) });
  // by tone: the subject is the side the edge of the picture is not on. A light subject goes on dark paper,
  // where the light parts are the shape, so a lit face or cup reads the way it does in the photo.
  const lCut = split(cells.map((c) => c.l)), light = avg(edge, 'l') < avg(mid, 'l');
  const ink = (l) => clamp((l - p2) / (p98 - p2), 0, 1), bins = [...Array(256).keys()].map((k) => (k + 0.5) / 256);
  // the cut between the two sides: halfway between the best split of the whole picture and of its middle
  const cutL = 0.5 * (split(bins, H) + split(bins, Hm));
  st.tone = Object.assign(judge((c) => (c.l >= lCut) === light), { light, ink: +clamp(light ? ink(cutL) : 1 - ink(cutL), 0.25, 0.75).toFixed(2) });
  return st;
}
/* Tones for text art, from the photo's own numbers: black and white points, midtones that put the
   detail near the middle, and a little clarity and sharpening for soft photos. One pass over the
   800 px copy. keep: removed areas (keep < 0.5) do not count. Returns only the settings it changes. */
const AUTO_KEYS = ['levelLo', 'levelHi', 'gamma', 'clarity', 'sharpen', 'saturation'];
function autoPhoto(s, keep) {
  if (!s) return {};
  const w = s.w, h = s.h, H = new Float64Array(256), D = new Float64Array(256);
  let cnt = 0, dsum = 0, sat = 0, lap = 0, lapN = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (keep && keep[i] < 0.5) continue;
    const l = s.lum[i], k = Math.min(255, (l * 256) | 0);
    H[k]++; cnt++;
    // the detail histogram: tones weighted by how much they change nearby
    const gr = Math.min(0.3, Math.abs(s.lum[i + 1] - s.lum[i - 1]) + Math.abs(s.lum[i + w] - s.lum[i - w]));
    D[k] += gr; dsum += gr;
    if (!(x & 1) && !(y & 1)) { lap += Math.abs(4 * l - s.lum[i - 1] - s.lum[i + 1] - s.lum[i - w] - s.lum[i + w]); lapN++; }
    sat += Math.max(s.r[i], s.g[i], s.b[i]) - Math.min(s.r[i], s.g[i], s.b[i]);
  }
  if (cnt < 64) return {};
  sat /= cnt; lap /= Math.max(1, lapN);
  const pct = (A, tot, f) => { let a = 0; for (let k = 0; k < 256; k++) { a += A[k]; if (a >= f * tot) return (k + 0.5) / 256; } return 1; };
  const p0 = pct(H, cnt, 0.005), p50 = pct(H, cnt, 0.5), p100 = pct(H, cnt, 0.995), d50 = dsum > 0 ? pct(D, dsum, 0.5) : p50;
  if (p100 - p0 < 0.1) return {};   // a plain or nearly plain picture, such as a new artboard
  const o = {};
  const lo = p0 > 0.03 ? Math.min(p0 - 0.01, 0.2) : 0, hi = p100 < 0.95 ? Math.max(p100 + 0.01, 0.75) : 1;
  if (lo) o.levelLo = +lo.toFixed(3);
  if (hi < 1) o.levelHi = +hi.toFixed(3);
  // the middle of the tones and the middle of the detail, averaged: lift dark photos, deepen pale ones
  const m = clamp((0.5 * (p50 + d50) - lo) / (hi - lo), 0.02, 0.98);
  let gm = 1;
  if (m < 0.4) gm = Math.log(m) / Math.log(0.45); else if (m > 0.6) gm = Math.log(m) / Math.log(0.52);
  gm = clamp(gm, 0.75, 1.7);
  if (Math.abs(gm - 1) > 0.04) o.gamma = +gm.toFixed(2);
  if (lap < 0.09) { o.clarity = lap < 0.04 ? 0.3 : 0.2; o.sharpen = 0.25; }
  if (sat > 0.05 && sat < 0.16) o.saturation = 1.15;
  return o;
}
/* Auto tone in the Photo panel: the settings autoPhoto controls start again from the photo's own numbers */
function autoToneNow() {
  if (!baseSrc) return;
  commitHistory();
  AUTO_KEYS.forEach((k) => { doc.photo[k] = PHOTO_DEFAULTS[k]; });
  ui.autoSet = autoPhoto(baseSrc, keepFor(baseSrc.w, baseSrc.h));
  Object.assign(doc.photo, ui.autoSet);
  photoChanged('adjust'); buildPanel();
  toast('Set the tones for text art', { label: 'Undo', fn: undo });
}
/* Auto tone is on while the settings it controls still hold the values it set */
function autoToneOn() {
  const a = ui.autoSet;
  return !!a && Object.keys(a).length > 0 && AUTO_KEYS.every((k) => doc.photo[k] === (k in a ? a[k] : PHOTO_DEFAULTS[k]));
}
/* Auto tone off: the settings it controls go back to plain */
function autoToneOff() {
  commitHistory();
  AUTO_KEYS.forEach((k) => { doc.photo[k] = PHOTO_DEFAULTS[k]; });
  photoChanged('adjust'); buildPanel();
  toast('Turned Auto tone off', { label: 'Undo', fn: undo });
}
/* changed by hand: differs from plain, and is not a value Auto tone set while it is on */
function photoKeysChanged(keys) {
  const auto = autoToneOn() ? ui.autoSet : {};
  return keys.some((k) => doc.photo[k] !== PHOTO_DEFAULTS[k] && !(k in auto && doc.photo[k] === auto[k]));
}
/* Word cloud settings for a photo, from photoStats: the subject becomes the shape. Returns the layer
   settings; __paper is the paper the result is meant for. That is always white: SungFluence assumes the art is
   printed on light paper, and the colors are fitted to it. */
function cloudFor(st) {
  // minPiece: bits of the shape under 2% of it are left out, so no word lands far from the subject.
  // margin: a band of paper all round, so a subject that runs off the frame, such as the ground under it, ends inside the page.
  const o = { maskSource: 'image', maskInvert: false, rotSet: [0], gradient: 'center', gradientAmount: 0.8, minSize: 6, maxSize: 100, minPiece: 0.02, margin: 0.04, __paper: '#ffffff' };
  // a new artboard or a plain picture: the words fill the page
  if (st.plain) { o.maskInvert = st.mean > 0.5; o.color = 'ink'; o.inkColor = '#1d2433'; o.rotSet = [0, -90]; o.margin = 0; return o; }
  // gray or colored: judged on the subject alone, so a white background does not make a brown loaf gray
  const gray = (st.subjSat ?? st.sat) < 0.1;
  if (st.lines) {
    // a line drawing: small words in its strokes, so the lines still read
    return Object.assign(o, { threshold: 0.5, maskSmooth: 3, maxSize: 48, minSize: 4, gradient: 'none', rotSet: [0, -90], color: 'ink', inkColor: '#1d2433' });
  } else if (st.cut) {
    o.maskSource = 'cutout';
  } else if (st.tone.light) {
    // a light subject on a darker ground: the light parts hold the words, the biggest on the brightest parts.
    // On white paper the shape is swapped to get the light parts, so the threshold is read from the other side.
    Object.assign(o, { maskInvert: true, threshold: +(1 - st.tone.ink).toFixed(2), maxSize: 64, minSize: 5, gradient: 'light', gradientAmount: 0.6, rotSet: [0, -90] });
  } else if (st.detail.ratio < 0.7 && st.detail.edge < 0.5 && st.detail.cover > 0.12 && st.detail.cover < 0.75) {
    // a sharp subject on a calm, light ground: its outline is the shape. Bold words keep the outline clear and
    // easy to read; the biggest go on its brightest parts, so a white rocket stands out from the gray tower beside it.
    Object.assign(o, { maskSource: 'detail', threshold: +clamp(1 - st.detail.cover, 0.35, 0.6).toFixed(2), maxSize: 80, gradient: 'light', gradientAmount: 0.7, rotSet: [0, -90] });
  } else {
    // a dark subject on a light ground: the dark parts hold the words
    Object.assign(o, { threshold: st.tone.ink, maxSize: 80, rotSet: [0, -90] });
  }
  if (gray) Object.assign(o, { color: 'tone', inkColor: '#1d2433' });
  else Object.assign(o, { color: 'image', saturation: 1.3 });
  return o;
}
function updateCTA() {
  const c = $('cta');
  const blankEmpty = doc.blank && !doc.objects.some((o) => o.layer === 'photo');
  const show = !!origImg && !doc.text.applied && doc.out.mock === 'artboard' && !jobs.trace && ui.tool === 'hand' && !ui.ctaDismissed && !ui.cropDraft && !blankEmpty;
  const was = !c.hidden;
  c.hidden = !show;
  // the guide's hint waits until the card is answered, so the two never sit on top of each other
  if (!show) { if (was) { layoutStage(); if (ui.welcomeLater) setTimeout(welcomeOnce, 2500); } return; }
  const sg = ui.suggestion || suggestFor(src);
  if (c.dataset.for === doc.fileName + sg.note) return;
  c.dataset.for = doc.fileName + sg.note;
  // a photo with no clear shape for the flagship Word cloud: the note alone says which style it starts in, and why
  c.replaceChildren(el('h2', null, 'Turn this into text art'), el('p', null, sg.flagshipOff ? sg.note : 'Suggested: ' + sg.name + '. ' + sg.note));
  const row = el('div', 'row');
  const go = optBtn('Apply text art', () => applyTextArt(), true);
  const pick = optBtn('Choose a style', () => { ui.tab = 'text'; buildTabs(); buildPanel(); });
  const later = optBtn('Not now', () => { ui.ctaDismissed = true; updateCTA(); });
  later.classList.add('btn-quiet');
  row.append(go, pick, later);
  c.appendChild(row);
  // at Fit the picture moves up to leave room for the card, so the card never hides the subject
  layoutStage();
}
/* The room the card takes at the bottom of the stage, in pixels: none when it is hidden, when zoomed in, or
   when the stage is so short that the picture would get too small */
function ctaRoom() {
  const c = $('cta');
  if (!c || c.hidden || ui.zoom !== 'fit' || doc.out.mock !== 'artboard') return 0;
  const room = c.offsetHeight + 16;
  return wrap.clientHeight - room >= 0.45 * wrap.clientHeight ? room : 0;
}
function applyTextArt(key) {
  if (!src) return;
  if (doc.text.applied) { setView('text'); return; }
  revealSoon();
  // the settings are read from the photo as it is now, with its tones and any removed background
  let sg = ui.suggestion = suggestFor(src);
  // the Word cloud tile picked before Apply: the flagship look, even on a photo whose first look is another style
  if (key === 'cloud' && sg.kind !== 'cloud') sg = Object.assign(flagshipCloud(sg.stats || photoStats(src), true), { stats: sg.stats, trace: sg.trace });
  const kind = sg.kind || 'cloud';
  let L = newLayer(kind, sg.layer || {});
  // a style tile picked before Apply: the same first look (words, colors, letter size), in that style
  if (key && MODES[key] && key !== kind) {
    L = key === 'halftone' ? Object.assign(layerInStyle(L, 'halftone'), halftoneLook(sg.stats || {}, 'ground'))
      : layerInStyle(L, key);
    // the colors of the flagship were fitted to its dark paper; on white they fit the paper as usual
    if (sg.flagship) L.colorFit = COMMON_DEFAULTS.colorFit;
  }
  doc.out.paper = (key && key !== kind ? '#ffffff' : sg.paper) || '#ffffff'; doc.out.printedOn = 'auto';
  doc.text.layers = [L]; doc.text.source = MODES[L.mode].lines ? 'lines' : 'photo';
  doc.text.sel = 0; doc.text.applied = true;
  ui.tab = 'text'; buildTabs(); buildPanel(); showStyleSettings();
  // the photo stays on screen until the first pass of the text art is drawn, so the page never goes blank
  if (textCanvas) setView('text'); else { setView('photo'); ui.textWhenDrawn = true; }
  scheduleText(0); queueHistory();
  // a first look that is not the flagship says so once, with the Word cloud one click away
  if (!key && sg.flagshipOff) toast(sg.toast || sg.note, { label: 'Word cloud', fn: () => applyRecipe(RECIPES.find((r) => r.flagship)) });
}
/* After Apply text art, the settings of the chosen style must be in view. They sit right under the style tiles,
   so the panel stays at the top, tiles and all; it scrolls only when a short window leaves them out of sight. */
function showStyleSettings() {
  const c = document.getElementById('controls');
  if (!c) return;
  // scroll only the panel, never the page
  for (let p = c.parentElement; p && p !== document.body; p = p.parentElement) {
    if (p.scrollHeight > p.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(p).overflowY)) {
      const top = c.getBoundingClientRect().top - p.getBoundingClientRect().top;
      if (top > p.clientHeight - 160) p.scrollTop += top - 8;
      return;
    }
  }
}

/* ---------------- recipe thumbnails and variations ---------------- */
let thumbJob = 0, thumbTimer = null;
function thumbsSoon(d) { clearTimeout(thumbTimer); thumbTimer = setTimeout(renderThumbs, d ?? 700); }
/* Recipe pictures are kept for the photo and the artboard they were drawn for, so a new panel shows them at
   once and a job that is still drawing them goes on instead of starting over. */
const recipeThumbs = { src: null, key: null, list: [], running: false };
function thumbKey() { return [doc.out.width, doc.out.mock, doc.out.mock === 'shirt' ? doc.out.shirt : '', hasRemoval, recipeText() || ''].join('|'); }
/* after a change the key cannot see, such as fonts that just loaded */
function thumbsFresh() { recipeThumbs.key = null; thumbsSoon(); }
function paintThumbs() {
  const fresh = recipeThumbs.src === src && recipeThumbs.key === thumbKey();
  RECIPES.forEach((r, i) => {
    const c = document.getElementById('rt-' + i), t = fresh && recipeThumbs.list[i];
    if (!c || !t || c.dataset.drawn === recipeThumbs.key) return;
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(t, 0, 0);
    c.dataset.drawn = recipeThumbs.key;
  });
}
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
/* draw one thumbnail in small steps; the caller decides how long each step may run.
   contain: show the whole picture inside the canvas instead of filling it (the rest stays clear) */
function* thumbGen(c, scene, contain) {
  const o = yield* C.renderGen(thumbSource(), scene);
  // a Word cloud keeps its small words in a thumbnail (see cloudGrid), and letters a pixel high barely draw:
  // it is drawn larger, then scaled down, so it shows the light of every word, as the full-size art does
  const up = o.layers.some((Lr) => Lr.mode === 'cloud') ? clamp(Math.round(600 / o.W), 1, 3) : 1;
  const tmp = mk(o.W * up, o.H * up);
  // a software canvas draws each letter inside the sliced job; a GPU canvas saves them all for one long flush
  yield* C.drawGen(tmp.getContext('2d', { willReadFrequently: true }), o, up, { forcePaper: true });
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  const k = (contain ? Math.min : Math.max)(c.width / o.W, c.height / o.H), w = o.W * k, h = o.H * k;
  // a whole picture sits on its own paper, so the subject is never cut off and no gray bars show
  if (contain) { x.fillStyle = scene.ground || scene.paper || '#ffffff'; x.fillRect(0, 0, c.width, c.height); }
  x.imageSmoothingQuality = 'high';
  x.drawImage(tmp, (c.width - w) / 2, (c.height - h) / 2, w, h);
}
/* runs a list of thumbnail jobs, 8 ms at a time, and steps aside while the main artwork renders.
   A job returns [canvas, scene, { contain }]. opt: slice and rest in ms, done(canvas, ok) after each one, and end() after the last. */
function sliceThumbs(list, alive, opt) {
  opt = opt || {};
  let i = 0, gen = null, cur = null;
  const finish = (ok) => { if (opt.done && cur) opt.done(cur, ok); gen = null; cur = null; i++; };
  const tick = () => {
    if (!alive()) return;
    if (Object.keys(jobs).length) { setTimeout(tick, 250); return; }
    const t0 = performance.now();
    while (performance.now() - t0 < (opt.slice || 8)) {
      if (!gen) {
        if (i >= list.length) { if (opt.end) opt.end(); return; }
        const [c, scene, o] = list[i]();
        if (!c) { i++; continue; }
        cur = c; gen = thumbGen(c, scene, o && o.contain);
      }
      try { if (gen.next().done) finish(true); } catch (e) { finish(false); }
    }
    setTimeout(tick, opt.rest || 16);
  };
  tick();
}
/* the paper a recipe will be fitted to once it is applied: Printed on goes back to Auto, so the ground decides */
function recipeGround(r) { const ground = doc.out.mock === 'shirt' ? (doc.out.shirt || r.paper) : r.paper; return { ground, paperClass: C.paperClassOf(ground) }; }
function renderThumbs() {
  if (!src) return;
  const key = thumbKey();
  if (recipeThumbs.src !== src || recipeThumbs.key !== key) { recipeThumbs.src = src; recipeThumbs.key = key; recipeThumbs.list = []; recipeThumbs.running = false; thumbJob++; }
  paintThumbs();
  // drawn while the Text art panel is open, so they are ready when the Recipes tab opens; they stay for the next time
  if (recipeThumbs.running || ui.tab !== 'text' || !doc.text.applied || doc.text.source === 'lines' || RECIPES.every((r, i) => recipeThumbs.list[i])) return;
  const job = ++thumbJob; recipeThumbs.running = true;
  const cs = [];
  sliceThumbs(RECIPES.map((r, i) => () => {
    if (recipeThumbs.list[i]) return [null];
    cs[i] = mk(176, 132);
    return [cs[i], { width: doc.out.width, scale: 270 / doc.out.width, coarse: 2.2, paper: r.paper, ...recipeGround(r), layers: recipeLayers(r).map(engineLayer) }, { contain: true }];
  }), () => job === thumbJob, {
    slice: 12, rest: 4,
    done: (c, ok) => { const i = cs.indexOf(c); if (ok && i >= 0) { recipeThumbs.list[i] = c; paintThumbs(); } },
    end: () => { recipeThumbs.running = false; }
  });
}
function mutate(L, Rn) {
  const M = MODES[L.mode];
  const pool = M.controls.concat(M.more).filter((c) => ['range', 'seg', 'select', 'colormode', 'ramp'].includes(c.type) && !['cx', 'cy', 'size'].includes(c.key) || (c.key === 'size' && L.mode !== 'paths'));
  const v = JSON.parse(JSON.stringify(L));
  v.seed = 1 + Math.floor(Rn() * 98);
  const n = 2 + Math.floor(Rn() * 2);
  for (let i = 0; i < n && pool.length; i++) {
    const c = pool[Math.floor(Rn() * pool.length)];
    if (c.type === 'range') { const span = c.max - c.min; v[c.key] = Math.round((c.min + span * (0.15 + 0.7 * Rn())) / c.step) * c.step; if (PX_CTL.includes(c.key)) v[c.key] *= (v.pxW || doc.out.width) / BASE_W; }
    else if (c.type === 'colormode') v.color = c.options[Math.floor(Rn() * c.options.length)];
    else if (c.type === 'ramp') v.rampName = Object.keys(RAMPS)[Math.floor(Rn() * 5)];
    else if (c.options) v[c.key] = c.options[Math.floor(Rn() * c.options.length)][0];
  }
  if (Rn() < 0.3 && v.color !== 'image' && L.mode !== 'paths') v.inkColor = INKS[Math.floor(Rn() * INKS.length)];
  return v;
}
let varSeed = 11;
/* A new arrangement of the same settings: every style reads the seed, so one new number is enough. */
function shuffleLayer() {
  const L = curLayer();
  if (!L) return;
  let n = L.seed || 7;
  while (n === (L.seed || 7)) n = 1 + Math.floor(Math.random() * 99);
  L.seed = n;
  buildPanel(); scheduleText(0); queueHistory();
  toast('Laid out again, variation ' + n, { label: 'Undo', fn: undo });
}
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
  // the six takes open under the style's name, which can be far down the panel: bring them into view
  requestAnimationFrame(() => { if (box.isConnected && !box.hidden) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  const layersFor = (v) => activeLayers().map((x) => (x === L ? v : x));
  const vjob = ++varJob;
  sliceThumbs(variants.map((v, i) => () => [grid.children[i] && grid.children[i].firstChild, sceneFor(layersFor(v), 480 / doc.out.width, { coarse: 1.6 })]), () => vjob === varJob && !box.hidden && box.isConnected);
}
let varJob = 0;

/* The row of background colors. It sits in the Output panel and, once there is text art, in the
   Text art panel too, because that is where people are looking when they want to change it.
   On the T-shirt preview the background is the shirt, so the swatches are shirt colors and set both. */
function paperSwatches() {
  const o = doc.out, shirt = o.mock === 'shirt';
  const sw = el('div', 'swatches'); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', shirt ? 'T-shirt color' : 'Paper color');
  (shirt ? SHIRTS : PAPERS).forEach(([h, n]) => {
    const b = el('button', 'sw'); b.type = 'button'; b.style.background = h; b.setAttribute('aria-label', n + (shirt ? ' shirt' : ' paper')); b.title = n;
    b.setAttribute('aria-pressed', String(o.paper.toLowerCase() === h));
    // while Transparent is on, the paper color is only what JPG and the letter colors use: a quieter ring
    if (o.transparent && o.paper.toLowerCase() === h) { b.classList.add('sw-under'); b.title = n + ': used for JPG and the letter colors'; }
    b.onclick = () => { o.paper = h; if (shirt) o.shirt = h; inkForPaper(); buildPanel(); compose(); queueHistory(); scheduleText(0); };
    sw.appendChild(b);
  });
  // a clear background, as one more swatch: the canvas shows a checkerboard where the file stays clear
  const tb = el('button', 'sw sw-clear'); tb.type = 'button'; tb.id = 'sw-clear'; tb.title = 'Transparent';
  tb.setAttribute('aria-label', 'Transparent background'); tb.setAttribute('aria-pressed', String(!!o.transparent));
  tb.onclick = () => setTransparent(!o.transparent);
  sw.appendChild(tb);
  const own = !(shirt ? SHIRTS : PAPERS).some(([h]) => o.paper.toLowerCase() === h);
  const cs = customSwatch('c-paper', o.paper, shirt ? 'Custom T-shirt color' : 'Custom paper color', own && !o.transparent, (v) => { o.paper = v; if (shirt) o.shirt = v; compose(); queueHistory(); scheduleText(); });
  cs.querySelector('input').onchange = () => { if (inkForPaper()) scheduleText(0); buildPanel(); };
  sw.appendChild(cs);
  // what the art is printed on, so the colors fit it
  const f = document.createDocumentFragment();
  f.append(sw);
  if (o.transparent) f.append(transpShowRow());
  f.append(printedOnRow());
  return f;
}

function setTransparent(v) {
  const a = document.activeElement, back = a && a.id === 'sw-clear';
  doc.out.transparent = !!v;
  buildPanel(); compose(); queueHistory(); scheduleText(0);
  // a rebuilt panel loses the focus: give it back to the swatch, so the keyboard keeps its place
  if (back) { const b = document.querySelector('#sec-paper #sw-clear') || $('sw-clear'); if (b) b.focus(); }
}
/* The note under the swatches, in the Text art panel and on the Output tab */
function paperSwatchNote(extra) {
  const shirt = doc.out.mock === 'shirt';
  if (doc.out.transparent) {
    const name = ((shirt ? SHIRTS : PAPERS).find(([h]) => doc.out.paper.toLowerCase() === h) || [])[1];
    return 'Clear in PNG, SVG and PDF. JPG gets the ' + (shirt ? 'T-shirt' : 'paper') + ' color' + (name ? ', ' + name : '') + ', and the letters are chosen to show on it, so pick the one you will print on.';
  }
  return (shirt ? 'The T-shirt color behind the letters.' : 'The paper color behind the letters.') + (extra || '') + ' The checkered swatch makes the background transparent, for T-shirts, stickers and overlays. + Custom picks any other color.';
}
/* The Background section: the same block in the Text art panel and on the Output tab. It is the paper color,
   or the shirt color on the T-shirt preview. */
function paperBlock(p, extra) {
  const s = sec(p, 'Background'); s.id = 'sec-paper';
  // what the setting is, right under its name; the Printed on note stays with Printed on
  const n = qnote(paperSwatchNote(extra), null, 'paper'); n.classList.add('paper-note');
  s.append(n, paperSwatches());
  return s;
}
/* "+ Custom": any color, as a pill that cannot be taken for one more swatch. Once a color of its own is
   chosen, the pill shows it. */
function customSwatch(id, value, label, on, set, pick) {
  const lab = el('label', 'sw-custom' + (on ? ' on' : '')); lab.title = 'Any color';
  const ci = el('input'); ci.type = 'color'; ci.id = id; ci.value = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#111111'; ci.setAttribute('aria-label', label);
  // the color of its own takes the place of the "+", so the pill keeps its width
  const dot = el('i', 'sw-dot'); dot.style.background = ci.value; dot.hidden = !on;
  const plus = el('span', 'sw-plus', '+'); plus.hidden = on; plus.setAttribute('aria-hidden', 'true');
  ci.oninput = () => { dot.hidden = false; plus.hidden = true; dot.style.background = ci.value; lab.classList.add('on'); set(ci.value); };
  lab.append(ci, plus, dot, el('span', null, 'Custom'));
  if (!pick) return lab;
  // the eyedropper sits in the same pill, so the swatch row stays on one line
  const g = el('span', 'sw-custom-grp' + (on ? ' on' : ''));
  const ed = el('button', 'sw-pick-in'); ed.type = 'button'; ed.innerHTML = PICK_ICON; ed.title = 'Pick a color from the screen'; ed.setAttribute('aria-label', 'Pick ' + label.replace(/^Custom /, '').toLowerCase() + ' from the screen');
  ed.onclick = pick;
  g.append(lab, ed);
  return g;
}
/* Under the text box of a text art layer: marks on or off, and a "?" with what they are */
function marksRow(obj, live) {
  const box = el('div', 'marks'), row = el('div', 'marks-row');
  const hint = el('span', 'note', MARKS_NOTE.text + ' ' + MARKS_NOTE.more); hint.hidden = !openNotes.has('marks');
  const b = el('button', 'note-q', '?'); b.type = 'button'; b.title = 'What marks can do'; b.setAttribute('aria-label', 'What marks can do');
  b.setAttribute('aria-expanded', String(!hint.hidden));
  b.onclick = () => { hint.hidden = !hint.hidden; if (hint.hidden) openNotes.delete('marks'); else openNotes.add('marks'); b.setAttribute('aria-expanded', String(!hint.hidden)); };
  row.append(makeControl(obj, MARKS_CTL, live), b);
  box.append(row, hint);
  return box;
}
/* ---------------- Output panel ---------------- */
function buildOutputPanel(p) {
  const o = doc.out;
  const oc = (rebuildView) => () => { if (rebuildView) { rebuildPhotoView(); } compose(); queueHistory(); scheduleText(0); };
  // 1 the artboard: its width, its margin, and a word on the height
  let s = sec(p, 'Artboard');
  const widths = [[1200, '1200 px'], [1600, '1600 px'], [2400, '2400 px'], [3600, '3600 px']];
  if (!widths.some((w) => w[0] === o.width)) widths.push([o.width, o.width + ' px']);
  const w0 = o.width;
  const wchg = () => { rebuildPhotoView(); compose(); queueHistory(); scheduleText(0); thumbsSoon(); statusIdle(); fixedSizesNote(w0); };
  s.appendChild(makeControl(o, Object.assign(S('width', 'Width', widths), { idp: 'o-', rebuild: () => buildPanel() }), wchg));
  const cw = el('div', 'row2');
  let wTimer = null;
  cw.appendChild(numInput('Exact width', o.width, (v) => { clearTimeout(wTimer); wTimer = setTimeout(() => { o.width = clamp(Math.round(v), 200, 12000); wchg(); }, 500); }, { min: 200, max: 12000, unit: 'px' }));
  s.appendChild(cw);
  const hNote = el('span', 'note'); hNote.id = 'artHeightNote';
  const hText = () => { hNote.textContent = 'Height ' + artGeom(1).TH + ' px: it follows the photo or the crop. Letter sizes grow and shrink with the width, so the art keeps its look.'; };
  s.appendChild(makeControl(o, R('margin', 'Margin', 0, 0.2, 0.01, { idp: 'o-' }), () => { rebuildPhotoView(); compose(); queueHistory(); scheduleText(); hText(); }));
  hText(); s.appendChild(hNote);
  // 2 the background, the same block as in the Text art panel. On the T-shirt preview it is the shirt.
  const shirt = o.mock === 'shirt';
  s = paperBlock(p);
  // 3 the colors of the file
  s = sec(p, 'Output color');
  s.appendChild(makeControl(o, Object.assign(S('colorModel', 'Colors', MODELS), { idp: 'o-', rebuild: () => buildPanel() }), oc()));
  s.appendChild(el('span', 'note', MODEL_NOTE[o.colorModel]));
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
  // 5 what the canvas shows the art on
  s = sec(p, 'Show on');
  s.appendChild(makeControl(o, Object.assign(S('mock', 'Show the art on', [['artboard', 'Artboard'], ['paper', 'Paper'], ['shirt', 'T-shirt']]), { idp: 'o-', rebuild: () => {
    // the shirt preview starts from the paper color, so what you see is what the letters were chosen for
    if (o.mock === 'shirt') o.shirt = o.paper;
    buildPanel(); compose();
  } }), () => compose()));
  s.appendChild(el('span', 'note', o.mock === 'artboard' ? 'Paper and T-shirt show the art as it will look printed. Only the screen changes.' : 'Zoom with Ctrl and the wheel. Drag to move around. Drawing tools work on the Artboard view.'));
}
/* After a change of artboard width: sizes set by hand (and those of older projects) stayed in pixels, so offer to scale them too */
function fixedSizesNote(w0) {
  const w = doc.out.width;
  const fixed = doc.text.layers.filter((L) => !(L.pxW > 0) && PX_CTL.some((k) => typeof L[k] === 'number'));
  if (!fixed.length || !(w0 > 0) || w0 === w) return;
  toast('Letter sizes you set by hand stay in pixels, so they look ' + (w > w0 ? 'smaller' : 'larger') + ' on this artboard.', { label: 'Scale them too', fn: () => {
    fixed.forEach((L) => PX_CTL.forEach((k) => { if (typeof L[k] === 'number') L[k] = +(L[k] * w / w0).toFixed(2); }));
    buildPanel(); queueHistory(); scheduleText(0);
  } });
}
/* When the new paper hides a layer's ink (navy letters on black paper, say), switch that ink to one that shows, and say so. */
function luminanceOf(hex) { const c = C.parseColor(hex); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
function contrastOf(a, b) { const x = luminanceOf(a), y = luminanceOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function inkForPaper() {
  const paper = doc.out.paper, dark = isDarkHex(paper), fixed = [];
  doc.text.layers.forEach((L) => {
    // a layer that fits its colors to the paper needs no swap; this is for the ones that keep exact colors
    if (!['ink', 'duotone'].includes(L.color) || !L.inkColor || (L.colorFit && L.colorFit !== 'off')) return;
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
/* the notes that speak about the finished art, read again once it is made */
function updateLiveNotes() {
  document.querySelectorAll('.note[data-live]').forEach((n) => { const t = n.__live ? n.__live() || '' : ''; n.textContent = t; n.hidden = !t; });
}
/* the result of one layer, as last made */
const outOf = (L) => (out && L ? out.layers.find((x) => x.id === L.id) : null);
function updatePalette() {
  updateLiveNotes();
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
const libState = { tab: 'words', focus: 'Positive', checked: { words: new Set(['Positive']), phrases: new Set(['Positive']), chars: new Set(['Capital letters']) }, shuffle: true, count: 24, length: 60, target: null, find: '' };
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
  // there are a lot of sets now, so a line to narrow them down
  const find = el('input', 'field lib-find'); find.type = 'search'; find.placeholder = 'Find a set'; find.setAttribute('aria-label', 'Find a set'); find.value = libState.find;
  find.oninput = () => { libState.find = find.value; renderLibrary(); const f2 = $('library').querySelector('.lib-find'); if (f2) { f2.focus(); f2.setSelectionRange(f2.value.length, f2.value.length); } };
  sets.appendChild(find);
  const q = libState.find.trim().toLowerCase();
  const names = Object.keys(LIB[kind]).filter((n) => !q || n.toLowerCase().includes(q) || (kind === 'chars' ? false : LIB[kind][n].some((w) => String(w).toLowerCase().includes(q))));
  if (!names.length) sets.appendChild(el('span', 'note', 'No set matches that.'));
  names.forEach((name) => {
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
