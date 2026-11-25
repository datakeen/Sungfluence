// SPDX-License-Identifier: AGPL-3.0-or-later

/* ---------------- Word and Excel ----------------
   Both are zip files holding XML, so they are written here by hand with JSZip, the same library the
   project files use. No new dependency, and the files open in Word, Excel, LibreOffice and Google.
   Everything starts from the same text grid the other text twins use, so what you see in the Text
   twins list is what lands in the document. */
const xesc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
const argb = (c) => 'FF' + hex2(c[0]) + hex2(c[1]) + hex2(c[2]);
const XMLHEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
async function officeZip(files) {
  const JSZip = await zipReady();
  const zip = new JSZip();
  Object.keys(files).forEach((k) => zip.file(k, files[k]));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/* ---------- Word ---------- */
const PAGES_DOCX = [['a4', 'A4', 11906, 16838], ['letter', 'Letter', 12240, 15840]];
/* The letter size that makes the art fill the page: a monospace advance is about 0.6 of the size. */
function docxFontSize(cols, page, land) {
  const pg = PAGES_DOCX.find((p) => p[0] === page) || PAGES_DOCX[0];
  const twips = (land ? pg[3] : pg[2]) - 2 * 720;            // the page less half-inch margins
  const pt = twips / 20 / (cols * 0.6);
  return Math.max(1, Math.round(pt * 2) / 2);                 // Word counts in half points
}
function docxFor(G, o) {
  const land = !!o.landscape, page = o.page || 'a4';
  const pg = PAGES_DOCX.find((p) => p[0] === page) || PAGES_DOCX[0];
  const w = land ? pg[3] : pg[2], h = land ? pg[2] : pg[3];
  const size = docxFontSize(G.cols, page, land);
  const half = Math.round(size * 2), line = Math.round(size * 20);
  const font = '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>';
  const runs = (row) => {
    const out = [];
    let text = '', col = null;
    const flush = () => {
      if (!text) return;
      out.push('<w:r><w:rPr>' + font + '<w:sz w:val="' + half + '"/><w:szCs w:val="' + half + '"/>'
        + (col ? '<w:color w:val="' + col + '"/>' : '') + '</w:rPr><w:t xml:space="preserve">' + xesc(text) + '</w:t></w:r>');
      text = '';
    };
    for (const q of row) {
      const c = o.color && q.ch.trim() ? hex2(q.c[0]) + hex2(q.c[1]) + hex2(q.c[2]) : null;
      if (c !== col) { flush(); col = c; }
      text += q.ch;
    }
    flush();
    return out.join('');
  };
  const para = (inner) => '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="' + line + '" w:lineRule="exact"/>'
    + '<w:jc w:val="center"/><w:rPr>' + font + '<w:sz w:val="' + half + '"/></w:rPr></w:pPr>' + inner + '</w:p>';
  const body = G.grid.map((row) => para(runs(row))).join('');
  const doc = XMLHEAD + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + '<w:body>' + body
    + '<w:sectPr><w:pgSz w:w="' + w + '" w:h="' + h + '"' + (land ? ' w:orient="landscape"' : '') + '/>'
    + '<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>'
    + '</w:body></w:document>';
  return officeZip({
    '[Content_Types].xml': XMLHEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '</Types>',
    '_rels/.rels': XMLHEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '</Relationships>',
    'word/_rels/document.xml.rels': XMLHEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
    'word/document.xml': doc
  });
}

/* ---------- Excel ---------- */
function colName(i) { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = (i - r - 1) / 26; } return s; }
function xlsxFiles(sheets, styles) {
  const names = sheets.map((s, i) => '<sheet name="' + xesc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('');
  const files = {
    '[Content_Types].xml': XMLHEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>',
    '_rels/.rels': XMLHEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>',
    'xl/workbook.xml': XMLHEAD + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets>' + names + '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels': XMLHEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
      + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>',
    'xl/styles.xml': styles
  };
  sheets.forEach((s, i) => { files['xl/worksheets/sheet' + (i + 1) + '.xml'] = s.xml; });
  return files;
}
/* Styles where each entry is a pair: the color of the letters and the color behind them.
   fonts[0] and fills[0..1] are the ones Excel expects to be there. */
function xlsxStylesText(pairs, size) {
  const inks = [], inkKey = new Map(), backs = [], backKey = new Map();
  const idOf = (list, key, c) => { if (!key.has(c)) { key.set(c, list.length); list.push(c); } return key.get(c); };
  const xfs = pairs.map(([ink, back]) => {
    const f = idOf(inks, inkKey, ink) + 1;
    const g = back ? idOf(backs, backKey, back) + 2 : 0;
    return '<xf numFmtId="0" fontId="' + f + '" fillId="' + g + '" borderId="0" xfId="0" applyFont="1"'
      + (back ? ' applyFill="1"' : '') + ' applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>';
  });
  const fonts = ['<font><sz val="' + size + '"/><name val="Consolas"/></font>']
    .concat(inks.map((c) => '<font><sz val="' + size + '"/><color rgb="' + c + '"/><name val="Consolas"/></font>'));
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
    .concat(backs.map((c) => '<fill><patternFill patternType="solid"><fgColor rgb="' + c + '"/><bgColor indexed="64"/></patternFill></fill>'));
  return XMLHEAD + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="' + fonts.length + '">' + fonts.join('') + '</fonts>'
    + '<fills count="' + fills.length + '">' + fills.join('') + '</fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="' + (xfs.length + 1) + '"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + xfs.join('') + '</cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}
/* The characters themselves, colored. Zoomed out the sheet is the picture; zoomed in it is still text
   you can read, search and change. With the background filled as well, the letters are set in the
   paper color so they stay legible on top of it. */
function xlsxText(G, o) {
  const how = o.tint || 'true';
  const step = Math.max(1, Math.round(256 / (+o.shades || 64)));
  const q = (v) => Math.min(255, Math.round(v / step) * step);
  const paper = G.paper;
  const ink = parseHexTriple(o.ink || '#1f4e79');
  const colorOf = (cell) => {
    if (how === 'gray') { const l = q(255 * (1 - cell.ink)); return [l, l, l]; }
    if (how === 'mono') { const t = cell.ink; return [q(paper[0] + (ink[0] - paper[0]) * t), q(paper[1] + (ink[1] - paper[1]) * t), q(paper[2] + (ink[2] - paper[2]) * t)]; }
    // a cell's color is the average of its letters and the paper around them. Taking the paper back
    // out gives the color of the letters themselves, which is what the character should be set in.
    const a = Math.max(0.22, cell.ink);
    const pure = cell.c.map((v, i) => paper[i] + (v - paper[i]) / a);
    return pure.map((v) => q(Math.max(0, Math.min(255, v))));
  };
  const pairs = [], key = new Map();
  const styleOf = (inkC, backC) => {
    const k = argb(inkC) + (backC ? argb(backC) : '-');
    if (!key.has(k)) { key.set(k, pairs.length); pairs.push([argb(inkC), backC ? argb(backC) : null]); }
    return key.get(k) + 1;
  };
  const rows = G.grid.map((row, y) => {
    const cells = row.map((cell, x) => {
      if (!cell.ch.trim() && o.blankCells !== false) return '';
      // filled: the cell takes the color of the artwork there, as the picture export does, and the
      // letters go on top in whatever still reads on it. Unfilled: the letters carry the color.
      const s = styleOf(colorOf(cell), null);
      return '<c r="' + colName(x) + (y + 1) + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + xesc(cell.ch) + '</t></is></c>';
    }).join('');
    return '<row r="' + (y + 1) + '" ht="' + (+o.cell || 10) + '" customHeight="1">' + cells + '</row>';
  }).join('');
  const width = Math.round(((+o.cell || 10) / 0.75 / 7) * 100) / 100;
  const size = Math.max(1, Math.round((+o.cell || 10) * 0.8));
  const xml = XMLHEAD + sheetOpen(G.cols, width, +o.cell || 10) + rows + '</sheetData></worksheet>';
  return officeZip(xlsxFiles([{ name: 'Letters', xml }], xlsxStylesText(pairs, size)));
}
const parseHexTriple = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h)); const n = m ? parseInt(m[1], 16) : 0x1f4e79; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/* One style for each color used, plus a plain one and one with a thin border. */
function xlsxStyles(colors, withBorder) {
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
    .concat(colors.map((c) => '<fill><patternFill patternType="solid"><fgColor rgb="' + c + '"/><bgColor indexed="64"/></patternFill></fill>'));
  const borders = '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
    + '<border><left style="hair"><color rgb="FF808080"/></left><right style="hair"><color rgb="FF808080"/></right>'
    + '<top style="hair"><color rgb="FF808080"/></top><bottom style="hair"><color rgb="FF808080"/></bottom><diagonal/></border></borders>';
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']
    .concat(withBorder ? ['<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'] : [])
    .concat(colors.map((c, i) => '<xf numFmtId="0" fontId="0" fillId="' + (i + 2) + '" borderId="0" xfId="0" applyFill="1"/>'));
  return XMLHEAD + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="1"><font><sz val="8"/><name val="Calibri"/></font></fonts>'
    + '<fills count="' + fills.length + '">' + fills.join('') + '</fills>'
    + borders
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}
const sheetOpen = (cols, width, height) => '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<sheetFormatPr defaultRowHeight="' + height + '" customHeight="1"/>'
  + '<cols><col min="1" max="' + Math.max(1, cols) + '" width="' + width + '" customWidth="1"/></cols><sheetData>';
/* The picture, one cell to a character: the cell is filled with the color and holds nothing. */
function xlsxPicture(G, o) {
  const step = Math.max(1, Math.round(256 / (+o.shades || 64)));   // fewer colors, a smaller file
  const key = new Map(), colors = [];
  const styleOf = (c) => {
    const q = [Math.min(255, Math.round(c[0] / step) * step), Math.min(255, Math.round(c[1] / step) * step), Math.min(255, Math.round(c[2] / step) * step)];
    const a = argb(q);
    if (!key.has(a)) { key.set(a, colors.length); colors.push(a); }
    return key.get(a) + 1;                                          // style 0 is the plain one
  };
  const paper = argb(G.paper);
  const rows = G.grid.map((row, y) => {
    const cells = row.map((q, x) => {
      const blank = !q.ch.trim() && o.blankPaper !== false;
      const s = blank ? styleOf(G.paper) : styleOf(q.c);
      return '<c r="' + colName(x) + (y + 1) + '" s="' + s + '"/>';
    }).join('');
    return '<row r="' + (y + 1) + '" ht="' + (+o.cell || 10) + '" customHeight="1">' + cells + '</row>';
  }).join('');
  // Excel column width is counted in characters, and a cell is about 7 px per character
  const width = Math.round(((+o.cell || 10) / 0.75 / 7) * 100) / 100;
  const xml = XMLHEAD + sheetOpen(G.cols, width, +o.cell || 10) + rows + '</sheetData></worksheet>';
  void paper;
  return officeZip(xlsxFiles([{ name: 'Picture', xml }], xlsxStyles(colors, false)));
}
/* Color by number: the cells hold a number and no color, and a second sheet is the key. */
function xlsxHidden(G, o) {
  const n = Math.max(2, Math.min(12, +o.levels || 6));
  const levels = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const v = Math.round(255 * (1 - t));
    levels.push(argb([v, v, v]));
  }
  const lv = (ink) => Math.min(n - 1, Math.max(0, Math.round(ink * (n - 1))));
  const rows = G.grid.map((row, y) => {
    const cells = row.map((q, x) => {
      const k = lv(q.ink);
      // a number in every cell that is not paper: 1 is the lightest
      return '<c r="' + colName(x) + (y + 1) + '" s="1"><v>' + (k + 1) + '</v></c>';
    }).join('');
    return '<row r="' + (y + 1) + '" ht="' + (+o.cell || 10) + '" customHeight="1">' + cells + '</row>';
  }).join('');
  const width = Math.round(((+o.cell || 10) / 0.75 / 7) * 100) / 100;
  const sheet1 = XMLHEAD + sheetOpen(G.cols, width, +o.cell || 10) + rows + '</sheetData></worksheet>';
  const keyRows = ['<row r="1"><c r="A1" t="inlineStr"><is><t>Number</t></is></c><c r="B1" t="inlineStr"><is><t>Color</t></is></c></row>']
    .concat(levels.map((c, i) => '<row r="' + (i + 2) + '"><c r="A' + (i + 2) + '"><v>' + (i + 1) + '</v></c><c r="B' + (i + 2) + '" s="' + (i + 2) + '"/></row>'))
    .concat(['<row r="' + (n + 3) + '"><c r="A' + (n + 3) + '" t="inlineStr"><is><t>Fill each cell with the color for its number, then hide the numbers.</t></is></c></row>']);
  const sheet2 = XMLHEAD + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="2" width="14" customWidth="1"/></cols><sheetData>'
    + keyRows.join('') + '</sheetData></worksheet>';
  return officeZip(xlsxFiles([{ name: 'Color by number', xml: sheet1 }, { name: 'Key', xml: sheet2 }], xlsxStyles(levels, true)));
}

/* ---------- the three entries in the Export window ---------- */
// the Office group sits with the other output, before the project files
GROUPS.splice(Math.max(0, GROUPS.indexOf('Project')), 0, 'Office');
[
  { id: 'docx', group: 'Office', title: 'Word document', hint: 'The art as text you can edit in Word', sub: () => 'The art as real text in a Word file, at the size that fills the page',
    opts: TEXT_OPTS.concat([SEL('page', 'Paper', PAGES_DOCX.map((p) => [p[0], p[1]])), T('landscape', 'Landscape'), T('color', 'Keep the colors')]),
    info: (o) => (+o.cols || 80) + ' × ' + rowsFor(o) + ' characters, Consolas ' + docxFontSize(+o.cols || 80, o.page, o.landscape) + ' pt'
      + (o.color ? ', in color' : '') + '. Letters you can still edit.',
    run: (o) => runExport(null, async (r) => saveFile(baseName() + '.docx', await docxFor(twinGrid(r, o), o))) },
  { id: 'xlsx-picture', group: 'Office', title: 'Excel picture in cells', hint: 'Colored cells that make the picture', sub: () => 'One colored cell for each character, so the sheet itself is the picture',
    opts: TEXT_OPTS.concat([SEL('shades', 'Colors', [[16, '16 per channel'], [64, '64 per channel'], [256, 'All']]), R('cell', 'Cell size', 4, 24, 1), T('blankPaper', 'Paper color in the empty cells')]),
    info: (o) => (+o.cols || 80) + ' × ' + rowsFor(o) + ' cells of ' + (+o.cell || 10) + ' points',
    run: (o) => runExport(null, async (r) => saveFile(baseName() + '-cells.xlsx', await xlsxPicture(twinGrid(r, o), o))) },
  { id: 'xlsx-letters', group: 'Office', title: 'Excel letters in color', hint: 'The characters, each in its own color', sub: () => 'The characters themselves, colored: small it is the picture, large it is still text',
    opts: TEXT_OPTS.concat([SEL('tint', 'Color of the letters', [['true', 'The colors of the picture'], ['gray', 'Grey, by tone'], ['mono', 'One ink, by tone']]),
      { key: 'ink', label: 'The ink', type: 'ink', show: (o) => o.tint === 'mono' },
      SEL('shades', 'Colors', [[16, '16 per channel'], [64, '64 per channel'], [256, 'All']]), R('cell', 'Cell size', 4, 24, 1)]),
    info: (o) => (+o.cols || 80) + ' × ' + rowsFor(o) + ' cells of real characters, colored but not filled',
    run: (o) => runExport(null, async (r) => saveFile(baseName() + '-letters.xlsx', await xlsxText(twinGrid(r, o), o))) },
  { id: 'xlsx-hidden', group: 'Office', title: 'Excel color by number', hint: 'Numbered cells to color in, with a key', sub: () => 'A hidden picture: every cell holds a number and the key is on the second sheet',
    opts: TEXT_OPTS.concat([R('levels', 'How many shades', 2, 12, 1), R('cell', 'Cell size', 8, 28, 1)]),
    info: (o) => (+o.cols || 80) + ' × ' + rowsFor(o) + ' cells, ' + Math.max(2, Math.min(12, +o.levels || 6)) + ' shades to fill in',
    run: (o) => runExport(null, async (r) => saveFile(baseName() + '-color-by-number.xlsx', await xlsxHidden(twinGrid(r, o), o))) }
].forEach(registerExporter);
refreshExportsList();
