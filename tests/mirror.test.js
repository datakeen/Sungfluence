// Mirror: both kinds in one section, mirrored writing that is laid out again so the art still reads as the
// picture, the reading order of each mode, the true mirror of the whole text art, exports and older projects.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } await p.waitForTimeout(250); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
// the rule in DEVELOPMENT.md: aim for 220 ms
const LIMIT = 220;
const MODES = ['letter', 'word', 'line'];

(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href);
  await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => {
    window.__sungfluence.prefs.reveal = 'none';
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ ms: Math.round(e.duration), at: window.__step || '' }))).observe({ entryTypes: ['longtask'] });
  });
  const T0 = Date.now();
  const step = (s) => { if (process.env.MIRROR_TIMES) console.log('  [' + Math.round((Date.now() - T0) / 1000) + ' s] ' + s); return A((s) => { window.__step = s; }, s); };
  await A(() => window.__sungfluence.useSample('cat')); await wait(p);
  await A(() => window.__sungfluence.applyTextArt()); await wait(p);

  // ---- one Mirror section holds both kinds ----
  await step('panel');
  const ui = await A(() => {
    const S = window.__sungfluence;
    S.ui.tab = 'text'; S.ui.open.mirror = true; S.buildPanel();
    const sec = document.getElementById('sec-mirror');
    const sums = [...document.querySelectorAll('#panel summary')].map((q) => q.textContent).filter((t) => /mirror/i.test(t));
    return {
      sec: !!sec, sums,
      writing: !!(sec && sec.querySelector('#c-mirror-l')), across: !!(sec && sec.querySelector('#c-tf-flipX')), updown: !!(sec && sec.querySelector('#c-tf-flipY')),
      notes: sec ? [...sec.querySelectorAll('.note')].map((n) => n.textContent) : []
    };
  });
  check(ui.sec && ui.sums.length === 1 && ui.sums[0].trim() === 'Mirror', 'there is one section named Mirror', JSON.stringify(ui.sums));
  check(ui.writing && ui.across && ui.updown, 'it holds Mirror the writing and both switches for mirroring the whole text art');
  check(ui.notes.length === 2 && /lays the art out again/.test(ui.notes[0]) && /iron-on/.test(ui.notes[1]), 'and a short note on each, so the difference is clear');

  // picking a mode in the section: the art is laid out again, nothing freezes, and undo takes it back
  await step('ui');
  await A(() => { window.__long = []; });
  await p.locator('#sec-mirror .seg button', { hasText: 'Each word' }).click(); await wait(p);
  const picked = await A(() => {
    const S = window.__sungfluence, its = S.out.layers[0].items.filter((q) => q.t === 'text');
    return { mode: S.curLayer().mirror, all: its.length > 0 && its.every((q) => q.mir), sum: [...document.querySelectorAll('#panel summary')].map((q) => q.textContent).find((t) => /mirror/i.test(t)) };
  });
  check(picked.mode === 'word' && picked.all, 'Each word in the panel mirrors every letter of the art');
  check(/\(on\)/.test(picked.sum), 'the section says it is on', picked.sum);
  await p.screenshot({ path: __dirname + '/out/mirror-panel.png' });
  const longUI = await A(() => window.__long.filter((e) => e.at === 'ui'));
  const maxUI = Math.max(0, ...longUI.map((e) => e.ms));
  check(maxUI <= LIMIT, 'changing the mirror never freezes the window', maxUI + ' ms longest task');
  await A(() => window.__sungfluence.undo()); await wait(p);
  check(await A(() => window.__sungfluence.curLayer().mirror) === 'none', 'undo takes it back');

  // the menu commands
  const cmd = await A(() => {
    const S = window.__sungfluence;
    S.runCommand('type.mirror.line'); const line = S.curLayer().mirror;
    const checked = S.COMMANDS.get('type.mirror.line') && S.COMMANDS.get('type.mirror.line').checked();
    S.runCommand('type.mirror.none');
    return { line, checked, back: S.curLayer().mirror, flip: !!S.COMMANDS.get('type.flipH') };
  });
  check(cmd.line === 'line' && cmd.checked && cmd.back === 'none' && cmd.flip, 'Mirror the writing is in the Text art menu next to Mirror the text art', JSON.stringify(cmd));
  await wait(p);

  // ---- the reading order of each mode, and every glyph turned around where it stands ----
  await step('order');
  const order = await A(() => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const L = Object.assign(S.newLayer('rows'), { text: 'whiskers sunbeam purr', size: 30, minInk: -1, sizeMod: false, weightMod: false });
    const read = (m) => {
      const o = C.render(S.thumbSource(), S.sceneFor([Object.assign({}, L, { mirror: m })], 0.4, { flipX: false, flipY: false }));
      const its = o.layers[0].items.filter((q) => q.t === 'text');
      const y0 = its[0].y, row = its.filter((q) => Math.abs(q.y - y0) < 0.5);
      const mid = (q) => q.align === 'center' ? q.x : q.x + C.measure(q.s, q.size, q.weight || 400, q.font || 'sans') / 2;
      return { s: row.map((q) => q.s).join('').toLowerCase(), xs: row.map(mid), mir: its.every((q) => q.mir === 1), none: its.every((q) => !q.mir), svg: C.toSVG(o) };
    };
    const r = {}; for (const m of ['none', 'letter', 'word', 'line']) r[m] = read(m);
    const same = (a, b) => a.xs.length === b.xs.length && a.xs.every((x, i) => Math.abs(x - b.xs[i]) < 0.02);
    return {
      none: r.none.s.slice(0, 19), letter: r.letter.s.slice(0, 19), word: r.word.s.slice(0, 19), line: r.line.s.slice(0, 19),
      flags: r.none.none && r.letter.mir && r.word.mir && r.line.mir,
      letterInPlace: same(r.none, r.letter),
      svgLetter: /scale\(-1 1\)/.test(r.letter.svg) && !/scale\(-1 1\)/.test(r.none.svg),
      // inside the turned-around frame a word is written backwards, so after the turn each letter stands where it was laid out
      draw: C.mirDraw('purr') === 'rrup' && C.mirDraw('اردو') === 'اردو'
    };
  });
  check(order.none === 'whiskerssunbeampurr', 'plain writing reads as typed', order.none);
  check(order.flags, 'every mode marks every glyph as mirrored, and plain writing marks none');
  check(order.letter === order.none && order.letterInPlace, 'Each letter: the order stays and every letter keeps its place');
  check(order.word === 'sreksihwmaebnusrrup', 'Each word: every word reads backwards, the words stay in order', order.word);
  check(order.line === 'rrupmaebnussreksihw', 'Each line: the whole line reads from right to left', order.line);
  check(order.svgLetter && order.draw, 'the SVG turns each mirrored piece around its own middle');

  // on the canvas a mirrored word is the plain word seen in a mirror, letter for letter
  const glyph = await A(() => {
    const C = window.Sungfluence;
    const pic = (it) => {
      const c = document.createElement('canvas'); c.width = 240; c.height = 80;
      C.draw(c.getContext('2d'), { W: 240, H: 80, paper: '#ffffff', layers: [{ items: [it], opacity: 1, effect: 'none' }] }, 1);
      return c.getContext('2d').getImageData(0, 0, 240, 80).data;
    };
    const base = { t: 'text', x: 120, y: 40, size: 48, weight: 700, font: 'sans', fill: '#000000', align: 'center' };
    const plain = pic(Object.assign({}, base, { s: 'RKSP' }));
    // Each word: the word is set backwards, every letter turned around where it stands
    const mir = pic(Object.assign({}, base, { s: 'PSKR', mir: 1, mirX: 120 }));
    let same = 0, diff = 0, ink = 0;
    for (let y = 0; y < 80; y++) for (let x = 0; x < 240; x++) {
      const a = plain[(y * 240 + x) * 4] < 128, b = mir[(y * 240 + (239 - x)) * 4] < 128, c = mir[(y * 240 + x) * 4] < 128;
      if (a) ink++; if (a && b) same++; if (a && c) diff++;
    }
    return { mirrored: same / ink, straight: diff / ink };
  });
  check(glyph.mirrored > 0.9 && glyph.straight < glyph.mirrored - 0.2, 'a mirrored word on the canvas is the plain word seen in a mirror', Math.round(glyph.mirrored * 100) + '% vs ' + Math.round(glyph.straight * 100) + '% straight');

  // marks typed in the text stay on their letters; Urdu and Arabic words stay whole
  const marks = await A(() => {
    const C = window.Sungfluence;
    return {
      bold: C.mirrorText('**bold** cat', 'word', true), color: C.mirrorText('[red]{#c0392b} sun', 'line', true),
      urduWord: C.mirrorText('اردو میں hello', 'word', true), urduLine: C.mirrorText('اردو میں', 'line', true),
      plain: C.mirrorText('3 * 4', 'word', false), letter: C.mirrorText('abc', 'letter', true)
    };
  });
  check(marks.bold === '**dlob** tac' && marks.color === 'nus [der]{#c0392b}', 'bold and colored words keep their marks', marks.bold + ' / ' + marks.color);
  check(marks.urduWord === 'اردو میں olleh' && marks.urduLine === 'میں اردو', 'Urdu words stay whole: only their order turns around on a line', marks.urduWord + ' / ' + marks.urduLine);
  check(marks.plain === '3 * 4' && marks.letter === 'abc', 'text without marks and Each letter are left as they are');

  // Word mosaic and Word cloud read a list of words: each word is turned around, its weight stays
  const words = await A(() => window.Sungfluence.mirrorText !== undefined && (() => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const L = Object.assign(S.newLayer('mosaic'), { words: 'whiskers: 5\nsunbeam\npurr' });
    const o = C.render(S.thumbSource(), S.sceneFor([Object.assign({}, L, { mirror: 'word' })], 0.4, { flipX: false, flipY: false }));
    const set = new Set(o.layers[0].items.filter((q) => q.t === 'text').map((q) => q.s.toLowerCase()));
    return [...set].sort().join(',');
  })());
  check(/sreksihw/.test(words) && /maebnus/.test(words) && !/whiskers/.test(words), 'Word mosaic sets the mirrored words', words);

  // ---- the exports carry the mirrored writing ----
  await step('pdf');
  await A(() => { const S = window.__sungfluence; S.setLayerStyle('rows'); Object.assign(S.curLayer(), { text: 'purr whiskers', mirror: 'word' }); S.scheduleText(0); }); await wait(p);
  const grab = async (id) => {
    const dl = p.waitForEvent('download', { timeout: 120000 });
    await A((id) => { const S = window.__sungfluence, x = S.EXPORTERS.find((e) => e.id === id); S.runExporter(x, S.exporterOpts(x)); }, id);
    const d = await dl; const f = path.join(__dirname, 'out', 'mirror-' + d.suggestedFilename()); await d.saveAs(f); return f;
  };
  const streams = (f) => { const buf = require('fs').readFileSync(f), s = buf.toString('latin1'); let all = s; const re = /stream\r?\n/g; let m; while ((m = re.exec(s))) { const end = s.indexOf('endstream', m.index); try { all += require('zlib').inflateSync(buf.subarray(m.index + m[0].length, end)).toString('latin1'); } catch (e) { /* not compressed */ } } return all; };
  const pdfTurns = (streams(await grab('pdf-cmyk')).match(/q -1 0 0 1 [\d.]+ 0 cm/g) || []).length;
  const letters = await A(() => window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text').length);
  check(pdfTurns > 50, 'the CMYK PDF turns each mirrored letter around in the page', pdfTurns + ' turns, ' + letters + ' letters in the preview');
  const svg = require('fs').readFileSync(await grab('svg-art'), 'utf8');
  check((svg.match(/scale\(-1 1\)/g) || []).length > 50, 'the SVG export carries the mirrored letters');

  // ---- mirrored writing keeps the picture: the art matches the photo as well as the plain art does ----
  await step('corr');
  const corr = async (sample, styles) => {
    await A((k) => window.__sungfluence.useSample(k), sample); await wait(p);
    return A((styles) => {
      const S = window.__sungfluence, C = window.Sungfluence, src = S.thumbSource();
      const G = 48, gh = Math.round(G * src.h / src.w);
      const ph = new Float64Array(G * gh), cnt = new Float64Array(G * gh);
      for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const i = Math.floor(y * gh / src.h) * G + Math.floor(x * G / src.w); ph[i] += src.lum[y * src.w + x]; cnt[i]++; }
      for (let i = 0; i < ph.length; i++) ph[i] /= cnt[i] || 1;
      const r = (a, q) => {
        const ma = a.reduce((s, v) => s + v, 0) / a.length, mq = q.reduce((s, v) => s + v, 0) / q.length;
        let ab = 0, aa = 0, bb = 0;
        for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = q[i] - mq; ab += x * y; aa += x * x; bb += y * y; }
        return ab / Math.sqrt(aa * bb || 1);
      };
      const out = {};
      for (const st of styles) {
        // Calligram fills the dark parts of the photo here; its heart shape would not follow the picture at all
        const base = Object.assign(S.layerInStyle(S.curLayer(), st), st === 'calligram' ? { maskSource: 'image' } : {});
        out[st] = {};
        for (const m of ['none', 'letter', 'word', 'line']) {
          // larger letters keep the test quick: drawing thousands of turned letters is slow in a browser without a GPU
          const o = C.render(src, S.sceneFor([Object.assign({}, base, { mirror: m, textScale: 2 })], 400 / S.doc.out.width, { flipX: false, flipY: false }));
          const c = document.createElement('canvas'); c.width = o.W; c.height = o.H;
          C.draw(c.getContext('2d'), Object.assign({}, o, { transparent: false }), 1);
          const g = document.createElement('canvas'); g.width = G; g.height = gh;
          const gx = g.getContext('2d'); gx.imageSmoothingQuality = 'high'; gx.drawImage(c, 0, 0, G, gh);
          const d = gx.getImageData(0, 0, G, gh).data, art = new Float64Array(G * gh);
          for (let i = 0; i < art.length; i++) art[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
          out[st][m] = r(art, ph);
        }
      }
      return out;
    }, styles);
  };
  const STYLES = ['rows', 'mosaic', 'cloud', 'flow', 'calligram', 'spiral', 'grid'];
  for (const sample of ['cat', 'face']) {
    const res = await corr(sample, sample === 'cat' ? STYLES : ['rows', 'spiral']);
    for (const st of Object.keys(res)) {
      const c = res[st], worst = Math.min(...MODES.map((m) => c[m]));
      const txt = MODES.map((m) => m + ' ' + c[m].toFixed(3)).join(', ') + ' vs plain ' + c.none.toFixed(3);
      check(c.none > 0.2 && MODES.every((m) => c[m] >= c.none - Math.abs(c.none) * 0.05), sample + ', ' + st + ': mirrored art matches the photo within 5% of the plain art', txt);
      void worst;
    }
  }

  // ---- the true mirror still flips the whole art, and both work together ----
  await step('flip');
  const flip = await A(() => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const L = Object.assign({}, S.curLayer(), { mirror: 'word' });
    const o = C.render(S.thumbSource(), S.sceneFor([L], 0.3, { flipX: true }));
    const svg = C.toSVG(o);
    return { flip: o.flipX, group: svg.includes('<g id="flip"'), pieces: /scale\(-1 1\)/.test(svg.replace(/<g id="flip"[^>]*>/, '')), mir: o.layers[0].items.filter((q) => q.t === 'text').every((q) => q.mir) };
  });
  check(flip.flip && flip.group, 'Mirror the whole text art still flips the finished art, in the SVG too');
  check(flip.pieces && flip.mir, 'and it works together with mirrored writing');
  await A(() => window.__sungfluence.runCommand('type.flipH')); await wait(p);
  const flipOn = await A(() => ({ on: window.__sungfluence.doc.text.flipX, sum: [...document.querySelectorAll('#panel summary')].map((q) => q.textContent).find((t) => /mirror/i.test(t)) }));
  check(flipOn.on && /\(on\)/.test(flipOn.sum), 'the menu switch turns it on and the Mirror section says so', flipOn.sum);
  await A(() => window.__sungfluence.runCommand('type.flipH')); await wait(p);

  // ---- older projects open with their mirror settings ----
  await step('old');
  await A(() => { if (!window.__sungfluence.doc.text.applied) window.__sungfluence.applyTextArt(); }); await wait(p);
  const old = await A(async () => {
    const S = window.__sungfluence;
    const data = JSON.parse(JSON.stringify(S.projectData()));
    data.text.flipX = true;
    data.text.layers[0].mirror = 'line';
    delete data.text.layers[0].textScale;
    await S.openProject(data);
    return { flip: S.doc.text.flipX, mirror: S.doc.text.layers[0].mirror, applied: S.doc.text.applied };
  });
  await p.waitForTimeout(1500); await wait(p);
  for (let i = 0; i < 120 && !(await A(() => !!(window.__sungfluence.out && window.__sungfluence.out.layers.length))); i++) await p.waitForTimeout(500);
  await wait(p);
  const oldArt = await A(() => ({ n: window.__sungfluence.out.layers[0].items.length, mir: window.__sungfluence.out.layers[0].items.filter((q) => q.t === 'text').every((q) => q.mir), flip: window.__sungfluence.out.flipX }));
  check(old.flip && old.mirror === 'line' && oldArt.n > 0 && oldArt.mir && oldArt.flip, 'an older project opens with its mirror settings and draws them', JSON.stringify(old));

  // opening a picture has its own limit in photo.test.js, so the long tasks are counted from here, on a fresh layout
  await A(() => { const S = window.__sungfluence; S.doc.text.flipX = false; S.compose(); S.setLayerStyle('rows'); }); await wait(p);
  await step('relayout');
  await A(() => window.__sungfluence.runCommand('type.mirror.word')); await wait(p);
  await A(() => window.__sungfluence.runCommand('type.mirror.letter')); await wait(p);
  const long = await A(() => window.__long.filter((e) => e.at === 'ui' || e.at === 'relayout'));
  const maxLong = Math.max(0, ...long.map((e) => e.ms));
  check(maxLong <= LIMIT, 'no long tasks while the app lays out mirrored writing', maxLong + ' ms longest task');
  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' mirror checks failed' : 'all mirror checks passed');
  process.exit(fails ? 1 : 0);
})();
