// Marks typed in the text: **bold**, *italic*, __a line under__, ^big^, ~small~, [word]{#colour}, # and > lines.
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
  await A(() => { window.__sungfluence.doc.out.paper = '#ffffff'; });
  const use = async (mode, over) => {
    await A(([m, o]) => { const S = window.__sungfluence; if (!S.doc.text.applied) S.applyTextArt(); S.usePluginStyle(m); Object.assign(S.curLayer(), o); S.setView('text'); S.scheduleText(0); }, [mode, over]);
    await wait(p);
  };
  const look = () => A(() => {
    const it = window.__sungfluence.out.layers[0].items, t = it.filter((i) => i.t === 'text');
    return {
      n: t.length, words: [...new Set(t.map((i) => i.s))].join(' '),
      sizes: [...new Set(t.map((i) => Math.round(i.size)))].sort((a, b) => a - b),
      weights: [...new Set(t.map((i) => i.weight))].sort((a, b) => a - b),
      italic: t.filter((i) => i.italic).length, fills: [...new Set(t.map((i) => String(i.fill).toLowerCase()))],
      rects: it.filter((i) => i.t === 'rect').length
    };
  });

  const base = { size: 34, color: 'ink', inkColor: '#14213d', sizeMod: false, weightMod: false, upper: false };
  await use('rows', Object.assign({ text: 'plain **bold** *slant* ^big^ ~small~ [red]{#c0392b} __under__ ' }, base));
  const m = await look();
  check(!/[*^~[\]{}#]/.test(m.words), 'the marks themselves never reach the artwork: ' + m.words.replace(/\s+/g, ''));
  check(m.weights.length >= 2 && Math.max(...m.weights) >= 700, 'bold makes the letters heavier (' + m.weights.join(', ') + ')');
  check(m.italic > 0, 'italic slants ' + m.italic + ' letters');
  check(m.sizes.length >= 3, 'big and small change the size (' + m.sizes.join(', ') + ' px)');
  check(m.fills.some((f) => f.includes('c0392b')), 'a color in square brackets is used: ' + m.fills.filter((f) => f.includes('c0392b')));
  check(m.rects > 0, 'a line under is drawn as part of the artwork (' + m.rects + ' pieces), so every export carries it');
  await p.locator('#art').screenshot({ path: __dirname + '/out/mk1-marks.png' });

  // an ordinary asterisk is left alone
  await use('rows', Object.assign({ text: '3 * 4 and a_b and 50% ' }, base));
  const lone = await look();
  check(lone.words.includes('*') && lone.words.includes('_'), 'a mark on its own stays an ordinary character: ' + lone.words.replace(/\s+/g, ' '));
  // a backslash keeps a mark as it is
  await use('rows', Object.assign({ text: 'a \\*star\\* here and *real* there ' }, base));
  const esc = await look();
  check(esc.words.includes('*'), 'a backslash keeps a star as a star');
  check(esc.italic > 0, 'and the unescaped pair still slants its words');

  // whole lines
  await use('rows', Object.assign({ text: '# big line\nplain line\n> quoted line' }, base));
  const lines = await look();
  check(lines.sizes.length >= 2 && !lines.words.includes('#') && !lines.words.includes('>'), 'a line starting with # is big and one starting with > is a quote (' + lines.sizes.join(', ') + ' px)');

  // the switch
  await use('rows', Object.assign({ text: 'keep **these** marks ', emph: false }, base));
  const off = await look();
  check(off.words.includes('*'), 'with the marks switched off, they are set as ordinary characters');
  await use('rows', { emph: true });

  // words carry their marks in the word styles too
  await use('mosaic', { words: 'plain\n**heavy**\n[red]{#c0392b}', maxSize: 60, minSize: 14, color: 'ink', inkColor: '#14213d', upper: false });
  const mos = await look();
  check(mos.words.split(' ').includes('heavy') && !mos.words.includes('*'), 'Word mosaic takes the marks off the words: ' + mos.words);
  check(Math.max(...mos.weights) >= 700 && mos.fills.some((f) => f.includes('c0392b')), 'and a heavy word comes out heavy, a colored one colored');
  await use('cloud', { words: 'plain\n**heavy**: 4\nmore', maskSource: 'circle', maxSize: 70, minSize: 12, color: 'ink', inkColor: '#14213d' });
  const cl = await look();
  check(cl.words.includes('heavy') && !cl.words.includes('*') && Math.max(...cl.weights) >= 700, 'Word cloud reads the marks and the ": 4" weight together');

  // Urdu keeps its joined letters
  await use('rows', Object.assign({ text: '**خودی** کو بلند کر ' }, base));
  const urdu = await look();
  check(!urdu.words.includes('*') && urdu.n > 10, 'Urdu text with marks still sets, with the marks removed');

  // the buttons and the keys in the text box
  await A(() => { const S = window.__sungfluence; S.usePluginStyle('rows'); S.curLayer().text = 'one two three'; S.ui.tab = 'text'; S.buildPanel(); });
  await p.waitForTimeout(300);
  const ta = p.locator('#panel textarea').first();
  await ta.click();
  await A(() => { const t = document.querySelector('#panel textarea'); t.setSelectionRange(4, 7); });
  await p.keyboard.press('Control+b');
  await p.waitForTimeout(300);
  check((await ta.inputValue()) === 'one **two** three', 'Ctrl B puts the bold marks around what is selected: ' + await ta.inputValue());
  await p.keyboard.press('Control+b');
  await p.waitForTimeout(300);
  check((await ta.inputValue()) === 'one two three', 'and Ctrl B again takes them away');
  check(await A(() => [...document.querySelectorAll('#panel .mark-btn')].map((b) => b.textContent).join('') === 'BIU'), 'the text box has B, I and U buttons');
  await wait(p);

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' mark checks failed' : 'all mark checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
