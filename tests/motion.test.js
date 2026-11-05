// Letter size in every style, the reveal when text art appears, the compare divider at any angle, and the motion setting.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(200); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => window.__sungfluence.useSample('lines')); await p.waitForTimeout(1000);

  // every style that sets its own letters has a size control
  const missing = await A(() => {
    const S = window.__sungfluence, miss = [];
    Object.entries(S.MODES).forEach(([k, m]) => {
      if (m.plugin) return;
      const keys = (m.controls || []).concat(m.more || []).map((c) => c.key + ':' + c.label);
      const ok = keys.some((s) => /^(size|scale|maxSize|fill|cols):/.test(s));
      if (!ok) miss.push(k);
    });
    return miss;
  });
  check(!missing.length, 'every style has a letter size or columns control' + (missing.length ? ', missing: ' + missing.join(', ') : ''));
  // the Flow lines letter size really changes the letters
  await A(() => { const S = window.__sungfluence; S.prefs.reveal = 'none'; S.applyRecipe(S.RECIPES.find((r) => r.name === 'Engraving')); }); await wait(p);
  const sizeAt = (v) => A(async (v) => { const S = window.__sungfluence; S.curLayer().scale = v; S.scheduleText(0); await new Promise((r) => setTimeout(r, 400)); while (Object.keys(S.jobs).length) await new Promise((r) => setTimeout(r, 50)); const it = S.out.layers[0].items.filter((q) => q.t === 'text'); return it.reduce((n, q) => n + q.size, 0) / it.length; }, v);
  const s1 = await sizeAt(0.95), s2 = await sizeAt(1.6);
  check(s2 > s1 * 1.4, 'Flow lines letter size: average ' + s1.toFixed(1) + ' px at 95%, ' + s2.toFixed(1) + ' px at 160%');
  check(await A(() => { window.__sungfluence.ui.tab = 'text'; window.__sungfluence.buildPanel(); return [...document.querySelectorAll('#panel label')].some((l) => l.textContent === 'Letter size'); }), 'Letter size slider shows in the Flow lines panel');

  // the reveal: letters fly in, then the picture is exactly the finished one
  await A(() => { const S = window.__sungfluence; S.prefs.reveal = 'fly'; S.prefs.motion = 'full'; S.applyRecipe(S.RECIPES[0]); });
  await wait(p);
  const during = await A(() => window.__sungfluence.revealing());
  await p.waitForTimeout(350);
  await p.screenshot({ path: __dirname + '/out/m1-reveal-flying.png' });
  check(during, 'letters fly in after a recipe is applied');
  const lt = await A(async () => { const L = []; const o = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration)))); o.observe({ entryTypes: ['longtask'] }); await new Promise((r) => setTimeout(r, 900)); o.disconnect(); return L.sort((a, b) => b - a)[0] || 0; });
  check(lt < 200, 'no frame over 200 ms while flying (longest ' + lt + ' ms)');
  check(await A(() => !window.__sungfluence.revealing()), 'the reveal finishes on its own');
  await p.screenshot({ path: __dirname + '/out/m2-reveal-done.png' });
  // changing a slider does not replay it
  await A(() => { const S = window.__sungfluence; S.curLayer().size = (S.curLayer().size || 12) + 1; S.scheduleText(0); }); await wait(p);
  check(await A(() => !window.__sungfluence.revealing()), 'moving a slider does not replay the reveal');
  // motion off: no reveal, and the html class is set
  await A(() => { const S = window.__sungfluence; S.prefs.motion = 'off'; S.applyMotion(); S.applyRecipe(S.RECIPES[1]); }); await wait(p);
  check(await A(() => !window.__sungfluence.revealing() && document.documentElement.classList.contains('motion-off')), 'motion off: no reveal, interface keeps still');
  await A(() => { const S = window.__sungfluence; S.prefs.motion = 'full'; S.applyMotion(); });

  // compare at any angle
  await A(() => window.__sungfluence.toggleSplit(true)); await p.waitForTimeout(200);
  for (const [a, name] of [[0, 'up and down'], [90, 'across'], [45, 'slanted']]) {
    await A((a) => { window.__sungfluence.setSplitAngle(a); window.__sungfluence.buildSplitBar(); }, a); await p.waitForTimeout(200);
    const r = await A(() => {
      const c = document.getElementById('art'), x = c.getContext('2d');
      const px = (fx, fy) => Array.from(x.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data).join(',');
      return { tl: px(0.08, 0.08), br: px(0.92, 0.92), t: document.getElementById('splitH').style.transform, side: document.querySelector('.split-side').textContent };
    });
    check(r.tl !== r.br && r.t === 'rotate(' + a + 'deg)', 'compare ' + name + ': two different sides, divider turned (' + r.side + ')');
    await p.screenshot({ path: __dirname + '/out/m3-compare-' + a + '.png' });
  }
  // dragging an across divider moves it up and down
  const before = await A(() => window.__sungfluence.ui.compare.pos);
  await A(() => { window.__sungfluence.setSplitAngle(90); window.__sungfluence.buildSplitBar(); });
  const h = await p.locator('#splitH b').boundingBox();
  await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await p.mouse.down();
  await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2 - 120, { steps: 5 }); await p.mouse.up();
  const after = await A(() => window.__sungfluence.ui.compare.pos);
  check(after < before - 0.05, 'dragging the across divider up moves it up (' + before.toFixed(2) + ' to ' + after.toFixed(2) + ')');
  await A(() => window.__sungfluence.toggleSplit(false));

  // windows open with the rise animation
  await A(() => window.__sungfluence.runCommand('file.export')); await p.waitForTimeout(60);
  const anim = await A(() => getComputedStyle(document.getElementById('dlg')).animationName);
  check(anim === 'rise-in', 'the Export window rises in (' + anim + ')');
  await p.keyboard.press('Escape');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' motion checks failed' : 'all motion checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
