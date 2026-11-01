// Opens src/index.html straight from disk, the way a double-click does, and checks the main features.
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(300); };
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('page: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2500);
  const info = await p.evaluate(() => ({ samples: Object.keys(SAMPLES), plugins: Sungfluence.plugins().map((x) => x.key), version: window.SUNGFLUENCE_VERSION, fonts: document.fonts.check('16px Oswald') }));
  console.log('samples', info.samples.join(','), '| plugins', info.plugins.join(','), '| version', info.version, '| Oswald loaded', info.fonts);
  // the swirl sample: one click on Apply text art should trace it and write white text along the lines
  await p.evaluate(() => document.querySelectorAll('#samples .thumb')[6].click()); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__sungfluence.applyTextArt()); await wait(p);
  console.log('swirl: lines', await p.evaluate(() => window.__sungfluence.doc.lines.paths.length), '| layers', await p.evaluate(() => window.__sungfluence.doc.text.layers.map((L) => L.mode).join(',')));
  await p.screenshot({ path: __dirname + '/out/smoke-swirl.png' });
  // the face sample with the Contours plugin
  await p.evaluate(() => document.querySelectorAll('#samples .thumb')[7].click()); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__sungfluence.usePluginStyle('plugin:contour-words')); await wait(p);
  await p.screenshot({ path: __dirname + '/out/smoke-face-contours.png' });
  // a user plugin under the desktop security policy
  await p.locator('input[type=file][accept^=".js"]').setInputFiles(__dirname + '/testplugins/barcode.js'); await p.waitForTimeout(1000);
  console.log('user plugin loaded:', await p.evaluate(() => Sungfluence.plugins().some((x) => x.key === 'plugin:barcode')));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
