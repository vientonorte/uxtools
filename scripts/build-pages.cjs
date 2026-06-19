'use strict';

var fs = require('fs');
var path = require('path');
var { execSync } = require('child_process');

var ROOT = path.join(__dirname, '..');
var DIST = path.join(ROOT, 'dist');

var STATIC_HTML = [
  'index.html',
  'benchmark.html',
  'uxflow.html',
  'eisenhower.html',
  'voc.html',
  'admin.html',
];

var STATIC_DIRS = ['css', 'js'];

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

console.log('Merging static suite into dist/...');
STATIC_HTML.forEach(function (file) {
  copyFile(path.join(ROOT, file), path.join(DIST, file));
});

STATIC_DIRS.forEach(function (dir) {
  copyDir(path.join(ROOT, dir), path.join(DIST, dir));
});

if (fs.existsSync(path.join(ROOT, '.nojekyll'))) {
  copyFile(path.join(ROOT, '.nojekyll'), path.join(DIST, '.nojekyll'));
}

var indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
if (/src\/main\.tsx/i.test(indexHtml)) {
  console.error('ERROR: dist/index.html still references src/main.tsx');
  process.exit(1);
}

console.log('Pages build ready in dist/');