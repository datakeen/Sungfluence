/*  Confetti: a built-in SungFluence style.
    Letters are packed from large to small. Calm areas get large letters, detailed areas (eyes, a mouth, whiskers)
    get small ones, so a face stays a face. Letters can turn along the lines of the picture.
    MIT licensed, like the plugin template, so plugin authors can borrow from it.
*/
Sungfluence.plugin({
  api: 1,
  id: 'confetti',
  name: 'Confetti',
  icon: 'a*b',
  version: '2.0.0',
  author: 'SungFluence',
  description: 'Packed letters: large in calm areas, small in the details, turned along the picture.',
  inkDriven: true,
  defaults: { text: 'confetti', density: 1, maxSize: 44, minSize: 8, detail: 0.7, turn: 'flow', spin: 0.3, overlap: 0.15, power: 1, weightMod: true, color: 'image', colorLift: 0.35, font: 'sans', weight: 700, upper: false, sep: '' },
  controls: [
    { key: 'text', label: 'Letters to scatter', type: 'textarea' },
    { key: 'density', label: 'Density', type: 'range', min: 0.3, max: 2, step: 0.05 },
    { key: 'maxSize', label: 'Largest letter', type: 'range', min: 8, max: 120, step: 1 },
    { key: 'minSize', label: 'Smallest letter', type: 'range', min: 2, max: 30, step: 0.5 },
    { key: 'detail', label: 'Small letters in the details', type: 'range', min: 0, max: 1, step: 0.05 },
    { key: 'turn', label: 'Letters turn', type: 'choice', options: [['flow', 'Along the picture'], ['random', 'At random'], ['upright', 'Upright']] },
    { type: 'color', options: ['image', 'ink', 'tone', 'duotone'] },
    { type: 'font' },
    { key: 'spin', label: 'Extra spin', type: 'range', min: 0, max: 1, step: 0.05, more: true },
    { key: 'overlap', label: 'Overlap', type: 'range', min: 0, max: 0.9, step: 0.05, more: true },
    { key: 'power', label: 'Leave light areas emptier', type: 'range', min: 0.3, max: 3, step: 0.1, more: true },
    { key: 'weightMod', label: 'Bolder letters in dark areas', type: 'toggle', more: true },
    { key: 'upper', label: 'Capitals', type: 'toggle', more: true }
  ],

  *render(api) {
    const p = api.params, W = api.W, H = api.H, R = api.random;
    const G = api.grid;
    const minS = Math.max(1.5, Math.min(p.minSize, p.maxSize)), maxS = Math.max(minS, p.maxSize);

    // 1. detail: how much the tone changes nearby. High in eyes and edges, low in flat fur or sky.
    // It is measured on a small copy of the tones (at most 400 across): detail at letter scale needs no more.
    const f = Math.max(1, Math.ceil(G.w / 400)), gw = Math.ceil(G.w / f), gh = Math.ceil(G.h / f), n = gw * gh;
    const small = new Float32Array(n);
    for (let y = 0; y < gh; y++) {
      if ((y & 63) === 0) yield 0.02 * y / gh;
      for (let x = 0; x < gw; x++) {
        let s = 0, c = 0;
        for (let yy = y * f; yy < Math.min(G.h, y * f + f); yy++) for (let xx = x * f; xx < Math.min(G.w, x * f + f); xx++) { s += G.ink[yy * G.w + xx]; c++; }
        small[y * gw + x] = s / c;
      }
    }
    // measured at the scale of a letter, so fur and grain do not count as detail
    const r1 = Math.max(1, Math.round(gw / 110)), r2 = Math.max(2, Math.round(gw / 28));
    const fine = api.blur(small, gw, gh, r1);
    yield 0.04;
    const coarse = api.blur(small, gw, gh, r2);
    yield 0.08;
    let det = new Float32Array(n);
    for (let i = 0; i < n; i++) det[i] = Math.abs(fine[i] - coarse[i]);
    det = api.blur(det, gw, gh, Math.max(1, Math.round(gw / 60)));
    yield 0.12;
    // the 98.5th percentile from a histogram: sorting a full-size picture would freeze the window
    let top = 1e-6;
    for (let i = 0; i < n; i++) if (det[i] > top) top = det[i];
    const hist = new Uint32Array(512);
    for (let i = 0; i < n; i++) hist[Math.min(511, Math.floor(det[i] / top * 511))]++;
    let acc = 0, bin = 511;
    for (let k = 0; k < 512; k++) { acc += hist[k]; if (acc >= n * 0.985) { bin = k; break; } }
    const hi = Math.max(1e-3, (bin + 1) / 512 * top);
    for (let i = 0; i < n; i++) det[i] = Math.min(1, det[i] / hi);
    yield 0.16;
    const gi = (x, y) => Math.min(gh - 1, Math.max(0, Math.floor(y / H * gh))) * gw + Math.min(gw - 1, Math.max(0, Math.floor(x / W * gw)));
    // direction along the edges, from the smoothed tones
    const flowAt = (x, y) => {
      const X = Math.min(gw - 2, Math.max(1, Math.floor(x / W * gw))), Y = Math.min(gh - 2, Math.max(1, Math.floor(y / H * gh)));
      const i = Y * gw + X;
      const dx = coarse[i + 1] - coarse[i - 1], dy = coarse[i + gw] - coarse[i - gw];
      if (Math.abs(dx) + Math.abs(dy) < 1e-4) return 0;
      let a = Math.atan2(dy, dx) + Math.PI / 2;
      // keep letters readable: never upside down
      while (a > Math.PI / 2) a -= Math.PI;
      while (a < -Math.PI / 2) a += Math.PI;
      return a;
    };

    // 2. occupancy grid: a placed letter claims a round spot, so letters do not pile up
    const cell = Math.max(1, minS * 0.5), cw = Math.ceil(W / cell), ch = Math.ceil(H / cell);
    const used = new Uint8Array(cw * ch);
    const free = (x, y, rad) => {
      const c0 = Math.floor((x - rad) / cell), c1 = Math.floor((x + rad) / cell), r0 = Math.floor((y - rad) / cell), r1c = Math.floor((y + rad) / cell);
      for (let r = Math.max(0, r0); r <= Math.min(ch - 1, r1c); r++) for (let c = Math.max(0, c0); c <= Math.min(cw - 1, c1); c++) {
        const cx = (c + 0.5) * cell - x, cy = (r + 0.5) * cell - y;
        if (cx * cx + cy * cy <= rad * rad && used[r * cw + c]) return false;
      }
      return true;
    };
    const claim = (x, y, rad) => {
      const c0 = Math.floor((x - rad) / cell), c1 = Math.floor((x + rad) / cell), r0 = Math.floor((y - rad) / cell), r1c = Math.floor((y + rad) / cell);
      for (let r = Math.max(0, r0); r <= Math.min(ch - 1, r1c); r++) for (let c = Math.max(0, c0); c <= Math.min(cw - 1, c1); c++) {
        const cx = (c + 0.5) * cell - x, cy = (r + 0.5) * cell - y;
        if (cx * cx + cy * cy <= rad * rad) used[r * cw + c] = 1;
      }
    };

    // 3. sizes from large to small. A size is allowed where the detail is low enough for it.
    const levels = Math.max(2, Math.min(9, Math.round(Math.log(maxS / minS) / Math.log(1.45)) + 1));
    const letters = api.text({ sep: p.sep ?? '' });
    const nextLetter = () => { for (let k = 0; k < 6; k++) { const c = letters.next(); if (c !== ' ') return c; } return null; };
    const keep = 1 - (p.overlap ?? 0.2);
    const dens = p.density ?? 1, dw = p.detail ?? 0.8, pow = p.power ?? 1;
    let done = 0;
    for (let L = 0; L < levels; L++) {
      const t = levels === 1 ? 1 : L / (levels - 1);
      const s = maxS * Math.pow(minS / maxS, t);
      const step = Math.max(1, s * 0.85 / dens);
      const last = L === levels - 1;
      for (let y = step / 2; y < H; y += step) {
        if ((++done & 7) === 0) yield 0.18 + 0.8 * (L + y / H) / levels;
        for (let x = step / 2; x < W; x += step) {
          const px = x + (R() - 0.5) * step, py = y + (R() - 0.5) * step;
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const ink = api.ink(px, py);
          // a letter covers only part of its spot, so mid tones need most spots filled
          if (ink < 0.04 || R() > Math.pow(Math.min(1, ink * 1.6), pow)) continue;
          // the largest letter this spot can take: detailed spots take only small letters
          const d = det[gi(px, py)];
          const fit = maxS * Math.pow(minS / maxS, Math.min(1, Math.pow(d, 1.3) * dw * 1.8));
          if (s > fit * 1.2 && !last) continue;
          // dark areas pack tighter, so they read darker
          const rad = s * 0.5 * keep * (1 - 0.35 * ink);
          if (!free(px, py, rad)) continue;
          const c = nextLetter();
          if (!c) continue;
          claim(px, py, rad);
          let angle = 0;
          if (p.turn === 'flow') angle = flowAt(px, py);
          else if (p.turn === 'random') angle = (R() - 0.5) * Math.PI * 1.4;
          angle += (R() - 0.5) * Math.PI * (p.spin ?? 0.3);
          // letters a little smaller in light areas, so tones still read
          api.addText(c, px, py, { size: s * (0.75 + 0.25 * ink), angle, weight: p.weightMod === false ? undefined : Math.round((400 + 500 * ink) / 100) * 100 });
        }
      }
    }
  }
});
