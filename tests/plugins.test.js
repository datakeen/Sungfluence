const { launch } = require('./browser');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(300); };
const toastText = (p) => p.evaluate(() => { const t = document.getElementById('toast'); return t.hidden ? '' : t.textContent; });
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(require('url').pathToFileURL(require('path').resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  console.log('plugins at start', await p.evaluate(() => Sungfluence.plugins().map(x => x.key).join(',')));
  await p.setInputFiles('#fileInput', __dirname + '/images/portrait.jpg'); await p.waitForTimeout(1200);
  await p.evaluate(() => window.__sungfluence.usePluginStyle('plugin:contour-words')); await wait(p);
  await p.evaluate(() => document.querySelector('#qualitySeg button:nth-child(2)').click()); await wait(p);
  console.log('contour items', await p.evaluate(() => window.__sungfluence.out.layers.map(L => L.mode + ':' + L.items.length).join(' ')));
  await p.screenshot({ path: __dirname + '/out/s18-contours.png' });
  // long tasks at Full
  await p.evaluate(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); });
  await p.evaluate(() => document.querySelector('#qualitySeg button:nth-child(3)').click()); await wait(p);
  console.log('full: longest tasks', await p.evaluate(() => window.__lt.sort((a, b) => b - a).slice(0, 5).join(',')));
  await p.evaluate(() => document.querySelector('#qualitySeg button:nth-child(1)').click()); await wait(p);
  // confetti on the animals
  await p.setInputFiles('#fileInput', __dirname + '/images/drawing.png'); await p.waitForTimeout(1200);
  await p.evaluate(() => window.__sungfluence.usePluginStyle('plugin:confetti')); await wait(p);
  console.log('confetti items', await p.evaluate(() => window.__sungfluence.out.layers.map(L => L.mode + ':' + L.items.length).join(' ')));
  await p.screenshot({ path: __dirname + '/out/s19-confetti.png' });
  // load a user plugin through the hidden input
  const inp = p.locator('input[type=file][accept^=".js"]');
  await inp.setInputFiles(__dirname + '/testplugins/barcode.js'); await p.waitForTimeout(800);
  console.log('toast after barcode:', await toastText(p));
  await p.evaluate(() => window.__sungfluence.usePluginStyle('plugin:barcode')); await wait(p);
  console.log('barcode items', await p.evaluate(() => window.__sungfluence.out.layers.map(L => L.mode + ':' + L.items.length).join(' ')));
  await inp.setInputFiles(__dirname + '/testplugins/nothing.js'); await p.waitForTimeout(600);
  console.log('toast after nothing:', await toastText(p));
  await inp.setInputFiles(__dirname + '/testplugins/broken.js'); await p.waitForTimeout(600);
  await p.evaluate(() => window.__sungfluence.usePluginStyle('plugin:broken')); await wait(p);
  console.log('toast after broken render:', await toastText(p));
  // plugins section
  await p.evaluate(() => window.__sungfluence.usePluginStyle('plugin:contour-words')); await wait(p);
  await p.evaluate(() => { const pn = document.getElementById('panel'); pn.scrollTop = pn.scrollHeight; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/out/s20-plugins.png' });
  // remove barcode, reload, check persistence
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('sungfluence-plugins-v1') || '[]'); window.__saved = s.map(x => x.ids.join('+')).join(','); });
  console.log('saved', await p.evaluate(() => window.__saved));
  await p.reload(); await p.waitForTimeout(2500);
  console.log('after reload', await p.evaluate(() => Sungfluence.plugins().map(x => x.key).join(',')), '| layers', await p.evaluate(() => window.__sungfluence.doc.text.layers.map(L => L.mode).join(',')));
  // export PNG with a plugin layer
  const dlP = p.waitForEvent('download', { timeout: 90000 }).catch(() => null);
  await p.evaluate(() => { const e = window.__sungfluence.EXPORTS.find(x => x.title === 'SVG with live text'); window.__expName = e && e.title; e && e.run && e.run(); });
  console.log('export picked', await p.evaluate(() => window.__expName));
  const d = await dlP; console.log('download', d ? d.suggestedFilename() : 'none');
  console.log('errors', JSON.stringify(errs.filter(e => !/fonts\.googleapis|ERR_FAILED|net::/.test(e))));
  await b.close();
})();
