/* ─── CONSTANTES ─────────────────────────────────────────────── */
var STORAGE_BM       = 'uxbenchmark-state';
var STORAGE_UX       = 'uxflow-historial';
var STORAGE_DIM      = 'uxbenchmark-dimensiones';
var STORAGE_TPL      = 'uxflow-templates';

var DIMENSIONES_DEFAULT = [
  { id: 'd1', nombre: 'Primera Impresión',    desc: 'Onboarding, hero y percepción inicial',       activa: true },
  { id: 'd2', nombre: 'Navegación',           desc: 'Arquitectura de información y menús',          activa: true },
  { id: 'd3', nombre: 'Usabilidad',           desc: 'Facilidad de uso y eficiencia en tareas',      activa: true },
  { id: 'd4', nombre: 'Diseño Visual',        desc: 'Jerarquía, tipografía y consistencia',         activa: true },
  { id: 'd5', nombre: 'Accesibilidad',        desc: 'Contraste, foco y compatibilidad WCAG',        activa: true },
  { id: 'd6', nombre: 'Performance',          desc: 'Velocidad y respuesta de la interfaz',         activa: true },
  { id: 'd7', nombre: 'Experiencia Mobile',   desc: 'Adaptación responsiva y gestos táctiles',      activa: true },
  { id: 'd8', nombre: 'Conversión',           desc: 'CTA, formularios y rutas clave de negocio',   activa: true }
];

/* ─── DIMENSIONES ────────────────────────────────────────────── */
function loadDimensiones() {
  try {
    var raw = localStorage.getItem(STORAGE_DIM);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) { /* pass */ }
  return JSON.parse(JSON.stringify(DIMENSIONES_DEFAULT));
}

function saveDimensiones(dims) {
  localStorage.setItem(STORAGE_DIM, JSON.stringify(dims));
}

function renderDimensiones() {
  var dims = loadDimensiones();
  var container = document.getElementById('dim-admin-list');
  if (!container) return;

  if (!dims.length) {
    container.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:16px 0;font-style:italic;">Sin dimensiones configuradas.</div>';
    return;
  }

  container.innerHTML = dims.map(function (d, i) {
    return '<div class="dim-admin-item' + (d.activa === false ? ' inactive' : '') + '" id="dim-item-' + d.id + '">' +
      '<div class="dim-admin-num">' + (i + 1) + '</div>' +
      '<div class="dim-admin-content">' +
        '<div class="dim-admin-name-row">' +
          '<span class="dim-admin-name">' + escapeHTML(d.nombre) + '</span>' +
        '</div>' +
        '<div class="dim-admin-desc">' + escapeHTML(d.desc) + '</div>' +

        /* Inline edit form */
        '<div class="dim-edit-form" id="dim-edit-' + d.id + '">' +
          '<input type="text" class="admin-input" id="dim-edit-name-' + d.id + '" value="' + escapeHTML(d.nombre) + '" placeholder="Nombre" maxlength="40">' +
          '<input type="text" class="admin-input" id="dim-edit-desc-' + d.id + '" value="' + escapeHTML(d.desc) + '" placeholder="Descripción" maxlength="120">' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn-admin-primary" style="font-size:11px;padding:6px 12px;" onclick="guardarEditDim(\'' + d.id + '\')">Guardar</button>' +
            '<button class="btn-admin-ghost" style="font-size:11px;padding:6px 12px;" onclick="cancelarEditDim(\'' + d.id + '\')">Cancelar</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="dim-admin-actions">' +
        '<button class="dim-edit-btn" onclick="toggleEditDim(\'' + d.id + '\')" aria-label="Editar">Editar</button>' +
        '<button class="dim-toggle ' + (d.activa !== false ? 'on' : '') + '"' +
          ' onclick="toggleDim(\'' + d.id + '\')"' +
          ' title="' + (d.activa !== false ? 'Desactivar' : 'Activar') + '"' +
          ' aria-label="' + (d.activa !== false ? 'Desactivar' : 'Activar') + ' dimensión">' +
        '</button>' +
        '<button class="btn-admin-danger" style="padding:4px 8px;font-size:11px;" onclick="eliminarDim(\'' + d.id + '\')" aria-label="Eliminar">✕</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

function toggleEditDim(id) {
  var form = document.getElementById('dim-edit-' + id);
  if (!form) return;
  form.classList.toggle('open');
}

function cancelarEditDim(id) {
  var form = document.getElementById('dim-edit-' + id);
  if (form) form.classList.remove('open');
}

function guardarEditDim(id) {
  var nameEl = document.getElementById('dim-edit-name-' + id);
  var descEl = document.getElementById('dim-edit-desc-' + id);
  var newName = nameEl ? nameEl.value.trim() : '';
  var newDesc = descEl ? descEl.value.trim() : '';
  if (!newName) { showToast('⚠ El nombre no puede estar vacío'); return; }

  var dims = loadDimensiones();
  var dim = dims.find(function (d) { return d.id === id; });
  if (dim) {
    dim.nombre = newName;
    dim.desc   = newDesc;
    saveDimensiones(dims);
    renderDimensiones();
    showToast('✅ Dimensión actualizada');
  }
}

function toggleDim(id) {
  var dims = loadDimensiones();
  var dim = dims.find(function (d) { return d.id === id; });
  if (dim) {
    dim.activa = dim.activa === false ? true : false;
    saveDimensiones(dims);
    renderDimensiones();
    showToast(dim.activa ? '✅ Dimensión activada' : '○ Dimensión desactivada');
  }
}

function eliminarDim(id) {
  var dims = loadDimensiones();
  if (dims.length <= 2) { showToast('⚠ Mínimo 2 dimensiones requeridas'); return; }
  dims = dims.filter(function (d) { return d.id !== id; });
  saveDimensiones(dims);
  renderDimensiones();
  showToast('🗑 Dimensión eliminada');
}

function agregarDimension() {
  var nameEl = document.getElementById('new-dim-name');
  var descEl = document.getElementById('new-dim-desc');
  var name = nameEl ? nameEl.value.trim() : '';
  var desc = descEl ? descEl.value.trim() : '';
  if (!name) { showToast('⚠ Ingresa un nombre para la dimensión'); return; }

  var dims = loadDimensiones();
  var newId = 'dc-' + Date.now();
  dims.push({ id: newId, nombre: name, desc: desc || '', activa: true });
  saveDimensiones(dims);
  if (nameEl) nameEl.value = '';
  if (descEl) descEl.value = '';
  renderDimensiones();
  showToast('✅ Dimensión agregada');
}

function resetearDimensiones() {
  if (!confirm('¿Restablecer las dimensiones predeterminadas? Se perderán los cambios.')) return;
  saveDimensiones(JSON.parse(JSON.stringify(DIMENSIONES_DEFAULT)));
  renderDimensiones();
  showToast('↩ Dimensiones restablecidas');
}

/* ─── TEMPLATES UXFLOW ───────────────────────────────────────── */
function loadTemplates() {
  try {
    var raw = localStorage.getItem(STORAGE_TPL);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { /* pass */ }
  return [];
}

function saveTemplates(tpls) {
  localStorage.setItem(STORAGE_TPL, JSON.stringify(tpls));
}

function renderTemplates() {
  var tpls = loadTemplates();
  var container = document.getElementById('template-list');
  if (!container) return;

  if (!tpls.length) {
    container.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:16px 0;font-style:italic;">Sin templates guardados.</div>';
    return;
  }

  container.innerHTML = tpls.map(function (t, i) {
    return '<div class="template-item">' +
      '<div class="template-item-content">' +
        '<div class="template-item-name">' + escapeHTML(t.nombre) + '</div>' +
        (t.linea ? '<div style="font-family:var(--font-mono);font-size:9px;color:var(--cyan);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">' + escapeHTML(t.linea) + '</div>' : '') +
        '<div class="template-item-text">' + escapeHTML(t.criterios) + '</div>' +
      '</div>' +
      '<div class="template-item-actions">' +
        '<button class="dim-edit-btn" onclick="cargarTemplate(' + i + ')" title="Cargar en formulario">Cargar</button>' +
        '<button class="btn-admin-danger" style="padding:4px 8px;font-size:11px;" onclick="eliminarTemplate(' + i + ')" aria-label="Eliminar">✕</button>' +
      '</div>' +
      '</div>';
  }).join('');
}

function guardarTemplate() {
  var name = (document.getElementById('tpl-name')     || {}).value || '';
  var linea = (document.getElementById('tpl-linea')   || {}).value || '';
  var criterios = (document.getElementById('tpl-criterios') || {}).value || '';
  name = name.trim(); criterios = criterios.trim();
  if (!name) { showToast('⚠ Ingresa un nombre para el template'); return; }
  if (!criterios) { showToast('⚠ Ingresa los criterios de aceptación'); return; }

  var tpls = loadTemplates();
  tpls.unshift({ id: Date.now(), nombre: name, linea: linea.trim(), criterios: criterios });
  saveTemplates(tpls);
  document.getElementById('tpl-name').value     = '';
  document.getElementById('tpl-linea').value    = '';
  document.getElementById('tpl-criterios').value = '';
  renderTemplates();
  showToast('✅ Template guardado');
}

function eliminarTemplate(idx) {
  var tpls = loadTemplates();
  tpls.splice(idx, 1);
  saveTemplates(tpls);
  renderTemplates();
  showToast('🗑 Template eliminado');
}

function cargarTemplate(idx) {
  var tpls = loadTemplates();
  var t = tpls[idx];
  if (!t) return;
  showToast('💡 Template copiado. Ábrelo en UXFLOW pegando los criterios.');
  /* Save to clipboard so user can paste in UXFLOW */
  if (navigator.clipboard) {
    navigator.clipboard.writeText(t.criterios).catch(function () {});
  }
}

/* ─── SESIONES BENCHMARK ─────────────────────────────────────── */
function loadBmState() {
  try {
    var raw = localStorage.getItem(STORAGE_BM);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function renderBmSessions() {
  var state = loadBmState();
  var tbody = document.getElementById('bm-sessions-tbody');
  var empty = document.getElementById('bm-sessions-empty');
  if (!tbody) return;

  var sessions = (state && state.historial) ? state.historial : [];

  if (!sessions.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = sessions.map(function (h, i) {
    var productos = (h.productos || []).map(function (p) { return escapeHTML(p.nombre); }).filter(Boolean).join(', ') || '—';
    return '<tr>' +
      '<td><strong>' + escapeHTML(h.nombre || '—') + '</strong></td>' +
      '<td><span style="font-family:var(--font-mono);font-size:10px;color:var(--cyan);">v' + (h.version || 1) + '</span></td>' +
      '<td>' + escapeHTML(h.analista || '—') + '</td>' +
      '<td style="font-family:var(--font-mono);font-size:11px;">' + escapeHTML(h.fecha || '—') + '</td>' +
      '<td style="font-size:11px;color:var(--muted);">' + productos + '</td>' +
      '<td><button class="btn-admin-danger" style="padding:3px 8px;font-size:10px;" onclick="eliminarSesionBm(' + i + ')">🗑</button></td>' +
      '</tr>';
  }).join('');
}

function eliminarSesionBm(idx) {
  var state = loadBmState();
  if (!state || !state.historial) return;
  state.historial.splice(idx, 1);
  try { localStorage.setItem(STORAGE_BM, JSON.stringify(state)); } catch (e) { /* pass */ }
  renderBmSessions();
  showToast('🗑 Sesión eliminada');
}

function borrarTodasSesionesBm() {
  if (!confirm('¿Borrar TODAS las sesiones de Benchmark guardadas?')) return;
  var state = loadBmState();
  if (state) {
    state.historial = [];
    try { localStorage.setItem(STORAGE_BM, JSON.stringify(state)); } catch (e) { /* pass */ }
  }
  renderBmSessions();
  showToast('🗑 Todas las sesiones eliminadas');
}

/* ─── HISTORIAL UXFLOW ───────────────────────────────────────── */
function loadUxHistory() {
  try {
    var raw = localStorage.getItem(STORAGE_UX);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function renderUxHistory() {
  var history = loadUxHistory();
  var tbody = document.getElementById('ux-history-tbody');
  var empty = document.getElementById('ux-history-empty');
  if (!tbody) return;

  if (!Array.isArray(history) || !history.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = history.map(function (h, i) {
    return '<tr>' +
      '<td><strong>' + escapeHTML(h.titulo || '—') + '</strong></td>' +
      '<td style="font-size:11px;">' + escapeHTML(h.linea || '—') + '</td>' +
      '<td style="font-family:var(--font-mono);font-size:11px;">' + escapeHTML(h.fecha || '—') + '</td>' +
      '<td><button class="btn-admin-danger" style="padding:3px 8px;font-size:10px;" onclick="eliminarUxHistorial(' + i + ')">🗑</button></td>' +
      '</tr>';
  }).join('');
}

function eliminarUxHistorial(idx) {
  var history = loadUxHistory();
  history.splice(idx, 1);
  try { localStorage.setItem(STORAGE_UX, JSON.stringify(history)); } catch (e) { /* pass */ }
  renderUxHistory();
  showToast('🗑 Documento UXFlow eliminado');
}

function borrarHistorialUxflow() {
  if (!confirm('¿Borrar todo el historial de UXFlow?')) return;
  try { localStorage.removeItem(STORAGE_UX); } catch (e) { /* pass */ }
  renderUxHistory();
  showToast('🗑 Historial UXFlow borrado');
}

/* ─── EXPORTAR JSON ──────────────────────────────────────────── */
function exportarJSON() {
  var data = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key) continue;
      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        data[key] = localStorage.getItem(key);
      }
    }
  } catch (e) { /* pass */ }

  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'uxtools-export-' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('⬇ JSON descargado');
}

/* ─── EXPORTAR CSV BENCHMARK ─────────────────────────────────── */
function exportBmCSV() {
  var state = loadBmState();
  if (!state || !state.historial || !state.historial.length) {
    showToast('⚠ Sin sesiones de Benchmark para exportar');
    return;
  }

  /* Collect all dimension names from the first session's dimensiones (or default) */
  var dimNames = [];
  var firstSession = state.historial[0];
  var dims = (firstSession.dimensiones && firstSession.dimensiones.length)
    ? firstSession.dimensiones
    : DIMENSIONES_DEFAULT;
  dims.forEach(function (d) { dimNames.push(d.nombre); });

  var rows = [];

  /* Header */
  var header = ['Benchmark', 'Versión', 'Analista', 'Fecha', 'Producto'];
  dimNames.forEach(function (n) { header.push(n); });
  header.push('Total');
  rows.push(header.map(csvCell).join(','));

  /* Data rows */
  state.historial.forEach(function (h) {
    var sessionDims = (h.dimensiones && h.dimensiones.length) ? h.dimensiones : dims;
    var productos = (h.productos || []).filter(function (p) { return (p.nombre || '').trim(); });
    productos.forEach(function (p) {
      var row = [
        h.nombre || '',
        'v' + (h.version || 1),
        h.analista || '',
        h.fecha || '',
        p.nombre
      ];
      var total = 0;
      sessionDims.forEach(function (d) {
        var entry = h.scores && h.scores[d.id] && h.scores[d.id][p.id];
        var val = 0;
        if (entry !== undefined && entry !== null) {
          val = (typeof entry === 'object') ? (entry.val || 0) : entry;
        }
        row.push(val);
        total += val;
      });
      row.push(total);
      rows.push(row.map(csvCell).join(','));
    });
  });

  var csv  = rows.join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'benchmark-export-' + new Date().toISOString().split('T')[0] + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('⬇ CSV descargado');
}

function csvCell(v) {
  var s = String(v === null || v === undefined ? '' : v);
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/* ─── BORRAR TODO ────────────────────────────────────────────── */
function borrarTodoLocalStorage() {
  if (!confirm('¿Borrar TODOS los datos guardados en localStorage?\nEsta acción es irreversible.')) return;
  try { localStorage.clear(); } catch (e) { /* pass */ }
  renderDimensiones();
  renderTemplates();
  renderBmSessions();
  renderUxHistory();
  showToast('🗑 localStorage borrado completamente');
}

/* ─── TABS ───────────────────────────────────────────────────── */
(function () {
  var tabs   = document.querySelectorAll('.admin-tab');
  var panels = document.querySelectorAll('.admin-panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');

      tabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      panels.forEach(function (p) { p.classList.remove('active'); });
      var panel = document.getElementById('admin-tab-' + target);
      if (panel) panel.classList.add('active');
    });
  });
})();

/* ─── INICIALIZACIÓN ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  renderDimensiones();
  renderTemplates();
  renderBmSessions();
  renderUxHistory();
});
