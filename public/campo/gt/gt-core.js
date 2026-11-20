/* Campo · Teoría fundamentada · funciones puras (sin DOM, sin red).
   Se carga en el navegador (globalThis.GTCore) y en Node (tests/unit.cjs vía vm).
   Nada de esto sube datos: todo corre en el teléfono o el computador. */
(function (root) {
  "use strict";

  // ── CSV (RFC 4180: comillas, comas y saltos de línea dentro de comillas) ──
  function parseCSV(text) {
    var s = String(text || "").replace(/^\uFEFF/, "");
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && s[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (v) { return String(v).trim() !== ""; }); });
    if (!rows.length) return { headers: [], rows: [] };
    var headers = rows[0].map(function (h) { return String(h).trim(); });
    var out = rows.slice(1).map(function (r) {
      var o = {}; headers.forEach(function (h, j) { o[h] = r[j] == null ? "" : String(r[j]).trim(); }); return o;
    });
    return { headers: headers, rows: out };
  }

  function csvCell(v) {
    var t = v == null ? "" : String(v);
    return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function toCSV(headers, rows) {
    return [headers.map(csvCell).join(",")].concat(rows.map(function (r) {
      return (Array.isArray(r) ? r : headers.map(function (h) { return r[h]; })).map(csvCell).join(",");
    })).join("\n");
  }

  // ── Datos personales ──
  var PII_HEADER = /(\bnombre|\bname\b|apellido|correo|e-?mail|tel[eé]fono|celular|m[oó]vil|phone|whats?app|\brut\b|\bdni\b|pasaporte|direcci[oó]n|domicilio|datos de contacto|\bcontacto\b|instagram|linkedin|marca temporal|timestamp)/i;
  var PII_VALUE = [
    { re: /[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}/i, why: "correo" },
    { re: /(\+?56\s?)?(9\s?\d{4}\s?\d{4})\b/, why: "teléfono" },
    { re: /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/, why: "RUT" }
  ];
  function valueHasPII(v) {
    for (var i = 0; i < PII_VALUE.length; i++) if (PII_VALUE[i].re.test(String(v || ""))) return PII_VALUE[i].why;
    return "";
  }
  function detectPII(headers, rows) {
    var dropped = [];
    headers.forEach(function (h) {
      if (PII_HEADER.test(h)) { dropped.push({ field: h, why: "nombre de columna" }); return; }
      for (var i = 0; i < rows.length; i++) {
        var w = valueHasPII(rows[i][h]);
        if (w) { dropped.push({ field: h, why: "contiene " + w }); return; }
      }
    });
    return dropped;
  }
  function redactText(text) {
    var t = String(text || "");
    PII_VALUE.forEach(function (p) { t = t.replace(new RegExp(p.re.source, "gi"), "[quitado]"); });
    return t;
  }
  function pad(n) { return ("00" + n).slice(-3); }
  /** Quita columnas con datos personales y asigna IDs R-001… Devuelve solo lo seguro. */
  function sanitize(parsed, opts) {
    var includeFree = !!(opts && opts.includeFreeText);
    var dropped = detectPII(parsed.headers, parsed.rows);
    var gone = {}; dropped.forEach(function (d) { gone[d.field] = 1; });
    var freeText = parsed.headers.filter(function (h) { return !gone[h] && h !== "id" && isFreeText(parsed.rows, h); });
    if (!includeFree) freeText.forEach(function (h) { gone[h] = 1; });
    var fields = parsed.headers.filter(function (h) { return !gone[h] && h !== "id"; });
    var records = parsed.rows.map(function (r, i) {
      var o = { id: "R-" + pad(i + 1) }; fields.forEach(function (f) { o[f] = r[f]; }); return o;
    });
    return { fields: fields, dropped: dropped, freeText: freeText, freeTextIncluded: includeFree, records: records };
  }

  // ── Segmentos y cruces ──
  function findField(fields, pattern) {
    if (!pattern) return "";
    if (fields.indexOf(pattern) >= 0) return pattern;
    var re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    for (var i = 0; i < fields.length; i++) if (re.test(fields[i])) return fields[i];
    return "";
  }
  function answered(v) { return v != null && String(v).trim() !== ""; }
  function test1(rec, c) {
    var v = rec[c.field] == null ? "" : String(rec[c.field]);
    var vals = Array.isArray(c.value) ? c.value : [c.value];
    switch (c.op) {
      case "answered": return answered(v);
      case "eq": return v === String(c.value);
      case "in": return vals.indexOf(v) >= 0;
      case "notIn": return answered(v) && vals.indexOf(v) < 0;
      // «incluye la opción»: compara opciones completas (multiselección «, » o «;»), nunca fragmentos.
      case "contains": { var opts = parseMulti(v); return vals.some(function (x) { return opts.indexOf(String(x).trim()) >= 0; }); }
      // Búsqueda de texto explícita (solo si se pide así en la UI).
      case "textIncludes": return vals.some(function (x) { return v.toLowerCase().indexOf(String(x).toLowerCase()) >= 0; });
      default: return false;
    }
  }
  function filter(records, conditions) {
    return records.filter(function (r) { return (conditions || []).every(function (c) { return test1(r, c); }); });
  }
  function pct(n, total) { return total ? Math.round((n / total) * 1000) / 10 : 0; }
  /** n del segmento sobre una base (por defecto todas las filas; con baseField, solo quienes respondieron). */
  function segment(records, conditions, baseField) {
    var base = baseField ? records.filter(function (r) { return answered(r[baseField]); }) : records;
    var n = filter(base, conditions).length;
    return { n: n, total: base.length, pct: pct(n, base.length) };
  }
  /** Separa una respuesta de multiselección en opciones completas.
      Separadores: «;» y «, » (Google Forms). No corta dentro de paréntesis:
      «QR de la app de un banco (BancoEstado, Santander u otro)» queda entera. */
  function parseMulti(v) {
    var s = String(v == null ? "" : v), out = [], cur = "", depth = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === "(") depth++;
      else if (c === ")" && depth > 0) depth--;
      if (depth === 0 && (c === ";" || (c === "," && s[i + 1] === " "))) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    var seen = {};
    return out.map(function (x) { return x.trim(); }).filter(function (x) { if (!x || seen[x]) return false; seen[x] = 1; return true; });
  }
  function splitOptions(v, multi) {
    if (!answered(v)) return [];
    if (!multi) return [String(v)];
    var opts = parseMulti(v);
    if (Array.isArray(multi)) return multi.filter(function (o) { return opts.indexOf(o) >= 0; });
    return opts;
  }
  /** Opciones distintas de un campo (para elegir valores exactos en la UI). */
  function optionsOf(records, field, multi) {
    var seen = {}, out = [];
    records.forEach(function (r) { splitOptions(r[field], multi === undefined ? true : multi).forEach(function (o) { if (!seen[o]) { seen[o] = 1; out.push(o); } }); });
    return out.sort();
  }
  /** Texto libre: muchas respuestas distintas y largas. Puede traer nombres. */
  /** Copia del estado apta para guardar/exportar: sin columnas de texto libre (solo viven en memoria). */
  function persistable(state) {
    var drop = {}; (state.freeTextIncluded ? state.freeText || [] : []).forEach(function (f) { drop[f] = 1; });
    var out = {}; Object.keys(state).forEach(function (k) { out[k] = state[k]; });
    out.fields = (state.fields || []).filter(function (f) { return !drop[f]; });
    out.records = (state.records || []).map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { if (!drop[k]) o[k] = r[k]; }); return o; });
    out.freeTextIncluded = false;
    return out;
  }
  function isFreeText(records, field) {
    var vals = records.map(function (r) { return r[field]; }).filter(answered);
    if (vals.length < 3) return false;
    var distinct = {}; var len = 0;
    vals.forEach(function (v) { distinct[v] = 1; len += String(v).length; });
    return Object.keys(distinct).length / vals.length >= 0.8 && len / vals.length >= 15;
  }
  /** Frecuencias. multi: false | true (opciones completas, «, » o «;») | lista de opciones exactas. % sobre quienes respondieron. */
  function frequencies(records, field, multi) {
    var base = records.filter(function (r) { return answered(r[field]); });
    var counts = {};
    base.forEach(function (r) { splitOptions(r[field], multi).forEach(function (o) { counts[o] = (counts[o] || 0) + 1; }); });
    return Object.keys(counts).map(function (k) { return { label: k, n: counts[k], pct: pct(counts[k], base.length) }; })
      .sort(function (a, b) { return b.n - a.n || (a.label < b.label ? -1 : 1); })
      .map(function (x) { x.total = base.length; return x; });
  }
  /** Cruce fila × columna con n y % por fila. Base: quien respondió ambas. */
  function crosstab(records, rowField, colField) {
    var base = records.filter(function (r) { return answered(r[rowField]) && answered(r[colField]); });
    var rows = [], cols = [], cell = {};
    base.forEach(function (r) {
      var a = String(r[rowField]), b = String(r[colField]);
      if (rows.indexOf(a) < 0) rows.push(a);
      if (cols.indexOf(b) < 0) cols.push(b);
      var k = a + "\u0000" + b; cell[k] = (cell[k] || 0) + 1;
    });
    rows.sort(); cols.sort();
    var table = rows.map(function (a) {
      var total = 0; var cells = cols.map(function (b) { var n = cell[a + "\u0000" + b] || 0; total += n; return n; });
      return { row: a, total: total, cells: cells.map(function (n) { return { n: n, pct: pct(n, total) }; }) };
    });
    return { rowField: rowField, colField: colField, cols: cols, rows: table, total: base.length };
  }
  function crosstabCSV(ct) {
    var h = [ct.rowField + " \\ " + ct.colField].concat(ct.cols.reduce(function (a, c) { return a.concat([c + " (n)", c + " (%)"]); }, [])).concat(["Total (n)"]);
    return toCSV(h, ct.rows.map(function (r) {
      return [r.row].concat(r.cells.reduce(function (a, c) { return a.concat([c.n, c.pct]); }, [])).concat([r.total]);
    }));
  }

  // ── Referencias FRUTA (definiciones, no datos) ──
  var UNDER_55 = ["18 a 24", "25 a 30", "31 a 40", "41 a 55", "Menos de 18"];
  var REFERENCES = [
    { id: "A", label: "Paga con QR y tiene menos de 55", expected: { n: 17 },
      conditions: [{ field: "con qué pagas", op: "contains", value: ["QR de la app Red", "QR de la app de un banco (BancoEstado, Santander u otro)"] }, { field: "qué edad", op: "in", value: UNDER_55 }] },
    { id: "B", label: "Bip! como medio principal", expected: { n: 9 },
      conditions: [{ field: "con qué pagas", op: "contains", value: "Tarjeta bip!" }] },
    { id: "S", label: "Le faltó saldo al validar (último mes)", expected: { n: 23, total: 37 }, baseField: "no te alcanzó el saldo",
      conditions: [{ field: "no te alcanzó el saldo", op: "in", value: ["1 o 2 veces", "3 o más veces"] }] }
  ];
  /** Resuelve los nombres de campo (busca por fragmento) y calcula n, base y %. */
  function runReference(records, fields, ref) {
    var conds = ref.conditions.map(function (c) { return { field: findField(fields, c.field), op: c.op, value: c.value }; });
    var missing = conds.filter(function (c) { return !c.field; }).length > 0;
    var baseField = ref.baseField ? findField(fields, ref.baseField) : "";
    if (missing || (ref.baseField && !baseField)) return { id: ref.id, label: ref.label, missing: true };
    var r = segment(records, conds, baseField);
    r.id = ref.id; r.label = ref.label; r.expected = ref.expected;
    r.matches = r.n === ref.expected.n && (ref.expected.total == null || r.total === ref.expected.total);
    return r;
  }

  // ── Gráfico SVG accesible ──
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function barChartSVG(opts) {
    var data = opts.data || [], id = opts.id || "gt-chart", W = 640, rowH = 34, left = 230, top = 56;
    var H = top + data.length * rowH + 24, max = Math.max.apply(null, data.map(function (d) { return d.pct; }).concat([1]));
    var bars = data.map(function (d, i) {
      var y = top + i * rowH, w = Math.round(((W - left - 90) * d.pct) / max);
      var label = d.label.length > 34 ? d.label.slice(0, 33) + "…" : d.label;
      return '<g><text x="' + (left - 8) + '" y="' + (y + 21) + '" text-anchor="end" font-size="14" fill="#0d1b3d">' + esc(label) + "</text>" +
        '<rect x="' + left + '" y="' + (y + 6) + '" width="' + w + '" height="22" rx="4" fill="#FF931E"/>' +
        '<text x="' + (left + w + 8) + '" y="' + (y + 22) + '" font-size="14" fill="#0d1b3d">' + d.pct + "% (n=" + d.n + ")</text></g>";
    }).join("");
    var desc = opts.desc || data.map(function (d) { return d.label + ": " + d.n + " (" + d.pct + "%)"; }).join("; ");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-labelledby="' + id + '-t ' + id + '-d">' +
      '<title id="' + id + '-t">' + esc(opts.title || "") + '</title><desc id="' + id + '-d">' + esc(desc) + "</desc>" +
      '<rect width="100%" height="100%" fill="#f7f2e7"/>' +
      '<text x="16" y="32" font-size="18" font-weight="700" fill="#0d1b3d">' + esc(opts.title || "") + "</text>" + bars + "</svg>";
  }

  var api = { parseCSV: parseCSV, toCSV: toCSV, detectPII: detectPII, redactText: redactText, valueHasPII: valueHasPII, sanitize: sanitize,
    findField: findField, filter: filter, segment: segment, pct: pct, frequencies: frequencies, parseMulti: parseMulti, optionsOf: optionsOf, isFreeText: isFreeText, persistable: persistable, crosstab: crosstab, crosstabCSV: crosstabCSV,
    REFERENCES: REFERENCES, runReference: runReference, barChartSVG: barChartSVG, esc: esc };
  root.GTCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
