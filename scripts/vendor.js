// Copies fonts and export libraries from node_modules into src/ so the app runs offline.
// Run after updating any of these packages: npm run vendor
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nm = (p) => path.join(root, 'node_modules', p);
const copy = (from, to) => { fs.copyFileSync(nm(from), path.join(root, 'src', to)); console.log('copied', to); };
copy('jspdf/dist/jspdf.umd.min.js', 'vendor/jspdf.umd.min.js');
copy('jszip/dist/jszip.min.js', 'vendor/jszip.min.js');
const fonts = {
  '@fontsource-variable/inter': ['inter-latin-wght-normal.woff2'],
  '@fontsource/jetbrains-mono': ['jetbrains-mono-latin-400-normal.woff2', 'jetbrains-mono-latin-700-normal.woff2'],
  '@fontsource-variable/playfair-display': ['playfair-display-latin-wght-normal.woff2'],
  '@fontsource-variable/oswald': ['oswald-latin-wght-normal.woff2'],
  '@fontsource/noto-naskh-arabic': ['noto-naskh-arabic-arabic-400-normal.woff2', 'noto-naskh-arabic-arabic-700-normal.woff2', 'noto-naskh-arabic-latin-400-normal.woff2'],
  '@fontsource/special-elite': ['special-elite-latin-400-normal.woff2']
};
for (const [pkg, files] of Object.entries(fonts)) for (const f of files) copy(pkg + '/files/' + f, 'fonts/' + f);
