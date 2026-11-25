// Checkup: small things found in a walk through every menu command. The page fills the window with no stray
// margin, the menu bar wraps on a phone so every menu is in reach, style tiles work before Apply text art,
// the Type toolbox menu lists every tab, Duplicate is off when it has nothing to copy, a file dropped anywhere
// in the window opens, messages say what really happened, and undo leaves no lines selected that are gone.
// Also: a tile before Apply gives the first look, redo of Apply restores the view, a short top bar on a phone,
// the Export window on a phone, dimmed Vector layer exports, motd and Code files, one Type toolbox menu entry.
// Fails with exit code 1 if a check fails. Screenshots go to tests/out/.
// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path');
const fs = require('fs');
const { launch } = require('./browser');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(250); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(100); } await p.waitForTimeout(250); };
let failed = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info !== undefined ? '  (' + info + ')' : '')); if (!ok) failed++; };
const url = require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href;

async function page(b, viewport, touch) {
  const ctx = await b.newContext({ viewport, colorScheme: 'light', acceptDownloads: true, hasTouch: !!touch, isMobile: !!touch });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sungfluence-prefs-v1', JSON.stringify({ welcomed: true })); } catch (e) { /* ignore */ } });
  await p.goto(url);
  await p.waitForTimeout(2000); await wait(p);
  return { ctx, p, errs, S: (f, a) => p.evaluate(f, a) };
}
// the letters of a first look fly in over the photo (Mix) and then the view settles on Text
const settle = async (p) => { for (let i = 0; i < 60 && await p.evaluate(() => window.__sungfluence.revealing()); i++) await p.waitForTimeout(100); await p.waitForTimeout(100); };
const toastText = (S) => S(() => (document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent));

(async () => {
  const b = await launch();

  // ---- a phone: every menu of the menu bar fits on the screen ----
  {
    const { ctx, p, S } = await page(b, { width: 390, height: 844 });
    const bar = await S(() => Array.from(document.querySelectorAll('#menubar > button')).map((x) => { const r = x.getBoundingClientRect(); return { t: x.textContent, l: r.left, r: r.right }; }));
    const out = bar.filter((x) => x.r > 390 || x.l < 0).map((x) => x.t);
    check('on a 390 px phone every menu is on the screen', bar.length === 10 && !out.length, out.join(', ') || bar.length + ' menus');
    await p.click('#menubar > button:has-text("Effects")'); await p.waitForTimeout(200);
    check('the Effects menu opens on a phone', await S(() => /Plugins/.test((document.querySelector('.dropmenu') || {}).textContent || '')));
    await p.screenshot({ path: __dirname + '/out/ck1-phone-menus.png' });
    check('the page is no wider than the phone', await S(() => document.documentElement.scrollWidth <= 390));
    await ctx.close();
  }

  // ---- a touch phone: a short top bar, and a hint for fingers ----
  {
    const { ctx, p, S } = await page(b, { width: 390, height: 844 }, true);
    await S(() => window.__sungfluence.useSample('coffee')); await wait(p);
    const top = await S(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(), o = document.querySelector('label[for="fileInput"]').getBoundingClientRect();
      return { newTop: Math.round(r('newBtn').top), openTop: Math.round(o.top), exportRight: Math.round(r('exportBtn').right), seg: Math.round(r('viewSeg').top), exp: Math.round(r('exportBtn').top), bottom: Math.round(document.querySelector('header.top').getBoundingClientRect().bottom) }; });
    check('on a phone New and Open share one row', Math.abs(top.newTop - top.openTop) < 4, JSON.stringify(top));
    check('on a phone the views and Export share the next row, Export at the right', Math.abs(top.seg - top.exp) < 8 && top.exportRight <= 390 && top.exportRight > 340, JSON.stringify(top));
    check('on a phone the top bar is three rows at most', top.bottom < 230, top.bottom + ' px');
    const hint = await S(() => (document.querySelector('#optbar .hint') || {}).textContent || '');
    check('on a touch screen the hint names only what a finger can do', /Pinch/.test(hint) && !/scroll|Space|Double-click/.test(hint), hint);
    await p.screenshot({ path: __dirname + '/out/ck3-phone-top.png' });
    // the Export window on a phone: the list has room, and the More formats cue hides nothing half way
    await S(() => window.__sungfluence.openExport('png-view')); await p.waitForTimeout(500);
    const ex = await S(() => { const l = document.querySelector('.exp-list'), m = document.querySelector('.exp-more'), d = document.getElementById('dlg').getBoundingClientRect();
      return { list: Math.round(l.getBoundingClientRect().height), more: m && getComputedStyle(m).backgroundImage === 'none' && getComputedStyle(m).backgroundColor !== 'rgba(0, 0, 0, 0)', dlgBottom: Math.round(d.bottom) }; });
    check('on a phone the format list is tall enough for several rows', ex.list > 300, JSON.stringify(ex));
    check('the More formats cue has a solid background, so no row shows through it', ex.more, JSON.stringify(ex));
    check('on a phone the Export window uses the height of the screen', ex.dlgBottom > 844 - 60, JSON.stringify(ex));
    await p.screenshot({ path: __dirname + '/out/ck4-phone-export.png' });
    await ctx.close();
  }

  const { p, errs, S } = await page(b, { width: 1440, height: 900 });

  // ---- the page fills the window: no 8 px frame, nothing to scroll ----
  check('the page has no margin around it', await S(() => getComputedStyle(document.body).marginTop === '0px' && document.getElementById('app').getBoundingClientRect().left === 0));
  check('the desktop page does not scroll', await S(() => document.documentElement.scrollHeight <= innerHeight));

  // ---- style tiles before Apply text art ----
  await S(() => { const A = window.__sungfluence; A.ui.tab = 'text'; A.buildPanel(); });
  check('before text art is applied, the panel shows no settings of a style not chosen yet', await S(() => !document.getElementById('sec-style') && !document.getElementById('sec-words') && /Apply text art starts with a Word cloud/.test(document.getElementById('panel').textContent)));
  check('before text art is applied, no style tile is marked as in use', await S(() => !document.querySelector('#tiles .tile[aria-pressed="true"]')));
  check('Duplicate is off with nothing selected and no text art', await S(() => !window.__sungfluence.COMMANDS.get('edit.duplicate').enabled()));
  await p.click('#tiles .tile:has-text("Spiral")'); await wait(p); await settle(p);
  const picked = await S(() => ({ applied: window.__sungfluence.doc.text.applied, mode: window.__sungfluence.curLayer().mode, view: window.__sungfluence.ui.view }));
  check('a style tile clicked before Apply text art applies that style', picked.applied && picked.mode === 'spiral' && picked.view === 'text', JSON.stringify(picked));
  check('and its tile is then marked', await S(() => /Spiral/.test((document.querySelector('#tiles .tile[aria-pressed="true"]') || {}).textContent || '')));
  check('Duplicate is on once there is text art', await S(() => window.__sungfluence.COMMANDS.get('edit.duplicate').enabled()));

  // ---- a style tile before Apply gives the same first look as Apply text art, in that style ----
  const KEYS = ['mode', 'text', 'color', 'cols', 'scale', 'saturation', 'chromaDot', 'colorFit', 'toneGamma'];
  const firstLook = async (how) => {
    await S(() => window.__sungfluence.useSample('coffee')); await wait(p);
    await S(() => { const A = window.__sungfluence; A.ui.tab = 'text'; A.buildPanel(); });
    if (how === 'apply') await S(() => window.__sungfluence.applyTextArt());
    else await p.click('#tiles .tile:has-text("' + how + '")');
    await wait(p);
    return S((keys) => { const A = window.__sungfluence, L = A.curLayer(); return Object.assign({ paper: A.doc.out.paper }, ...keys.map((k) => ({ [k]: L[k] }))); }, KEYS);
  };
  const viaApply = await firstLook('apply'), viaTile = await firstLook('Word cloud');
  check('on coffee, Apply text art gives the flagship Word cloud in the photo colors on warm black', viaApply.mode === 'cloud' && viaApply.color === 'image' && viaApply.paper === '#15120f', JSON.stringify(viaApply));
  const diff = KEYS.concat('paper').filter((k) => JSON.stringify(viaApply[k]) !== JSON.stringify(viaTile[k]));
  check('the Word cloud tile before Apply gives the same layer as Apply text art', !diff.length, diff.map((k) => k + ': ' + viaApply[k] + ' vs ' + viaTile[k]).join(', '));
  const viaRows = await firstLook('Text portrait');
  // another style starts on white, with the first look's colors fitted to white as usual
  check('another tile before Apply keeps the first look\'s colors, on white', viaRows.mode === 'rows' && viaRows.color === viaApply.color && viaRows.saturation === viaApply.saturation && viaRows.colorFit === 'gentle' && viaRows.paper === '#ffffff', JSON.stringify(viaRows));

  // ---- undo and redo of Apply text art bring back the view that was on screen ----
  await S(() => window.__sungfluence.useSample('coffee')); await wait(p);
  await S(() => window.__sungfluence.applyTextArt()); await wait(p); await settle(p);
  await S(() => window.__sungfluence.setView('mix')); await p.waitForTimeout(600);
  await S(() => window.__sungfluence.undo()); await wait(p);
  const vUndo = await S(() => window.__sungfluence.ui.view);
  await S(() => window.__sungfluence.redo()); await wait(p);
  const vRedo = await S(() => ({ view: window.__sungfluence.ui.view, pressed: [...document.querySelectorAll('#viewSeg button[aria-pressed="true"]')].map((x) => x.dataset.view).join() }));
  check('undoing Apply text art shows the photo', vUndo === 'photo', vUndo);
  check('redoing it brings back the Mix view, with its button marked', vRedo.view === 'mix' && vRedo.pressed === 'mix', JSON.stringify(vRedo));

  // ---- one Type toolbox entry in the Text art menu ----
  const tbMenu = await S(() => { [...document.querySelectorAll('#menubar > button')].find((x) => x.textContent === 'Text art').click(); const m = document.querySelector('.dropmenu'); const names = [...m.children].map((x) => x.textContent.trim()).filter((t) => /^Type toolbox/.test(t)); return names; });
  await p.keyboard.press('Escape');
  check('the Text art menu has one Type toolbox entry', tbMenu.length === 1, tbMenu.join(' / '));

  // ---- a command run from the palette closes a window left open behind it ----
  // (shortcuts wait while a window is open, but the palette can still be opened from a menu or a script)
  await S(() => { window.__sungfluence.openSettings(); window.__sungfluence.runCommand('help.palette'); }); await p.waitForTimeout(300); await p.keyboard.type('Fit'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  check('a palette command closes the window behind it', await S(() => document.getElementById('dlgScrim').hidden));

  // ---- the Export window: every row has a hint, the login message is plain text named motd ----
  check('every row of the Export window has a hint line', await S(() => window.__sungfluence.EXPORTERS.filter((x) => !x.noWindow && !x.hint).map((x) => x.id).length === 0),
    await S(() => window.__sungfluence.EXPORTERS.filter((x) => !x.noWindow && !x.hint).map((x) => x.id).join()));
  await S(() => { try { localStorage.removeItem('sungfluence-export'); } catch (e) { /* ignore */ } });
  const motdOpts = await S(() => { const A = window.__sungfluence; return A.exporterOpts(A.EXPORTERS.find((x) => x.id === 'motd')).depth; });
  check('Login message starts with no color codes', motdOpts === 'none', motdOpts);
  const motdDl = p.waitForEvent('download', { timeout: 60000 }).catch(() => null);
  await S(() => { const A = window.__sungfluence, x = A.EXPORTERS.find((e) => e.id === 'motd'); A.runExporter(x, A.exporterOpts(x)); });
  const md = await motdDl;
  const motdText = md ? fs.readFileSync(await md.path(), 'utf8') : '';
  check('Login message saves a plain file named motd', !!md && md.suggestedFilename() === 'motd' && motdText.length > 100 && !/\x1b/.test(motdText), md && md.suggestedFilename());
  const codeName = await (async () => { const w = p.waitForEvent('download', { timeout: 60000 }).catch(() => null); await S(() => { const A = window.__sungfluence, x = A.EXPORTERS.find((e) => e.id === 'code'); A.runExporter(x, A.exporterOpts(x)); }); const d = await w; return d && d.suggestedFilename(); })();
  check('Code saves a JavaScript file, not a copy of Markdown', /\.js$/.test(codeName || ''), codeName);

  // ---- the Type toolbox menu has every tab of the window ----
  const tb = await S(() => { const A = window.__sungfluence; return { cmd: A.COMMANDS.has('type.toolbox.share'), ok: A.runCommand('type.toolbox.share') }; });
  await p.waitForTimeout(300);
  const tab = await S(() => { const on = document.querySelector('#typeBox [aria-selected="true"], #typeBox [aria-pressed="true"]'); return on ? on.textContent : ''; });
  check('Text art > Type toolbox lists Sharing and opens that tab', tb.cmd && tb.ok && /Sharing/.test(tab), tab);
  // marks: Above, Through and Below show only while there are marks
  await S(() => window.__sungfluence.openTypeBox(null, 'styles')); await p.waitForTimeout(300);
  const marks2 = await S(() => { const z = document.querySelector('#typeBox .type-marks'); const sw = z.querySelector('.row2'), r = z.querySelector('input[type=range]');
    const before = sw.hidden; r.value = 0.5; r.dispatchEvent(new Event('input')); const after = sw.hidden; r.value = 0; r.dispatchEvent(new Event('input')); return { before, after, back: sw.hidden }; });
  check('the Above, Through and Below switches wait until there are marks', marks2.before && !marks2.after && marks2.back, JSON.stringify(marks2));
  await p.keyboard.press('Escape');

  // ---- a file dropped on a panel opens, and the browser does not leave the app ----
  const jpg = fs.readFileSync(__dirname + '/images/portrait.jpg').toString('base64');
  const dropped = await S((b64) => {
    const u = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), dt = new DataTransfer();
    dt.items.add(new File([u], 'dropped.jpg', { type: 'image/jpeg' }));
    const ev = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
    document.getElementById('panel').dispatchEvent(ev);
    return ev.defaultPrevented;
  }, jpg);
  await p.waitForTimeout(1500); await wait(p);
  check('a photo dropped on a panel opens, and the browser keeps the app', dropped && await S(() => window.__sungfluence.doc.fileName === 'dropped.jpg'));

  // ---- messages that say what happened ----
  await S(() => window.__sungfluence.useSample('rocket')); await wait(p);
  await S(() => window.__sungfluence.runCommand('image.removeBg')); await wait(p); await p.waitForTimeout(300);
  check('Remove background says it removed the background', /^Removed the background/.test(await toastText(S)), await toastText(S));
  await S(() => window.__sungfluence.runCommand('file.square')); await wait(p);
  await S(() => window.__sungfluence.runCommand('image.trace')); await wait(p); await p.waitForTimeout(300);
  check('tracing a blank artboard says it found no lines', /^Found no lines/.test(await toastText(S)), await toastText(S));

  // guide lines: the vector SVG explains why there is nothing to draw
  await S(() => { const A = window.__sungfluence, [w, h] = A.imgSize, n = (x, y) => ({ x, y, ix: 0, iy: 0, ox: 0, oy: 0 }); A.doc.lines.paths.push({ id: 9901, closed: false, width: 8, text: '', traced: false, nodes: [n(w * 0.1, h * 0.2), n(w * 0.9, h * 0.3)] }); A.linesChanged(); });
  const info = await S(() => { const A = window.__sungfluence, x = A.EXPORTS.find((e) => e.id === 'svg-vector'); x.run(); return x.empty(); });
  await p.waitForTimeout(300);
  check('SVG of the vector layer explains that lines without a stroke only guide text', /only guide text/.test(await toastText(S)) && /only guide text/.test(info), info);
  // both Vector layer exports are dimmed, with the same reason, when there is nothing to draw
  const vecRows = [];
  for (const id of ['svg-vector', 'png-vector']) {
    await S((id) => window.__sungfluence.openExport(id), id); await p.waitForTimeout(300);
    vecRows.push(await S(() => ({ off: document.getElementById('expGo').disabled, why: (document.querySelector('.exp-why') || {}).textContent || '' })));
  }
  await p.screenshot({ path: __dirname + '/out/ck5-vector-export.png' });
  await S(() => document.querySelector('#dlg .sheet-h button').click());
  check('SVG and PNG of the vector layer are both dimmed, with the same reason', vecRows.every((r) => r.off && /only guide text/.test(r.why)) && vecRows[0].why === vecRows[1].why, JSON.stringify(vecRows));
  await S(() => window.__sungfluence.runCommand('vector.alongLines')); await wait(p);
  check('Write text along the lines confirms it with Undo', /run along the lines/.test(await toastText(S)) && await S(() => window.__sungfluence.curLayer().mode === 'paths'));

  // the edited photo is saved as -photo.png, a cutout only when part of it was removed
  const dl = p.waitForEvent('download', { timeout: 30000 }).catch(() => null);
  await S(() => window.__sungfluence.EXPORTS.find((e) => e.id === 'png-photo').run());
  const d = await dl;
  check('PNG of the edited photo is named -photo.png', !!d && /-photo\.png$/.test(d.suggestedFilename()), d && d.suggestedFilename());

  // ---- undo leaves no selected lines that no longer exist ----
  await S(() => { const A = window.__sungfluence; A.quickAdd('text', { text: 'Hi' }); });
  await wait(p);
  await S(() => window.__sungfluence.runCommand('vector.toOutlines')); await wait(p);
  const sel1 = await S(() => window.__sungfluence.selectedPathIds().length);
  await S(() => window.__sungfluence.runCommand('edit.undo')); await wait(p);
  const sel2 = await S(() => { const A = window.__sungfluence; return A.selectedPathIds().filter((id) => !A.findPath(id)).length; });
  check('after undoing text to outlines, no selected line is missing', sel1 > 0 && sel2 === 0, sel1 + ' selected, ' + sel2 + ' missing after undo');

  await p.screenshot({ path: __dirname + '/out/ck2-desktop.png' });
  check('no page errors', !errs.length, errs.join(' | '));
  await b.close();
  console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
  process.exit(failed ? 1 : 0);
})();
