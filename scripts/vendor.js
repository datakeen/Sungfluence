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

/* every copy: the package, the file inside node_modules, and where it goes (relative to the project root) */
const plan = libs.map(([pkg, from, to]) => ({ pkg, from: pkg + '/' + from, to: 'src/' + to }))
  .concat(Object.entries(fonts).flatMap(([pkg, files]) => files.map((f) => ({ pkg, from: pkg + '/files/' + f, to: 'src/fonts/' + f }))));

function run() {
  for (const c of plan) { fs.copyFileSync(nm(c.from), path.join(root, c.to)); console.log('copied', c.to); }
}

module.exports = { plan, nm };
if (require.main === module) run();
