/*  Contour words: a SungFluence plugin
    Text follows lines of equal tone, like contour lines on a topographic map
    or depth lines on a river survey. Every Nth line is bolder, as on real maps.

    Method: the picture's tone is sampled on a small grid, smoothed, and cut at
    evenly spaced levels with marching squares. Line pieces are joined into
    long contours, and the layer's text is written along them.
    MIT licensed. */

Sungfluence.plugin({
  api: 1,
  id: 'contour-words',
  name: 'Contours',
  icon: '≈',
  version: '1.0.0',
  author: 'SungFluence',
  description: 'Text along lines of equal tone, like a topographic or river depth map.',
  stage: 'Drawing contour lines',

  defaults: { text: 'river · flow · depth · current · bank · bed · sediment · channel', levels: 10, size: 11, smooth: 4, detail: 260, index: 5, minLen: 4, color: 'ink', font: 'condensed', weight: 500, upper: true, sep: ' · ', tracking: 0.04 },

  controls: [
    { key: 'text', label: 'Text along the contours', type: 'textarea' },
    { key: 'levels', label: 'Contour lines', type: 'range', min: 3, max: 40, step: 1 },
    { key: 'size', label: 'Letter size', type: 'range', min: 4, max: 40, step: 0.5 },
    { key: 'smooth', label: 'Smoothness', type: 'range', min: 1, max: 12, step: 1 },
    { type: 'color', options: ['ink', 'image', 'tone', 'duotone'] },
    { type: 'font' },
    { key: 'index', label: 'Bold line', type: 'choice', options: [[0, 'Off'], [4, 'Every 4th'], [5, 'Every 5th']], more: true },
    { key: 'detail', label: 'Detail', type: 'range', min: 120, max: 480, step: 10, more: true },
    { key: 'minLen', label: 'Shortest line, in letters', type: 'range', min: 1, max: 20, step: 1, more: true },
    { key: 'upper', label: 'Capitals', type: 'toggle', more: true }
  ],

  *render(api) {
    const p = api.params;
    // 1. Sample the tone on a fixed grid, so previews and exports draw the same lines.
    const gw = Math.max(16, Math.round(p.detail));
    const gh = Math.max(16, Math.round(gw * api.H / api.W));
    const cw = api.W / gw, ch = api.H / gh;
    let f = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) f[y * gw + x] = api.area(x * cw, y * ch, (x + 1) * cw, (y + 1) * ch).ink;
      if (y % 40 === 0) yield 0.1 * y / gh;
    }
    f = api.blur(f, gw, gh, p.smooth);

    const nLev = Math.max(1, Math.round(p.levels));
    const plain = [], bold = [];
    const minPx = p.minLen * p.size * 0.6;
    // edge ids: horizontal edge (x,y)-(x+1,y) is 2*(y*gw+x); vertical edge (x,y)-(x,y+1) is 2*(y*gw+x)+1
    const nE = 2 * gw * gh;
    const ex = new Float32Array(nE), ey = new Float32Array(nE);
    const a1 = new Int32Array(nE), a2 = new Int32Array(nE), seen = new Uint8Array(nE);

    for (let li = 0; li < nLev; li++) {
      yield 0.1 + 0.6 * li / nLev;
      const t = (li + 1) / (nLev + 1);
      a1.fill(-1); a2.fill(-1); seen.fill(0);
      const touched = [];
      const point = (e) => {
        const c = e >> 1, x = c % gw, y = (c / gw) | 0;
        const v0 = f[c], v1 = (e & 1) ? f[c + gw] : f[c + 1];
        const k = Math.min(1, Math.max(0, (t - v0) / ((v1 - v0) || 1e-6)));
        ex[e] = ((e & 1) ? x : x + k) + 0.5;
        ey[e] = ((e & 1) ? y + k : y) + 0.5;
      };
      const link = (e1, e2) => {
        for (const [a, b] of [[e1, e2], [e2, e1]]) {
          if (a1[a] < 0 && a2[a] < 0) { touched.push(a); point(a); }
          if (a1[a] < 0) a1[a] = b; else a2[a] = b;
        }
      };
      for (let y = 0; y < gh - 1; y++) {
        for (let x = 0; x < gw - 1; x++) {
          const i = y * gw + x;
          const code = (f[i] > t ? 8 : 0) | (f[i + 1] > t ? 4 : 0) | (f[i + gw + 1] > t ? 2 : 0) | (f[i + gw] > t ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const top = 2 * i, bottom = 2 * (i + gw), left = 2 * i + 1, right = 2 * (i + 1) + 1;
          switch (code) {
            case 1: case 14: link(left, bottom); break;
            case 2: case 13: link(bottom, right); break;
            case 3: case 12: link(left, right); break;
            case 4: case 11: link(top, right); break;
            case 6: case 9: link(top, bottom); break;
            case 7: case 8: link(left, top); break;
            case 5: link(left, top); link(bottom, right); break;
            case 10: link(top, right); link(left, bottom); break;
          }
        }
      }
      // 2. Join the pieces into long lines. Open lines first, then closed loops.
      const isIndex = p.index > 0 && (li + 1) % p.index === 0;
      const walk = (start) => {
        const pts = [];
        let prev = -1, cur = start;
        while (cur >= 0 && !seen[cur]) {
          seen[cur] = 1;
          pts.push([ex[cur] * cw, ey[cur] * ch]);
          const n = a1[cur] !== prev ? a1[cur] : a2[cur];
          prev = cur; cur = n;
        }
        if (cur === start && pts.length > 2) pts.push(pts[0].slice());
        let len = 0;
        for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        if (len >= minPx) (isIndex ? bold : plain).push(pts);
      };
      for (const e of touched) if (!seen[e] && (a1[e] < 0 || a2[e] < 0)) walk(e);
      for (const e of touched) if (!seen[e]) walk(e);
    }

    // 3. Write the text along the contours. Bold lines get heavier, slightly larger letters.
    const write = function* (paths, o, from, to) {
      if (!paths.length) return;
      const g = api.writeAlong(paths, o);
      let s;
      while (!(s = g.next()).done) yield from + (to - from) * (s.value || 0);
    };
    yield* write(plain, { size: p.size }, 0.7, 0.9);
    yield* write(bold, { size: p.size * 1.15, weight: Math.min(900, (p.weight || 500) + 300) }, 0.9, 1);
  }
});
