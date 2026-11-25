// Turning the text: the shared controls that turn each letter, word or line in any style.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(80); } await p.waitForTimeout(200); };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 950 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2200);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => window.__sungfluence.useSample('face')); await p.waitForTimeout(1300);
  const use = async (mode, over) => {
    await A(([m, o]) => { const S = window.__sungfluence; if (!S.doc.text.applied) S.applyTextArt(); S.usePluginStyle(m); Object.assign(S.curLayer(), o); S.scheduleText(0); }, [mode, over]);
    await wait(p);
  };
  const stat = () => A(() => {
    const t = window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text');
    const deg = t.map((i) => Math.round((i.rot || 0) * 180 / Math.PI));
    return { n: t.length, angles: [...new Set(deg)].sort((a, b) => a - b), cx: t.reduce((s, i) => s + i.x, 0) / t.length, cy: t.reduce((s, i) => s + i.y, 0) / t.length, longest: Math.max(...t.map((i) => Array.from(i.s).length)) };
  });

  await A(() => { window.__sungfluence.doc.out.paper = '#ffffff'; });
  await use('rows', { turn: 'none', size: 20, color: 'ink', inkColor: '#111113' });
  const plain = await stat();
  check(plain.angles.join() === '0', 'with Turn set to nothing, nothing turns');

  await use('rows', { turn: 'each', turnSet: [0], turnAngle: 45, turnTilt: 0, turnSplit: false });
  const at45 = await stat();
  check(at45.angles.join() === '45', 'an overall turn of 45° turns every piece by 45°');
  // a piece turns about its own middle, so its place on the page moves by less than one letter
  const size = await A(() => { const t = window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text'); return t.reduce((s, i) => s + i.size, 0) / t.length; });
  const moved = Math.hypot(at45.cx - plain.cx, at45.cy - plain.cy);
  check(moved < size, 'every piece turns about its own middle, so nothing flies off (moved ' + moved.toFixed(1) + ' px, one letter is ' + size.toFixed(1) + ' px)');
  await p.locator('#art').screenshot({ path: __dirname + '/out/tn0-turned.png' });

  await use('rows', { turnSet: [-90, 90], turnAngle: 0 });
  const two = await stat();
  check(two.angles.join() === '-90,90', 'only the angles ticked are used: ' + two.angles.join('°, ') + '°');

  await use('rows', { turnSet: [0], turnTilt: 20 });
  const tilt = await stat();
  check(Math.min(...tilt.angles) >= -20 && Math.max(...tilt.angles) <= 20 && tilt.angles.length > 10, 'tilt spreads the angles between ' + Math.min(...tilt.angles) + '° and ' + Math.max(...tilt.angles) + '°');

  // whole words come apart into letters only when asked
  await use('mosaic', { turn: 'each', turnSet: [0], turnAngle: 30, turnTilt: 0, turnSplit: false });
  const whole = await stat();
  await A(() => { const S = window.__sungfluence; S.curLayer().turnSplit = true; S.scheduleText(0); }); await wait(p);
  const letters = await stat();
  check(whole.longest > 1 && letters.longest === 1 && letters.n > whole.n, 'breaking into letters turns ' + whole.n + ' words into ' + letters.n + ' single letters');
  await p.locator('#art').screenshot({ path: __dirname + '/out/tn1-letters.png' });

  // Urdu and Arabic are never broken up
  await use('rows', { turn: 'each', turnSet: [0], turnAngle: 20, turnSplit: true, text: 'خودی کو بلند کر' });
  const urdu = await A(() => {
    const t = window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text');
    return { n: t.length, single: t.filter((i) => Array.from(i.s).length === 1).length, longest: Math.max(...t.map((i) => Array.from(i.s).length)) };
  });
  check(urdu.longest > 1 && urdu.single < urdu.n * 0.5, 'Urdu words stay whole even when letters are asked for (longest piece ' + urdu.longest + ' letters)');

  // along the picture
  await use('grid', { turn: 'flow', turnAngle: 0, turnTilt: 0, turnSplit: false, cols: 90, text: undefined });
  const flow = await stat();
  check(flow.angles.length > 20, 'along the picture gives every piece its own angle (' + flow.angles.length + ' different ones)');
  check(flow.longest === 1, 'a row of fixed-width characters comes apart so each one can turn');
  await p.locator('#art').screenshot({ path: __dirname + '/out/tn2-flow.png' });

  // the word cloud keeps its own controls
  await use('cloud', { words: 'moon\nstars\nsky', maskSource: 'circle', maxSize: 70, minSize: 10, turn: 'each', turnAngle: 90, rotSet: [0], rotAngle: 0, rotTilt: 0 });
  const cloud = await stat();
  check(cloud.angles.join() === '0', 'the word cloud is left to its own angles, so its packing stays right');
  check(await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; S.buildPanel(); return !document.getElementById('c-turn-l') && !!document.querySelector('#grp-shape #c-rotAngle'); }), 'and the shared Turn controls are hidden for it; Shape holds the turning of the word cloud');
  check(await A(() => { const S = window.__sungfluence; S.usePluginStyle('rows'); S.ui.tab = 'text'; S.buildPanel(); return !!document.querySelector('#grp-shape #c-turn-l') && [...document.querySelectorAll('#panel summary')].some((s) => /^Shape: .*turn/.test(s.textContent)); }), 'every other style shows them, under Shape');

  // it must not freeze
  const lt = await A(() => {
    const L = []; const ob = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration))));
    ob.observe({ entryTypes: ['longtask'] });
    const S = window.__sungfluence;
    S.usePluginStyle('grid');
    Object.assign(S.curLayer(), { turn: 'flow', cols: 200 });
    S.scheduleText(0);
    return new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); ob.disconnect(); res(L.sort((a, b) => b - a).slice(0, 3)); } }, 100); });
  });
  console.log('     longest tasks while turning (ms):', lt.join(', ') || 'none');
  check(!lt.length || lt[0] < 260, 'turning a large grid keeps the window alive (longest ' + (lt[0] || 0) + ' ms)');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' turn checks failed' : 'all turn checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
