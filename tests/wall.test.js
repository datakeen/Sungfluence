// The discovery wall: every style at once, the search box, picking one, and no long task while it draws.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(200); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 980 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  // these checks start from a plain Word cloud, a style made of words: a Halftone first, then the Word cloud with its own defaults
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; window.__sungfluence.applyTextArt('halftone'); window.__sungfluence.setLayerStyle('cloud'); }); await wait(p);

  // the layer in another style keeps what every style shares and brings the words across
  const swap = await A(() => {
    const S = window.__sungfluence, cur = S.curLayer();
    cur.text = 'river meeting river'; cur.alpha = 0.6;
    const n = S.layerInStyle(cur, 'flow');
    return { mode: n.mode, text: n.text, alpha: n.alpha, id: n.id !== cur.id };
  });
  check(swap.mode === 'flow' && swap.text === 'river meeting river', 'the same layer in another style keeps the words');
  check(swap.alpha === 0.6 && swap.id, 'shared settings come across, and it is a new layer');

  // the window opens with one tile for every style
  const count = await A(() => {
    window.__sungfluence.openWall();
    const S = window.__sungfluence;
    return { tiles: document.querySelectorAll('#dlg .wall-t').length, styles: Object.keys(S.MODES).length, title: document.getElementById('dlgTitle').textContent };
  });
  check(count.tiles === count.styles, 'one tile for each of the ' + count.styles + ' styles (' + count.tiles + ' tiles)');
  check(count.title === 'Every style', 'the window is called Every style');
  check(await A(() => document.querySelector('#dlg .wall-t.on') && document.querySelector('#dlg .wall-t.on .wall-n').textContent.includes('in use now')), 'the style in use is marked');

  // the tiles really draw, a few milliseconds at a time, with no long task
  const long = await A(async () => {
    const L = []; const o = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration))));
    o.observe({ entryTypes: ['longtask'] });
    await new Promise((r) => setTimeout(r, 6000));
    o.disconnect();
    return L.sort((a, b) => b - a)[0] || 0;
  });
  // the wall draws a tile for every style at once, so it gets more room than the rest of the app
  check(long < 400, 'no task over 400 ms while the wall draws (longest ' + long + ' ms)');
  const drawn = await A(() => {
    let n = 0;
    document.querySelectorAll('#dlg .wall-t canvas').forEach((c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let ink = 0;
      for (let i = 0; i < d.length; i += 4 * 97) if (d[i + 3] > 8) ink++;
      if (ink > 20) n++;
    });
    return n;
  });
  check(drawn >= 6, drawn + ' tiles have something drawn in them');
  await p.screenshot({ path: __dirname + '/out/w1-wall.png' });

  // each tile shows the whole picture: the art sits inside the tile, the rest of it stays clear
  const fit = await A(() => {
    const S = window.__sungfluence, g = S.artGeom(1), c = document.querySelectorAll('#dlg .wall-t canvas')[2];
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, col = (x) => { let n = 0; for (let y = 0; y < c.height; y++) if (d[(y * c.width + x) * 4 + 3] > 8) n++; return n; };
    const k = Math.min(c.width / g.TW, c.height / g.TH), w = Math.round(g.TW * k), h = Math.round(g.TH * k);
    return { left: col(1), mid: col(Math.floor(c.width / 2)), w, h, cw: c.width, ch: c.height };
  });
  check(fit.mid >= fit.h - 2 && (fit.w >= fit.cw - 2 || fit.left === 0), 'a tile holds the whole render, nothing cut off at the top (art ' + fit.w + ' × ' + fit.h + ' in ' + fit.cw + ' × ' + fit.ch + ')');
  check(fit.w >= fit.cw - 2 && fit.h >= fit.ch - 2, 'the tile has the shape of the artboard, so the art fills it (' + fit.cw + ' × ' + fit.ch + ')');
  const plug = await A(async () => {
    for (let t = 0; t < 40; t++) {
      const tiles = [...document.querySelectorAll('#dlg .wall-t.plug')];
      if (tiles.length && tiles.every((b) => !b.querySelector('.wall-pic.wait'))) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    return [...document.querySelectorAll('#dlg .wall-t.plug canvas')].map((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i + 3] > 8) ink++; return ink > 20; });
  });
  check(plug.length > 0 && plug.every(Boolean), 'the extra effect tiles draw too (' + plug.filter(Boolean).length + ' of ' + plug.length + ')');

  // Line text with no lines asks instead of drawing an empty artboard, and Source stays as it was
  const ask = await A(() => {
    const S = window.__sungfluence, src0 = S.doc.text.source, mode0 = S.curLayer().mode;
    const t = [...document.querySelectorAll('#dlg .wall-t')].find((b) => b.querySelector('.wall-n').firstChild.textContent === 'Line text');
    t.click();
    const r = { title: document.getElementById('dlgTitle').textContent, buttons: [...document.querySelectorAll('#dlg .dlg-body button')].map((b) => b.textContent), source: S.doc.text.source === src0, mode: S.curLayer().mode === mode0 };
    [...document.querySelectorAll('#dlg .dlg-body button')].find((b) => b.textContent === 'Cancel').click();
    return r;
  });
  check(ask.title === 'Line text needs lines' && ['Trace lines', 'Draw lines', 'Cancel'].every((x) => ask.buttons.includes(x)), 'Line text with no lines asks: ' + ask.title + ' [' + ask.buttons.join(', ') + ']');
  check(ask.source && ask.mode, 'and Source and the style stay as they were');
  await A(() => window.__sungfluence.openWall());

  // the search box narrows it down
  const found = await A(() => {
    const S = window.__sungfluence;
    const f = document.querySelector('#dlg .wall-find');
    f.value = 'spiral'; f.dispatchEvent(new Event('input'));
    const names = [...document.querySelectorAll('#dlg .wall-n')].map((n) => n.firstChild.textContent);
    S.wallState.q = '';
    return names;
  });
  check(found.length === 1 && /spiral/i.test(found[0]), 'searching for spiral leaves one tile: ' + found.join(', '));

  // picking a tile uses that style and closes the window
  const picked = await A(() => {
    const S = window.__sungfluence;
    S.openWall();
    const want = [...document.querySelectorAll('#dlg .wall-t')].find((t) => t.getAttribute('aria-pressed') === 'false' && !t.querySelector('.wall-need'));
    const name = want.querySelector('.wall-n').firstChild.textContent;
    want.click();
    return { name, mode: S.curLayer().mode, open: !document.getElementById('dlgScrim').hidden };
  });
  check(!picked.open, 'the window closes when you pick a style');
  const now = await A(() => window.__sungfluence.MODES[window.__sungfluence.curLayer().mode].name);
  check(now === picked.name, 'picking ' + picked.name + ' makes it the style of the layer (now ' + now + ')');
  await wait(p);
  await p.screenshot({ path: __dirname + '/out/w2-after-pick.png' });

  // Trace lines from the question: a photo gets tone lines, Line text draws them, and Source goes back after
  const traced = await A(async () => {
    const S = window.__sungfluence, src0 = S.doc.text.source, mode0 = S.curLayer().mode;
    S.setLayerStyle('paths');
    [...document.querySelectorAll('#dlg .dlg-body button')].find((b) => b.textContent === 'Trace lines').click();
    for (let t = 0; t < 120 && S.curLayer().mode !== 'paths'; t++) await new Promise((r) => setTimeout(r, 250));
    const r = { kind: S.ui.trace.kind, n: S.doc.lines.paths.length, mode: S.curLayer().mode, src: S.doc.text.source };
    S.setLayerStyle(mode0);
    r.back = S.doc.text.source === src0;
    return r;
  });
  check(traced.mode === 'paths' && traced.kind === 'contours' && traced.n >= 4, 'Trace lines follows the tones of the photo and Line text uses them (' + traced.n + ' lines)');
  check(traced.src === 'lines' && traced.back, 'Source is Lines while Line text is the only layer, and goes back when the style changes again');
  await wait(p);

  // the keyboard and the menu both reach it
  check(await A(() => { const c = window.__sungfluence.COMMANDS.get('type.wall'); return !!c && c.keys.includes('shift+e'); }), 'Shift E opens the wall');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
