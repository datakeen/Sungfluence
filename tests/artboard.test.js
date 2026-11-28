// Canvas size and placing pictures on the artboard: the size you type reaches the exports, a new picture asks
// before it replaces a sized artboard, and a placed picture shows and becomes text art, edge to edge.
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('./browser');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(300); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(150); } await p.waitForTimeout(300); };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  const dialog = () => p.evaluate(() => document.getElementById('dlgScrim').hidden ? '' : document.getElementById('dlg').innerText);
  const press = (label) => p.evaluate((l) => [...document.querySelectorAll('#dlg button')].find((b) => b.textContent === l).click(), label);

  // an ordinary photo: a sample opens at once
  await p.evaluate(() => window.__sungfluence.useSample('coffee')); await wait(p);
  check(!(await dialog()), 'a sample opens at once over an ordinary photo');
  await p.evaluate(() => window.__sungfluence.applyTextArt('cloud')); await wait(p);
  // how much of the outer border of the artboard holds letters (0 to 1), read from the canvas in the Text view
  const border = () => p.evaluate(() => {
    const c = window.__sungfluence.canvas, x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h).data;
    const bg = [d[0], d[1], d[2]]; let ink = 0, n = 0;
    for (let y = 0; y < h; y += 3) for (let xx = 0; xx < w; xx += 3) {
      if (xx > w * 0.12 && xx < w * 0.88 && y > h * 0.12 && y < h * 0.88) continue;
      const i = (y * w + xx) * 4; n++;
      if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 60) ink++;
    }
    return ink / n;
  });
  // the notes that pop up, in order, so a later note cannot hide an earlier one from the test
  await p.evaluate(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('toast'); if (!t.hidden) window.__toasts.push(t.textContent); }).observe(document.getElementById('toast'), { childList: true, subtree: true, characterData: true, attributes: true }); });

  // Canvas size 3500 x 3500 with a clear new area
  await p.evaluate(() => window.__sungfluence.runCommand('image.canvas')); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const i of document.querySelectorAll('#dlg input[type=number]')) { i.value = '3500'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); } });
  await press('Change canvas size'); await wait(p);
  const sized = await p.evaluate(() => { const S = window.__sungfluence, g = S.artGeom(1); return { w: S.doc.out.width, g: [g.TW, g.TH], toast: window.__toasts.join(' | ') }; });
  await p.evaluate(() => window.__sungfluence.setView('text')); await wait(p);
  const small = await border();
  check(sized.w === 3500 && sized.g.join() === '3500,3500', 'Canvas size 3500 × 3500: exports come out at ' + sized.g.join(' × ') + ' px');
  check(/Canvas is 3500 × 3500 px\. Exports come out at 3500 × 3500 px/.test(sized.toast), 'and a note says so: ' + sized.toast);

  // a new picture asks first
  await p.evaluate(() => window.__sungfluence.useSample('coffee')); await p.waitForTimeout(400);
  const ask = await dialog();
  check(/Your artboard is 3500 × 3500 px/.test(ask) && /Place on this artboard/.test(ask) && /Open as a new picture/.test(ask), 'a new picture asks: place it on the 3500 px artboard, or open it on its own');
  await press('Place on this artboard'); await wait(p); await p.waitForTimeout(1500); await wait(p);
  const placed = await p.evaluate(() => {
    const S = window.__sungfluence, o = S.doc.objects[S.doc.objects.length - 1], [iw, ih] = S.imgSize, s = S.src;
    const keepAt = (x, y) => (s.keep ? s.keep[Math.round(y * (s.h - 1)) * s.w + Math.round(x * (s.w - 1))] : 1);
    return { o: o && { layer: o.layer, fit: Math.abs(o.w - iw) < 2 && Math.abs(o.h - ih) < 2 && Math.abs(o.x) < 2 }, corner: keepAt(0.03, 0.03), photo: S.doc.photo.visible, toast: document.getElementById('toast').textContent };
  });
  check(placed.o && placed.o.layer === 'photo' && placed.o.fit, 'the picture sits on the Photo layer, fitted to the artboard');
  check(placed.corner > 0.9 && placed.photo, 'the clear border under it is no longer left out, and the photo shows');
  await p.evaluate(() => window.__sungfluence.setView('text')); await wait(p); await p.waitForTimeout(800); await wait(p);
  const big = await border();
  check(small < 0.02 && big > 0.05, 'text art now reaches the edges of the artboard: letters cover ' + Math.round(big * 100) + '% of the border, against ' + Math.round(small * 100) + '% before');
  await p.screenshot({ path: __dirname + '/out/ab1-placed.png' });
  await p.evaluate(() => window.__sungfluence.undo()); await wait(p);
  check(await p.evaluate(() => window.__sungfluence.doc.objects.length === 0), 'one undo takes the placed picture away');

  // a picture added with Image… on the Vector layer shows, and one click moves it into text art
  await p.evaluate(() => { const S = window.__sungfluence; S.setView('text'); S.doc.lines.visible = false; });
  await p.setInputFiles('body > input[type=file][accept="image/*"]', __dirname + '/images/portrait.jpg'); await p.waitForTimeout(1500); await wait(p);
  const vec = await p.evaluate(() => { const S = window.__sungfluence, o = S.doc.objects[S.doc.objects.length - 1]; return { layer: o && o.layer, shown: S.doc.lines.visible, toast: document.getElementById('toast').textContent }; });
  check(vec.layer === 'lines' && vec.shown && /Use it in text art/.test(vec.toast), 'Image… places on the Vector layer, turns that layer on, and offers to use it in text art');

  // Open as a new picture replaces the artboard, as before
  await p.evaluate(() => window.__sungfluence.useSample('cat')); await p.waitForTimeout(400);
  await press('Open as a new picture'); await wait(p);
  check(await p.evaluate(() => window.__sungfluence.doc.fileName === 'cat.jpg' && window.__sungfluence.doc.objects.length === 0), 'Open as a new picture starts fresh with that picture');
  await p.evaluate(() => window.__sungfluence.useSample('coffee')); await p.waitForTimeout(400);
  check(!(await dialog()), 'and after that, samples open at once again');

  // a blank artboard grows in its own color: no clear border that counts as removed
  await p.evaluate(() => window.__sungfluence.createArtboard({ w: 2000, h: 2000, unit: 'px', bg: '#ffffff', name: 'Square' })); await p.waitForTimeout(400);
  if (await dialog()) await press('Open as a new picture');
  await wait(p);
  await p.evaluate(() => window.__sungfluence.runCommand('image.canvas')); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const i of document.querySelectorAll('#dlg input[type=number]')) { i.value = '3500'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); } });
  await press('Change canvas size'); await wait(p);
  const grown = await p.evaluate(() => { const S = window.__sungfluence; return { rem: S.hasRemoval, blank: S.doc.blank, w: S.doc.out.width }; });
  check(!grown.rem && grown.blank && grown.blank.w === 3500 && grown.w === 3500, 'Canvas size on a white artboard grows it in white, with nothing marked removed');
  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' artboard checks failed' : 'all artboard checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
