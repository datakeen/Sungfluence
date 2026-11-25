// Letter size: the number box beside a pixel slider, Flow lines keeping its lines clear of each
// other, and the sharp redraw of the part on screen when zoomed past 100%.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(200); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, colorScheme: 'light', deviceScaleFactor: 2 });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; window.__sungfluence.applyTextArt(); }); await wait(p);

  // ---- Flow lines: the letter size leads and the lines move apart with it ----
  const flow = async (o) => {
    await A((o) => { const S = window.__sungfluence; S.setLayerStyle('flow'); Object.assign(S.curLayer(), o); S.scheduleText(0); }, o);
    await wait(p);
    return A(() => {
      const S = window.__sungfluence, it = S.out.layers[0].items, k = S.previewScale();
      const sizes = it.map((q) => q.size / k);
      return { n: it.length, max: Math.round(Math.max.apply(null, sizes)) };
    });
  };
  const small = await flow({ size: 11, autoSpace: true, lineGap: 1.1 });
  const big = await flow({ size: 44, autoSpace: true, lineGap: 1.1 });
  check(Math.abs(big.max - 44) <= 2, 'the letter size is a size in pixels, not a multiple', big.max);
  check(big.n < small.n / 5, 'bigger letters mean far fewer of them, so the picture does not fill in', small.n + ' to ' + big.n);
  const tight = await flow({ size: 44, autoSpace: false, spacing: 12 });
  check(tight.n > big.n * 3, 'with the lines kept at a fixed spacing the letters pile up again', tight.n);
  const wide = await flow({ size: 44, autoSpace: true, lineGap: 2.2 });
  check(wide.n < big.n, 'more room between the lines means fewer letters still', wide.n);

  // a size far above the top of the slider is honoured
  const huge = await flow({ size: 240, autoSpace: true, lineGap: 1.1 });
  check(huge.max > 200, 'a size typed well above the slider is used', huge.max);

  // ---- a project saved before this change keeps its look ----
  const mig = await A(() => window.__sungfluence.newLayer('flow', { scale: 2, spacing: 20 }));
  check(mig.size === 40 && mig.autoSpace === false, 'an old layer keeps its letter size and its own spacing', mig.size + ' px, autoSpace ' + mig.autoSpace);
  const fresh = await A(() => window.__sungfluence.newLayer('flow', {}));
  check(fresh.size === 15 && fresh.autoSpace === true, 'a new layer starts with the lines kept clear', fresh.size + ' px');

  // ---- the number box ----
  await A(() => { const S = window.__sungfluence; S.setLayerStyle('flow'); S.curLayer().size = 11; S.buildPanel(); });
  const box = await p.locator('#c-size-n').first();
  check(await box.getAttribute('type') === 'number', 'the letter size has a box to type in');
  check(+(await box.getAttribute('max')) >= 400, 'the box goes well past the top of the slider', await box.getAttribute('max'));
  await box.fill('120');
  await p.waitForTimeout(400); await wait(p);
  check(await A(() => window.__sungfluence.curLayer().size) === 120, 'typing a size sets it');
  check(await A(() => window.__sungfluence.out.layers[0].items.length) > 0, 'the picture is drawn at the typed size');

  // ---- the sharp redraw when zoomed in ----
  // letters everywhere, so the middle of the picture has edges to compare (the coffee cup is pale)
  await A(() => { Object.assign(window.__sungfluence.curLayer(), { size: 11, minInk: 0 }); window.__sungfluence.scheduleText(0); }); await wait(p);
  await A(() => window.__sungfluence.setView('text'));
  check(await A(() => document.getElementById('crisp').hidden), 'at Fit there is nothing to sharpen');
  await A(() => window.__sungfluence.setZoom(4));
  await p.waitForTimeout(800); await wait(p);
  const z = await A(() => {
    const c = document.getElementById('crisp'), a = document.getElementById('art');
    const cr = c.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return { hidden: c.hidden, w: c.width, h: c.height, inside: cr.left >= ar.left - 1 && cr.top >= ar.top - 1 && cr.right <= ar.right + 1, zoom: window.__sungfluence.displayZoom() };
  });
  check(!z.hidden, 'zoomed past 100% the part on screen is drawn again', Math.round(z.zoom * 100) + '%');
  check(z.inside, 'the sharp redraw sits exactly over the artwork');
  check(z.w > 0 && z.w <= 4096 && z.h <= 4096, 'it is never larger than the window needs', z.w + 'x' + z.h);
  // it is sharper than the same piece of the artwork canvas blown up, which is what it replaces
  const sharp = await A(() => {
    const c = document.getElementById('crisp'), a = document.getElementById('art');
    const w = Math.min(400, c.width), h = Math.min(400, c.height);
    const x0 = Math.floor(c.width / 2 - w / 2), y0 = Math.floor(c.height / 2 - h / 2);
    const k = c.getBoundingClientRect().width / c.width; // css px per crisp px
    const ar = a.getBoundingClientRect(), cr = c.getBoundingClientRect();
    const perArt = ar.width / a.width;
    // the same patch, taken from the artwork canvas and enlarged the way the browser enlarges it
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const tx = t.getContext('2d'); tx.imageSmoothingEnabled = true;
    const ax = ((cr.left - ar.left) + x0 * k) / perArt, ay = ((cr.top - ar.top) + y0 * k) / perArt;
    tx.drawImage(a, ax, ay, w * k / perArt, h * k / perArt, 0, 0, w, h);
    const edge = (cv, sx, sy) => {
      const d = cv.getContext('2d').getImageData(sx, sy, w, h).data;
      let s = 0, n = 0;
      for (let i = 4; i < d.length; i += 16) { s += Math.abs(d[i] - d[i - 4]); n++; }
      return s / n;
    };
    return { crisp: edge(c, x0, y0), art: edge(t, 0, 0) };
  });
  check(sharp.crisp > sharp.art, 'the redraw has harder edges than the enlarged canvas', sharp.crisp.toFixed(1) + ' vs ' + sharp.art.toFixed(1));
  // back to Fit and it goes away again
  await A(() => window.__sungfluence.setZoom('fit'));
  await p.waitForTimeout(500);
  check(await A(() => document.getElementById('crisp').hidden), 'back at Fit it is put away');

  await p.screenshot({ path: __dirname + '/out/size-and-zoom.png' });
  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all size and zoom checks passed');
  process.exit(fails ? 1 : 0);
})();
