// SungFluence desktop shell. The whole app lives in src/ and runs offline.
// Copyright (C) 2026 Ahmed Bilal. SPDX-License-Identifier: AGPL-3.0-or-later
const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'SungFluence',
    backgroundColor: '#141416',
    icon: path.join(__dirname, 'src', 'icons', 'icon-512.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Links to websites open in the normal browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
  // Exports use the standard save dialog, so people choose where files go.
  win.webContents.session.on('will-download', (event, item) => {
    item.setSaveDialogOptions({ title: 'Save from SungFluence', defaultPath: item.getFilename() });
  });
  win.on('closed', () => { win = null; });
}

// Menu items run the same actions as the buttons in the page. userGesture lets them open file pickers.
const run = (cmd) => () => { if (win) win.webContents.executeJavaScript('window.__sungfluenceMenu && window.__sungfluenceMenu(' + JSON.stringify(cmd) + ')', true); };

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New artboard…', accelerator: 'Shift+N', registerAccelerator: false, click: run('new') },
        { label: 'Open image or project…', accelerator: 'CmdOrCtrl+O', click: run('open') },
        { label: 'Export…', accelerator: 'CmdOrCtrl+E', click: run('export') },
        { type: 'separator' },
        { label: 'Settings…', click: run('settings') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', registerAccelerator: false, click: run('undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', registerAccelerator: false, click: run('redo') },
        { type: 'separator' },
        // the page handles these keys itself (copy and paste also work on shapes), so the menu only shows them
        { role: 'cut', registerAccelerator: false }, { role: 'copy', registerAccelerator: false }, { role: 'paste', registerAccelerator: false }, { role: 'selectAll', registerAccelerator: false }
      ]
    },
    {
      label: 'Plugins',
      submenu: [
        { label: 'Load plugin…', click: run('load-plugin') },
        { label: 'Manage plugins…', click: run('plugins') },
        { type: 'separator' },
        { label: 'Get the plugin template', click: run('plugin-template') },
        { label: 'How to write a plugin', click: () => shell.openExternal((require('./package.json').homepage || 'https://github.com/datakeen/Sungfluence').replace(/#.*$/, '') + '/blob/main/docs/PLUGINS.md') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'SungFluence Help', accelerator: 'F1', registerAccelerator: false, click: run('help') },
        { label: 'Getting started', click: run('tutorial') },
        { type: 'separator' },
        { label: 'Project page and source code', click: () => shell.openExternal(require('./package.json').homepage || 'https://github.com') },
        { label: 'Send feedback or report a bug', click: () => shell.openExternal('https://github.com/datakeen/Sungfluence/issues') },
        { label: 'License: GNU AGPL v3', click: () => shell.openExternal('https://www.gnu.org/licenses/agpl-3.0.html') },
        { type: 'separator' },
        {
          label: 'About SungFluence',
          click: () => dialog.showMessageBox(win, {
            type: 'info', title: 'About SungFluence', message: 'SungFluence ' + app.getVersion(),
            detail: 'Turn images into art made of letters.\n\nFree and open source software.\n\nMade by Ahmed Bilal.\nCopyright (C) 2026 Ahmed Bilal and contributors.\n\nThis program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.\n\nThis program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.\n\nSource code: ' + (require('./package.json').homepage || '')
          })
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// The page sends its menus (the same list as its in-page menu bar and command palette); they become the native menu bar.
// Keys are handled by the page, so the menu only shows them. On a Mac the system menu always takes its keys,
// so there only keys that are safe while typing are attached.
const isMac = process.platform === 'darwin';
const SAFE_WHILE_TYPING = /^(mod\+(o|s|e|k|=|-|0|1|2|\+|shift\+\+)|f1)$/;
function accel(k) {
  if (!k || typeof k !== 'string' || k.length > 24) return undefined;
  if (isMac && !SAFE_WHILE_TYPING.test(k)) return undefined;
  const parts = k.split(/\+(?!$)/), key = parts.pop();
  const names = { mod: 'CmdOrCtrl', shift: 'Shift', alt: 'Alt' };
  const special = { '+': 'Plus', ' ': 'Space', delete: 'Delete', f1: 'F1' };
  const kk = special[key] || (key.length === 1 ? key.toUpperCase() : null);
  if (!kk || !parts.every((m) => names[m])) return undefined;
  return parts.map((m) => names[m]).concat(kk).join('+');
}
const text = (s, n) => String(s == null ? '' : s).slice(0, n || 80);
function fromSpec(items, depth) {
  if (!Array.isArray(items) || depth > 3) return [];
  const out = [];
  for (const it of items.slice(0, 80)) {
    if (!it || typeof it !== 'object') continue;
    if (it.sep) { if (out.length && out[out.length - 1].type !== 'separator') out.push({ type: 'separator' }); continue; }
    if (it.head) { out.push({ label: text(it.head), enabled: false }); continue; }
    if (it.clipboard) {
      // text boxes need these; on a Mac the system menu provides the keys
      ['cut', 'copy', 'paste', 'selectAll'].forEach((role) => out.push({ role, registerAccelerator: isMac }));
      continue;
    }
    if (Array.isArray(it.items)) { out.push({ label: text(it.label), submenu: fromSpec(it.items, depth + 1) }); continue; }
    if (typeof it.id !== 'string' || !/^[\w.:-]{1,80}$/.test(it.id)) continue;
    const m = { label: text(it.label), enabled: it.enabled !== false, click: run(it.id) };
    if (typeof it.checked === 'boolean') { m.type = 'checkbox'; m.checked = it.checked; }
    const a = accel(it.keys);
    if (a) { m.accelerator = a; m.registerAccelerator = isMac; }
    out.push(m);
  }
  while (out.length && out[out.length - 1].type === 'separator') out.pop();
  return out;
}
function menuFromSpec(spec) {
  const menus = (Array.isArray(spec) ? spec.slice(0, 12) : []).map((m) => ({ label: text(m && m.label, 30), submenu: fromSpec(m && m.items, 1) }));
  const view = menus.find((m) => m.label === 'View');
  if (view) view.submenu.push({ type: 'separator' }, { role: 'togglefullscreen' }, { role: 'toggleDevTools' });
  const help = menus.findIndex((m) => m.label === 'Help');
  if (help >= 0) menus.splice(help, 0, { role: 'windowMenu' });
  if (isMac) menus.unshift({ role: 'appMenu' });
  else {
    const file = menus.find((m) => m.label === 'File');
    if (file) file.submenu.push({ type: 'separator' }, { role: 'quit' });
  }
  return Menu.buildFromTemplate(menus);
}
ipcMain.on('menu:set', (event, spec) => {
  if (!win || event.sender !== win.webContents) return;
  try { Menu.setApplicationMenu(menuFromSpec(spec)); } catch (e) { console.error('Menu from the page failed', e); }
});

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
