// Copies fonts and export libraries from node_modules into src/ so the app runs offline.
// Run after updating any of these packages: npm run vendor
// Anything new copied here also needs an entry in licenses/third-party.json, its license text in licenses/ and a line in
// NOTICE.md (tests/notices.test.js checks it). Update the versions there when a package is updated.
// tests/notices.test.js reads `plan` below and checks that every file in src/vendor and src/fonts comes from it,
// byte for byte, so a file copied in by hand fails the test unless its entry says why.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nm = (p) => path.join(root, 'node_modules', p);

const libs = [
  ['jspdf', 'dist/jspdf.umd.min.js', 'vendor/jspdf.umd.min.js'],
  ['jszip', 'dist/jszip.min.js', 'vendor/jszip.min.js']
];
const fonts = {
  '@fontsource-variable/inter': ['inter-latin-wght-normal.woff2'],
  '@fontsource/jetbrains-mono': ['jetbrains-mono-latin-400-normal.woff2', 'jetbrains-mono-latin-700-normal.woff2'],
  '@fontsource-variable/playfair-display': ['playfair-display-latin-wght-normal.woff2'],
  '@fontsource-variable/oswald': ['oswald-latin-wght-normal.woff2'],
  '@fontsource/noto-naskh-arabic': ['noto-naskh-arabic-arabic-400-normal.woff2', 'noto-naskh-arabic-arabic-700-normal.woff2', 'noto-naskh-arabic-latin-400-normal.woff2'],
  '@fontsource/noto-nastaliq-urdu': ['noto-nastaliq-urdu-arabic-400-normal.woff2', 'noto-nastaliq-urdu-arabic-700-normal.woff2'],
  '@fontsource/special-elite': ['special-elite-latin-400-normal.woff2']
};

/* Fixed-weight WOFF files of the same typefaces, for PDF export only: the PDF writer (jsPDF) embeds TrueType fonts
   with one weight each, so the build packs these into src/pdf-fonts.js and the app turns them into TrueType when a
   PDF is made. They go to src/fonts/pdf. The weights are the ones the PDF picks from (nearest weight). */
const PDF_WEIGHTS = {
  '@fontsource/inter': ['inter', [300, 400, 600, 700, 900]],
  '@fontsource/oswald': ['oswald', [300, 400, 500, 700]],
  '@fontsource/playfair-display': ['playfair-display', [400, 700, 900]],
  '@fontsource/jetbrains-mono': ['jetbrains-mono', [400, 700]],
  '@fontsource/special-elite': ['special-elite', [400]]
};
const pdfFonts = Object.entries(PDF_WEIGHTS).flatMap(([pkg, [stem, ws]]) => ws.map((w) => ({ pkg, from: pkg + '/files/' + stem + '-latin-' + w + '-normal.woff', to: 'src/fonts/pdf/' + stem + '-latin-' + w + '-normal.woff' })));

/* every copy: the package, the file inside node_modules, and where it goes (relative to the project root) */
const plan = libs.map(([pkg, from, to]) => ({ pkg, from: pkg + '/' + from, to: 'src/' + to }))
  .concat(Object.entries(fonts).flatMap(([pkg, files]) => files.map((f) => ({ pkg, from: pkg + '/files/' + f, to: 'src/fonts/' + f }))))
  .concat(pdfFonts);

function run() {
  for (const c of plan) { fs.mkdirSync(path.dirname(path.join(root, c.to)), { recursive: true }); fs.copyFileSync(nm(c.from), path.join(root, c.to)); console.log('copied', c.to); }
}

module.exports = { plan, nm, PDF_WEIGHTS };
if (require.main === module) run();
