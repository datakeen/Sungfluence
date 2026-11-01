// Starts a browser for the tests. Tries Playwright's own Chromium first, then the Chrome or Edge already on this computer.
// Some Windows setups block freshly downloaded programs, and the installed browsers still work there.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { chromium } = require('playwright');

async function launch(opts) {
  const tries = [{}, { channel: 'chrome' }, { channel: 'msedge' }];
  let last = null;
  for (const t of tries) {
    try { return await chromium.launch(Object.assign({}, opts || {}, t)); } catch (e) { last = e; }
  }
  throw last;
}
module.exports = { launch };
