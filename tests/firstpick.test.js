// First pick: Apply text art starts from the flagship Word cloud (see flagship.test.js). A photo with no clear
// shape for it starts in the style picked for that picture: faces, soft and busy photos, subjects that run off
// the frame and fine line patterns get a Halftone of letters, line drawings and flat pictures with several
// subjects a Text portrait, one clear subject with paper around it a Word cloud on white. On every sample, both
// test images and three drawn pictures it checks: the style picked for the picture and why, the first look and
// the card, the same look at 1600 and 3671 px, and for a picture's own style on white paper: that the result
// follows the photo, that it has real contrast (dark darks, light lights), and that a colored subject keeps its
// colors. Also the very first start, on the coffee sample.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path'), fs = require('fs');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 90000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } await p.waitForTimeout(150); };
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
const url = require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href;
// the style picked for each picture, and why; the pictures in FLAG start as the flagship Word cloud instead
// the cat and the rocket are dark subjects full of detail: a Word cloud would keep only their outline, so they
// start in the style picked for them
const FLAG = ['coffee', 'face', 'portrait', 'bread'];
const WANT = {
  coffee: ['halftone', 'ground'], cat: ['halftone', 'fills'], face: ['halftone', 'face'], rocket: ['halftone', 'edge'],
  camera: ['halftone', 'ground'], lines: ['rows', 'lines'], animals: ['rows', 'several'], swirl: ['halftone', 'thin'],
  portrait: ['halftone', 'face'], drawing: ['rows', 'lines'],
  bread: ['cloud', 'subject'], logo: ['cloud', 'subject'], sunset: ['halftone', 'soft']
};
const NAMES = { halftone: 'Halftone', cloud: 'Word cloud', rows: 'Text portrait' };
// drawn pictures: a warm loaf on white, a bold letter A, a sunset with no subject
const DRAWN = {
  bread: (x, W) => { x.fillStyle = '#fff'; x.fillRect(0, 0, W, W); const g = x.createRadialGradient(W * .45, W * .45, 10, W / 2, W / 2, W * .3); g.addColorStop(0, '#e0a46a'); g.addColorStop(1, '#8a5a2b'); x.fillStyle = g; x.beginPath(); x.ellipse(W / 2, W / 2, W * .3, W * .2, 0, 0, 7); x.fill(); },
  logo: (x, W) => { x.fillStyle = '#fff'; x.fillRect(0, 0, W, W); x.fillStyle = '#111'; x.font = 'bold ' + (W * .5) + 'px sans-serif'; x.textAlign = 'center'; x.fillText('A', W / 2, W * .68); },
  sunset: (x, W) => { const g = x.createLinearGradient(0, 0, 0, W); g.addColorStop(0, '#203060'); g.addColorStop(.6, '#f08040'); g.addColorStop(1, '#301810'); x.fillStyle = g; x.fillRect(0, 0, W, W); }
};

// How the drawn text art compares with the photo, on a G by G grid of the rendered letters on white:
// r, how closely the darkness of the art follows the darkness of the photo (1 is a perfect match);
// spread, how much of the photo's contrast the art keeps: how much darker the art is in the darkest tenth of the
// photo than in its lightest tenth, against the same for the photo itself (1 keeps it all);
// deep, how dark the art is in the darkest tenth of the photo, against how dark the photo is there (1 is as dark);
// chroma, how colorful the inked parts of the art are.
const look = (G) => {
  const S = window.__sungfluence, t = S.textCanvas, s = S.src, W = t.width, H = t.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(t, 0, 0);
  const d = x.getImageData(0, 0, W, H).data;
  const art = new Float64Array(G * G), an = new Float64Array(G * G), ph = new Float64Array(G * G), pn = new Float64Array(G * G);
  let chroma = 0, inked = 0;
  for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W; xx += 2) {
    const i = (y * W + xx) * 4, r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, k = 1 - (0.2126 * r + 0.7152 * g + 0.0722 * b);
    const cell = Math.min(G - 1, Math.floor(y / H * G)) * G + Math.min(G - 1, Math.floor(xx / W * G));
    art[cell] += k; an[cell]++;
    if (k > 0.2) { chroma += Math.max(r, g, b) - Math.min(r, g, b); inked++; }
  }
  for (let y = 0; y < s.h; y += 2) for (let xx = 0; xx < s.w; xx += 2) {
    const cell = Math.min(G - 1, Math.floor(y / s.h * G)) * G + Math.min(G - 1, Math.floor(xx / s.w * G));
    ph[cell] += 1 - s.lum[y * s.w + xx]; pn[cell]++;
  }
  for (let g = 0; g < G * G; g++) { art[g] /= Math.max(1, an[g]); ph[g] /= Math.max(1, pn[g]); }
  const m = (a) => a.reduce((t2, v) => t2 + v, 0) / a.length, ma = m(art), mp = m(ph);
  let sab = 0, saa = 0, sbb = 0;
  for (let g = 0; g < G * G; g++) { const a = art[g] - ma, b = ph[g] - mp; sab += a * b; saa += a * a; sbb += b * b; }
  const order = [...Array(G * G).keys()].sort((a, b) => ph[a] - ph[b]), tenth = Math.max(1, Math.round(G * G / 10));
  const avgOf = (list, a) => list.reduce((t2, g) => t2 + a[g], 0) / list.length;
  const sp = (a) => avgOf(order.slice(-tenth), a) - avgOf(order.slice(0, tenth), a);
  return { r: sab / Math.sqrt(saa * sbb || 1), spread: sp(art) / Math.max(0.05, sp(ph)), deep: avgOf(order.slice(-tenth), art) / Math.max(0.05, avgOf(order.slice(-tenth), ph)), chroma: inked ? chroma / inked : 0 };
};

(async () => {
  const b = await launch();
  // ---- the first start: the coffee sample, with the card that offers the first look ----
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(2500); await wait(p);
    const card = await p.evaluate(() => {
      const c = document.getElementById('cta'), r = c.getBoundingClientRect(), a = window.__sungfluence.canvas.getBoundingClientRect();
      return { shown: !c.hidden, text: c.textContent, file: window.__sungfluence.doc.fileName, clear: r.top >= a.bottom - 1, toast: [...document.querySelectorAll('.toast')].some((t) => !t.hidden) };
    });
    check(card.file === 'coffee.jpg' && card.shown && card.text.includes('Suggested: Word cloud.'), 'the first start opens on the coffee sample and offers the flagship Word cloud', card.text.slice(0, 160));
    check(card.clear, 'the card sits below the picture, so the cup is not hidden');
    check(!card.toast, 'the guide hint waits until the card is answered');
    await p.screenshot({ path: __dirname + '/out/firstpick-start.png' });
    await p.click('#cta button'); await p.waitForTimeout(300);
    const during = await p.evaluate(() => ({ photo: window.__sungfluence.doc.photo.visible, busy: !!window.__sungfluence.jobs.text }));
    check(!during.busy || during.photo, 'while the first look is drawn, the photo stays on screen', JSON.stringify(during));
    await wait(p); await p.waitForTimeout(1800); await wait(p);
    const first = await p.evaluate(() => {
      const S = window.__sungfluence, c = document.getElementById('controls'), panel = c.closest('.panel') || c.parentElement;
      return { mode: S.curLayer().mode, paper: S.doc.out.paper, view: S.ui.view, top: c.getBoundingClientRect().top - panel.getBoundingClientRect().top, h: panel.clientHeight, pageY: window.scrollY };
    });
    check(first.mode === 'cloud' && first.paper === '#15120f' && first.view === 'text', 'Apply text art on the card makes it, on warm black paper, and shows it', JSON.stringify(first));
    check(first.top >= 0 && first.top < first.h - 160 && first.pageY === 0, 'the style settings are in view under the tiles, and the page itself does not move', JSON.stringify(first));
    await p.waitForTimeout(2800);
    check(await p.evaluate(() => [...document.querySelectorAll('.toast')].some((t) => !t.hidden && /getting started/.test(t.textContent))), 'then the guide hint shows');
    await p.screenshot({ path: __dirname + '/out/firstpick-start-applied.png' });
    check(!errs.length, 'no page errors at the first start', errs.join(' | '));
    await ctx.close();
  }

  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; });
  for (const k of Object.keys(WANT)) {
    if (k === 'portrait' || k === 'drawing') {
      const f = path.join(__dirname, 'images', k === 'portrait' ? 'portrait.jpg' : 'drawing.png');
      const u = 'data:image/' + (k === 'portrait' ? 'jpeg' : 'png') + ';base64,' + fs.readFileSync(f).toString('base64');
      await A(async ([u, n]) => { const S = window.__sungfluence; await S.loadImageURL(u, n); S.freshImage(); }, [u, path.basename(f)]);
    } else if (DRAWN[k]) {
      await A(async ([fs2, n]) => {
        const W = 1200, c = document.createElement('canvas'); c.width = c.height = W;
        (new Function('x', 'W', 'return (' + fs2 + ')(x, W)'))(c.getContext('2d'), W);
        const S = window.__sungfluence; await S.loadImageURL(c.toDataURL(), n); S.freshImage();
      }, [DRAWN[k].toString(), k + '.png']);
    } else await A((k) => window.__sungfluence.useSample(k), k);
    await wait(p);
    const card = await A(() => { const c = document.getElementById('cta'); return { shown: !c.hidden, text: c.textContent }; });
    const own = await A(() => { const S = window.__sungfluence, sg = S.pictureLook(S.photoStats(S.src)); return { mode: sg.kind, why: sg.why }; });
    const flag = FLAG.includes(k);
    const res = {};
    for (const w of [1600, 3671]) {
      const long = await A((w) => {
        const S = window.__sungfluence, L = [];
        S.doc.text.applied = false; S.doc.out.width = w;
        const ob = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(Math.round(e.duration))));
        ob.observe({ entryTypes: ['longtask'] });
        S.applyTextArt();
        return new Promise((res) => { const t = setInterval(() => { if (!Object.keys(S.jobs).length) { clearInterval(t); ob.disconnect(); res(L.sort((a, b) => b - a)[0] || 0); } }, 100); });
      }, w);
      await wait(p);
      res[w] = await A(() => {
        const S = window.__sungfluence, sg = S.ui.suggestion, L = S.curLayer();
        return { mode: L.mode, why: sg.why, note: sg.note, paper: S.doc.out.paper, n: S.out.layers[0].items.filter((i) => i.t === 'text').length, text: L.text, color: L.color, subjSat: sg.stats.subjSat, minPiece: L.minPiece, margin: L.margin };
      });
      Object.assign(res[w], await A(look, 24));
      if (res[w].why === 'thin') res[w].fine = (await A(look, 72)).r;
      res[w].long = long;
      await p.locator('#art').screenshot({ path: __dirname + '/out/firstpick-' + k + '-' + w + '.png' });
    }
    const a = res[1600], z = res[3671], [mode, why] = WANT[k];
    check(own.mode === mode && own.why === why, k + ': the style picked for this picture is ' + NAMES[mode] + ' (' + why + ')', own.mode + ', because: ' + own.why);
    check(z.mode === a.mode && Math.abs(z.n - a.n) <= Math.max(20, a.n * 0.12), k + ': the same look on a 1600 and a 3671 px artboard', a.n + ' and ' + z.n + ' letters');
    // filling a shape may take 260 ms (see DEVELOPMENT.md); every other style stays under 220 ms
    const lim = a.mode === 'cloud' ? 260 : 220;
    check(a.long < lim && z.long < lim, k + ': the window stays alive while it renders', 'longest tasks ' + a.long + ' and ' + z.long + ' ms');
    if (flag) {
      check(a.mode === 'cloud' && a.why === 'flagship' && a.paper === '#15120f' && z.paper === '#15120f', k + ': Apply text art starts as the flagship Word cloud, on warm black paper', a.mode + ', ' + a.why + ', ' + a.paper);
      check(card.shown && card.text.includes('Suggested: Word cloud. ' + a.note), k + ': the card names the Word cloud and says how it reads the photo', a.note);
      continue;
    }
    check(a.mode === mode && a.why === why, k + ': Apply text art starts in that style', a.mode + ', because: ' + a.why);
    const fell = mode !== 'cloud';
    check(card.shown && card.text.includes(fell ? a.note : 'Suggested: ' + NAMES[a.mode] + '. ' + a.note), k + ': the card names the style and says why', a.note);
    check(a.paper === '#ffffff' && z.paper === '#ffffff', k + ': it starts on white paper');
    // a halftone follows every tone; letters in strokes and words in a shape follow the dark parts more loosely.
    // On a soft gradient the bright colors get dots of their own on purpose, so it follows the gray tones less.
    const min = a.mode !== 'halftone' ? 0.5 : a.why === 'soft' ? 0.6 : 0.8;
    check(a.r > min && z.r > min, k + ': the result follows the tones of the photo', 'match ' + a.r.toFixed(2) + ' and ' + z.r.toFixed(2) + ', want over ' + min);
    // real contrast: deep where the photo is dark, open where it is light. A washed-out, faded result fails
    // (the lifted coffee halftone of the first version kept about 0.4). Letters always leave some paper between
    // them, and the words of a cloud leave more, so these keep less of the photo's contrast.
    const minSpread = a.mode === 'cloud' ? 0.15 : a.mode === 'rows' || why === 'thin' ? 0.3 : 0.55;
    check(a.spread > minSpread && z.spread > minSpread, k + ': the lights stay light and the darks dark', 'spread ' + a.spread.toFixed(2) + ' and ' + z.spread.toFixed(2) + ', want over ' + minSpread);
    // and the darks are deep: a halftone is nearly as dark as the photo where the photo is darkest. Dots in the
    // photo's colors are the ones that can fade (the first version's coffee kept 0.59 and its face 0.55); black
    // ink is as dark as it gets, so its letters only need to be big enough.
    const minDeep = a.color === 'image' ? 0.7 : 0.6;
    if (a.mode === 'halftone' && why !== 'thin') check(a.deep > minDeep && z.deep > minDeep, k + ': the darkest parts are deep, not faded', 'depth ' + a.deep.toFixed(2) + ' and ' + z.deep.toFixed(2) + ', want over ' + minDeep);
    if (a.why === 'thin') check(a.fine > 0.6, k + ': the fine pattern of the lines still shows', 'match ' + a.fine.toFixed(2) + ' on a fine grid');
    // a colored subject keeps its colors, even on a white background
    if (a.subjSat >= 0.12) check(a.chroma > 0.1, k + ': the colors of the subject stay', 'chroma ' + a.chroma.toFixed(2));
    // a Word cloud from the first look leaves out stray bits of the shape and keeps a margin of paper around it
    if (a.mode === 'cloud') check(a.minPiece === 0.02 && a.margin > 0, k + ': the Word cloud leaves out small pieces and keeps a margin of paper', a.minPiece + ', ' + a.margin);
    if (a.mode === 'halftone') check(/[A-Z]{4,}/.test(a.text || '') && a.text.length > 20, k + ': the halftone is made of readable letters', String(a.text).slice(0, 40));
  }
  // the halftone text starts with the name of the picture when that is a word, not with a camera file name
  const names = await A(() => {
    const S = window.__sungfluence, keep = S.doc.fileName, out = [];
    for (const n of ['coffee.jpg', 'IMG_2034.jpg', 'my-dog.png']) { S.doc.fileName = n; out.push(S.firstText().split(' ')[0]); }
    S.doc.fileName = keep; return out;
  });
  check(names[0] === 'COFFEE' && names[1] === 'EVERY' && names[2] === 'DOG', 'the halftone text starts with the name of the picture when it is a word', names.join(', '));
  // the pick holds when the picture is mirrored
  for (const k of ['coffee', 'rocket', 'cat']) {
    await A((k) => window.__sungfluence.useSample(k), k); await wait(p);
    await A(() => window.__sungfluence.flipImage('x')); await wait(p);
    const m = await A(() => { const S = window.__sungfluence; S.doc.text.applied = false; S.applyTextArt(); return [S.ui.suggestion.why, S.pictureLook(S.photoStats(S.src)).why]; });
    check(m[0] === (FLAG.includes(k) ? 'flagship' : WANT[k][1]) && m[1] === WANT[k][1], k + ': mirrored, it gets the same first look and the same pick', m.join(', '));
  }

  check(!errs.length, 'no page errors', errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' check(s) failed' : 'all first pick checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
