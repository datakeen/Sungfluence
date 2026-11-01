Sungfluence.plugin({
  api: 1, id: 'barcode', name: 'Barcode', icon: '|||', version: '0.1.0', author: 'Test',
  defaults: { bars: 140, color: 'ink' },
  controls: [{ key: 'bars', label: 'Bars', type: 'range', min: 20, max: 400, step: 1 }, { type: 'color', options: ['ink', 'image'] },
    { key: 'shape', label: 'Shape', type: 'choice', options: [['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'D'], ['e', 'E']] }],
  render(api) {
    const n = api.params.bars, w = api.W / n;
    for (let i = 0; i < n; i++) { const x = (i + 0.5) * w; for (let y = 0; y < api.H; y += 8) { const k = api.ink(x, y); if (k > 0.2) api.addRect(x - w * k / 2, y, w * k, 8, { color: api.colorAt(x, y, k) }); } }
  }
});
