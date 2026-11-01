// Takes the screenshots for the Getting started guide (docs/help/img). Run after the app looks different:
//   npm run build && npm run help:shots && npm run build
// Needs Playwright (a dev dependency), like the tests.
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('../tests/browser');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'docs', 'help', 'img');
const wait = async (p) => { await p.waitForTimeout(300); while (await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length)) await p.waitForTimeout(100); await p.waitForTimeout(400); };

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1360, height: 820 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  // a returning visitor: no welcome message in the pictures
  await p.addInitScript(() => { try { localStorage.setItem('sungfluence-prefs-v1', JSON.stringify({ welcomed: true })); } catch (e) { /* ignore */ } });
  await p.goto(require('url').pathToFileURL(path.join(root, 'src', 'index.html')).href);
  await p.waitForTimeout(2500);
  const shot = async (name) => { await p.screenshot({ path: path.join(outDir, name), type: 'jpeg', quality: 78 }); console.log('wrote docs/help/img/' + name); };

  // 1. the start: sample cat and the card that offers text art
  await wait(p);
  await shot('start.jpg');

  // 2. a style: Confetti on light paper, Text art panel scrolled to the style tiles
  await p.evaluate(() => {
    const A = window.__sungfluence;
    A.applyTextArt(); A.doc.out.paper = '#ffffff';
    A.usePluginStyle('plugin:confetti'); A.setView('text'); A.buildPanel(); A.scheduleText(0);
  });
  await wait(p);
  await p.evaluate(() => { const t = document.getElementById('tiles'); if (t) t.scrollIntoView({ block: 'start' }); });
  await p.waitForTimeout(5000); // recipe thumbnails
  await shot('styles.jpg');

  // 3. Focus and fade open, with the shape and its handles on the picture
  await p.evaluate(() => {
    const A = window.__sungfluence;
    A.doc.out.paper = '#f3efe6'; A.setLayerStyle('typewriter');
    Object.assign(A.curLayer(), { focus: 'ellipse', fr: 0.78, fs: 0.45, fe: 0.75, fa: 12 });
    A.ui.open.focus = true; A.buildPanel(); A.scheduleText(0);
  });
  await wait(p);
  await p.evaluate(() => { const d = Array.from(document.querySelectorAll('#panel details summary')).find((s) => /Focus and fade/.test(s.textContent)); if (d) d.scrollIntoView({ block: 'start' }); });
  const box = await p.locator('#canvasWrap').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(300);
  await shot('fade.jpg');

  // 4. the Export menu
  await p.click('#exportBtn');
  await p.waitForTimeout(400);
  await shot('export.jpg');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
