// Flipping: the whole Vector layer at once, and the text art layer as a true mirror in every export.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(200); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; window.__sungfluence.useSample('lines'); }); await p.waitForTimeout(1200);
  await A(() => window.__sungfluence.traceNow()); await wait(p);

  // the whole Vector layer at once
  const vec = await A(() => {
    const S = window.__sungfluence, D = S.doc;
    const xs = () => D.lines.paths.flatMap((q) => q.nodes.map((n) => n.x));
    const before = xs(), mid = S.imgSize[0] / 2;
    S.flipVectorLayer('x');
    const after = xs();
    const ok = before.every((v, i) => Math.abs(after[i] - (2 * mid - v)) < 0.51);
    S.flipVectorLayer('x');
    const back = xs();
    return { paths: D.lines.paths.length, ok, same: before.every((v, i) => Math.abs(back[i] - v) < 0.51) };
  });
  check(vec.paths > 2, vec.paths + ' traced lines to flip');
  check(vec.ok, 'every point is mirrored around the middle of the picture');
  check(vec.same, 'flipping again puts it back exactly');

  // a shape on the Vector layer travels with the lines
  const obj = await A(() => {
    const S = window.__sungfluence;
    S.ui.objLayer = 'lines'; S.quickAdd('rect');
    const o = S.doc.objects[S.doc.objects.length - 1];
    o.x = 10; o.w = 100; o.rot = 0.3;
    const mid = S.imgSize[0] / 2;
    S.flipVectorLayer('x');
    return { x: o.x, want: 2 * mid - 110, flipX: o.flipX, rot: o.rot };
  });
  check(Math.abs(obj.x - obj.want) < 0.51 && obj.flipX && Math.abs(obj.rot + 0.3) < 1e-6, 'a shape on the layer is mirrored too, and its own turn is mirrored with it');
  await A(() => { const S = window.__sungfluence; S.doc.objects.length = 0; S.ui.selObjs = []; S.flipVectorLayer('x'); }); await wait(p);

  // the text art layer: a true mirror
  await A(() => { const S = window.__sungfluence; S.applyRecipe(S.RECIPES.find((r) => r.name === 'Word portrait')); }); await wait(p);
  const mirror = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const scene = S.sceneFor(S.activeLayers(), 0.25);
    const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
    const o1 = C.render(S.thumbSource(), Object.assign({}, scene, { flipX: false }));
    const o2 = C.render(S.thumbSource(), Object.assign({}, scene, { flipX: true }));
    const c1 = mk(o1.W, o1.H), c2 = mk(o2.W, o2.H);
    C.draw(c1.getContext('2d'), o1, 1, { forcePaper: true });
    C.draw(c2.getContext('2d'), o2, 1, { forcePaper: true });
    const a = c1.getContext('2d').getImageData(0, 0, o1.W, o1.H).data;
    const bq = c2.getContext('2d').getImageData(0, 0, o2.W, o2.H).data;
    let same = 0, n = 0, straightSame = 0;
    for (let y = 0; y < o1.H; y += 3) for (let x = 0; x < o1.W; x += 3) {
      const i = (y * o1.W + x) * 4, j = (y * o1.W + (o1.W - 1 - x)) * 4;
      n++;
      if (Math.abs(a[i] - bq[j]) < 26) same++;
      if (Math.abs(a[i] - bq[i]) < 26) straightSame++;
    }
    // the items themselves are untouched: the mirror happens when it is drawn, so every export shares it
    const x1 = o1.layers[0].items[0].x, x2 = o2.layers[0].items[0].x;
    return { same: same / n, straightSame: straightSame / n, items: x1 === x2, svg: C.toSVG(o2).includes('id="flip"'), svgPlain: C.toSVG(o1).includes('id="flip"') };
  });
  check(mirror.same > 0.92, 'the mirrored picture matches the plain one column for column, the other way round (' + Math.round(mirror.same * 100) + '%)');
  check(mirror.straightSame < mirror.same - 0.1, 'and it is really different from the plain one (' + Math.round(mirror.straightSame * 100) + '% the same straight across)');
  check(mirror.items, 'the drawing list is untouched: the mirror is in the drawing, so every export carries it');
  check(mirror.svg && !mirror.svgPlain, 'the SVG export carries the mirror as one group');

  // the button, the command and the project file
  const ui = await A(() => {
    const S = window.__sungfluence;
    S.runCommand('type.flipH');
    const on = S.doc.text.flipX;
    S.ui.tab = 'text'; S.buildPanel();
    const sum = [...document.querySelectorAll('#panel summary')].map((q) => q.textContent).find((t) => t.includes('Mirror'));
    const saved = JSON.parse(JSON.stringify(S.doc.text)).flipX;
    return { on, sum, saved };
  });
  check(ui.on && ui.saved, 'Mirror the text art across turns on from the menu and is kept with the document');
  check(ui.sum && ui.sum.includes('(on)'), 'the panel section says it is on: ' + ui.sum);
  await wait(p);
  await p.screenshot({ path: __dirname + '/out/f1-mirrored.png' });
  await A(() => window.__sungfluence.runCommand('type.flipH')); await wait(p);
  check(await A(() => !window.__sungfluence.doc.text.flipX), 'and it turns off again');

  // mirroring the writing: the art is laid out again from the mirrored writing, so the picture keeps its shape
  // (tests/mirror.test.js checks the reading order and the likeness to the photo)
  const lvl = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const L = Object.assign({}, S.curLayer(), { text: 'whiskers sunbeam purr', size: 24, mirror: 'none' });
    const read = (v) => {
      const o = C.render(S.thumbSource(), S.sceneFor([Object.assign({}, L, { mirror: v })], 0.3));
      const its = o.layers[0].items.filter((i) => i.t === 'text');
      // where a letter really sits: x is its left edge for a plain item and its middle for a mirrored one
      const mid = (i) => i.align === 'center' ? i.x : i.x + C.measure(i.s, i.size, i.weight || 400, i.font || 'sans') / 2;
      return {
        head: its.slice(0, 8).map((i) => i.s).join(''),
        xs: its.slice(0, 8).map((i) => +mid(i).toFixed(2)),
        lo: Math.min(...its.map(mid)), hi: Math.max(...its.map(mid)),
        mir: its.every((i) => !!i.mir), none: its.every((i) => !i.mir),
        svg: C.toSVG(o).includes('scale(-1 1)')
      };
    };
    const plain = read('none'), letter = read('letter'), word = read('word'), line = read('line');
    return {
      letterSame: letter.head === plain.head && letter.xs.every((x, i) => Math.abs(x - plain.xs[i]) < 0.02),
      letterMir: letter.mir, plainNone: plain.none,
      wordMir: word.mir, wordSpan: Math.abs((word.hi - word.lo) - (plain.hi - plain.lo)) / (plain.hi - plain.lo), wordHead: word.head.toLowerCase(),
      lineMir: line.mir, lineSpan: Math.abs((line.hi - line.lo) - (plain.hi - plain.lo)) / (plain.hi - plain.lo), lineHead: line.head.toLowerCase(),
      svg: letter.svg, svgPlain: plain.svg
    };
  });
  check(lvl.letterSame && lvl.letterMir && lvl.plainNone, 'each letter, where it stands: every letter keeps its place and is turned around on the spot');
  check(lvl.wordMir && lvl.wordHead === 'sreksihw' && lvl.wordSpan < 0.02, 'each word: every word reads backwards, and the writing covers the same ground (span within ' + Math.round(lvl.wordSpan * 1000) / 10 + '%)', lvl.wordHead);
  check(lvl.lineMir && lvl.lineHead === 'rrupmaeb' && lvl.lineSpan < 0.02, 'each line: the whole line reads from right to left, over the same ground', lvl.lineHead);
  check(lvl.svg && !lvl.svgPlain, 'the SVG export carries the mirrored pieces');

  // the vector CMYK PDF mirrors with one matrix in the page: check the PDF library really takes it
  const pdfOk = await A(async () => {
    const J = await window.__sungfluence.jsPDFReady();
    const d = new J({ unit: 'mm', format: [210, 297], compress: false });
    d.internal.write('q -1 0 0 1 200 0 cm'); d.setFontSize(20); d.text('Mirror', 50, 50); d.internal.write('Q');
    const s = d.output();
    return s.includes('-1 0 0 1 200 0 cm');
  });
  check(pdfOk, 'the CMYK PDF can carry the mirror as a matrix in the page');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' flip checks failed' : 'all flip checks passed');
  process.exit(fails ? 1 : 0);
})();
