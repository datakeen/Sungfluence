// The Text art panel: its order (Look, Words, Size, Color, Background, the folded groups, Layers), one control
// for each setting, short notes with a "?", the recipe grid and its kept pictures, all without freezing.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(80); } await p.waitForTimeout(200); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (ok || extra === undefined ? '' : '  (' + extra + ')')); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    window.__long = [];
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) { /* no long task timing */ }
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2200);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; return window.__sungfluence.useSample('cat'); }); await wait(p);

  // before Apply: the button sits in Look, right above the styles
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; S.buildPanel(); });
  check(await A(() => [...document.querySelectorAll('#sec-look .btn')].some((q) => /Apply text art/.test(q.textContent))), 'before Apply, the Apply text art button sits in Look');

  await A(() => window.__sungfluence.applyTextArt()); await wait(p);
  await A(() => { const S = window.__sungfluence; S.setLayerStyle('rows'); S.ui.tab = 'text'; S.ui.lookTab = 'styles'; S.buildPanel(); }); await wait(p);

  // the order
  const order = await A(() => [...document.querySelectorAll('#panel > .sec, #controls > .sec')].map((s) => s.id || (s.classList.contains('folds') ? 'folds' : s.classList.contains('blend-sec') ? 'blend' : '?')));
  check(order.join() === 'sec-look,sec-style,sec-words,sec-size,sec-color,sec-paper,folds,sec-layers,blend', 'Look, style, Words, Size, Color, Background, the folded groups, Layers, then Layer blending', order.join());
  const folds = await A(() => [...document.querySelectorAll('.folds > details > summary')].map((s) => s.textContent));
  check(/^Mirror/.test(folds[0]) && /^Shape: draw on, fade, turn/.test(folds[1]) && /^Finish: letter fill, effects, see-through/.test(folds[2]) && /^Tone: contrast, brightness, gamma/.test(folds[3]) && folds.length === 4, 'Mirror, Shape, Finish and Tone are folded, in that order', folds.join(' | '));
  check(await A(() => !document.querySelector('#sec-blend-text').open && document.querySelector('#panel > .sec:last-child #sec-blend-text') !== null), 'Layer blending is folded at the very end');

  // the style tiles show without scrolling, in a 1440 x 900 window
  const tiles = await A(() => { const t = document.getElementById('tiles').getBoundingClientRect(), pn = document.getElementById('panel').getBoundingClientRect(); return { t: Math.round(t.bottom), p: Math.round(pn.bottom), top: document.getElementById('panel').scrollTop }; });
  check(tiles.top === 0 && tiles.t <= tiles.p, 'the style tiles are in view without scrolling', JSON.stringify(tiles));
  check(await A(() => { const h = document.querySelector('#sec-look .sec-h'); return [...h.querySelectorAll('button')].some((q) => q.textContent === 'Every style'); }), 'Every style sits beside the tiles, in the Look header');
  const head = await A(() => { const h = document.querySelector('#sec-style .sec-h'); return { h: Math.round(h.getBoundingClientRect().height), names: [...h.querySelectorAll('button')].map((q) => q.getAttribute('aria-label') + ':' + !!q.title) }; });
  check(head.h < 34 && head.names.join() === 'Shuffle:true,Variations:true', 'the style header is one line, with Shuffle and Variations as named icon buttons', JSON.stringify(head));

  // Styles and Recipes are tabs a screen reader can name
  check(await A(() => { const l = document.querySelector('#sec-look [role=tablist]'); const t = [...l.querySelectorAll('[role=tab]')].map((q) => q.textContent + ':' + q.getAttribute('aria-selected')); return t.join() === 'Styles:true,Recipes:false' && document.getElementById('look-panel').getAttribute('role') === 'tabpanel'; }), 'Styles and Recipes are a tab list, with the open tab marked');

  // Variations: the six takes come into view
  await A(() => { document.getElementById('panel').scrollTop = 0; document.querySelector('#sec-style [aria-label=Variations]').click(); });
  await p.waitForTimeout(900);
  const vin = await A(() => { const g = document.querySelector('#varBox .vars').getBoundingClientRect(), pn = document.getElementById('panel').getBoundingClientRect(); return { top: Math.round(g.top), bottom: Math.round(g.bottom), pb: Math.round(pn.bottom) }; });
  check(vin.bottom <= vin.pb + 2, 'Variations scrolls its six takes into view', JSON.stringify(vin));
  await A(() => { const S = window.__sungfluence; document.getElementById('varBox').hidden = true; document.getElementById('panel').scrollTop = 0; S.buildPanel(); }); await wait(p);

  // one control each
  const once = await A(() => ({ seed: !!document.getElementById('c-seed'), lop: !!document.getElementById('c-opacity'), op: document.querySelectorAll('#c-lytext-opacity').length, alpha: !!document.getElementById('c-alpha'), names: [...document.querySelectorAll('#panel .sec-t')].map((s) => s.textContent) }));
  check(!once.seed, 'no Variation slider: Shuffle does that');
  check(!once.lop && once.op === 1 && once.alpha, 'one opacity for the layer in Layer blending, and Letter opacity under Finish', JSON.stringify(once));
  check(!once.names.some((n) => /\(|Paper color/.test(n)) && once.names.includes('Background'), 'the paper setting is called Background', once.names.join(', '));
  await A(() => { const S = window.__sungfluence; S.curLayer().opacity = 0.5; S.buildPanel(); });
  check(await A(() => !!document.querySelector('#grp-finish #c-opacity')), 'a layer that already has its own opacity still shows it, so it can be set back');
  await A(() => { const S = window.__sungfluence; S.curLayer().opacity = 1; S.buildPanel(); });

  // Words and Size
  check(await A(() => !!document.querySelector('#sec-words #c-text') && !!document.querySelector('#sec-words #c-emph') && !!document.querySelector('#sec-words .marks .note-q')), 'the Marks switch and its "?" sit under the text box');
  check(await A(() => document.querySelector('#sec-words .marks > .note').hidden), 'the marks hint waits behind its "?"');
  const size = await A(() => [...document.querySelectorAll('#sec-size input[type=range]')].map((q) => q.id));
  check(size.slice(0, 3).join() === 'c-size,c-leading,c-textScale', 'Size: Letter size, then Line spacing, then Text size', size.join());
  check(await A(() => !!document.querySelector('#sec-size details #c-tracking') && !!document.querySelector('#sec-size details #c-italic') && !!document.querySelector('#sec-size details #c-upper')), 'letter spacing, italic and capitals are under More in Size');

  // short notes
  const notes = await A(() => [...document.querySelectorAll('#panel .note')].filter((n) => n.offsetParent && !n.closest('details:not([open])')).map((n) => ({ t: n.textContent, h: Math.round(n.getBoundingClientRect().height) })));
  const tall = notes.filter((n) => n.h > 40);
  check(!tall.length, 'every open note is one or two short lines; the rest is behind "?"', JSON.stringify(tall));
  const q = await A(() => { const n = document.querySelector('#sec-paper .note .note-q'); const rest = n.closest('.note').querySelector('.note-more'); const was = rest.hidden; n.click(); return [was, rest.hidden, n.getAttribute('aria-expanded')]; });
  check(q.join() === 'true,false,true', 'a "?" opens the rest of its note', q.join());

  // Background: + Custom reads as a button, not one more swatch
  const cust = await A(() => { const l = document.querySelector('#sec-paper .sw-custom'); return l && { text: l.textContent, input: !!l.querySelector('#c-paper'), w: Math.round(l.getBoundingClientRect().width) }; });
  check(cust && /^\+\s*Custom$/.test(cust.text) && cust.input && cust.w > 50, 'the custom paper color is a "+ Custom" pill', JSON.stringify(cust));
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'output'; S.buildPanel(); });
  check(await A(() => !!document.querySelector('#sec-paper .sw-custom #c-paper') && !!document.querySelector('#sec-paper #sw-clear') && document.querySelector('#sec-paper .sec-t').textContent === 'Background'), 'the Output tab has the same Background block');
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; S.buildPanel(); });

  // the "?" puts the rest of a note on its own line, and shows as pressed
  check(await A(() => { const n = document.querySelector('#sec-paper .note .note-q'); const r = n.closest('.note').querySelector('.note-more'); return getComputedStyle(r).display === 'block' && getComputedStyle(n).backgroundColor !== 'rgba(0, 0, 0, 0)'; }), 'an open note shows its rest on a line of its own, and its "?" looks pressed');
  check(await A(() => { const s = document.getElementById('sec-paper'); return s.children[1].classList.contains('note') && s.children[2].classList.contains('swatches'); }), 'the Background note sits under its heading, above the swatches');

  // ink: the color the letters really get is marked, and + Custom stays on the swatch row
  const ink = await A(() => {
    const S = window.__sungfluence, out = {};
    const look = (name) => { const r = document.querySelector('#sec-color .ink-sw'); const sw = [...r.querySelectorAll('.sw[aria-pressed=true]')].map((q) => q.getAttribute('aria-label')); const c = r.querySelector('.sw-custom'); const tops = new Set([...r.children].map((q) => Math.round(q.getBoundingClientRect().top + q.getBoundingClientRect().height / 2))); out[name] = { sw, custom: c.classList.contains('on'), rows: tops.size, fits: r.scrollWidth <= r.clientWidth + 1 }; };
    S.setLayerStyle('spiral'); S.curLayer().inkColor = null; S.buildPanel(); look('null');
    S.curLayer().inkColor = '#1f1d1a'; S.buildPanel(); look('near');
    S.curLayer().inkColor = '#6a2c91'; S.buildPanel(); look('own');
    S.curLayer().color = 'duotone'; S.buildPanel(); out.duo = document.querySelectorAll('#sec-color .photo-sw:not([hidden])').length;
    return out;
  });
  check(ink.null.sw.length === 1 && !ink.null.custom && ink.near.sw.length === 1 && !ink.near.custom, 'an ink with no color of its own, or one too close to tell apart, marks its swatch, not Custom', JSON.stringify(ink));
  check(ink.own.custom && !ink.own.sw.length, 'an ink of its own marks Custom', JSON.stringify(ink.own));
  check([ink.null, ink.near, ink.own].every((o) => o.rows === 1 && o.fits), '+ Custom stays on the swatch row', JSON.stringify(ink));
  check(ink.duo === 0, 'Duotone keeps the photo colors behind a button, so the two inks stay two rows', ink.duo);

  // Word cloud: Words come right after the shape; turning sits under Shape
  const cloud = await A(() => {
    const S = window.__sungfluence; S.setLayerStyle('cloud'); S.buildPanel();
    const style = document.getElementById('sec-style');
    return { inStyle: ['c-rotAngle', 'c-rotTilt', 'c-gradient'].filter((id) => { const e = document.getElementById(id); return e && style.contains(e) && !e.closest('details'); }), turn: !!document.querySelector('#grp-shape #c-rotAngle') && !!document.querySelector('#grp-shape #c-rotTilt'), grad: !!document.querySelector('#sec-style details #c-gradient') };
  });
  check(!cloud.inStyle.length && cloud.turn && cloud.grad, 'Word cloud: turning under Shape, Bigger words under More, so Words come soon', JSON.stringify(cloud));
  await A(() => { const S = window.__sungfluence; S.setLayerStyle('rows'); S.buildPanel(); }); await wait(p);

  // Source shows only once there are lines
  check(await A(() => !document.getElementById('c-ts-source-l')), 'with no lines, there is no Source control');
  await A(() => { const S = window.__sungfluence; S.doc.lines.paths.push({ pts: [[10, 10], [200, 200]], closed: false }); S.buildPanel(); });
  check(await A(() => !!document.querySelector('#sec-layers #c-ts-source-l')), 'with lines, Source sits with the layers');
  await A(() => { const S = window.__sungfluence; S.doc.lines.paths.pop(); S.buildPanel(); });

  // Recipes: every recipe in a two-column grid, pictures kept for the next panel
  await A(() => { window.__long.length = 0; });
  await p.click('[data-look="recipes"]');
  const grid = await A(() => { const cards = [...document.querySelectorAll('#recipes .recipe-card')]; const x = new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left))); return { n: cards.length, cols: x.size, all: window.__sungfluence.RECIPES.length }; });
  check(grid.n === grid.all && grid.cols === 2, 'the Recipes tab shows every recipe in two columns', JSON.stringify(grid));
  const drawn = () => A(() => [...document.querySelectorAll('#recipes canvas')].filter((c) => c.dataset.drawn).length);
  let n1 = 0; const t0 = Date.now();
  while (Date.now() - t0 < 3000) { await p.waitForTimeout(150); n1 = await drawn(); if (n1 >= 3) break; }
  // a new panel in the middle of it: what is drawn shows at once, and the drawing goes on
  const n2 = await A(() => { window.__sungfluence.buildPanel(); return [...document.querySelectorAll('#recipes canvas')].filter((c) => c.dataset.drawn).length; });
  check(n1 > 0 && n2 >= n1, 'a new panel shows the recipe pictures drawn so far at once', n1 + ' then ' + n2);
  let all = 0; const t1 = Date.now();
  while (Date.now() - t1 < 60000) { await p.waitForTimeout(250); all = await drawn(); if (all === grid.all) break; }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  check(all === grid.all, 'all ' + grid.all + ' recipe pictures fill in (' + secs + ' s)', all);
  const again = await A(() => { const S = window.__sungfluence; S.ui.tab = 'output'; S.buildPanel(); S.ui.tab = 'text'; S.buildPanel(); return [...document.querySelectorAll('#recipes canvas')].filter((c) => c.dataset.drawn).length; });
  check(again === grid.all, 'coming back to the Recipes tab shows them all at once, with no new drawing', again);
  const long = await A(() => Math.max(0, ...window.__long));
  check(long <= 220, 'no task over 220 ms while the recipe pictures are drawn', long + ' ms');
  await p.screenshot({ path: __dirname + '/out/panel-recipes.png' });

  // a recipe from the grid
  await p.click('#recipes .recipe-card >> nth=1'); await wait(p);
  check(await A(() => window.__sungfluence.doc.text.layers.length > 0 && document.querySelector('[data-look="recipes"]').getAttribute('aria-selected') === 'true'), 'a recipe applies and the Recipes tab stays open to try the next one');
  // a new artboard width draws new pictures
  await A(() => { const S = window.__sungfluence; S.doc.out.width = 3671; S.buildPanel(); });
  check(await A(() => [...document.querySelectorAll('#recipes canvas')].filter((c) => c.dataset.drawn).length) === 0, 'pictures drawn for another artboard width are not shown');
  await A(() => { const S = window.__sungfluence; S.doc.out.width = 1600; S.ui.lookTab = 'styles'; S.buildPanel(); });

  console.log('errors', JSON.stringify(errs));
  if (errs.length) fails++;
  await b.close();
  console.log(fails ? fails + ' panel checks failed' : 'all panel checks passed');
  process.exit(fails ? 1 : 0);
})();
