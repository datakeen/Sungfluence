// The website for GitHub Pages: builds pages/ with scripts/site.js and serves it at /Sungfluence/ like GitHub Pages.
// Checks that the pages exist, every link points somewhere real, nothing loads from another server, the before and
// after slider moves with the mouse and the keyboard, the 404 page renders (and sends old app links to try/), the web
// app under try/ loads with its note about the installed app, reduced motion stops the animations, and the service
// worker at the root retires the old offline copy. Also: the built pages work opened from disk (file://), the
// template in site/ moves on to them or says how to build them, the name in the hero never runs into the art (even
// without its font), a picture that fails leaves a quiet pattern instead of an empty box, and the slider offers the
// Word cloud. The Background choice (Paper, Checker, Black, White) shows transparent copies of the art on a checkerboard
// in the greys of the art's own paper, and art that reads on black and on white; it loads them only when picked,
// works by keyboard and from disk, and is remembered. Run `npm run build` first.
// SPDX-License-Identifier: AGPL-3.0-or-later
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { launch } = require('./browser');
const site = require('../scripts/site.js');
fs.mkdirSync(__dirname + '/out', { recursive: true });
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };
const OUT = site.OUT, BASE = site.BASE;

(async () => {
  site.build();

  // ---- files ----
  const must = ['index.html', '404.html', 'sw.js', 'site.css', 'site.js', 'og.jpg', 'icon.svg', 'icon-192.png', 'icon-64.png', 'robots.txt', 'sitemap.xml',
    'fonts/inter-latin-wght-normal.woff2', 'try/index.html', 'try/app.js', 'try/sw.js', 'try/pwa.js', 'try/manifest.webmanifest'];
  const missing = must.filter((f) => !fs.existsSync(path.join(OUT, f)));
  check(!missing.length, 'the website, the 404 page, the root worker and the web app under try/ are built', missing.join(', ') || must.length + ' files');
  // the sharing picture: a JPEG of 1200 by 630 (read from its frame header), small enough for every site that shows it
  const jpg = fs.readFileSync(path.join(OUT, 'og.jpg'));
  let jw = 0, jh = 0;
  for (let i = 2; i < jpg.length - 9;) {
    const m = jpg[i + 1], len = jpg.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) { jh = jpg.readUInt16BE(i + 5); jw = jpg.readUInt16BE(i + 7); break; }
    i += 2 + len;
  }
  check(jw === 1200 && jh === 630 && jpg.length < 300 * 1024, 'the sharing picture is a 1200 by 630 JPEG under 300 KB', jw + 'x' + jh + ', ' + Math.round(jpg.length / 1024) + ' KB');
  check(!fs.existsSync(path.join(OUT, 'og-card.html')), 'the page that draws the sharing picture is not published');

  // ---- links: local ones point to files that exist, outside ones only to the project's own places ----
  const ALLOWED = /^https:\/\/(github\.com\/datakeen\/Sungfluence|sourceforge\.net\/projects\/sungfluence|datakeen\.github\.io\/Sungfluence\/|schema\.org|www\.gnu\.org\/licenses\/)/;
  const bad = [];
  for (const page of ['index.html', '404.html']) {
    const html = fs.readFileSync(path.join(OUT, page), 'utf8');
    if (/\{\{[A-Z_]+\}\}/.test(html)) bad.push(page + ': unfilled placeholder');
    for (const m of html.matchAll(/(?:href|src|content)="([^"]+)"/g)) {
      const u = m[1];
      if (/og:image:type"\s*$/.test(html.slice(Math.max(0, m.index - 40), m.index))) continue;
      if (/^(#|mailto:|data:)/.test(u) || !/[/.]/.test(u) || /\s/.test(u)) continue;
      if (/^https?:/.test(u)) { if (!ALLOWED.test(u)) bad.push(page + ': ' + u); continue; }
      let rel = u.split(/[?#]/)[0];
      if (rel.startsWith(BASE)) rel = rel.slice(BASE.length); else if (rel.startsWith('/')) { bad.push(page + ': ' + u + ' is outside ' + BASE); continue; }
      if (page === '404.html' && !u.startsWith(BASE) && !/^https?:/.test(u)) { bad.push('404.html: ' + u + ' is relative, but 404.html is served at any depth'); continue; }
      const f = path.join(OUT, rel);
      if (!(fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html'))))) bad.push(page + ': ' + u);
    }
    for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!html.includes('id="' + m[1] + '"')) bad.push(page + ': #' + m[1]);
  }
  check(!bad.length, 'every link and picture on the website and the 404 page is valid', bad.join(' | ') || 'all good');
  const css = fs.readFileSync(path.join(OUT, 'site.css'), 'utf8');
  for (const m of css.matchAll(/url\('([^']+)'\)/g)) check(fs.existsSync(path.join(OUT, m[1])), 'site.css finds ' + m[1]);

  const over = new Map();
  const server = await site.serve(0, over);
  const origin = 'http://127.0.0.1:' + server.address().port, HOME = origin + BASE;
  const b = await launch();
  const outside = [];
  const watch = (ctx) => ctx.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !/^(data|blob|about|chrome-extension):/.test(u)) outside.push(u); });

  // ---- the website ----
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    watch(ctx);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const res = await p.goto(HOME);
    check(res.status() === 200, 'the home page answers', res.status());
    await p.waitForTimeout(1500);
    const bytes = await p.evaluate(() => performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource')).reduce((n, e) => n + (e.encodedBodySize || 0), 0));
    check(bytes > 100 * 1024 && bytes < 1000 * 1024, 'the first screen loads under 1 MB at 1440 px, fonts and pictures included', Math.round(bytes / 1024) + ' KB');
    // the Background choice: two radio groups (slider and tiles) of four, on Paper, and no transparent picture loaded yet
    const bg0 = await p.evaluate(() => ({
      groups: Array.from(document.querySelectorAll('[data-bg-pick]')).map((g) => g.getAttribute('role') + ':' + Array.from(g.querySelectorAll('[role=radio]')).map((b) => b.dataset.k + (b.getAttribute('aria-checked') === 'true' ? '*' : '')).join(',')),
      named: Array.from(document.querySelectorAll('[data-bg-pick]')).map((g) => g.getAttribute('aria-label')).join('|') === 'Background of the slider|Background of the style tiles',
      clear: performance.getEntriesByType('resource').filter((e) => /\/img\/(clear|black|white)\//.test(e.name)).length, now: window.__site.background
    }));
    check(bg0.groups.length === 2 && bg0.groups.every((g) => g === 'radiogroup:paper*,checker,black,white') && bg0.named && bg0.now === 'paper' && !bg0.clear,
      'the Background choice is a radio group by the slider and by the tiles, each with its own name, starts on Paper, and loads none of its pictures', JSON.stringify(bg0));
    const head = await p.evaluate(() => ({
      title: document.title, canon: document.querySelector('link[rel=canonical]').href, og: document.querySelector('meta[property="og:image"]').content,
      tw: document.querySelector('meta[name="twitter:card"]').content, icon: !!document.querySelector('link[rel=icon]'), theme: document.querySelectorAll('meta[name=theme-color]').length,
      desc: document.querySelector('meta[name=description]').content.length
    }));
    check(/SungFluence/.test(head.title) && head.desc > 80, 'title and description', head.title);
    check(head.canon === 'https://datakeen.github.io/Sungfluence/' && head.og === 'https://datakeen.github.io/Sungfluence/og.jpg' && head.tw === 'summary_large_image' && head.icon && head.theme === 2,
      'canonical address, Open Graph and Twitter card picture, icon and theme colors', head.og);
    const hero = await p.evaluate(() => ({ live: document.getElementById('heroField').classList.contains('live'), n: window.__site.fields.hero && window.__site.fields.hero.letters }));
    check(hero.live && hero.n > 1500, 'the hero letters assemble on a canvas', hero.n + ' letters');
    // the name sits in its own column, clear of the art
    const name = await p.evaluate(() => { const g = document.createRange(); g.selectNodeContents(document.querySelector('.wordmark')); return [g.getBoundingClientRect().right, document.getElementById('heroField').getBoundingClientRect().left]; });
    check(name[0] < name[1] - 8, 'the name ends before the art', Math.round(name[0]) + ' < ' + Math.round(name[1]));
    const btns = await p.evaluate(() => Array.from(document.querySelectorAll('.hero .cta a')).map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    check(btns.length === 2 && /sourceforge/.test(btns[0][1]) && btns[1][1] === 'try/', 'the hero offers Download (SourceForge) and Try it in your browser (try/)', JSON.stringify(btns));
    await p.waitForTimeout(3200);
    check(!(await p.evaluate(() => window.__site.fields.hero.running)), 'the hero animation stops once the letters are in place');
    await p.mouse.move(5, 5); await p.waitForTimeout(1200);
    check(await p.evaluate(() => document.getElementById('heroField').classList.contains('rested')), 'at rest the hero shows the real render');
    const hb = await p.locator('#heroField').boundingBox();
    await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2, { steps: 4 });
    check(!(await p.evaluate(() => document.getElementById('heroField').classList.contains('rested'))), 'the pointer brings the letters back to push around');
    await p.mouse.move(5, 5);
    // with the letters at rest, the pointer redraws only its neighborhood. Software rendering in a test browser is slow,
    // so the limit is generous; on a real screen this is a few milliseconds.
    const ms = await p.evaluate(() => window.__site.fields.hero.bench(20));
    check(ms < 25, 'pushing the hero letters with the pointer draws quickly', ms.toFixed(1) + ' ms a frame');

    // the before and after slider
    await p.evaluate(() => document.getElementById('cmp').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(2600);
    check(Math.abs(await p.evaluate(() => window.__site.compare) - 0.5) < 0.02, 'the slider sweeps in and rests in the middle');
    check(await p.evaluate(() => document.querySelector('.cmp-art').getAttribute('src') === 'img/coffee-halftone.webp' && document.getElementById('cmpHandle').getAttribute('aria-valuetext') === '50 percent photo, 50 percent text art'),
      'it opens on the coffee as a Halftone, and says what the divider shows');
    const box = await p.locator('#cmp').boundingBox();
    await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5, { steps: 6 }); await p.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.52, { steps: 6 }); await p.mouse.up();
    const afterDrag = await p.evaluate(() => window.__site.compare);
    check(Math.abs(afterDrag - 0.25) < 0.02, 'dragging with the mouse moves the divider', afterDrag.toFixed(3));
    const knob = await p.locator('.cmp-knob').boundingBox();
    check(Math.abs(knob.x + knob.width / 2 - (box.x + box.width * 0.25)) < 3, 'the knob follows the divider');
    await p.screenshot({ path: __dirname + '/out/site-compare.png' });
    await p.focus('#cmpHandle');
    for (let i = 0; i < 5; i++) await p.keyboard.press('ArrowRight');
    const afterKeys = await p.evaluate(() => window.__site.compare);
    check(Math.abs(afterKeys - 0.35) < 0.011 && (await p.evaluate(() => document.getElementById('cmpHandle').getAttribute('aria-valuenow'))) === '35', 'the arrow keys move the divider, and the right arrow raises the value', afterKeys.toFixed(3));
    await p.keyboard.press('End');
    check(await p.evaluate(() => window.__site.compare === 1 && document.getElementById('cmpHandle').getAttribute('aria-valuenow') === '100'), 'End moves it to the edge and the slider reports it');
    await p.click('#pickSample button[data-k="cat"]'); await p.click('#pickLook button[data-k="braille"]');
    await p.waitForTimeout(1500);
    const srcs = await p.evaluate(() => [document.querySelector('.cmp-photo').getAttribute('src'), document.querySelector('.cmp-art').getAttribute('src'), document.getElementById('cmpTag').textContent]);
    check(srcs[0] === 'img/photo-cat.webp' && srcs[1] === 'img/cat-braille.webp' && srcs[2] === 'Braille', 'picking a photo and a style shows that pair', srcs.join(', '));
    await p.focus('#pickLook button[data-k="braille"]');
    await p.keyboard.press('ArrowRight');
    check(await p.evaluate(() => document.activeElement.dataset.k === 'portrait' && document.activeElement.getAttribute('aria-checked') === 'true'), 'arrow keys move through the style choices, round from the last to the first');
    // the Word cloud, for every photo, in the same three sizes as the other pictures
    await p.keyboard.press('ArrowRight');
    await p.click('#pickSample button[data-k="face"]'); await p.waitForTimeout(1500);
    const wc = await p.evaluate(() => { const a = document.querySelector('.cmp-art'); return { src: a.getAttribute('src'), set: a.getAttribute('srcset'), ok: a.complete && a.naturalWidth > 0, tag: document.getElementById('cmpTag').textContent }; });
    check(wc.src === 'img/face-cloud.webp' && /face-cloud-640\.webp 640w/.test(wc.set) && wc.ok && wc.tag === 'Word cloud', 'the slider shows the face as a Word cloud', wc.src + ', ' + wc.tag);
    const wcFiles = ['coffee', 'cat', 'face', 'rocket'].flatMap((k) => [k + '-cloud.webp', k + '-cloud-960.webp', k + '-cloud-640.webp']).filter((f) => !fs.existsSync(path.join(OUT, 'img', f)));
    check(!wcFiles.length, 'every photo has its Word cloud in three sizes', wcFiles.join(', ') || '12 files');
    await p.evaluate(() => window.__site.setCompare(0.26));
    await p.screenshot({ path: __dirname + '/out/site-compare-cloud.png' });

    // every picture loads
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    await p.waitForTimeout(1500);
    const broken = await p.evaluate(() => Array.from(document.images).filter((i) => i.complete && !i.naturalWidth).map((i) => i.src));
    check(!broken.length, 'every picture on the page loads', broken.join(', ') || 'all');
    // the tiles: a click shows the photo
    await p.evaluate(() => document.getElementById('styles').scrollIntoView());
    await p.click('.tile .tile-pic');
    check(await p.evaluate(() => document.querySelector('.tile').classList.contains('show') && document.querySelector('.tile-pic').getAttribute('aria-pressed') === 'true'), 'a click on a style tile shows its photo');
    const cloudTile = await p.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find((x) => x.querySelector('h3').textContent === 'Word cloud'); return t && t.dataset.photo; });
    check(cloudTile === 'coffee', 'the Word cloud tile shows the coffee, with the photo under it', cloudTile);

    // ---- the Background choice ----
    await p.evaluate(() => document.getElementById('cmp').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
    await p.click('#cmp ~ .cmp-pick [data-bg-pick] button[data-k="checker"]'); await p.waitForTimeout(1500);
    const ck = await p.evaluate(() => {
      const c = document.getElementById('cmp'), a = c.querySelector('.cmp-art'), i = c.querySelector('.cmp-inner');
      // the picture really is transparent: a share of its pixels is fully clear, and others are fully inked
      const cv = document.createElement('canvas'); cv.width = a.naturalWidth; cv.height = a.naturalHeight; const x = cv.getContext('2d'); x.drawImage(a, 0, 0);
      const d = x.getImageData(0, 0, cv.width, cv.height).data, all = cv.width * cv.height; let clear = 0, solid = 0;
      for (let k = 3; k < d.length; k += 4) { if (d[k] === 0) clear++; else if (d[k] === 255) solid++; }
      clear *= 40000 / all; solid *= 40000 / all;
      return { src: a.getAttribute('src'), set: a.getAttribute('srcset'), ok: a.complete && a.naturalWidth > 0, bg: c.dataset.bg, img: getComputedStyle(i).backgroundImage, paper: c.dataset.paper, chk: getComputedStyle(c).getPropertyValue('--chk-a').trim(),
        clear: clear / 40000, solid: solid / 40000, open: document.getElementById('cmpOpen').getAttribute('href'),
        mirror: document.querySelector('.bgpick-tiles button[data-k="checker"]').getAttribute('aria-checked'), kept: localStorage.getItem('sungfluence-site-background') };
    });
    check(ck.src === 'img/clear/face-cloud.webp' && /img\/clear\/face-cloud-640\.webp 640w/.test(ck.set) && ck.ok, 'Checker shows the transparent copy of the art, in the same three sizes', ck.src);
    check(ck.open === 'img/face-cloud.webp', 'the full-size link of a transparent choice opens the art on its paper, which reads in any viewer', ck.open);
    check(ck.paper === 'dark' && ck.chk === '#36363b', 'art made on dark paper gets the dark squares, as in the app', ck.paper + ' ' + ck.chk);
    check(ck.clear > 0.2 && ck.solid > 0.005, 'the transparent copy has truly clear pixels and solid letters', (ck.clear * 100).toFixed(0) + '% clear, ' + (ck.solid * 100).toFixed(1) + '% solid');
    check(ck.bg === 'checker' && /conic-gradient/.test(ck.img), 'the slider shows a checkerboard behind the art', ck.img.slice(0, 40));
    check(ck.mirror === 'true' && ck.kept === 'checker', 'the choice by the tiles follows, and the choice is remembered', ck.kept);
    // whole squares meet the edges: the square size divides the slider's width
    // (the tile of the pattern is two squares, sized in parts of the frame: 200% / n)
    const sq = await p.evaluate(() => { const c = document.getElementById('cmp'), i = c.querySelector('.cmp-inner'), n = +getComputedStyle(c).getPropertyValue('--chk-n'); return { n, size: getComputedStyle(i).backgroundSize, sq: i.getBoundingClientRect().width / n }; });
    check(Number.isInteger(sq.n) && sq.n % 2 === 0 && /calc(4%)|^4%/.test(sq.size) && sq.sq >= 10 && sq.sq <= 20, 'the checkerboard has whole squares of 10 to 20 px from edge to edge', sq.n + ' squares of ' + sq.sq.toFixed(1) + ' px, ' + sq.size);
    await p.evaluate(() => window.__site.setCompare(0.26));
    await p.locator('#cmp').screenshot({ path: __dirname + '/out/site-bg-checker.png' });
    // the keyboard: the arrow keys in the tiles' group move to Black, and both groups and the slider follow
    await p.evaluate(() => document.getElementById('styles').scrollIntoView());
    await p.focus('.bgpick-tiles button[data-k="checker"]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500);
    const bk = await p.evaluate(() => ({ focus: document.activeElement.dataset.k, cmp: document.getElementById('cmp').dataset.bg,
      groups: Array.from(document.querySelectorAll('[data-bg-pick] [aria-checked="true"]')).map((b) => b.dataset.k).join(','),
      tabs: Array.from(document.querySelectorAll('.bgpick-tiles button')).map((b) => b.tabIndex).join(','),
      tiles: Array.from(document.querySelectorAll('.tile-pic')).slice(0, 4).map((t) => t.dataset.bg + ':' + t.querySelector('img').getAttribute('src')),
      tileBg: getComputedStyle(document.querySelector('.tile-pic')).backgroundColor }));
    check(bk.focus === 'black' && bk.groups === 'black,black' && bk.tabs === '-1,-1,0,-1' && bk.cmp === 'black', 'the arrow keys pick Black, and the slider and both groups follow', JSON.stringify({ focus: bk.focus, groups: bk.groups, tabs: bk.tabs }));
    check(bk.tiles.join() === 'black:img/clear/style-rows.webp,black:img/clear/style-cloud.webp,black:img/black/style-mosaic.webp,black:img/black/style-ascii.webp' && bk.tileBg === 'rgb(0, 0, 0)',
      'on black, the tiles made on dark paper show their transparent copies and the others their copies made for black', bk.tiles.join());
    // Home and End go to the first and the last choice
    await p.keyboard.press('Home'); await p.waitForTimeout(200);
    const home = await p.evaluate(() => [document.activeElement.dataset.k, window.__site.background].join());
    await p.keyboard.press('End'); await p.waitForTimeout(200);
    const end = await p.evaluate(() => [document.activeElement.dataset.k, window.__site.background].join());
    check(home === 'paper,paper' && end === 'white,white', 'Home and End pick the first and the last background', home + ' / ' + end);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(1500);
    await p.screenshot({ path: __dirname + '/out/site-bg-tiles-black.png' });
    // a new visit keeps the choice
    await p.reload(); await p.waitForTimeout(1200);
    await p.evaluate(() => document.getElementById('cmp').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2600);
    const again = await p.evaluate(() => ({ now: window.__site.background, art: document.querySelector('.cmp-art').getAttribute('src'), bg: document.getElementById('cmp').dataset.bg,
      on: Array.from(document.querySelectorAll('[data-bg-pick] [aria-checked="true"]')).map((b) => b.dataset.k).join(',') }));
    check(again.now === 'black' && again.art === 'img/black/coffee-halftone.webp' && again.bg === 'black' && again.on === 'black,black', 'a new visit opens on the remembered background, with the art made for black', JSON.stringify(again));
    await p.click('#cmp ~ .cmp-pick [data-bg-pick] button[data-k="white"]'); await p.waitForTimeout(1200);
    check(await p.evaluate(() => getComputedStyle(document.querySelector('.cmp-inner')).backgroundColor === 'rgb(255, 255, 255)' && document.querySelector('.cmp-art').getAttribute('src') === 'img/clear/coffee-halftone.webp'), 'White puts art made on light paper, transparent, on white');
    await p.click('#pickLook button[data-k="cloud"]'); await p.waitForTimeout(1500);
    check(await p.evaluate(() => document.querySelector('.cmp-art').getAttribute('src') === 'img/white/coffee-cloud.webp' && document.getElementById('cmpOpen').getAttribute('href') === 'img/white/coffee-cloud.webp'), 'White shows a Word cloud made again on white, and links to it');
    await p.click('#pickLook button[data-k="halftone"]'); await p.waitForTimeout(1500);
    await p.click('#cmp ~ .cmp-pick [data-bg-pick] button[data-k="paper"]'); await p.waitForTimeout(1500);
    check(await p.evaluate(() => document.querySelector('.cmp-art').getAttribute('src') === 'img/coffee-halftone.webp' && document.getElementById('cmp').dataset.bg === 'paper' && getComputedStyle(document.querySelector('.cmp-inner')).backgroundImage === 'none'), 'Paper brings back the art on its own paper');
    const clearFiles = ['coffee', 'cat', 'face', 'rocket'].flatMap((k) => ['portrait', 'cloud', 'halftone', 'ascii', 'braille'].flatMap((l) => [k + '-' + l + '.webp', k + '-' + l + '-960.webp', k + '-' + l + '-640.webp']))
      .concat(['rows', 'cloud', 'mosaic', 'halftone', 'ascii', 'braille', 'calligram', 'spiral', 'flow', 'relief', 'typewriter', 'paths'].flatMap((k) => ['style-' + k + '.webp', 'style-' + k + '-400.webp']))
      .filter((x) => !fs.existsSync(path.join(OUT, 'img', 'clear', x)));
    check(!clearFiles.length, 'every slider picture and tile has its transparent copy in the same sizes', clearFiles.slice(0, 4).join(', ') || '84 files');
    // art made on light paper has a copy made for black, art made on dark paper a copy made for white, in the same sizes
    const DARK = ['coffee-portrait', 'cat-portrait', 'face-portrait', 'rocket-portrait', 'coffee-cloud', 'cat-cloud', 'face-cloud', 'rocket-cloud', 'coffee-ascii', 'face-ascii', 'coffee-braille', 'face-braille', 'style-rows', 'style-cloud', 'style-braille'];
    const groundFiles = ['coffee', 'cat', 'face', 'rocket'].flatMap((k) => ['portrait', 'cloud', 'halftone', 'ascii', 'braille'].map((l) => [k + '-' + l, ['', '-960', '-640']]))
      .concat(['rows', 'cloud', 'mosaic', 'halftone', 'ascii', 'braille', 'calligram', 'spiral', 'flow', 'relief', 'typewriter', 'paths'].map((k) => ['style-' + k, ['', '-400']]))
      .flatMap(([n, sz]) => sz.map((z) => (DARK.includes(n) ? 'white/' : 'black/') + n + z + '.webp'));
    const groundMissing = groundFiles.filter((x) => !fs.existsSync(path.join(OUT, 'img', x)));
    const groundCount = ['black', 'white'].reduce((t, d) => t + fs.readdirSync(path.join(OUT, 'img', d)).length, 0);
    check(!groundMissing.length && groundCount === groundFiles.length, 'every picture has its copy for the other ground: black for art on light paper, white for art on dark paper', groundMissing.slice(0, 4).join(', ') || groundCount + ' files');
    // every picture reads on Black and on White as the website shows it: its solid ink (the 75th percentile of the
    // pixels that differ from the ground, at full size) stands out from the ground
    const legible = await p.evaluate(async (DARK) => {
      const names = ['coffee', 'cat', 'face', 'rocket'].flatMap((k) => ['portrait', 'cloud', 'halftone', 'ascii', 'braille'].map((l) => k + '-' + l))
        .concat(['rows', 'cloud', 'mosaic', 'halftone', 'ascii', 'braille', 'calligram', 'spiral', 'flow', 'relief', 'typewriter', 'paths'].map((k) => 'style-' + k));
      const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const low = []; let min = 99;
      for (const n of names) for (const g of ['black', 'white']) {
        const dir = (g === 'black') === DARK.includes(n) ? 'clear/' : g + '/';
        const im = new Image(); im.src = 'img/' + dir + n + '.webp'; await im.decode();
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
        x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data, G = g === 'black' ? 0 : 1, rs = [];
        for (let i = 0; i < d.length; i += 4) { const Y = 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]), r = (Math.max(Y, G) + 0.05) / (Math.min(Y, G) + 0.05); if (r > 1.15) rs.push(r); }
        rs.sort((a, b) => a - b); const v = rs[Math.floor(rs.length * 0.75)] || 1;
        min = Math.min(min, v); if (v < 2.2) low.push(n + ' on ' + g + ' ' + v.toFixed(1));
      }
      return { low, min };
    }, DARK);
    check(!legible.low.length, 'every picture reads on Black and on White (solid ink at 2.2:1 or more)', legible.low.join(', ') || 'lowest ' + legible.min.toFixed(1));
    check(!errs.length, 'no script errors on the website', errs.join(' | '));
    await ctx.close();
  }
  // without its fonts (blocked), the name still stays in its column and clear of the art
  for (const w of [1440, 1231, 1000, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: 'light' });
    await ctx.route('**/*.woff2', (r) => r.abort());
    const p = await ctx.newPage();
    await p.goto(HOME); await p.waitForTimeout(1500);
    const m = await p.evaluate(() => {
      const t = document.querySelector('.wordmark'), g = document.createRange(); g.selectNodeContents(t);
      const r = g.getBoundingClientRect(), a = document.getElementById('heroField').getBoundingClientRect(), c = t.parentElement.getBoundingClientRect();
      return { right: r.right, art: a.left, artTop: a.top, bottom: r.bottom, col: c.right, font: document.fonts.check('700 40px "Playfair Display"'), page: document.documentElement.scrollWidth };
    });
    const clear = w > 900 ? m.right < m.art - 8 : m.right <= m.col + 1 && m.bottom < m.artTop;
    check(!m.font && clear && m.page <= w, w + ' px, fonts blocked: the name is not covered by the art', Math.round(m.right) + ' / ' + Math.round(w > 900 ? m.art : m.col));
    if (w === 1231) await p.screenshot({ path: __dirname + '/out/site-hero-nofont-1231.png' });
    await ctx.close();
  }
  // a picture that does not load: its frame shows a pattern of letters and what the picture was, never an empty box
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    await ctx.route('**/img/style-rows*', (r) => r.abort());
    await ctx.route(/\/img\/coffee-cloud[^/]*\.webp$/, (r) => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(HOME); await p.waitForTimeout(5200);
    await p.mouse.move(5, 5); await p.waitForTimeout(1500);
    const hero = await p.evaluate(() => { const f = document.getElementById('heroField'); return { live: f.classList.contains('live'), rested: f.classList.contains('rested') }; });
    check(hero.live && !hero.rested, 'without its finished picture the hero keeps its letters', JSON.stringify(hero));
    await p.evaluate(() => document.getElementById('styles').scrollIntoView()); await p.waitForTimeout(1500);
    const tile = await p.evaluate(() => { const t = document.querySelector('.tile-pic'); const img = t.querySelector('img'); return { cls: t.className, gone: getComputedStyle(img).visibility, alt: t.dataset.alt, after: getComputedStyle(t, '::after').content, before: getComputedStyle(t, '::before').content }; });
    check(/no-pic/.test(tile.cls) && tile.gone === 'hidden' && /Text portrait/.test(tile.alt) && tile.after.includes('Text portrait') && tile.before !== 'none', 'a missing tile picture shows its pattern and its name', tile.cls);
    await p.screenshot({ path: __dirname + '/out/site-missing-picture.png' });
    // the slider: a missing art picture leaves the pattern and its name on the art side, not the photo under a wrong label
    await p.evaluate(() => document.getElementById('cmp').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2600);
    await p.click('#pickLook button[data-k="cloud"]'); await p.waitForTimeout(1500);
    const sl = await p.evaluate(() => { const c = document.getElementById('cmp'), i = c.querySelector('.cmp-inner'); return { cls: c.className, alt: c.dataset.alt, paper: getComputedStyle(i).backgroundColor, pattern: getComputedStyle(i, '::before').content }; });
    check(/art-gone/.test(sl.cls) && /coffee photo as Word cloud/.test(sl.alt) && sl.paper !== 'rgba(0, 0, 0, 0)' && sl.pattern !== 'none', 'a missing slider picture shows the pattern and its name on the art side', JSON.stringify(sl));
    await p.locator('#cmp').screenshot({ path: __dirname + '/out/site-missing-slider.png' });
    await p.click('#pickLook button[data-k="halftone"]'); await p.waitForTimeout(1500);
    check(await p.evaluate(() => !document.getElementById('cmp').classList.contains('no-pic') && !document.getElementById('cmp').dataset.alt), 'the next picture that loads takes its place back');
    check(!errs.length, 'no script errors with a missing picture', errs.join(' | '));
    await ctx.close();
  }
  // ---- opened from disk: the built pages work by a double-click ----
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    // the console stays clean too: no failed request, no refused font preload
    const logged = []; p.on('console', (m) => { if (m.type() === 'error') logged.push(m.text().slice(0, 120)); });
    await p.goto(pathToFileURL(path.join(OUT, 'index.html')).href); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({
      logo: (() => { const i = document.querySelector('.logo img'); return i.complete && i.naturalWidth > 0; })(),
      fonts: ['700 40px "Playfair Display"', '16px Inter', '700 12px Oswald'].every((f) => document.fonts.check(f)) && [...document.fonts].filter((f) => f.family !== 'Playfair Fallback').every((f) => f.status === 'loaded'),
      hero: (() => { const f = document.getElementById('heroField'), s = f.querySelector('.field-still'); return f.classList.contains('live') || (s.complete && s.naturalWidth > 0 && getComputedStyle(s).opacity === '1'); })(),
      tryLink: document.querySelector('.hero .cta .btn-line').getAttribute('href'), home: document.querySelector('.bar .logo').getAttribute('href')
    }));
    check(r.logo && r.fonts, 'from disk: the logo and the fonts load', JSON.stringify({ logo: r.logo, fonts: r.fonts }));
    check(r.hero, 'from disk: the hero shows its letters or its finished picture, never an empty box');
    check(r.tryLink === 'try/index.html' && r.home === './index.html', 'from disk: folder links open their index.html', r.tryLink + ', ' + r.home);
    await p.screenshot({ path: __dirname + '/out/site-file-hero.png' });
    await p.waitForTimeout(4000); await p.mouse.move(5, 5); await p.waitForTimeout(1500);
    await p.screenshot({ path: __dirname + '/out/site-file-hero-rest.png' });
    await p.evaluate(() => document.getElementById('cmp').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2600);
    await p.click('#pickLook button[data-k="cloud"]'); await p.waitForTimeout(1500);
    check(await p.evaluate(() => { const a = document.querySelector('.cmp-art'); return a.getAttribute('src') === 'img/coffee-cloud.webp' && a.complete && a.naturalWidth > 0; }), 'from disk: the slider works, here on the coffee as a Word cloud');
    const rest = await p.evaluate(() => window.__site.compare);
    check(Math.abs(rest - 0.26) < 0.01, 'an untouched divider moves left for the Word cloud, so most of the art shows', rest.toFixed(3));
    await p.click('#cmp ~ .cmp-pick [data-bg-pick] button[data-k="checker"]'); await p.waitForTimeout(1500);
    check(await p.evaluate(() => { const a = document.querySelector('.cmp-art'); return a.getAttribute('src') === 'img/clear/coffee-cloud.webp' && a.complete && a.naturalWidth > 0 && document.getElementById('cmp').dataset.bg === 'checker'; }), 'from disk: the Checker background works');
    await p.screenshot({ path: __dirname + '/out/site-file-bg-checker.png' });
    await p.click('#cmp ~ .cmp-pick [data-bg-pick] button[data-k="paper"]'); await p.waitForTimeout(1200);
    await p.screenshot({ path: __dirname + '/out/site-file-compare.png' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((ok) => setTimeout(ok, 60)); } });
    await p.waitForTimeout(1500);
    const broken = await p.evaluate(() => Array.from(document.images).filter((i) => i.complete && !i.naturalWidth).map((i) => i.src).concat(Array.from(document.querySelectorAll('.no-pic')).map((e) => e.className)));
    check(!broken.length, 'from disk: every picture loads', broken.join(', ') || 'all');
    check(!errs.length, 'from disk: no script errors', errs.join(' | '));
    // the 404 page from disk finds its icon, fonts and the home page next to it
    await p.goto(pathToFileURL(path.join(OUT, '404.html')).href); await p.waitForTimeout(1200);
    const r4 = await p.evaluate(() => ({ logo: (() => { const i = document.querySelector('.logo img'); return i.complete && i.naturalWidth > 0; })(),
      home: document.querySelector('.go a').href, font: document.fonts.check('700 40px "Playfair Display"') }));
    check(r4.logo && r4.font && /\/pages\/index\.html$/.test(r4.home), 'from disk: the 404 page finds its icon, its font and the home page', r4.home);
    check(!logged.length, 'from disk: no errors in the console on the home page and the 404 page', logged.join(' | '));
    await ctx.close();
  }
  // ---- the Background choice in the dark theme, and with storage blocked ----
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    await ctx.addInitScript(() => { const no = () => { throw new Error('storage blocked'); }; Storage.prototype.getItem = no; Storage.prototype.setItem = no; });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(HOME); await p.waitForTimeout(800);
    await p.evaluate(() => document.getElementById('cmp').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2600);
    await p.click('#cmp ~ .cmp-pick [data-bg-pick] button[data-k="checker"]'); await p.waitForTimeout(1500);
    // the squares follow the paper of the art, not the dark theme: light squares under art made on light paper (the
    // coffee Halftone), dark ones under art made on dark paper (the Word cloud); each pair stands apart, and the
    // light pair stands apart from the dark page
    const greys = async () => p.evaluate(() => {
      const lum = (c) => { const m = c.match(/\d+/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      const col = (v) => { const e = document.createElement('i'); e.style.color = v; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; };
      const cs = getComputedStyle(document.getElementById('cmp')), a = lum(col(cs.getPropertyValue('--chk-a'))), b2 = lum(col(cs.getPropertyValue('--chk-b'))), pg = lum(getComputedStyle(document.body).backgroundColor);
      const ratio = (x, y) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      return { squares: ratio(a, b2), page: ratio(a, pg), bg: document.getElementById('cmp').dataset.bg, paper: document.getElementById('cmp').dataset.paper, now: window.__site.background };
    });
    const ch = await greys();
    check(ch.bg === 'checker' && ch.now === 'checker', 'with storage blocked the Background choice still works', JSON.stringify({ bg: ch.bg }));
    check(ch.paper === 'light' && ch.squares > 1.4 && ch.page > 8, 'dark theme: art made on light paper keeps light squares, which stand apart from each other and from the page', ch.squares.toFixed(2) + ' and ' + ch.page.toFixed(2));
    await p.click('#pickLook button[data-k="cloud"]'); await p.waitForTimeout(1500);
    const cd = await greys();
    check(cd.paper === 'dark' && cd.squares > 1.4, 'art made on dark paper gets dark squares that stand apart from each other', cd.squares.toFixed(2));
    await p.click('#pickLook button[data-k="halftone"]'); await p.waitForTimeout(1500);
    await p.evaluate(() => window.__site.setCompare(0.3));
    await p.locator('#cmp').screenshot({ path: __dirname + '/out/site-bg-checker-dark.png' });
    check(!errs.length, 'no script errors with storage blocked', errs.join(' | '));
    await ctx.close();
  }
  // ---- the template in site/ opened by itself ----
  {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(path.join(__dirname, '..', 'site', 'index.html')).href); await p.waitForTimeout(1500);
    check(p.url() === pathToFileURL(path.join(OUT, 'index.html')).href, 'the template opened from disk moves on to the built page', p.url());
    const bn = await p.evaluate(() => { const n = document.querySelector('.build-note'); return n && n.textContent; });
    check(/last build/.test(bn || '') && /npm run site/.test(bn), 'the built page says it is the last build, and how to see newer changes', bn);
    await p.screenshot({ path: __dirname + '/out/site-template-redirect.png' });
    await p.click('.build-note button');
    check(await p.evaluate(() => !document.querySelector('.build-note')), 'the note closes');
    // a copy with no build next to it says how to make one
    const lone = path.join(__dirname, 'out', 'template', 'site');
    fs.mkdirSync(lone, { recursive: true });
    fs.copyFileSync(path.join(__dirname, '..', 'site', 'index.html'), path.join(lone, 'index.html'));
    await p.goto(pathToFileURL(path.join(lone, 'index.html')).href); await p.waitForTimeout(1200);
    const t = await p.evaluate(() => ({ text: document.body.innerText, vis: getComputedStyle(document.documentElement).visibility, imgs: document.images.length }));
    check(/template/.test(t.text) && /npm run site/.test(t.text) && t.vis === 'visible' && !t.imgs, 'without a build, the template says how to build the website', t.text.slice(0, 60));
    await p.screenshot({ path: __dirname + '/out/site-template-note.png' });
    await ctx.close();
  }
  // a phone: a finger that scrolls past the slider leaves the divider alone; a sideways drag moves it
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'light' });
    watch(ctx);
    const p = await ctx.newPage();
    await p.goto(HOME); await p.waitForTimeout(800);
    await p.evaluate(() => document.getElementById('cmp').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(2600);
    await p.evaluate(() => window.__site.setCompare(0.2));
    const cdp = await ctx.newCDPSession(p);
    const box = await p.locator('#cmp').boundingBox();
    const swipe = async (x0, y0, x1, y1) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
      for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 10, y: y0 + (y1 - y0) * i / 10 }] }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(300);
    };
    await swipe(box.x + box.width * 0.7, box.y + box.height * 0.7, box.x + box.width * 0.7, box.y + box.height * 0.2);
    const v = await p.evaluate(() => window.__site.compare);
    check(Math.abs(v - 0.2) < 0.01, 'a vertical swipe over the slider does not move the divider', v.toFixed(3));
    const b2 = await p.locator('#cmp').boundingBox();
    await swipe(b2.x + b2.width * 0.6, b2.y + b2.height * 0.5, b2.x + b2.width * 0.8, b2.y + b2.height * 0.52);
    const h = await p.evaluate(() => window.__site.compare);
    check(h > 0.7, 'a sideways drag with a finger moves it', h.toFixed(3));
    const dl = await p.evaluate(() => document.getElementById('heroDownload').getAttribute('href'));
    check(dl === '#download', 'on a phone, Download leads to the download section', dl);
    await ctx.close();
  }
  // phone width: nothing wider than the screen
  for (const [w, h] of [[390, 844], [768, 1024]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' });
    watch(ctx);
    const p = await ctx.newPage();
    await p.goto(HOME); await p.waitForTimeout(800);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(sw <= w, w + ' px: the page does not scroll sideways', sw);
    await p.goto(HOME + 'missing-page'); await p.waitForTimeout(600);
    const sw4 = await p.evaluate(() => document.documentElement.scrollWidth);
    check(sw4 <= w, w + ' px: the 404 page does not scroll sideways', sw4);
    // the letters fall into a band above the poster, where the first screen shows them
    const band = await p.evaluate(() => { const c = document.getElementById('pile').getBoundingClientRect(), t = document.querySelector('.poster').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, poster: t.top, h: innerHeight }; });
    check(band.bottom <= band.poster && band.bottom < band.h && band.bottom - band.top > 100, w + ' px: the 404 letters have their own band in the first screen', JSON.stringify(band));
    await ctx.close();
  }

  // ---- the 404 page ----
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
    watch(ctx);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const res = await p.goto(HOME + 'deep/old/page.html');
    check(res.status() === 404, 'a missing address answers 404', res.status());
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ t: document.title, where: document.getElementById('where').textContent, n: window.__lost.letters, run: window.__lost.running,
      font: getComputedStyle(document.querySelector('h1')).fontFamily, cat: document.querySelector('.cat pre').textContent.split('\n').length,
      links: Array.from(document.querySelectorAll('.go a')).map((a) => a.href) }));
    check(/not found/i.test(r.t) && r.where.includes('/deep/old/page.html'), 'the 404 page names the missing address', r.where);
    check(r.n > 5 && r.run, 'the letters of the address fall', r.n + ' letters');
    check(r.cat > 20, 'the lost cat is drawn in text', r.cat + ' lines');
    check(r.links[0] === HOME && r.links[1] === HOME + 'try/' && /sourceforge/.test(r.links[2]), 'it links home, to the web app and to the download', r.links.join(' '));
    await p.screenshot({ path: __dirname + '/out/site-404-start.png' });
    await p.waitForTimeout(5000);
    await p.mouse.move(400, 760); await p.mouse.move(700, 770, { steps: 12 });
    await p.screenshot({ path: __dirname + '/out/site-404.png' });
    check(!errs.length, 'no script errors on the 404 page', errs.join(' | '));
    await p.goto(HOME + 'app.js'); await p.waitForTimeout(800);
    check(p.url() === HOME + 'try/app.js', 'an old link to a file of the web app goes on to try/', p.url());
    await ctx.close();
  }

  // ---- the web app under try/ ----
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    watch(ctx);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(HOME + 'try/');
    await p.waitForFunction(() => window.__sungfluence && document.getElementById('webNote'), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const n = await p.evaluate(() => {
      const w = document.getElementById('webNote'); if (!w) return null;
      const r = w.getBoundingClientRect(), m = document.getElementById('menubar').getBoundingClientRect(), c = document.querySelector('.stage, #stage, canvas').getBoundingClientRect();
      return { text: w.textContent, href: w.querySelector('a').href, inBar: Math.abs(r.top - m.top) < 1 && r.bottom <= m.bottom && r.bottom >= m.bottom - 1.5, overCanvas: r.bottom > c.top + 1, op: getComputedStyle(w).opacity };
    });
    check(!!n, 'the web app shows the note about the installed version');
    if (n) {
      check(/installed version/.test(n.text) && /sourceforge\.net\/projects\/sungfluence/.test(n.href), 'the note says why and links to the download', n.text);
      check(n.inBar && !n.overCanvas, 'the note sits in the menu bar, clear of the canvas');
    }
    await p.screenshot({ path: __dirname + '/out/site-try.png' });
    const reg = await p.evaluate(async () => { for (let i = 0; i < 40; i++) { const r = await navigator.serviceWorker.getRegistration(); if (r && r.active) return r.scope; await new Promise((ok) => setTimeout(ok, 250)); } return null; });
    check(reg === HOME + 'try/', 'the web app keeps its own offline worker for try/', reg);
    // once per visitor: a new visit does not show it again, and closing it keeps it away
    const p2 = await ctx.newPage(); await p2.goto(HOME + 'try/'); await p2.waitForTimeout(2500);
    check(!(await p2.evaluate(() => !!document.getElementById('webNote'))), 'a later visit does not show the note again');
    await p2.close();
    await p.click('#webNote .webnote-x'); await p.waitForTimeout(500);
    check(await p.evaluate(() => !document.getElementById('webNote') && localStorage.getItem('sungfluence-webnote') === 'closed'), 'the close button removes the note for good');
    check(!errs.length, 'no script errors in the web app', errs.join(' | '));
    await ctx.close();
  }
  // nor on a phone: the installers are for computers
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    await p.goto(HOME + 'try/'); await p.waitForTimeout(2500);
    check(await p.evaluate(() => !document.getElementById('webNote') && localStorage.getItem('sungfluence-webnote') === null), 'on a phone the web app shows no note, and saves it for a later visit on a computer');
    await ctx.close();
  }
  // the note never shows when the app is opened from disk
  {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(require('url').pathToFileURL(path.join(OUT, 'try', 'index.html')).href); await p.waitForTimeout(2500);
    check(await p.evaluate(() => !document.getElementById('webNote') && !window.__sungfluence.isWebBuild()), 'opened from disk, the app shows no web note');
    await ctx.close();
  }

  // ---- reduced motion ----
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    watch(ctx);
    const p = await ctx.newPage();
    await p.goto(HOME); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ live: document.getElementById('heroField').classList.contains('live'), fields: Object.keys(window.__site.fields || {}).length,
      ticker: getComputedStyle(document.querySelector('.ticker-run')).animationName, still: getComputedStyle(document.querySelector('.field-still')).opacity, p: window.__site.compare }));
    check(!r.live && r.fields === 0 && r.still === '1', 'reduced motion: the hero shows the finished picture, no letters fly', JSON.stringify(r));
    check(r.ticker === 'none', 'reduced motion: the ticker stands still');
    await p.evaluate(() => document.getElementById('drift').scrollIntoView({ block: 'center' })); await p.waitForTimeout(800);
    const ds = await p.evaluate(() => { const i = document.querySelector('.drift-still'); return { ok: i.complete && i.naturalWidth > 0, op: getComputedStyle(i).opacity, w: i.getBoundingClientRect().width }; });
    check(ds.ok && +ds.op > 0.5 && ds.w > 300, 'reduced motion: the letter band shows the finished picture', JSON.stringify(ds));
    check(r.p === 0.5, 'reduced motion: the slider starts in the middle without a sweep');
    await p.goto(HOME + 'nothing-here'); await p.waitForTimeout(800);
    check(await p.evaluate(() => window.__lost.still && !window.__lost.running), 'reduced motion: the 404 letters lie still');
    await p.screenshot({ path: __dirname + '/out/site-404-still.png' });
    await ctx.close();
  }

  // ---- the root worker retires the old web app's offline copy ----
  {
    // a stand-in for the old worker: it cached the app at the root and answered from the cache
    over.set(BASE + 'sw.js', "const CACHE = 'sungfluence-3.3.1-old';\n" +
      "self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./'])).then(() => self.skipWaiting())); });\n" +
      "self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });\n" +
      "self.addEventListener('fetch', (e) => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))); });\n");
    const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(HOME);
    await p.evaluate(async () => {
      await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      // the web app under try/ has a cache of its own, which must stay
      const c = await caches.open('sungfluence-3.3.1-try'); await c.put(new Request('try/index.html'), new Response('app'));
    });
    await p.reload(); await p.waitForTimeout(500);
    const before = await p.evaluate(async () => ({ ctl: !!navigator.serviceWorker.controller, keys: await caches.keys() }));
    check(before.ctl && before.keys.includes('sungfluence-3.3.1-old'), 'the old worker controls the page with its cache', before.keys.join(', '));
    over.delete(BASE + 'sw.js');
    const nav = p.waitForEvent('framenavigated', { timeout: 20000 }).catch(() => null);
    await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    const went = await nav;
    await p.waitForTimeout(1500);
    const after = await p.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope), keys: await caches.keys(), ctl: !!navigator.serviceWorker.controller }));
    check(!!went, 'the new root worker reloads the open page');
    check(!after.keys.includes('sungfluence-3.3.1-old') && after.keys.includes('sungfluence-3.3.1-try'), 'the old offline copy is gone and the web app\'s own cache stays', after.keys.join(', '));
    check(!after.regs.includes(HOME) && !after.ctl, 'the root worker removes itself, so the website comes from the network', after.regs.join(', ') || 'no workers');
    await ctx.close();
  }

  check(!outside.length, 'nothing loads from another server', outside.slice(0, 5).join(' | ') || 'only ' + origin);
  await b.close(); server.close();
  console.log(fails ? fails + ' failed' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
