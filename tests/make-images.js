// Draws the two test images in tests/images, so the tests do not depend on sample photos.
//   portrait.jpg  a colorful painted face with soft light, like a photo
//   drawing.png   black strokes on white, like a line drawing
// Run once: node tests/make-images.js. Replace them with your own images any time; keep the names.
// SPDX-License-Identifier: AGPL-3.0-or-later
const fs = require('fs');
const path = require('path');
const { launch } = require('./browser');

const draw = () => {
  const out = {};
  // portrait
  let c = document.createElement('canvas'); c.width = 1200; c.height = 900;
  let x = c.getContext('2d');
  let g = x.createLinearGradient(0, 0, 1200, 900); g.addColorStop(0, '#1d3557'); g.addColorStop(0.5, '#457b9d'); g.addColorStop(1, '#e9c46a');
  x.fillStyle = g; x.fillRect(0, 0, 1200, 900);
  for (let i = 0; i < 40; i++) { x.fillStyle = 'hsla(' + (i * 37 % 360) + ',70%,60%,.18)'; x.beginPath(); x.arc((i * 211) % 1200, (i * 137) % 900, 40 + (i * 13) % 90, 0, 7); x.fill(); }
  g = x.createRadialGradient(560, 380, 30, 600, 450, 330); g.addColorStop(0, '#ffe0c2'); g.addColorStop(0.6, '#e8a97a'); g.addColorStop(1, '#8c5a3c');
  x.fillStyle = '#3b2416'; x.beginPath(); x.ellipse(600, 360, 300, 290, 0, Math.PI, 0); x.fill();
  x.fillStyle = g; x.beginPath(); x.ellipse(600, 470, 240, 300, 0, 0, 7); x.fill();
  x.fillStyle = '#c0392b'; x.fillRect(330, 760, 540, 140);
  for (const ex of [510, 690]) {
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(ex, 430, 42, 24, 0, 0, 7); x.fill();
    x.fillStyle = '#2a6f97'; x.beginPath(); x.arc(ex, 430, 20, 0, 7); x.fill();
    x.fillStyle = '#111'; x.beginPath(); x.arc(ex, 430, 9, 0, 7); x.fill();
    x.strokeStyle = '#3b2416'; x.lineWidth = 10; x.beginPath(); x.moveTo(ex - 50, 375); x.quadraticCurveTo(ex, 350, ex + 50, 372); x.stroke();
  }
  x.strokeStyle = '#a0522d'; x.lineWidth = 8; x.beginPath(); x.moveTo(600, 460); x.lineTo(580, 560); x.lineTo(615, 565); x.stroke();
  x.strokeStyle = '#9b2335'; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(530, 640); x.quadraticCurveTo(600, 690, 670, 640); x.stroke();
  g = x.createLinearGradient(0, 0, 1200, 0); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,255,255,.12)');
  x.fillStyle = g; x.fillRect(0, 0, 1200, 900);
  out.portrait = c.toDataURL('image/jpeg', 0.9);
  // drawing
  c = document.createElement('canvas'); c.width = 1000; c.height = 1000;
  x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1000, 1000);
  x.strokeStyle = '#000'; x.lineCap = 'round'; x.lineJoin = 'round';
  x.lineWidth = 22; x.beginPath();
  for (let t = 0; t < 6 * Math.PI; t += 0.05) { const r = 30 + t * 22; const px = 500 + Math.cos(t) * r, py = 500 + Math.sin(t) * r; t ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.stroke();
  x.lineWidth = 14; x.beginPath(); x.moveTo(80, 900); x.bezierCurveTo(300, 760, 700, 1000, 920, 860); x.stroke();
  x.beginPath(); x.moveTo(120, 120); x.lineTo(300, 90); x.lineTo(260, 260); x.closePath(); x.stroke();
  out.drawing = c.toDataURL('image/png');
  return out;
};

(async () => {
  const b = await launch();
  const p = await b.newPage();
  const r = await p.evaluate(draw);
  const dir = path.join(__dirname, 'images');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'portrait.jpg'), Buffer.from(r.portrait.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(dir, 'drawing.png'), Buffer.from(r.drawing.split(',')[1], 'base64'));
  console.log('wrote tests/images/portrait.jpg and tests/images/drawing.png');
  await b.close();
})();
