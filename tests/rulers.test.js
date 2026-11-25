// Rulers and guides: View > Rulers (Ctrl R), ticks that follow the zoom, guides pulled from the rulers, moved,
// typed in and dragged back to delete, snapping to guides, guides saved in the project and in undo,
// guides kept out of exports, and no long tasks while the rulers follow the pointer and the zoom.
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('./browser');
const SRC = path.resolve(__dirname, '../src/index.html');
const OUT = process.env.RULERS_OUT || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(250); };
let failed = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!ok) failed++; };
const LIMIT = 220;
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', deviceScaleFactor: 2 });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sungfluence-prefs-v1', JSON.stringify({ welcomed: true })); localStorage.removeItem('sungfluence-session-v3'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* ignore */ } });
  await p.goto(require('url').pathToFileURL(SRC).href);
  await p.waitForTimeout(2000); await wait(p);
  const S = (f, a) => p.evaluate(f, a);
  const scr = (x, y) => S(([x, y]) => window.__sungfluence.toScreen(x, y), [x, y]);
  await S(() => { const t = document.getElementById('typeHere'); if (t) t.remove(); window.__sungfluence.setView('photo'); window.__sungfluence.setTool('select'); });
  const [w, h] = await S(() => window.__sungfluence.imgSize);

  // ---- the shortcut and the toggle ----
  const keys = await S(() => { const all = []; window.__sungfluence.COMMANDS.forEach((c) => c.keys.forEach((k) => all.push(k))); return all; });
  check('Ctrl R belongs to one command only', keys.filter((k) => k === 'mod+r').length === 1);
  check('rulers start hidden', await S(() => document.getElementById('rulers').hidden));
  await p.mouse.click(700, 500); await p.keyboard.press('Control+r'); await p.waitForTimeout(200);
  const on = await S(() => ({ shown: !document.getElementById('rulers').hidden, cls: document.getElementById('viewport').classList.contains('has-rulers'), pref: JSON.parse(localStorage.getItem('sungfluence-prefs-v1')).rulers, top: document.getElementById('canvasWrap').getBoundingClientRect().top - document.getElementById('viewport').getBoundingClientRect().top, cw: document.getElementById('rulerH').width, css: document.getElementById('rulerH').getBoundingClientRect().width }));
  check('Ctrl R shows the rulers and the stage moves in to make room', on.shown && on.cls && on.top === 20, JSON.stringify(on));
  check('the choice is kept in the settings', on.pref === true);
  check('the rulers are drawn sharp on a high-DPI screen', Math.abs(on.cw - on.css * 2) <= 1, on.cw + ' for ' + on.css + ' css px');
  check('View > Rulers shows a check', await S(() => window.__sungfluence.COMMANDS.get('view.rulers').checked()));

  // ---- the ruler matches the artboard and follows the zoom ----
  const m = await S(() => { const A = window.__sungfluence, M = A.rulerMap(), r = A.canvas.getBoundingClientRect(); return { ox: M.ox, left: r.left, s: M.s, w: r.width, TW: M.G1.TW }; });
  check('0 on the ruler is the left edge of the artboard', Math.abs(m.ox - m.left) < 0.01 && Math.abs(m.s * m.TW - m.w) < 0.01);
  const steps = [];
  for (const z of [0.1, 0.5, 1, 4, 16]) {
    await S((z) => window.__sungfluence.setZoom(z), z); await p.waitForTimeout(60);
    steps.push(await S(() => { const A = window.__sungfluence, M = A.rulerMap(); return A.rulerStep(M.s * A.unitPx()); }));
  }
  check('the numbered ticks get closer together as you zoom in', steps.every((st, i) => !i || st.step < steps[i - 1].step), steps.map((q) => q.step).join(', '));
  check('the steps are nice numbers (1, 2, 5, 10, 25, 50, 100...)', steps.every((q) => [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000].includes(q.step)), steps.map((q) => q.step).join(', '));
  // scroll: the ruler follows
  await S(() => window.__sungfluence.setZoom(2)); await p.waitForTimeout(100);
  const before = await S(() => window.__sungfluence.rulerMap().ox);
  await S(() => { document.getElementById('canvasWrap').scrollLeft += 150; }); await p.waitForTimeout(100);
  const after = await S(() => window.__sungfluence.rulerMap().ox);
  check('scrolling moves the ruler with the art', Math.abs(before - after - 150) < 2, (before - after).toFixed(1));
  const pix = await S(() => { const c = document.getElementById('rulerH'); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 0 && v < 160); });
  check('the top ruler has ticks drawn on it', pix);
  await S(() => window.__sungfluence.zoomTo('fit')); await p.waitForTimeout(400);

  // ---- a guide from the top ruler ----
  const hr = await S(() => { const r = document.getElementById('rulerH').getBoundingClientRect(); return [r.left + 300, r.top + 10]; });
  const y40 = await scr(w * 0.5, h * 0.4);
  await p.mouse.move(hr[0], hr[1]); await p.mouse.down(); await p.mouse.move(y40[0] - 100, y40[1], { steps: 10 }); await p.waitForTimeout(80);
  check('while pulling, the guide shows on the overlay with its place', await S(() => /<text[^>]*>Y /.test(document.getElementById('overlay').innerHTML)));
  await p.screenshot({ path: path.join(OUT, 'rulers-pull.png') });
  await p.mouse.up(); await p.waitForTimeout(100);
  let G = await S(() => window.__sungfluence.doc.guides.map((q) => ({ axis: q.axis, at: q.at, id: q.id })));
  check('dragging down from the top ruler makes a horizontal guide', G.length === 1 && G[0].axis === 'y' && Math.abs(G[0].at - h * 0.4) < h * 0.01, JSON.stringify(G));
  // the left ruler, and Alt swaps
  const vr = await S(() => { const r = document.getElementById('rulerV').getBoundingClientRect(); return [r.left + 10, r.top + 200]; });
  const x30 = await scr(w * 0.3, h * 0.7);
  await p.mouse.move(vr[0], vr[1]); await p.mouse.down(); await p.mouse.move(x30[0], x30[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100);
  await p.keyboard.down('Alt'); await p.mouse.move(hr[0] + 200, hr[1]); await p.mouse.down(); const x60 = await scr(w * 0.6, h * 0.7); await p.mouse.move(x60[0], x60[1], { steps: 8 }); await p.mouse.up(); await p.keyboard.up('Alt'); await p.waitForTimeout(100);
  G = await S(() => window.__sungfluence.doc.guides.map((q) => ({ axis: q.axis, at: q.at, id: q.id })));
  check('dragging right from the left ruler makes a vertical guide', G[1] && G[1].axis === 'x' && Math.abs(G[1].at - w * 0.3) < w * 0.01, JSON.stringify(G[1]));
  check('Alt-drag from the top ruler makes a vertical guide', G[2] && G[2].axis === 'x' && Math.abs(G[2].at - w * 0.6) < w * 0.01, JSON.stringify(G[2]));
  // a pull that ends on the ruler makes nothing
  await p.mouse.move(hr[0] + 400, hr[1]); await p.mouse.down(); await p.mouse.move(hr[0] + 420, hr[1] + 4, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(80);
  check('letting go on the ruler makes no guide', await S(() => window.__sungfluence.doc.guides.length) === 3);

  // ---- undo ----
  await S(() => window.__sungfluence.undo()); await p.waitForTimeout(100);
  const afterUndo = await S(() => window.__sungfluence.doc.guides.length);
  await S(() => window.__sungfluence.redo()); await p.waitForTimeout(100);
  check('undo takes a guide away and redo brings it back', afterUndo < 3 && await S(() => window.__sungfluence.doc.guides.length) === 3, afterUndo);

  // ---- moving a guide with the Select tool, snapping to the artboard center ----
  const gy = await scr(w * 0.5, h * 0.4), mid = await scr(w * 0.5, h * 0.5);
  await p.mouse.move(gy[0] - 200, gy[1]); await p.waitForTimeout(60);
  check('hovering a guide shows a cursor to move it', await S(() => document.getElementById('canvasWrap').style.cursor) === 'row-resize');
  await p.mouse.down(); await p.mouse.move(mid[0] - 200, mid[1] + 3, { steps: 8 }); await p.waitForTimeout(40);
  const hint = await S(() => window.__sungfluence.snapHint);
  await p.mouse.up(); await p.waitForTimeout(100);
  G = await S(() => window.__sungfluence.doc.guides.map((q) => ({ axis: q.axis, at: q.at })));
  check('a dragged guide moves and snaps to the artboard center', Math.abs(G[0].at - h * 0.5) < 1e-6, G[0].at.toFixed(2) + ' ' + JSON.stringify(hint));
  check('the snap hint shows while a guide is dragged', hint && /center/.test(hint.label || hint.kind), JSON.stringify(hint));

  // ---- typing an exact place ----
  const gx = await scr(w * 0.3, h * 0.2);
  await p.mouse.dblclick(gx[0], gx[1]); await p.waitForTimeout(150);
  const dlg = await S(() => !document.getElementById('dlgScrim').hidden && document.getElementById('dlgTitle').textContent);
  check('double-clicking a guide opens a box to type its place', dlg === 'Vertical guide', dlg);
  await p.keyboard.press('Control+a'); await p.keyboard.type('400'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  const typed = await S(() => { const A = window.__sungfluence, q = A.doc.guides.find((g) => g.axis === 'x'); return A.guideOut(q); });
  check('the typed place is in ruler units from the artboard edge', Math.abs(typed - 400) < 1e-6, typed);

  // ---- snapping to guides ----
  const k = await S(() => window.__sungfluence.canvas.getBoundingClientRect().width / window.__sungfluence.canvas.width);
  const gxImg = await S(() => window.__sungfluence.doc.guides.find((g) => g.axis === 'x').at);
  const snap = (x, y, o) => S(([x, y, o, k]) => { const A = window.__sungfluence; const r = A.snapAt(x, y, Object.assign({ p: { k }, noTrack: true }, o || {})); return { r, h: A.snapHint }; }, [x, y, o || {}, k]);
  let s = await snap(gxImg + 3, h * 0.27);
  check('a point near a guide lands on it', s.h && s.h.kind === 'guide' && Math.abs(s.r[0] - gxImg) < 1e-6, JSON.stringify(s.h));
  s = await snap(gxImg - 2, h * 0.5 + 3);
  check('where two guides cross, points snap to the crossing', s.h && s.h.kind === 'gcross' && Math.abs(s.r[0] - gxImg) < 1e-6 && Math.abs(s.r[1] - h * 0.5) < 1e-6, JSON.stringify(s.h));
  await S(() => window.__sungfluence.runCommand('snap.rulerGuides'));
  s = await snap(gxImg + 3, h * 0.27);
  check('the guides snap can be turned off in the snap menu', !s.h || s.h.kind !== 'guide', JSON.stringify(s.h));
  await S(() => window.__sungfluence.runCommand('snap.rulerGuides'));
  // a rectangle drawn with the Shape tool starts on a guide
  await S(() => { window.__sungfluence.setTool('shape'); window.__sungfluence.ui.shape.kind = 'rect'; });
  const r0 = await scr(gxImg + 2, h * 0.62), r1 = await scr(gxImg + w * 0.15, h * 0.8);
  await p.mouse.move(r0[0], r0[1]); await p.mouse.down(); await p.mouse.move(r1[0], r1[1], { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
  const rect = await S(() => { const o = window.__sungfluence.doc.objects[window.__sungfluence.doc.objects.length - 1]; return o && { x: o.x, w: o.w }; });
  check('a shape drawn next to a guide starts on it', rect && Math.abs(rect.x - gxImg) < 0.01, JSON.stringify(rect) + ' guide ' + gxImg.toFixed(2));
  await S(() => window.__sungfluence.setTool('select'));

  // ---- a shape on a guide comes first: its handles and its edge move the shape, not the guide ----
  const objOf = () => S(() => { const o = window.__sungfluence.doc.objects[window.__sungfluence.doc.objects.length - 1]; return { id: o.id, x: o.x, y: o.y, w: o.w, h: o.h }; });
  const guideX = () => S(() => window.__sungfluence.doc.guides.find((g) => g.axis === 'x').at);
  await p.waitForTimeout(600);
  let o1 = await objOf();
  const inside = await scr(o1.x + o1.w / 2, o1.y + o1.h / 2);
  await p.mouse.click(inside[0], inside[1]); await p.waitForTimeout(100);
  const hdl = await scr(o1.x, o1.y + o1.h / 2);
  await p.mouse.move(hdl[0], hdl[1]); await p.waitForTimeout(60);
  check('over a selected shape\'s handle on a guide, the cursor is the handle\'s', await S(() => document.getElementById('canvasWrap').style.cursor) === 'ew-resize', await S(() => document.getElementById('canvasWrap').style.cursor));
  await p.mouse.down(); await p.mouse.move(hdl[0] - 60, hdl[1], { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(100);
  let o2 = await objOf();
  await p.waitForTimeout(600);
  check('dragging the handle on a guide resizes the shape and leaves the guide', o2.x < o1.x - 1 && o2.w > o1.w + 1 && Math.abs(await guideX() - gxImg) < 1e-6, JSON.stringify(o2));
  await S(() => window.__sungfluence.undo()); await p.waitForTimeout(100);
  await p.keyboard.press('Escape'); await p.waitForTimeout(60);
  o1 = await objOf();
  const edge = await scr(o1.x, o1.y + o1.h * 0.3);
  await p.mouse.move(edge[0], edge[1]); await p.mouse.down(); await p.mouse.move(edge[0] + 50, edge[1], { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(100);
  o2 = await objOf();
  await p.waitForTimeout(600);
  check('pressing a shape\'s edge on a guide moves the shape, not the guide', o2.x > o1.x + 1 && Math.abs(await guideX() - gxImg) < 1e-6, (o2.x - o1.x).toFixed(1));
  await S(() => window.__sungfluence.undo()); await p.waitForTimeout(100);
  await p.keyboard.press('Escape');
  await p.keyboard.down('Control'); await p.mouse.move(edge[0], edge[1] + 1); await p.waitForTimeout(60);
  const ctrlCur = await S(() => document.getElementById('canvasWrap').style.cursor);
  await p.keyboard.up('Control');
  check('with Ctrl held, the guide under a shape can still be picked up', ctrlCur === 'col-resize', ctrlCur);

  // ---- a change waiting for the history is saved before a guide moves ----
  await S(() => { window.__sungfluence.setTool('shape'); window.__sungfluence.ui.shape.kind = 'rect'; });
  const histLen = await S(() => window.__sungfluence.doc.objects.length);
  const q0 = await scr(w * 0.75, h * 0.1), q1 = await scr(w * 0.9, h * 0.25);
  await p.mouse.move(q0[0], q0[1]); await p.mouse.down(); await p.mouse.move(q1[0], q1[1], { steps: 4 }); await p.mouse.up();
  await S(() => window.__sungfluence.setTool('hand'));
  const gsx = await scr(gxImg, h * 0.15), gTo = await scr(gxImg + w * 0.1, h * 0.15);
  await p.mouse.move(gsx[0], gsx[1]); await p.mouse.down();
  for (let i = 1; i <= 12; i++) { await p.mouse.move(gsx[0] + (gTo[0] - gsx[0]) * i / 12, gsx[1]); await p.waitForTimeout(60); }
  await p.mouse.up(); await p.waitForTimeout(100);
  const movedTo = await guideX();
  check('the Hand tool picks up and moves a guide', Math.abs(movedTo - gxImg) > w * 0.05, movedTo.toFixed(1));
  await S(() => window.__sungfluence.undo()); await p.waitForTimeout(100);
  const u1 = { g: await guideX(), n: await S(() => window.__sungfluence.doc.objects.length) };
  await S(() => window.__sungfluence.undo()); await p.waitForTimeout(100);
  const u2 = { g: await guideX(), n: await S(() => window.__sungfluence.doc.objects.length) };
  check('undo after drawing and then quickly moving a guide puts the guide back where it was, and keeps the shape', Math.abs(u1.g - gxImg) < 1e-6 && u1.n === histLen + 1, JSON.stringify(u1));
  check('the next undo takes the shape away and leaves the guide', Math.abs(u2.g - gxImg) < 1e-6 && u2.n === histLen, JSON.stringify(u2));
  await S(() => window.__sungfluence.setTool('select'));

  // ---- a finger gets a wider reach than a mouse ----
  const reach = await S(([x, y]) => { const A = window.__sungfluence; const c = A.canvas.getBoundingClientRect(); const ev = (t) => ({ clientX: x + 9, clientY: y, pointerType: t, ctrlKey: false, metaKey: false }); return { touch: !!A.pickGuide(ev('touch'), A.evPos(ev('touch'))), mouse: !!A.pickGuide(ev('mouse'), A.evPos(ev('mouse'))) }; }, await scr(gxImg, h * 0.1));
  check('a finger 9 px from a guide picks it up; a mouse there does not', reach.touch && !reach.mouse, JSON.stringify(reach));

  // ---- New guide from the View menu, for the keyboard ----
  const nBefore = await S(() => window.__sungfluence.doc.guides.length);
  await S(() => window.__sungfluence.runCommand('view.newGuide')); await p.waitForTimeout(150);
  const nd = await S(() => ({ title: document.getElementById('dlgTitle').textContent, seg: Array.from(document.querySelectorAll('#dlg .seg button')).map((b) => b.textContent), focus: document.activeElement && document.activeElement.closest('.guide-num') !== null }));
  check('View > New guide opens a box with Horizontal and Vertical', nd.title === 'New guide' && nd.seg.join() === 'Horizontal,Vertical' && nd.focus, JSON.stringify(nd));
  await p.screenshot({ path: path.join(OUT, 'rulers-new-guide.png') });
  await p.click('#dlg .seg button:nth-child(2)'); await p.keyboard.press('Control+a'); await p.keyboard.type('300'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  const ng = await S(() => { const A = window.__sungfluence, g = A.doc.guides[A.doc.guides.length - 1]; return { n: A.doc.guides.length, axis: g.axis, out: A.guideOut(g) }; });
  check('typing a place adds a guide there', ng.n === nBefore + 1 && ng.axis === 'x' && Math.abs(ng.out - 300) < 1e-6, JSON.stringify(ng));
  await S(() => window.__sungfluence.undo()); await p.waitForTimeout(100);
  check('undo takes the new guide away', await S(() => window.__sungfluence.doc.guides.length) === nBefore);
  check('the View menu calls it Show rulers, like the corner menu', await S(() => window.__sungfluence.COMMANDS.get('view.rulers').label) === 'Show rulers');
  check('the corner shows the ruler unit', await S(() => document.getElementById('rulerCorner').textContent.trim()) === 'px');
  await p.screenshot({ path: path.join(OUT, 'rulers-guides.png') });

  // ---- not in exports ----
  const exp = await S(() => {
    const A = window.__sungfluence, g = A.artGeom(1), c = document.createElement('canvas'); c.width = g.TW; c.height = g.TH;
    return { svg: /00b4d8|0077b6/i.test(A.vectorSVG()), overlay: /00b4d8/i.test(document.getElementById('overlay').innerHTML) };
  });
  check('guides are on the overlay but not in the SVG export', exp.overlay && !exp.svg);
  const pixDiff = await S(async () => {
    const A = window.__sungfluence, g = A.artGeom(0.25), draw = () => { const c = document.createElement('canvas'); c.width = g.TW; c.height = g.TH; A.composeTo(c.getContext('2d'), g, {}, { ground: 'paper' }); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
    const a = draw(), keep = A.doc.guides.slice(); A.doc.guides.length = 0; const c2 = draw(); keep.forEach((q) => A.doc.guides.push(q));
    let d = 0; for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - c2[i])); return d;
  });
  check('the exported picture is the same with and without guides', pixDiff === 0, pixDiff);

  // ---- saved with the project ----
  const proj = await S(() => JSON.stringify(window.__sungfluence.projectData()));
  const saved = JSON.parse(proj).guides;
  check('guides are saved in the project', Array.isArray(saved) && saved.length === 3, saved && saved.length);
  await S(() => { window.__sungfluence.doc.guides.length = 0; });
  await S((t) => window.__sungfluence.openProject(JSON.parse(t)), proj); await wait(p);
  check('opening the project brings the guides back', await S(() => window.__sungfluence.doc.guides.length) === 3);

  // ---- units ----
  await S(() => window.__sungfluence.runCommand('view.rulerUnit.mm'));
  const mm = await S(() => ({ k: window.__sungfluence.unitPx(), pref: window.__sungfluence.prefs.rulerUnit }));
  check('the ruler can measure in millimeters of the printed size', mm.pref === 'mm' && mm.k > 1, JSON.stringify(mm));
  await p.click('#rulerCorner'); await p.waitForTimeout(100);
  const menu = await S(() => Array.from(document.querySelectorAll('.dropmenu .lb')).map((q) => q.textContent));
  check('the corner holds the units and the guide commands', ['Pixels', 'Millimeters', 'Inches', 'Show guides', 'Lock guides', 'Clear guides'].every((t) => menu.includes(t)), menu.join(' | '));
  await p.screenshot({ path: path.join(OUT, 'rulers-menu.png') });
  await p.keyboard.press('Escape');
  await S(() => window.__sungfluence.runCommand('view.rulerUnit.px'));

  // ---- lock, delete by dragging onto a ruler, clear ----
  await S(() => window.__sungfluence.runCommand('view.lockGuides'));
  const gy2 = await scr(w * 0.2, h * 0.5);
  await p.mouse.move(gy2[0], gy2[1]); await p.waitForTimeout(50);
  check('locked guides do not pick up', await S(() => document.getElementById('canvasWrap').style.cursor) !== 'row-resize');
  await S(() => window.__sungfluence.runCommand('view.lockGuides'));
  const top = await S(() => document.getElementById('rulerH').getBoundingClientRect().top + 8);
  await p.mouse.move(gy2[0], gy2[1]); await p.mouse.down(); await p.mouse.move(gy2[0], top, { steps: 10 }); await p.waitForTimeout(80);
  const delTag = await S(() => { const A = window.__sungfluence, g = A.doc.guides.find((q) => q.axis === 'y'), wr = document.getElementById('canvasWrap').getBoundingClientRect(); return { tag: /Release to delete/.test(document.getElementById('overlay').innerHTML), y: A.toScreen(0, g.at)[1] - wr.top }; });
  check('over a ruler the guide stays at the stage edge and the tag says it will be deleted', delTag.tag && Math.abs(delTag.y) < 5, JSON.stringify(delTag));
  await p.screenshot({ path: path.join(OUT, 'rulers-delete.png') });
  await p.mouse.up(); await p.waitForTimeout(100);
  check('dragging a guide back onto a ruler deletes it', await S(() => window.__sungfluence.doc.guides.filter((q) => q.axis === 'y').length) === 0);
  // rotating the picture turns the guides with it
  const vBefore = await S(() => window.__sungfluence.doc.guides.filter((q) => q.axis === 'x').length);
  await S(() => window.__sungfluence.rotateImage(1)); await wait(p);
  check('turning the picture a quarter turn turns vertical guides into horizontal ones', await S(() => window.__sungfluence.doc.guides.filter((q) => q.axis === 'y').length) === vBefore);
  await S(() => window.__sungfluence.undo()); await wait(p);
  await S(() => window.__sungfluence.runCommand('view.clearGuides'));
  check('Clear guides removes them all', await S(() => window.__sungfluence.doc.guides.length) === 0);

  // ---- no long tasks while the rulers follow the pointer, the zoom and a guide ----
  await S(() => { window.__lt = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); });
  for (let i = 0; i < 40; i++) await p.mouse.move(400 + i * 15, 300 + i * 8);
  await S(() => window.__sungfluence.zoomTo(3, null, true)); await p.waitForTimeout(500);
  await S(() => window.__sungfluence.zoomTo('fit')); await p.waitForTimeout(300);
  await p.mouse.move(hr[0], hr[1]); await p.mouse.down(); for (let i = 0; i < 30; i++) await p.mouse.move(hr[0] + i * 3, hr[1] + 30 + i * 12); await p.mouse.up();
  await p.waitForTimeout(300);
  const lt = await S(() => window.__lt.sort((a, b) => b - a)[0] || 0);
  check('no long tasks while rulers and guides follow the pointer and zoom', lt <= LIMIT, lt + ' ms longest task');

  // ---- dark mode and a phone ----
  await S(() => { window.__sungfluence.addGuide('x', window.__sungfluence.imgSize[0] * 0.5); });
  await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(OUT, 'rulers-dark.png') });
  const dark = await S(() => { const c = document.getElementById('rulerH'), d = c.getContext('2d').getImageData(4, 4, 1, 1).data; return d[0] + d[1] + d[2]; });
  check('the rulers follow the dark theme', dark < 200, dark);
  await p.emulateMedia({ colorScheme: 'light' });
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'rulers-phone.png') });
  const phone = await S(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && !document.getElementById('rulers').hidden);
  check('rulers fit at phone width', phone);

  // ---- the Paper preview has no rulers: Ctrl R says so and changes nothing ----
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(200);
  await S(() => { window.__sungfluence.doc.out.mock = 'paper'; window.__sungfluence.compose(); });
  await p.waitForTimeout(200); await p.mouse.click(700, 500); await p.keyboard.press('Control+r'); await p.waitForTimeout(200);
  const mk = await S(() => ({ pref: window.__sungfluence.prefs.rulers, toast: Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent).join(' ') }));
  check('Ctrl R in the Paper preview leaves the setting alone and says why', mk.pref === true && /Artboard view/.test(mk.toast), JSON.stringify(mk));
  await S(() => { window.__sungfluence.doc.out.mock = 'artboard'; window.__sungfluence.compose(); }); await p.waitForTimeout(200);

  // ---- hide again ----
  await p.setViewportSize({ width: 1440, height: 900 });
  await S(() => window.__sungfluence.toggleRulers()); await p.waitForTimeout(100);
  check('Rulers off gives the room back', await S(() => document.getElementById('canvasWrap').getBoundingClientRect().top - document.getElementById('viewport').getBoundingClientRect().top) === 0);

  check('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log(failed ? failed + ' failed' : 'all rulers checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
