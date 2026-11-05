/* ===================== Part 2b: the reveal, letters flying in when text art appears ===================== */
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// When new text art is applied (a style, a recipe, the first Apply), the finished letters arrive in small tiles:
// each tile starts outside the picture, turns and grows on the way, and lands exactly where the style placed it.
// It only changes what the screen shows for about a second; the artwork and exports are never touched.
// Settings → Motion chooses "Letters fly in", "Fade in" or "At once"; reduce-motion on the computer keeps it still.

let reveal = null;
const REVEAL_MS = { fly: 1150, fade: 650 };
function revealSoon() { if (!reduceMotion() && prefs.reveal !== 'none') ui.revealNext = true; }
const revealing = () => !!reveal;
function stopReveal() { if (reveal) { cancelAnimationFrame(reveal.raf); reveal = null; } }
function startReveal() {
  stopReveal();
  const c = textCanvas;
  if (!c || reduceMotion() || prefs.reveal === 'none') return;
  const W = c.width, H = c.height, T = Math.max(12, Math.round(Math.max(W, H) / 52));
  const cols = Math.ceil(W / T), rows = Math.ceil(H / T);
  // which tiles hold any letters: read a tiny copy, one pixel per tile
  const probe = mk(cols, rows), px = probe.getContext('2d', { willReadFrequently: true });
  px.drawImage(c, 0, 0, cols, rows);
  const a = px.getImageData(0, 0, cols, rows).data;
  let seed = 9173;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const mode = prefs.motion === 'calm' ? 'fade' : prefs.reveal;
  const diag = Math.hypot(W, H), tiles = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (a[(y * cols + x) * 4 + 3] < 3) continue;
    const cx = x * T + T / 2, cy = y * T + T / 2;
    const r = Math.hypot(cx - W / 2, cy - H / 2) / (diag / 2);
    const ang = Math.atan2(cy - H / 2, cx - W / 2) + (rnd() - 0.5) * 0.9;
    const dist = diag * (0.45 + rnd() * 0.4);
    tiles.push({ sx: x * T, sy: y * T, cx, cy, fx: cx + Math.cos(ang) * dist, fy: cy + Math.sin(ang) * dist,
      rot: (rnd() - 0.5) * 2.2, delay: mode === 'fade' ? rnd() * 0.55 : 0.08 + rnd() * 0.3 + r * 0.17 });
  }
  if (!tiles.length) return;
  reveal = { t0: performance.now(), dur: REVEAL_MS[mode] || 1000, mode, tiles, T, src: c, out: mk(W, H), raf: 0 };
  const tick = () => {
    if (!reveal) return;
    compose();
    if (performance.now() - reveal.t0 >= reveal.dur) { reveal = null; compose(); return; }
    reveal.raf = requestAnimationFrame(tick);
  };
  reveal.raf = requestAnimationFrame(tick);
}
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
const easeBack = (u) => { const s = 1.4; u -= 1; return u * u * ((s + 1) * u + s) + 1; };
function revealFrame() {
  const R = reveal, t = (performance.now() - R.t0) / R.dur, x = R.out.getContext('2d'), T = R.T;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, R.out.width, R.out.height);
  const span = R.mode === 'fade' ? 0.45 : 0.55;
  for (const q of R.tiles) {
    const u = clamp((t - q.delay) / span, 0, 1);
    if (u <= 0) continue;
    if (u >= 1) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.drawImage(R.src, q.sx, q.sy, T, T, q.sx, q.sy, T, T); continue; }
    if (R.mode === 'fade') { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = easeOut(u); x.drawImage(R.src, q.sx, q.sy, T, T, q.sx, q.sy, T, T); continue; }
    const e = easeOut(u), s = 0.35 + 0.65 * easeBack(u), r = q.rot * (1 - e);
    const cx = q.fx + (q.cx - q.fx) * e, cy = q.fy + (q.cy - q.fy) * e, cs = Math.cos(r) * s, sn = Math.sin(r) * s;
    x.globalAlpha = Math.min(1, u * 2.5);
    x.setTransform(cs, sn, -sn, cs, cx, cy);
    x.drawImage(R.src, q.sx, q.sy, T, T, -T / 2, -T / 2, T, T);
  }
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
  return R.out;
}
