// The paper the art is printed on: Printed on (Auto, Light, Gray, Dark), colors that fit the paper in every
// color mode, older projects and recipes keeping their exact colors, Apply text art starting on white paper,
// the note under the artboard, and a checkerboard that shows where the file stays clear.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } await p.waitForTimeout(250); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
// the rule in DEVELOPMENT.md: aim for 220 ms
const LIMIT = 220;

// OKLab hue, to check that a fitted color keeps its hue
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
function oklab(h) {
  const [r, g, b] = hex3(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const hueDiff = (a, b) => { const x = oklab(a), y = oklab(b); let d = Math.abs(Math.atan2(x[2], x[1]) - Math.atan2(y[2], y[1])) * 180 / Math.PI; return d > 180 ? 360 - d : d; };
const chroma = (h) => { const x = oklab(h); return Math.hypot(x[1], x[2]); };
const Y = (h) => { const [r, g, b] = hex3(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => {
    window.__sungfluence.prefs.reveal = 'none';
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ ms: Math.round(e.duration), at: window.__step || '' }))).observe({ entryTypes: ['longtask'] });
  });
  await A(() => window.__sungfluence.useSample('coffee')); await wait(p);
  // long tasks are counted in the named steps; opening a picture has its own limit in photo.test.js
  const step = (s) => A((s) => { window.__step = s; }, s);

  // ---- how the paper reads ----
  const cls = await A(() => {
    const S = window.__sungfluence, o = S.doc.out, r = {};
    for (const h of ['#ffffff', '#808080', '#000000', '#f3efe6', '#111113']) { o.paper = h; r[h] = S.paperClass(); }
    o.paper = '#ffffff'; o.mock = 'shirt';
    for (const h of ['#1f2a44', '#8f9096', '#f6f6f4']) { o.shirt = h; r['shirt ' + h] = S.paperClass(); }
    o.mock = 'artboard'; o.shirt = '#1b1b1d';
    return r;
  });
  check(cls['#ffffff'] === 'light' && cls['#f3efe6'] === 'light', 'white and cream paper read as light', cls['#ffffff'] + ', ' + cls['#f3efe6']);
  check(cls['#808080'] === 'gray', 'mid gray paper reads as gray', cls['#808080']);
  check(cls['#000000'] === 'dark' && cls['#111113'] === 'dark', 'black paper reads as dark', cls['#000000']);
  check(cls['shirt #1f2a44'] === 'dark' && cls['shirt #8f9096'] === 'gray' && cls['shirt #f6f6f4'] === 'light', 'on the T-shirt preview the shirt color decides, not the paper', JSON.stringify([cls['shirt #1f2a44'], cls['shirt #8f9096'], cls['shirt #f6f6f4']]));

  // ---- Auto and set by hand, in the panel ----
  await step('printed on');
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'output'; S.buildPanel(); });
  const ui1 = await A(() => ({ btns: [...document.querySelectorAll('#printedOn button')].map((q) => q.textContent), on: document.querySelector('#printedOn [aria-pressed="true"]').textContent, note: document.getElementById('printedOnNote').textContent }));
  check(ui1.btns.join() === 'Auto,Light,Gray,Dark' && ui1.on === 'Auto', 'the Background section offers Printed on: Auto, Light, Gray, Dark, starting on Auto', ui1.btns.join());
  check(/^Auto: your paper \(White\) reads as light/.test(ui1.note), 'it says what Auto found', ui1.note);
  await p.click('#printedOn button[data-v="dark"]'); await wait(p);
  const man = await A(() => { const S = window.__sungfluence; return { v: S.doc.out.printedOn, cls: S.paperClass(), auto: S.autoPaperClass(), scene: S.sceneFor([], 1).paperClass, ground: S.sceneFor([], 1).ground, note: document.getElementById('printedOnNote').textContent }; });
  check(man.v === 'dark' && man.cls === 'dark' && man.auto === 'light', 'set by hand, the class follows the choice while Auto would still say light');
  check(man.scene === 'dark' && man.ground === '#ffffff', 'the engine gets the class and the ground in the scene, so it never guesses');
  check(/Set by hand to dark/.test(man.note), 'the note says it was set by hand', man.note);
  await p.click('#printedOn button[data-v="auto"]'); await wait(p);
  check(await A(() => window.__sungfluence.paperClass()) === 'light', 'back on Auto it reads the paper again');
  check(await A(() => { const S = window.__sungfluence; S.runCommand('paper.printedOn.gray'); const a = S.paperClass(); S.runCommand('paper.printedOn.auto'); return a; }) === 'gray', 'Printed on is a command too, for the menu and the palette');

  // ---- colors that fit the paper ----
  const PHOTO = ['#f3e6cf', '#ffe14d', '#bfe3ff', '#f8c8dc', '#d1495b', '#4a2c1a', '#14213d', '#8a8a8a', '#6a8f3a', '#2f6db5'];
  const PAPERS = [['#ffffff', 'light'], ['#808080', 'gray'], ['#111113', 'dark']];
  const NEED = { gentle: { light: 3, gray: 2.4, dark: 3.6 }, strong: { light: 4.5, gray: 3.4, dark: 5.5 } };
  const fitted = await A(({ PHOTO, PAPERS }) => {
    const C = window.Sungfluence, r = {};
    for (const [paper, cls] of PAPERS) for (const lv of ['off', 'gentle', 'strong']) r[paper + lv] = PHOTO.map((h) => C.fitColor(h, paper, cls, lv, true));
    return r;
  }, { PHOTO, PAPERS });
  for (const [paper, c] of PAPERS) {
    check(fitted[paper + 'off'].every((h, i) => h === PHOTO[i]), c + ' paper, Off: every color stays exactly as it was');
    for (const lv of ['gentle', 'strong']) {
      const got = fitted[paper + lv];
      const low = got.map((h) => ratio(h, paper)).filter((q) => q < NEED[lv][c] - 0.02);
      check(!low.length, c + ' paper, ' + lv + ': every color reaches the contrast of ' + NEED[lv][c] + ' to 1', low.map((q) => q.toFixed(2)).join(', ') || 'lowest ' + Math.min(...got.map((h) => ratio(h, paper))).toFixed(2));
      const hue = got.map((h, i) => (chroma(PHOTO[i]) > 0.04 && chroma(h) > 0.02 ? hueDiff(h, PHOTO[i]) : 0));
      check(Math.max(...hue) < 9, c + ' paper, ' + lv + ': every color keeps its hue', 'largest shift ' + Math.max(...hue).toFixed(1) + ' degrees');
    }
  }
  const W = fitted['#ffffffgentle'], D = fitted['#111113gentle'];
  check(W[5] === '#4a2c1a' && W[6] === '#14213d', 'on light paper dark colors stay as they are', W[5] + ', ' + W[6]);
  check(Y(W[0]) < Y(PHOTO[0]) && Y(W[1]) < Y(PHOTO[1]), 'on light paper pale colors are made deeper', PHOTO[0] + ' to ' + W[0] + ', ' + PHOTO[1] + ' to ' + W[1]);
  check(D[0] === '#f3e6cf' && D[1] === '#ffe14d', 'on dark paper light colors stay as they are');
  const brown = oklab(D[5]);
  check(Y(D[5]) > Y('#4a2c1a') * 3 && brown[1] > 0.02 && brown[2] > 0.02, 'on dark paper the coffee brown becomes a warm light brown', '#4a2c1a to ' + D[5]);

  // in the engine: a layer of photo colors and a layer of solid ink, on each paper
  const layerColors = async (o) => {
    await step('fit in the engine: ' + (o.mode || 'mosaic') + ', ' + o.layer.colorFit + ', ' + o.paper);
    await A((o) => {
      const S = window.__sungfluence;
      S.doc.out.paper = o.paper; S.doc.out.printedOn = 'auto';
      S.doc.text.layers = [S.newLayer(o.mode || 'mosaic', o.layer)]; S.doc.text.sel = 0; S.doc.text.applied = true; S.doc.text.source = 'photo';
      S.scheduleText(0);
    }, o);
    await wait(p);
    return A(() => window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text' && !q.own).map((q) => q.fill));
  };
  await step('fit in the engine');
  for (const [paper, c] of PAPERS) {
    const off = await layerColors({ paper, layer: { color: 'image', colorFit: 'off' } });
    const on = await layerColors({ paper, layer: { color: 'image', colorFit: 'gentle' } });
    const lowOff = off.filter((h) => ratio(h, paper) < NEED.gentle[c] - 0.02).length, lowOn = on.filter((h) => ratio(h, paper) < NEED.gentle[c] - 0.02).length;
    check(on.length > 50 && lowOn === 0, c + ' paper: every photo color in a Word mosaic reaches the contrast, with Gentle', on.length + ' words, ' + lowOn + ' too faint' + (c !== 'dark' ? '' : '; with Off ' + lowOff + ' were too faint'));
    if (c === 'light') check(lowOff > 0, 'with Off the exact photo colors come through, faint ones too', lowOff + ' of ' + off.length);
    const ink = await layerColors({ paper, mode: 'rows', layer: { color: 'ink', inkColor: c === 'dark' ? '#14213d' : '#f2efe6', colorFit: 'gentle' } });
    const ink0 = ink[0], want = c === 'dark' ? '#14213d' : '#f2efe6';
    check(ink.length > 0 && ink.every((h) => h === ink0) && ratio(ink0, paper) >= NEED.gentle[c] - 0.02 && hueDiff(ink0, want) < 9, c + ' paper: a solid ink that would vanish is fitted, keeping its hue', want + ' prints as ' + ink0);
    const exact = await layerColors({ paper, mode: 'rows', layer: { color: 'ink', inkColor: want, colorFit: 'off' } });
    check(exact.length > 0 && exact.every((h) => h === want), c + ' paper: with Off the exact ink is kept');
  }
  // a solid ink that already shows is left exactly as it was picked, also on the outline of a Word cloud
  check(await A(() => ['#b4420c', '#14213d', '#2f6db5'].every((h) => window.Sungfluence.fitColor(h, '#ffffff', 'light', 'gentle') === h)), 'on white, an ink that already shows stays exactly as picked');
  // the panel says when an ink was adjusted
  await A(() => { const S = window.__sungfluence; S.doc.out.paper = '#111113'; S.doc.text.layers = [S.newLayer('rows', { color: 'ink', inkColor: '#14213d' })]; S.doc.text.sel = 0; S.ui.tab = 'text'; S.buildPanel(); });
  const note = await A(() => ({ seg: [...document.querySelectorAll('#c-fit-colorFit-l + .seg button, [aria-labelledby="c-fit-colorFit-l"] button')].map((q) => q.textContent + (q.getAttribute('aria-pressed') === 'true' ? '*' : '')), adj: (document.querySelector('.fit-adjusted') || {}).textContent || '' }));
  check(note.seg.join() === 'Off,Gentle*,Strong', 'Fit colors to the paper sits by the colors: Off, Gentle (the default), Strong', note.seg.join());
  check(/#14213d prints as .* on this paper/.test(note.adj) && /Choose Off/.test(note.adj), 'the panel says the ink was adjusted and how to keep it exact', note.adj);
  // the shared setting is there for every style, plugins too
  check(await A(() => { const S = window.__sungfluence; return Object.keys(S.MODES).every((k) => S.newLayer(k).colorFit === 'gentle'); }), 'every style and plugin starts with Gentle');

  // ---- older projects and recipes look as they did ----
  await step('old projects');
  const old = await A(() => {
    const S = window.__sungfluence, d = S.projectData();
    d.out.paper = '#111113'; delete d.out.printedOn;
    const lay = (o) => { const L = Object.assign({}, S.doc.text.layers[0], o); delete L.colorFit; return L; };
    d.text.layers = [lay({ mode: 'rows', color: 'ink', inkColor: '#14213d', colorLift: 0 }), lay({ mode: 'mosaic', color: 'image', colorLift: 0.6 }), lay({ mode: 'cloud', color: 'image', colorLift: 0.35 }), lay({ mode: 'rows', color: 'ink', inkColor: '#14213d', colorLift: 0.5 })];
    S.doc.out.printedOn = 'dark';
    return S.openProject(d).then(() => ({ fit: S.doc.text.layers.map((L) => L.colorFit), lift: S.doc.text.layers.some((L) => 'colorLift' in L), printedOn: S.doc.out.printedOn }));
  });
  await wait(p);
  check(old.fit.join() === 'off,strong,gentle,off', 'an older project keeps its exact colors; "Brighten dark colors" turns into Strong or Gentle', old.fit.join());
  check(!old.lift && old.printedOn === 'auto', 'the old setting is gone, and Printed on starts on Auto');
  const oldInk = await A(() => window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text').map((q) => q.fill));
  check(oldInk.length > 0 && oldInk.every((h) => h === '#14213d'), 'the old navy ink on black paper is drawn exactly as before', oldInk[0]);
  const rec = await A(() => {
    const S = window.__sungfluence;
    const ok = S.applySavedRecipe({ app: 'sungfluence', kind: 'recipe', v: 1, text: { source: 'photo', layers: [{ mode: 'rows', color: 'ink', inkColor: '#14213d' }] }, out: { paper: '#111113' } }, 'old.png');
    return { ok, fit: S.curLayer().colorFit, printedOn: S.doc.out.printedOn };
  });
  await wait(p);
  const recInk = await A(() => window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text').map((q) => q.fill));
  check(rec.ok && rec.fit === 'off' && rec.printedOn === 'auto' && recInk.every((h) => h === '#14213d'), 'a look saved in an older file keeps its exact colors', rec.fit + ', ' + recInk[0]);

  // ---- Apply text art starts on white paper ----
  await step('apply');
  await step('');
  await A(() => { const S = window.__sungfluence; S.doc.out.paper = '#111113'; return S.useSample('coffee'); }); await wait(p);
  await step('apply');
  check(await A(() => window.__sungfluence.doc.out.paper) === '#ffffff', 'a new picture starts on white paper');
  await A(() => window.__sungfluence.applyTextArt()); await wait(p);
  const fl = await A(() => { const S = window.__sungfluence, L = S.curLayer(); return { paper: S.doc.out.paper, mode: L.mode, fit: L.colorFit, cls: S.paperClass(), fills: S.out.layers[0].items.filter((q) => q.t === 'text').map((q) => q.fill) }; });
  check(fl.paper === '#15120f' && fl.mode === 'cloud' && fl.cls === 'dark', 'Apply text art on the coffee makes the flagship Word cloud on warm black paper, read as dark', fl.paper + ', ' + fl.mode + ', ' + fl.cls);
  check(fl.fit === 'strong' && fl.fills.every((h) => ratio(h, '#15120f') >= 2.98), 'its colors are fitted to the dark paper, so every word shows', fl.fit + ', lowest ' + Math.min(...fl.fills.map((h) => ratio(h, '#15120f'))).toFixed(2));
  await A(() => window.__sungfluence.setView('text'));
  await p.locator('#art').screenshot({ path: __dirname + '/out/paper-coffee-flagship.png' });
  // the Halftone tile before Apply: the same photo as a Halftone on white
  await A(() => { const S = window.__sungfluence; S.doc.text.applied = false; S.applyTextArt('halftone'); }); await wait(p);
  const ap = await A(() => { const S = window.__sungfluence, L = S.curLayer(); return { paper: S.doc.out.paper, mode: L.mode, inv: L.maskInvert, fit: L.colorFit, fills: S.out.layers[0].items.filter((q) => q.t === 'text').map((q) => q.fill) }; });
  check(ap.paper === '#ffffff' && ap.mode === 'halftone', 'the Halftone tile before Apply makes a Halftone of the coffee on white paper', ap.paper + ', ' + ap.mode);
  check(ap.fit === 'gentle', 'it fits the colors to the paper', ap.fit);
  check(ap.fills.every((h) => ratio(h, '#ffffff') >= 2.98), 'every letter of it shows on white', 'lowest ' + Math.min(...ap.fills.map((h) => ratio(h, '#ffffff'))).toFixed(2));
  await A(() => window.__sungfluence.setView('text'));
  await p.locator('#art').screenshot({ path: __dirname + '/out/paper-coffee-white.png' });

  // ---- the note under the artboard ----
  await step('note');
  const notes = await A(() => {
    const S = window.__sungfluence, o = S.doc.out, r = [], chip = document.getElementById('paperChip');
    const at = (f) => { f(); S.compose(); r.push(chip.textContent); };
    at(() => { o.paper = '#ffffff'; });
    at(() => { o.paper = '#808080'; });
    at(() => { o.paper = '#111113'; });
    at(() => { o.paper = '#ffffff'; o.printedOn = 'gray'; });
    at(() => { o.printedOn = 'auto'; o.transparent = true; });
    at(() => { o.transparent = false; });
    const box = chip.getBoundingClientRect(), art = document.getElementById('art').getBoundingClientRect();
    return { r, shown: !chip.hidden && box.width > 0, below: box.top >= art.bottom - 1 || box.top >= document.getElementById('viewport').getBoundingClientRect().bottom - 1, title: chip.title };
  });
  check(notes.r[0] === 'Made for printing on light paper', 'by default the note says the picture is made for light paper', notes.r[0]);
  check(notes.r[1] === 'Made for printing on gray paper' && notes.r[2] === 'Made for printing on dark paper' && notes.r[3] === 'Made for printing on gray paper', 'the note follows the class of the paper and the choice by hand', notes.r.slice(1, 4).join(' | '));
  check(notes.r[4] === 'Transparent background' && notes.r[5] === 'Made for printing on light paper', 'with a transparent background it says so', notes.r[4]);
  check(notes.shown && notes.below, 'the note shows under the picture, not over it');
  check(/assumes the picture is printed on light paper/.test(notes.title), 'its tooltip says what SungFluence assumes', notes.title);
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'photo'; S.buildPanel(); });
  await p.click('#paperChip'); await p.waitForTimeout(300);
  const opened = await A(() => ({ tab: window.__sungfluence.ui.tab, sec: !!document.getElementById('sec-paper'), seg: !!document.querySelector('#sec-paper #printedOn') }));
  check(opened.tab === 'text' && opened.sec && opened.seg, 'clicking the note opens the Background section with Printed on', JSON.stringify(opened));
  // the clear background is a swatch in that same row; with it on, the note lands on it
  await p.click('#sec-paper #sw-clear'); await wait(p);
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'photo'; S.buildPanel(); });
  await p.click('#paperChip'); await p.waitForTimeout(300);
  const clear = await A(() => ({ t: window.__sungfluence.doc.out.transparent, focus: document.activeElement && document.activeElement.id, chip: document.getElementById('paperChip').textContent }));
  check(clear.t && clear.focus === 'sw-clear' && clear.chip === 'Transparent background', 'the Transparent swatch sits in the Background row, and the note lands on it', JSON.stringify(clear));
  await p.click('#sec-paper #sw-clear'); await wait(p);

  // ---- transparency shows as a clear checkerboard ----
  await step('checker');
  // samples a 12 by 12 grid, one point per square: on a checkerboard neighbours alternate
  const checker = async (id) => A((id) => {
    const S = window.__sungfluence, c = document.getElementById(id), art = document.getElementById('art');
    const per = art.getBoundingClientRect().width / art.width;
    // squares of a whole number of artboard pixels near checkerCell(), about 9 screen pixels; the sharp redraw
    // draws the same squares at the resolution of the screen
    const step = Math.round(S.checkerCell()) * per * (c.width / c.getBoundingClientRect().width), x = c.getContext('2d');
    let best = { share: 0, diff: 0 };
    for (const ph of [0.25, 0.5, 0.75]) {
      let alt = 0, n = 0, diff = 0;
      for (let j = 0; j < 12; j++) {
        let prev = null;
        for (let i = 0; i < 12; i++) {
          const px = Math.floor((i + ph) * step), py = Math.floor((j + ph) * step);
          if (px >= c.width || py >= c.height) continue;
          const d = x.getImageData(px, py, 1, 1).data, l = (d[0] + d[1] + d[2]) / 3;
          if (prev !== null) { n++; const dd = Math.abs(l - prev); if (dd > 25) { alt++; diff += dd; } }
          prev = l;
        }
      }
      const r = { share: n ? alt / n : 0, diff: alt ? diff / alt : 0 };
      if (r.share > best.share) best = r;
    }
    best.cell = +S.checkerCell().toFixed(1);
    return best;
  }, id);
  await A(() => { const S = window.__sungfluence; S.doc.out.transparent = true; S.doc.text.visible = false; S.compose(); });
  const ch1 = await checker('art');
  check(ch1.share > 0.95 && ch1.diff > 40, 'Transparent background: the artboard shows a clear checkerboard', Math.round(ch1.share * 100) + '% of neighbours alternate, ' + Math.round(ch1.diff) + ' levels apart, squares of ' + ch1.cell + ' artboard px');
  const css = await A(() => window.__sungfluence.checkerCell() * document.getElementById('art').getBoundingClientRect().width / document.getElementById('art').width);
  check(css > 6 && css < 13, 'its squares are about 9 screen pixels, so they read at any picture size', css.toFixed(1) + ' px');
  await p.emulateMedia({ colorScheme: 'dark' }); await A(() => window.__sungfluence.compose());
  const ch2 = await checker('art');
  check(ch2.share > 0.95 && ch2.diff > 40, 'it is just as clear in the dark theme', Math.round(ch2.share * 100) + '%');
  await p.emulateMedia({ colorScheme: 'light' });
  await p.locator('#art').screenshot({ path: __dirname + '/out/paper-checker.png' });
  // in the sharp redraw when zoomed in, with the letters on
  // (the letters are hidden in the layer, so the redraw is all ground)
  await A(() => { const S = window.__sungfluence; S.doc.text.visible = true; S.curLayer().hidden = true; S.scheduleText(0); }); await wait(p);
  await A(() => { const S = window.__sungfluence; S.compose(); S.setZoom(4); });
  await p.waitForTimeout(900); await wait(p);
  const crispOn = await A(() => !document.getElementById('crisp').hidden);
  const ch3 = crispOn ? await checker('crisp') : { share: 0 };
  check(crispOn && ch3.share > 0.95 && ch3.diff > 40, 'the sharp redraw when zoomed in shows the checkerboard too', crispOn ? Math.round(ch3.share * 100) + '%' : 'no redraw');
  await A(() => { const S = window.__sungfluence; S.zoomTo('fit'); S.doc.out.transparent = false; S.curLayer().hidden = false; S.compose(); });
  // a see-through PNG shows the checkerboard where it is clear, in the photo view
  await step('');
  await A(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300;
    const x = c.getContext('2d'); x.fillStyle = '#c0392b'; x.fillRect(120, 80, 160, 140);
    const S = window.__sungfluence;
    return S.loadImageURL(c.toDataURL('image/png'), 'see-through.png').then(() => { S.doc.sample = null; S.freshImage(); });
  });
  await wait(p);
  await step('checker');
  await A(() => { window.__sungfluence.setView('photo'); window.__sungfluence.compose(); });
  const ch4 = await checker('art');
  check(ch4.share > 0.9 && ch4.diff > 40, 'the see-through part of a PNG shows as a checkerboard in the photo view', Math.round(ch4.share * 100) + '%');
  await p.locator('#art').screenshot({ path: __dirname + '/out/paper-png-checker.png' });
  // the removed part takes the tones of the paper and squares of the size the zoom asks for
  const remAt = (zoom) => A(async (zoom) => {
    const S = window.__sungfluence; S.setZoom(zoom); await new Promise((r) => setTimeout(r, 400)); S.compose();
    const v = S.removedShown(), d = v.getContext('2d').getImageData(0, 0, v.width, v.height).data, a = S.artGeom();
    const tones = new Set(); for (let i = 0; i < d.length; i += 4 * 7) if (d[i + 3] === 255) tones.add(d[i]);
    // the length of the runs of one tone along the top row, which is all removed
    let runs = 0, n = 0, last = -1, len = 0;
    for (let x = 0; x < v.width; x++) { const t = d[x * 4]; if (t === last) len++; else { if (last >= 0 && len) { runs += len; n++; } last = t; len = 1; } }
    const want = Math.round(S.checkerCell(a)) * v.width / a.W;
    return { tones: [...tones], run: n > 1 ? runs / n : 0, want };
  }, zoom);
  await A(() => { window.__sungfluence.doc.out.printedOn = 'dark'; });
  const remD = await remAt(1);
  check(remD.tones.length && remD.tones.every((t) => t < 80), 'the removed part shows the checker in the tones of the paper (dark)', remD.tones.join(', '));
  check(Math.abs(remD.run - remD.want) <= 1, 'its squares follow the zoom, like the checker under clear paper', 'squares of ' + remD.run.toFixed(1) + ' px, want ' + remD.want);
  await A(() => { window.__sungfluence.doc.out.printedOn = 'light'; });
  const remL = await remAt(2.5);
  check(remL.tones.length && remL.tones.every((t) => t > 180), 'and in the tones of light paper', remL.tones.join(', '));
  check(Math.abs(remL.run - remL.want) <= 1 && remL.want !== remD.want, 'at another zoom the squares change size', remL.run.toFixed(1) + ' px, want ' + remL.want + ' (was ' + remD.want + ')');
  await A(() => { const S = window.__sungfluence; S.doc.out.printedOn = 'auto'; S.zoomTo('fit'); S.compose(); });
  // the sharp redraw starts its squares where the artboard starts, so they line up with the normal checker
  const phase = await A(() => {
    const S = window.__sungfluence, g = S.artGeom(), cell = Math.round(S.checkerCell());
    const full = document.createElement('canvas'); full.width = g.TW; full.height = g.TH;
    S.composeTo(full.getContext('2d'), g, {}, { ground: 'checker', only: [] });
    const s = 2, v = { x: 37.3, y: 21.7, s, cw: 240, ch: 160 }; v.cssW = 9 * v.cw / (cell * s);
    const vc = document.createElement('canvas'); vc.width = v.cw; vc.height = v.ch;
    S.composeTo(vc.getContext('2d'), g, {}, { ground: 'checker', only: [], view: v });
    const a = full.getContext('2d').getImageData(0, 0, g.TW, g.TH).data, b = vc.getContext('2d').getImageData(0, 0, v.cw, v.ch).data;
    let same = 0, n = 0;
    for (let j = 3; j < v.ch; j += 7) for (let i = 3; i < v.cw; i += 7) {
      const X = Math.floor(v.x + (i + 0.5) / s), Y = Math.floor(v.y + (j + 0.5) / s);
      if (X >= g.TW || Y >= g.TH) continue;
      n++; if (Math.abs(a[(Y * g.TW + X) * 4] - b[(j * v.cw + i) * 4]) < 8) same++;
    }
    return { share: same / Math.max(1, n), n };
  });
  check(phase.n > 100 && phase.share > 0.85, 'the zoomed sharp checker lines up with the normal one', Math.round(phase.share * 100) + '% of ' + phase.n + ' points match');
  // at a zoom that is not a whole number the sharp squares are still exactly the normal squares times the zoom
  const odd = await A(() => {
    const S = window.__sungfluence, g = S.artGeom(), cell = Math.round(S.checkerCell()), s = 3.37;
    const v = { x: 0, y: 0, s, cw: Math.round(cell * s * 20), ch: 8, cssW: 100 };
    const vc = document.createElement('canvas'); vc.width = v.cw; vc.height = v.ch;
    S.composeTo(vc.getContext('2d'), g, {}, { ground: 'checker', only: [], view: v });
    const d = vc.getContext('2d').getImageData(0, 4, v.cw, 1).data;
    // where the tone changes along the row, against where it should change
    // an edge is where the tone crosses the middle of the two checker tones, so a pixel of in-between gray
    // on an edge that falls between pixels is not counted twice
    let lo = 255, hi = 0;
    for (let x = 0; x < v.cw; x++) { lo = Math.min(lo, d[x * 4]); hi = Math.max(hi, d[x * 4]); }
    const mid = (lo + hi) / 2;
    let worst = 0, n = 0, last = d[0] > mid;
    for (let x = 1; x < v.cw; x++) if ((d[x * 4] > mid) !== last) { last = !last; n++; worst = Math.max(worst, Math.abs(x - n * cell * s)); }
    return { worst: +worst.toFixed(2), n, cell };
  });
  check(odd.n >= 15 && odd.worst <= 1, 'at a zoom of 3.37 the sharp squares stay ' + odd.cell + ' x 3.37 px with no drift', odd.n + ' edges, off by ' + odd.worst + ' px at most');

  // ---- every way of setting the paper puts Printed on back to Auto ----
  await step('');
  const resets = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence, r = {};
    S.applyTextArt();
    S.doc.out.printedOn = 'light'; S.setPrintOn('dark', S.curLayer()); r.printOn = [S.doc.out.printedOn, S.paperClass()];
    const rec = S.RECIPES.find((q) => C.paperClassOf(q.paper) === 'dark');
    S.doc.out.printedOn = 'light'; S.applyRecipe(rec); r.recipe = [S.doc.out.printedOn, S.paperClass(), rec.paper];
    S.doc.out.printedOn = 'dark'; const g0 = S.recipeGround({ paper: '#ffffff' }), g1 = S.recipeGround(rec); r.thumbs = [g0.paperClass, g1.paperClass];
    S.doc.out.printedOn = 'light'; await S.createArtboard({ unit: 'px', w: 400, h: 300, dpi: 300, bg: '#111113', name: 'Test' }); r.board = [S.doc.out.printedOn, S.paperClass()];
    return r;
  });
  await wait(p);
  check(resets.printOn[0] === 'auto' && resets.printOn[1] === 'dark', 'Print on: Dark sets Printed on back to Auto, so white ink is fitted to dark paper', resets.printOn.join(', '));
  check(resets.recipe[0] === 'auto' && resets.recipe[1] === 'dark', 'a recipe on dark paper sets Printed on back to Auto', resets.recipe.join(', '));
  check(resets.thumbs[0] === 'light' && resets.thumbs[1] === 'dark', 'recipe pictures are fitted to the paper of the recipe, not the Printed on set by hand', resets.thumbs.join(', '));
  check(resets.board[0] === 'auto' && resets.board[1] === 'dark', 'a new black artboard sets Printed on back to Auto', resets.board.join(', '));

  // ---- no freezing, no errors ----
  await step('');
  // over a blank artboard, a sample asks first: open it on its own
  await A(() => window.__sungfluence.useSample('cat')); await p.waitForTimeout(300);
  if (await A(() => !document.getElementById('dlgScrim').hidden)) await A(() => [...document.querySelectorAll('#dlg button')].find((b) => b.textContent === 'Open as a new picture').click());
  await wait(p);
  await step('switching');
  // a Halftone, so Tone below has letters of every strength
  await A(() => window.__sungfluence.applyTextArt('halftone')); await wait(p);
  await A(() => { window.__sungfluence.ui.tab = 'output'; window.__sungfluence.buildPanel(); });
  for (const v of ['dark', 'gray', 'light', 'auto']) { await p.click('#printedOn button[data-v="' + v + '"]'); await wait(p); }
  for (const i of [3, 0]) { await p.click('#sec-paper .swatches .sw >> nth=' + i); await wait(p); }
  // Tone on black paper: the faint letters stop where they still reach the fitted contrast, and white paper is as before
  await step('tone');
  const toneOn = async (paper) => { await A((paper) => { const S = window.__sungfluence; Object.assign(S.curLayer(), { color: 'tone', inkColor: '#1d2433', colorFit: 'gentle' }); S.doc.out.paper = paper; S.doc.out.printedOn = 'auto'; S.scheduleText(0); }, paper); await wait(p);
    return A((paper) => { const C = window.Sungfluence, r = window.__sungfluence.out.layers[0].items.map((i) => C.contrastRatio(i.fill, paper)).sort((a, b) => a - b); return { min: r[0], med: r[r.length >> 1], max: r[r.length - 1] }; }, paper); };
  const tB = await toneOn('#111113');
  check(tB.min >= 3.5 && tB.med >= 6 && tB.max >= 10, 'Tone on black paper: every letter reads, the strong letters go near white and the middle stays bright', 'contrast ' + tB.min.toFixed(2) + ' to ' + tB.max.toFixed(2) + ', middle ' + tB.med.toFixed(2));
  await p.locator('#art').screenshot({ path: __dirname + '/out/paper-tone-black.png' });
  const tW = await toneOn('#ffffff');
  check(tW.min < 2.5 && tW.max > 10, 'Tone on white paper still fades the faint letters into the paper', tW.min.toFixed(2) + ' to ' + tW.max.toFixed(2));
  const long = await A(() => window.__long.filter((q) => q.at && q.at !== 'old projects').sort((a, b) => b.ms - a.ms));
  console.log('     longest tasks (ms):', long.slice(0, 6).map((q) => q.ms + ' ' + q.at).join(', ') || 'none');
  const ui = long.filter((q) => !q.at.startsWith('fit in the engine')), eng = long.filter((q) => q.at.startsWith('fit in the engine'));
  check(!ui.length || ui[0].ms <= LIMIT, 'no task over ' + LIMIT + ' ms while the paper, Printed on and the colors change', ui.length ? ui[0].ms + ' ms at ' + ui[0].at : 'none');
  // the direction field the styles read is worked out in steps, so drawing with fitted colors keeps to the normal limit
  check(!eng.length || eng[0].ms <= LIMIT, 'drawing styles with fitted colors stays under ' + LIMIT + ' ms', eng.length ? eng[0].ms + ' ms at ' + eng[0].at : 'none');
  const cost = await A(() => { const C = window.Sungfluence, t0 = performance.now(); for (let i = 0; i < 5000; i++) C.fitColor('#' + ((i * 2654435761) >>> 8 & 0xffffff).toString(16).padStart(6, '0'), '#808080', 'gray', 'strong'); return (performance.now() - t0) / 5000 * 1000; });
  check(cost < 25, 'fitting a new color costs a few microseconds, and each color is worked out once per paper', cost.toFixed(1) + ' us');
  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' paper checks failed' : 'all paper checks passed');
  process.exit(fails ? 1 : 0);
})();
