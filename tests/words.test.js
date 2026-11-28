// Word weights, filler words, the Shuffle button, and the ready sets of colours.
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
  // white paper: Apply text art starts the flagship Word cloud on warm black, and these checks read colors on white
  await A(() => { window.__sungfluence.doc.out.paper = '#ffffff'; });
  const use = async (mode, over) => {
    await A(([m, o]) => { const S = window.__sungfluence; if (!S.doc.text.applied) { S.applyTextArt(); S.doc.out.paper = '#ffffff'; } S.usePluginStyle(m); Object.assign(S.curLayer(), o); S.setView('text'); S.scheduleText(0); }, [mode, over]);
    await wait(p);
  };
  const byWord = () => A(() => {
    const t = window.__sungfluence.out.layers[0].items.filter((i) => i.t === 'text'), m = {};
    t.forEach((i) => { m[i.s] = m[i.s] || { n: 0, max: 0 }; m[i.s].n++; m[i.s].max = Math.max(m[i.s].max, i.size); });
    return m;
  });

  // a word given a number comes out bigger and more often, in Word mosaic too
  await use('mosaic', { words: 'alpha: 6\nbeta\ngamma\ndelta', maxSize: 80, minSize: 10, order: 'random', upper: false, color: 'ink', inkColor: '#14213d' });
  const w = await byWord();
  const rest = Object.keys(w).filter((k) => k !== 'alpha');
  check(w.alpha && rest.every((k) => w.alpha.max >= w[k].max), 'Word mosaic: the word given ": 6" is the biggest (' + Math.round(w.alpha.max) + ' px)');
  check(rest.every((k) => w.alpha.n >= w[k].n), 'and it is placed most often (' + w.alpha.n + ' times)');

  // filler words
  await use('mosaic', { words: 'the\nand\nof\nriver\nbridge\nstone', skipFiller: false, order: 'seq' });
  const withAll = await byWord();
  await use('mosaic', { skipFiller: true });
  const without = await byWord();
  check(withAll.the && !without.the && !without.and, 'filler words such as "the" and "and" are left out when asked');
  check(without.river && without.bridge, 'and the real words stay');
  const urdu = await A(() => {
    const S = window.__sungfluence;
    return { filler: S.isFiller ? null : null, a: 1 };
  });
  await use('mosaic', { words: 'اور\nکا\nدریا\nپل', skipFiller: true, upper: false });
  const u = await byWord();
  check(!u['اور'] && !u['کا'] && (u['دریا'] || u['پل']), 'Urdu filler words are known too, and the real words stay');

  // Shuffle
  await use('mosaic', { words: 'alpha\nbeta\ngamma', skipFiller: false, order: 'random', seed: 7 });
  const before = await A(() => { const t = window.__sungfluence.out.layers[0].items; return { seed: window.__sungfluence.curLayer().seed, first: t.length && Math.round(t[0].x) + ',' + Math.round(t[0].y) }; });
  await A(() => window.__sungfluence.runCommand('type.shuffle')); await wait(p);
  const after = await A(() => { const t = window.__sungfluence.out.layers[0].items; return { seed: window.__sungfluence.curLayer().seed, first: t.length && Math.round(t[0].x) + ',' + Math.round(t[0].y) }; });
  check(after.seed !== before.seed, 'Shuffle picks a new variation number (' + before.seed + ' to ' + after.seed + ')');
  check(after.first !== before.first, 'and the words land somewhere else');
  check(await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; S.buildPanel(); const b = document.querySelector('#sec-style .sec-h button[aria-label="Shuffle"]'); return !!b && /Shuffle/.test(b.title) && !!document.querySelector('#sec-style .sec-h button[aria-label="Variations"]'); }), 'the Shuffle and Variations buttons sit in the style header, with names');
  check(await A(() => { const h = document.querySelector('#sec-style .sec-h'); return h.getBoundingClientRect().height < 34 && !document.getElementById('c-seed'); }), 'the style header stays on one line, and there is no Variation slider next to Shuffle');
  await A(() => window.__sungfluence.undo()); await wait(p);

  // ready sets of colours
  const names = await A(() => window.Sungfluence.PALETTE_NAMES);
  check(names.length >= 10, names.length + ' ready sets of colours');
  // Fit colors to the paper (Gentle by default) deepens the pale colors of a set on white paper, so the exact
  // colors are checked with it off, and with Gentle the set still gives just as many inks
  await use('rows', { text: 'sungfluence ', size: 16, color: 'palette', palette: 'Heat', paletteSteps: true, paletteFlip: false, colorFit: 'off' });
  const steps = await A(() => [...new Set(window.__sungfluence.out.layers[0].items.map((i) => String(i.fill).toLowerCase()))].sort());
  check(steps.length === 4 && steps.includes('#9d0208') && steps.includes('#fff3b0'), 'with steps on, only the colours of the set are used: ' + steps.join(' '));
  await A(() => { const S = window.__sungfluence; S.curLayer().colorFit = 'gentle'; S.scheduleText(0); }); await wait(p);
  const fitted = await A(() => [...new Set(window.__sungfluence.out.layers[0].items.map((i) => String(i.fill).toLowerCase()))].sort());
  check(fitted.length === 4 && fitted.includes('#9d0208'), 'and fitted to white paper it is still four inks: ' + fitted.join(' '));
  await A(() => { const S = window.__sungfluence; S.curLayer().paletteSteps = false; S.scheduleText(0); }); await wait(p);
  const blend = await A(() => [...new Set(window.__sungfluence.out.layers[0].items.map((i) => i.fill))].length);
  check(blend > 50, 'with steps off the set blends across the tones (' + blend + ' shades)');
  await p.locator('#art').screenshot({ path: __dirname + '/out/wd1-palette.png' });
  // turned around
  const firstDark = await A(() => window.Sungfluence.paletteAt({ palette: "Heat" }, 1));
  const flipped = await A(() => window.Sungfluence.paletteAt({ palette: 'Heat', paletteFlip: true }, 1));
  check(firstDark !== flipped, 'turning the set around swaps which end the dark parts use');
  // your own colours
  await A(() => { const S = window.__sungfluence; S.curLayer().paletteColors = ['#000000', '#ff0000']; S.scheduleText(0); }); await wait(p);
  const own = await A(() => [...new Set(window.__sungfluence.out.layers[0].items.map((i) => String(i.fill).toLowerCase()))]);
  check(own.every((f) => /^#[0-9a-f]{6}$/.test(f)) && own.length > 5, 'your own colours are used as the set (' + own.length + ' shades between them)');
  check(await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; S.buildPanel(); return document.querySelectorAll('.pal-chip').length === 2 && !!document.getElementById('c-palette'); }), 'the panel shows the set and lets you change each colour');

  // the word and phrase library: the new sets, and the line that finds one
  const lib = await A(() => {
    const S = window.__sungfluence, W = S.LIB.words, P = S.LIB.phrases;
    const sdg = Object.keys(W).filter((n) => /^SDG \d+: /.test(n));
    const nums = sdg.map((n) => +n.match(/^SDG (\d+)/)[1]).sort((a, b) => a - b);
    return {
      sdg: sdg.length, nums: nums.join(','),
      sdgPhrases: Object.keys(P).filter((n) => /^SDG \d+: /.test(n)).length,
      want: ['Water resources', 'Hydraulics and rivers', 'Flora', 'Fauna'].filter((n) => W[n] && W[n].length > 10 && P[n] && P[n].length),
      river: (W['Hydraulics and rivers'] || []).includes('hydraulic jump'),
      six: (W['SDG 6: Clean water and sanitation'] || [])[0],
      empty: Object.entries(W).filter(([, v]) => !v.length).length + Object.entries(P).filter(([, v]) => !v.length).length,
      dupes: Object.entries(W).filter(([, v]) => new Set(v).size !== v.length).map(([n]) => n),
      fewWords: Object.entries(W).filter(([, v]) => v.length < 25 || v.length > 40).map(([n, v]) => n + ' ' + v.length),
      fewPhrases: Object.keys(W).filter((n) => !P[n] || P[n].length < 10).map((n) => n + ' ' + (P[n] || []).length),
      coffee: (W.Coffee || []).length && (P.Coffee || []).includes('courage, one cup at a time'),
      ungrouped: ['words', 'phrases', 'chars'].flatMap((k) => Object.keys(S.LIB_DEFAULT[k]).filter((n) => S.libGroupOf(k, n) === 'My sets'))
    };
  });
  check(lib.sdg === 17 && lib.nums === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17', 'one word set for each of the 17 UN goals, numbered in order');
  check(lib.sdgPhrases === 17, 'and a phrase set for each of them');
  check(lib.want.length === 4, 'water resources, hydraulics and rivers, flora and fauna all have words and phrases');
  check(lib.river && lib.six === 'clean water', 'the sets hold the right words (hydraulic jump, clean water)');
  check(!lib.empty && !lib.dupes.length, 'no set is empty and none repeats a word' + (lib.dupes.length ? ': ' + lib.dupes.join(', ') : ''));
  check(!lib.fewWords.length, 'every word set has 25 to 40 words' + (lib.fewWords.length ? ': ' + lib.fewWords.join(', ') : ''));
  check(!lib.fewPhrases.length, 'every word set has at least 10 phrases to go with it' + (lib.fewPhrases.length ? ': ' + lib.fewPhrases.join(', ') : ''));
  check(lib.coffee, 'the Coffee set has words and its phrases');
  check(!lib.ungrouped.length, 'every built-in set sits under a heading' + (lib.ungrouped.length ? ': ' + lib.ungrouped.join(', ') : ''));
  const found = await A(() => {
    const S = window.__sungfluence;
    S.openLibrary({ obj: S.curLayer(), key: 'text', kind: 'text', label: 'test' });
    S.libState.find = 'sdg 6'; S.renderLibrary();
    const rows = [...document.querySelectorAll('#library .sets .set button')].map((b) => b.textContent);
    S.libState.find = ''; S.libState.focus = 'Positive'; S.libState.open = {}; S.renderLibrary();
    const heads = () => [...document.querySelectorAll('#library .set-group')];
    const names = heads().map((h) => h.querySelector('.set-group-t').textContent);
    const openNow = heads().filter((h) => h.getAttribute('aria-expanded') === 'true').map((h) => h.querySelector('.set-group-t').textContent);
    const shut = document.querySelectorAll('#library .sets .set').length;
    // open every heading: all sets come back
    let guard = 20; while (guard-- && document.querySelector('#library .set-group[aria-expanded="false"]')) document.querySelector('#library .set-group[aria-expanded="false"]').click();
    const all = document.querySelectorAll('#library .sets .set').length;
    // tick a set: its heading counts it, without rebuilding the list
    const row = [...document.querySelectorAll('#library .set')].find((r) => r.querySelector('button').textContent === 'Coffee');
    const cb = row.querySelector('input'); cb.click();
    const ev = [...document.querySelectorAll('#library .set-group')].find((h) => h.querySelector('.set-group-t').textContent === 'Everyday').querySelector('small').textContent;
    const same = document.activeElement && document.activeElement.getAttribute('aria-label') === 'Use Coffee' && document.querySelector('#library .items .sec-t').textContent === 'Coffee';
    document.activeElement.click();
    // your own set goes under My sets
    S.LIB.words['My set 1'] = ['tea']; S.renderLibrary();
    const mine = [...document.querySelectorAll('#library .set-group-t')].map((t) => t.textContent).includes('My sets');
    delete S.LIB.words['My set 1']; S.libState.open = {}; S.renderLibrary();
    return { rows, all, names, openNow, shut, ev, same, mine, total: Object.keys(S.LIB.words).length };
  });
  check(found.rows.length === 1 && found.rows[0].startsWith('SDG 6'), 'the Find a set line narrows the list to one: ' + found.rows.join(', '));
  check(found.names.join('|') === 'Heart and people|Spirit and mood|Everyday|Nature|Water and rivers|Science and making|UN goals', 'the sets sit under seven headings: ' + found.names.join(', '));
  check(found.openNow.join() === 'Spirit and mood' && found.shut < 10, 'only the heading of the set in view is open (' + found.openNow.join() + ', ' + found.shut + ' rows)');
  check(found.all === found.total, 'opening every heading shows all ' + found.all + ' sets');
  check(found.ev === '1 of 1' && found.same, 'ticking a set counts it in its heading, shows what is in it, and keeps the keyboard on the box');
  check(found.mine, 'your own sets show under My sets');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' word and colour checks failed' : 'all word and colour checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
