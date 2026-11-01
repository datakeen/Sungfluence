/* ===================== Part 4b: plugins ===================== */
/* A plugin is a JavaScript file that calls Sungfluence.plugin({...}). The engine runs it as a style;
   this part turns its settings into panel controls, loads files the user picks, and remembers them. */
const PLUGIN_KEY = 'sungfluence-plugins-v1';
const builtinPlugins = new Set();
let pluginAdds = [];
const pluginErrShown = {};
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pluginControl(c) {
  if (!c || typeof c !== 'object') return null;
  const lab = String(c.label || c.key || '').slice(0, 60);
  let o = null;
  if (c.type === 'range' && c.key) o = R(c.key, lab, +c.min || 0, +c.max || 1, +c.step || 0.01);
  else if (c.type === 'toggle' && c.key) o = T(c.key, lab);
  else if (['choice', 'seg', 'select'].includes(c.type) && c.key && Array.isArray(c.options)) {
    const opts = c.options.map((x) => (Array.isArray(x) ? [x[0], String(x[1] ?? x[0])] : [x, String(x)]));
    o = (opts.length <= 4 && c.type !== 'select') ? S(c.key, lab, opts) : SEL(c.key, lab, opts);
  } else if ((c.type === 'text' || c.type === 'textarea') && c.key) o = (c.type === 'text' ? TX : TA)(c.key, lab);
  else if (c.type === 'font') o = Object.assign({}, FONT);
  else if (c.type === 'color' || c.type === 'colormode') { const op = (c.options || ['ink', 'image', 'tone', 'duotone']).filter((x) => COLOR_LABEL[x] && x !== 'fill'); o = COL(op.length ? op : ['ink']); }
  else if (c.type === 'ink' && c.key) o = { key: c.key, label: lab, type: 'ink' };
  if (o) o.more = !!c.more;
  return o;
}
function addPluginMode(key, def) {
  const ctl = (Array.isArray(def.controls) ? def.controls : []).map(pluginControl).filter(Boolean);
  MODES[key] = {
    name: String(def.name || def.id).slice(0, 28), plugin: def, usesLines: !!def.usesLines,
    glyph: '<span class="pg">' + escapeHTML(String(def.icon || (def.name || def.id)[0]).slice(0, 3)) + '</span>',
    defaults: Object.assign({ color: 'ink' }, def.defaults || {}),
    controls: ctl.filter((c) => !c.more), more: ctl.filter((c) => c.more)
  };
}
function dropPluginMode(key) {
  delete MODES[key];
  let changed = false;
  doc.text.layers = doc.text.layers.map((L) => { if (L.mode !== key) return L; changed = true; return newLayer('rows', L.text ? { text: L.text } : {}); });
  if (changed) { buildPanel(); queueHistory(); scheduleText(0); }
}
C.plugins().forEach(({ key, def }) => { builtinPlugins.add(key); addPluginMode(key, def); });
C.onPlugin((ev, def, info) => {
  if (ev === 'add') { addPluginMode(info, def); pluginAdds.push(info); }
  else if (ev === 'remove') dropPluginMode(info);
  else if (ev === 'error') {
    const msg = String((info && info.message) || info).slice(0, 140);
    console.error('SungFluence plugin ' + def.id, info);
    if (!pluginErrShown[def.id + msg]) { pluginErrShown[def.id + msg] = 1; toast('The ' + (def.name || def.id) + ' plugin stopped: ' + msg); }
  }
});

/* Run a plugin file. Pages differ in what they allow, so try three ways in turn. */
function runPluginCode(code) {
  return new Promise((resolve, reject) => {
    pluginAdds = [];
    window.__sungfluencePlugin = { ran: false, error: null };
    const wrapped = 'window.__sungfluencePlugin.ran = true;\ntry {\n' + code + '\n;} catch (e) { window.__sungfluencePlugin.error = e; }';
    const settle = () => {
      const st = window.__sungfluencePlugin;
      if (!st.ran) return false;
      if (st.error) reject(st.error);
      else if (pluginAdds.length) resolve(pluginAdds.slice());
      else reject(new Error('The file ran but did not call Sungfluence.plugin({...}).'));
      return true;
    };
    // a page with its own security policy (the desktop app) allows only the third way
    const strict = !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!strict) {
      try { const s = document.createElement('script'); s.textContent = wrapped; document.head.appendChild(s); s.remove(); } catch (e) { /* inline scripts blocked */ }
      if (settle()) return;
      try { (0, Function)(wrapped)(); } catch (e) { /* eval blocked */ }
      if (settle()) return;
    }
    let url;
    try { url = URL.createObjectURL(new Blob([wrapped], { type: 'text/javascript' })); } catch (e) { reject(new Error('blocked')); return; }
    const s2 = document.createElement('script'); s2.src = url;
    s2.onload = () => { URL.revokeObjectURL(url); s2.remove(); if (!settle()) reject(new Error('blocked')); };
    s2.onerror = () => { URL.revokeObjectURL(url); s2.remove(); reject(new Error('blocked')); };
    document.head.appendChild(s2);
  });
}
function savedPlugins() { try { return JSON.parse(localStorage.getItem(PLUGIN_KEY) || '[]'); } catch (e) { return []; } }
function storePlugins(list) { try { localStorage.setItem(PLUGIN_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
async function loadPluginText(code, fileName) {
  if (code.length > 600000) { toast('That plugin file is too large (600 KB at most).'); return; }
  try {
    const keys = await runPluginCode(code);
    const ids = keys.map((k) => k.slice(7));
    const list = savedPlugins().filter((p) => !p.ids.some((id) => ids.includes(id)));
    list.push({ file: fileName, ids, code });
    const kept = storePlugins(list);
    const names = keys.map((k) => MODES[k].name).join(', ');
    buildPanel(); if (!$('dlgScrim').hidden && $('dlgTitle') && $('dlgTitle').textContent === 'Plugins') openPlugins();
    toast('Added ' + names + '. Find it under Style, in Extra effects.' + (kept ? '' : ' It will be gone after a reload.'), { label: 'Use it', fn: () => usePluginStyle(keys[0]) });
  } catch (e) {
    const m = e && e.message === 'blocked'
      ? 'This page does not allow loading plugins. The desktop app does.'
      : 'Could not load the plugin: ' + String((e && e.message) || e).slice(0, 140);
    toast(m);
  }
}
const pluginInput = document.createElement('input');
pluginInput.type = 'file'; pluginInput.accept = '.js,.mjs,text/javascript'; pluginInput.hidden = true;
pluginInput.setAttribute('aria-hidden', 'true');
document.body.appendChild(pluginInput);
pluginInput.onchange = async () => {
  const f = pluginInput.files && pluginInput.files[0];
  pluginInput.value = '';
  if (f) await loadPluginText(await f.text(), f.name);
};
function removeUserPlugin(id) {
  storePlugins(savedPlugins().map((p) => Object.assign(p, { ids: p.ids.filter((x) => x !== id) })).filter((p) => p.ids.length));
  C.removePlugin(id);
  buildPanel(); if (!$('dlgScrim').hidden) openPlugins();
  toast('Plugin removed.');
}
function usePluginStyle(key) {
  if (!MODES[key]) return;
  if (!doc.text.applied) {
    doc.text.layers = [newLayer(key)]; doc.text.sel = 0; doc.text.source = 'photo'; doc.text.applied = true;
    ui.tab = 'text'; buildTabs(); buildPanel(); setView('text'); scheduleText(0); queueHistory();
    return;
  }
  ui.tab = 'text'; buildTabs();
  setLayerStyle(key);
  if (ui.view === 'photo') setView('text');
}
/* The Plugins window: opened from the Plugins button at the top, the desktop menu bar, or "Plugins…" next to Extra effects */
function openPlugins() {
  openDialog('Plugins', (body) => {
    body.appendChild(el('p', 'note', 'A plugin is a small JavaScript file that adds an effect. Its effects appear under Style, in Extra effects. Plugins run code inside SungFluence, so only load files you trust.'));
    const list = el('div', 'plugin-list');
    C.plugins().forEach(({ key, def }) => {
      const row = el('div', 'plugin-row');
      const info = el('div', 'pi');
      const meta = [def.version ? 'v' + def.version : '', def.author || '', builtinPlugins.has(key) ? 'comes with SungFluence' : 'loaded by you'].filter(Boolean).join(' · ');
      info.append(el('b', null, String(def.name || def.id)), el('small', null, meta));
      if (def.description) info.appendChild(el('span', 'note', String(def.description).slice(0, 200)));
      row.appendChild(info);
      const acts = el('div', 'pa');
      const use = el('button', 'mini-btn', 'Use'); use.type = 'button'; use.onclick = () => { closeDialog(); usePluginStyle(key); };
      acts.appendChild(use);
      if (!builtinPlugins.has(key)) { const rm = el('button', 'mini-btn', 'Remove'); rm.type = 'button'; rm.onclick = () => removeUserPlugin(def.id); acts.appendChild(rm); }
      row.appendChild(acts);
      list.appendChild(row);
    });
    body.appendChild(list);
    const g = el('div', 'grid2');
    g.append(optBtn('Load plugin…', () => pluginInput.click(), true), optBtn('Get the template', () => saveFile('sungfluence-plugin-template.js', PLUGIN_FILES['sungfluence-plugin-template.js'])));
    body.appendChild(g);
    body.appendChild(el('p', 'note', 'To make your own, get the template, change it in any text editor, and load it here. The guide is docs/PLUGINS.md in the source code.'));
  });
}
$('pluginsBtn').onclick = openPlugins;
/* The desktop app's menu bar calls these. The web version has the same actions on its buttons. */
window.__sungfluenceMenu = (cmd) => {
  const acts = {
    'load-plugin': () => pluginInput.click(),
    'plugins': openPlugins,
    'plugin-template': () => saveFile('sungfluence-plugin-template.js', PLUGIN_FILES['sungfluence-plugin-template.js']),
    'new': () => $('newBtn').click(),
    'open': () => $('fileInput').click(),
    'export': () => $('exportBtn').click(),
    'settings': () => $('settingsBtn').click(),
    'undo': () => $('undoBtn').click(),
    'redo': () => $('redoBtn').click(),
    'about': () => openAbout()
  };
  if (acts[cmd]) acts[cmd]();
};
/* plugins the user loaded before come back on start */
const pluginsReady = (async () => {
  for (const p of savedPlugins()) {
    try { await runPluginCode(p.code); } catch (e) { console.warn('Saved plugin did not load', p.file, e); }
  }
})();
