// The open-source notices: NOTICE.md, the license texts in licenses/ and the list in licenses/third-party.json.
// scripts/build.js copies them into src/ (src/NOTICE.md, src/licenses/) and writes src/notices.js, which the app's
// Open-source credits window reads. scripts/site.js copies them into pages/ and writes pages/credits.html.
// The single file carries the same data inside it. tests/notices.test.js checks that every copy is complete.
// Uses only Node's standard library. SPDX-License-Identifier: AGPL-3.0-or-later
const fs = require('fs');
const path = require('path');
const { md } = require('./md.js');

const root = path.join(__dirname, '..');
const LIC = path.join(root, 'licenses');
const NOTICE = path.join(root, 'NOTICE.md');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n');

function list() { return JSON.parse(read(path.join(LIC, 'third-party.json'))); }
/* every file in licenses/, in name order */
function licenseFiles() { return fs.readdirSync(LIC).filter((f) => fs.statSync(path.join(LIC, f)).isFile()).sort(); }

/* NOTICE.md and licenses/ into a folder: src/ or pages/ */
function copyTo(dir) {
  fs.rmSync(path.join(dir, 'licenses'), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'licenses'), { recursive: true });
  for (const f of licenseFiles()) fs.copyFileSync(path.join(LIC, f), path.join(dir, 'licenses', f));
  fs.copyFileSync(NOTICE, path.join(dir, 'NOTICE.md'));
}

/* NOTICE.md as HTML. link(href) may rewrite links; by default they stay as they are */
function noticeHtml(link) { return md(read(NOTICE), link || ((h) => h)); }

/* what the app shows: the notice page, then every license text. Links to a license file jump to its text below;
   links to the project's own files open on GitHub, since the app has no file browser */
const REPO = 'https://github.com/datakeen/Sungfluence/blob/main/';
function appData() {
  const texts = licenseFiles().filter((f) => f.endsWith('.txt')).map((f) => ({ file: f, text: read(path.join(LIC, f)) }));
  const html = noticeHtml((h) => {
    const m = h.match(/^licenses\/([^/#?]+\.txt)$/);
    if (m) return '#lic-' + m[1].replace(/[^a-zA-Z0-9-]/g, '-');
    if (/^[a-z]+:/.test(h) || h.startsWith('#')) return h;
    return REPO + h.replace(/^\.\//, '');
  });
  return { html, texts: texts.map((t) => ({ id: 'lic-' + t.file.replace(/[^a-zA-Z0-9-]/g, '-'), file: t.file, text: t.text })) };
}

module.exports = { list, licenseFiles, copyTo, noticeHtml, appData, LIC, NOTICE };
