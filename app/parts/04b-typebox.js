/* ===================== Part 4b: the Type toolbox window ===================== */
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Five tabs over one text: Styled text, Symbols, Faces, Decorations and Expansions.
// It opens on its own, or from a text box, and then the buttons at the bottom put the result back in that box.
// The data and the text work live in 01b-type.js; this file is only the window.

const TYPE_FAV_KEY = 'sungfluence-type-favs-v1';
const typeState = {
  tab: 'styles', text: '', style: 'bold', family: 'Weight and slant', mode: 'one', pool: ['bold', 'italic'],
  line: 'none', zalgo: { up: true, mid: false, down: true, amount: 0 }, favs: [],
  set: 'Arrows', picked: '', query: '', last: '', drawing: false, drawn: null,
  artSet: 'Happy', face: {}, decoSet: 'Stars', deco: '★ ', both: true, where: 'ig-bio', shareText: '',
  divSet: 'Lines', divUnit: '─', divWidth: 24, divCap: '', target: null
};
try { typeState.favs = JSON.parse(localStorage.getItem(TYPE_FAV_KEY) || '[]'); } catch (e) { /* storage blocked */ }
const saveFavs = () => { try { localStorage.setItem(TYPE_FAV_KEY, JSON.stringify(typeState.favs)); } catch (e) { /* storage blocked */ } };

const TYPE_TABS = [['styles', 'Styled text'], ['symbols', 'Symbols'], ['faces', 'Faces'], ['decor', 'Decorations'], ['share', 'Sharing'], ['expand', 'Expansions']];
function openTypeBox(target, tab) {
  typeState.target = target || null;
  if (tab) typeState.tab = tab;
  if (target && target.obj && typeof target.obj[target.key] === 'string') {
    const v = target.obj[target.key].split('\n')[0].slice(0, 120);
    if (v.trim()) typeState.text = v;
  }
  if (!typeState.text.trim()) typeState.text = 'SungFluence';
  renderTypeBox();
  $('typeScrim').hidden = false;
  const f = $('typeBox').querySelector('textarea, input, button'); if (f) f.focus();
}
function closeTypeBox() { $('typeScrim').hidden = true; }
$('typeScrim').addEventListener('click', (e) => { if (e.target === $('typeScrim')) closeTypeBox(); });

/* What the buttons at the bottom will use. */
function typeResult() {
  const t = typeState;
  if (t.tab === 'share') return t.shareText;
  if (t.tab === 'symbols' || t.tab === 'faces') return t.picked;
  if (t.tab === 'expand') return expandText(t.text);
  const styled = t.tab === 'styles' ? styleText(t.text, t.style, { mode: t.mode, styles: t.pool, line: t.line, zalgo: t.zalgo, seed: 11 }) : t.text;
  if (t.tab === 'decor') return t.divMode ? makeDivider(t.divUnit, t.divWidth, t.divCap) : decorate(styled, t.deco, t.both);
  return styled;
}
function typeApply(append) {
  const v = typeResult();
  if (!v) { toast('Nothing to use yet.'); return; }
  const t = typeState.target;
  if (!t) { copyType(); return; }
  const sep = t.kind === 'glyphs' ? '' : t.kind === 'list' ? '\n' : ' ';
  t.obj[t.key] = append && t.obj[t.key] ? t.obj[t.key] + sep + v : v;
  closeTypeBox(); buildPanel(); queueHistory();
  if (doc.lines.paths.includes(t.obj)) linesChanged(); else scheduleText(0);
  toast('Text updated', { label: 'Undo', fn: undo });
}
function copyType(text) {
  const v = text === undefined ? typeResult() : text;
  if (!v) return;
  const done = () => toast('Copied');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, () => fallbackCopy(v, done));
  else fallbackCopy(v, done);
}
function fallbackCopy(v, done) {
  const ta = el('textarea'); ta.value = v; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('This browser would not let SungFluence copy. Select the text and press ' + MOD + ' C.'); }
  ta.remove();
}
/* Puts the result on the canvas. One object for the lot, or one for each symbol, which is what makes
   them stickers: each can then be moved, scaled, turned and colored on its own. */
function typeToCanvas(separate) {
  const v = typeResult();
  if (!v) { toast('Nothing to place yet.'); return; }
  if (!origImg) { toast('Open a photo or make an artboard first.'); return; }
  const list = separate ? Array.from(v).filter((c) => c.trim()) : [v];
  closeTypeBox();
  if (list.length === 1) { quickAdd('text', { text: list[0] }); return; }
  commitHistory();
  const cr = cropRect(), bw = cr.w * iw, bh = cr.h * ih;
  const size = Math.max(24, Math.round(Math.min(iw, ih) / 9));
  const objs = list.map((ch) => newObject('text', { text: ch, size }));
  const gap = size * 0.3;
  const total = objs.reduce((t, o) => t + o.w, 0) + gap * (objs.length - 1);
  let x = cr.x * iw + (bw - total) / 2;
  const y = cr.y * ih + (bh - objs[0].h) / 2;
  objs.forEach((o) => { o.x = x; o.y = y; x += o.w + gap; });
  doc.objects.push(...objs);
  ui.selObjs = objs.map((o) => o.id);
  if (ui.tool !== 'select') setTool('select');
  objChanged({ final: true, list: objs });
  toast('Placed ' + objs.length + ' stickers you can move one by one', { label: 'Undo', fn: undo });
}

/* ---------------- the window ---------------- */
function renderTypeBox() {
  const sh = $('typeBox'); sh.replaceChildren();
  const t = typeState;
  const head = el('div', 'sheet-h');
  const h2 = el('h2', null, 'Type toolbox'); h2.id = 'typeTitle';
  const close = el('button', 'btn btn-quiet', 'Close'); close.type = 'button'; close.onclick = closeTypeBox;
  head.append(h2, close);

  const tabs = el('div', 'sheet-tabs');
  tabs.appendChild(optSeg(TYPE_TABS, t.tab, (v) => { t.tab = v; renderTypeBox(); }, 'Type toolbox section'));
  if (t.tab !== 'expand' && t.tab !== 'share') {
    const ti = el('input', 'field type-text'); ti.type = 'text'; ti.value = t.text; ti.setAttribute('aria-label', 'Your text'); ti.placeholder = 'Type your text';
    ti.dir = 'auto';
    ti.oninput = () => { t.text = ti.value; refreshType(); };
    tabs.appendChild(ti);
  }
  const body = el('div', 'sheet-body');
  const sets = el('div', 'sets'), items = el('div', 'items');
  body.append(sets, items);
  ({ styles: typeStyles, symbols: typeSymbols, faces: typeFaces, decor: typeDecor, share: typeShare, expand: typeExpand })[t.tab](sets, items);

  const foot = el('div', 'sheet-f');
  const pv = el('div', 'preview-text'); pv.id = 'typePreview'; pv.dir = 'auto';
  const btns = el('div', 'row2');
  btns.append(optBtn('Copy', () => copyType()), optBtn('Place on canvas', () => typeToCanvas(false)));
  if (Array.from(typeResult() || '').filter((c) => c.trim()).length > 1 && ['symbols', 'faces'].includes(t.tab)) btns.append(optBtn('Place each separately', () => typeToCanvas(true)));
  if (t.target) btns.append(optBtn('Add to the text', () => typeApply(true)), optBtn('Use for ' + t.target.label, () => typeApply(false), true));
  foot.append(pv, btns);
  sh.append(head, tabs, body, foot);
  refreshPreview();
}
function refreshPreview() {
  const pv = document.getElementById('typePreview');
  if (pv) pv.textContent = typeResult() || 'Nothing picked yet.';
}
/* Redraws only what the text changes, so typing stays smooth. */
function refreshType() {
  const box = document.getElementById('typeList');
  if (box) ({ styles: fillStyleList, decor: fillDecorList })[typeState.tab] ? ({ styles: fillStyleList, decor: fillDecorList })[typeState.tab](box) : null;
  const checks = document.getElementById('typeChecks');
  if (checks) fillChecks(checks);
  refreshPreview();
}

/* ---------------- styled text ---------------- */
function typeStyles(sets, items) {
  const t = typeState;
  const fams = ['Favorites'].concat([...new Set(TYPE_STYLES.map((s) => s.family))]);
  fams.forEach((f) => {
    const row = el('div', 'set'); row.setAttribute('aria-current', String(t.family === f));
    const b = el('button', null, f); b.type = 'button'; b.onclick = () => { t.family = f; renderTypeBox(); };
    const n = f === 'Favorites' ? t.favs.length : TYPE_STYLES.filter((s) => s.family === f).length;
    row.append(b, el('small', null, String(n)));
    sets.appendChild(row);
  });
  sets.appendChild(el('span', 'note', 'These are not fonts. Each style swaps your letters for characters that already exist, so the look travels into chats and profiles.'));

  // how the letters are picked
  const opts = el('div', 'type-opts');
  opts.appendChild(optSeg([['one', 'One style'], ['alternate', 'Alternating'], ['mix', 'Mixed'], ['ransom', 'Ransom note']], t.mode, (v) => { t.mode = v; renderTypeBox(); }, 'How the styles are used'));
  if (t.mode !== 'one') {
    const chips = el('div', 'chips');
    TYPE_STYLES.forEach((s) => {
      const on = t.pool.includes(s.id);
      const c = el('button', 'chip type-chip' + (on ? ' on' : ''), s.name); c.type = 'button'; c.setAttribute('aria-pressed', String(on));
      c.onclick = () => { t.pool = on ? t.pool.filter((x) => x !== s.id) : t.pool.concat(s.id); renderTypeBox(); };
      chips.appendChild(c);
    });
    opts.append(el('span', 'note', t.mode === 'alternate' ? 'The styles below take turns, letter by letter.' : 'Letters are picked from the styles below at random.'), chips);
  }
  const marks = el('div', 'row2');
  const sel = el('select'); sel.setAttribute('aria-label', 'Line through or under the letters');
  TYPE_LINES.forEach((l) => { const o = el('option', null, l.name); o.value = l.id; if (l.id === t.line) o.selected = true; sel.appendChild(o); });
  sel.onchange = () => { t.line = sel.value; refreshType(); };
  marks.append(el('span', 'lab', 'Lines'), sel);
  opts.appendChild(marks);
  const z = el('div', 'type-marks');
  // Above, Through and Below say where the marks go, so they show only while there are marks
  const sws = el('div', 'row2');
  z.appendChild(optRange('Marks on the letters', 0, 1, 0.05, t.zalgo.amount, (v) => (v <= 0 ? 'Off' : Math.round(v * 100) + '%'), (v) => { t.zalgo.amount = v; sws.hidden = v <= 0; refreshType(); }));
  sws.hidden = t.zalgo.amount <= 0;
  [['up', 'Above'], ['mid', 'Through'], ['down', 'Below']].forEach(([k, name]) => {
    const lab = el('label', 'switch'); lab.style.gap = '6px';
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = t.zalgo[k]; cb.onchange = () => { t.zalgo[k] = cb.checked; refreshType(); };
    lab.append(el('span', null, name), cb); sws.appendChild(lab);
  });
  z.appendChild(sws);
  opts.appendChild(z);
  items.appendChild(opts);

  const checks = el('div', 'type-checks'); checks.id = 'typeChecks';
  fillChecks(checks);
  items.appendChild(checks);
  const list = el('div', 'type-list'); list.id = 'typeList';
  fillStyleList(list);
  items.appendChild(list);
}
function fillStyleList(box) {
  const t = typeState;
  box.replaceChildren();
  const list = t.family === 'Favorites' ? TYPE_STYLES.filter((s) => t.favs.includes(s.id)) : TYPE_STYLES.filter((s) => s.family === t.family);
  if (!list.length) { box.appendChild(el('span', 'note', 'No favorites yet. Click the star on a style to keep it here.')); return; }
  list.forEach((s) => {
    const row = el('div', 'type-row' + (t.style === s.id ? ' on' : ''));
    const pick = el('button', 'type-pick'); pick.type = 'button'; pick.setAttribute('aria-pressed', String(t.style === s.id));
    const sample = el('div', 'type-sample', styleText(t.text, s.id, { line: t.line, zalgo: t.zalgo, seed: 11 })); sample.dir = 'auto';
    pick.append(el('div', 'type-name', s.name + (s.decorative ? '  ·  decorative' : '')), sample);
    pick.onclick = () => { t.style = s.id; renderTypeBox(); };
    const star = el('button', 'icon-btn', t.favs.includes(s.id) ? '★' : '☆'); star.type = 'button';
    star.title = t.favs.includes(s.id) ? 'Remove from favorites' : 'Keep in favorites';
    star.setAttribute('aria-label', star.title);
    star.onclick = () => { t.favs = t.favs.includes(s.id) ? t.favs.filter((x) => x !== s.id) : t.favs.concat(s.id); saveFavs(); renderTypeBox(); };
    const cp2 = el('button', 'icon-btn', '⧉'); cp2.type = 'button'; cp2.title = 'Copy this one'; cp2.setAttribute('aria-label', 'Copy ' + s.name);
    cp2.onclick = () => copyType(styleText(t.text, s.id, { line: t.line, zalgo: t.zalgo, seed: 11 }));
    row.append(pick, star, cp2);
    box.appendChild(row);
  });
}
/* The honest part: what this text will do out in the world. */
function fillChecks(box) {
  const t = typeState;
  const styled = typeResult();
  box.replaceChildren();
  const out = el('div', 'type-out', styled || ' '); out.dir = 'auto';
  box.appendChild(out);
  const c = textCounts(styled);
  const blanks = blankBoxes(styled);
  const notes = typeNotes(t.style, styled);
  const det = el('details', 'more type-more'); det.open = !!ui.open.typeChecks || blanks.length > 0;
  det.ontoggle = () => { ui.open.typeChecks = det.open; };
  const sum = el('summary'); sum.innerHTML = CHEV;
  sum.appendChild(document.createTextNode(blanks.length ? blanks.length + ' character' + (blanks.length === 1 ? '' : 's') + ' may show as an empty box' : 'Before you paste it: ' + c.units + ' units, screen readers, plain copy'));
  if (blanks.length) sum.classList.add('warn');
  det.appendChild(sum);
  const inner = el('div', 'inner');
  const row = el('div', 'type-count');
  row.append(el('span', null, c.letters + ' letters as people see them'), el('span', null, c.points + ' characters'), el('span', null, c.units + ' units, the way most boxes count'));
  inner.appendChild(row);
  if (c.units !== c.letters) inner.appendChild(el('span', 'note', 'A box with a limit counts the units, so this text fills more of it than it looks.'));
  if (blanks.length) inner.appendChild(el('div', 'warn', 'Your computer has no picture for ' + blanks.slice(0, 8).join(' ') + (blanks.length > 8 ? ' and more' : '') + '. Readers may see empty boxes. Try another style.'));
  else if (/\S/.test(styled)) inner.appendChild(el('div', 'ok', 'Every character shows on this computer. Other computers may still differ.'));
  notes.forEach((n) => inner.appendChild(el('div', n.kind === 'warn' ? 'warn' : 'note', n.text)));
  const plain = unstyleText(styled);
  const pl = el('div', 'type-plain');
  pl.append(el('span', 'lab', 'Plain copy, for alt text'), el('div', 'preview-text', plain));
  const b = el('button', 'mini-btn', 'Copy the plain one'); b.type = 'button'; b.onclick = () => copyType(plain);
  const u = el('button', 'mini-btn', 'Put the plain one in the box above'); u.type = 'button';
  u.onclick = () => { typeState.text = plain; renderTypeBox(); };
  pl.append(b, u);
  inner.appendChild(pl);
  det.appendChild(inner);
  box.appendChild(det);
}

/* ---------------- symbols ---------------- */
/* The drawing pad: sketch a shape, and the symbols that look like it come up. */
function drawPad(items) {
  const t = typeState;
  buildGlyphShapesSoon();
  const box = el('div', 'draw-pad');
  box.appendChild(el('span', 'sec-t', 'Draw a symbol'));
  const S = 200;
  const cv = el('canvas', 'pad'); cv.width = S; cv.height = S;
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Drawing pad. Draw a shape with the mouse or a finger.');
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.lineWidth = 11; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#111';
  if (t.drawn) { const im = new Image(); im.onload = () => x.drawImage(im, 0, 0); im.src = t.drawn; }
  let down = false, last = null;
  const at = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * S / r.width, (e.clientY - r.top) * S / r.height]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); down = true; last = at(e); x.beginPath(); x.arc(last[0], last[1], 0.5, 0, Math.PI * 2); x.stroke(); });
  cv.addEventListener('pointermove', (e) => {
    if (!down) return;
    const p = at(e);
    x.beginPath(); x.moveTo(last[0], last[1]); x.lineTo(p[0], p[1]); x.stroke();
    last = p;
  });
  const end = () => { if (!down) return; down = false; t.drawn = cv.toDataURL('image/png'); look(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
  const out = el('div', 'glyph-grid');
  const look = () => {
    const d = x.getImageData(0, 0, S, S).data;
    const alpha = new Uint8ClampedArray(S * S);
    for (let i = 0; i < alpha.length; i++) alpha[i] = d[i * 4 + 3];
    const found = searchByShape(alpha, S, S, 72);
    out.replaceChildren();
    if (!found.length) { out.appendChild(el('span', 'note', 'Nothing like that yet. Try a simpler shape, or draw it larger.')); return; }
    found.forEach((q) => {
      const b = el('button', 'glyph', q.ch); b.type = 'button';
      const info = glyphInfo(q.ch);
      b.title = (info.name ? info.name + '\n' : '') + info.how + '\nMatch: ' + Math.round(q.score * 100) + '%';
      b.setAttribute('aria-label', info.name || info.how);
      b.onclick = () => { t.picked += q.ch; t.last = q.ch; renderTypeBox(); };
      out.appendChild(b);
    });
  };
  const row = el('div', 'row2');
  row.append(optBtn('Clear', () => { x.clearRect(0, 0, S, S); t.drawn = null; out.replaceChildren(el('span', 'note', 'Draw a shape above.')); }),
    optBtn('Find look-alikes', look, true),
    optBtn('Back to the sets', () => { t.drawing = false; renderTypeBox(); }));
  box.append(cv, row, el('span', 'note', 'Draw with the mouse or a finger. Size and where you draw it make no difference: only the shape counts.'));
  items.append(box, out);
  if (t.drawn) setTimeout(look, 60); else out.appendChild(el('span', 'note', 'Draw a shape above.'));
}
function typeSymbols(sets, items) {
  const t = typeState;
  const search = el('input', 'field'); search.type = 'search'; search.value = t.query; search.placeholder = 'Search: heart, arrow*, U+2665, &hearts;, 9829';
  search.setAttribute('aria-label', 'Search symbols');
  search.oninput = () => { t.query = search.value; renderTypeBox(); setTimeout(() => { const s2 = $('typeBox').querySelector('input[type=search]'); if (s2) { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); } }, 0); };
  sets.appendChild(search);
  const dr = optBtn(t.drawing ? 'Back to the sets' : 'Draw a symbol', () => { t.drawing = !t.drawing; renderTypeBox(); });
  dr.classList.add('mini-btn'); dr.classList.remove('btn');
  sets.appendChild(dr);
  Object.keys(SYMBOL_SETS).forEach((name) => {
    const row = el('div', 'set'); row.setAttribute('aria-current', String(t.set === name && !t.query));
    const b = el('button', null, name); b.type = 'button'; b.onclick = () => { t.query = ''; t.set = name; renderTypeBox(); };
    row.append(b, el('small', null, String(Array.from(SYMBOL_SETS[name]).length)));
    sets.appendChild(row);
  });
  if (t.drawing) { drawPad(items); return; }
  const found = t.query ? glyphSearch(t.query) : null;
  const list = found || Array.from(SYMBOL_SETS[t.set] || '');
  const head = el('div', 'sec-h');
  head.appendChild(el('span', 'sec-t', found ? list.length + ' found for "' + t.query + '"' : t.set));
  items.appendChild(head);
  if (!list.length) { items.appendChild(el('span', 'note', 'Nothing found. Try a name (heart), a part of one with a star (arrow*), a code point (U+2665), an entity (&hearts;) or an Alt code (9829).')); return; }
  const grid = el('div', 'glyph-grid');
  list.forEach((ch) => {
    const b = el('button', 'glyph', ch); b.type = 'button';
    const info = glyphInfo(ch);
    b.title = (info.name ? info.name + '\n' : '') + info.how;
    b.setAttribute('aria-label', info.name || info.how);
    b.onclick = () => { t.picked += ch; t.last = ch; renderTypeBox(); };
    grid.appendChild(b);
  });
  items.appendChild(grid);
  if (t.last) {
    const info = glyphInfo(t.last);
    const d = el('div', 'type-plain');
    d.append(el('span', 'lab', t.last + '   ' + (info.name || 'no name here')), el('div', 'preview-text', 'How to type it elsewhere:  ' + info.how));
    items.appendChild(d);
  }
  items.appendChild(pickedRow());
}
function pickedRow() {
  const t = typeState;
  const d = el('div', 'type-plain');
  d.appendChild(el('span', 'lab', 'Picked'));
  const ta = el('input', 'field'); ta.type = 'text'; ta.value = t.picked; ta.setAttribute('aria-label', 'The symbols you picked');
  ta.oninput = () => { t.picked = ta.value; refreshPreview(); };
  d.appendChild(ta);
  const row = el('div', 'row2');
  row.append(optBtn('Clear', () => { t.picked = ''; renderTypeBox(); }), optBtn('Remove the last one', () => { t.picked = Array.from(t.picked).slice(0, -1).join(''); renderTypeBox(); }));
  d.appendChild(row);
  return d;
}

/* ---------------- faces ---------------- */
function typeFaces(sets, items) {
  const t = typeState;
  ['Build one'].concat(Object.keys(ART_SETS)).forEach((name) => {
    const row = el('div', 'set'); row.setAttribute('aria-current', String(t.artSet === name));
    const b = el('button', null, name); b.type = 'button'; b.onclick = () => { t.artSet = name; renderTypeBox(); };
    if (name !== 'Build one') row.append(b, el('small', null, String(ART_SETS[name].length))); else row.appendChild(b);
    sets.appendChild(row);
  });
  if (t.artSet === 'Build one') {
    items.appendChild(el('span', 'sec-t', 'Build a face'));
    Object.entries(FACE_PARTS).forEach(([part, list]) => {
      const row = el('div', 'face-row');
      row.appendChild(el('span', 'lab', part));
      const chips = el('div', 'chips');
      list.forEach((v, i) => {
        const on = (t.face[part] === undefined ? 0 : t.face[part]) === i;
        const c = el('button', 'chip type-chip' + (on ? ' on' : ''), v || '(none)'); c.type = 'button'; c.setAttribute('aria-pressed', String(on));
        c.onclick = () => { t.face[part] = i; t.picked = buildFace(); renderTypeBox(); };
        chips.appendChild(c);
      });
      row.appendChild(chips);
      items.appendChild(row);
    });
    const row = el('div', 'row2');
    row.append(optBtn('Surprise me', () => { Object.entries(FACE_PARTS).forEach(([p, l]) => { t.face[p] = Math.floor(Math.random() * l.length); }); t.picked = buildFace(); renderTypeBox(); }),
      optBtn('Start again', () => { t.face = {}; t.picked = buildFace(); renderTypeBox(); }));
    items.append(row, el('div', 'face-big', buildFace()), pickedRow());
    return;
  }
  items.appendChild(el('span', 'sec-t', t.artSet));
  const grid = el('div', 'art-grid');
  (ART_SETS[t.artSet] || []).forEach((a) => {
    const b = el('button', 'art', a); b.type = 'button'; b.title = 'Add it';
    b.onclick = () => { t.picked = t.picked ? t.picked + ' ' + a : a; renderTypeBox(); };
    grid.appendChild(b);
  });
  items.append(grid, pickedRow());
}
function buildFace() {
  const t = typeState;
  return Object.entries(FACE_PARTS).map(([p, l]) => l[t.face[p] === undefined ? 0 : t.face[p]] || '').join('');
}

/* ---------------- decorations and dividers ---------------- */
function typeDecor(sets, items) {
  const t = typeState;
  ['Dividers'].concat(Object.keys(DECOR_SETS)).forEach((name) => {
    const row = el('div', 'set'); row.setAttribute('aria-current', String(name === 'Dividers' ? !!t.divMode : (!t.divMode && t.decoSet === name)));
    const b = el('button', null, name); b.type = 'button';
    b.onclick = () => { if (name === 'Dividers') t.divMode = true; else { t.divMode = false; t.decoSet = name; } renderTypeBox(); };
    row.appendChild(b);
    sets.appendChild(row);
  });
  if (t.divMode) {
    items.appendChild(el('span', 'sec-t', 'Dividers'));
    Object.entries(DIVIDER_SETS).forEach(([name, list]) => {
      const box = el('div', 'face-row');
      box.appendChild(el('span', 'lab', name));
      const chips = el('div', 'chips');
      list.forEach((u) => {
        const on = name === 'Decorated ends' ? t.divCap === u : t.divUnit === u;
        const c = el('button', 'chip type-chip' + (on ? ' on' : ''), u); c.type = 'button'; c.setAttribute('aria-pressed', String(on));
        c.onclick = () => { if (name === 'Decorated ends') t.divCap = t.divCap === u ? '' : u; else t.divUnit = u; renderTypeBox(); };
        chips.appendChild(c);
      });
      box.appendChild(chips);
      items.appendChild(box);
    });
    items.appendChild(optRange('Width', 4, 80, 1, t.divWidth, (v) => v + ' characters', (v) => { t.divWidth = v; refreshPreview(); const b = document.getElementById('divBig'); if (b) b.textContent = makeDivider(t.divUnit, v, t.divCap); }));
    const big = el('div', 'face-big', makeDivider(t.divUnit, t.divWidth, t.divCap)); big.id = 'divBig';
    items.append(big, el('span', 'note', 'The ends mirror each other, so a divider sits correctly in right-to-left text as well.'));
    return;
  }
  items.appendChild(el('span', 'sec-t', t.decoSet));
  const sw = el('label', 'switch'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = t.both; cb.setAttribute('role', 'switch');
  cb.onchange = () => { t.both = cb.checked; renderTypeBox(); };
  sw.append(el('span', null, 'On both sides, mirrored'), cb);
  items.appendChild(sw);
  const list = el('div', 'type-list'); list.id = 'typeList';
  fillDecorList(list);
  items.append(list, el('span', 'note', 'Brackets and arrows turn around on the right-hand side, so Urdu and Arabic text keeps its shape.'));
}
function fillDecorList(box) {
  const t = typeState;
  box.replaceChildren();
  (DECOR_SETS[t.decoSet] || []).forEach((d) => {
    const row = el('div', 'type-row' + (t.deco === d ? ' on' : ''));
    const pick = el('button', 'type-pick'); pick.type = 'button'; pick.setAttribute('aria-pressed', String(t.deco === d));
    const sample = el('div', 'type-sample', decorate(t.text, d, t.both)); sample.dir = 'auto';
    pick.appendChild(sample);
    pick.onclick = () => { t.deco = d; renderTypeBox(); };
    const cp2 = el('button', 'icon-btn', '⧉'); cp2.type = 'button'; cp2.title = 'Copy this one'; cp2.setAttribute('aria-label', 'Copy this decoration');
    cp2.onclick = () => copyType(decorate(t.text, d, t.both));
    row.append(pick, cp2);
    box.appendChild(row);
  });
}


/* ---------------- sharing it ----------------
   What the text will look like in a bio or a post, how it will be counted there, and the two fixes
   that matter most: line breaks that survive, and cutting it to length without chopping a word. */
function typeShare(sets, items) {
  const t = typeState;
  if (!t.shareText) t.shareText = t.text || 'SungFluence';
  SOCIAL.forEach((s) => {
    const row = el('div', 'set'); row.setAttribute('aria-current', String(t.where === s.id));
    const b = el('button', null, s.name); b.type = 'button'; b.onclick = () => { t.where = s.id; renderTypeBox(); };
    row.append(b, el('small', null, String(s.limit)));
    sets.appendChild(row);
  });
  sets.appendChild(el('span', 'note', 'The limits were taken from public guides in November 2026, not from the apps themselves. Treat them as a guide: apps change them.'));

  const place = SOCIAL.find((s) => s.id === t.where) || SOCIAL[0];
  const ta = el('textarea', 'field'); ta.rows = 5; ta.value = t.shareText; ta.dir = 'auto';
  ta.setAttribute('aria-label', 'The text to share');
  ta.oninput = () => { t.shareText = ta.value; drawShare(); refreshPreview(); };
  items.append(el('span', 'sec-t', place.name), ta);
  const box = el('div', 'share-box'); box.id = 'shareBox';
  items.appendChild(box);
  const row = el('div', 'row2');
  row.append(optBtn('Make the line breaks stick', () => { t.shareText = fixBreaks(t.shareText); renderTypeBox(); }),
    optBtn('Cut it to fit', () => { t.shareText = fitTo(t.shareText, place.limit, place.count); renderTypeBox(); }),
    optBtn('Take the styling off', () => { t.shareText = unstyleText(t.shareText); renderTypeBox(); }));
  items.appendChild(row);
  drawShare(box);
}
function drawShare(el2) {
  const t = typeState, box = el2 || document.getElementById('shareBox');
  if (!box) return;
  const place = SOCIAL.find((s) => s.id === t.where) || SOCIAL[0];
  const txt = t.shareText || '';
  const used = countFor(txt, place.count);
  const over = used - place.limit;
  box.replaceChildren();
  // what it will look like where it is going
  const card = el('div', 'share-card');
  if (place.kind !== 'name') {
    const head = el('div', 'share-head');
    head.append(el('span', 'share-pic'), el('span', 'share-name', 'your name'));
    card.appendChild(head);
  }
  const body = el('div', 'share-body' + (place.kind === 'name' ? ' one-line' : '')); body.dir = 'auto';
  const shown = over > 0 ? Array.from(txt).slice(0, place.limit).join('') : txt;
  if (place.cut && Array.from(shown).length > place.cut) {
    body.append(document.createTextNode(Array.from(shown).slice(0, place.cut).join('')));
    const more = el('span', 'share-more', '… more');
    body.append(more);
    const rest = el('div', 'share-rest', Array.from(shown).slice(place.cut).join(''));
    card.append(body, rest);
  } else { body.textContent = shown; card.appendChild(body); }
  if (over > 0) card.appendChild(el('div', 'share-cut', over + ' character' + (over === 1 ? '' : 's') + ' past the limit would be cut off'));
  box.appendChild(card);
  // the count, the way that app counts
  const bar = el('div', 'share-bar');
  const fill = el('i'); fill.style.width = Math.min(100, used / place.limit * 100) + '%';
  if (over > 0) fill.classList.add('over');
  bar.appendChild(fill);
  const c = textCounts(txt);
  const line = el('div', 'type-count');
  line.append(el('span', over > 0 ? 'warn' : null, used + ' of ' + place.limit + (place.count === 'x' ? ', counted the way X counts' : ' characters')),
    el('span', null, c.letters + ' letters as people see them'), el('span', null, c.units + ' units'));
  box.append(bar, line);
  if (place.note) box.appendChild(el('div', 'note', place.note));
  if (place.breaks && txt.includes('\n')) {
    const ok2 = breaksWillStick(txt);
    box.appendChild(el('div', ok2 ? 'ok' : 'warn', ok2
      ? 'The line breaks here should survive: no line is empty and none ends in a space.'
      : 'Some lines are empty or end in a space, so the breaks may be dropped. Use the button below.'));
  }
  if (c.units !== c.letters) box.appendChild(el('span', 'note', 'Fancy letters take more room than they look: each one can count as two or more.'));
}

/* ---------------- keyword expansions ---------------- */
function typeExpand(sets, items) {
  sets.appendChild(el('span', 'note', 'Type (shrug) or :shrug: in any text box in SungFluence and it turns into the text you set here. The list is saved on this computer.'));
  const ex = el('div', 'row2');
  [['plain', 'Plain list'], ['espanso', 'Espanso'], ['ahk', 'AutoHotkey'], ['apple', 'Mac and iPhone']].forEach(([k, name]) => {
    ex.appendChild(optBtn(name, () => {
      const file = { plain: 'expansions.txt', espanso: 'sungfluence.yml', ahk: 'sungfluence.ahk', apple: 'expansions.plist' }[k];
      saveFile(file, expansionsAs(k));
    }));
  });
  sets.append(el('span', 'lab', 'Use them everywhere'), ex);
  sets.appendChild(el('span', 'note', 'Espanso works on Windows, Mac and Linux. AutoHotkey is for Windows. The Mac file goes to Settings, Keyboard, Text Replacements.'));

  items.appendChild(el('span', 'sec-t', 'Your expansions'));
  const tryIt = el('input', 'field'); tryIt.type = 'text'; tryIt.value = typeState.text; tryIt.setAttribute('aria-label', 'Try an expansion');
  tryIt.placeholder = 'Try it here: hello (shrug) and (heart)';
  tryIt.oninput = () => { typeState.text = tryIt.value; refreshPreview(); const o = document.getElementById('expOut'); if (o) o.textContent = expandText(tryIt.value); };
  items.append(tryIt, el('div', 'face-big', expandText(typeState.text)));
  items.lastChild.id = 'expOut';
  const tbl = el('div', 'exp-list');
  Object.keys(EXPANSIONS).sort().forEach((k) => {
    if (!EXPANSIONS[k]) return;
    const row = el('div', 'exp-row');
    row.append(el('code', null, '(' + k + ')'), el('span', 'exp-val', EXPANSIONS[k]));
    const x = el('button', 'icon-btn', '×'); x.type = 'button'; x.title = 'Remove ' + k; x.setAttribute('aria-label', 'Remove ' + k);
    x.onclick = () => { delete EXPANSIONS[k]; saveExpansions(EXPANSIONS); renderTypeBox(); };
    row.appendChild(x);
    tbl.appendChild(row);
  });
  items.appendChild(tbl);
  const add = el('div', 'row2');
  const kIn = el('input', 'field'); kIn.type = 'text'; kIn.placeholder = 'keyword'; kIn.setAttribute('aria-label', 'New keyword'); kIn.style.maxWidth = '140px';
  const vIn = el('input', 'field'); vIn.type = 'text'; vIn.placeholder = 'what it becomes'; vIn.setAttribute('aria-label', 'What the keyword becomes');
  const go = optBtn('Add', () => {
    const k = kIn.value.trim().toLowerCase().replace(/[^\w-]/g, '');
    if (!k || !vIn.value) { toast('Type a keyword and what it should become.'); return; }
    EXPANSIONS[k] = vIn.value; saveExpansions(EXPANSIONS); renderTypeBox();
  }, true);
  add.append(kIn, vIn, go);
  items.append(add, el('span', 'note', 'Keywords use letters, digits, hyphens and underscores. Removing a built-in one keeps it removed on this computer.'));
}

/* ---------------- expansions in every text box ----------------
   Typing (shrug) in a panel, a dialog or the canvas text editor turns it into the sign straight away. */
document.addEventListener('input', (e) => {
  const n = e.target;
  if (!n || !/INPUT|TEXTAREA/.test(n.tagName) || n.type === 'range' || n.type === 'checkbox' || n.type === 'color') return;
  if (n.dataset.noExpand === '1' || !hasExpansion(n.value)) return;
  const at = n.selectionStart, before = n.value;
  const after = expandText(before);
  if (after === before) return;
  n.value = after;
  const moved = after.length - before.length;
  try { n.setSelectionRange(at + moved, at + moved); } catch (err) { /* some inputs have no selection */ }
  n.dispatchEvent(new Event('input', { bubbles: false }));
}, true);
