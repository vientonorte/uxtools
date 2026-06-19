'use strict';

var fs = require('fs');
var path = require('path');
var { execSync } = require('child_process');

var ROOT = path.join(__dirname, '..');
var DIST = path.join(ROOT, 'dist');
var ASSETS = path.join(ROOT, 'assets');

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

console.log('Building React dashboard...');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

var builtApp = path.join(DIST, 'app.html');
if (!fs.existsSync(builtApp)) {
  console.error('ERROR: dist/app.html not found after build');
  process.exit(1);
}

console.log('Publishing built dashboard to index.html + assets/ ...');
copyFile(builtApp, path.join(ROOT, 'index.html'));

rimraf(ASSETS);
fs.mkdirSync(ASSETS, { recursive: true });
fs.readdirSync(path.join(DIST, 'assets')).forEach(function (file) {
  copyFile(path.join(DIST, 'assets', file), path.join(ASSETS, file));
});

var indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (/src\/main\.tsx/i.test(indexHtml)) {
  console.error('ERROR: published index.html still references src/main.tsx');
  process.exit(1);
}
if (!/id=["']root["']/.test(indexHtml)) {
  console.error('ERROR: published index.html missing React root');
  process.exit(1);
}

console.log('Legacy publish ready: index.html (React) + assets/');
console.log('Static hub backup: hub.html');