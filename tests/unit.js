'use strict';

/**
 * Unit tests — UX Tools Suite
 *
 * Tests the pure business-logic functions of each JS module.
 * Runs in Node.js with no external dependencies (stdlib only).
 *
 *   node tests/unit.js
 */

var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var vm     = require('vm');

var ROOT   = path.join(__dirname, '..');
var passed = 0;
var failed = 0;

/* ── Test runner ──────────────────────────────────────────────── */

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  ✓ ' + name + '\n');
  } catch (e) {
    failed++;
    process.stderr.write('  ✗ ' + name + '\n');
    process.stderr.write('    ' + e.message + '\n');
  }
}

function section(title) {
  process.stdout.write('\n' + title + '\n');
}

/* ── Minimal browser sandbox ──────────────────────────────────── */

function makeSandbox() {
  var store = {};

  /*
   * Lightweight DOM element.
   * - innerHTML has a getter (returns escaped text) and setter (stores raw string).
   * - textContent, value, disabled are plain writable properties.
   * - classList / style / setAttribute / addEventListener are no-ops.
   * - appendChild stores the text node's data.
   * This is intentionally permissive: uxflow.js assigns directly to
   * document.getElementById('doc-fecha').textContent without a null guard,
   * so getElementById must always return a mock rather than null.
   */
  function makeElement() {
    var el = { _text: '' };
    Object.defineProperty(el, 'innerHTML', {
      get: function () {
        return String(el._text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      set: function (v) { el._text = String(v); }
    });
    el.appendChild      = function (node) { el._text = node.data || ''; };
    el.setAttribute     = function () {};
    el.addEventListener = function () {};
    el.classList        = { toggle: function () {}, add: function () {}, remove: function () {} };
    el.textContent      = '';
    el.value            = '';
    el.disabled         = false;
    el.style            = {};
    return el;
  }

  var sandbox = {
    localStorage: {
      getItem:    function (k) {
        return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
      },
      setItem:    function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
      clear:      function () { store = {}; }
    },
    document: {
      createElement:    function () { return makeElement(); },
      createTextNode:   function (t) { return { data: String(t) }; },
      /* Always return a mock — some scripts assign .textContent without a null guard */
      getElementById:   function () { return makeElement(); },
      querySelectorAll: function () { return []; },
      querySelector:    function () { return null; },
      addEventListener: function () {}
    },
    window:       { IntersectionObserver: undefined },
    console:      console,
    Date:         Date,
    Math:         Math,
    Array:        Array,
    Object:       Object,
    String:       String,
    Number:       Number,
    Boolean:      Boolean,
    parseInt:     parseInt,
    parseFloat:   parseFloat,
    isNaN:        isNaN,
    RegExp:       RegExp,
    Function:     Function,
    setTimeout:   function () {},
    clearTimeout: function () {}
  };

  return sandbox;
}

function loadScript(ctx, relPath) {
  var code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  vm.runInNewContext(code, ctx);
}

/* ── Load all scripts into shared sandbox ─────────────────────── */
/* Order mirrors the browser: utils first so others can use its helpers */

var ctx = makeSandbox();
loadScript(ctx, 'js/utils.js');
loadScript(ctx, 'js/uxflow.js');
loadScript(ctx, 'js/benchmark.js');
loadScript(ctx, 'js/dashboard.js');

/* ══════════════════════════════════════════════════════════════ */
/*  UTILS.JS                                                      */
/* ══════════════════════════════════════════════════════════════ */

section('utils.js — escapeHTML');

test('escapes < and > angle brackets', function () {
  assert.strictEqual(ctx.escapeHTML('<b>hello</b>'), '&lt;b&gt;hello&lt;/b&gt;');
});

test('escapes ampersand', function () {
  assert.strictEqual(ctx.escapeHTML('a & b'), 'a &amp; b');
});

test('escapes double quotes', function () {
  assert.ok(ctx.escapeHTML('"hi"').indexOf('&quot;') !== -1);
});

test('coerces non-string input to string', function () {
  assert.strictEqual(typeof ctx.escapeHTML(42), 'string');
  assert.strictEqual(typeof ctx.escapeHTML(null), 'string');
});

test('returns empty string unchanged', function () {
  assert.strictEqual(ctx.escapeHTML(''), '');
});

test('returns plain text unchanged', function () {
  assert.strictEqual(ctx.escapeHTML('hello world'), 'hello world');
});

/* ══════════════════════════════════════════════════════════════ */
/*  UXFLOW.JS                                                     */
/* ══════════════════════════════════════════════════════════════ */

section('uxflow.js — normalizePrompt');

test('strips fenced code blocks', function () {
  assert.ok(ctx.normalizePrompt('```js\nconst x = 1;\n```').indexOf('```') === -1);
});

test('strips HTML tags', function () {
  assert.ok(ctx.normalizePrompt('<div>hello</div>').indexOf('<') === -1);
});

test('collapses multiple spaces into one', function () {
  assert.ok(ctx.normalizePrompt('a   b   c').split(' ').filter(Boolean).length <= 3);
});

test('strips markdown bullet point prefix', function () {
  var result = ctx.normalizePrompt('- item one');
  assert.ok(result.trim().charAt(0) !== '-');
});

test('strips markdown number list prefix', function () {
  var result = ctx.normalizePrompt('1. step one');
  assert.ok(result.trim().charAt(0) !== '1');
});

test('returns empty string for empty input', function () {
  assert.strictEqual(ctx.normalizePrompt(''), '');
});

test('handles null and undefined gracefully', function () {
  assert.strictEqual(typeof ctx.normalizePrompt(null), 'string');
  assert.strictEqual(typeof ctx.normalizePrompt(undefined), 'string');
});

/* ── titleCase ─────────────────────────────────────────────── */

section('uxflow.js — titleCase');

test('capitalizes first letter of every word', function () {
  assert.strictEqual(ctx.titleCase('hello world'), 'Hello World');
});

test('lowercases letters after the first in each word', function () {
  assert.strictEqual(ctx.titleCase('HELLO WORLD'), 'Hello World');
});

test('handles empty string', function () {
  assert.strictEqual(ctx.titleCase(''), '');
});

test('handles single word', function () {
  assert.strictEqual(ctx.titleCase('analista'), 'Analista');
});

/* ── uniqueItems ───────────────────────────────────────────── */

section('uxflow.js — uniqueItems');

test('removes duplicate strings (case-insensitive)', function () {
  assert.strictEqual(ctx.uniqueItems(['Chile', 'chile', 'CHILE']).length, 1);
});

test('preserves the case of the first occurrence', function () {
  assert.strictEqual(ctx.uniqueItems(['Chile', 'chile'])[0], 'Chile');
});

test('filters out empty strings', function () {
  assert.ok(ctx.uniqueItems(['a', '', 'b']).indexOf('') === -1);
});

test('returns empty array for empty input', function () {
  assert.deepStrictEqual(ctx.uniqueItems([]), []);
});

test('preserves order of unique items', function () {
  var result = ctx.uniqueItems(['b', 'a', 'c', 'a']);
  assert.deepStrictEqual(result, ['b', 'a', 'c']);
});

/* ── slugToSentence ────────────────────────────────────────── */

section('uxflow.js — slugToSentence');

test('capitalizes the first character', function () {
  assert.strictEqual(ctx.slugToSentence('hello world').charAt(0), 'H');
});

test('does not change rest of the string', function () {
  assert.strictEqual(ctx.slugToSentence('hello world'), 'Hello world');
});

test('returns empty string for empty input', function () {
  assert.strictEqual(ctx.slugToSentence(''), '');
});

/* ── extractActor ──────────────────────────────────────────── */

section('uxflow.js — extractActor');

test('extracts actor from "yo como X quiero" pattern', function () {
  var actor = ctx.extractActor('yo como analista quiero ver el reporte');
  assert.strictEqual(actor, 'Analista');
});

test('returns "Negocio" when prompt mentions negocio', function () {
  assert.strictEqual(ctx.extractActor('el negocio requiere datos consolidados'), 'Negocio');
});

test('returns "Analista UX" when prompt mentions analista', function () {
  assert.strictEqual(ctx.extractActor('el analista revisa el flujo'), 'Analista UX');
});

test('returns "Usuario final" when prompt mentions cliente', function () {
  assert.strictEqual(ctx.extractActor('el cliente selecciona el producto'), 'Usuario final');
});

test('returns "Equipo UX" as default fallback', function () {
  assert.strictEqual(ctx.extractActor('revisar el flujo general del sistema'), 'Equipo UX');
});

/* ── extractGoal ───────────────────────────────────────────── */

section('uxflow.js — extractGoal');

test('returns a non-empty string for any prompt', function () {
  assert.ok(ctx.extractGoal('quiero visualizar el reporte mensual').length > 0);
});

test('returns a string for empty prompt', function () {
  assert.strictEqual(typeof ctx.extractGoal(''), 'string');
});

test('starts with an uppercase letter when a goal clause is found', function () {
  var goal = ctx.extractGoal('quiero ver el reporte');
  if (goal.length > 0) {
    assert.strictEqual(goal.charAt(0), goal.charAt(0).toUpperCase());
  }
});

/* ── inferLinea ────────────────────────────────────────────── */

section('uxflow.js — inferLinea');

test('returns selected linea when it is not "Otro"', function () {
  assert.strictEqual(ctx.inferLinea('anything here', 'Wealth Management'), 'Wealth Management');
});

test('infers Wealth Management from prompt keywords', function () {
  assert.strictEqual(ctx.inferLinea('gestión de wealth patrimonial', 'Otro'), 'Wealth Management');
});

test('infers Investment Management from prompt keywords', function () {
  assert.strictEqual(ctx.inferLinea('investment report detalle', 'Otro'), 'Investment Management');
});

test('infers Corporate Solutions from prompt keywords', function () {
  assert.strictEqual(ctx.inferLinea('flujo corporativo entre empresas', 'Otro'), 'Corporate Solutions');
});

test('returns "Otro" when no keywords match', function () {
  assert.strictEqual(ctx.inferLinea('ver el reporte mensual', 'Otro'), 'Otro');
});

/* ── inferCountries ────────────────────────────────────────── */

section('uxflow.js — inferCountries');

test('extracts countries listed in raw input string', function () {
  var result = ctx.inferCountries('', 'Chile, Colombia');
  assert.ok(result.indexOf('Chile') !== -1);
  assert.ok(result.indexOf('Colombia') !== -1);
});

test('detects country mentioned in prompt text', function () {
  var result = ctx.inferCountries('filtrar por México y Perú', '');
  assert.ok(result.indexOf('México') !== -1);
  assert.ok(result.indexOf('Perú') !== -1);
});

test('returns at least one country when no info provided (default list)', function () {
  var result = ctx.inferCountries('', '');
  assert.ok(Array.isArray(result) && result.length > 0);
});

test('deduplicates countries appearing in both prompt and raw input', function () {
  var result = ctx.inferCountries('Chile es clave', 'Chile');
  var count  = result.filter(function (c) { return c === 'Chile'; }).length;
  assert.strictEqual(count, 1);
});

test('returns an array', function () {
  assert.ok(Array.isArray(ctx.inferCountries('some prompt', 'Colombia')));
});

/* ── detectEdgeCases ───────────────────────────────────────── */

section('uxflow.js — detectEdgeCases');

test('detects null/empty data edge case', function () {
  assert.ok(ctx.detectEdgeCases('manejar datos nulos y vac\u00edos').length > 0);
});

test('detects error/fallback edge case', function () {
  assert.ok(ctx.detectEdgeCases('manejar error y fallback de red').length > 0);
});

test('returns empty array for a plain prompt with no edge cases', function () {
  assert.strictEqual(ctx.detectEdgeCases('ver el reporte mensual del equipo').length, 0);
});

test('returns an array (even when empty)', function () {
  assert.ok(Array.isArray(ctx.detectEdgeCases('')));
});

test('does not return duplicate entries', function () {
  var cases = ctx.detectEdgeCases('null null nulo null vac\u00edo');
  var uniq  = cases.filter(function (v, i, a) { return a.indexOf(v) === i; });
  assert.strictEqual(cases.length, uniq.length);
});

/* ── detectSteps ───────────────────────────────────────────── */

section('uxflow.js — detectSteps');

test('first step is always "Inicio"', function () {
  var steps = ctx.detectSteps('ver el reporte', 'Analista', 'ver reporte', 'Otro', ['Chile'], []);
  assert.strictEqual(steps[0].label, 'Inicio');
});

test('last step is always "Resultado"', function () {
  var steps = ctx.detectSteps('ver el reporte', 'Analista', 'ver reporte', 'Otro', ['Chile'], []);
  assert.strictEqual(steps[steps.length - 1].label, 'Resultado');
});

test('includes "Caso borde" step when edge cases are provided', function () {
  var steps = ctx.detectSteps(
    'manejar datos nulos', 'Analista', 'manejar datos', 'Otro',
    ['Chile'], ['Manejo de datos nulos o vac\u00edos']
  );
  assert.ok(steps.some(function (s) { return s.label === 'Caso borde'; }));
});

test('returns at least 2 steps for any input', function () {
  var steps = ctx.detectSteps('', 'Equipo UX', 'algo', 'Otro', ['Chile'], []);
  assert.ok(steps.length >= 2);
});

test('every step has a label and tone property', function () {
  var steps = ctx.detectSteps('filtrar tabla por l\u00ednea', 'Analista', 'filtrar', 'Otro', ['Chile'], []);
  steps.forEach(function (s) {
    assert.ok(typeof s.label === 'string', 'missing label');
    assert.ok(typeof s.tone  === 'string', 'missing tone');
  });
});

/* ── buildCriteria ─────────────────────────────────────────── */

section('uxflow.js — buildCriteria');

test('returns at least 4 criteria', function () {
  assert.ok(ctx.buildCriteria('ver reporte', 'Otro', ['Chile'], [], '').length >= 4);
});

test('first criterion references the goal', function () {
  var criteria = ctx.buildCriteria('ver el dashboard', 'Otro', ['Chile'], [], '');
  assert.ok(criteria[0].indexOf('ver el dashboard') !== -1);
});

test('second criterion references the linea', function () {
  var criteria = ctx.buildCriteria('objetivo', 'Wealth Management', ['Chile'], [], '');
  assert.ok(criteria[1].indexOf('Wealth Management') !== -1);
});

test('third criterion references the countries', function () {
  var criteria = ctx.buildCriteria('objetivo', 'Otro', ['Chile', 'Per\u00fa'], [], '');
  assert.ok(criteria[2].indexOf('Chile') !== -1);
});

test('adds extra criterion when prompt contains filter keyword', function () {
  var criteria = ctx.buildCriteria('objetivo', 'Otro', ['Chile'], [], 'filtrar por pa\u00eds');
  var hasFilter = criteria.some(function (c) { return /filtro|filtr/i.test(c); });
  assert.ok(hasFilter);
});

test('adds edge-case criterion for each detected edge case', function () {
  var cases    = ['Manejo de datos nulos'];
  var criteria = ctx.buildCriteria('objetivo', 'Otro', ['Chile'], cases, '');
  assert.ok(criteria.some(function (c) { return c.indexOf('Manejo de datos nulos') !== -1; }));
});

test('returns no more than 6 criteria', function () {
  var criteria = ctx.buildCriteria(
    'objetivo', 'Otro', ['Chile'], ['e1', 'e2', 'e3', 'e4'],
    'filtrar tabla contacto validar'
  );
  assert.ok(criteria.length <= 6);
});

/* ── sanitizeHistory ───────────────────────────────────────── */

section('uxflow.js — sanitizeHistory');

test('returns empty array for null input', function () {
  assert.strictEqual(ctx.sanitizeHistory(null).length, 0);
});

test('returns empty array for non-array input', function () {
  assert.strictEqual(ctx.sanitizeHistory('invalid').length, 0);
  assert.strictEqual(ctx.sanitizeHistory(42).length, 0);
});

test('returns empty array for empty array input', function () {
  assert.deepStrictEqual(ctx.sanitizeHistory([]), []);
});

test('filters out primitive entries (null, number, string)', function () {
  assert.strictEqual(ctx.sanitizeHistory([null, undefined, 42, 'bad']).length, 0);
});

test('preserves a structurally valid entry', function () {
  var entry = {
    id:       1,
    titulo:   'Test',
    criterios: 'yo como analista quiero ver los datos',
    linea:    'Otro',
    paises:   'Chile',
    fecha:    '01/01/2026',
    model:    {
      title:          'Test',
      actor:          'Analista',
      goal:           'ver los datos',
      linea:          'Otro',
      countries:      ['Chile'],
      prompt:         'yo como analista quiero ver los datos',
      edgeCases:      [],
      steps:          [{ label: 'Inicio', detail: 'start', tone: 'dark' }],
      criteria:       ['criterio 1'],
      tabDescription: 'desc'
    }
  };
  assert.strictEqual(ctx.sanitizeHistory([entry]).length, 1);
});

/* ── nextHistoryId ─────────────────────────────────────────── */

section('uxflow.js — nextHistoryId');

test('returns a number', function () {
  assert.strictEqual(typeof ctx.nextHistoryId(), 'number');
});

test('returns a positive value', function () {
  assert.ok(ctx.nextHistoryId() > 0);
});

test('returns a value at least as large as Date.now()', function () {
  var before = Date.now();
  var id     = ctx.nextHistoryId();
  assert.ok(id >= before);
});

/* ══════════════════════════════════════════════════════════════ */
/*  BENCHMARK.JS                                                  */
/* ══════════════════════════════════════════════════════════════ */

section('benchmark.js — hydrateDimensionConfig');

test('returns same number of items as input', function () {
  var input  = [{ id: 'd1', nombre: 'A', desc: 'B', activa: true, criterios: ['c'] }];
  assert.strictEqual(ctx.hydrateDimensionConfig(input).length, 1);
});

test('backfills criterios from defaults when input has empty criterios', function () {
  var input  = [{ id: 'd1', nombre: 'Primera Impresi\u00f3n', desc: 'desc', activa: true, criterios: [] }];
  assert.ok(ctx.hydrateDimensionConfig(input)[0].criterios.length > 0);
});

test('preserves criterios when already provided', function () {
  var input  = [{ id: 'd1', nombre: 'A', desc: 'B', activa: true, criterios: ['mi criterio'] }];
  assert.strictEqual(ctx.hydrateDimensionConfig(input)[0].criterios[0], 'mi criterio');
});

test('handles empty list', function () {
  assert.deepStrictEqual(ctx.hydrateDimensionConfig([]), []);
});

test('handles null argument without throwing', function () {
  assert.strictEqual(ctx.hydrateDimensionConfig(null).length, 0);
});

/* ── getScoreVal ───────────────────────────────────────────── */

section('benchmark.js — getScoreVal');

test('returns 0 when no entry exists', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = {};
  assert.strictEqual(ctx.getScoreVal('d1', 1), 0);
  ctx.STATE.scores = orig;
});

test('returns numeric score for a plain number entry (legacy format)', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = { d1: { 1: 4 } };
  assert.strictEqual(ctx.getScoreVal('d1', 1), 4);
  ctx.STATE.scores = orig;
});

test('returns .val for an object entry', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = { d1: { 1: { val: 3, screenshot: null } } };
  assert.strictEqual(ctx.getScoreVal('d1', 1), 3);
  ctx.STATE.scores = orig;
});

test('returns 0 for object entry with val 0', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = { d1: { 1: { val: 0, screenshot: null } } };
  assert.strictEqual(ctx.getScoreVal('d1', 1), 0);
  ctx.STATE.scores = orig;
});

/* ── setScoreEntry ─────────────────────────────────────────── */

section('benchmark.js — setScoreEntry');

test('stores val and screenshot as an object', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = {};
  ctx.setScoreEntry('d1', 1, 5, 'data:image/png;...');
  assert.strictEqual(ctx.STATE.scores.d1[1].val, 5);
  assert.strictEqual(ctx.STATE.scores.d1[1].screenshot, 'data:image/png;...');
  ctx.STATE.scores = orig;
});

test('preserves existing screenshot when screenshot argument is undefined', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = { d1: { 1: { val: 3, screenshot: 'existing-data' } } };
  ctx.setScoreEntry('d1', 1, 4, undefined);
  assert.strictEqual(ctx.STATE.scores.d1[1].screenshot, 'existing-data');
  ctx.STATE.scores = orig;
});

test('overwrites screenshot when a new one is supplied', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = { d1: { 1: { val: 3, screenshot: 'old' } } };
  ctx.setScoreEntry('d1', 1, 4, 'new-data');
  assert.strictEqual(ctx.STATE.scores.d1[1].screenshot, 'new-data');
  ctx.STATE.scores = orig;
});

/* ── getScoreScreenshot ────────────────────────────────────── */

section('benchmark.js — getScoreScreenshot');

test('returns null when no entry exists', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = {};
  assert.strictEqual(ctx.getScoreScreenshot('d1', 1), null);
  ctx.STATE.scores = orig;
});

test('returns screenshot string from object entry', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = { d1: { 1: { val: 3, screenshot: 'data:img' } } };
  assert.strictEqual(ctx.getScoreScreenshot('d1', 1), 'data:img');
  ctx.STATE.scores = orig;
});

test('returns null for a plain number entry (legacy)', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = { d1: { 1: 4 } };
  assert.strictEqual(ctx.getScoreScreenshot('d1', 1), null);
  ctx.STATE.scores = orig;
});

/* ── getScoreNote ──────────────────────────────────────────── */

section('benchmark.js — getScoreNote');

test('returns empty string when no note exists', function () {
  var orig = ctx.STATE.notas;
  ctx.STATE.notas = {};
  assert.strictEqual(ctx.getScoreNote('d1', 1), '');
  ctx.STATE.notas = orig;
});

test('returns note string when it exists', function () {
  var orig = ctx.STATE.notas;
  ctx.STATE.notas = { d1: { 1: 'una nota de calidad' } };
  assert.strictEqual(ctx.getScoreNote('d1', 1), 'una nota de calidad');
  ctx.STATE.notas = orig;
});

/* ── countEvidenceForProduct ───────────────────────────────── */

section('benchmark.js — countEvidenceForProduct');

test('returns 0 when no screenshots exist', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = {};
  assert.strictEqual(ctx.countEvidenceForProduct(1), 0);
  ctx.STATE.scores = orig;
});

test('counts only entries with non-null screenshots', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = {
    d1: { 1: { val: 3, screenshot: 'img-data' } },
    d2: { 1: { val: 4, screenshot: null } },
    d3: { 1: { val: 5, screenshot: 'img-data-2' } }
  };
  assert.strictEqual(ctx.countEvidenceForProduct(1), 2);
  ctx.STATE.scores = orig;
});

/* ── countLowScoresForProduct ──────────────────────────────── */

section('benchmark.js — countLowScoresForProduct');

test('returns 0 when no scores exist', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = {};
  assert.strictEqual(ctx.countLowScoresForProduct(1, 2), 0);
  ctx.STATE.scores = orig;
});

test('counts scores that are > 0 and <= threshold', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = {
    d1: { 1: 1 },
    d2: { 1: 2 },
    d3: { 1: 3 },
    d4: { 1: 4 }
  };
  assert.strictEqual(ctx.countLowScoresForProduct(1, 2), 2);
  ctx.STATE.scores = orig;
});

test('ignores scores of 0 (unscored dimensions)', function () {
  var orig = ctx.STATE.scores;
  ctx.STATE.scores = { d1: { 1: 0 } };
  assert.strictEqual(ctx.countLowScoresForProduct(1, 3), 0);
  ctx.STATE.scores = orig;
});

/* ── scoreClass ────────────────────────────────────────────── */

section('benchmark.js — scoreClass');

test('returns "hi" for score >= 4', function () {
  assert.strictEqual(ctx.scoreClass(4), 'hi');
  assert.strictEqual(ctx.scoreClass(5), 'hi');
});

test('returns "md" for score >= 3 and < 4', function () {
  assert.strictEqual(ctx.scoreClass(3), 'md');
  assert.strictEqual(ctx.scoreClass(3.9), 'md');
});

test('returns "lo" for score < 3', function () {
  assert.strictEqual(ctx.scoreClass(1), 'lo');
  assert.strictEqual(ctx.scoreClass(2), 'lo');
  assert.strictEqual(ctx.scoreClass(0), 'lo');
});

/* ── summarizeSession ──────────────────────────────────────── */

section('benchmark.js — summarizeSession');

test('returns correct product count', function () {
  var session = {
    productos:   [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }],
    dimensiones: [{ id: 'd1' }, { id: 'd2' }],
    scores:      {}
  };
  assert.strictEqual(ctx.summarizeSession(session).productos, 2);
});

test('returns correct dimension count', function () {
  var session = {
    productos:   [{ id: 1, nombre: 'A' }],
    dimensiones: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
    scores:      {}
  };
  assert.strictEqual(ctx.summarizeSession(session).dimensiones, 3);
});

test('computes maxScore as dimensions x 5', function () {
  var session = {
    productos:   [{ id: 1, nombre: 'A' }],
    dimensiones: [{ id: 'd1' }, { id: 'd2' }],
    scores:      {}
  };
  assert.strictEqual(ctx.summarizeSession(session).maxScore, 10);
});

test('identifies the leader by highest total score', function () {
  var session = {
    productos:   [{ id: 1, nombre: 'ProductoA' }, { id: 2, nombre: 'ProductoB' }],
    dimensiones: [{ id: 'd1' }],
    scores:      { d1: { 1: 3, 2: 5 } }
  };
  var summary = ctx.summarizeSession(session);
  assert.strictEqual(summary.leaderName, 'ProductoB');
  assert.strictEqual(summary.leaderTotal, 5);
});

test('returns "Sin datos" when no named products', function () {
  var session = {
    productos:   [{ id: 1, nombre: '' }],
    dimensiones: [{ id: 'd1' }],
    scores:      {}
  };
  assert.strictEqual(ctx.summarizeSession(session).leaderName, 'Sin datos');
});

test('leaderAverage is formatted to exactly 1 decimal place', function () {
  var session = {
    productos:   [{ id: 1, nombre: 'A' }],
    dimensiones: [{ id: 'd1' }, { id: 'd2' }],
    scores:      { d1: { 1: 4 }, d2: { 1: 3 } }
  };
  assert.ok(/^\d+\.\d$/.test(ctx.summarizeSession(session).leaderAverage));
});

/* ══════════════════════════════════════════════════════════════ */
/*  DASHBOARD.JS                                                  */
/* ══════════════════════════════════════════════════════════════ */

section('dashboard.js — summarizeBenchmarkSession');

test('uses session.nombre as title', function () {
  var s = { nombre: 'Mi Benchmark', dimensiones: [], productos: [], scores: {}, id: 1, fecha: '01/01/2026' };
  assert.strictEqual(ctx.summarizeBenchmarkSession(s).title, 'Mi Benchmark');
});

test('falls back to "Benchmark sin titulo" when nombre is missing', function () {
  var s = { dimensiones: [], productos: [], scores: {}, id: 1, fecha: '01/01/2026' };
  assert.strictEqual(ctx.summarizeBenchmarkSession(s).title, 'Benchmark sin t\u00edtulo');
});

test('href always points to benchmark.html', function () {
  var s = { nombre: 'T', dimensiones: [], productos: [], scores: {}, id: 1 };
  assert.strictEqual(ctx.summarizeBenchmarkSession(s).href, 'benchmark.html');
});

test('type is "bm"', function () {
  var s = { nombre: 'T', dimensiones: [], productos: [], scores: {}, id: 1 };
  assert.strictEqual(ctx.summarizeBenchmarkSession(s).type, 'bm');
});

test('subtitle includes analista name', function () {
  var s = { nombre: 'T', analista: 'Ana Garc\u00eda', dimensiones: [], productos: [], scores: {}, id: 1 };
  assert.ok(ctx.summarizeBenchmarkSession(s).subtitle.indexOf('Ana Garc\u00eda') !== -1);
});

test('ts equals session.id', function () {
  var s = { nombre: 'T', dimensiones: [], productos: [], scores: {}, id: 9999, fecha: '' };
  assert.strictEqual(ctx.summarizeBenchmarkSession(s).ts, 9999);
});

/* ── summarizeUxflowSession ────────────────────────────────── */

section('dashboard.js — summarizeUxflowSession');

test('uses session.titulo as title', function () {
  var s = { titulo: 'Mi UXFlow', id: 1, fecha: '01/01/2026', flow: { steps: [], edgeCases: [] } };
  assert.strictEqual(ctx.summarizeUxflowSession(s).title, 'Mi UXFlow');
});

test('falls back to "Documento UXFlow" when titulo is missing', function () {
  var s = { id: 1, fecha: '01/01/2026', flow: {} };
  assert.strictEqual(ctx.summarizeUxflowSession(s).title, 'Documento UXFlow');
});

test('href always points to uxflow.html', function () {
  var s = { titulo: 'T', id: 1, flow: {} };
  assert.strictEqual(ctx.summarizeUxflowSession(s).href, 'uxflow.html');
});

test('type is "uxf"', function () {
  var s = { titulo: 'T', id: 1, flow: {} };
  assert.strictEqual(ctx.summarizeUxflowSession(s).type, 'uxf');
});

test('score string includes step count when steps exist', function () {
  var s = { titulo: 'T', id: 1, flow: { steps: ['a', 'b', 'c'], edgeCases: [] } };
  assert.ok(ctx.summarizeUxflowSession(s).score.indexOf('3') !== -1);
});

test('meta string includes edge case count when edge cases exist', function () {
  var s = { titulo: 'T', id: 1, flow: { steps: ['a'], edgeCases: ['e1', 'e2'] } };
  assert.ok(ctx.summarizeUxflowSession(s).meta.indexOf('2') !== -1);
});

test('ts equals session.id', function () {
  var s = { titulo: 'T', id: 8888, flow: {} };
  assert.strictEqual(ctx.summarizeUxflowSession(s).ts, 8888);
});

/* ══════════════════════════════════════════════════════════════ */
/*  RESULT SUMMARY                                               */
/* ══════════════════════════════════════════════════════════════ */

process.stdout.write('\n──────────────────────────────────────────────────────\n');

if (failed === 0) {
  process.stdout.write('\u2713 All ' + passed + ' tests passed.\n');
} else {
  process.stderr.write('\u2717 ' + failed + ' test(s) failed \u00b7 ' + passed + ' passed.\n');
  process.exit(1);
}
