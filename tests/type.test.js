// The Type toolbox: Unicode styles, turning them back to plain, marks, symbols, faces, decorations and expansions.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(200); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'light', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);

  // every style has a full table and changes the letters
  const tables = await A(() => {
    const S = window.__sungfluence, bad = [];
    S.TYPE_STYLES.forEach((s) => {
      ['upStr', 'loStr', 'digStr'].forEach((k) => {
        const v = s.spec[k]; if (!v) return;
        const want = k === 'digStr' ? 10 : 26;
        if (Array.from(v).length !== want) bad.push(s.id + '.' + k);
      });
      if (S.styleText('abcdefghijklmnopqrstuvwxyz', s.id, {}) === 'abcdefghijklmnopqrstuvwxyz') bad.push(s.id + ' changes nothing');
    });
    return { bad, n: S.TYPE_STYLES.length };
  });
  check(!tables.bad.length, tables.n + ' styles, every table complete' + (tables.bad.length ? ': ' + tables.bad.join(', ') : ''));

  // the letters Unicode keeps outside the maths block
  const gaps = await A(() => {
    const S = window.__sungfluence;
    return { script: S.styleText('BEFHILMR', 'script', {}), italicH: S.styleText('h', 'italic', {}), frak: S.styleText('CHIRZ', 'fraktur', {}), dbl: S.styleText('CHNPQRZ', 'double', {}) };
  });
  check(gaps.script === 'ℬℰℱℋℐℒℳℛ' && gaps.italicH === 'ℎ' && gaps.frak === 'ℭℌℑℜℨ' && gaps.dbl === 'ℂℍℕℙℚℝℤ', 'the letters that sit elsewhere in Unicode are right (' + gaps.script + ' ' + gaps.frak + ')');

  // back to plain
  const round = await A(() => {
    const S = window.__sungfluence, bad = [];
    S.TYPE_STYLES.forEach((s) => {
      if (s.decorative) return;
      const t = S.styleText('Quick brown fox 42', s.id, {});
      if (S.unstyleText(t).toLowerCase() !== 'quick brown fox 42') bad.push(s.id + ' -> ' + S.unstyleText(t));
    });
    return bad;
  });
  check(!round.length, 'every plain style turns back into plain letters' + (round.length ? ': ' + round.join(' | ') : ''));
  check(await A(() => window.__sungfluence.unstyleText('ʎɐpoʇ ʎddɐɥ') === 'happy today'), 'upside-down text is turned the right way round again');
  check(await A(() => window.__sungfluence.unstyleText('SungFluence') === 'SungFluence'), 'plain text is left exactly as it is');

  // the ways of mixing styles
  const modes = await A(() => {
    const S = window.__sungfluence, o = { styles: ['bold', 'italic'], seed: 3 };
    return { alt: S.styleText('abcd', null, Object.assign({ mode: 'alternate' }, o)), mix: S.styleText('abcdefghij', null, Object.assign({ mode: 'mix' }, o)), one: S.styleText('abcd', 'bold', {}) };
  });
  check(modes.alt === '𝐚𝑏𝐜𝑑', 'alternating takes turns, letter by letter: ' + modes.alt);
  check(/[𝐚-𝐳]/u.test(modes.mix) && /[𝑎-𝑧]/u.test(modes.mix), 'mixed uses both styles: ' + modes.mix);

  // lines and marks, with a limit
  const marks = await A(() => {
    const S = window.__sungfluence;
    const line = S.styleText('ab', 'bold', { line: 'strike' });
    const z = S.styleText('ab', null, { zalgo: { up: true, mid: true, down: true, amount: 1 }, seed: 5 });
    const most = Math.max(...z.split(/(?=[ab])/).map((s) => s.length));
    return { line, marked: /̶/.test(line), z, most };
  });
  check(marks.marked, 'a line through the letters is a mark on each one');
  check(marks.most <= 40, 'marks stay within a sensible limit (most on one letter: ' + (marks.most - 1) + ')');

  // counting honestly
  const counts = await A(() => window.__sungfluence.textCounts(window.__sungfluence.styleText('hello', 'bold', {})));
  check(counts.letters === 5 && counts.points === 5 && counts.units === 10, 'counts 5 letters, 5 characters, 10 units for bold "hello"');

  // the blank box detector
  const blanks = await A(() => ({ bad: window.__sungfluence.blankBoxes('ok \u{10FFFD}\u{10FFFC}').length, good: window.__sungfluence.blankBoxes('plain words').length }));
  check(blanks.bad > 0 && blanks.good === 0, 'the blank box detector finds characters the computer cannot draw (' + blanks.bad + ' found, 0 in plain words)');

  // searching the symbols
  const found = await A(() => {
    const S = window.__sungfluence;
    return { name: (S.glyphSearch('heart') || []).slice(0, 3), star: (S.glyphSearch('arrow*') || []).length, code: S.glyphSearch('U+2665'), ent: S.glyphSearch('&hearts;'), alt: S.glyphSearch('9829'), none: (S.glyphSearch('zzzznothing') || []).length };
  });
  check(found.name.includes('♥') || found.name.includes('❤'), 'search by name finds hearts: ' + found.name.join(' '));
  check(found.star > 5, 'search with a star finds many arrows (' + found.star + ')');
  check(found.code[0] === '♥' && found.ent[0] === '♥' && found.alt[0] === '♥', 'code point, entity and Alt code all find ♥');
  check(found.none === 0, 'a word with no match finds nothing');

  // keyword expansions, in the toolbox and in a real text box
  check(await A(() => window.__sungfluence.expandText('well (shrug) then :heart:') === 'well ¯\\_(ツ)_/¯ then ♥'), 'keywords expand, written either way');
  check(await A(() => window.__sungfluence.expandText('a (nothingatall) b') === 'a (nothingatall) b'), 'a word that is not a keyword is left alone');
  // the text boxes show once a style is chosen
  await A(() => { const S = window.__sungfluence; S.ui.tab = 'text'; if (!S.doc.text.applied) S.usePluginStyle('rows'); S.buildPanel(); });
  await wait(p);
  const ta = p.locator('#panel textarea').first();
  await ta.fill('cats (heart) dogs'); await p.waitForTimeout(300);
  check((await ta.inputValue()) === 'cats ♥ dogs', 'a keyword typed in a panel text box expands there too: ' + await ta.inputValue());
  await wait(p);

  // the window itself
  await A(() => window.__sungfluence.runCommand('type.toolbox')); await p.waitForTimeout(400);
  check(await A(() => !document.getElementById('typeScrim').hidden), 'the Type toolbox opens');
  const tabs = await A(() => {
    const S = window.__sungfluence, out = {};
    ['styles', 'symbols', 'faces', 'decor', 'expand'].forEach((t) => { S.typeState.tab = t; S.renderTypeBox(); out[t] = document.querySelectorAll('.items > *').length; });
    S.typeState.tab = 'styles'; S.renderTypeBox();
    return out;
  });
  check(Object.values(tabs).every((n) => n > 1), 'all five tabs draw something: ' + JSON.stringify(tabs));
  await p.screenshot({ path: __dirname + '/out/ty1-styles.png' });
  check(await A(() => document.querySelectorAll('.type-row').length > 3), 'the style list shows a live sample of your own text');
  check(await A(() => /screen reader/i.test(document.getElementById('typeChecks').textContent)), 'the checks warn about screen readers');

  // favorites
  await A(() => { const s = [...document.querySelectorAll('.type-row .icon-btn')][0]; s.click(); });
  await p.waitForTimeout(200);
  check(await A(() => window.__sungfluence.typeState.favs.length === 1), 'the star keeps a style in favorites');

  // search by drawing
  await A(() => { const S = window.__sungfluence; S.typeState.drawing = true; S.typeState.tab = 'symbols'; S.renderTypeBox(); });
  await p.waitForTimeout(400);
  check(await A(() => !!document.querySelector('canvas.pad')), 'the Symbols tab has a drawing pad');
  const drawn = await A(async () => {
    const S = window.__sungfluence;
    const shot = (fn) => { const a = new Uint8ClampedArray(200 * 200); fn((x, y) => { if (x >= 0 && y >= 0 && x < 200 && y < 200) a[(y | 0) * 200 + (x | 0)] = 255; }); return a; };
    const thick = (put) => (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) put(x + dx, y + dy); };
    const circle = shot((put) => { const t2 = thick(put); for (let a = 0; a < 360; a++) t2(100 + 60 * Math.cos(a * Math.PI / 180), 100 + 60 * Math.sin(a * Math.PI / 180)); });
    const tri = shot((put) => {
      const t2 = thick(put);
      const pts = [[100, 35], [165, 160], [35, 160], [100, 35]];
      for (let i = 0; i < 3; i++) for (let k = 0; k <= 100; k++) t2(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / 100, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / 100);
    });
    const t0 = performance.now();
    const c = S.searchByShape(circle, 200, 200, 12).map((q) => q.ch);
    const ms = Math.round(performance.now() - t0);
    const tr = S.searchByShape(tri, 200, 200, 12).map((q) => q.ch);
    return { c, tr, ms };
  });
  check(drawn.c.some((ch) => '○◯⚪◌☉●⬤'.includes(ch)), 'a drawn circle finds round symbols: ' + drawn.c.slice(0, 6).join(' '));
  check(drawn.tr.some((ch) => '△▲▵∆Δ∧'.includes(ch)), 'a drawn triangle finds triangles: ' + drawn.tr.slice(0, 6).join(' '));
  check(await A(() => { const S = window.__sungfluence; const a = new Uint8ClampedArray(100); return S.searchByShape(a, 10, 10, 5).length === 0; }), 'an empty pad finds nothing');
  await A(() => { const S = window.__sungfluence; S.typeState.drawing = false; S.renderTypeBox(); });

  // stickers: one object for each symbol
  await A(() => { const S = window.__sungfluence; S.typeState.tab = 'symbols'; S.typeState.picked = '★♥◆'; S.renderTypeBox(); });
  await p.waitForTimeout(200);
  const before = await A(() => window.__sungfluence.doc.objects.length);
  await A(() => [...document.querySelectorAll('.sheet-f .btn')].find((b) => /Place each/.test(b.textContent)).click());
  await wait(p);
  const made = await A(() => { const o = window.__sungfluence.doc.objects; return { n: o.length, last3: o.slice(-3).map((q) => q.text).join(''), apart: o.slice(-3).every((q, i, a) => i === 0 || q.x > a[i - 1].x) }; });
  check(made.n === before + 3 && made.last3 === '★♥◆', 'each picked symbol becomes its own object on the canvas');
  check(made.apart, 'and they are laid out in a row, so each can be moved on its own');
  await A(() => window.__sungfluence.undo());
  await wait(p);

  // decorations and dividers mirror for right-to-left
  const deco = await A(() => {
    const S = window.__sungfluence;
    return { both: S.decorate('text', '【', true), div: S.makeDivider('─', 10, '❖'), arrow: S.decorate('go', '→ ', true) };
  });
  check(deco.both === '【text 】', 'a decoration on both sides turns the bracket around: ' + deco.both);
  check(deco.arrow === '→ go ←', 'arrows turn around on the other side: ' + deco.arrow);
  check(/^❖ ─{10} ❖$/.test(deco.div), 'a divider is made to the width asked for: ' + deco.div);

  // sharing it
  await A(() => { const S = window.__sungfluence; S.typeState.where = 'ig-bio'; S.typeState.shareText = 'poet and teacher of rivers  \n\n  water finds a way'; S.typeState.tab = 'share'; S.renderTypeBox(); });
  await p.waitForTimeout(300);
  check(await A(() => document.querySelectorAll('.sets .set').length >= 10 && !!document.querySelector('.share-card')), 'the Sharing tab lists the places and shows a preview');
  check(await A(() => /line.*may be dropped/i.test(document.querySelector('.share-box').textContent)), 'it warns that empty lines and trailing spaces lose the line breaks');
  await A(() => [...document.querySelectorAll('.items .btn')].find((b) => /line breaks stick/.test(b.textContent)).click());
  await p.waitForTimeout(300);
  check(await A(() => window.__sungfluence.breaksWillStick(window.__sungfluence.typeState.shareText)), 'the fix makes the line breaks stick');
  check(await A(() => /should survive/.test(document.querySelector('.share-box').textContent)), 'and the panel says so');
  const counts2 = await A(() => { const S = window.__sungfluence; return { plain: S.countFor('hello', 'x'), wide: S.countFor('日本語', 'x'), chars: S.countFor('日本語') }; });
  check(counts2.plain === 5 && counts2.wide === 6 && counts2.chars === 3, 'X counts wide characters as two: ' + counts2.wide + ' against ' + counts2.chars);
  await A(() => { const S = window.__sungfluence; S.typeState.shareText = 'x'.repeat(200); S.renderTypeBox(); });
  await p.waitForTimeout(250);
  check(await A(() => /50 characters past the limit/.test(document.querySelector('.share-box').textContent)), 'it says how much of an Instagram bio would be cut off');
  await A(() => [...document.querySelectorAll('.items .btn')].find((b) => /Cut it to fit/.test(b.textContent)).click());
  await p.waitForTimeout(250);
  check(await A(() => window.__sungfluence.typeState.shareText.length === 150), 'Cut it to fit brings it to the limit');
  check(await A(() => { const S = window.__sungfluence; return S.fitTo('one two three four five', 12).endsWith('…') && !/thr…/.test(S.fitTo('one two three four five', 12)); }), 'and it cuts at a space, never halfway through a word: ' + await A(() => window.__sungfluence.fitTo('one two three four five', 12)));

  // putting the result in a text box
  await A(() => {
    const S = window.__sungfluence;
    S.typeState.tab = 'styles'; S.typeState.style = 'double'; S.typeState.text = 'Hello';
    S.openTypeBox({ obj: S.curLayer(), key: 'text', kind: 'text', label: 'test' });
    S.typeState.text = 'Hello'; S.typeState.style = 'double';
  });
  await p.waitForTimeout(200);
  await A(() => [...document.querySelectorAll('.sheet-f .btn')].find((b) => /Use for/.test(b.textContent)).click());
  await wait(p);
  check(await A(() => window.__sungfluence.curLayer().text === 'ℍ𝕖𝕝𝕝𝕠'), 'Use for … puts the styled text in the layer: ' + await A(() => window.__sungfluence.curLayer().text));
  check(await A(() => document.getElementById('typeScrim').hidden), 'the window closes after using the text');
  await A(() => window.__sungfluence.undo()); await wait(p);

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' type checks failed' : 'all type checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
