// Draws the pictures of the website (site/img, site/og.jpg, site/img/lost-cat.txt) with the real app,
// so they always show what SungFluence makes. Run it after the app changes how a style looks:
//   npm run build
//   node scripts/site-images.js            every picture
//   node scripts/site-images.js compare    only some groups: compare, styles, extra, shot, og
//   node scripts/site-images.js compare styles cloud    and within them only one look (here the Word cloud)
//   node scripts/site-images.js compare styles clear    only the transparent copies in site/img/clear
//   node scripts/site-images.js compare styles black white    only the copies made for black or white in site/img/black, site/img/white
// It opens src/index.html in a browser through the tests' launcher (tests/browser.js), applies each look
// to a sample from app/samples, exports the text art at full size and saves a smaller WebP copy.
// The slider and the style tiles also get a transparent copy of each text art picture (the app's own transparent
// export, doc.out.transparent), at the same sizes, in site/img/clear. The website shows them on its Background
// Checker choice and loads them only when a visitor picks one. For the Black and White choices the app makes each
// look made for light paper again on black paper (site/img/black), and each look made for dark paper again on white
// paper (site/img/white), so it fits its colors and its tones to that ground, as it does for any paper. A transparent
// copy keeps the colors of its first paper and would vanish there. On a ground of its own kind (light art on white,
// dark art on black) the website shows the transparent copy.
// SPDX-License-Identifier: AGPL-3.0-or-later
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { launch } = require('../tests/browser');

const root = path.join(__dirname, '..');
const IMG = path.join(root, 'site', 'img');
const want = process.argv.slice(2);
// clear, black, white: only those copies; the pictures on paper and the photos stay as they are
const SETS = ['clear', 'black', 'white'];
const SETS_ONLY = want.some((w) => SETS.includes(w));
const setWanted = (k) => !SETS_ONLY || want.includes(k);
const GROUPS = ['compare', 'styles', 'extra', 'shot', 'og'];
const doing = (g) => (!want.some((w) => GROUPS.includes(w)) || want.includes(g)) && (!SETS_ONLY || g === 'compare' || g === 'styles');

// the four samples the compare slider offers, and the looks it can switch between
const SAMPLES = ['coffee', 'cat', 'face', 'rocket'];
// Each look is tuned for each photo, so the text art reads as clearly as the photo: dark photos get a lift on dark
// paper, and a light photo of fine detail gets one dark ink on cream. [paper, layers]
const COFFEE_LIFT = { brightness: 0.28, gamma: 0.65, contrast: 1.15 };
const CLOUD_PAPER = '#15120f';
const LOOKS = {
  portrait: {
    coffee: ['#111113', [['rows', Object.assign({ size: 20, saturation: 1.6 }, COFFEE_LIFT)]]],
    other: ['#111113', [['rows', { size: 22 }]]]
  },
  halftone: {
    coffee: ['#f6f1e7', [['halftone', { cols: 92, scale: 1.7, color: 'image', saturation: 1.2, toneGamma: 1 }]]],
    cat: ['#f6f1e7', [['halftone', { cols: 110, scale: 1.6, color: 'ink', inkColor: '#1b1b1f' }]]],
    face: ['#f6f1e7', [['halftone', { cols: 130, scale: 1.6, color: 'image', saturation: 1.2 }]]],
    rocket: ['#f6f1e7', [['halftone', { cols: 110, scale: 1.6, color: 'image', saturation: 1.2 }]]]
  },
  ascii: {
    coffee: ['#0f1012', [['grid', { cols: 110, color: 'image', saturation: 1.5, edges: 0.35, brightness: 0.4, gamma: 0.6, contrast: 1.2 }]]],
    cat: ['#f6f1e7', [['grid', { cols: 120, color: 'ink', inkColor: '#1b1b1f', edges: 0.4, localContrast: 0.6, toneGamma: 1.4 }]]],
    face: ['#0f1012', [['grid', { cols: 120, color: 'image', saturation: 1.5, edges: 0.35, brightness: 0.3, gamma: 0.7 }]]],
    rocket: ['#f6f1e7', [['grid', { cols: 110, color: 'ink', inkColor: '#14213d', edges: 0.5, localContrast: 0.8, contrast: 1.5, gamma: 1.3 }]]]
  },
  // The Word cloud at the app's own default sizes, its shape read from the photo, on warm near-black paper.
  // Face and coffee keep the shape untidied, so the words follow the hair and the cup as in the app; the cat and
  // the rocket are light subjects on darker grounds, so their shape is swapped to fill the subject itself (the
  // tidied cat outline reads best; the rocket keeps its tower and the ground). Words stand upright or turned, and their colors are
  // fitted strongly to the dark paper, so they still read at the size of a tile.
  cloud: {
    coffee: [CLOUD_PAPER, [['cloud', { shapeTidy: false, rotSet: [0, -90], colorFit: 'strong' }]]],
    cat: [CLOUD_PAPER, [['cloud', { maskInvert: true, rotSet: [0, -90], colorFit: 'strong' }]]],
    face: [CLOUD_PAPER, [['cloud', { shapeTidy: false, rotSet: [0, -90], colorFit: 'strong' }]]],
    rocket: [CLOUD_PAPER, [['cloud', { shapeTidy: false, maskInvert: true, rotSet: [0, -90], colorFit: 'strong' }]]]
  },
  braille: {
    coffee: ['#0f1012', [['unicode', { cols: 170, color: 'image', saturation: 1.4, brightness: 0.25, gamma: 0.7 }]]],
    cat: ['#f6f1e7', [['unicode', { cols: 170, color: 'ink', inkColor: '#1b1b1f' }]]],
    face: ['#0f1012', [['unicode', { cols: 170, color: 'image', saturation: 1.4, brightness: 0.3, gamma: 0.7 }]]],
    rocket: ['#f6f1e7', [['unicode', { cols: 170, color: 'ink', inkColor: '#14213d', contrast: 1.5, gamma: 1.3 }]]]
  }
};
// one tile per style for the gallery, on a subject that suits it: [file, sample, paper, layers]
const STYLES = [
  ['rows', 'face', '#111113', [['rows', { size: 20 }]]],
  ['cloud', 'coffee', CLOUD_PAPER, [['cloud', { shapeTidy: false, rotSet: [0, -90], colorFit: 'strong' }]]],
  ['mosaic', 'rocket', '#ffffff', [['mosaic', { color: 'ink', inkColor: '#14213d', maxSize: 60, minSize: 6, threshold: 0.45, contrast: 1.4 }]]],
  ['halftone', 'coffee', '#fbf3e4', [['halftone', { color: 'duotone', inkColor: '#1b2a4a', inkColor2: '#3d6a8a', effect: 'riso', effectColor: '#e4572e', cols: 90 }]]],
  ['ascii', 'cat', '#f6f1e7', [['grid', { cols: 110, color: 'ink', inkColor: '#1b1b1f', edges: 0.4, localContrast: 0.6, toneGamma: 1.4 }]]],
  ['braille', 'face', '#0f1012', [['unicode', { cols: 150, color: 'image', saturation: 1.4, brightness: 0.3, gamma: 0.7 }]]],
  ['calligram', 'rocket', '#ffffff', [['calligram', { color: 'duotone', inkColor: '#14213d', inkColor2: '#c8553d', size: 32, weight: 800 }]]],
  ['spiral', 'face', '#ffffff', [['spiral', { inkColor: '#111111', disc: false, pop: 0.6, minScale: 0.3, scale: 1.3 }]]],
  ['flow', 'cat', '#f3efe6', [['flow', { inkColor: '#14213d', size: 13, minInk: 0.12 }]]],
  ['relief', 'rocket', '#f3efe6', [['relief', { inkColor: '#14213d', amp: 2.6, spacing: 13 }]]],
  ['typewriter', 'cat', '#f3efe6', [['typewriter', {}]]],
  ['paths', 'cat', '#f3efe6', 'lines']
];
// A look made again on the other kind of paper: black for a look made on light paper, white for one made on dark
// paper (darkPaper). It loses the tone settings tuned for its first paper, since the app reads the tones the other
// way round on dark paper, and fits its colors strongly to the new ground. On black, the dark photos get the lift
// they have on dark paper, and a dark ink becomes a light one of the same hue, as a printer would choose. On white,
// fine ASCII and Braille marks get a little more weight, and a Word cloud keeps its shape (the app reads the shape
// from the tones, so it flips with the paper unless the shape is turned too).
const GROUNDS = { black: '#000000', white: '#ffffff' };
const DARK_LIFT = { coffee: COFFEE_LIFT, face: { brightness: 0.3, gamma: 0.7 } };
const LIGHT_INK = { '#14213d': '#aac0ea', '#1b2a4a': '#f2efe6' };
const hexL = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const darkPaper = (h) => { const [r, g, b] = hexL(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110; };
const onGround = (set, sample, paper, layers) => {
  const dark = set === 'black';
  return [GROUNDS[set], layers.map(([m, o]) => {
    o = Object.assign({}, o, { colorFit: 'strong' });
    for (const k of ['brightness', 'gamma', 'contrast']) delete o[k];
    if (dark) {
      Object.assign(o, DARK_LIFT[sample] || {});
      if (o.color !== 'image') o.inkColor = LIGHT_INK[o.inkColor] || '#f2efe6';
    } else {
      if (m === 'grid' || m === 'unicode') Object.assign(o, { gamma: 1.4, contrast: 1.15 });
      if (m === 'cloud') o.maskInvert = !o.maskInvert;
    }
    return [m, o];
  })];
};
const URDU = 'سنگم محبت دریا روشنی خواب امید دل زندگی رنگ خوشبو';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(IMG, { recursive: true });
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', acceptDownloads: true });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('page error: ' + e.message));
  await p.goto(pathToFileURL(path.join(root, 'src', 'index.html')).href);
  await p.waitForTimeout(2000);
  const A = (fn, arg) => p.evaluate(fn, arg);
  const idle = async (ms = 180000) => {
    const t0 = Date.now(); await sleep(250);
    while (Date.now() - t0 < ms) { if (!(await A(() => Object.keys(window.__sungfluence.jobs).length))) return; await sleep(80); }
    throw new Error('the app stayed busy');
  };
  await A(() => { window.__sungfluence.prefs.reveal = 'none'; window.__sungfluence.prefs.motion = 'off'; });
  let current = '';
  const sample = async (k) => { if (current === k) return; await A((s) => window.__sungfluence.useSample(s), k); current = k; await idle(); };

  // a full-size PNG of one layer, through the app's own export
  const exportLayer = async (layer) => {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 180000 }), A((l) => window.__sungfluence.flatPNG([l], '-site'), layer)]);
    return fs.readFileSync(await dl.path());
  };
  // a smaller WebP copy, made in the page. The browser keeps the alpha of a transparent picture without loss, which
  // makes fine letters heavy, so a transparent copy keeps 8 steps of alpha: the edges still look smooth, and the
  // file is about 60 percent smaller. Fully clear pixels get a black color, which compresses best.
  const webp = (png, width, q) => A(async ([b64, w, q]) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * im.naturalHeight / im.naturalWidth);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
    let clear = false;
    for (let i = 3; i < a.length; i += 4) if (a[i] < 255) { clear = true; break; }
    if (clear) {
      const st = 255 / 7;
      for (let i = 3; i < a.length; i += 4) { const v = Math.round(Math.round(a[i] / st) * st); a[i] = v; if (!v) a[i - 1] = a[i - 2] = a[i - 3] = 0; }
      x.putImageData(d, 0, 0);
    }
    return c.toDataURL('image/webp', q).split(',')[1];
  }, [png.toString('base64'), width, q]);
  for (const set of SETS) fs.mkdirSync(path.join(IMG, set), { recursive: true });
  const save = (name, b64) => { fs.writeFileSync(path.join(IMG, name), Buffer.from(b64, 'base64')); console.log('  ' + name + '  ' + Math.round(Buffer.from(b64, 'base64').length / 1024) + ' KB'); };

  const look = async (paper, layers) => {
    await A(([paper, layers]) => {
      const S = window.__sungfluence;
      S.doc.out.paper = paper; S.doc.out.transparent = false;
      S.doc.text.source = 'photo';
      S.doc.text.layers = layers.map(([m, o]) => S.newLayer(m, o)); S.doc.text.sel = 0; S.doc.text.applied = true;
      S.setView('text'); S.scheduleText(0);
    }, [paper, layers]);
    await idle();
  };
  // Line text: trace tone lines from the photo, then write along them
  const lineText = async (paper, over) => {
    await A(() => { const S = window.__sungfluence; S.ui.trace.kind = 'contours'; S.traceNow(); });
    await idle();
    await A(([paper, over]) => {
      const S = window.__sungfluence;
      S.doc.out.paper = paper; S.doc.out.transparent = false; S.doc.text.source = 'lines';
      S.doc.text.layers = [S.newLayer('paths', Object.assign({ color: 'ink', inkColor: '#14213d' }, over))]; S.doc.text.sel = 0; S.doc.text.applied = true;
      S.setView('text'); S.scheduleText(0);
    }, [paper, over || {}]);
    await idle();
  };
  // copies for srcset: name.webp at the first width, and name-<width>.webp at the others
  const saveSizes = async (name, png, widths, q) => {
    for (const [i, w] of widths.entries()) save(name + (i ? '-' + w : '') + '.webp', await webp(png, w, q));
  };
  // the text art of the current look on its paper; the same art with a transparent background (WebP keeps the
  // alpha) in clear/ under the same name, its paper still set, so the colors fitted to it do not change; and the
  // look made again on the other kind of paper (again(set) redraws it) in black/ or white/
  const saveArt = async (name, widths, q, paper, again) => {
    if (!SETS_ONLY) await saveSizes(name, await exportLayer('text'), widths, q);
    if (setWanted('clear')) {
      await A(() => { window.__sungfluence.doc.out.transparent = true; });
      try { await saveSizes('clear/' + name, await exportLayer('text'), widths, q); } finally { await A(() => { window.__sungfluence.doc.out.transparent = false; }); }
    }
    for (const set of ['black', 'white']) {
      if (!setWanted(set) || darkPaper(paper) === (set === 'black')) continue;
      await again(set);
      await saveSizes(set + '/' + name, await exportLayer('text'), widths, q);
    }
  };

  // a look named on the command line (such as cloud) limits the compare and styles groups to it, photos left alone
  const only = want.filter((w) => !GROUPS.includes(w) && !SETS.includes(w));
  const lookWanted = (k) => !only.length || only.includes(k);
  if (doing('compare')) {
    console.log('compare slider');
    for (const s of SAMPLES) {
      await sample(s);
      if (!only.length && !SETS_ONLY) await saveSizes('photo-' + s, await exportLayer('photo'), [1200, 960, 640], 0.82);
      for (const [k, L] of Object.entries(LOOKS)) {
        if (!lookWanted(k)) continue;
        const [paper, layers] = L[s] || L.other;
        await look(paper, layers);
        await saveArt(s + '-' + k, [1200, 960, 640], 0.78, paper, (set) => look(...onGround(set, s, paper, layers)));
      }
    }
  }
  if (doing('styles')) {
    console.log('style gallery');
    for (const [k, s, paper, layers] of STYLES) {
      if (!lookWanted(k)) continue;
      await sample(s);
      if (layers === 'lines') await lineText(paper); else await look(paper, layers);
      await saveArt('style-' + k, [720, 400], 0.84, paper, (set) => (layers === 'lines'
        ? lineText(...onGround(set, s, paper, [['paths', { color: 'ink', inkColor: '#14213d' }]]).map((v, i) => (i ? v[0][1] : v)))
        : look(...onGround(set, s, paper, layers))));
    }
    // the photos under the tiles and for the letters of the hero, and the small pictures of the photo picker
    for (const s of only.length || SETS_ONLY ? [] : SAMPLES) {
      await sample(s);
      const png = await exportLayer('photo');
      save('thumb-' + s + '.webp', await webp(png, 480, 0.8));
      save('icon-' + s + '.webp', await webp(png, 80, 0.8));
    }
  }
  if (doing('extra')) {
    console.log('Urdu calligram, the still of the letter band and the lost cat');
    await sample('cat');
    await look('#f6f1e7', [['calligram', { maskSource: 'heart', font: 'nastaliq', text: URDU, color: 'duotone', inkColor: '#1b2a4a', inkColor2: '#b4420c' }]]);
    save('urdu.webp', await webp(await exportLayer('text'), 900, 0.86));
    // the same heart on warm dark paper, for dark mode
    await look('#221d17', [['calligram', { maskSource: 'heart', font: 'nastaliq', text: URDU, color: 'duotone', inkColor: '#e9dcc4', inkColor2: '#e8a33d' }]]);
    save('urdu-dark.webp', await webp(await exportLayer('text'), 900, 0.86));
    // the finished picture of the How it works band: coffee as a Text portrait on black, which the page lays over
    // the dark band with a screen blend, so the black drops out. Shown with reduced motion and until the letters arrive.
    await sample('coffee');
    await look('#000000', [['rows', Object.assign({ size: 18, saturation: 1.6 }, COFFEE_LIFT)]]);
    save('drift-coffee.webp', await webp(await exportLayer('text'), 900, 0.78));
    // the cat in the app's Braille style, as plain text for the 404 page: one Braille character per cell
    await sample('cat');
    await look('#ffffff', [['unicode', { cols: 62, color: 'ink', inkColor: '#000000', contrast: 1.2, localContrast: 0.9, threshold: 0.58, paperKnee: 0.3 }]]);
    const lines = await A(() => {
      const S = window.__sungfluence, items = S.out.layers[0].items.filter((q) => q.t === 'text' && q.s.trim());
      const ys = [...new Set(items.map((q) => Math.round(q.y)))].sort((a, b) => a - b), xs = [...new Set(items.map((q) => Math.round(q.x)))].sort((a, b) => a - b);
      const step = (v) => { let m = Infinity; for (let i = 1; i < v.length; i++) if (v[i] - v[i - 1] > 0.5) m = Math.min(m, v[i] - v[i - 1]); return m; };
      const dx = step(xs), dy = step(ys), x0 = xs[0], y0 = ys[0];
      const rows = [];
      for (const q of items) { const r = Math.round((q.y - y0) / dy), c = Math.round((q.x - x0) / dx); (rows[r] = rows[r] || [])[c] = q.s; }
      return Array.from(rows, (r) => Array.from(r || [], (ch) => ch || '⠀').join('').replace(/[⠀\s]+$/, ''));
    });
    fs.writeFileSync(path.join(IMG, 'lost-cat.txt'), lines.join('\n').replace(/^\n+|\n+$/g, '') + '\n');
    console.log('  lost-cat.txt  ' + lines.length + ' lines');
  }
  if (doing('shot')) {
    console.log('app screenshot');
    await sample('face');
    await A(() => { const S = window.__sungfluence; S.applyRecipe(S.RECIPES.find((r) => r.name === 'Word portrait')); });
    await idle(); await A(() => window.__sungfluence.setView('mix')); await idle(); await sleep(800);
    await A(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
    const shot = await p.screenshot({ type: 'png' });
    save('app.webp', await webp(shot, 1440, 0.84));
  }
  await b.close();

  if (doing('og')) {
    // the sharing picture: photo and text art side by side, with the name, drawn from the site's own images.
    // A JPEG, so it stays small; it must read as a thumbnail too.
    console.log('sharing picture');
    const b2 = await launch();
    const pg = await b2.newPage({ viewport: { width: 1200, height: 630 } });
    await pg.goto(pathToFileURL(path.join(root, 'site', 'og-card.html')).href);
    await pg.waitForTimeout(800);
    await pg.screenshot({ path: path.join(root, 'site', 'og.jpg'), type: 'jpeg', quality: 84 });
    console.log('  og.jpg  ' + Math.round(fs.statSync(path.join(root, 'site', 'og.jpg')).size / 1024) + ' KB');
    await b2.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
