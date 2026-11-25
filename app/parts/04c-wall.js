// SPDX-License-Identifier: AGPL-3.0-or-later

/* ---------------- the discovery wall ----------------
   Every style at once, drawn with the picture and the words you already have, so you can see what
   each one would do instead of trying them one by one. Picking a tile is the same as picking the
   style in the panel: the shared settings and the words come across. Tiles are drawn a few
   milliseconds at a time (sliceThumbs), so the window never blocks the main artwork. */
const wallState = { with: true, q: '' };
function wallStyles() {
  const q = wallState.q.trim().toLowerCase();
  const hit = ([k, m]) => !q || (m.name + ' ' + k + ' ' + (m.about || '')).toLowerCase().includes(q);
  const all = Object.entries(MODES).filter(hit);
  return { core: all.filter(([, m]) => !m.plugin), extra: all.filter(([, m]) => m.plugin) };
}
let wallJob = 0;
function openWall() {
  if (!src) return;
  closeMenus();
  const cur = curLayer();
  if (!cur) return;
  openDialog('Every style', (body, d) => {
    d.classList.add('wall-dlg');
    const top = el('div', 'wall-top');
    const find = el('input', 'field wall-find'); find.type = 'search'; find.placeholder = 'Find a style';
    find.setAttribute('aria-label', 'Find a style'); find.value = wallState.q;
    find.oninput = () => { wallState.q = find.value; draw(); };
    const other = activeLayers().filter((L) => L !== cur).length;
    top.appendChild(find);
    if (other) {
      const t = el('label', 'wall-with');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = wallState.with;
      cb.onchange = () => { wallState.with = cb.checked; draw(); };
      t.append(cb, el('span', null, 'Show the other text art layers too'));
      top.appendChild(t);
    }
    const grid = el('div', 'wall');
    const note = el('p', 'note', 'These are drawn from your picture and your words. Click one to use it. Your settings that every style shares, such as the color and the letters, come with you.');
    body.append(top, grid, note);

    // tiles take the shape of the artboard, kept between wide and a little tall, so the art fills its tile
    const g = artGeom(1), ar = clamp(g.TH / g.TW, 0.56, 1.25), cw = 240, chh = Math.round(cw * ar);
    const draw = () => {
      const job = ++wallJob;
      const { core, extra } = wallStyles();
      grid.replaceChildren();
      const shots = [];
      const add = (k, m) => {
        const b = el('button', 'wall-t' + (m.plugin ? ' plug' : '')); b.type = 'button';
        const on = cur.mode === k;
        b.setAttribute('aria-pressed', String(on));
        if (on) b.classList.add('on');
        const c = el('canvas'); c.width = cw; c.height = chh; c.style.aspectRatio = cw + ' / ' + chh; c.setAttribute('aria-hidden', 'true');
        const pic = el('div', 'wall-pic'); pic.appendChild(c);
        const name = el('span', 'wall-n', m.name);
        if (on) name.appendChild(el('small', null, 'in use now'));
        // styles that write along the Vector layer have nothing to draw until there are lines
        const needLines = (m.lines || m.usesLines) && !doc.lines.paths.length;
        if (needLines) {
          const nd = el('div', 'wall-need wall-lines');
          nd.innerHTML = '<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M4 30C14 8 26 8 32 20s18 12 28-10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2.4" stroke-linecap="round"/><path d="M4 36C18 22 30 30 42 26s14-6 18-8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2.4" stroke-linecap="round" opacity=".55"/></svg>';
          nd.append(el('span', null, 'Writes along lines. There are none yet.'), el('span', 'wall-cta', 'Trace lines…'));
          pic.appendChild(nd);
        } else pic.classList.add('wait');
        b.append(pic, name);
        b.title = m.about || (m.plugin && m.plugin.description) || m.name;
        b.setAttribute('aria-label', (on ? 'Keep ' : 'Use ') + m.name);
        b.onclick = () => { closeDialog(); if (!on) setLayerStyle(k); };
        grid.appendChild(b);
        const v = on ? cur : layerInStyle(cur, k);
        if (!v || needLines) return;
        let list = [v];
        if (wallState.with) {
          list = activeLayers().map((x) => (x === cur ? v : x));
          if (!list.includes(v)) list = list.concat([v]);
        }
        // the whole picture fits in the tile, so nothing is cut off at the top or the sides
        shots.push(() => [c, sceneFor(list, 240 / doc.out.width, { coarse: 3.4 }), { contain: true }]);
      };
      core.forEach(([k, m]) => add(k, m));
      if (extra.length) {
        grid.appendChild(el('div', 'wall-h', 'Extra effects'));
        extra.forEach(([k, m]) => add(k, m));
      }
      if (!core.length && !extra.length) grid.appendChild(el('p', 'note', 'No style matches that. Try a shorter word.'));
      // longer slices than the panel thumbnails: the window is open to look at these, and the extra effects come last
      sliceThumbs(shots, () => job === wallJob && grid.isConnected, { slice: 14, rest: 4, done: (c, ok) => {
        const pic = c.parentNode; if (!pic) return;
        pic.classList.remove('wait');
        if (!ok) pic.appendChild(el('div', 'wall-need', 'This style could not be drawn here. Click to try it on the artboard.'));
      } });
    };
    draw();
  }, true);
}
