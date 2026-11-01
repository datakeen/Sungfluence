// Checks the text art effects on the sample cat: Confetti, Urdu in Calligram, Text portrait and Spiral,
// fade shapes and their handles, spiral start and direction, letter opacity, italic, ink swaps and the plugin window.
// Fails with exit code 1 if a check fails. Screenshots go to tests/out/ (look at them after changes).
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('./browser');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(300); };
let failed = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!ok) failed++; };
const VERSE = 'خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے';

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2500);
  const S = (f, a) => p.evaluate(f, a);
  // one layer with these settings, on this paper, then wait for the drawing
  const style = async (mode, over, paper) => {
    await S(([m, o, pp]) => {
      const A = window.__sungfluence;
      if (!A.doc.text.applied) A.applyTextArt();
      if (pp) A.doc.out.paper = pp;
      A.setLayerStyle(m);
      Object.assign(A.curLayer(), o || {});
      A.setView('text'); A.buildPanel(); A.scheduleText(0);
    }, [mode, over, paper]);
    await wait(p);
  };
  const layerOut = () => S(() => { const A = window.__sungfluence; const L = A.curLayer(); const r = A.out.layers.find((x) => x.id === L.id); const all = r.items; return { n: all.length, ms: r.ms, minA: Math.min(...all.map((i) => i.a ?? 1)), maxSize: Math.max(...all.map((i) => i.size || 0)), minSize: Math.min(...all.map((i) => i.size || 99)), fills: Array.from(new Set(all.map((i) => i.fill))), items: r.items.slice(0, 400).map((i) => ({ s: i.s, font: i.font, a: i.a, italic: !!i.italic, fill: i.fill, rot: i.rot, size: i.size })), palette: r.palette }; });
  const shot = (name) => p.locator('#viewport').screenshot({ path: __dirname + '/out/' + name + '.png' });

  check('the sample cat is the new picture', await S(() => window.__sungfluence.doc.sample === 'cat' && window.__sungfluence.imgSize[0] === 1600));

  // Confetti: packed letters, small in the detail
  await style('plugin:confetti', {}, '#ffffff');
  let o = await layerOut();
  check('Confetti draws on the cat', o.n > 1500, o.n + ' letters, ' + o.ms + ' ms');
  check('Confetti mixes small and large letters', o.maxSize / o.minSize > 3, o.minSize.toFixed(1) + ' to ' + o.maxSize.toFixed(1));
  await shot('fx1-confetti-white');
  await style('plugin:confetti', { colorLift: 0.6 }, '#111113');
  await shot('fx2-confetti-dark');

  // Calligram: line breaks in the shape word, Urdu set as whole words in Nastaliq
  await style('calligram', { maskSource: 'text', maskText: 'I Love you\nboth', text: 'every picture is a story told in letters', color: 'image' }, '#ffffff');
  await S(() => { window.__sungfluence.ui.open.more = false; window.__sungfluence.buildPanel(); });
  const ta = p.locator('#c-maskText');
  check('the shape word is a box with several lines', (await ta.evaluate((e) => e.tagName)) === 'TEXTAREA');
  await ta.fill('I Love you'); await ta.press('Enter'); await ta.type('both'); await wait(p);
  check('Enter starts a new line in the shape word', await S(() => window.__sungfluence.curLayer().maskText === 'I Love you\nboth'));
  await shot('fx3-calligram-two-lines');
  await style('calligram', { maskSource: 'text', maskText: 'اقبال', text: VERSE, upper: false, size: 16, color: 'duotone', verseMark: '۔' }, '#f3efe6');
  o = await layerOut();
  check('Urdu calligram sets whole words', o.n > 30 && o.items.every((i) => i.s.length > 1 || /[؀-ۿ]/.test(i.s)), o.n + ' words');
  check('Urdu calligram uses Nastaliq', o.items.every((i) => i.font === 'nastaliq'), o.items[0] && o.items[0].font);
  await shot('fx4-calligram-urdu');
  await style('calligram', { maskSource: 'image', threshold: 0.45, text: VERSE, size: 13, color: 'image' }, '#ffffff');
  await shot('fx5-calligram-urdu-cat');

  // Text portrait in Urdu: right to left, joined words
  await style('rows', { text: VERSE, size: 14, color: 'image', sizeMod: true }, '#111113');
  o = await layerOut();
  check('Urdu text portrait sets whole words', o.items.length > 20 && o.items.every((i) => i.s.length > 1), o.n + ' words');
  await shot('fx6-portrait-urdu');

  // Spiral: start outside, anticlockwise, start and end radius, handles
  await style('spiral', { text: 'stay curious and kind', start: 'outside', turn: 'ccw', r0: 0.1, r1: 0.8, color: 'image' }, '#ffffff');
  o = await layerOut();
  check('spiral from the outside draws', o.n > 300, o.n + ' letters');
  const hs = await S(() => { const A = window.__sungfluence; const g = A.artGeom(); return A.guideHandles(A.guideLayer(), g, 1).map((h) => h.id); });
  check('spiral shows center, start and end handles', ['s-move', 's-start', 's-end'].every((x) => hs.includes(x)), hs.join(','));
  await shot('fx7-spiral-outside-ccw');
  await style('spiral', { text: VERSE, path: 'rings', start: 'inside', turn: 'auto', r0: 0, r1: 1, spacing: 16, color: 'ink', inkColor: '#14213d' }, '#f3efe6');
  o = await layerOut();
  check('Urdu rings keep words whole', o.items.every((i) => i.s.length > 1 || /[؀-ۿ]/.test(i.s)) && o.items[0].font === 'nastaliq', o.n + ' words');
  await shot('fx8-rings-urdu');

  // Fade shapes on Typewriter: oval, turned band, and dragging a handle
  for (const [focus, extra, name] of [['ellipse', { fr: 0.75, fs: 0.5, fe: 0.7 }, 'oval'], ['circle', { fr: 0.8, fs: 0.4 }, 'circle'], ['vertical', { fr: 0.45, fs: 0.3, fa: 30 }, 'band-turned']]) {
    await style('typewriter', Object.assign({ focus }, extra), '#f3efe6');
    await S(() => { window.__sungfluence.ui.open.focus = true; window.__sungfluence.buildPanel(); });
    await p.waitForTimeout(150);
    await shot('fx9-typewriter-' + name);
  }
  const before = await S(() => window.__sungfluence.curLayer().fr);
  const hp = await S(() => {
    const A = window.__sungfluence, g = A.artGeom(), c = A.canvas.getBoundingClientRect(), k = c.width / g.TW;
    const h = A.guideHandles(A.guideLayer(), g, k).find((x) => x.id === 'f-size');
    return { x: c.left + h.at[0] * k, y: c.top + h.at[1] * k };
  });
  await p.mouse.move(hp.x, hp.y); await p.mouse.down(); await p.mouse.move(hp.x, hp.y - 60, { steps: 6 }); await p.mouse.up();
  await wait(p);
  const after = await S(() => window.__sungfluence.curLayer().fr);
  check('dragging the size handle changes the fade', after > before + 0.05, before.toFixed(2) + ' to ' + after.toFixed(2));

  // letter opacity, italic, ink swap
  await style('rows', { text: 'whiskers sunbeam purr', alpha: 0.6, alphaTone: 0.5, italic: true, color: 'image', limitColors: 3, inkSwap: ['#ff0000'] }, '#111113');
  o = await layerOut();
  check('letter opacity reaches the letters', o.minA < 0.5, o.minA.toFixed(2));
  check('italic reaches the letters', o.items.every((i) => i.italic));
  check('a swapped ink is used', o.palette && o.palette[0] === '#ff0000' && o.fills.includes('#ff0000'), o.palette && o.palette.join(' '));
  check('the photo gives a color palette', (await S(() => window.__sungfluence.photoPalette().length)) >= 3);

  // plugins live in the Plugins window and in Extra effects, not in the side panel
  check('no Plugins section in the side panel', await S(() => !Array.from(document.querySelectorAll('#panel .sec-t')).some((e) => e.textContent === 'Plugins')));
  check('Extra effects lists the plugin styles', await S(() => { const x = document.getElementById('extraTiles'); return !!x && /Confetti/.test(x.textContent) && /Contours/.test(x.textContent); }));
  await p.click('#pluginsBtn'); await p.waitForTimeout(200);
  check('the Plugins button opens the plugin window', await S(() => !document.getElementById('dlgScrim').hidden && document.getElementById('dlgTitle').textContent === 'Plugins'));
  await shot('fx10-plugins-window');
  await p.keyboard.press('Escape');
  await S(() => { document.getElementById('dlgScrim').hidden = true; });
  await S(() => window.__sungfluenceMenu('plugins')); await p.waitForTimeout(150);
  check('the desktop menu command opens the plugin window', await S(() => !document.getElementById('dlgScrim').hidden));
  await S(() => { document.getElementById('dlgScrim').hidden = true; });
  check('the template is not loaded as a style', await S(() => !window.Sungfluence.plugins().some((x) => x.def.id === 'my-scatter')));

  // Help: F1 opens it offline, pages link to each other, search finds pages, pictures load
  await p.keyboard.press('F1'); await p.waitForTimeout(300);
  check('F1 opens Help', await S(() => !document.getElementById('dlgScrim').hidden && document.getElementById('dlgTitle').textContent === 'Help'));
  check('Help lists every page', (await S(() => document.querySelectorAll('.help-item').length)) >= 12);
  await p.click('.help-content a[href="#help:getting-started"]'); await p.waitForTimeout(400);
  check('a link opens another help page', await S(() => /Getting started/.test(document.querySelector('.help-content h1').textContent)));
  check('help pictures load', await S(() => { const im = document.querySelector('.help-content img'); return !!im && im.complete && im.naturalWidth > 100; }));
  await p.fill('.help-nav input[type=search]', 'nastaliq'); await p.waitForTimeout(200);
  check('help search finds the Urdu page', await S(() => Array.from(document.querySelectorAll('.help-item')).some((b) => /Urdu/.test(b.textContent))));
  await p.screenshot({ path: __dirname + '/out/fx11-help.png' });
  check('the style reference lists every style', await S(() => ['Calligram', 'Typewriter', 'Confetti', 'Focus and fade'].every((t) => HELP.pages.styles.html.includes(t))));
  await p.keyboard.press('Escape');

  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(failed ? failed + ' check(s) failed' : 'all effect checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
