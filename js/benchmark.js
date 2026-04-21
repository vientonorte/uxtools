/* ─── DIMENSIONES PREDEFINIDAS ──────────────────────────────── */
var DIMENSIONES = [
  { id: 'd1', nombre: 'Primera Impresión',    desc: 'Onboarding, hero y percepción inicial' },
  { id: 'd2', nombre: 'Navegación',           desc: 'Arquitectura de información y menús' },
  { id: 'd3', nombre: 'Usabilidad',           desc: 'Facilidad de uso y eficiencia en tareas' },
  { id: 'd4', nombre: 'Diseño Visual',        desc: 'Jerarquía, tipografía y consistencia' },
  { id: 'd5', nombre: 'Accesibilidad',        desc: 'Contraste, foco y compatibilidad WCAG' },
  { id: 'd6', nombre: 'Performance',          desc: 'Velocidad y respuesta de la interfaz' },
  { id: 'd7', nombre: 'Experiencia Mobile',   desc: 'Adaptación responsiva y gestos táctiles' },
  { id: 'd8', nombre: 'Conversión',           desc: 'CTA, formularios y rutas clave de negocio' }
];

var COLORES = ['#00B5E2', '#0033A0', '#3DBA6F', '#FF8C00', '#9B59B6'];

/* ─── ESTADO ─────────────────────────────────────────────────── */
var STATE = {
  paso:      1,
  config:    { nombre: '', analista: '' },
  productos: [
    { id: 1, nombre: 'SURA Investments' },
    { id: 2, nombre: '' }
  ],
  scores:    {},
  historial: []
};

var _nextId = 3;

/* ─── PERSISTENCIA ───────────────────────────────────────────── */
var STORAGE_KEY = 'uxbenchmark-state';

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      STATE = parsed;
      if (STATE.productos && STATE.productos.length) {
        _nextId = Math.max.apply(null, STATE.productos.map(function(p) { return p.id; })) + 1;
      }
    }
  } catch (e) { console.error('[UXBenchmark] Failed to restore saved state:', e); }
}

function saveState() {
  collectFormValues();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    setSaveStatus('saved');
  } catch (e) {
    /* Storage may be unavailable (private browsing, quota exceeded) */
    console.warn('[UXBenchmark] Auto-save unavailable:', e);
    setSaveStatus('unsaved');
  }
}

function autoSave() {
  collectFormValues();
  saveState();
}

function setSaveStatus(status) {
  var el = document.getElementById('save-status');
  if (!el) return;
  if (status === 'saved') {
    el.textContent = '● Auto-guardado';
    el.className = 'nav-save-status';
  } else {
    el.textContent = '○ Sin guardar';
    el.className = 'nav-save-status unsaved';
  }
}

/* ─── RECOLECCIÓN DE VALORES ─────────────────────────────────── */
function collectFormValues() {
  var nomEl = document.getElementById('bm-nombre');
  var anaEl = document.getElementById('bm-analista');
  if (nomEl) STATE.config.nombre   = nomEl.value;
  if (anaEl) STATE.config.analista = anaEl.value;

  STATE.productos.forEach(function(p) {
    var inp = document.getElementById('prod-' + p.id);
    if (inp) p.nombre = inp.value;
  });

  DIMENSIONES.forEach(function(d) {
    if (!STATE.scores[d.id]) STATE.scores[d.id] = {};
    STATE.productos.forEach(function(p) {
      var inp = document.getElementById('score-' + d.id + '-' + p.id);
      if (inp) {
        var val = parseInt(inp.value, 10);
        STATE.scores[d.id][p.id] = isNaN(val) ? 0 : Math.min(10, Math.max(0, val));
      }
    });
  });
}

/* ─── UTILIDADES ─────────────────────────────────────────────── */
function escapeHTML(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}

function fechaHoy() {
  return new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function scoreClass(s) {
  if (s >= 7) return 'hi';
  if (s >= 5) return 'md';
  return 'lo';
}

function scoreInputClass(s) {
  if (s >= 7) return 'score-input score-high';
  if (s >= 4) return 'score-input score-mid';
  return 'score-input score-low';
}

/* ─── NAVEGACIÓN DE PASOS ────────────────────────────────────── */
function irAPaso(n) {
  collectFormValues();
  if (n === 2) renderEval();
  if (n === 3) renderResults();

  STATE.paso = n;
  saveState();

  [1, 2, 3].forEach(function(i) {
    var nav = document.getElementById('step-nav-' + i);
    if (!nav) return;
    nav.classList.toggle('active', i === n);
    if (i < n) nav.classList.add('done');
    else nav.classList.remove('done');
  });

  [1, 2, 3].forEach(function(i) {
    var panel = document.getElementById('panel-step-' + i);
    if (panel) panel.classList.toggle('hidden', i !== n);
  });

  var labels = ['Configuración', 'Evaluación', 'Resultados'];
  var labelEl = document.getElementById('canvas-step-label');
  if (labelEl) labelEl.textContent = 'Paso ' + n + ' de 3 — ' + labels[n - 1];

  var btn = document.getElementById('btn-next');
  if (btn) {
    btn.textContent = n < 3 ? 'Siguiente →' : 'Ver resultados ✓';
    btn.disabled    = n === 3;
  }
}

function avanzarPaso() {
  if (STATE.paso < 3) irAPaso(STATE.paso + 1);
}

/* ─── PASO 1: CONFIGURACIÓN ──────────────────────────────────── */
function renderConfig() {
  var nomEl = document.getElementById('bm-nombre');
  var anaEl = document.getElementById('bm-analista');
  if (nomEl) nomEl.value = STATE.config.nombre   || '';
  if (anaEl) anaEl.value = STATE.config.analista || '';

  renderProductos();
  renderDimensionsPreview();

  ['bm-nombre', 'bm-analista'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', autoSave);
  });
}

function renderDimensionsPreview() {
  var container = document.getElementById('dimensions-preview');
  if (!container) return;
  container.innerHTML = DIMENSIONES.map(function(d) {
    return '<div class="dim-chip">' +
      '<div class="dim-chip-name">' + escapeHTML(d.nombre) + '</div>' +
      '<div class="dim-chip-desc">'  + escapeHTML(d.desc)   + '</div>' +
      '</div>';
  }).join('');
}

function renderProductos() {
  var grid = document.getElementById('productos-grid');
  if (!grid) return;

  grid.innerHTML = STATE.productos.map(function(p, i) {
    var removeBtn = STATE.productos.length > 2
      ? '<button class="btn-remove-product" onclick="eliminarProducto(' + p.id + ')" title="Eliminar producto" aria-label="Eliminar producto">×</button>'
      : '';
    return '<div class="producto-row">' +
      '<span class="producto-num">' + (i + 1) + '</span>' +
      '<input type="text" id="prod-' + p.id + '" placeholder="Nombre del producto" value="' + escapeHTML(p.nombre) + '" autocomplete="off">' +
      removeBtn +
      '</div>';
  }).join('');

  STATE.productos.forEach(function(p) {
    var inp = document.getElementById('prod-' + p.id);
    if (inp) inp.addEventListener('input', autoSave);
  });

  var btnAdd = document.getElementById('btn-add-product');
  if (btnAdd) btnAdd.disabled = STATE.productos.length >= 5;
}

function agregarProducto() {
  if (STATE.productos.length >= 5) return;
  STATE.productos.push({ id: _nextId++, nombre: '' });
  renderProductos();
  autoSave();
}

function eliminarProducto(id) {
  if (STATE.productos.length <= 2) return;
  STATE.productos = STATE.productos.filter(function(p) { return p.id !== id; });
  renderProductos();
  autoSave();
}

/* ─── PASO 2: EVALUACIÓN ─────────────────────────────────────── */
function renderEval() {
  collectFormValues();
  var body = document.getElementById('eval-body');
  if (!body) return;

  var productos = STATE.productos.filter(function(p) { return p.nombre.trim(); });
  if (!productos.length) {
    body.innerHTML = '<p style="color:#8E99B0;font-style:italic;padding:16px 0;">Agrega al menos un producto con nombre en el paso 1.</p>';
    return;
  }

  var html = '<div class="eval-table-wrap"><table class="eval-table"><thead><tr><th class="dim-col">Dimensión</th>';
  productos.forEach(function(p) {
    html += '<th class="prod-col">' + escapeHTML(p.nombre) + '</th>';
  });
  html += '</tr></thead><tbody>';

  DIMENSIONES.forEach(function(d) {
    html += '<tr><td><div class="dim-cell-name">' + escapeHTML(d.nombre) + '</div>' +
            '<div class="dim-cell-desc">' + escapeHTML(d.desc) + '</div></td>';
    productos.forEach(function(p) {
      var stored = STATE.scores[d.id] && STATE.scores[d.id][p.id] !== undefined
        ? STATE.scores[d.id][p.id]
        : '';
      var cls = stored !== '' ? scoreInputClass(stored) : 'score-input';
      html += '<td class="score-cell">' +
        '<input type="number" id="score-' + d.id + '-' + p.id + '" class="' + cls + '"' +
        ' min="0" max="10" value="' + (stored !== '' ? stored : '') + '" placeholder="—"' +
        ' oninput="onScoreInput(this)" aria-label="' + escapeHTML(d.nombre) + ' — ' + escapeHTML(p.nombre) + '">' +
        '</td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  body.innerHTML = html;
}

function onScoreInput(inp) {
  var val = parseInt(inp.value, 10);
  if (!isNaN(val)) {
    val = Math.min(10, Math.max(0, val));
    inp.value = val;
    inp.className = scoreInputClass(val);
  } else {
    inp.className = 'score-input';
  }
  autoSave();
}

/* ─── PASO 3: RESULTADOS ─────────────────────────────────────── */
function renderResults() {
  collectFormValues();
  var area = document.getElementById('result-area');
  if (!area) return;

  var productos = STATE.productos.filter(function(p) { return p.nombre.trim(); });
  if (!productos.length) {
    area.innerHTML = '<div class="step-card"><div class="step-card-body">' +
      '<p style="color:#8E99B0;font-style:italic;">Configura productos en el paso 1 y puntúa en el paso 2 antes de ver resultados.</p>' +
      '</div></div>';
    return;
  }

  var totales = {};
  productos.forEach(function(p) {
    var sum = 0;
    DIMENSIONES.forEach(function(d) {
      sum += (STATE.scores[d.id] && STATE.scores[d.id][p.id]) ? STATE.scores[d.id][p.id] : 0;
    });
    totales[p.id] = sum;
  });

  var maxTotal = Math.max.apply(null, productos.map(function(p) { return totales[p.id]; }));
  var winner   = productos.find(function(p) { return totales[p.id] === maxTotal; }) || productos[0];
  var maxScore = DIMENSIONES.length * 10;
  var bmNombre = STATE.config.nombre || 'UX Benchmark';
  var fecha    = fechaHoy();

  var html = '<div class="result-card">';

  /* Header */
  html += '<div class="result-header">';
  html += '<div><div class="result-title">' + escapeHTML(bmNombre) + '</div>';
  html += '<div class="result-subtitle">Resultados comparativos</div></div>';
  html += '<div class="result-meta">';
  if (STATE.config.analista) html += 'Analista: ' + escapeHTML(STATE.config.analista) + '<br>';
  html += 'Fecha: ' + escapeHTML(fecha) + '<br>';
  html += productos.length + ' productos · ' + DIMENSIONES.length + ' dimensiones';
  html += '</div></div>';

  /* Body */
  html += '<div class="result-body">';

  /* Winner banner */
  html += '<div class="winner-banner">';
  html += '<div class="winner-icon">🏆</div>';
  html += '<div><div class="winner-label">Mejor puntuación</div>';
  html += '<div class="winner-name">' + escapeHTML(winner.nombre) + '</div></div>';
  html += '<div class="winner-score">' + totales[winner.id] +
    '<span style="font-size:14px;font-weight:400;color:#8E99B0;">/' + maxScore + '</span></div>';
  html += '</div>';

  /* Table */
  html += '<table class="result-table"><thead><tr><th class="dim-h">Dimensión</th>';
  productos.forEach(function(p) {
    html += '<th>' + escapeHTML(p.nombre) + '</th>';
  });
  html += '</tr></thead><tbody>';

  DIMENSIONES.forEach(function(d) {
    html += '<tr><td class="dim-n">' + escapeHTML(d.nombre) + '</td>';
    productos.forEach(function(p) {
      var s  = (STATE.scores[d.id] && STATE.scores[d.id][p.id] !== undefined) ? STATE.scores[d.id][p.id] : 0;
      var isBest = totales[p.id] === maxTotal;
      var badgeCls = isBest ? 'score-badge best' : 'score-badge ' + scoreClass(s);
      html += '<td><span class="' + badgeCls + '">' + s + '</span></td>';
    });
    html += '</tr>';
  });

  /* Totals row */
  html += '<tr class="total-row"><td class="dim-n">Total</td>';
  productos.forEach(function(p) {
    var isBest   = totales[p.id] === maxTotal;
    var badgeCls = isBest ? 'score-badge best' : 'score-badge ' + scoreClass(totales[p.id] / DIMENSIONES.length);
    html += '<td><span class="' + badgeCls + '">' + totales[p.id] + '</span></td>';
  });
  html += '</tr></tbody></table>';

  /* Bar chart */
  html += '<div class="bars-section"><div class="bars-label">Puntuación total por producto</div>';
  productos.forEach(function(p, i) {
    var pct   = Math.round((totales[p.id] / maxScore) * 100);
    var color = COLORES[i % COLORES.length];
    html += '<div class="bar-row">';
    html += '<div class="bar-row-label">' + escapeHTML(p.nombre) + '</div>';
    html += '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    html += '<div class="bar-value">' + totales[p.id] + '</div>';
    html += '</div>';
  });
  html += '</div>';

  /* Export row */
  html += '<div class="export-row">';
  html += '<button class="btn-result-action primary" onclick="exportarResultados()">📋 Exportar resultados</button>';
  html += '<button class="btn-result-action ghost" onclick="guardarSesion()">💾 Guardar sesión</button>';
  html += '<button class="btn-result-action ghost" onclick="irAPaso(2)">← Volver a evaluar</button>';
  html += '</div>';

  html += '</div>'; /* result-body */
  html += '<div class="result-footer">SURA Investments · UX Benchmark · ' + new Date().getFullYear() + '</div>';
  html += '</div>'; /* result-card */

  area.innerHTML = html;
}

/* ─── EXPORTAR ───────────────────────────────────────────────── */
function exportarResultados() {
  collectFormValues();
  var productos = STATE.productos.filter(function(p) { return p.nombre.trim(); });
  var bmNombre  = STATE.config.nombre || 'UX Benchmark';
  var maxScore  = DIMENSIONES.length * 10;
  var lines     = [];

  lines.push('UX BENCHMARK EXPORT');
  lines.push('══════════════════════════════════════');
  lines.push('Benchmark: ' + bmNombre);
  if (STATE.config.analista) lines.push('Analista:  ' + STATE.config.analista);
  lines.push('Fecha:     ' + fechaHoy());
  lines.push('Productos: ' + productos.map(function(p) { return p.nombre; }).join(', '));
  lines.push('');

  var COL = 14;
  var ROW = 24;
  var header = 'Dimensión'.padEnd(ROW);
  productos.forEach(function(p) {
    header += p.nombre.substring(0, COL - 2).padEnd(COL);
  });
  lines.push(header);
  lines.push('─'.repeat(ROW + COL * productos.length));

  DIMENSIONES.forEach(function(d) {
    var row = d.nombre.padEnd(ROW);
    productos.forEach(function(p) {
      var s = (STATE.scores[d.id] && STATE.scores[d.id][p.id] !== undefined)
        ? STATE.scores[d.id][p.id] : 0;
      row += (s + '/10').padEnd(COL);
    });
    lines.push(row);
  });

  lines.push('─'.repeat(ROW + COL * productos.length));
  var totalRow = 'TOTAL'.padEnd(ROW);
  productos.forEach(function(p) {
    var sum = DIMENSIONES.reduce(function(acc, d) {
      return acc + ((STATE.scores[d.id] && STATE.scores[d.id][p.id]) ? STATE.scores[d.id][p.id] : 0);
    }, 0);
    totalRow += (sum + '/' + maxScore).padEnd(COL);
  });
  lines.push(totalRow);
  lines.push('');
  lines.push('Generado con vientonorte/uxtools · UX Benchmark');

  navigator.clipboard.writeText(lines.join('\n'))
    .then(function()  { showToast('📋 Resultados copiados al portapapeles'); })
    .catch(function() { showToast('⚠ No se pudo copiar. Selecciona el texto manualmente.'); });
}

/* ─── HISTORIAL DE SESIONES ──────────────────────────────────── */
function guardarSesion() {
  collectFormValues();
  var nombre = STATE.config.nombre || 'Benchmark sin título';
  var sesion = {
    id:        Date.now(),
    nombre:    nombre,
    fecha:     fechaHoy(),
    analista:  STATE.config.analista,
    productos: JSON.parse(JSON.stringify(STATE.productos)),
    scores:    JSON.parse(JSON.stringify(STATE.scores)),
    config:    JSON.parse(JSON.stringify(STATE.config))
  };
  STATE.historial.unshift(sesion);
  if (STATE.historial.length > 10) STATE.historial = STATE.historial.slice(0, 10);
  saveState();
  renderSavedList();
  showToast('💾 Sesión guardada: ' + nombre);
}

function cargarSesion(id) {
  var sesion = STATE.historial.find(function(h) { return h.id === id; });
  if (!sesion) return;
  STATE.config    = sesion.config || { nombre: sesion.nombre, analista: sesion.analista || '' };
  STATE.productos = JSON.parse(JSON.stringify(sesion.productos));
  STATE.scores    = JSON.parse(JSON.stringify(sesion.scores));
  _nextId = Math.max.apply(null, STATE.productos.map(function(p) { return p.id; })) + 1;
  irAPaso(1);
  renderConfig();
  showToast('📂 Sesión cargada: ' + (STATE.config.nombre || 'Benchmark'));
}

function nuevoBenchmark() {
  STATE.paso      = 1;
  STATE.config    = { nombre: '', analista: '' };
  STATE.productos = [{ id: 1, nombre: '' }, { id: 2, nombre: '' }];
  STATE.scores    = {};
  _nextId         = 3;
  saveState();
  irAPaso(1);
  renderConfig();
  showToast('✕ Benchmark reiniciado');
}

function renderSavedList() {
  var container = document.getElementById('saved-list');
  if (!container) return;
  if (!STATE.historial.length) {
    container.innerHTML = '<div class="empty-saved">Sin sesiones guardadas.</div>';
    return;
  }
  container.innerHTML = STATE.historial.map(function(h) {
    return '<div class="saved-item" onclick="cargarSesion(' + h.id + ')" role="button" tabindex="0"' +
      ' onkeydown="if(event.key===\'Enter\'||event.key===\' \')cargarSesion(' + h.id + ')"' +
      ' title="Cargar sesión: ' + escapeHTML(h.nombre) + '">' +
      '<div class="saved-item-name">' + escapeHTML(h.nombre) + '</div>' +
      '<div class="saved-item-date">' + escapeHTML(h.fecha) +
        (h.analista ? ' · ' + escapeHTML(h.analista) : '') + '</div>' +
      '</div>';
  }).join('');
}

/* ─── INICIALIZACIÓN ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  loadState();
  document.getElementById('canvas-date').textContent = fechaHoy();
  renderConfig();
  renderSavedList();
  irAPaso(STATE.paso || 1);
});
