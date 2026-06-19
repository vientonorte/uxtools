'use strict';

var fs = require('fs');
var path = require('path');
var { execSync } = require('child_process');

var ROOT = path.join(__dirname, '..');
var DIST = path.join(ROOT, 'dist');

var STATIC_HTML = [
  'benchmark.html',
  'uxflow.html',
  'eisenhower.html',
  'voc.html',
  'admin.html',
];

var STATIC_DIRS = ['css', 'js'];
var STATIC_FILES = ['sw.js', 'manifest.json'];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  fs.readdirSync(srcDir, { withFileTypes: true }).forEach(function (entry) {
    var from = path.join(srcDir, entry.name);
    var to = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  });
}

console.log('Building React app (app.html)...');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

var builtApp = path.join(DIST, 'app.html');
if (!fs.existsSync(builtApp)) {
  console.error('ERROR: dist/app.html not found after build');
  process.exit(1);
}

console.log('Publishing Vite build as index.html...');
copyFile(builtApp, path.join(DIST, 'index.html'));

console.log('Merging static suite into dist/...');
STATIC_HTML.forEach(function (file) {
  copyFile(path.join(ROOT, file), path.join(DIST, file));
});

STATIC_DIRS.forEach(function (dir) {
  copyDir(path.join(ROOT, dir), path.join(DIST, dir));
});

STATIC_FILES.forEach(function (file) {
  var src = path.join(ROOT, file);
  if (fs.existsSync(src)) copyFile(src, path.join(DIST, file));
});

if (fs.existsSync(path.join(ROOT, '.nojekyll'))) {
  copyFile(path.join(ROOT, '.nojekyll'), path.join(DIST, '.nojekyll'));
}

var indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
if (/src\/main\.tsx/i.test(indexHtml)) {
  console.error('ERROR: dist/index.html still references src/main.tsx');
  process.exit(1);
}
if (!/id=["']root["']/.test(indexHtml)) {
  console.error('ERROR: dist/index.html missing React root');
  process.exit(1);
}

var VITE_BASE = '/uxtools/';
var assetRegex = /(?:src|href)=["']([^"']+)["']/gi;
var match;
while ((match = assetRegex.exec(indexHtml))) {
  var assetPath = match[1];
  if (/^(https?:)?\/\//i.test(assetPath)) continue;
  var localPath = assetPath.startsWith(VITE_BASE)
    ? assetPath.slice(VITE_BASE.length)
    : assetPath.replace(/^\//, '');
  if (!localPath.startsWith('assets/')) continue;
  var target = path.join(DIST, localPath);
  if (!fs.existsSync(target)) {
    console.error('ERROR: dist/index.html references missing asset: ' + assetPath);
    process.exit(1);
  }
}

console.log('Pages build ready in dist/');