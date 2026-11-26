// Builds the GitHub Pages site into pages/:
//   pages/            the website from site/ (index.html, 404.html, sw.js, site.css, site.js, img/, og.jpg)
//   pages/try/        the web app: a copy of src/, so run `npm run build` first
//   pages/fonts/      the few fonts the website uses, from src/fonts
//   pages/credits.html, NOTICE.md and licenses/   the open-source notices (scripts/notices.js), linked from the footer
// Run: npm run site. GitHub Actions runs it in .github/workflows/web.yml.
// node scripts/site.js --serve [port] builds it, then serves pages/ at http://localhost:8090/Sungfluence/ the way
// GitHub Pages does: folders open their index.html and a missing address gets 404.html.
// SITE_BASE (default /Sungfluence/) is the path the site is served from; SITE_URL is its full address.
// Uses only Node's standard library. SPDX-License-Identifier: AGPL-3.0-or-later
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SITE_DIR = path.join(root, 'site');
const SRC = path.join(root, 'src');
const OUT = path.join(root, 'pages');
const BASE = (process.env.SITE_BASE || '/Sungfluence/').replace(/\/?$/, '/');
const SITE = process.env.SITE_URL || 'https://datakeen.github.io' + BASE;
const notices = require('./notices.js');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// files in site/ that are only for making the pictures
const SKIP = new Set(['og-card.html', path.join('img', 'lost-cat.txt')]);
const FONTS = ['inter-latin-wght-normal.woff2', 'oswald-latin-wght-normal.woff2', 'playfair-display-latin-wght-normal.woff2', 'jetbrains-mono-latin-400-normal.woff2'];

function build() {
  if (!fs.existsSync(path.join(SRC, 'index.html')) || !fs.existsSync(path.join(SRC, 'app.js'))) throw new Error('src/ is not built. Run npm run build first.');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cat = fs.existsSync(path.join(SITE_DIR, 'img', 'lost-cat.txt')) ? fs.readFileSync(path.join(SITE_DIR, 'img', 'lost-cat.txt'), 'utf8').replace(/\n+$/, '') : '';
  // the icon as a data address, for the 404 page: it is served at any depth and also opened from disk, so a file
  // address would miss in one of the two
  const iconData = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'app', 'icon.svg'), 'base64');
  // the notice page as HTML: license texts are copied next to it, other files of the project open on GitHub.
  // Wide tables get a box of their own that scrolls on a phone.
  const noticeHtml = notices.noticeHtml((h) => (/^[a-z]+:|^#|^licenses\//.test(h) ? h : 'https://github.com/datakeen/Sungfluence/blob/main/' + h))
    .replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, '</table></div>');
  // template-only: what helps only the unbuilt template (site/index.html opened by itself) stays out of pages/
  const fill = (s) => s.replace(/[ \t]*<!-- template-only[\s\S]*?<!-- \/template-only -->\n?/g, '').replace(/\{\{SITE\}\}/g, SITE).replace(/\{\{BASE\}\}/g, BASE).replace(/\{\{VERSION\}\}/g, pkg.version).replace(/\{\{LOST_CAT\}\}/g, () => esc(cat)).replace(/\{\{ICON_DATA\}\}/g, iconData).replace(/\{\{NOTICE\}\}/g, () => noticeHtml);

  // 1. the website
  let n = 0;
  (function walk(dir, rel) {
    for (const f of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, f), r = rel ? path.join(rel, f) : f;
      if (fs.statSync(full).isDirectory()) { walk(full, r); continue; }
      if (SKIP.has(r)) continue;
      const to = path.join(OUT, r);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      if (/\.(html|xml|txt)$/.test(f)) fs.writeFileSync(to, fill(fs.readFileSync(full, 'utf8')));
      else fs.copyFileSync(full, to);
      n++;
    }
  })(SITE_DIR, '');
  const left = fs.readdirSync(OUT).filter((f) => /\.html$/.test(f)).filter((f) => /\{\{[A-Z_]+\}\}/.test(fs.readFileSync(path.join(OUT, f), 'utf8')));
  if (left.length) throw new Error('unfilled placeholders in ' + left.join(', '));
  const kept = fs.readdirSync(OUT).filter((f) => /\.html$/.test(f) && /template-only/.test(fs.readFileSync(path.join(OUT, f), 'utf8')));
  if (kept.length) throw new Error('a template-only part was left in ' + kept.join(', '));

  // 2. fonts and icons, from the app
  fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
  for (const f of FONTS) fs.copyFileSync(path.join(SRC, 'fonts', f), path.join(OUT, 'fonts', f));
  fs.copyFileSync(path.join(root, 'app', 'icon.svg'), path.join(OUT, 'icon.svg'));
  fs.copyFileSync(path.join(SRC, 'icons', 'icon-192.png'), path.join(OUT, 'icon-192.png'));
  // the logo in the page header and footer: a small PNG drawn at its real size, much lighter than the full icon
  fs.copyFileSync(path.join(root, 'build', 'icons', '64x64.png'), path.join(OUT, 'icon-64.png'));

  // 2b. the open-source notices and the full license texts, for the fonts above and the web app below
  notices.copyTo(OUT);

  // 3. the web app
  fs.cpSync(SRC, path.join(OUT, 'try'), { recursive: true });

  // 4. for search engines
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + SITE + 'sitemap.xml\n');
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ['', 'try/', 'credits.html'].map((u) => '  <url><loc>' + SITE + u + '</loc></url>\n').join('') + '</urlset>\n');
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  console.log('pages/ built: the website (' + n + ' files) at ' + BASE + ', the web app at ' + BASE + 'try/');
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
/* a small static server that answers like GitHub Pages, for trying the site and for tests/site.test.js.
   over: an optional Map of path to text that answers instead of the file, so a test can stand in an old file */
function serve(port, over) {
  const http = require('http');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (over && over.has(p)) { res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'text/plain', 'Cache-Control': 'no-cache' }); return res.end(over.get(p)); }
    if (p + '/' === BASE) { res.writeHead(301, { Location: BASE }); return res.end(); }
    if (!p.startsWith(BASE)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    let file = path.join(OUT, path.normalize(p.slice(BASE.length)).replace(/^([.][.][\\/])+/, ''));
    if (!file.startsWith(OUT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' + url.search }); return res.end(); }
      file = path.join(file, 'index.html');
    }
    let status = 200;
    if (!fs.existsSync(file)) { status = 404; file = path.join(OUT, '404.html'); }
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port || 0, '127.0.0.1', () => ok(server)));
}

if (require.main === module) {
  build();
  const i = process.argv.indexOf('--serve');
  if (i >= 0) serve(+process.argv[i + 1] || 8090).then((s) => console.log('serving http://localhost:' + s.address().port + BASE));
}
module.exports = { build, serve, OUT, BASE };
