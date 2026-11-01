// Checks release 3.2: the command list, the menu bar, the command palette, keyboard shortcuts and snapping.
// Fails with exit code 1 if a check fails. Screenshots go to tests/out/.
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('./browser');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(250); };
let failed = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!ok) failed++; };

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sungfluence-prefs-v1', JSON.stringify({ welcomed: true })); } catch (e) { /* ignore */ } });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000);
  const S = (f, a) => p.evaluate(f, a);
  await p.setInputFiles('#fileInput', __dirname + '/images/portrait.jpg'); await p.waitForTimeout(1200);
  const size = () => S(() => window.__sungfluence.imgSize.join('x'));

  // ---- menu bar ----
  check('the web version shows a menu bar', await S(() => !document.getElementById('menubar').hidden && document.querySelectorAll('#menubar > button').length === 9));
  const before = await size();
  await p.click('#menubar > button:has-text("Image")');
  await p.waitForTimeout(150);
  await p.screenshot({ path: __dirname + '/out/cm1-image-menu.png' });
  await p.click('.dropmenu .mi:has-text("Rotate left")'); await wait(p);
  const turned = await size();
  check('Image > Rotate left turns the photo', turned === before.split('x').reverse().join('x'), before + ' to ' + turned);
  await p.click('#menubar > button:has-text("View")'); await p.waitForTimeout(100);
  await p.hover('.dropmenu .mi:has-text("Snapping")'); await p.waitForTimeout(150);
  check('submenus open on hover', await S(() => document.querySelectorAll('.dropmenu').length === 2 && /Intersections/.test(document.querySelectorAll('.dropmenu')[1].textContent)));
  await p.screenshot({ path: __dirname + '/out/cm2-snapping-menu.png' });
  await p.keyboard.press('Escape');
  check('Escape closes the menus', await S(() => !document.querySelector('.dropmenu')));
  await p.click('#menubar > button:has-text("Export")'); await p.waitForTimeout(100);
  check('the Export menu lists the formats', await S(() => /SVG with live text/.test(document.querySelector('.dropmenu').textContent)));
  await p.keyboard.press('Escape');

  // ---- command palette ----
  await p.keyboard.press('Control+k'); await p.waitForTimeout(150);
  check('Ctrl K opens the command palette', await S(() => !!document.getElementById('palette')));
  await p.keyboard.type('rotate right'); await p.waitForTimeout(100);
  await p.screenshot({ path: __dirname + '/out/cm3-palette.png' });
  await p.keyboard.press('Enter'); await wait(p);
  check('the palette runs a command', (await size()) === before, await size());
  await p.keyboard.press('Control+k'); await p.keyboard.type('calligram'); await p.keyboard.press('Enter'); await wait(p);
  check('the palette finds styles too', await S(() => window.__sungfluence.doc.text.applied && window.__sungfluence.curLayer().mode === 'calligram'));

  // ---- keys ----
  await S(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('p'); await p.waitForTimeout(100);
  check('P picks the pen (a command now)', await S(() => window.__sungfluence.ui.tool === 'pen'));
  await p.keyboard.press('1'); await p.waitForTimeout(150);
  check('1 shows the photo view', await S(() => window.__sungfluence.ui.view === 'photo'));
  const chooser = p.waitForEvent('filechooser', { timeout: 3000 }).then(() => true).catch(() => false);
  await p.keyboard.press('Control+o');
  check('Ctrl O opens the file picker', await chooser);
  await S(() => { const t = document.createElement('input'); t.id = 'typeHere'; document.body.appendChild(t); t.focus(); });
  await p.keyboard.press('v'); await p.waitForTimeout(100);
  check('letters typed in a text box do not switch tools', await S(() => window.__sungfluence.ui.tool === 'pen' && document.getElementById('typeHere').value === 'v'));
  await S(() => document.getElementById('typeHere').remove());

  // ---- snapping ----
  // two lines: one across, one down; they cross at (0.6 W, 0.3 H)
  const geo = await S(() => {
    const A = window.__sungfluence, [w, h] = A.imgSize, n = (x, y) => ({ x, y, ix: 0, iy: 0, ox: 0, oy: 0 });
    A.doc.lines.paths.push({ id: 9001, closed: false, width: 6, text: '', traced: false, nodes: [n(w * 0.2, h * 0.3), n(w * 0.8, h * 0.3)] });
    A.doc.lines.paths.push({ id: 9002, closed: false, width: 6, text: '', traced: false, nodes: [n(w * 0.6, h * 0.1), n(w * 0.6, h * 0.5)] });
    A.doc.lines.visible = true; A.linesChanged(); A.setTool('pen'); A.setView('photo');
    return { w, h };
  });
  const scr = (x, y) => S(([a, c]) => window.__sungfluence.toScreen(a, c), [x, y]);
  const clickAt = async (x, y, dx, dy, mods) => { const q = await scr(x, y); if (mods) await p.keyboard.down(mods); await p.mouse.click(q[0] + dx, q[1] + dy); if (mods) await p.keyboard.up(mods); await p.waitForTimeout(80); };
  const lastNode = () => S(() => { const P = window.__sungfluence.pen; const n = P.nodes[P.nodes.length - 1]; return [n.x, n.y]; });
  const near = (a, b, t) => Math.abs(a[0] - b[0]) < (t || 0.01) && Math.abs(a[1] - b[1]) < (t || 0.01);
  await clickAt(geo.w * 0.8, geo.h * 0.3, 4, -3);
  check('the pen snaps to an end point', near(await lastNode(), [geo.w * 0.8, geo.h * 0.3]), (await lastNode()).map(Math.round).join(','));
  await clickAt(geo.w * 0.6, geo.h * 0.3, 3, 4);
  check('the pen snaps to an intersection', near(await lastNode(), [geo.w * 0.6, geo.h * 0.3]), (await lastNode()).map(Math.round).join(','));
  await clickAt(geo.w * 0.4, geo.h * 0.3, -2, 3);
  check('the pen snaps to a mid point', near(await lastNode(), [geo.w * 0.5, geo.h * 0.3], geo.w * 0.11) && Math.abs((await lastNode())[1] - geo.h * 0.3) < 0.01);
  const q0 = await scr(geo.w * 0.8, geo.h * 0.3);
  await p.mouse.move(q0[0] + 3, q0[1] + 2); await p.waitForTimeout(100);
  check('hovering shows what it would snap to', await S(() => window.__sungfluence.snapHint && window.__sungfluence.snapHint.kind === 'end'));
  await p.screenshot({ path: __dirname + '/out/cm4-snap-hint.png' });
  await clickAt(geo.w * 0.6, geo.h * 0.1, 4, -3, 'Alt');
  check('Alt places the point freely', !near(await lastNode(), [geo.w * 0.6, geo.h * 0.1], 0.5));
  await p.keyboard.press('Enter');
  // extension: past the end of the line across, on its line
  await clickAt(geo.w * 0.9, geo.h * 0.3, 0, 3);
  check('the pen snaps to the extension of a line', Math.abs((await lastNode())[1] - geo.h * 0.3) < 0.01);
  await p.keyboard.press('Escape');

  // grid: only the grid
  await S(() => { const sn = window.__sungfluence.prefs.snap; Object.keys(sn).forEach((k) => { if (k !== 'on') sn[k] = false; }); sn.grid = true; });
  await clickAt(geo.w * 0.33, geo.h * 0.77, 0, 0);
  const gs = await S(() => window.__sungfluence.gridSize());
  const gn = await lastNode();
  check('the grid snaps points to its lines', Math.abs(gn[0] / gs - Math.round(gn[0] / gs)) < 1e-6 && Math.abs(gn[1] / gs - Math.round(gn[1] / gs)) < 1e-6, gn.map(Math.round).join(',') + ' grid ' + gs);
  await p.keyboard.press('Escape');
  await S(() => { const sn = window.__sungfluence.prefs.snap; Object.keys(sn).forEach((k) => { sn[k] = true; }); sn.edge = false; sn.grid = false; });

  // moving a shape: its center snaps to the center of the artboard
  await S(() => { const A = window.__sungfluence, [w, h] = A.imgSize; A.doc.lines.paths = A.doc.lines.paths.filter((q) => q.id < 9000); A.linesChanged(); A.quickAdd('rect'); const o = A.selectedObjs()[0]; o.x = w * 0.1; o.y = h * 0.1; A.compose(); });
  const o0 = await S(() => { const o = window.__sungfluence.selectedObjs()[0]; return [o.x + o.w / 2, o.y + o.h / 2]; });
  const from = await scr(o0[0], o0[1]), to = await scr(geo.w / 2, geo.h / 2);
  await p.mouse.move(from[0], from[1]); await p.mouse.down(); await p.mouse.move(to[0] + 4, to[1] - 3, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
  const oc = await S(() => { const o = window.__sungfluence.selectedObjs()[0]; return [o.x + o.w / 2, o.y + o.h / 2]; });
  check('a moved shape snaps its center to the artboard center', near(oc, [geo.w / 2, geo.h / 2], 0.01), oc.map(Math.round).join(','));

  check('every command has a label and a function', await S(() => Array.from(window.__sungfluence.COMMANDS.values()).every((c) => c.label && typeof c.run === 'function')));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(failed ? failed + ' check(s) failed' : 'all command and snapping checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
