// Draws the app icons from app/icon.svg: build/icon.png, build/icon.ico, build/icon-mac.png and build/icons/ for the installers,
// and the PNGs and icon.ico in src/icons for the web app and the window.
// Run it after changing the icon: npm run icons   (needs: npx playwright install chromium)
// SPDX-License-Identifier: AGPL-3.0-or-later
const fs = require('fs');
const path = require('path');
const { launch } = require('../tests/browser');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'app', 'icon.svg'), 'utf8');

// Each PNG is drawn at its real size, so the media queries in icon.svg pick the right detail:
// no letter field below 160 px, and heavier letters without shadows at 48 px and below.
const looks = {
  plain: '',
  // Android cuts its own shape from a full square and keeps only the middle circle (80 percent) safe:
  // fill the square edge to edge, drop the rim, and scale the letters into that circle.
  maskable: '.tile { x: 0; y: 0; width: 1024px; height: 1024px; rx: 0 } .rim, .rim-s { display: none }' +
    ' .mark { transform: translate(512px, 512px) scale(.94) translate(-512px, -512px) }',
  // macOS icons sit on an 824 px tile inside 1024, so the icon matches the size of other apps in the Dock.
  mac: '.art { transform: translate(65.08px, 65.08px) scale(.8729) }'
};
const pngs = [
  ['build/icon.png', 1024, 'plain'],
  ['build/icon-mac.png', 1024, 'mac'],
  ['src/icons/icon-512.png', 512, 'plain'],
  ['src/icons/icon-192.png', 192, 'plain'],
  ['src/icons/maskable-512.png', 512, 'maskable']
];
// Linux reads a folder of sizes; Windows reads one .ico that holds every size.
for (const s of [16, 24, 32, 48, 64, 128, 256, 512]) pngs.push(['build/icons/' + s + 'x' + s + '.png', s, 'plain']);
const icoSizes = [16, 20, 24, 32, 40, 48, 64, 256];

function ico(images) {
  // an .ico file with PNG images inside, which Windows reads since Vista
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(([size, png], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([head].concat(images.map(i => i[1])));
}

(async () => {
  const b = await launch();
  const p = await b.newPage();
  const draw = async (size, look) => {
    const maskable = look === 'maskable';
    await p.setViewportSize({ width: size, height: size });
    await p.setContent('<html><body style="margin:0;background:transparent"><div style="width:' + size + 'px;height:' + size + 'px">' + svg + '</div>' +
      '<style>svg{width:100%;height:100%;display:block} .art, .mark { transform-box: view-box } ' + looks[look] + '</style></body></html>');
    await p.waitForTimeout(150);
    return p.screenshot({ omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
  };
  const write = (file, buf) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), buf);
    console.log('wrote ' + file);
  };
  for (const [file, size, look] of pngs) write(file, await draw(size, look));
  const images = [];
  for (const s of icoSizes) images.push([s, await draw(s, 'plain')]);
  const icon = ico(images);
  write('build/icon.ico', icon);
  write('src/icons/icon.ico', icon);
  await b.close();
})();
