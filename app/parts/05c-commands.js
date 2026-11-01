/* ===================== Part 4d: commands, menus and the command palette ===================== */
/* Every action is a command: an id, a label, its keys, and one function. The menu bar (in the page on the web,
   the native one in the desktop app), the command palette (Ctrl K), keyboard shortcuts and tests all use this list.
   keys: 'mod' is Ctrl (Cmd on a Mac). The first entry is shown in menus; all of them work. */
const COMMANDS = new Map();
function command(id, label, run, o) {
  COMMANDS.set(id, Object.assign({ id, label, run, keys: [] }, o || {}));
  return { id };
}
function runCommand(id) {
  const c = COMMANDS.get(id);
  if (!c) return false;
  if (c.enabled && !c.enabled()) return false;
  closeMenus();
  c.run();
  syncMenus();
  return true;
}
const hasImg = () => !!origImg;
const hasSel = () => ui.selObjs.length > 0;
const ISSUES_URL = 'https://github.com/datakeen/Sungfluence/issues';
const openURL = (u) => { const a = el('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.click(); };

/* ---------- the commands ---------- */
// File
command('file.new', 'New artboard…', () => openNewArtboard(), { keys: ['shift+n'] });
command('file.square', 'New square artboard', () => newSquare());
command('file.open', 'Open image or project…', () => $('fileInput').click(), { keys: ['mod+o'], typing: true });
command('file.save', 'Save project', () => saveProject(), { keys: ['mod+s'], typing: true, enabled: hasImg });
command('file.export', 'Export…', () => openMenu(), { keys: ['mod+e'], typing: true, enabled: hasImg });
command('file.settings', 'Settings…', () => openSettings());
// Edit
command('edit.undo', 'Undo', () => undo(), { keys: ['mod+z'], enabled: () => hist.length > 0 });
command('edit.redo', 'Redo', () => redo(), { keys: ['mod+shift+z', 'mod+y'], enabled: () => future.length > 0 });
command('edit.copy', 'Copy shapes', () => copyObjects(), { keys: ['mod+c'], enabled: hasSel });
command('edit.paste', 'Paste shapes', () => pasteObjects(), { hint: 'mod+v', enabled: () => !!(objClipboard && objClipboard.length) });
command('edit.duplicate', 'Duplicate', () => duplicateSelection(), { keys: ['mod+j'] });
command('edit.delete', 'Delete', () => deleteSelection(), { hint: 'delete', enabled: () => hasSel() || !!ui.selPath });
command('edit.selectAll', 'Select all shapes', () => selectAllObjects(), { keys: ['mod+a'], enabled: () => doc.objects.length > 0 });
command('edit.deselect', 'Deselect', () => deselectAll(), { keys: ['mod+d'] });
[['left', 'Left edges'], ['center', 'Centers across'], ['right', 'Right edges'], ['top', 'Top edges'], ['middle', 'Centers down'], ['bottom', 'Bottom edges']]
  .forEach(([h, t]) => command('edit.align.' + h, t, () => alignObjects(h), { enabled: hasSel }));
[['front', 'Bring to front'], ['forward', 'Bring forward'], ['backward', 'Send backward'], ['back', 'Send to back']]
  .forEach(([h, t]) => command('edit.arrange.' + h, t, () => arrangeObjects(h), { enabled: hasSel }));
// Image
command('image.crop', 'Crop', () => setTool('crop'), { enabled: hasImg });
command('image.cropApply', 'Apply crop', () => cropApply(), { enabled: () => !!ui.cropDraft });
command('image.cropReset', 'Reset crop', () => cropReset(), { enabled: () => !!(doc.photo.crop || ui.cropDraft) });
command('image.rotateLeft', 'Rotate left', () => rotateImage(-1), { enabled: hasImg });
command('image.rotateRight', 'Rotate right', () => rotateImage(1), { enabled: hasImg });
command('image.flipH', 'Flip across', () => flipImage('x'), { enabled: hasImg });
command('image.flipV', 'Flip up and down', () => flipImage('y'), { enabled: hasImg });
command('image.canvas', 'Canvas size…', () => openCanvasSize(), { enabled: hasImg });
command('image.removeBg', 'Remove background', () => removeBackground(), { enabled: hasImg });
command('image.removeSel', 'Remove the selected area', () => selRemove(), { enabled: () => hasSelection });
command('image.keepSel', 'Keep only the selected area', () => selKeepOnly(), { enabled: () => hasSelection });
command('image.invertSel', 'Invert the selection', () => selInvert(), { enabled: () => hasSelection });
command('image.restoreAll', 'Bring everything back', () => clearRemoval(), { enabled: () => hasRemoval });
command('image.trace', 'Trace lines from the photo', () => { ui.tab = 'lines'; buildTabs(); buildPanel(); traceNow(); }, { enabled: hasImg });
// Layer
['text', 'lines', 'photo'].forEach((id) => command('layer.show.' + id, LAYER_NAMES[id], () => toggleLayerVisible(id), { checked: () => !!layerOf(id).visible }));
command('layer.lock', 'Keep text art while I edit the photo', () => lockText(!doc.text.locked), { checked: () => !!doc.text.locked, enabled: () => doc.text.applied });
command('layer.addText', 'Add a text art layer', () => { if (!doc.text.applied) applyTextArt(); ui.tab = 'text'; buildTabs(); addTextLayer(); });
command('layer.dupText', 'Duplicate the text art layer', () => duplicateLayer(doc.text.sel), { enabled: () => doc.text.applied });
const curStackId = () => (ui.tab === 'photo' ? 'photo' : ui.tab === 'lines' ? 'lines' : 'text');
command('layer.up', 'Move the current layer up', () => moveLayerTo(curStackId(), doc.order.indexOf(curStackId()) - 1), { enabled: () => doc.order.indexOf(curStackId()) > 0 });
command('layer.down', 'Move the current layer down', () => moveLayerTo(curStackId(), doc.order.indexOf(curStackId()) + 1), { enabled: () => doc.order.indexOf(curStackId()) < doc.order.length - 1 });
// Text art
command('type.apply', 'Apply text art', () => applyTextArt(), { enabled: () => hasImg() && !doc.text.applied });
command('type.variations', 'Variations…', () => { if (!doc.text.applied) applyTextArt(); ui.tab = 'text'; buildTabs(); buildPanel(); showVariations(); }, { enabled: hasImg });
// View
[['photo', 'Photo view', '1'], ['mix', 'Mix view', '2'], ['text', 'Text view', '3']].forEach(([v, t, k]) => command('view.' + v, t, () => showView(v), { keys: [k], checked: () => ui.view === v, enabled: hasImg }));
command('view.compare', 'Compare with a divider', () => toggleSplit(), { keys: ['/'], checked: () => !!ui.compare.on, enabled: hasImg });
command('view.zoomIn', 'Zoom in', () => stepZoom(1), { keys: ['mod+=', 'mod+shift++', 'mod++'], typing: true });
command('view.zoomOut', 'Zoom out', () => stepZoom(-1), { keys: ['mod+-'], typing: true });
command('view.fit', 'Fit to window', () => zoomTo('fit'), { keys: ['mod+0'], typing: true });
command('view.actual', 'Actual size', () => zoomTo(1), { keys: ['mod+1'], typing: true });
command('view.zoomSel', 'Zoom to selection', () => zoomToSelection(), { keys: ['mod+2'], typing: true });
QUALITY.forEach(([v, t]) => command('view.quality.' + v, t + ' preview', () => setQuality(v), { checked: () => ui.quality === v }));
command('view.grid', 'Show grid', () => { prefs.grid.show = !prefs.grid.show; savePrefs(); drawOverlay(); }, { keys: ["mod+'"], checked: () => !!prefs.grid.show });
command('snap.on', 'Snapping', () => setSnap('on'), { keys: ['mod+;'], checked: () => !!prefs.snap.on });
SNAP_KINDS.forEach(([k, t]) => command('snap.' + k, t, () => setSnap(k), { checked: () => !!prefs.snap[k], enabled: () => !!prefs.snap.on }));
command('snap.gridSize', 'Grid size…', () => openSettings());
// Tools (palette and keys; the rail on the left shows them too)
[['hand', 'h'], ['zoom', 'z'], ['crop', 'c'], ['wand', 'w'], ['lasso', 'l'], ['brush', 'b'], ['select', 'v'], ['shape', 'u'], ['text', 't'], ['pen', 'p'], ['pencil', 'n'], ['direct', 'a']]
  .forEach(([id, k]) => { const t = TOOLS.find((x) => x.id === id); command('tool.' + id, 'Tool: ' + (t ? t.name.split(/[:.]/)[0] : id), () => setTool(id), { keys: [k], checked: () => ui.tool === id }); });
// Plugins
command('plugins.manage', 'Plugins…', () => openPlugins());
command('plugins.load', 'Load plugin…', () => pluginInput.click());
command('plugins.template', 'Get the plugin template', () => saveFile('sungfluence-plugin-template.js', PLUGIN_FILES['sungfluence-plugin-template.js']));
// Help
command('help.help', 'SungFluence Help', () => openHelp(), { keys: ['f1'], typing: true });
command('help.tutorial', 'Getting started', () => openHelp('getting-started'));
command('help.shortcuts', 'Keyboard shortcuts', () => openHelp('shortcuts'));
command('help.palette', 'Find a command…', () => openPalette(), { keys: ['mod+k'], typing: true });
command('help.feedback', 'Send feedback or report a bug', () => openURL(ISSUES_URL));
command('help.source', 'Project page and source code', () => openURL('https://github.com/datakeen/Sungfluence'));
command('help.about', 'About SungFluence', () => openAbout());

/* styles, recipes, samples and export formats are commands too, made from their own lists */
function dynamicCommands() {
  // made fresh each time, so removed plugins and renamed recipes disappear
  for (const id of Array.from(COMMANDS.keys())) if (/^(style|recipe|sample|export)\./.test(id)) COMMANDS.delete(id);
  Object.entries(MODES).forEach(([k, m]) => command('style.' + k, (m.plugin ? 'Extra effect: ' : 'Style: ') + m.name, () => usePluginStyle(k), { checked: () => doc.text.applied && curLayer().mode === k, enabled: hasImg }));
  RECIPES.forEach((r, i) => command('recipe.' + i, 'Recipe: ' + r.name, () => applyRecipe(r), { enabled: hasImg }));
  Object.keys(SAMPLES).forEach((k) => command('sample.' + k, 'Sample: ' + k, () => useSample(k)));
  EXPORTS.forEach((x, i) => { if (x.title) command('export.' + i, 'Export: ' + x.title, () => { if (origImg) x.run(); }, { enabled: () => hasImg() && (x.always || doc.text.applied) && (!x.when || x.when()) }); });
}

/* ---------- menus ---------- */
const item = (id) => ({ id });
const SEP = { sep: true };
function menuSpec() {
  dynamicCommands();
  const styles = Object.entries(MODES).filter(([, m]) => !m.plugin).map(([k]) => item('style.' + k));
  const extras = Object.entries(MODES).filter(([, m]) => m.plugin).map(([k]) => item('style.' + k));
  const exportsList = [];
  EXPORTS.forEach((x, i) => {
    if (x.head) { if (exportsList.length) exportsList.push(SEP); exportsList.push({ head: x.head }); }
    else if (x.sep) exportsList.push(SEP);
    else exportsList.push(Object.assign(item('export.' + i), { label: x.title }));
  });
  return [
    { label: 'File', items: [item('file.new'), item('file.square'), item('file.open'),
      { label: 'Samples', items: Object.keys(SAMPLES).map((k) => Object.assign(item('sample.' + k), { label: k[0].toUpperCase() + k.slice(1) })) },
      SEP, item('file.save'), item('file.export'), SEP, item('file.settings')] },
    { label: 'Edit', items: [item('edit.undo'), item('edit.redo'), SEP, { clipboard: true }, item('edit.copy'), item('edit.paste'), item('edit.duplicate'), item('edit.delete'), SEP,
      item('edit.selectAll'), item('edit.deselect'), SEP,
      { label: 'Line up', items: ['left', 'center', 'right', SEP, 'top', 'middle', 'bottom'].map((h) => (h === SEP ? SEP : item('edit.align.' + h))) },
      { label: 'Arrange', items: ['front', 'forward', 'backward', 'back'].map((h) => item('edit.arrange.' + h)) }] },
    { label: 'Image', items: [item('image.crop'), item('image.cropApply'), item('image.cropReset'), SEP, item('image.rotateLeft'), item('image.rotateRight'), item('image.flipH'), item('image.flipV'), item('image.canvas'), SEP,
      item('image.removeBg'), item('image.removeSel'), item('image.keepSel'), item('image.invertSel'), item('image.restoreAll'), SEP, item('image.trace')] },
    { label: 'Layer', items: [{ head: 'Show' }, item('layer.show.text'), item('layer.show.lines'), item('layer.show.photo'), SEP, item('layer.up'), item('layer.down'), SEP,
      item('layer.lock'), item('layer.addText'), item('layer.dupText')] },
    { label: 'Text art', items: [item('type.apply'), item('type.variations'), SEP, { label: 'Style', items: styles }, { label: 'Recipes', items: RECIPES.map((r, i) => Object.assign(item('recipe.' + i), { label: r.name })) }] },
    { label: 'Effects', items: [{ label: 'Extra effects', items: extras.length ? extras : [{ head: 'None yet' }] }, SEP, item('plugins.manage'), item('plugins.load'), item('plugins.template')] },
    { label: 'Export', items: exportsList },
    { label: 'View', items: [item('view.photo'), item('view.mix'), item('view.text'), item('view.compare'), SEP, item('view.zoomIn'), item('view.zoomOut'), item('view.fit'), item('view.actual'), item('view.zoomSel'), SEP,
      { label: 'Preview', items: QUALITY.map(([v]) => item('view.quality.' + v)) }, SEP, item('view.grid'),
      { label: 'Snapping', items: [item('snap.on'), SEP].concat(SNAP_KINDS.map(([k]) => item('snap.' + k)), [SEP, item('snap.gridSize')]) }] },
    { label: 'Help', items: [item('help.help'), item('help.tutorial'), item('help.shortcuts'), item('help.palette'), SEP, item('help.feedback'), item('help.source'), SEP, item('help.about')] }
  ];
}
/* fill in labels, keys and states, so the page and the desktop app can draw the same menus */
function resolveMenu(items) {
  return items.map((it) => {
    if (it.sep || it.head || it.clipboard) return it;
    if (it.items) return { label: it.label, items: resolveMenu(it.items) };
    const c = COMMANDS.get(it.id);
    if (!c) return null;
    return { id: c.id, label: it.label || c.label.replace(/^(Style|Extra effect|Recipe|Sample|Export|Tool): /, ''), keys: c.keys[0] || c.hint || '',
      enabled: c.enabled ? !!c.enabled() : true, checked: c.checked ? !!c.checked() : undefined };
  }).filter(Boolean);
}
function keyLabel(k) {
  if (!k) return '';
  const parts = k.split(/\+(?!$)/);
  const key = parts.pop(), mods = parts;
  const name = key.length === 1 ? key.toUpperCase() : ({ delete: 'Delete', f1: 'F1' })[key] || key;
  if (isMac) return mods.map((m) => ({ mod: '⌘', shift: '⇧', alt: '⌥' })[m]).join('') + name;
  return mods.map((m) => ({ mod: 'Ctrl', shift: 'Shift', alt: 'Alt' })[m]).sort((a, b) => (a === 'Ctrl' ? -1 : b === 'Ctrl' ? 1 : 0)).concat(name).join('+');
}

/* ---------- keyboard ---------- */
function eventKeys(e) {
  const mods = [];
  if (e.metaKey || e.ctrlKey) mods.push('mod');
  if (e.shiftKey) mods.push('shift');
  if (e.altKey) mods.push('alt');
  return mods.concat(e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()).join('+');
}
let keyIndex = null;
/* returns true when a command took the key */
function runShortcut(e, typing) {
  if (!keyIndex) { keyIndex = new Map(); COMMANDS.forEach((c) => c.keys.forEach((k) => keyIndex.set(k, c))); }
  const c = keyIndex.get(eventKeys(e));
  if (!c || (typing && !c.typing)) return false;
  if (c.enabled && !c.enabled()) return false;
  e.preventDefault();
  runCommand(c.id);
  return true;
}

/* ---------- the menu bar in the page (web version) and dropdown menus ---------- */
let openDrop = [];
function closeMenus() { openDrop.forEach((d) => d.remove()); openDrop = []; document.querySelectorAll('#menubar > button').forEach((b) => b.setAttribute('aria-expanded', 'false')); }
function dropMenu(items, x, y, level) {
  level = level || 0;
  while (openDrop.length > level) openDrop.pop().remove();
  const m = el('div', 'dropmenu'); m.setAttribute('role', 'menu');
  items.forEach((it) => {
    if (it.sep) { if (m.lastChild && m.lastChild.tagName !== 'HR') m.appendChild(el('hr')); return; }
    if (it.clipboard) return;
    if (it.head) { m.appendChild(el('div', 'menu-h', it.head)); return; }
    const b = el('button', 'mi'); b.type = 'button'; b.setAttribute('role', it.checked === undefined ? 'menuitem' : 'menuitemcheckbox');
    if (it.checked !== undefined) b.setAttribute('aria-checked', String(it.checked));
    b.append(el('span', 'ck', it.checked ? '✓' : ''), el('span', 'lb', it.label));
    if (it.items) {
      b.appendChild(el('span', 'kb', '›')); b.setAttribute('aria-haspopup', 'true');
      const openSub = () => { const r = b.getBoundingClientRect(); dropMenu(it.items, r.right - 4, r.top - 5, level + 1); };
      b.onmouseenter = openSub; b.onclick = openSub;
    } else {
      if (it.keys) b.appendChild(el('span', 'kb', keyLabel(it.keys)));
      b.disabled = it.enabled === false;
      b.onmouseenter = () => { while (openDrop.length > level + 1) openDrop.pop().remove(); };
      b.onclick = () => runCommand(it.id);
    }
    m.appendChild(b);
  });
  document.body.appendChild(m);
  openDrop.push(m);
  // keep it on the screen
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
  m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + 'px';
  m.addEventListener('keydown', (e) => {
    // keys here move through the menu; they must not also nudge shapes or switch tools
    e.stopPropagation();
    const bs = Array.from(m.querySelectorAll('button:not(:disabled)'));
    const i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (bs[i + 1] || bs[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); }
    else if (e.key === 'ArrowRight' && document.activeElement && document.activeElement.getAttribute('aria-haspopup')) { e.preventDefault(); document.activeElement.click(); const sub = openDrop[level + 1]; if (sub) { const f = sub.querySelector('button:not(:disabled)'); if (f) f.focus(); } }
    else if (e.key === 'ArrowLeft' && level > 0) { e.preventDefault(); openDrop.pop().remove(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenus(); }
  });
  return m;
}
function buildMenubar() {
  const bar = $('menubar');
  if (window.sungfluenceDesktop) { bar.hidden = true; return; }
  bar.hidden = false; $('app').classList.add('has-menubar');
  bar.replaceChildren();
  menuSpec().forEach((menu) => {
    const b = el('button', null, menu.label); b.type = 'button'; b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
    const open = () => {
      closeMenus(); b.setAttribute('aria-expanded', 'true');
      const r = b.getBoundingClientRect();
      const m = dropMenu(resolveMenu(menuSpec().find((x) => x.label === menu.label).items), r.left, r.bottom + 2, 0);
      const f = m.querySelector('button:not(:disabled)'); if (f) f.focus({ preventScroll: true });
    };
    b.onclick = (e) => { e.stopPropagation(); if (b.getAttribute('aria-expanded') === 'true') closeMenus(); else open(); };
    // once a menu is open, moving across the bar opens the next one
    b.onmouseenter = () => { if (openDrop.length && b.getAttribute('aria-expanded') !== 'true') open(); };
    bar.appendChild(b);
  });
}
document.addEventListener('mousedown', (e) => { if (openDrop.length && !e.target.closest('.dropmenu, #menubar')) closeMenus(); });
window.addEventListener('blur', () => closeMenus());

/* ---------- the desktop app's native menu ---------- */
let menuTimer = null, lastMenu = '';
function syncMenus() {
  if (!window.sungfluenceDesktop) return;
  clearTimeout(menuTimer);
  menuTimer = setTimeout(() => {
    const spec = menuSpec().map((m) => ({ label: m.label, items: resolveMenu(m.items) }));
    const s = JSON.stringify(spec);
    if (s === lastMenu) return;
    lastMenu = s;
    window.sungfluenceDesktop.setMenu(spec);
  }, 120);
}
/* the desktop menu calls this; old names from earlier versions still work */
window.__sungfluenceMenu = (cmd) => {
  const old = { 'load-plugin': 'plugins.load', plugins: 'plugins.manage', 'plugin-template': 'plugins.template', new: 'file.new', open: 'file.open', export: 'file.export',
    settings: 'file.settings', undo: 'edit.undo', redo: 'edit.redo', about: 'help.about', help: 'help.help', tutorial: 'help.tutorial' };
  runCommand(old[cmd] || cmd);
};

/* ---------- command palette ---------- */
function paletteEntries() {
  dynamicCommands();
  const where = new Map();
  const walk = (items, path) => items.forEach((it) => { if (it.items) walk(it.items, path.concat(it.label)); else if (it.id) where.set(it.id, path.join(' › ')); });
  menuSpec().forEach((m) => walk(m.items, [m.label]));
  return Array.from(COMMANDS.values()).map((c) => ({ c, where: where.get(c.id) || (c.id.startsWith('tool.') ? 'Tools' : '') }));
}
function openPalette() {
  closeMenus();
  if ($('palette')) { $('palette').querySelector('input').focus(); return; }
  const sc = el('div', 'palette-scrim'); sc.id = 'palette';
  const box = el('div', 'palette'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Find a command');
  const inp = el('input'); inp.type = 'text'; inp.placeholder = 'Type a command, a style, a recipe or a tool'; inp.setAttribute('aria-label', 'Find a command');
  const list = el('div', 'palette-list'); list.setAttribute('role', 'listbox');
  box.append(inp, list); sc.appendChild(box); document.body.appendChild(sc);
  const all = paletteEntries();
  let shown = [], active = 0;
  const close = () => sc.remove();
  const render = () => {
    const words = inp.value.toLowerCase().split(/\s+/).filter(Boolean);
    shown = all.filter(({ c, where }) => { const hay = (c.label + ' ' + where).toLowerCase(); return words.every((w) => hay.includes(w)); })
      .map((x) => Object.assign(x, { score: (x.c.label.toLowerCase().startsWith(words[0] || '') ? 0 : 1) + (x.c.enabled && !x.c.enabled() ? 2 : 0) }))
      .sort((a, b) => a.score - b.score).slice(0, 60);
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.replaceChildren();
    shown.forEach(({ c, where }, i) => {
      const b = el('button', 'pi-row'); b.type = 'button'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(i === active));
      const off = c.enabled && !c.enabled();
      if (off) b.classList.add('off');
      b.append(el('span', 'lb', (c.checked && c.checked() ? '✓ ' : '') + c.label), el('span', 'wh', where), el('span', 'kb', keyLabel(c.keys[0] || c.hint || '')));
      b.onmousemove = () => { if (active !== i) { active = i; mark(); } };
      b.onclick = () => go(i);
      list.appendChild(b);
    });
    if (!shown.length) list.appendChild(el('div', 'note', 'Nothing found.'));
  };
  const mark = () => list.querySelectorAll('.pi-row').forEach((b, i) => { b.setAttribute('aria-selected', String(i === active)); if (i === active) b.scrollIntoView({ block: 'nearest' }); });
  const go = (i) => { const x = shown[i]; if (!x) return; if (x.c.enabled && !x.c.enabled()) { toast('Not available right now.'); return; } close(); runCommand(x.c.id); };
  inp.oninput = () => { active = 0; render(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(shown.length - 1, active + 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  };
  sc.addEventListener('mousedown', (e) => { if (e.target === sc) close(); });
  render(); inp.focus();
}
