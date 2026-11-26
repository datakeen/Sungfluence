// Open-source notices: every third-party file that SungFluence ships has an entry in licenses/third-party.json,
// every entry points at license texts that exist, NOTICE.md names every entry, and every copy carries the notices:
// src/ (the installers and the web app), pages/ (the website and the web app at /try) and the single file.
// Then the About window and the Open-source credits window are opened in light and dark, with screenshots in tests/out.
// Adding a library, a font, a plugin by someone else or content from elsewhere? Add it to licenses/third-party.json,
// put its license text in licenses/, and name it in NOTICE.md, in the same commit. Run `npm run build` first.
// SPDX-License-Identifier: AGPL-3.0-or-later
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const notices = require('../scripts/notices.js');

const root = path.join(__dirname, '..');
const R = (...p) => path.join(root, ...p);
const read = (p) => fs.readFileSync(p, 'utf8');
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
let fails = 0;
const check = (ok, msg, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg + (extra !== undefined ? '  (' + extra + ')' : '')); if (!ok) fails++; };

const list = notices.list();
const comps = list.components || [];
const own = list.own || [];
const all = comps.concat(own);
const notice = read(R('NOTICE.md'));
// a small glob: * is anything but a slash, ** is anything
const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
const pkg0 = () => JSON.parse(read(R('package.json')));
const covered = (rel, entries) => entries.filter((e) => (e.files || []).some((g) => globRe(g).test(rel)));

// ---- the list itself ----
const ids = all.concat(list.tools || [], list.credits || []).map((e) => e.id);
check(ids.length === new Set(ids).size, 'every entry has its own id', ids.filter((x, i) => ids.indexOf(x) !== i).join(', ') || ids.length + ' entries');
const fieldsMissing = comps.filter((c) => !c.name || !c.version || !c.license || !(c.copyright || []).length || !c.homepage || !(c.ships || []).length).map((c) => c.id);
check(!fieldsMissing.length, 'every shipped component has a name, version, license, copyright, homepage and where it ships', fieldsMissing.join(', ') || comps.length + ' components');
const noText = all.filter((c) => !(c.licenseFiles || []).length && !c.noticeElsewhere).map((c) => c.id);
check(!noText.length, 'every component has a license text, or says where its notices are', noText.join(', ') || 'all');
const badFile = [];
for (const c of all) for (const f of c.licenseFiles || []) if (!/^licenses\/[^/]+$/.test(f) || !fs.existsSync(R(f))) badFile.push(c.id + ': ' + f);
check(!badFile.length, 'every license file in the list exists in licenses/', badFile.join(', ') || 'all');
const used = new Set(all.flatMap((c) => c.licenseFiles || []).map((f) => f.slice('licenses/'.length)));
const orphans = notices.licenseFiles().filter((f) => f !== 'third-party.json' && !used.has(f));
check(!orphans.length, 'every file in licenses/ belongs to an entry', orphans.join(', ') || 'none left over');
const crlf = notices.licenseFiles().concat(['../NOTICE.md']).filter((f) => /\r/.test(read(path.join(notices.LIC, f))));
check(!crlf.length, 'the notices use LF line ends', crlf.join(', ') || 'all');
// the copyright line of each font is in its license text
const fontCopy = comps.filter((c) => /^(OFL|Apache)/.test(c.license)).filter((c) => {
  const core = c.copyright[0].replace(/^Copyright\s+(\(c\)\s+)?/i, '').slice(0, 40);
  return !c.licenseFiles.some((f) => read(R(f)).includes(core));
}).map((c) => c.id);
check(!fontCopy.length, 'each font license text carries the copyright line of that font', fontCopy.join(', ') || 'all');

// ---- what ships is listed ----
// every file under a folder, subfolders too, as paths from the project root with forward slashes
const walk = (rel) => {
  const abs = R(...rel.split('/'));
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(rel + '/' + d.name) : [rel + '/' + d.name]);
};
const isFont = (f) => /\.(woff2?|ttf|otf|eot)$/i.test(f);
const vendor = walk('src/vendor');
const fonts = walk('src/fonts').filter(isFont);
const shipped = vendor.concat(fonts);
const unlisted = shipped.filter((f) => !covered(f, comps).length);
check(!unlisted.length, 'every file in src/vendor and every font in src/fonts (subfolders too) has an entry', unlisted.join(', ') || shipped.length + ' files');
const stale = comps.flatMap((c) => (c.files || []).filter((g) => !shipped.some((f) => globRe(g).test(f)) && !fs.existsSync(R(g))).map((g) => c.id + ': ' + g));
check(!stale.length, 'every file pattern in the list still matches a file', stale.join(', ') || 'all');
// where each file came from: scripts/vendor.js copies it, byte for byte, from the package its entry names.
// A file put there by hand fails, unless its entry says why in "addedByHand"
const { plan, nm } = require('../scripts/vendor.js');
const noSource = [];
for (const f of shipped) {
  const owners = covered(f, comps).filter((c) => !c.partOf);
  if (owners.some((c) => c.addedByHand)) continue;
  const step = plan.find((s) => s.to === f);
  if (!step) { noSource.push(f + ': not copied by scripts/vendor.js'); continue; }
  if (!owners.some((c) => c.package === step.pkg)) noSource.push(f + ': its entry does not name ' + step.pkg);
  else if (!fs.existsSync(nm(step.from))) noSource.push(f + ': ' + step.pkg + ' is not installed (npm install)');
  else if (!fs.readFileSync(nm(step.from)).equals(fs.readFileSync(R(f)))) noSource.push(f + ': differs from ' + step.from + ' (npm run vendor)');
}
check(!noSource.length, 'every file in src/vendor and src/fonts is copied by scripts/vendor.js from the package its entry names, unchanged', noSource.join(', ') || shipped.length + ' files');
const missingPlan = plan.filter((s) => !fs.existsSync(R(s.to))).map((s) => s.to);
check(!missingPlan.length, 'every file scripts/vendor.js copies is in src/', missingPlan.join(', ') || plan.length + ' files');
const devPkgs = Object.keys(Object.assign({}, pkg0().dependencies, pkg0().devDependencies));
const undeclared = [...new Set(plan.map((s) => s.pkg))].filter((p) => !devPkgs.includes(p));
check(!undeclared.length, 'every package scripts/vendor.js copies from is in package.json, so it can be rebuilt', undeclared.join(', ') || 'all');
// fonts and minified libraries put straight into the website or the app source would skip src/vendor and src/fonts
const stray = walk('site').concat(walk('app')).filter((f) => isFont(f) || /\.min\.js$/i.test(f)).filter((f) => !covered(f, comps).length);
check(!stray.length, 'no font or minified library sits in site/ or app/ without an entry', stray.join(', ') || 'none');
// plugins: our own carry our copyright and are listed as our own; any other plugin needs an entry of its own
const plugins = fs.readdirSync(R('app', 'plugins')).filter((f) => f.endsWith('.js')).map((f) => 'app/plugins/' + f);
const plugBad = plugins.filter((f) => {
  const src = read(R(f));
  const ours = /Copyright \(C\) \d{4} Ahmed Bilal/.test(src) && /SPDX-License-Identifier: MIT/.test(src);
  return ours ? !covered(f, own).length : !covered(f, comps).length;
});
check(!plugBad.length, 'every built-in plugin is either ours (copyright, SPDX line, listed) or has an entry', plugBad.join(', ') || plugins.length + ' plugins');
// packages: what scripts/vendor.js copies into src/, and every runtime dependency (electron-builder ships those)
const pkg = pkg0();
const shippedPkgs = [...new Set(plan.map((s) => s.pkg)), ...Object.keys(pkg.dependencies || {}), 'electron'];
const pkgBad = shippedPkgs.filter((p) => !comps.some((c) => c.package === p));
check(!pkgBad.length, 'every vendored package and every runtime dependency has an entry', pkgBad.join(', ') || shippedPkgs.join(', '));
// versions of the direct packages match what is installed
const verBad = [];
for (const c of comps.filter((x) => x.package && !x.partOf && /^\d+\.\d+\.\d+$/.test(x.version))) {
  const pj = R('node_modules', c.package, 'package.json');
  if (fs.existsSync(pj)) { const v = JSON.parse(read(pj)).version; if (v !== c.version) verBad.push(c.id + ' ' + c.version + ' vs ' + v); }
}
// fonts give the Fontsource package version inside their version text
for (const c of comps.filter((x) => x.package && /Fontsource (\d+\.\d+\.\d+)/.test(x.version))) {
  const pj = R('node_modules', c.package, 'package.json');
  const want = c.version.match(/Fontsource (\d+\.\d+\.\d+)/)[1];
  if (!fs.existsSync(pj)) verBad.push(c.id + ': ' + c.package + ' is not installed');
  else { const v = JSON.parse(read(pj)).version; if (v !== want) verBad.push(c.id + ' Fontsource ' + want + ' vs ' + v); }
}
check(!verBad.length, 'the versions in the list match the installed packages', verBad.join(', ') || 'all');

// ---- NOTICE.md names everything ----
const low = notice.toLowerCase();
const unnamed = all.concat(list.tools || [], list.credits || []).filter((e) => {
  const short = e.name.replace(/\s*\(.*$/, '').toLowerCase();
  return !low.includes(short) && !(e.homepage && notice.includes(e.homepage));
}).map((e) => e.id);
check(!unnamed.length, 'NOTICE.md names every entry', unnamed.join(', ') || 'all');
const unlinked = [...used].filter((f) => !notice.includes('licenses/' + f));
check(!unlinked.length, 'NOTICE.md links every license text', unlinked.join(', ') || used.size + ' texts');
check(/\]\(NOTICE\.md\)/.test(read(R('README.md'))), 'the README links NOTICE.md');
check((pkg.build.files || []).includes('src/**/*') && (pkg.build.files || []).includes('LICENSE'), 'the installers take all of src/ (with its notices) and LICENSE');
const macRes = ((pkg.build.mac || {}).extraResources || []).map((r) => r.from);
check(macRes.includes('node_modules/electron/dist/LICENSE') && macRes.includes('node_modules/electron/dist/LICENSES.chromium.html'), 'the macOS app gets Electron\'s and Chromium\'s notices back');
check(/command\('help\.credits'/.test(read(R('app', 'parts', '05c-commands.js'))) && /help\.credits/.test(read(R('main.js'))), 'Open-source credits is a command and in the desktop Help menu');

// ---- every copy carries the notices ----
const same = (dir) => {
  const miss = [];
  if (!fs.existsSync(path.join(dir, 'NOTICE.md')) || read(path.join(dir, 'NOTICE.md')) !== notice) miss.push('NOTICE.md');
  for (const f of notices.licenseFiles()) { const p = path.join(dir, 'licenses', f); if (!fs.existsSync(p) || read(p) !== read(path.join(notices.LIC, f))) miss.push('licenses/' + f); }
  return miss;
};
const json = (o) => JSON.stringify(o).replace(/<\//g, '<\\/');
const data = json(notices.appData());
let m = same(R('src'));
check(!m.length, 'src/ has NOTICE.md and every license text, up to date', m.join(', ') || 'run npm run build after changing them');
check(fs.existsSync(R('src', 'notices.js')) && read(R('src', 'notices.js')).includes(data), 'src/notices.js has the current notices for the credits window');
const site = require('../scripts/site.js');
site.build();
m = same(site.OUT).concat(same(path.join(site.OUT, 'try')));
check(!m.length, 'pages/ and pages/try/ have NOTICE.md and every license text', m.join(', ') || 'all');
const credits = fs.existsSync(path.join(site.OUT, 'credits.html')) ? read(path.join(site.OUT, 'credits.html')) : '';
const credBad = [...used].filter((f) => !credits.includes('href="licenses/' + f + '"') || !fs.existsSync(path.join(site.OUT, 'licenses', f)));
check(credits && !/\{\{/.test(credits) && !credBad.length, 'the website\'s credits page links every license text, and they are there', credBad.join(', ') || 'credits.html');
check(/href="credits\.html"/.test(read(path.join(site.OUT, 'index.html'))), 'the website footer links the credits page');
const single = R('single', 'sungfluence.html');
if (fs.existsSync(single)) check(read(single).includes('window.SUNGFLUENCE_NOTICES = ' + data + ';'), 'the single file carries the current notices', 'run npm run build:single after changing them');
else console.log('skip the single file is not built (npm run build:single)');

// ---- in the app: About, then the credits window, in light and dark ----
(async () => {
  const { launch } = require('./browser');
  const b = await launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: scheme });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(pathToFileURL(R('src', 'index.html')).href); await p.waitForTimeout(1800);
    await p.evaluate(() => window.__sungfluenceMenu('help.about')); await p.waitForTimeout(300);
    const about = await p.evaluate(() => ({ btn: !!document.getElementById('aboutCredits'), text: document.getElementById('dlg').textContent }));
    check(about.btn && /jsPDF/.test(about.text) && /Noto Nastaliq Urdu/.test(about.text), scheme + ': About names the main projects and has an Open-source credits button');
    await p.locator('#aboutCredits').scrollIntoViewIfNeeded();
    await p.screenshot({ path: path.join(__dirname, 'out', 'notices-about-' + scheme + '.png') });
    await p.click('#aboutCredits'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const d = document.getElementById('dlg');
      return { title: document.getElementById('dlgTitle').textContent, folds: d.querySelectorAll('details.lic').length, rows: d.querySelectorAll('table tr').length,
        text: d.textContent.length, ofl: /SIL OPEN FONT LICENSE/i.test(d.textContent) };
    });
    check(r.title === 'Open-source credits' && r.folds === notices.licenseFiles().filter((f) => f.endsWith('.txt')).length && r.rows > 20 && r.ofl,
      scheme + ': the credits window shows the notice and every license text', r.folds + ' texts, ' + r.rows + ' rows');
    await p.screenshot({ path: path.join(__dirname, 'out', 'notices-credits-' + scheme + '.png') });
    // a link to a license opens its text in the window
    await p.click('#dlg a[href="#lic-OFL-1-1-NotoNastaliqUrdu-txt"]'); await p.waitForTimeout(400);
    const open = await p.evaluate(() => { const t = document.getElementById('lic-OFL-1-1-NotoNastaliqUrdu-txt'); const r = t.getBoundingClientRect(); return t.open && r.top < innerHeight && r.bottom > 0 && /notofonts\/nastaliq/.test(t.textContent); });
    check(open, scheme + ': a license link opens that license text in the window');
    await p.screenshot({ path: path.join(__dirname, 'out', 'notices-license-' + scheme + '.png') });
    // the command palette finds it
    await p.click('#dlg .sheet-h button'); await p.waitForTimeout(150);
    await p.evaluate(() => window.__sungfluenceMenu('help.palette')); await p.waitForTimeout(200);
    await p.keyboard.type('open-source'); await p.waitForTimeout(250);
    const found = await p.evaluate(() => { const l = document.querySelector('#palette .palette-list'); return !!l && /Open-source credits/.test(l.textContent); });
    check(found, scheme + ': the command palette offers Open-source credits');
    check(!errs.length, scheme + ': no page errors', errs.join(' | ') || 'none');
    await ctx.close();
  }
  // on a phone the tables keep their words whole and scroll inside their own box; the page does not scroll sideways
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(pathToFileURL(R('src', 'index.html')).href); await p.waitForTimeout(1800);
    await p.evaluate(() => window.__sungfluenceMenu('help.credits')); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const d = document.getElementById('dlg');
      const boxes = [...d.querySelectorAll('.credits-tbl')];
      // a word split over two lines has more than one line on screen
      const split = [];
      for (const c of d.querySelectorAll('.credits-tbl th, .credits-tbl td')) {
        const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          // a break right after a hyphen is normal; a break inside a word is not
          for (const m of n.textContent.matchAll(/[^\s-]+-?/g)) {
            const range = document.createRange(); range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
            const tops = new Set([...range.getClientRects()].map((q) => Math.round(q.top)));
            if (tops.size > 1) split.push(m[0]);
          }
        }
      }
      return { boxes: boxes.length, scrolls: boxes.some((b) => b.scrollWidth > b.clientWidth), split, pageWide: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    check(r.boxes >= 3 && r.scrolls && !r.split.length && !r.pageWide, 'phone, dark: the credits tables scroll in their own box, words stay whole, the page does not scroll sideways',
      r.boxes + ' tables' + (r.split.length ? ', split: ' + r.split.slice(0, 4).join(' | ') : '') + (r.pageWide ? ', page too wide' : ''));
    await p.screenshot({ path: path.join(__dirname, 'out', 'notices-credits-phone-dark.png') });
    check(!errs.length, 'phone, dark: no page errors', errs.join(' | ') || 'none');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'all notices checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
