// Show transparency as: Checkerboard, Black or White. Pixel checks that the screen shows each one (the artboard,
// the sharp redraw when zoomed in, the compare divider, removed photo areas), that the checkerboard is clear in
// both themes and on every paper, that exported files stay clear whatever the screen shows, that the choice is a
// preference (kept after a reload, not in the project, not in undo), and that the menu and the panel both set it.
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('./browser');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(60); } await p.waitForTimeout(250); };
let failed = 0;
const check = (ok, name, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!ok) failed++; };
// the rule in DEVELOPMENT.md: aim for 220 ms
const LIMIT = 220;

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sungfluence-prefs-v1', JSON.stringify({ welcomed: true, reveal: 'none' })); localStorage.removeItem('sungfluence-session-v3'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* ignore */ } });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000); await wait(p);
  const A = (f, a) => p.evaluate(f, a);
  await A(() => {
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ ms: Math.round(e.duration), at: window.__step || '' }))).observe({ entryTypes: ['longtask'] });
  });
  await A(() => window.__sungfluence.useSample('coffee')); await wait(p);
  await A(() => window.__sungfluence.applyTextArt()); await wait(p);
  await A(() => { const S = window.__sungfluence; S.setView('text'); S.ui.tab = 'text'; S.buildPanel(); }); await wait(p);

  // ---- the default, and where the choice sits ----
  check(await A(() => window.__sungfluence.prefs.transpShow === 'checker' && window.__sungfluence.transpShow() === 'checker'), 'the checkerboard is the default');
  check(await A(() => !document.getElementById('transpShow')), 'the choice is hidden while the background is not transparent');
  await p.click('#sec-paper #sw-clear'); await wait(p);
  const row = await A(() => {
    const seg = document.getElementById('transpShow'), sw = document.getElementById('sw-clear');
    if (!seg) return null;
    const lab = document.getElementById(seg.getAttribute('aria-labelledby'));
    // right under the swatch row, in the same Background block
    const after = sw.parentNode.nextElementSibling;
    return { label: lab && lab.textContent, buttons: [...seg.querySelectorAll('button')].map((b) => b.textContent + ':' + b.getAttribute('aria-pressed')),
      inBlock: document.getElementById('sec-paper').contains(seg), next: !!after && after.contains(seg), wide: seg.getBoundingClientRect().right <= document.getElementById('sec-paper').getBoundingClientRect().right + 1 };
  });
  check(row && row.label === 'Show transparency as', 'turning on Transparent shows "Show transparency as"', row && row.label);
  check(row && row.buttons.join(',') === 'Checkerboard:true,Black:false,White:false', 'three choices, Checkerboard pressed', row && row.buttons.join(','));
  check(row && row.inBlock && row.next, 'it sits right under the Transparent swatch in the Background block');
  check(row && row.wide, 'it fits the panel width');
  await A(() => document.getElementById('transpShow').scrollIntoView({ block: 'center' }));
  await p.locator('#sec-paper').screenshot({ path: path.join(OUT, 'transparency-panel.png') });

  // the artboard with the letters hidden is all ground: returns the tones it shows
  const ground = (id) => A((id) => {
    const S = window.__sungfluence, c = document.getElementById(id || 'art'), x = c.getContext('2d');
    const d = x.getImageData(0, 0, Math.min(c.width, 200), Math.min(c.height, 200)).data;
    const tones = new Map();
    for (let i = 0; i < d.length; i += 4) { const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; tones.set(k, (tones.get(k) || 0) + 1); }
    const top = [...tones.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k.split(',').map(Number));
    // on a checkerboard neighbouring squares alternate: step one square along the top row
    const cell = Math.round(S.checkerCell()) * (c.width / document.getElementById('art').width) * (id === 'crisp' ? 1 : 1);
    return { top, n: tones.size, cell };
  }, id);
  const lum = (t) => (t[0] + t[1] + t[2]) / 3;
  const textHidden = (on) => A((on) => { const S = window.__sungfluence; S.doc.text.visible = !on; S.compose(); }, on);

  // ---- Checkerboard: clear on light, gray and dark paper, in both themes ----
  await textHidden(true);
  for (const scheme of ['light', 'dark']) {
    await p.emulateMedia({ colorScheme: scheme });
    for (const cls of ['light', 'gray', 'dark']) {
      await A((cls) => { const S = window.__sungfluence; S.doc.out.printedOn = cls; S.compose(); }, cls);
      const g = await ground();
      const diff = g.top.length === 2 ? Math.abs(lum(g.top[0]) - lum(g.top[1])) : 0;
      // dark paper is quieter on purpose, so small gray letters still read on it; the artboard edge is outlined
      const need = cls === 'dark' ? [20, 32] : [40, 255];
      check(diff >= need[0] && diff <= need[1], scheme + ' theme, ' + cls + ' paper: the two squares are clearly apart' + (cls === 'dark' ? ', but quiet' : ''), Math.round(diff) + ' levels');
    }
    await A(() => { window.__sungfluence.doc.out.printedOn = 'auto'; window.__sungfluence.compose(); });
  }
  await p.emulateMedia({ colorScheme: 'light' });
  const edge = await A(() => getComputedStyle(document.getElementById('art')).outlineStyle);
  check(edge === 'solid', 'a clear artboard gets a thin edge, so it keeps its outline on the stage', edge);

  // ---- Black and White, from the panel ----
  await A(() => { window.__step = 'switch'; });
  await p.click('#transpShow button[data-v="black"]'); await wait(p);
  await A(() => { window.__step = ''; });
  let g = await ground();
  check(g.n === 1 && g.top[0].join() === '0,0,0', 'Black: clear areas show plain black', JSON.stringify(g.top));
  check(await A(() => document.querySelector('#transpShow button[data-v="black"]').getAttribute('aria-pressed') === 'true'), 'the Black button shows as pressed');
  const noteB = await A(() => document.querySelector('#sec-paper .paper-note').textContent);
  // the ? between the sentences is the small help button of the note
  check(/^Clear in PNG, SVG and PDF\./.test(noteB) && /JPG gets the paper color/.test(noteB), 'the note under Background says what stays clear, in one short line', noteB);
  await A(() => { window.__step = 'switch'; });
  await p.click('#transpShow button[data-v="white"]'); await wait(p);
  await A(() => { window.__step = ''; });
  g = await ground();
  check(g.n === 1 && g.top[0].join() === '255,255,255', 'White: clear areas show plain white', JSON.stringify(g.top));

  // with the letters on, the art sits on the chosen ground
  await textHidden(false); await wait(p);
  await A(() => window.__sungfluence.setTranspShow('black')); await wait(p);
  await p.locator('#art').screenshot({ path: path.join(OUT, 'transparency-black.png') });
  await A(() => window.__sungfluence.setTranspShow('white')); await wait(p);
  await p.locator('#art').screenshot({ path: path.join(OUT, 'transparency-white.png') });
  await A(() => window.__sungfluence.setTranspShow('checker')); await wait(p);
  await p.locator('#art').screenshot({ path: path.join(OUT, 'transparency-checker.png') });

  // ---- the chip under the picture says it in one line ----
  const chip = await A(() => ({ t: document.getElementById('paperChip').textContent, tip: document.getElementById('paperChip').title }));
  check(chip.t === 'Transparent background' && /Clear in the file\. Shown here as a checkerboard; change that under View > Show transparency as\./.test(chip.tip), 'the note under the picture explains it', chip.tip);
  await A(() => window.__sungfluence.setTranspShow('black'));
  const chipB = await A(() => ({ tip: document.getElementById('paperChip').title, sw: document.getElementById('paperChip').style.getPropertyValue('--sheet-chip') }));
  check(/Shown here as black/.test(chipB.tip) && /#000000/.test(chipB.sw), 'and follows the choice, swatch and all', chipB.sw);

  // ---- the sharp redraw when zoomed in, and the compare divider ----
  await textHidden(true);
  await A(() => { const S = window.__sungfluence; S.doc.text.visible = true; S.curLayer().hidden = true; S.scheduleText(0); }); await wait(p);
  await A(() => { const S = window.__sungfluence; S.compose(); S.setZoom(4); }); await p.waitForTimeout(900); await wait(p);
  const crispOn = await A(() => !document.getElementById('crisp').hidden);
  g = crispOn ? await ground('crisp') : { n: 0, top: [] };
  check(crispOn && g.n === 1 && g.top[0].join() === '0,0,0', 'the sharp redraw when zoomed in shows black too', crispOn ? JSON.stringify(g.top) : 'no redraw');
  await A(() => { const S = window.__sungfluence; S.zoomTo('fit'); S.curLayer().hidden = false; S.scheduleText(0); }); await wait(p);
  const cmp = await A(() => {
    const S = window.__sungfluence, g = S.artGeom();
    const blank = document.createElement('canvas'); blank.width = g.TW; blank.height = g.TH;
    const c = S.compareCanvas('text', g, { text: blank }), d = c.getContext('2d').getImageData(0, 0, 4, 4).data;
    return [d[0], d[1], d[2], d[3]];
  });
  check(cmp.join() === '0,0,0,255', 'the compare divider uses the same ground', cmp.join());

  // ---- exports stay clear whatever the screen shows ----
  const grab = async (id) => {
    const dl = p.waitForEvent('download', { timeout: 90000 });
    await A((id) => { const S = window.__sungfluence, x = S.EXPORTERS.find((e) => e.id === id); S.runExporter(x, S.exporterOpts(x)); }, id);
    const d = await dl; const f = path.join(OUT, 'transparency-' + d.suggestedFilename()); await d.saveAs(f); return f;
  };
  const clearShare = (f) => A(async (b64) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let clear = 0, black = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 13) { n++; if (d[i + 3] === 0) clear++; else if (d[i + 3] === 255 && d[i] + d[i + 1] + d[i + 2] === 0) black++; }
    return { clear: clear / n, black: black / n };
  }, fs.readFileSync(f).toString('base64'));
  for (const v of ['black', 'white', 'checker']) {
    await A((v) => window.__sungfluence.setTranspShow(v), v);
    const s = await clearShare(await grab('png-art'));
    check(s.clear > 0.05 && s.black < 0.01, 'PNG of the text art stays clear with ' + v + ' on screen', Math.round(s.clear * 100) + '% clear, ' + Math.round(s.black * 100) + '% black');
  }
  await A(() => window.__sungfluence.setTranspShow('black'));
  const v1 = await clearShare(await grab('png-view'));
  check(v1.clear > 0.05 && v1.black < 0.01, 'PNG of the visible layers stays clear too', Math.round(v1.clear * 100) + '% clear');
  const svg = fs.readFileSync(await grab('svg-art'), 'utf8');
  check(!/<rect[^>]*id="paper"/.test(svg) && !/fill="#000000"[^>]*width="100%"/.test(svg), 'the SVG has no background rectangle');

  // ---- removed photo areas follow the choice ----
  const rem = await A(async () => {
    const S = window.__sungfluence;
    S.setView('photo'); S.doc.removed.show = 'checker';
    S.removeBackground && S.removeBackground();
    await new Promise((r) => setTimeout(r, 50));
    return true;
  });
  await wait(p);
  const remTones = await A(() => {
    const S = window.__sungfluence, v = S.removedShown();
    if (!v) return null;
    const d = v.getContext('2d').getImageData(0, 0, v.width, v.height).data, t = new Set();
    for (let i = 0; i < d.length; i += 4 * 11) if (d[i + 3] === 255) t.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    return [...t];
  });
  check(rem && remTones && remTones.length === 1 && remTones[0] === '0,0,0', 'removed parts of the photo show black too', remTones && remTones.slice(0, 4).join(' | '));
  await A(() => window.__sungfluence.setTranspShow('checker'));
  const remC = await A(() => { const v = window.__sungfluence.removedShown(); const d = v.getContext('2d').getImageData(0, 0, v.width, v.height).data, t = new Set(); for (let i = 0; i < d.length; i += 4 * 11) if (d[i + 3] === 255) t.add(d[i]); return t.size; });
  check(remC >= 2, 'and the checkerboard again once it is chosen', remC + ' tones');
  await A(() => { const S = window.__sungfluence; S.undo(); S.setView('text'); }); await wait(p);

  // ---- removed areas on a paper background keep the checkerboard, whatever the choice ----
  const opaque = await A(async () => {
    const S = window.__sungfluence;
    S.setTranspShow('black'); S.setView('photo'); S.doc.removed.show = 'checker'; S.doc.out.transparent = false;
    S.removeBackground && S.removeBackground();
    await new Promise((r) => setTimeout(r, 50));
    return true;
  });
  await wait(p);
  const remO = await A(() => { const v = window.__sungfluence.removedShown(); const d = v.getContext('2d').getImageData(0, 0, v.width, v.height).data, t = new Set(); for (let i = 0; i < d.length; i += 4 * 11) if (d[i + 3] === 255) t.add(d[i]); return [...t]; });
  check(opaque && remO.length >= 2, 'with a paper background, removed areas keep the checkerboard even with Black chosen', remO.length + ' tones');
  const pattern = () => A(() => [...document.querySelectorAll('[aria-labelledby="c-r-show-l"] button')].map((b) => b.textContent).join(','));
  await A(() => { const S = window.__sungfluence; S.ui.open.photoShowRemoved = true; S.ui.tab = 'photo'; S.buildPanel(); });
  const patO = await pattern();
  await A(() => { const S = window.__sungfluence; S.doc.out.transparent = true; S.compose(); S.buildPanel(); }); await wait(p);
  const patT = await pattern();
  check(/^Checkerboard,Color$/.test(patO) && /^Black,Color$/.test(patT), 'the removed-area Pattern names what the screen shows', patO + ' then ' + patT);
  await A(() => { const S = window.__sungfluence; S.undo(); S.doc.out.transparent = true; S.setView('text'); S.ui.tab = 'text'; S.buildPanel(); S.compose(); }); await wait(p);

  // ---- the keyboard keeps its place ----
  await A(() => document.querySelector('#transpShow button[data-v="checker"]').focus());
  await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await wait(p);
  const foc = await A(() => { const a = document.activeElement; return a && a.closest('#transpShow') ? a.dataset.v + ':' + window.__sungfluence.prefs.transpShow : (a && a.tagName); });
  check(foc === 'black:black', 'after choosing with the keyboard the focus stays on the choice', foc);
  await A(() => document.querySelector('#sec-paper #sw-clear').focus());
  await p.keyboard.press('Enter'); await wait(p);
  const foc2 = await A(() => document.activeElement && document.activeElement.id);
  check(foc2 === 'sw-clear', 'and on the Transparent swatch after turning it off', foc2);
  await p.keyboard.press('Enter'); await wait(p);

  // ---- the squares stay about 9 screen pixels at any zoom, crisp when zoomed in ----
  await A(() => { const S = window.__sungfluence; S.setTranspShow('checker'); S.doc.text.visible = false; S.compose(); });
  const squareAt = async (z) => {
    await A((z) => window.__sungfluence.setZoom(z), z); await p.waitForTimeout(700); await wait(p);
    return A(() => {
      const art = document.getElementById('art'), r = art.getBoundingClientRect(), per = r.width / art.width;
      const d = art.getContext('2d').getImageData(0, 0, art.width, 1).data;
      // the length of a full run of one tone along the top row, in screen pixels
      const runs = []; let n = 1;
      for (let i = 4; i < d.length; i += 4) { if (d[i] === d[i - 4]) n++; else { runs.push(n); n = 1; } }
      return runs.length > 2 ? runs[1] * per : 0;
    });
  };
  const sq = [];
  for (const z of [0.25, 0.5, 2]) sq.push(Math.round(await squareAt(z) * 10) / 10);
  check(sq.every((v) => v >= 6.5 && v <= 11.5), 'after a zoom the squares are drawn again at about 9 screen pixels', sq.join(', '));
  await A(() => { const S = window.__sungfluence; S.doc.text.visible = true; S.curLayer().hidden = true; S.scheduleText(0); }); await wait(p);
  await A(() => window.__sungfluence.setZoom(4)); await p.waitForTimeout(900); await wait(p);
  const crispSq = await A(() => {
    const c = document.getElementById('crisp'); if (c.hidden) return null;
    const d = c.getContext('2d').getImageData(0, 0, c.width, 1).data, tones = new Set(), runs = []; let n = 1;
    for (let i = 4; i < d.length; i += 4) { tones.add(d[i]); if (d[i] === d[i - 4]) n++; else { runs.push(n); n = 1; } }
    const k = c.width / c.getBoundingClientRect().width, mid = runs.slice(1).sort((a, b) => a - b);
    return { tones: tones.size, run: mid.length ? mid[Math.floor(mid.length / 2)] / k : 0 };
  });
  // the sharp squares match the normal view's squares (a whole number of artboard pixels), so they are about 9 screen
  // pixels, not exactly 9; the hard edges are what this checks
  check(crispSq && crispSq.run >= 6.5 && crispSq.run <= 11.5 && crispSq.tones <= 3, 'the sharp redraw has squares of about 9 pixels with hard edges', crispSq && (crispSq.run + ' px, ' + crispSq.tones + ' tones'));
  await A(() => { const S = window.__sungfluence; S.zoomTo('fit'); S.curLayer().hidden = false; S.scheduleText(0); }); await wait(p);

  // ---- the Paper and T-shirt previews show the sheet itself: the choice waits ----
  await A(() => { const S = window.__sungfluence; S.doc.out.mock = 'shirt'; S.compose(); S.buildPanel(); }); await wait(p);
  const mk = await A(() => { const s = document.getElementById('transpShow'); return s ? { dis: [...s.querySelectorAll('button')].every((b) => b.disabled), note: s.parentNode.textContent } : null; });
  check(mk && mk.dis && /show the sheet itself/.test(mk.note), 'on the T-shirt preview the choice is grayed out and says why', mk && mk.note);
  await A(() => { const S = window.__sungfluence; S.doc.out.mock = 'artboard'; S.compose(); S.buildPanel(); }); await wait(p);

  // ---- while Transparent is on, the paper swatch has a quieter ring ----
  const ring = await A(() => { const b = document.querySelector('#sec-paper .sw.sw-under'); return b ? getComputedStyle(b).outlineWidth : null; });
  check(ring === '1px', 'the paper swatch keeps a thin quiet ring while Transparent is on', ring);

  // ---- out of sight, as on a phone, a change says what it did ----
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(400);
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; S.buildPanel(); document.getElementById('transpShow').scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(200);
  const hidden = await A(() => { const r = document.getElementById('frame').getBoundingClientRect(); return r.bottom < 40 || r.top > innerHeight - 40; });
  await p.click('#transpShow button[data-v="white"]'); await wait(p);
  const tst = await A(() => { const t = document.getElementById('toast'); return t.hidden ? '' : t.textContent; });
  await p.screenshot({ path: path.join(OUT, 'transparency-phone-toast.png') });
  check(hidden && /Clear areas now show as white/.test(tst), 'on a phone, a change out of sight shows a short message', tst);
  await A(() => window.__sungfluence.setTranspShow('checker'));
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
  await A(() => { const S = window.__sungfluence; S.doc.text.visible = true; S.compose(); }); await wait(p);

  // ---- View menu and the command list ----
  const menu = await A(() => {
    const S = window.__sungfluence, view = S.menuSpec().find((m) => m.label === 'View'), sub = view.items.find((i) => i.label === 'Show transparency as');
    return sub ? sub.items.map((i) => i.id + ':' + i.label) : null;
  });
  check(menu && menu.join(',') === 'view.transp.checker:Checkerboard,view.transp.black:Black,view.transp.white:White', 'View > Show transparency as has Checkerboard, Black and White', menu && menu.join(','));
  const cmd = await A(() => {
    const S = window.__sungfluence, r = [];
    for (const v of ['white', 'black', 'checker']) {
      S.runCommand('view.transp.' + v);
      r.push(S.prefs.transpShow + ':' + ['checker', 'black', 'white'].filter((k) => S.COMMANDS.get('view.transp.' + k).checked()).join(''));
    }
    return r;
  });
  check(cmd.join(',') === 'white:white,black:black,checker:checker', 'the menu commands set the choice and show one check', cmd.join(','));
  await p.click('#menubar > button:has-text("View")'); await p.waitForTimeout(200);
  await p.locator('.dropmenu .mi:has-text("Show transparency as")').first().hover(); await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(OUT, 'transparency-menu.png') });
  const shown = await A(() => [...document.querySelectorAll('.dropmenu')].pop().textContent);
  await p.locator('.dropmenu').last().locator('.mi:has-text("White")').click(); await wait(p);
  check(/Checkerboard/.test(shown) && await A(() => window.__sungfluence.prefs.transpShow) === 'white', 'a click on View > Show transparency as > White in the menu bar sets it', shown.replace(/\s+/g, ' '));
  await A(() => window.__sungfluence.setTranspShow('checker'));
  const pal = await A(() => [...window.__sungfluence.COMMANDS.values()].filter((c) => /^Show transparency as/.test(c.label)).map((c) => c.label).join(', '));
  check(/checkerboard/.test(pal) && /black/.test(pal) && /white/.test(pal), 'the command palette finds them by name', pal);

  // ---- no long tasks while switching ----
  const long = await A(() => window.__long.filter((e) => e.at === 'switch'));
  check(long.every((e) => e.ms <= LIMIT), 'switching takes no task over ' + LIMIT + ' ms', long.map((e) => e.ms).join(', ') || 'none');

  // ---- a preference: not in the project, not in undo, kept after a reload ----
  const hist = await A(() => { const S = window.__sungfluence, n = S.histLength ? S.histLength() : null, before = JSON.stringify(S.projectData()); S.setTranspShow('white'); const after = JSON.stringify(S.projectData()); return { same: before === after, has: /transpShow/.test(after), undo: document.getElementById('undoBtn').disabled }; });
  check(hist.same && !hist.has, 'the choice is not saved in the project file');
  const undone = await A(() => { const S = window.__sungfluence; S.undo(); return S.prefs.transpShow; });
  check(undone === 'white', 'undo leaves it alone', undone);
  await A(() => { const S = window.__sungfluence; S.redo(); });
  check(await A(() => JSON.parse(localStorage.getItem('sungfluence-prefs-v1')).transpShow) === 'white', 'it is kept in the settings of this computer');
  await p.reload(); await p.waitForTimeout(2000); await wait(p);
  check(await A(() => window.__sungfluence.prefs.transpShow) === 'white', 'after a reload White is still chosen');
  await A(() => window.__sungfluence.openSettings()); await p.waitForTimeout(200);
  const setRow = await A(() => { const b = document.querySelector('#pf-transpShow [aria-pressed="true"], [id^="pf-transpShow"] [aria-pressed="true"]'); return b ? b.textContent : [...document.querySelectorAll('.ctl')].filter((c) => /Show transparency as/.test(c.textContent)).length; });
  check(setRow === 'White' || setRow === 1, 'Settings > Look has it too', String(setRow));
  await p.keyboard.press('Escape');
  await A(() => window.__sungfluence.setTranspShow('nonsense'));
  check(await A(() => window.__sungfluence.prefs.transpShow) === 'checker', 'an unknown value falls back to the checkerboard');

  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(failed ? failed + ' check(s) failed' : 'all transparency checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
