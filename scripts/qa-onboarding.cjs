'use strict';

/**
 * QA onboarding UX Tools — path real del usuario.
 * Mide fuente + (opcional) live. Fallar CI si el hub no entra al sprint.
 *
 *   node scripts/qa-onboarding.cjs
 *   QA_LIVE=1 node scripts/qa-onboarding.cjs
 */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var FAIL = 0;
var PASS = 0;

function ok(name) {
  PASS++;
  process.stdout.write('  ✓ ' + name + '\n');
}

function bad(name, detail) {
  FAIL++;
  process.stderr.write('  ✗ ' + name + (detail ? ' — ' + detail : '') + '\n');
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function mustContain(rel, needle, label) {
  var text = read(rel);
  if (text.indexOf(needle) === -1) bad(label, 'falta `' + needle + '` en ' + rel);
  else ok(label);
}

process.stdout.write('\nQA onboarding · UX Tools (path usuario = /uxtools/)\n');

mustContain(
  'src/App.tsx',
  'Navigate to="/onboarding"',
  'HomeGate redirige / → /onboarding'
);
mustContain(
  'src/lib/onboarding-storage.ts',
  'uxtools-onboard-done',
  'sello first-visit en storage'
);
mustContain(
  'src/pages/Onboarding.tsx',
  'SPRINT_DAYS',
  'Onboarding usa días DS VN'
);
mustContain(
  'src/lib/onboarding-sprint.ts',
  'Juega el sprint',
  'copy gamificada ES'
);
mustContain(
  'src/pages/Dashboard.tsx',
  'dash-sprint',
  'banner sprint arriba del hub'
);
mustContain(
  'src/config/suiteNav.ts',
  "shortLabel: 'Sprint'",
  'nav visible como Sprint'
);

var sw = read('sw.js');
if (sw.indexOf('id-medicinal-v1') !== -1) {
  bad('SW cache name', 'sigue id-medicinal-v1 (cache-first assets puede servir JS viejo)');
} else {
  ok('SW cache name distinto de medicinal-v1');
}

if (process.env.QA_LIVE === '1') {
  var live = process.env.QA_LIVE_URL || 'https://vientonorte.io/uxtools/';
  process.stdout.write('\nLive ' + live + '\n');
  fetch(live, { headers: { 'Cache-Control': 'no-cache' } })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (html) {
      var m = html.match(/src="([^"]+app-[^"]+\.js)"/);
      if (!m) {
        bad('live index js', 'no app-*.js');
        return null;
      }
      ok('live index js ' + m[1]);
      var jsUrl = m[1].indexOf('http') === 0 ? m[1] : new URL(m[1], live).href;
      return fetch(jsUrl).then(function (r) {
        return r.text();
      });
    })
    .then(function (js) {
      if (js == null) return;
      if (js.indexOf('Juega el sprint') === -1) bad('live bundle copy', 'sin Juega el sprint');
      else ok('live bundle Juega el sprint');
      if (js.indexOf('uxtools-onboard-done') === -1) bad('live bundle gate', 'sin sello first-visit');
      else ok('live bundle first-visit key');
      if (js.indexOf('/onboarding') === -1) bad('live bundle route', 'sin /onboarding');
      else ok('live bundle route /onboarding');
    })
    .catch(function (err) {
      bad('live fetch', err.message);
    })
    .then(function () {
      finish();
    });
} else {
  finish();
}

function finish() {
  process.stdout.write('\n---\nPASS=' + PASS + ' FAIL=' + FAIL + '\n');
  if (FAIL > 0) process.exit(1);
}
