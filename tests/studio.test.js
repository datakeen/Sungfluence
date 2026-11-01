// Checks the studio features: smooth zoom, panels that stay put while zoomed, layer eyes and order,
// the compare divider, crop, rotate with undo, objects, step and repeat, artboards and the new exports.
// Fails with exit code 1 if a check fails. Screenshots go to tests/out/.
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('./browser');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(300); };
let failed = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!ok) failed++; };

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  const S = (f, a) => p.evaluate(f, a);
  check('app is named SungFluence', (await p.title()) === 'SungFluence', await p.title());
  check('both spellings of the plugin name work', await S(() => window.SungFluence === window.Sungfluence));

  await p.setInputFiles('#fileInput', __dirname + '/images/portrait.jpg'); await p.waitForTimeout(1200);

  // zoom: one mouse wheel notch is a gentle step, many small trackpad steps add up smoothly
  const box = await p.locator('#canvasWrap').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const z0 = await S(() => window.__sungfluence.displayZoom());
  await p.keyboard.down('Control'); await p.mouse.wheel(0, -100); await p.keyboard.up('Control');
  await p.waitForTimeout(400);
  const z1 = await S(() => window.__sungfluence.displayZoom());
  check('one wheel notch zooms in a little', z1 / z0 > 1.1 && z1 / z0 < 1.4, (z1 / z0).toFixed(2));
  await p.keyboard.down('Control'); for (let i = 0; i < 20; i++) await p.mouse.wheel(0, -4); await p.keyboard.up('Control');
  await p.waitForTimeout(400);
  const z2 = await S(() => window.__sungfluence.displayZoom());
  check('small trackpad steps zoom in proportion', z2 / z1 > 1.1 && z2 / z1 < 1.4, (z2 / z1).toFixed(2));
  await S(() => { window.__sungfluence.prefs.zoomSpeed = 2; });
  const z3a = await S(() => window.__sungfluence.displayZoom());
  await p.keyboard.down('Control'); await p.mouse.wheel(0, -100); await p.keyboard.up('Control'); await p.waitForTimeout(400);
  const z3 = await S(() => window.__sungfluence.displayZoom());
  check('zoom speed setting changes the step', z3 / z3a > (z1 / z0) * 1.15, (z3 / z3a).toFixed(2));
  await S(() => { window.__sungfluence.prefs.zoomSpeed = 1; window.__sungfluence.setZoom(3); });
  await p.waitForTimeout(200);
  check('the Turn this into text art card stays visible when zoomed in', await S(() => { const c = document.getElementById('cta'); const r = c.getBoundingClientRect(); return !c.hidden && r.top > 0 && r.bottom < innerHeight; }));
  await p.screenshot({ path: __dirname + '/out/st1-zoomed-cta.png' });
  await S(() => window.__sungfluence.setZoom('fit'));

  // layer eyes decide what shows
  await S(() => window.__sungfluence.applyTextArt()); await wait(p);
  const centerPx = () => S(() => { const c = window.__sungfluence.canvas; const d = c.getContext('2d').getImageData(c.width >> 1, Math.round(c.height * 0.45), 1, 1).data; return [d[0], d[1], d[2]]; });
  await S(() => { const c = window.__sungfluence; c.setView('text'); });
  await p.click('#stack .stack-row[data-id="text"] .icon-btn'); // hide text art
  await p.click('#stack .stack-row[data-id="photo"] .icon-btn'); // show photo
  await p.waitForTimeout(200);
  const px = await centerPx();
  check('hiding text art and showing the photo shows the photo', px[0] > 150 && px[1] > 100, px.join(','));
  await p.screenshot({ path: __dirname + '/out/st2-photo-shown.png' });

  // layer order: photo above text art, with a removed area, shows the text through the hole
  await S(() => { const c = window.__sungfluence; c.setView('mix'); c.lockText(true); c.moveLayerTo('photo', 0); });
  check('photo moved to the top of the stack', (await S(() => window.__sungfluence.doc.order.join(','))) === 'photo,text,lines');
  check('text art can be locked', await S(() => window.__sungfluence.doc.text.locked));
  await S(() => { const c = window.__sungfluence; c.moveLayerTo('text', 0); c.lockText(false); });

  // compare divider
  await S(() => window.__sungfluence.toggleSplit(true)); await p.waitForTimeout(200);
  check('compare divider shows', await S(() => !document.getElementById('splitH').hidden && !document.getElementById('splitBar').hidden));
  await p.screenshot({ path: __dirname + '/out/st3-compare.png' });
  await S(() => window.__sungfluence.toggleSplit(false));

  // crop on the canvas
  await S(() => window.__sungfluence.setTool('crop')); await p.waitForTimeout(200);
  await S(() => window.__sungfluence.setCropRatio('1:1')); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/out/st4-crop-box.png' });
  const fr = await p.locator('#art').boundingBox();
  await p.mouse.move(fr.x + fr.width - 2, fr.y + fr.height / 2); // nothing should break when dragging the right edge
  await S(() => window.__sungfluence.cropApply()); await wait(p);
  const crop = await S(() => window.__sungfluence.doc.photo.crop);
  const [iw, ih] = await S(() => window.__sungfluence.imgSize);
  check('1:1 crop is square in pixels', crop && Math.abs(crop.w * iw - crop.h * ih) < 2, crop && Math.round(crop.w * iw) + 'x' + Math.round(crop.h * ih));

  // rotate, then undo brings the old photo back
  await S(() => window.__sungfluence.rotateImage(1)); await wait(p);
  const r1 = await S(() => window.__sungfluence.imgSize);
  check('rotate turns the photo', r1[0] === ih && r1[1] === iw, r1.join('x'));
  await S(() => window.__sungfluence.undo()); await wait(p);
  const r2 = await S(() => window.__sungfluence.imgSize);
  check('undo brings back the unrotated photo', r2[0] === iw && r2[1] === ih, r2.join('x'));

  // objects and step and repeat
  await S(() => { const c = window.__sungfluence; c.ui.objLayer = 'lines'; c.quickAdd('star'); c.setTool('select'); c.ui.rep.mode = 'line'; c.ui.rep.count = 4; c.ui.rep.dx = 60; c.ui.rep.dy = 0; c.stepRepeat(); });
  await wait(p);
  check('step and repeat makes copies', (await S(() => window.__sungfluence.doc.objects.length)) === 5);
  await S(() => { const c = window.__sungfluence; c.ui.objLayer = 'photo'; c.quickAdd('rect'); });
  await wait(p);
  check('a shape can sit on the photo layer', await S(() => window.__sungfluence.doc.objects.some((o) => o.layer === 'photo')));
  const svg = await S(() => window.__sungfluence.vectorSVG());
  check('vector SVG holds the stars', (svg.match(/<polygon/g) || []).length === 5);
  await p.screenshot({ path: __dirname + '/out/st5-objects.png' });

  // exports of the visible layers
  const dl = p.waitForEvent('download', { timeout: 60000 });
  await S(() => window.__sungfluence.flatPNG(null, '-view'));
  const d = await dl;
  check('PNG of the visible layers downloads', /-view\.png$/.test(d.suggestedFilename()), d.suggestedFilename());

  // blank artboard
  await S(() => window.__sungfluence.createArtboard({ name: 'Square', w: 2000, h: 2000, unit: 'px', dpi: 300, cell: 24, bg: '#ffffff' })); await p.waitForTimeout(1500);
  check('blank square artboard', (await S(() => window.__sungfluence.doc.out.width)) === 2000 && (await S(() => window.__sungfluence.imgSize.join('x'))) === '2000x2000');
  await S(() => { const c = window.__sungfluence; c.ui.objLayer = 'photo'; c.quickAdd('text'); });
  await p.keyboard.press('Escape'); await wait(p);
  await p.screenshot({ path: __dirname + '/out/st6-artboard.png' });

  check('no page errors', !errs.length, JSON.stringify(errs));
  await b.close();
  if (failed) { console.log(failed + ' check(s) failed'); process.exit(1); }
  console.log('all studio checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
