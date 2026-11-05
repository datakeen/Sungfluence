// Output panel and previews: paper and shirt colors, zoom and compare on the Paper and T-shirt previews,
// print sizes, page, angle and dpi, JPG export, and the Liquify tool.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const fs = require('fs'), path = require('path');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(300); };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => window.__sungfluence.useSample('lines')); await p.waitForTimeout(1200);
  await A(() => { const S = window.__sungfluence; S.applyRecipe(S.RECIPES.find((r) => r.name === 'Engraving')); }); await wait(p);
  const outTab = () => A(() => { window.__sungfluence.ui.tab = 'output'; window.__sungfluence.buildPanel(); });
  const panelText = () => A(() => document.getElementById('panel').textContent);
  const center = () => A(() => { const c = document.getElementById('art'), r = c.getBoundingClientRect(), x = c.getContext('2d').getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data; return { w: Math.round(r.width), a: x[3] }; });

  // labels follow the preview
  await outTab();
  check(/Paper color \(background\)/.test(await panelText()), 'artboard: section is called Paper color (background)');
  await A(() => { const S = window.__sungfluence; S.doc.out.mock = 'shirt'; S.doc.out.shirt = S.doc.out.paper; S.buildPanel(); S.compose(); });
  check(/T-shirt color \(background\)/.test(await panelText()), 'T-shirt preview: section is called T-shirt color (background)');
  await A(() => { const S = window.__sungfluence; S.doc.out.transparent = true; S.buildPanel(); });
  const tnote = await panelText();
  check(/JPG cannot be transparent/.test(tnote) && /PNG, SVG, PDF and the text outputs/.test(tnote), 'transparent note names the formats and what JPG does');

  // zoom works on the T-shirt preview
  const z0 = await center();
  const dis = await A(() => ['zoomIn', 'zoomOut', 'zoomFit', 'zoomPct'].map((id) => document.getElementById(id).disabled));
  check(dis.every((d) => !d), 'zoom buttons are enabled on the T-shirt preview');
  await p.click('#zoomIn'); await p.waitForTimeout(500);
  const z1 = await center();
  check(z1.w > z0.w * 1.1, 'zoom in on the T-shirt: art grew from ' + z0.w + ' to ' + z1.w + ' px');
  await p.click('#zoomFit'); await p.waitForTimeout(400);
  check(Math.abs((await center()).w - z0.w) < 3, 'Fit returns to the start size');
  // compare works on the T-shirt preview
  await A(() => window.__sungfluence.toggleSplit(true)); await p.waitForTimeout(300);
  check(await A(() => !document.getElementById('splitH').hidden), 'compare divider shows on the T-shirt preview');
  await p.screenshot({ path: __dirname + '/out/o1-shirt-compare.png' });
  await A(() => window.__sungfluence.toggleSplit(false));

  // black paper shows on the Paper preview, even with a transparent background
  await A(() => { const S = window.__sungfluence; S.doc.out.mock = 'paper'; S.doc.out.paper = '#111113'; S.buildPanel(); S.scheduleText(0); S.compose(); }); await wait(p);
  const sheet = await A(() => getComputedStyle(document.getElementById('frame')).backgroundColor);
  check(sheet === 'rgb(17, 17, 19)', 'Paper preview shows the black paper: ' + sheet);
  await A(() => { const S = window.__sungfluence; S.doc.out.paper = '#f3efe6'; S.curLayer().inkColor = '#14213d'; S.buildPanel(); });
  await p.click('button[aria-label="Black paper"]'); await wait(p);
  const ink = await A(() => window.__sungfluence.curLayer().inkColor);
  check(ink === '#f2efe6' && /so it shows on this paper/.test(await A(() => document.getElementById('toast').textContent)), 'black paper turns navy ink light, and says so: ' + ink);
  await p.screenshot({ path: __dirname + '/out/o2-paper-black.png' });
  await p.click('#zoomIn'); await p.waitForTimeout(400);
  check((await A(() => document.getElementById('zoomPct').textContent)).includes('%'), 'zoom works on the Paper preview');
  await p.click('#zoomFit');

  // print sizes, page, angle and dpi
  const sizes = await A(() => document.querySelectorAll('#c-print option').length);
  check(sizes >= 30, sizes + ' print sizes in the list');
  await A(() => { const S = window.__sungfluence, o = S.doc.out; o.print = 'Custom size'; o.printW = 500; o.printH = 200; o.orient = 'portrait'; o.dpi = 240; o.printRot = 0; S.buildPanel(); });
  let g = await A(() => window.__sungfluence.printGeom());
  check(g.pw === 200 && g.ph === 500 && g.realDpi === 240, 'custom 500 × 200 mm, portrait, 240 dpi: page ' + g.pw + ' × ' + g.ph);
  await A(() => { const S = window.__sungfluence, o = S.doc.out; o.print = 'A4'; o.orient = 'auto'; o.printRot = 45; S.buildPanel(); S.compose(); });
  g = await A(() => window.__sungfluence.printGeom());
  const diag = (g.aw * Math.SQRT1_2 + g.ah * Math.SQRT1_2);
  check(diag <= Math.min(g.pw, g.ph) - 2 * g.m + 0.5, 'art turned 45° fits on A4 inside the margins');
  check(await A(() => /rotate\(45deg\)/.test(document.getElementById('art').style.transform)), 'Paper preview shows the turned art');
  await p.screenshot({ path: __dirname + '/out/o3-paper-turned.png' });
  await A(() => { const S = window.__sungfluence, o = S.doc.out; o.print = 'A0'; o.dpi = 600; o.printRot = 0; S.buildPanel(); });
  g = await A(() => window.__sungfluence.printGeom());
  check(g.capped && g.needPx <= 9000 && /largest SungFluence draws/.test(await panelText()), 'A0 at 600 dpi warns that the export is limited, real dpi ' + g.realDpi);
  check(/Which dpi should I use/.test(await panelText()), 'dpi help button is there');

  // a turned PDF and a JPG
  await A(() => { const S = window.__sungfluence, o = S.doc.out; o.print = 'A5'; o.dpi = 150; o.printRot = 90; o.transparent = false; o.mock = 'artboard'; S.buildPanel(); S.compose(); });
  const grab = async (id, opts) => {
    const dl = p.waitForEvent('download', { timeout: 90000 });
    await A(([id, opts]) => { const S = window.__sungfluence, x = S.EXPORTERS.find((e) => e.id === id); S.runExporter(x, Object.assign(S.exporterOpts(x), opts || {})); }, [id, opts]);
    const d = await dl; const f = path.join(__dirname, 'out', 'out-' + d.suggestedFilename()); await d.saveAs(f); return f;
  };
  let f = await grab('pdf-print');
  check(fs.readFileSync(f).slice(0, 4).toString() === '%PDF', 'PDF for print with the art turned 90°');
  f = await grab('jpg-view', { quality: 0.85 });
  const jb = fs.readFileSync(f);
  check(jb[0] === 0xFF && jb[1] === 0xD8 && /\.jpg$/.test(f), 'JPG export (' + Math.round(jb.length / 1024) + ' KB)');

  // Liquify: a stroke changes the photo, undo brings it back
  await A(() => { const S = window.__sungfluence; S.setView('photo'); S.setTool('liquify'); S.ui.liquify.mode = 'bloat'; S.ui.liquify.size = 240; S.ui.liquify.strength = 1; }); await p.waitForTimeout(300);
  const snap = () => A(() => { const c = document.getElementById('art'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; });
  const before = await snap();
  const box = await p.locator('#art').boundingBox();
  await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await p.mouse.down(); await p.waitForTimeout(500);
  await p.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.52, { steps: 6 });
  await p.mouse.up(); await wait(p);
  const after = await snap();
  const strokes = await A(() => (window.__sungfluence.doc.photo.liquify || []).length);
  check(strokes === 1 && after !== before, 'Liquify bloat changed the photo (' + strokes + ' stroke)');
  await p.screenshot({ path: __dirname + '/out/o4-liquify.png' });
  await A(() => { window.__sungfluence.ui.liquify.mode = 'push'; });
  await p.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3); await p.mouse.down();
  await p.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.35, { steps: 10 }); await p.mouse.up(); await wait(p);
  check(await A(() => window.__sungfluence.doc.photo.liquify.length) === 2, 'Liquify push adds a second stroke');
  await A(() => window.__sungfluence.undo()); await wait(p);
  await A(() => window.__sungfluence.undo()); await wait(p);
  check(await A(() => (window.__sungfluence.doc.photo.liquify || []).length) === 0 && (await snap()) === before, 'undo removes both strokes and restores the photo');
  await A(() => window.__sungfluence.redo()); await wait(p);
  check((await snap()) === after, 'redo brings the same result back (the field is rebuilt the same way)');

  // long tasks while painting
  await A(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); window.__sungfluence.ui.liquify.mode = 'twirlR'; });
  await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6); await p.mouse.down();
  await p.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 20 }); await p.mouse.up();
  const lt = await A(() => window.__lt.sort((a, b) => b - a).slice(0, 3));
  console.log('     longest tasks while painting (ms):', lt.join(', ') || 'none');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' output checks failed' : 'all output checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
