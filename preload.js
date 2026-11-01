// SungFluence desktop bridge. The page describes its menus; the desktop app draws them as the native menu bar.
// Only this one function is shared with the page, and it can only send a menu description.
// Copyright (C) 2026 Ahmed Bilal. SPDX-License-Identifier: AGPL-3.0-or-later
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sungfluenceDesktop', {
  setMenu: (spec) => ipcRenderer.send('menu:set', spec)
});
