/* The SungFluence website: letters that assemble into pictures, the before and after slider, and the style tiles.
   Plain JavaScript, no libraries, nothing loaded from other servers. Every animation stops when it is off screen
   or finished, and none runs when the system asks for reduced motion.
   SPDX-License-Identifier: AGPL-3.0-or-later */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => motionQ.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  // seeded random numbers, so the scattered letters land the same way every time
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // An installed copy of the old web app opens here now: send it on to the app, which moved to try/
  if (matchMedia('(display-mode: standalone)').matches) { location.replace('try/'); return; }

  /* ---------- opened from disk: a folder link opens its index.html, as a web server would ---------- */
  if (location.protocol === 'file:') {
    $$('a[href]').forEach((a) => {
      const h = a.getAttribute('href');
      if (/^[a-z]+:|^#|^\/\//i.test(h)) return;
      const cut = h.search(/[?#]/), path = cut < 0 ? h : h.slice(0, cut), tail = cut < 0 ? '' : h.slice(cut);
      if (path === './' || path.endsWith('/')) a.setAttribute('href', path + 'index.html' + tail);
    });
    // Opened through the template (site/index.html), this is the last build, which may be older than the template
    if (/[?&]from=template(&|$)/.test(location.search)) {
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* the address keeps its marker */ }
      const n = document.createElement('div');
      n.className = 'build-note'; n.setAttribute('role', 'status');
      n.innerHTML = '<p>This is the last build of the website. To see changes you made to <code>site/</code>, run <code>npm run site</code> and open it again.</p>' +
        '<button type="button" aria-label="Close this note">&times;</button>';
      $('button', n).addEventListener('click', () => n.remove());
      document.body.appendChild(n);
    }
  }

  /* ---------- a picture that does not load leaves no empty box: its frame shows a quiet pattern of letters ---------- */
  const FRAMES = '.field, .cmp, .tile-pic, .shot, .urdu-art';
  // what the picture was: its alt text, or for a picture that is only decoration (the slider's), its data-desc
  const missing = (img) => {
    img.classList.add('gone');
    const f = img.closest(FRAMES);
    if (!f) return;
    f.classList.add('no-pic');
    // the slider: the side whose picture is missing shows the pattern, and the card sits in the middle of that side
    if (img.classList.contains('cmp-art')) f.classList.add('art-gone');
    if (img.classList.contains('cmp-photo')) f.classList.add('photo-gone');
    const say = img.alt || img.dataset.desc;
    if (say) f.dataset.alt = say;
  };
  addEventListener('error', (e) => { if (e.target instanceof HTMLImageElement) missing(e.target); }, true);
  $$('img').forEach((img) => { if (img.complete && img.getAttribute('src') && !img.naturalWidth) missing(img); });
  // a picture that loads later, such as a new pair in the slider, takes its place back
  // (a load event never reaches the window, so the document listens)
  document.addEventListener('load', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('gone')) return;
    img.classList.remove('gone');
    const f = img.closest(FRAMES);
    if (!f) return;
    if (img.classList.contains('cmp-art')) f.classList.remove('art-gone');
    if (img.classList.contains('cmp-photo')) f.classList.remove('photo-gone');
    const left = f.querySelector('img.gone');
    if (!left) { f.classList.remove('no-pic'); delete f.dataset.alt; } else if (left.alt || left.dataset.desc) f.dataset.alt = left.alt || left.dataset.desc;
  }, true);

  /* ---------- the top bar gets a line once the page scrolls ---------- */
  const bar = $('.bar');
  let barTick = false;
  addEventListener('scroll', () => {
    if (barTick) return; barTick = true;
    requestAnimationFrame(() => { barTick = false; bar.classList.toggle('scrolled', scrollY > 8); });
  }, { passive: true });

  /* ---------- the name always fits its column ----------
     The style sheet sizes it for Playfair Display. Should a wider font stand in (the font did not load, or a
     different serif on another system), it is measured as drawn and made smaller, so it never reaches the art. */
  const mark = $('.wordmark');
  if (mark) {
    const ruler = document.createElement('canvas').getContext('2d');
    const fit = () => {
      mark.style.fontSize = '';
      const cs = getComputedStyle(mark), fs = parseFloat(cs.fontSize);
      ruler.font = '700 ' + fs + 'px ' + cs.fontFamily;
      if ('letterSpacing' in ruler) ruler.letterSpacing = cs.letterSpacing;
      const w = ruler.measureText(mark.getAttribute('aria-label') || mark.textContent).width;
      const hero = mark.closest('.hero'), gap = hero ? parseFloat(getComputedStyle(hero).columnGap) || 0 : 0;
      const room = mark.parentElement.clientWidth + (innerWidth > 900 ? gap / 2 : 0);
      if (w > room) mark.style.fontSize = (fs * room / w).toFixed(2) + 'px';
    };
    fit();
    if (document.fonts) document.fonts.ready.then(fit);
    let fT = 0;
    addEventListener('resize', () => { clearTimeout(fT); fT = setTimeout(fit, 100); });
  }

  /* ---------- the name arrives letter by letter ---------- */
  if (!still() && Element.prototype.animate) {
    let i = 0;
    $$('.wordmark > span').forEach((part) => {
      const t = part.textContent; part.textContent = '';
      for (const ch of t) {
        const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; part.appendChild(s);
        s.animate([{ opacity: 0, transform: 'translateY(.35em) rotate(' + (rnd() * 16 - 8).toFixed(1) + 'deg)' }, { opacity: 1, transform: 'none' }],
          { duration: 900, delay: 120 + i++ * 45, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      }
    });
  }

  /* ---------- letters that fly into a picture ----------
     box: an element with a canvas. Letters of `text` sit on a grid over the picture, colored by it.
     mode 'intro' assembles once when first seen; mode 'scroll' follows the scroll position.
     The pointer pushes letters aside; they spring back. The loop stops whenever nothing moves. */
  function letterField(box, opt) {
    const cv = $('canvas', box), cx = cv.getContext('2d', { alpha: true });
    const img = new Image(); img.decoding = 'async'; img.src = opt.src;
    let W = 0, H = 0, dpr = 1, P = [], visible = false, raf = 0, ready = false, atlas = null, glyph = {}, tint = null, gH = 0;
    let prog = opt.mode === 'scroll' ? 0 : 0, target = 0, t0 = 0;
    const ptr = { x: -1e4, y: -1e4, on: false };
    const text = opt.text.toUpperCase();

    function build() {
      const r = box.getBoundingClientRect();
      W = Math.round(cv.clientWidth || r.width); H = Math.round(cv.clientHeight || r.height);
      if (!W || !H || !img.naturalWidth) return;
      // a little under the screen's full sharpness keeps the frames quick on phones and large screens
      dpr = Math.min(1.5, devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      // where the picture sits: the whole box, or its right part on wide screens
      const area = opt.area ? opt.area(W, H) : { x: 0, y: 0, w: W, h: H };
      // letters set in rows, like the app's Text portrait: a condensed face, each letter as wide as it really is
      const fs = opt.cell(W, H), lh = fs * 0.94;
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.font = '700 ' + fs.toFixed(1) + 'px Oswald, "Arial Narrow", sans-serif';
      const wide = {};
      const adv = (c) => wide[c] || (wide[c] = cx.measureText(c).width);
      // the tones decide how bright each letter is: the picture covers the area, cropped around opt.fx, read at a third of the size
      const sw = Math.max(8, Math.ceil(area.w / 3)), sh = Math.max(8, Math.ceil(area.h / 3));
      const s = document.createElement('canvas'); s.width = sw; s.height = sh;
      const sx = s.getContext('2d', { willReadFrequently: true });
      const k = Math.max(sw / img.naturalWidth, sh / img.naturalHeight), iw = sw / k, ih = sh / k;
      sx.drawImage(img, (img.naturalWidth - iw) * (opt.fx ?? 0.5), (img.naturalHeight - ih) / 2, iw, ih, 0, 0, sw, sh);
      // A page opened from disk (file://) may not read the pixels of its own pictures. Then every letter gets the
      // same tone; the colors still come from the picture, because drawing it needs no reading.
      let d = null;
      try { d = sx.getImageData(0, 0, sw, sh).data; } catch (e) { d = null; }
      seed = 11; P = [];
      let n = 0;
      for (let y = area.y + lh / 2; y < area.y + area.h; y += lh) {
        for (let x = area.x; x < area.x + area.w;) {
          const c = text[n++ % text.length], w = adv(c);
          const hx = x + w / 2, hy = y; x += w;
          if (c === ' ') continue;
          const i = (clamp(((hy - area.y) / area.h * sh) | 0, 0, sh - 1) * sw + clamp(((hx - area.x) / area.w * sw) | 0, 0, sw - 1)) * 4;
          const lum = d ? (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255 : 0.62;
          if (lum < (opt.minLum || 0)) continue;
          // a picture that starts partway across fades in from its left edge
          const a = rnd() * Math.PI * 2, dist = (0.35 + rnd() * 0.9) * Math.max(W, H);
          P.push({
            c, hx, hy, g: null, al: clamp(0.1 + Math.pow(lum, 1.15) * 1.25, 0.12, 1) * (area.x > 0 ? Math.pow(clamp((hx - area.x) / (area.w * 0.22), 0, 1), 1.5) : 1),
            sx: opt.mode === 'scroll' ? rnd() * W * 0.75 : hx + Math.cos(a) * dist,
            sy: opt.mode === 'scroll' ? rnd() * H : hy + Math.sin(a) * dist,
            rot: (rnd() - 0.5) * 3, delay: ((hx - area.x) / area.w * 0.45 + (hy - area.y) / area.h * 0.2 + rnd() * 0.25) * 0.75,
            ox: 0, oy: 0
          });
        }
      }
      // Drawing is fast because every letter is a white stamp from one atlas, and the colors come from the photo
      // in one pass at the end (source-in). Letters still on their way take the color of where they are.
      const chars = [...new Set(P.map((q) => q.c))], gh = Math.ceil(fs * 1.25 * dpr), pad = 2;
      let ax = 0; atlas = document.createElement('canvas'); glyph = {};
      chars.forEach((c) => { const w = Math.ceil(adv(c) * dpr) + pad * 2; glyph[c] = [ax, w]; ax += w; });
      atlas.width = Math.max(1, ax); atlas.height = gh;
      const ac = atlas.getContext('2d');
      ac.font = '700 ' + (fs * dpr).toFixed(1) + 'px Oswald, "Arial Narrow", sans-serif'; ac.textAlign = 'center'; ac.textBaseline = 'middle'; ac.fillStyle = '#fff';
      chars.forEach((c) => ac.fillText(c, glyph[c][0] + glyph[c][1] / 2, gh / 2));
      P.forEach((q) => { q.g = glyph[q.c]; });
      tint = document.createElement('canvas'); tint.width = cv.width; tint.height = cv.height;
      const tc = tint.getContext('2d');
      tc.fillStyle = opt.ground || '#e9c48a'; tc.fillRect(0, 0, tint.width, tint.height);
      tc.filter = 'saturate(1.4) brightness(1.15)';
      const k2 = Math.max(area.w / img.naturalWidth, area.h / img.naturalHeight), iw2 = area.w / k2, ih2 = area.h / k2;
      tc.drawImage(img, (img.naturalWidth - iw2) * (opt.fx ?? 0.5), (img.naturalHeight - ih2) / 2, iw2, ih2, area.x * dpr, area.y * dpr, area.w * dpr, area.h * dpr);
      gH = gh; restAt = -1;
      ready = true;
      kick();
    }

    // One letter: a white stamp from the atlas, turned while it is still flying
    function stamp(q, t) {
      const x = (q.sx + (q.hx - q.sx) * t + q.ox) * dpr, y = (q.sy + (q.hy - q.sy) * t + q.oy) * dpr, g = q.g;
      if (x < -40 || y < -40 || x > cv.width + 40 || y > cv.height + 40) return;
      cx.globalAlpha = q.al * (0.25 + 0.75 * t);
      if (t < 1) {
        const a = q.rot * (1 - t), cs = Math.cos(a), sn = Math.sin(a);
        cx.setTransform(cs, sn, -sn, cs, x, y);
        cx.drawImage(atlas, g[0], 0, g[1], gH, -g[1] / 2, -gH / 2, g[1], gH);
        cx.setTransform(1, 0, 0, 1, 0, 0);
      } else cx.drawImage(atlas, g[0], 0, g[1], gH, x - g[1] / 2, y - gH / 2, g[1], gH);
    }
    // the pointer pushes letters away and they spring back; returns true while a letter is still moving
    const R = 74, R2 = R * R;
    function push(q) {
      let tx = 0, ty = 0;
      if (ptr.on) {
        const dx = q.hx - ptr.x, dy = q.hy - ptr.y, dd = dx * dx + dy * dy;
        if (dd < R2) { const dl = Math.sqrt(dd) || 1, f = Math.pow(1 - dl / R, 2) * 30; tx = dx / dl * f; ty = dy / dl * f; }
      }
      if (!(q.ox || q.oy || tx || ty)) return false;
      q.ox += (tx - q.ox) * 0.18; q.oy += (ty - q.oy) * 0.18;
      if (Math.abs(q.ox - tx) > 0.05 || Math.abs(q.oy - ty) > 0.05) return true;
      q.ox = tx; q.oy = ty; return false;
    }
    function colorIn(x0, y0, w, h) {
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-in';
      cx.drawImage(tint, x0, y0, w, h, x0, y0, w, h);
      cx.globalCompositeOperation = 'source-over';
    }
    // Once the letters rest, the finished picture is kept, and the pointer only redraws the letters around it
    let restAt = -1, box0 = null;
    function frame(now) {
      raf = 0;
      if (!ready || !visible) return;
      let moving = false;
      if (opt.mode === 'intro') {
        if (!t0) t0 = now;
        prog = clamp((now - t0) / 2600, 0, 1.4);
        if (prog < 1.4) moving = true;
      } else {
        const d = target - prog; prog += d * 0.12;
        if (Math.abs(d) > 0.0005) moving = true; else prog = target;
      }
      const tOf = (q) => ease(clamp((prog - q.delay) / 0.55, 0, 1));
      if (!moving && restAt === prog) {
        // the pointer's neighborhood: where it is now and where it was a frame ago
        const pad = 34 + gH / dpr;
        const bx = ptr.on ? [ptr.x - R - pad, ptr.y - R - pad, ptr.x + R + pad, ptr.y + R + pad] : null;
        const u = bx && box0 ? [Math.min(bx[0], box0[0]), Math.min(bx[1], box0[1]), Math.max(bx[2], box0[2]), Math.max(bx[3], box0[3])] : (bx || box0);
        if (!u) return;
        const x0 = Math.max(0, Math.floor(u[0] * dpr)), y0 = Math.max(0, Math.floor(u[1] * dpr));
        const w = Math.min(cv.width, Math.ceil(u[2] * dpr)) - x0, h = Math.min(cv.height, Math.ceil(u[3] * dpr)) - y0;
        if (w <= 0 || h <= 0) { box0 = bx; return; }
        cx.setTransform(1, 0, 0, 1, 0, 0);
        cx.clearRect(x0, y0, w, h);
        cx.save(); cx.beginPath(); cx.rect(x0, y0, w, h); cx.clip();
        const m = gH / dpr, ux0 = u[0] - m, uy0 = u[1] - m, ux1 = u[2] + m, uy1 = u[3] + m;
        let still = true;
        for (let i = 0; i < P.length; i++) {
          const q = P[i];
          if (q.hx < ux0 || q.hx > ux1 || q.hy < uy0 || q.hy > uy1) continue;
          if (push(q)) moving = true;
          if (q.ox || q.oy) still = false;
          stamp(q, 1);
        }
        colorIn(x0, y0, w, h);
        cx.restore();
        box0 = bx || (still ? null : u);
        if (moving || box0) kick();
        return;
      }
      // the whole picture
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.globalCompositeOperation = 'source-over';
      cx.clearRect(0, 0, cv.width, cv.height);
      let pushed = false;
      for (let i = 0; i < P.length; i++) {
        const q = P[i];
        if (push(q)) moving = true;
        if (q.ox || q.oy) pushed = true;
        stamp(q, tOf(q));
      }
      colorIn(0, 0, cv.width, cv.height);
      if (!moving && !pushed && !ptr.on) {
        // the picture is finished: from now on the pointer redraws only its own neighborhood
        restAt = prog; box0 = null;
        if (opt.rest) rest(true);
      }
      if (moving) kick();
    }
    function kick() { if (!raf && visible && ready) raf = requestAnimationFrame(frame); }
    // opt.rest: once the letters rest, the box shows the real render (class rested); the pointer brings the letters back
    let restT = 0;
    function rest(on) {
      clearTimeout(restT);
      // the finished picture takes over only when it loaded; without it the letters stay
      const pic = $('.field-still', box);
      if (on && pic && !(pic.complete && pic.naturalWidth)) return;
      if (on) restT = setTimeout(() => { if (!ptr.on) box.classList.add('rested'); }, 700);
      else box.classList.remove('rested');
    }

    function onScroll() {
      if (opt.mode !== 'scroll') return;
      const r = box.getBoundingClientRect(), vh = innerHeight;
      target = clamp((vh - r.top) / (vh * 0.85 + r.height * 0.15), 0, 1) * 1.4;
      kick();
    }
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { onScroll(); kick(); } }, { rootMargin: '80px' }).observe(box);
    if (opt.mode === 'scroll') addEventListener('scroll', onScroll, { passive: true });
    const move = (e) => { const r = cv.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true; if (opt.rest) rest(false); kick(); };
    const leave = () => { ptr.on = false; if (opt.rest && restAt >= 0) rest(true); kick(); };
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerdown', move);
    box.addEventListener('pointerleave', leave);
    box.addEventListener('pointercancel', leave);
    box.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') leave(); });
    let rT = 0, lastW = 0;
    new ResizeObserver(() => { const w = box.clientWidth; if (w === lastW) return; lastW = w; clearTimeout(rT); rT = setTimeout(() => { build(); onScroll(); }, ready ? 150 : 0); }).observe(box);
    // the canvas shows only once its letters are drawn; if that fails, the finished picture stays
    const go = () => (document.fonts ? document.fonts.load('700 12px Oswald') : Promise.resolve()).catch(() => {}).then(() => {
      try { build(); if (ready) box.classList.add('live'); } catch (e) { ready = false; box.classList.remove('live'); }
    });
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
    // for tests: the average time to draw one frame with the pointer pushing letters, in milliseconds
    const bench = (n) => {
      const keep = Object.assign({}, ptr); ptr.x = W / 2; ptr.y = H / 2; ptr.on = true;
      const t = performance.now();
      for (let i = 0; i < n; i++) { ptr.x = W / 2 + Math.sin(i) * 40; frame(performance.now()); if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      const ms = (performance.now() - t) / n;
      Object.assign(ptr, keep); kick();
      return ms;
    };
    return { get progress() { return prog; }, get letters() { return P.length; }, get running() { return !!raf; }, bench };
  }

  const fields = {};
  if (!still() && window.ResizeObserver && window.IntersectionObserver) {
    const hero = $('#heroField');
    // fewer, larger letters on small screens and sharp phone screens, so every frame stays quick
    const small = () => innerWidth < 900 || devicePixelRatio > 1.5;
    if (hero) fields.hero = letterField(hero, { src: 'img/thumb-face.webp', mode: 'intro', rest: true, text: 'Every picture is a story told in letters and every letter keeps a little of the light ',
      cell: (W) => Math.max(8, W / (small() ? 38 : 46)) });
    const drift = $('#drift');
    if (drift) fields.drift = letterField(drift, { src: 'img/thumb-coffee.webp', mode: 'scroll', minLum: 0.14, fx: 0.62, text: 'Open a photo pick a style export it ',
      cell: (W) => (W < 1000 ? (small() ? 13 : 12) : 15),
      area: (W, H) => (W < 1000 ? { x: 0, y: 0, w: W, h: H } : { x: W * 0.4, y: 0, w: W * 0.6, h: H }) });
  }

  /* ---------- a row of choices that works like radio buttons: click, or the arrow keys, Home and End move and pick ----------
     Returns mark(k), which shows a choice as picked without running onPick (for groups that mirror each other). */
  function radios(group, onPick) {
    const bs = $$('button', group);
    const mark = (k) => bs.forEach((x) => { const on = x.dataset.k === k; x.setAttribute('aria-checked', on); x.tabIndex = on ? 0 : -1; });
    const pick = (b, focus) => { mark(b.dataset.k); if (focus) b.focus(); onPick(b.dataset.k); };
    bs.forEach((b) => {
      b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
      b.addEventListener('click', () => pick(b));
      b.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        const to = d ? bs[(bs.indexOf(b) + d + bs.length) % bs.length] : e.key === 'Home' ? bs[0] : e.key === 'End' ? bs[bs.length - 1] : null;
        if (!to) return; e.preventDefault();
        pick(to, true);
      });
    });
    return mark;
  }

  /* ---------- the background behind the text art ----------
     paper: the art as drawn, on its own paper. checker: the same art exported with a transparent background
     (img/clear/) over a checkerboard. black, white: art that shows on that ground. Art made on dark paper is already
     fitted to a dark ground, so on black it is the transparent copy; on white it is the same look made again by the
     app on white paper (img/white/), which fits its colors to white. Art made on light paper works the other way
     round (img/black/). Each picture says which paper it was made on (data-paper: light or dark); the checkerboard
     takes the greys the app uses for that paper, so the art reads on it in either theme of the page.
     The pictures for a background load only once it is picked. The choice is kept for the visitor; storage may be
     missing (a private window, blocked site data), so every use is guarded and the page works without it. */
  const BGS = ['paper', 'checker', 'black', 'white'], BG_KEY = 'sungfluence-site-background';
  let artBg = 'paper';
  try { const v = localStorage.getItem(BG_KEY); if (BGS.includes(v)) artBg = v; } catch (e) { /* no storage: start on paper */ }
  // the folder of a picture for a background, for art made on light or dark paper
  const folderOf = (k, paper) => (k === 'paper' ? '' : k === 'checker' || (k === 'black') === (paper === 'dark') ? 'clear/' : k + '/');
  const artOf = (u, k, paper) => { const f = folderOf(k, paper); return f ? u.replace(/(^|\s|,)img\//g, '$1img/' + f) : u; };
  const bgWatch = [], bgMarks = [];
  const setBg = (k) => {
    if (!BGS.includes(k) || k === artBg) { bgMarks.forEach((m) => m(artBg)); return; }
    artBg = k;
    try { localStorage.setItem(BG_KEY, k); } catch (e) { /* not kept, still applied */ }
    bgMarks.forEach((m) => m(k));
    bgWatch.forEach((fn) => fn(k));
  };
  $$('[data-bg-pick]').forEach((g) => { const mark = radios(g, setBg); mark(artBg); bgMarks.push(mark); });

  /* ---------- before and after ---------- */
  const cmp = $('#cmp');
  if (cmp) {
    const handle = $('#cmpHandle'), lettersEl = $('.cmp-letters', cmp), tagL = $('.cmp-tag-l', cmp), tagR = $('#cmpTag');
    const photo = $('.cmp-photo', cmp), art = $('.cmp-art', cmp), open = $('#cmpOpen');
    const NAMES = { portrait: 'Text portrait', cloud: 'Word cloud', halftone: 'Halftone', ascii: 'ASCII', braille: 'Braille' };
    const SAMPLE_NAMES = { coffee: 'coffee', cat: 'cat', face: 'face', rocket: 'rocket' };
    // the looks made on dark paper (see scripts/site-images.js); the others are on light paper
    const DARK = { portrait: 'coffee cat face rocket', cloud: 'coffee cat face rocket', ascii: 'coffee face', braille: 'coffee face' };
    const paperOf = () => ((DARK[look] || '').split(' ').includes(sample) ? 'dark' : 'light');
    let p = 0.5, sample = 'coffee', look = 'halftone';
    // Where the divider rests for each look. A Word cloud keeps its words where the photo is dark or busy, which is
    // often the left half, so it rests further left and shows most of the art. Once the user moves the divider, it stays.
    const REST = { cloud: 0.26 };
    const restOf = (k) => REST[k] ?? 0.5;
    let moved = false, swept = still(), glideRaf = 0;
    // the value is the share of the photo, left of the divider, so the right arrow raises it
    const setP = (v) => {
      p = clamp(v, 0, 1);
      cmp.style.setProperty('--p', p.toFixed(4));
      const pc = Math.round(p * 100);
      handle.setAttribute('aria-valuenow', pc);
      handle.setAttribute('aria-valuetext', pc + ' percent photo, ' + (100 - pc) + ' percent text art');
      tagL.style.opacity = p < 0.14 ? 0 : 1; tagR.style.opacity = p > 0.86 ? 0 : 1;
    };
    const size = () => cmp.style.setProperty('--w', cmp.clientWidth + 'px');
    new ResizeObserver(() => { size(); buildLetters(); }).observe(cmp);
    size();

    // the divider is a column of letters; they scramble while it moves and settle back into the name
    const WORD = 'SUNGFLUENCE·', RAMP = '.:-=+*#%@&$ABCDEFGHKMNRSWX';
    let cells = [], energy = 0, scr = 0;
    function buildLetters() {
      const n = Math.max(8, Math.floor(cmp.clientHeight / 20));
      if (n === cells.length) return;
      lettersEl.replaceChildren(); cells = [];
      for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.textContent = WORD[i % WORD.length]; lettersEl.appendChild(s); cells.push(s); }
    }
    buildLetters();
    function scramble() {
      scr = 0;
      energy *= 0.9;
      cells.forEach((s, i) => { s.textContent = rnd() < energy ? RAMP[(rnd() * RAMP.length) | 0] : WORD[i % WORD.length]; });
      if (energy > 0.02) scr = requestAnimationFrame(scramble);
      else cells.forEach((s, i) => { s.textContent = WORD[i % WORD.length]; });
    }
    const stir = (amount) => { if (still()) return; energy = Math.min(1, energy + amount); if (!scr) scr = requestAnimationFrame(scramble); };

    /* A mouse or pen moves the divider where it presses. A finger must not: a swipe up or down over the slider scrolls
       the page. So a touch near the divider picks it up, and a touch elsewhere waits until it moves sideways. */
    let drag = false, lastX = 0, grab = 0, p0 = 0.5, wait = null;
    const fromX = (x) => { const r = cmp.getBoundingClientRect(); return (x - r.left) / r.width; };
    const start = (e, offset) => {
      drag = true; moved = true; cancelAnimationFrame(glideRaf); cmp.classList.add('drag');
      try { cmp.setPointerCapture(e.pointerId); } catch (err) { /* the pointer is gone */ }
      grab = offset; lastX = e.clientX; setP(fromX(e.clientX) + grab); stir(0.4); handle.focus({ preventScroll: true });
    };
    cmp.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      p0 = p;
      if (e.pointerType !== 'touch') { start(e, 0); return; }
      const near = Math.abs(e.clientX - (cmp.getBoundingClientRect().left + p * cmp.clientWidth)) < 30;
      if (near) start(e, p - fromX(e.clientX)); else wait = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    cmp.addEventListener('pointermove', (e) => {
      if (wait && e.pointerId === wait.id) {
        const dx = Math.abs(e.clientX - wait.x), dy = Math.abs(e.clientY - wait.y);
        if (dx > 8 && dx > dy) { wait = null; start(e, 0); } else if (dy > 8) wait = null;
        return;
      }
      if (!drag) return;
      stir(Math.min(0.5, Math.abs(e.clientX - lastX) / 60)); lastX = e.clientX;
      setP(fromX(e.clientX) + grab);
    });
    const end = () => { drag = false; wait = null; cmp.classList.remove('drag'); };
    cmp.addEventListener('pointerup', end);
    // the browser took the touch for a scroll after all: put the divider back
    cmp.addEventListener('pointercancel', (e) => { if (drag && e.pointerType === 'touch') setP(p0); end(); });
    handle.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: -0.02, ArrowDown: -0.02, ArrowRight: 0.02, ArrowUp: 0.02, PageDown: -0.1, PageUp: 0.1 }[e.key];
      const to = step !== undefined ? p + step : e.key === 'Home' ? 0 : e.key === 'End' ? 1 : null;
      if (to === null) return;
      e.preventDefault(); moved = true; cancelAnimationFrame(glideRaf); setP(to); stir(step !== undefined ? 0.3 : 0.6);
    });

    // first look: the text art sweeps in from the right
    if (!still()) {
      setP(1);
      let done = false;
      new IntersectionObserver((es, ob) => {
        if (done || !es[0].isIntersecting) return;
        done = true; ob.disconnect();
        const tS = performance.now();
        const step = (now) => {
          if (drag) { swept = true; return; }
          const t = clamp((now - tS) / 1500, 0, 1);
          setP(1 - (1 - restOf(look)) * ease(t)); if (t < 0.85) stir(0.25);
          if (t < 1) requestAnimationFrame(step); else swept = true;
        };
        setTimeout(() => requestAnimationFrame(step), 250);
      }, { threshold: 0.45 }).observe(cmp);
    } else setP(restOf(look));
    // a new look moves an untouched divider to where that look rests
    const glide = (to) => {
      cancelAnimationFrame(glideRaf);
      if (moved || !swept || Math.abs(to - p) < 0.005) return;
      if (still()) { setP(to); return; }
      const from = p, tS = performance.now();
      const step = (now) => {
        if (drag) return;
        const t = clamp((now - tS) / 700, 0, 1);
        setP(from + (to - from) * ease(t));
        if (t < 1) glideRaf = requestAnimationFrame(step);
      };
      glideRaf = requestAnimationFrame(step);
    };

    // pick a photo and a style
    // each picture comes in three sizes; the browser picks one for the screen, and the preload asks for the same one
    const set = (name) => ['img/' + name + '.webp', 'img/' + name + '-640.webp 640w, img/' + name + '-960.webp 960w, img/' + name + '.webp 1200w'];
    const load = ([src, srcset]) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(res); i.sizes = photo.sizes; i.srcset = srcset; i.src = src; });
    // the full-size copy: a transparent picture opens on the dark page of the browser's viewer, where art made for
    // light paper would vanish, so a transparent choice links to the art on its paper
    const fullOf = (on, as) => (as[0].includes('/clear/') ? on[0] : as[0]);
    let token = 0;
    async function show() {
      const my = ++token, bg = artBg, paper = paperOf(), ps = set('photo-' + sample), on = set(sample + '-' + look), as = on.map((u) => artOf(u, bg, paper));
      cmp.setAttribute('aria-busy', 'true');
      await Promise.all([load(ps), load(as)]);
      if (my !== token) return;
      // what each picture shows, for the card a missing picture leaves
      photo.dataset.desc = 'The ' + SAMPLE_NAMES[sample] + ' photo';
      art.dataset.desc = 'The ' + SAMPLE_NAMES[sample] + ' photo as ' + NAMES[look];
      const swap = () => { photo.srcset = ps[1]; photo.src = ps[0]; art.srcset = as[1]; art.src = as[0]; photo.classList.remove('fading'); art.classList.remove('fading'); cmp.dataset.bg = bg; cmp.dataset.paper = paper; cmp.removeAttribute('aria-busy'); };
      if (still()) swap();
      else { if (photo.getAttribute('src') !== ps[0]) photo.classList.add('fading'); art.classList.add('fading'); setTimeout(swap, 220); stir(0.8); }
      tagR.textContent = NAMES[look];
      open.href = fullOf(on, as);
      $('#cmpCap').textContent = 'The ' + SAMPLE_NAMES[sample] + ' photo and its ' + NAMES[look] + '.';
    }
    radios($('#pickSample'), (k) => { sample = k; show(); });
    radios($('#pickLook'), (k) => { look = k; show(); glide(restOf(k)); });
    // a new background changes the picture with it (show swaps both at once); a remembered one is set before the
    // first picture loads
    cmp.dataset.bg = 'paper'; cmp.dataset.paper = paperOf();
    if (artBg !== 'paper') {
      const on = set(sample + '-' + look), as = on.map((u) => artOf(u, artBg, paperOf()));
      art.srcset = as[1]; art.src = as[0]; open.href = fullOf(on, as); cmp.dataset.bg = artBg;
    }
    bgWatch.push(() => show());
    window.__site = window.__site || {};
    Object.defineProperty(window.__site, 'compare', { get: () => p, configurable: true });
    window.__site.setCompare = setP;
  }

  /* ---------- style tiles: the background choice. A tile takes its new background once its new picture has
     loaded, so a picture on paper never shows over the wrong color. Pictures far below load when they come near. */
  const tileArt = $$('.tile-pic > img:first-child').map((img) => ({ img, pic: img.parentElement, paper: img.parentElement.dataset.paper, src: img.getAttribute('src'), set: img.getAttribute('srcset') }));
  const tileBg = (k) => tileArt.forEach((t) => {
    const src = artOf(t.src, k, t.paper);
    if (t.img.getAttribute('src') === src) { t.pic.dataset.bg = k; t.img.removeAttribute('data-bg'); return; }
    t.img.dataset.bg = k; t.img.srcset = artOf(t.set, k, t.paper); t.img.src = src;
  });
  document.addEventListener('load', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.bg) return;
    const t = tileArt.find((x) => x.img === img);
    if (t && img.getAttribute('src') === artOf(t.src, artBg, t.paper)) { t.pic.dataset.bg = img.dataset.bg; img.removeAttribute('data-bg'); }
  }, true);
  tileArt.forEach((t) => { t.pic.dataset.bg = 'paper'; });
  if (artBg !== 'paper') tileBg(artBg);
  bgWatch.push(tileBg);
  window.__site = window.__site || {};
  Object.defineProperty(window.__site, 'background', { get: () => artBg, configurable: true });
  window.__site.setBackground = setBg;

  /* ---------- style tiles: a lens shows the photo under the art; a click or tap shows all of it ---------- */
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  $$('.tile[data-photo]').forEach((tile) => {
    const pic = $('.tile-pic', tile), name = $('h3', tile).textContent, src = 'img/thumb-' + tile.dataset.photo + '.webp';
    const ph = new Image(); ph.className = 'tile-photo'; ph.alt = ''; ph.loading = 'lazy'; ph.decoding = 'async'; ph.src = src; ph.width = 480; ph.height = 480;
    pic.appendChild(ph);
    pic.tabIndex = 0; pic.setAttribute('role', 'button'); pic.setAttribute('aria-pressed', 'false');
    pic.setAttribute('aria-label', 'Show the photo behind the ' + name + ' example');
    const toggle = () => { const on = !tile.classList.contains('show'); tile.classList.toggle('show', on); pic.setAttribute('aria-pressed', on); };
    pic.addEventListener('click', toggle);
    pic.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    let lens = null;
    pic.addEventListener('pointerenter', (e) => {
      if (!fine.matches || still()) return;
      if (!lens) {
        lens = document.createElement('div'); lens.className = 'lens';
        const li = new Image(); li.alt = ''; li.src = src; lens.appendChild(li); pic.appendChild(lens);
      }
      const li = lens.firstChild; li.style.width = pic.clientWidth + 'px'; li.style.height = pic.clientHeight + 'px';
      tile.classList.add('lensing'); place(e);
    });
    const place = (e) => { if (!lens) return; const r = pic.getBoundingClientRect(); pic.style.setProperty('--lx', (e.clientX - r.left).toFixed(1) + 'px'); pic.style.setProperty('--ly', (e.clientY - r.top).toFixed(1) + 'px'); };
    pic.addEventListener('pointermove', place);
    pic.addEventListener('pointerleave', () => tile.classList.remove('lensing'));
  });

  /* ---------- on a phone, Download leads to the download section: the installers are for computers ---------- */
  if (matchMedia('(hover: none) and (pointer: coarse)').matches) $$('#heroDownload, .bar .btn-gold').forEach((a) => { a.href = '#download'; });

  /* ---------- the ticker stops when it is off screen ---------- */
  const ticker = $('.ticker');
  if (ticker && window.IntersectionObserver) new IntersectionObserver((es) => ticker.classList.toggle('paused', !es[0].isIntersecting)).observe(ticker);

  /* ---------- sections rise in once ---------- */
  if (!still() && window.IntersectionObserver) {
    const els = $$('.sec-head, .tile, .formats li, .os li, .card, .split > *, .links li');
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight) return; // already on screen: leave it alone
      const sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sib % 4, 3) * 70 + 'ms';
      el.classList.add('reveal'); io.observe(el);
    });
  }
  window.__site = window.__site || {};
  window.__site.fields = fields;
})();
