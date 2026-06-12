'use strict';

/*
 * build-imsi.cjs
 * Genera public/imsi.html (autocontenido) a partir de los módulos fuente:
 *   imsi.html  +  css/{tokens,base,nav,imsi}.css  +  js/imsi.js
 *
 * Producción = GitHub Pages sirve el dist de Vite, que solo incluye index.html
 * y los archivos de public/. Por eso la página desplegable debe ser un único
 * archivo en public/ (mismo patrón que voc.html). Este script mantiene un solo
 * origen de verdad (los módulos en raíz) y produce el artefacto inline.
 *
 * Uso: node scripts/build-imsi.cjs
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

var css = [
  '/* tokens.css */\n' + read('css/tokens.css'),
  '/* base.css */\n' + read('css/base.css'),
  '/* nav.css */\n' + read('css/nav.css'),
  '/* imsi.css */\n' + read('css/imsi.css')
].join('\n\n');

var js = read('js/imsi.js');
var html = read('imsi.html');

// Reemplaza los 4 <link rel="stylesheet" href="css/..."> por un único <style>.
html = html.replace(
  /\s*<link rel="stylesheet" href="css\/tokens\.css">[\s\S]*?<link rel="stylesheet" href="css\/imsi\.css">/,
  '\n  <style>\n' + css + '\n  </style>'
);

// Reemplaza <script src="js/imsi.js"></script> por el script inline.
html = html.replace(
  /<script src="js\/imsi\.js"><\/script>/,
  '<script>\n' + js + '\n</script>'
);

// Marca de archivo generado (no editar a mano).
html = html.replace(
  '<head>',
  '<head>\n  <!-- GENERADO por scripts/build-imsi.cjs desde imsi.html + css/ + js/imsi.js. No editar a mano. -->'
);

var out = path.join(ROOT, 'public', 'imsi.html');
fs.writeFileSync(out, html, 'utf8');
console.log('public/imsi.html generado (' + html.length + ' bytes).');
