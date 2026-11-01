// Draws the app icons from app/icon.svg: build/icon.png for the installers, and the PNGs in src/icons for the web app.
// Run it after changing the icon: npm run icons   (needs: npx playwright install chromium)
// SPDX-License-Identifier: AGPL-3.0-or-later
const fs = require('fs');
const path = require('path');
const { launch } = require('../tests/browser');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'app', 'icon.svg'), 'utf8');
const out = [
  ['build/icon.png', 1024, false],
  ['src/icons/icon-512.png', 512, false],
  ['src/icons/icon-192.png', 192, false],
  ['src/icons/maskable-512.png', 512, true]
];

(async () => {
  const b = await launch();
  const p = await b.newPage();
  for (const [file, size, maskable] of out) {
    // a maskable icon fills the square; launchers cut their own shape from the middle 80 percent
    const inner = maskable
      ? '<div style="width:' + size + 'px;height:' + size + 'px;background:linear-gradient(135deg,#ffd166,#ff9f43 52%,#ff6b8b);display:flex;align-items:center;justify-content:center"><div style="width:' + Math.round(size * 0.96) + 'px;height:' + Math.round(size * 0.96) + 'px">' + svg + '</div></div>'
      : '<div style="width:' + size + 'px;height:' + size + 'px">' + svg + '</div>';
    await p.setViewportSize({ width: size, height: size });
    await p.setContent('<html><body style="margin:0;background:transparent">' + inner + '<style>svg{width:100%;height:100%;display:block}</style></body></html>');
    await p.waitForTimeout(150);
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    await p.screenshot({ path: path.join(root, file), omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote ' + file);
  }
  await b.close();
})();
