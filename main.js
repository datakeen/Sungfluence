// SungFluence desktop shell. The whole app lives in src/ and runs offline.
// Copyright (C) 2026 Ahmed Bilal. SPDX-License-Identifier: AGPL-3.0-or-later
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
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
      spellcheck: false
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
            detail: 'Turn images into art made of letters.\n\nMade by Ahmed Bilal.\nCopyright (C) 2026 Ahmed Bilal.\n\nThis program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.\n\nThis program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.\n\nSource code: ' + (require('./package.json').homepage || '')
          })
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
