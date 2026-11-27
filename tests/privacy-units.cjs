'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var esbuild = require('esbuild');

var ROOT = path.join(__dirname, '..');

function loadTs(rel, extra) {
  var result = esbuild.buildSync(Object.assign({
    absWorkingDir: ROOT,
    stdin: {
      contents: fs.readFileSync(path.join(ROOT, rel), 'utf8'),
      loader: rel.endsWith('.tsx') ? 'tsx' : 'ts',
      resolveDir: path.join(ROOT, path.dirname(rel)),
      sourcefile: rel,
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    external: ['react', 'react-dom', 'react-router-dom'],
  }, extra || {}));
  var mod = { exports: {} };
  var fn = new Function('module', 'exports', 'require', result.outputFiles[0].text);
  fn(mod, mod.exports, require);
  return mod.exports;
}

function installMemoryStorage() {
  var store = {};
  global.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    key: function (i) { return Object.keys(store)[i] || null; },
    get length() { return Object.keys(store).length; },
  };
  return store;
}

module.exports = function register(test, section) {
  section('Privacidad — migración y contacto');

  var storage = loadTs('src/lib/metodo-ro-storage.ts');
  var contact = loadTs('src/lib/support-contact.ts');
  var robots = loadTs('src/components/RoutePrivacy.tsx');

  test('migra un campo con prefijo conocido a Persona sin perder el texto', function () {
    var raw = { id: 's1', sonrisaZebra: 'nota sintética', scores: {} };
    var session = storage.sanitizeSelfradarSession(raw);
    assert.strictEqual(session.sonrisaPersona, 'nota sintética');
  });

  test('conserva todos los ids de score desconocidos', function () {
    var raw = {
      id: 's2',
      scores: {
        axisAlpha: { score: 4, action: 'una' },
        axisBeta: { score: 7, action: 'otra' },
        cuerpo: { score: 3, action: 'mapa' },
      },
    };
    var session = storage.sanitizeSelfradarSession(raw);
    assert.strictEqual(session.scores.e1.score, 3);
    assert.strictEqual(session.scores.e1.action, 'mapa');
    assert.strictEqual(session.scores.axisAlpha.score, 4);
    assert.strictEqual(session.scores.axisAlpha.action, 'una');
    assert.strictEqual(session.scores.axisBeta.score, 7);
    assert.strictEqual(session.scores.axisBeta.action, 'otra');
    assert.ok(!Object.prototype.hasOwnProperty.call(session.scores, 'cuerpo'));
  });

  test('contacto de apoyo nace vacío y solo arma enlaces con un número sintético', function () {
    installMemoryStorage();
    var empty = contact.loadSupportContact();
    assert.strictEqual(empty.phone, '');
    assert.strictEqual(empty.label, '');
    assert.strictEqual(contact.telHref('123'), null);
    assert.strictEqual(contact.waHref('123'), null);
    contact.saveSupportContact({ label: 'Persona de apoyo', phone: '56911111111' });
    var saved = contact.loadSupportContact();
    assert.strictEqual(saved.phone, '56911111111');
    assert.strictEqual(contact.telHref(saved.phone), 'tel:+56911111111');
    assert.strictEqual(contact.waHref(saved.phone), 'https://wa.me/56911111111');
  });

  test('noindex solo en las rutas privadas y se quita en el hub', function () {
    assert.strictEqual(robots.isNoindexPath('/selfradar'), true);
    assert.strictEqual(robots.isNoindexPath('/instafotos-app/mapa'), true);
    assert.strictEqual(robots.isNoindexPath('/medicinal'), true);
    assert.strictEqual(robots.isNoindexPath('/'), false);
    assert.strictEqual(robots.isNoindexPath('/benchmark'), false);

    var els = {};
    var doc = {
      getElementById: function (id) { return els[id] || null; },
      createElement: function () {
        var el = { id: '', name: '', content: '', parentNode: null, remove: function () { delete els[el.id]; } };
        return el;
      },
      head: { appendChild: function (el) { el.parentNode = doc.head; els[el.id] = el; } },
    };
    robots.syncRouteRobots('/selfradar', doc);
    assert.strictEqual(els['uxtools-route-robots'].content, 'noindex');
    robots.syncRouteRobots('/', doc);
    assert.strictEqual(els['uxtools-route-robots'], undefined);
  });

  test('la identidad por defecto de Instafotos está vacía', function () {
    var src = fs.readFileSync(path.join(ROOT, 'src/pages/Instafotos/data.ts'), 'utf8');
    var block = src.slice(src.indexOf('INITIAL_CONFIG'), src.indexOf('DEFAULT_PARKS'));
    assert.ok(/name:\s*""/.test(block));
    assert.ok(/instagram:\s*""/.test(block));
  });
};
