const { launch } = require('./browser');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(300); };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto(require('url').pathToFileURL(require('path').resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  await p.setInputFiles('#fileInput', __dirname + '/images/portrait.jpg'); await p.waitForTimeout(1200);
  await p.evaluate(() => window.__sungfluence.setTool('pencil'));
  const box = await p.locator('#art').boundingBox();
  const P = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
  let [x, y] = P(0.25, 0.82); await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 30; i++) { const t = i / 30; const [px, py] = P(0.25 + 0.5 * t, 0.82 + 0.06 * Math.sin(t * Math.PI)); await p.mouse.move(px, py); }
  await p.mouse.up(); await p.waitForTimeout(300);
  console.log('pencil paths', await p.evaluate(() => window.__sungfluence.doc.lines.paths.length));
  // trace outlines too, then use both: photo word portrait + lines
  await p.evaluate(() => { const c = window.__sungfluence; c.setTool('hand'); c.ui.trace.kind = 'edges'; c.traceNow(); }); await wait(p);
  await p.evaluate(() => { const c = window.__sungfluence; c.applyRecipe(c.RECIPES[0]); c.doc.text.source = 'both'; c.doc.text.layers.push(Object.assign({}, c.doc.text.layers[0], { id: 999, mode: 'paths', text: 'music · memory · rhythm · soul', color: 'ink', inkColor: '#ffffff', fill: 0.9, sizeFrom: 'line', font: 'condensed', weight: 700, upper: true, minSize: 3, maxSize: 200, tracking: 0.06, sep: ' · ' })); c.setView('text'); });
  await p.evaluate(() => document.querySelector('#qualitySeg button:nth-child(2)').click()); await wait(p);
  await p.screenshot({ path: __dirname + '/out/s15-both.png' });
  await p.evaluate(() => window.__sungfluence.setView('mix')); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/out/s16-mix.png' });
  // phone
  const ph = await b.newPage({ viewport: { width: 400, height: 860 }, colorScheme: 'dark' });
  ph.on('pageerror', e => errs.push('phone: ' + e.message));
  await ph.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await ph.goto(require('url').pathToFileURL(require('path').resolve(__dirname, '../src/index.html')).href); await ph.waitForTimeout(2500);
  console.log('phone overflow', await ph.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  await ph.screenshot({ path: __dirname + '/out/s17-phone.png', fullPage: false });
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
