'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var HTML_FILES = ['index.html', 'benchmark.html', 'uxflow.html', 'admin.html'];
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

    var target = path.join(ROOT, normalized);
    if (!fs.existsSync(target)) {
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

validateCriticalFiles();
HTML_FILES.forEach(validateHtmlAssets);
validateJavaScriptSyntax();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Static validation passed for ' + HTML_FILES.length + ' HTML files and JS assets.');
