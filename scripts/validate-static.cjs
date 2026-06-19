'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var HTML_FILES = ['index.html', 'benchmark.html', 'uxflow.html', 'admin.html', 'eisenhower.html', 'voc.html', 'imsi.html'];
var JS_DIR = path.join(ROOT, 'js');

function fail(message) {
  console.error('VALIDATION ERROR: ' + message);
  process.exitCode = 1;
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function validateHtmlAssets(fileName) {
  var fullPath = path.join(ROOT, fileName);
  var html = read(fullPath);
  var regex = /<(script|link)\b[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi;
  var match;

  while ((match = regex.exec(html))) {
    var assetPath = match[2];
    if (/^(https?:)?\/\//i.test(assetPath)) continue;
    if (/^#/.test(assetPath)) continue;
    if (/^(mailto|tel):/i.test(assetPath)) continue;

    var normalized = assetPath.split('?')[0].split('#')[0];
    if (!normalized) continue;

    // Strip the Vite base prefix (/uxtools/) before resolving locally;
    // Vite copies public/ to dist/ so also check public/<path>.
    var VITE_BASE = '/uxtools/';
    var localPath = normalized.startsWith(VITE_BASE)
      ? normalized.slice(VITE_BASE.length)
      : normalized;

    var target = path.join(ROOT, localPath);
    var publicTarget = path.join(ROOT, 'public', localPath);
    var srcTarget = path.join(ROOT, 'src', localPath);
    if (!fs.existsSync(target) && !fs.existsSync(publicTarget) && !fs.existsSync(srcTarget)) {
      fail(fileName + ' references missing asset: ' + normalized);
    }
  }
}

function validateJavaScriptSyntax() {
  var files = fs.readdirSync(JS_DIR).filter(function (name) {
    return name.endsWith('.js');
  });

  files.forEach(function (name) {
    var fullPath = path.join(JS_DIR, name);
    try {
      new Function(read(fullPath));
    } catch (error) {
      fail('Syntax error in js/' + name + ': ' + error.message);
    }
  });
}

function validateCriticalFiles() {
  ['.nojekyll', 'css', 'js'].forEach(function (entry) {
    var fullPath = path.join(ROOT, entry);
    if (!fs.existsSync(fullPath)) {
      fail('Missing required entry: ' + entry);
    }
  });
}

function validateProductionIndex() {
  var html = read(path.join(ROOT, 'index.html'));
  if (/src\/main\.tsx/i.test(html)) {
    fail('index.html must not reference src/main.tsx — run npm run publish:legacy');
  }
  var isReactDashboard = /id=["']root["']/.test(html);
  var isStaticHub = /<main\b/i.test(html);
  if (!isReactDashboard && !isStaticHub) {
    fail('index.html must be a React dashboard (#root) or static hub (<main>)');
  }
}

validateCriticalFiles();
validateProductionIndex();
HTML_FILES.forEach(validateHtmlAssets);
validateJavaScriptSyntax();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Static validation passed for ' + HTML_FILES.length + ' HTML files and JS assets.');
