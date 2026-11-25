// The Word and Excel exports: real Office files, written by hand, that open in Word, Excel and LibreOffice.
// It also writes three sample files into tests/out, so they can be opened and looked at.
// SPDX-License-Identifier: AGPL-3.0-or-later
const { launch } = require('./browser');
const path = require('path');
const fs = require('fs');
fs.mkdirSync(__dirname + '/out', { recursive: true });
const wait = async (p, ms = 60000) => { const t0 = Date.now(); await p.waitForTimeout(200); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => Object.keys(window.__sungfluence.jobs).length); if (!busy) break; await p.waitForTimeout(50); } };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '../src/index.html')).href); await p.waitForTimeout(2000);
  // these checks were written for the cat, whose corners are white paper
  await p.evaluate(() => window.__sungfluence.useSample('cat')); await wait(p);
  const A = (fn, arg) => p.evaluate(fn, arg);
  await A(() => { const S = window.__sungfluence; S.prefs.reveal = 'none'; S.applyRecipe(S.RECIPES.find((r) => r.name === 'Word portrait')); }); await wait(p);

  // the three entries are in the Export window, under Office
  const listed = await A(() => {
    const S = window.__sungfluence;
    const ids = S.EXPORTERS.filter((x) => x.group === 'Office').map((x) => x.id);
    S.openExport('docx');
    const groups = [...document.querySelectorAll('#dlg .exp-g')].map((g) => g.textContent);
    const opts = [...document.querySelectorAll('#dlg .exp-pane label')].map((l) => l.textContent.trim());
    const info = [...document.querySelectorAll('#dlg .exp-pane .note, #dlg .exp-pane p, #dlg .exp-pane span')].map((n) => n.textContent).join(' | ');
    return { ids, groups, opts, info };
  });
  check(listed.ids.join(',') === 'docx,xlsx-picture,xlsx-letters,xlsx-hidden', 'three Office exports are registered: ' + listed.ids.join(', '));
  check(listed.groups.includes('Office'), 'the Export window has an Office heading');
  check(/Consolas \d/.test(listed.info), 'the Word entry works out the letter size for the page: ' + listed.info.slice(0, 90));

  // the files themselves: real zips with the parts Word and Excel ask for
  const made = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const JSZip = window.JSZip || (await (async () => { await new Promise((res, rej) => { const s2 = document.createElement('script'); s2.src = 'vendor/jszip.min.js'; s2.onload = res; s2.onerror = rej; document.head.appendChild(s2); }); return window.JSZip; })());
    const o = C.render(S.thumbSource(), S.sceneFor(S.activeLayers(), 0.4));
    const G = C.textGrid(o, 80, { aspect: 2, chars: 'ramp', blank: true });
    const read = async (blob) => {
      const z = await JSZip.loadAsync(await blob.arrayBuffer());
      const files = Object.keys(z.files).sort();
      const text = {};
      for (const n of files) if (n.endsWith('.xml')) text[n] = await z.file(n).async('string');
      return { files, text, size: blob.size };
    };
    const docx = await read(await S.docxFor(G, { color: true, page: 'a4', landscape: true }));
    const cells = await read(await S.xlsxPicture(G, { shades: 64, cell: 10, blankPaper: true }));
    const hidden = await read(await S.xlsxHidden(G, { levels: 6, cell: 12 }));
    const countPara = (docx.text['word/document.xml'].match(/<w:p>/g) || []).length;
    const countCell = (cells.text['xl/worksheets/sheet1.xml'].match(/<c r=/g) || []).length;
    return {
      rows: G.rows, cols: G.cols,
      docxFiles: docx.files, docxPara: countPara, docxColor: /<w:color w:val="[0-9A-F]{6}"\/>/.test(docx.text['word/document.xml']),
      docxLand: docx.text['word/document.xml'].includes('w:orient="landscape"'), docxSize: docx.size,
      cellsFiles: cells.files, cellCount: countCell, fills: (cells.text['xl/styles.xml'].match(/patternType="solid"/g) || []).length, cellsSize: cells.size,
      hiddenSheets: hidden.files.filter((f) => /worksheets\/sheet\d+\.xml$/.test(f)).length,
      hiddenKey: hidden.text['xl/worksheets/sheet2.xml'].includes('Color'),
      hiddenNums: [...new Set((hidden.text['xl/worksheets/sheet1.xml'].match(/<v>(\d+)<\/v>/g) || []).map((m) => +m.replace(/\D/g, '')))].sort((x, y) => x - y),
      hiddenBorder: hidden.text['xl/styles.xml'].includes('style="hair"'),
      xmlOK: Object.values(Object.assign({}, docx.text, cells.text, hidden.text)).every((t) => t.startsWith('<?xml') && !t.includes('undefined') && !t.includes('NaN'))
    };
  });
  const want = ['[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml'];
  check(want.every((f) => made.docxFiles.includes(f)), 'the Word file holds the four parts Word needs: ' + made.docxFiles.join(', '));
  check(made.docxPara === made.rows, 'one paragraph for each of the ' + made.rows + ' rows');
  check(made.docxColor && made.docxLand, 'the colors and the landscape page reach the document');
  const wantX = ['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml'];
  check(wantX.every((f) => made.cellsFiles.includes(f)), 'the Excel picture holds the parts Excel needs');
  check(made.cellCount === made.rows * made.cols, 'one cell for each of the ' + made.rows + ' × ' + made.cols + ' characters (' + made.cellCount + ')');
  check(made.fills > 20 && made.fills < 1200, made.fills + ' colors in the sheet, enough for a picture and few enough for Excel');
  check(made.hiddenSheets === 2 && made.hiddenKey, 'the color by number file has the picture and a key sheet');
  check(made.hiddenNums.length <= 6 && made.hiddenNums[0] === 1, 'its cells hold the numbers ' + made.hiddenNums.join(', '));
  check(made.hiddenBorder, 'and every cell has a thin border to color inside');
  check(made.xmlOK, 'every XML part is well formed, with no gaps left in it');

  // the letters in color: the characters carry the picture, nothing is filled
  const letters = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const JSZip = window.JSZip;
    const o = C.render(S.thumbSource(), S.sceneFor(S.activeLayers(), 0.4));
    const G = C.textGrid(o, 60, { aspect: 1, chars: 'ramp', blank: true });
    const read = async (opt) => {
      const z = await JSZip.loadAsync(await (await S.xlsxText(G, opt)).arrayBuffer());
      const sheet = await z.file('xl/worksheets/sheet1.xml').async('string');
      const styles = await z.file('xl/styles.xml').async('string');
      return {
        fonts: (styles.match(/<font>/g) || []).length,
        colored: (styles.match(/<color rgb="FF[0-9A-F]{6}"\/>/g) || []).length,
        solid: (styles.match(/patternType="solid"/g) || []).length,
        cells: (sheet.match(/t="inlineStr"/g) || []).length,
        greys: [...new Set((styles.match(/<color rgb="FF([0-9A-F]{6})"\/>/g) || []).map((m) => m.slice(14, 20)))].filter((h) => h[0] + h[1] === h[2] + h[3] && h[2] + h[3] === h[4] + h[5]).length,
        blueish: [...new Set((styles.match(/<color rgb="FF([0-9A-F]{6})"\/>/g) || []).map((m) => m.slice(14, 20)))].filter((h) => parseInt(h.slice(4), 16) > parseInt(h.slice(0, 2), 16) + 20).length
      };
    };
    const t = await read({ tint: 'true', shades: 64, cell: 10 });
    const g = await read({ tint: 'gray', shades: 64, cell: 10 });
    const m = await read({ tint: 'mono', ink: '#1f4e79', shades: 64, cell: 10 });
    return { t, g, m, cellsWanted: G.grid.reduce((n, row) => n + row.filter((q) => q.ch.trim()).length, 0) };
  });
  check(letters.t.cells === letters.cellsWanted, 'one cell of real text for each character that is not blank (' + letters.t.cells + ')');
  check(letters.t.solid === 0, 'nothing is filled: the color is in the letters themselves');
  check(letters.t.colored > 20 && letters.t.fonts === letters.t.colored + 1, letters.t.colored + ' letter colors, one font each');
  check(letters.g.greys === letters.g.colored && letters.g.colored > 4, 'grey by tone really is grey (' + letters.g.colored + ' shades)');
  check(letters.m.blueish > 3 && letters.m.greys < letters.m.colored, 'one ink by tone runs from the paper to the ink you picked (' + letters.m.blueish + ' shades of it)');

  // the paper color reaches the text grid, so a light paper does not come out inverted
  const papers = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const look = (name) => {
      S.applyRecipe(S.RECIPES.find((r) => r.name === name));
      const o = C.render(S.thumbSource(), S.sceneFor(S.activeLayers(), 0.4));
      const G = C.textGrid(o, 60, { aspect: 1, chars: 'ramp', blank: true });
      return { paper: G.paper, corner: G.grid[1][1].ink, hex: S.doc.out.paper };
    };
    return { light: look('Engraving'), dark: look('Word portrait') };
  });
  check(papers.light.paper[0] > 200 && papers.dark.paper[0] < 60, 'the grid knows the real paper color: ' + papers.light.hex + ' and ' + papers.dark.hex);
  check(papers.light.corner < 0.2, 'an empty corner of a light paper carries no ink (' + papers.light.corner.toFixed(2) + '), so the text twins are not inverted');

  // the same files saved where they can be opened and looked at
  const saved = await A(async () => {
    const S = window.__sungfluence, C = window.Sungfluence;
    const o = C.render(S.thumbSource(), S.sceneFor(S.activeLayers(), 0.4));
    const G = C.textGrid(o, 80, { aspect: 2, chars: 'ramp', blank: true });
    const G2 = C.textGrid(o, 60, { aspect: 1, chars: 'ramp', blank: true });
    const b64 = async (blob) => { const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]); return btoa(s); };
    return {
      docx: await b64(await S.docxFor(G, { color: true, page: 'a4', landscape: true })),
      cells: await b64(await S.xlsxPicture(G2, { shades: 64, cell: 10, blankPaper: true })),
      hidden: await b64(await S.xlsxHidden(C.textGrid(o, 40, { aspect: 1, chars: 'ramp', blank: true }), { levels: 6, cell: 14 })),
      letters: await b64(await S.xlsxText(G2, { tint: 'true', shades: 64, cell: 10 }))
    };
  });
  const out = path.join(__dirname, 'out');
  // a file that is open in Excel cannot be written again: say so instead of failing the run
  const write = (name, b64) => {
    try { fs.writeFileSync(path.join(out, name), Buffer.from(b64, 'base64')); return true; }
    catch (e) { console.log('     (' + name + ' is open in another program, left as it was)'); return false; }
  };
  const wrote = [['sample-word.docx', saved.docx], ['sample-excel-picture.xlsx', saved.cells],
    ['sample-excel-color-by-number.xlsx', saved.hidden], ['sample-excel-letters.xlsx', saved.letters]]
    .map(([n, d]) => write(n, d)).filter(Boolean).length;
  check(wrote > 0 && fs.existsSync(path.join(out, 'sample-word.docx')), wrote + ' sample files written to tests/out for opening in Word and Excel');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' office checks failed' : 'all office checks passed');
  process.exit(fails ? 1 : 0);
})();
