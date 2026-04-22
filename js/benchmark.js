/* ─── DIMENSIONES PREDEFINIDAS ──────────────────────────────── */
/* Load custom dimensions from admin (localStorage), fall back to defaults */
var DIMENSIONES_DEFAULT = [
  {
    id: 'd1',
    nombre: 'Primera Impresión',
    desc: 'Onboarding, hero y percepción inicial',
    criterios: [
      'La propuesta de valor se entiende en pocos segundos',
      'Los CTAs clave son visibles y accionables',
      'La pantalla inicial transmite confianza y foco'
    ]
  },
  {
    id: 'd2',
    nombre: 'Navegación',
    desc: 'Arquitectura de información y menús',
    criterios: [
      'Las rutas principales se alcanzan sin fricción',
      'La orientación del usuario se mantiene estable',
      'La navegación móvil responde bien a scroll y toque'
    ]
  },
  {
    id: 'd3',
    nombre: 'Usabilidad',
    desc: 'Facilidad de uso y eficiencia en tareas',
    criterios: [
      'Las tareas primarias se completan con claridad',
      'Los mensajes de error ayudan a resolver',
      'El feedback del sistema acompaña cada acción'
    ]
  },
  {
    id: 'd4',
    nombre: 'Diseño Visual',
    desc: 'Jerarquía, tipografía y consistencia',
    criterios: [
      'La jerarquía visual guía correctamente la mirada',
      'El sistema de diseño se siente consistente',
      'Tipografía, color y espaciado sostienen la lectura'
    ]
  },
  {
    id: 'd5',
    nombre: 'Accesibilidad',
    desc: 'Contraste, foco y compatibilidad WCAG',
    criterios: [
      'Hay contraste suficiente y foco visible',
      'Los componentes se entienden con teclado y lector',
      'La interfaz evita bloqueos para distintos perfiles'
    ]
  },
  {
    id: 'd6',
    nombre: 'Performance',
    desc: 'Velocidad y respuesta de la interfaz',
    criterios: [
      'La carga inicial y los cambios de estado son ágiles',
      'No se perciben bloqueos ni latencias innecesarias',
      'Los recursos visuales están optimizados'
    ]
  },
  {
    id: 'd7',
    nombre: 'Experiencia Mobile',
    desc: 'Adaptación responsiva y gestos táctiles',
    criterios: [
      'El layout se adapta sin zoom horizontal',
      'Los objetivos táctiles son cómodos de usar',
      'El flujo mantiene claridad en pantallas pequeñas'
    ]
  },
  {
    id: 'd8',
    nombre: 'Conversión',
    desc: 'CTA, formularios y rutas clave de negocio',
    criterios: [
      'La acción principal es clara y prioritaria',
      'El flujo de conversión evita pasos innecesarios',
      'El usuario entiende qué pasa después de actuar'
    ]
  }
];

function hydrateDimensionConfig(list) {
  var fallbackById = {};
  DIMENSIONES_DEFAULT.forEach(function (dim) {
    fallbackById[dim.id] = dim;
  });

  return (list || []).map(function (dim) {
    var fallback = fallbackById[dim.id] || {};
    return {
      id: dim.id,
      nombre: dim.nombre,
      desc: dim.desc,
      activa: dim.activa,
      criterios: Array.isArray(dim.criterios) && dim.criterios.length
        ? dim.criterios
        : (fallback.criterios || [])
    };
  });
}

var DIMENSIONES;
try {
  var _dimRaw = localStorage.getItem('uxbenchmark-dimensiones');
  if (_dimRaw) {
    var _dimParsed = JSON.parse(_dimRaw);
    DIMENSIONES = Array.isArray(_dimParsed) && _dimParsed.length
      ? hydrateDimensionConfig(_dimParsed.filter(function (d) { return d.activa !== false; }))
      : hydrateDimensionConfig(DIMENSIONES_DEFAULT);
  } else {
    DIMENSIONES = hydrateDimensionConfig(DIMENSIONES_DEFAULT);
  }
} catch (e) {
  DIMENSIONES = hydrateDimensionConfig(DIMENSIONES_DEFAULT);
}

var COLORES = ['#00B5E2', '#0033A0', '#3DBA6F', '#FF8C00', '#9B59B6'];

/* ─── ESTADO ─────────────────────────────────────────────────── */
var STATE = {
  paso:      1,
  config:    { nombre: '', analista: '' },
  productos: [
    { id: 1, nombre: 'SURA Investments', imagen: null },
    { id: 2, nombre: '', imagen: null }
  ],
  scores:    {},   /* scores[dimId][prodId] = { val: 1-5, screenshot: dataUrl|null } */
  notas:     {},
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
      if (!STATE.notas) STATE.notas = {};
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
    if (!STATE.notas[d.id]) STATE.notas[d.id] = {};
    STATE.productos.forEach(function(p) {
      var notaEl = document.getElementById('nota-' + d.id + '-' + p.id);
      if (notaEl) STATE.notas[d.id][p.id] = notaEl.value;
    });
  });

  /* Scores are stored directly via onScoreSelect() — no DOM reading needed here */
}

/* ─── SCORE VALUE HELPERS ─────────────────────────────────────── */
/* scores[dimId][prodId] can be a plain number (legacy) or { val, screenshot } */
function getScoreVal(dimId, prodId) {
  var entry = STATE.scores[dimId] && STATE.scores[dimId][prodId];
  if (entry === undefined || entry === null) return 0;
  if (typeof entry === 'object') return entry.val || 0;
  return entry;
}

function getScoreScreenshot(dimId, prodId) {
  var entry = STATE.scores[dimId] && STATE.scores[dimId][prodId];
  if (entry && typeof entry === 'object') return entry.screenshot || null;
  return null;
}

function setScoreEntry(dimId, prodId, val, screenshot) {
  if (!STATE.scores[dimId]) STATE.scores[dimId] = {};
  var existing = STATE.scores[dimId][prodId];
  var existingScreenshot = (existing && typeof existing === 'object') ? existing.screenshot : null;
  STATE.scores[dimId][prodId] = {
    val:        val,
    screenshot: screenshot !== undefined ? screenshot : existingScreenshot
  };
}

function getScoreNote(dimId, prodId) {
  return (STATE.notas[dimId] && STATE.notas[dimId][prodId]) || '';
}

function countEvidenceForProduct(prodId) {
  var total = 0;
  DIMENSIONES.forEach(function(d) {
    if (getScoreScreenshot(d.id, prodId)) total++;
  });
  return total;
}

function countLowScoresForProduct(prodId, threshold) {
  var total = 0;
  DIMENSIONES.forEach(function(d) {
    var score = getScoreVal(d.id, prodId);
    if (score > 0 && score <= threshold) total++;
  });
  return total;
}

function getSessionDimensions(session) {
  return (session && Array.isArray(session.dimensiones) && session.dimensiones.length)
    ? session.dimensiones
    : DIMENSIONES;
}

function getSessionProducts(session) {
  return ((session && session.productos) || []).filter(function(p) {
    return p && p.nombre && p.nombre.trim();
  });
}

function getSessionScoreVal(session, dimId, prodId) {
  var entry = session && session.scores && session.scores[dimId] && session.scores[dimId][prodId];
  if (entry === undefined || entry === null) return 0;
  if (typeof entry === 'object') return entry.val || 0;
  return entry;
}

function summarizeSession(session) {
  var dims = getSessionDimensions(session);
  var productos = getSessionProducts(session);
  var maxScore = dims.length * 5;
  var leader = null;
  var leaderTotal = 0;

  productos.forEach(function(p) {
    var total = dims.reduce(function(acc, dim) {
      return acc + getSessionScoreVal(session, dim.id, p.id);
    }, 0);
    if (!leader || total > leaderTotal) {
      leader = p;
      leaderTotal = total;
    }
  });

  return {
    productos: productos.length,
    dimensiones: dims.length,
    maxScore: maxScore,
    leaderName: leader ? leader.nombre : 'Sin datos',
    leaderTotal: leaderTotal,
    leaderAverage: dims.length ? (leaderTotal / dims.length).toFixed(1) : '0.0'
  };
}

/* ─── UTILIDADES ─── ver js/utils.js ─────────────────────────── */

function scoreClass(s) {
  if (s >= 4) return 'hi';
  if (s >= 3) return 'md';
  return 'lo';
}

function scoreInputClass(s) {
  if (s >= 4) return 'score-input score-high';
  if (s >= 3) return 'score-input score-mid';
  return 'score-input score-low';
}

/* ─── CONSTANTES DE IMAGEN ───────────────────────────────────── */
var SCREENSHOT_MAX_DIM  = 800;   /* Máx. dimensión (px) para screenshots de scores */
var SCREENSHOT_QUALITY  = 0.8;   /* Calidad JPEG para screenshots */
function resizeImageToBase64(file, maxDim, quality, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var w = img.width;
      var h = img.height;
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function onImagenUpload(id, input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠ Solo se aceptan imágenes');
    input.value = '';
    return;
  }
  resizeImageToBase64(file, 240, 0.75, function(dataUrl) {
    var p = STATE.productos.find(function(prod) { return prod.id === id; });
    if (p) {
      p.imagen = dataUrl;
      saveState();
      renderProductos();
      showToast('🖼 Imagen cargada');
    }
  });
}

function eliminarImagen(id) {
  var p = STATE.productos.find(function(prod) { return prod.id === id; });
  if (p) {
    p.imagen = null;
    saveState();
    renderProductos();
    showToast('🗑 Imagen eliminada');
  }
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

    var imgArea;
    if (p.imagen) {
      imgArea = '<div class="producto-img-area">' +
        '<img class="prod-thumb" src="' + p.imagen + '" alt="Imagen de ' + escapeHTML(p.nombre || 'producto') + '">' +
        '<label class="btn-img-upload" for="img-' + p.id + '" title="Cambiar imagen">🖼 Cambiar</label>' +
        '<button class="btn-img-remove" onclick="eliminarImagen(' + p.id + ')" title="Quitar imagen" aria-label="Quitar imagen">✕</button>' +
        '<input type="file" id="img-' + p.id + '" accept="image/*" class="img-input-hidden" onchange="onImagenUpload(' + p.id + ', this)">' +
        '</div>';
    } else {
      imgArea = '<div class="producto-img-area">' +
        '<label class="btn-img-upload" for="img-' + p.id + '" title="Subir imagen del producto">📷 Imagen</label>' +
        '<input type="file" id="img-' + p.id + '" accept="image/*" class="img-input-hidden" onchange="onImagenUpload(' + p.id + ', this)">' +
        '</div>';
    }

    return '<div class="producto-row">' +
      '<span class="producto-num">' + (i + 1) + '</span>' +
      '<div class="producto-fields">' +
        '<input type="text" id="prod-' + p.id + '" placeholder="Nombre del producto" value="' + escapeHTML(p.nombre) + '" autocomplete="off">' +
        imgArea +
      '</div>' +
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
  STATE.productos.push({ id: _nextId++, nombre: '', imagen: null });
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

  var html = '<div class="eval-scale">' +
    '<div class="eval-scale-label">Escala de evaluación</div>' +
    '<div class="eval-scale-items">' +
    '<div class="eval-scale-item lo"><span class="eval-scale-range">1 – 2</span><span class="eval-scale-name">Deficiente</span></div>' +
    '<div class="eval-scale-item mid"><span class="eval-scale-range">3</span><span class="eval-scale-name">Aceptable</span></div>' +
    '<div class="eval-scale-item hi"><span class="eval-scale-range">4 – 5</span><span class="eval-scale-name">Destacado</span></div>' +
    '</div></div>';

  html += '<div class="eval-table-wrap"><table class="eval-table"><thead><tr><th class="dim-col">Dimensión</th>';
  productos.forEach(function(p) {
    var imgTag = p.imagen
      ? '<div class="eval-prod-thumb"><img src="' + p.imagen + '" alt="' + escapeHTML(p.nombre) + '"></div>'
      : '';
    html += '<th class="prod-col">' + imgTag + escapeHTML(p.nombre) + '</th>';
  });
  html += '</tr></thead><tbody>';

  DIMENSIONES.forEach(function(d) {
    var criterios = Array.isArray(d.criterios) ? d.criterios : [];
    var criteriosHtml = criterios.length
      ? '<ul class="dim-criteria-list">' + criterios.map(function (criterio) {
          return '<li>' + escapeHTML(criterio) + '</li>';
        }).join('') + '</ul>'
      : '';

    html += '<tr><td><div class="dim-cell-name">' + escapeHTML(d.nombre) + '</div>' +
            '<div class="dim-cell-desc">' + escapeHTML(d.desc) + '</div>' +
            criteriosHtml + '</td>';
    productos.forEach(function(p) {
      var storedVal = getScoreVal(d.id, p.id);
      var currentVal = storedVal > 0 ? storedVal : '';
      var nota = getScoreNote(d.id, p.id);
      html += '<td class="score-cell">' + buildScoreSelector(d.id, p.id, currentVal, d.nombre, p.nombre) + '</td>';
      html += '';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  body.innerHTML = html;
}

function onScoreInput(inp) {
  var val = parseInt(inp.value, 10);
  if (!isNaN(val)) {
    val = Math.min(5, Math.max(1, val));
    inp.value = val;
    inp.className = scoreInputClass(val);
  } else {
    inp.className = 'score-input';
  }
  autoSave();
}

/* ─── SCORE SELECTOR (visual 1-5 buttons) ───────────────────── */
function onScoreSelect(dimId, prodId, val) {
  setScoreEntry(dimId, prodId, val, undefined);

  var container = document.getElementById('score-sel-' + dimId + '-' + prodId);
  if (container) {
    container.setAttribute('data-val', val);
    container.classList.remove('val-lo', 'val-mid', 'val-hi');
    if (val <= 2) container.classList.add('val-lo');
    else if (val === 3) container.classList.add('val-mid');
    else container.classList.add('val-hi');

    container.querySelectorAll('.score-btn').forEach(function(btn) {
      var btnVal = parseInt(btn.getAttribute('data-val'), 10);
      btn.classList.toggle('active', btnVal <= val);
    });
  }
  autoSave();
}

function buildScoreSelector(dimId, prodId, currentVal, dimName, prodName) {
  var numVal = (currentVal !== '' && currentVal !== null && currentVal !== undefined) ? Number(currentVal) : 0;
  var valClass = '';
  if (numVal > 0) {
    if (numVal <= 2) valClass = ' val-lo';
    else if (numVal === 3) valClass = ' val-mid';
    else valClass = ' val-hi';
  }
  var selectorId = 'score-sel-' + dimId + '-' + prodId;
  var existingScreenshot = getScoreScreenshot(dimId, prodId);
  var existingNote = getScoreNote(dimId, prodId);
  var inputId = 'ss-input-' + dimId + '-' + prodId;
  var noteId = 'nota-' + dimId + '-' + prodId;

  var html = '<div class="score-cell-wrap">' +
    '<div class="score-selector' + valClass + '" id="' + selectorId + '"' +
    ' data-val="' + (numVal || '') + '"' +
    ' role="group" aria-label="' + escapeHTML(dimName) + ' — ' + escapeHTML(prodName) + '">';
  for (var v = 1; v <= 5; v++) {
    var isActive = numVal > 0 && v <= numVal;
    var cls = 'score-btn' + (isActive ? ' active' : '');
    html += '<button class="' + cls + '" data-val="' + v + '"' +
      ' onclick="onScoreSelect(\'' + dimId + '\', \'' + prodId + '\', ' + v + ')"' +
      ' aria-label="Puntuación ' + v + ' de 5">' + v + '</button>';
  }
  html += '</div>';

  /* Screenshot area */
  html += '<input type="file" id="' + inputId + '" class="score-screenshot-input" accept="image/*"' +
    ' onchange="onScoreScreenshot(\'' + dimId + '\', \'' + prodId + '\', this)">';

  if (existingScreenshot) {
    html += '<div style="display:flex;align-items:center;gap:4px;">' +
      '<img class="score-screenshot-thumb" src="' + existingScreenshot + '"' +
      ' alt="Captura ' + escapeHTML(dimName) + '"' +
      ' onclick="openLightbox(\'' + dimId + '-' + prodId + '\')"' +
      ' title="Ver captura">' +
      '<button class="score-screenshot-remove" onclick="removeScoreScreenshot(\'' + dimId + '\', \'' + prodId + '\')"' +
      ' aria-label="Quitar captura" title="Quitar">✕</button>' +
      '</div>';
  } else {
    html += '<label class="score-screenshot-btn" for="' + inputId + '" title="Adjuntar captura">📷</label>';
  }

  html += '<textarea id="' + noteId + '" class="score-note-input" rows="3"' +
    ' placeholder="Observaciones cualitativas, fricciones, mejoras o citas relevantes…"' +
    ' oninput="autoSave()" aria-label="Observaciones para ' + escapeHTML(dimName) + ' — ' + escapeHTML(prodName) + '">' +
    escapeHTML(existingNote) + '</textarea>';

  html += '</div>';
  return html;
}

/* ─── SCREENSHOT HANDLERS ────────────────────────────────────── */
function onScoreScreenshot(dimId, prodId, input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠ Solo se aceptan imágenes');
    input.value = '';
    return;
  }
  resizeImageToBase64(file, SCREENSHOT_MAX_DIM, SCREENSHOT_QUALITY, function(dataUrl) {
    var val = getScoreVal(dimId, prodId);
    setScoreEntry(dimId, prodId, val || 0, dataUrl);
    saveState();
    renderEval();
    showToast('📷 Captura adjuntada');
  });
}

function removeScoreScreenshot(dimId, prodId) {
  var val = getScoreVal(dimId, prodId);
  setScoreEntry(dimId, prodId, val || 0, null);
  saveState();
  renderEval();
  showToast('🗑 Captura eliminada');
}

/* ─── LIGHTBOX ───────────────────────────────────────────────── */
function openLightbox(key) {
  var src;
  /* key is "dimId-prodId" */
  var parts = key.split('-');
  if (parts.length >= 2) {
    var dimId = parts[0];
    var prodId = parts[1];
    src = getScoreScreenshot(dimId, prodId);
  }
  if (!src) return;

  var overlay = document.createElement('div');
  overlay.className = 'screenshot-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Ver captura de pantalla');

  var closeBtn = document.createElement('button');
  closeBtn.className = 'screenshot-lightbox-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Cerrar');

  var img = document.createElement('img');
  img.src = src;
  img.alt = 'Captura de pantalla adjunta';

  overlay.appendChild(closeBtn);
  overlay.appendChild(img);
  document.body.appendChild(overlay);

  function closeLightbox() { document.body.removeChild(overlay); }
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay || e.target === closeBtn) closeLightbox();
  });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { closeLightbox(); document.removeEventListener('keydown', handler); }
  });
}

/* ─── PDF EXPORT ─────────────────────────────────────────────── */
function exportarPDF() {
  window.print();
}



/* ─── RADAR CHART ────────────────────────────────────────────── */
var RADAR_LABEL_MAX   = 11;
var RADAR_GRID_STROKE = 'rgba(0,26,114,0.1)';
var RADAR_AXIS_STROKE = 'rgba(0,26,114,0.08)';
var RADAR_LABEL_FILL  = '#8E99B0';

function svgLabel(cx, cy, text) {
  var ta    = 'text-anchor="middle"';
  var style = 'font-family="Inter,sans-serif" font-size="8" fill="' + RADAR_LABEL_FILL + '"';
  if (text.length <= RADAR_LABEL_MAX) {
    return '<text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" ' + ta + ' dominant-baseline="middle" ' + style + '>' + escapeHTML(text) + '</text>';
  }
  var words = text.split(' ');
  if (words.length > 1) {
    var line1 = words[0];
    var line2 = words.slice(1).join(' ');
    if (line2.length > RADAR_LABEL_MAX) line2 = line2.substring(0, RADAR_LABEL_MAX - 1) + '\u2026';
    return '<text x="' + cx.toFixed(1) + '" y="' + (cy - 5).toFixed(1) + '" ' + ta + ' ' + style + '>' +
      '<tspan x="' + cx.toFixed(1) + '" dy="0">' + escapeHTML(line1) + '</tspan>' +
      '<tspan x="' + cx.toFixed(1) + '" dy="10">' + escapeHTML(line2) + '</tspan>' +
      '</text>';
  }
  return '<text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" ' + ta + ' dominant-baseline="middle" ' + style + '>' + escapeHTML(text.substring(0, RADAR_LABEL_MAX - 1) + '\u2026') + '</text>';
}

function buildRadarChart(productos) {
  if (!productos || !productos.length) return '';
  var N  = DIMENSIONES.length;
  var cx = 150, cy = 150, r = 100;

  function pt(level, i) {
    var angle = (2 * Math.PI * i / N) - Math.PI / 2;
    return {
      x: cx + level * r * Math.cos(angle),
      y: cy + level * r * Math.sin(angle)
    };
  }

  var svg = '<svg class="radar-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';

  /* Grid rings */
  [0.25, 0.5, 0.75, 1.0].forEach(function(level) {
    var pts = [];
    for (var i = 0; i < N; i++) {
      var p = pt(level, i);
      pts.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
    }
    svg += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="' + RADAR_GRID_STROKE + '" stroke-width="1"/>';
  });

  /* Axis lines */
  for (var i = 0; i < N; i++) {
    var outer = pt(1.0, i);
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + outer.x.toFixed(1) + '" y2="' + outer.y.toFixed(1) + '" stroke="' + RADAR_AXIS_STROKE + '" stroke-width="1"/>';
  }

  /* Axis labels */
  for (var j = 0; j < N; j++) {
    var lp = pt(1.22, j);
    svg += svgLabel(lp.x, lp.y, DIMENSIONES[j].nombre);
  }

  /* Product polygons */
  productos.forEach(function(p, pi) {
    var color = COLORES[pi % COLORES.length];
    var pts2 = [];
    DIMENSIONES.forEach(function(d, di) {
      var score = getScoreVal(d.id, p.id);
      var point = pt(score / 5, di);
      pts2.push(point.x.toFixed(1) + ',' + point.y.toFixed(1));
    });
    svg += '<polygon points="' + pts2.join(' ') + '" fill="' + color + '" fill-opacity="0.15" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>';
    DIMENSIONES.forEach(function(d, di) {
      var score = getScoreVal(d.id, p.id);
      if (score > 0) {
        var dot = pt(score / 5, di);
        svg += '<circle cx="' + dot.x.toFixed(1) + '" cy="' + dot.y.toFixed(1) + '" r="3" fill="' + color + '"/>';
      }
    });
  });

  svg += '</svg>';

  var legend = '<div class="radar-legend">';
  productos.forEach(function(p, pi) {
    var color = COLORES[pi % COLORES.length];
    legend += '<div class="radar-legend-item">' +
      '<span class="radar-legend-dot" style="background:' + color + '"></span>' +
      '<span class="radar-legend-name">' + escapeHTML(p.nombre) + '</span>' +
      '</div>';
  });
  legend += '</div>';

  return '<div class="radar-section">' +
    '<div class="bars-label">Comparativa multidimensional</div>' +
    '<div class="radar-wrap">' + svg + legend + '</div>' +
    '</div>';
}

var FAILURE_SCORE_MAX = 2;

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
      sum += getScoreVal(d.id, p.id);
    });
    totales[p.id] = sum;
  });

  var maxTotal = Math.max.apply(null, productos.map(function(p) { return totales[p.id]; }));
  var winner   = productos.find(function(p) { return totales[p.id] === maxTotal; }) || productos[0];
  var maxScore = DIMENSIONES.length * 5;
  var bmNombre = STATE.config.nombre || 'UX Benchmark';
  var fecha    = fechaHoy();
  var winnerAverage = (totales[winner.id] / Math.max(DIMENSIONES.length, 1)).toFixed(1);
  var winnerEvidence = countEvidenceForProduct(winner.id);
  var winnerFailures = countLowScoresForProduct(winner.id, FAILURE_SCORE_MAX);

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
  var winnerImg = winner.imagen
    ? '<img class="winner-thumb" src="' + winner.imagen + '" alt="' + escapeHTML(winner.nombre) + '">'
    : '';
  html += '<div class="winner-banner">';
  html += '<div class="winner-icon">🏆</div>';
  html += winnerImg;
  html += '<div><div class="winner-label">Mejor puntuación</div>';
  html += '<div class="winner-name">' + escapeHTML(winner.nombre) + '</div></div>';
  html += '<div class="winner-score">' + totales[winner.id] +
    '<span style="font-size:14px;font-weight:400;color:#8E99B0;">/' + maxScore + '</span></div>';
  html += '</div>';

  html += '<div class="result-summary-grid">';
  html += '<div class="result-summary-card"><div class="result-summary-label">Promedio líder</div><div class="result-summary-value">' + winnerAverage + '/5</div></div>';
  html += '<div class="result-summary-card"><div class="result-summary-label">Evidencias adjuntas</div><div class="result-summary-value">' + winnerEvidence + '</div></div>';
  html += '<div class="result-summary-card"><div class="result-summary-label">Fricciones críticas</div><div class="result-summary-value">' + winnerFailures + '</div></div>';
  html += '</div>';

  /* Radar chart */
  html += buildRadarChart(productos);

  /* Table */
  html += '<div class="result-table-wrap"><table class="result-table"><thead><tr><th class="dim-h">Dimensión</th>';
  productos.forEach(function(p) {
    var imgTag = p.imagen
      ? '<div class="result-prod-thumb"><img src="' + p.imagen + '" alt="' + escapeHTML(p.nombre) + '"></div>'
      : '';
    html += '<th>' + imgTag + escapeHTML(p.nombre) + '</th>';
  });
  html += '</tr></thead><tbody>';

  DIMENSIONES.forEach(function(d) {
    html += '<tr><td class="dim-n">' + escapeHTML(d.nombre) + '</td>';
    productos.forEach(function(p) {
      var s  = getScoreVal(d.id, p.id);
      var isBest = totales[p.id] === maxTotal;
      var badgeCls = isBest ? 'score-badge best' : 'score-badge ' + scoreClass(s);
      var screenshot = getScoreScreenshot(d.id, p.id);
      var ssTag = screenshot
        ? '<img class="result-screenshot-thumb" src="' + screenshot + '"' +
          ' alt="Captura ' + escapeHTML(d.nombre) + ' — ' + escapeHTML(p.nombre) + '"' +
          ' onclick="openLightbox(\'' + d.id + '-' + p.id + '\')"' +
          ' title="Ver captura">'
        : '';
      html += '<td><span class="' + badgeCls + '">' + s + '</span>' + ssTag + '</td>';
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
  html += '</tr></tbody></table></div>';

  /* Bar chart */
  html += '<div class="bars-section"><div class="bars-label">Puntuación total por producto</div>';
  productos.forEach(function(p, i) {
    var pct   = Math.round((totales[p.id] / maxScore) * 100);
    var color = COLORES[i % COLORES.length];
    var imgTag = p.imagen
      ? '<img class="bar-prod-thumb" src="' + p.imagen + '" alt="' + escapeHTML(p.nombre) + '">'
      : '';
    html += '<div class="bar-row">';
    html += '<div class="bar-row-label">' + imgTag + escapeHTML(p.nombre) + '</div>';
    html += '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    html += '<div class="bar-value">' + totales[p.id] + '<span class="bar-pct">(' + pct + '%)</span></div>';
    html += '</div>';
  });
  html += '</div>';

  var hallazgos = [];
  DIMENSIONES.forEach(function(d) {
    productos.forEach(function(p) {
      var nota = getScoreNote(d.id, p.id);
      if (!nota) return;
      hallazgos.push({
        dim: d.nombre,
        prod: p.nombre,
        text: nota
      });
    });
  });

  if (hallazgos.length) {
    html += '<div class="findings-section"><div class="bars-label">Observaciones cualitativas</div><div class="findings-list">';
    hallazgos.slice(0, 12).forEach(function(item) {
      html += '<div class="finding-item">';
      html += '<div class="finding-kicker">' + escapeHTML(item.dim) + ' · ' + escapeHTML(item.prod) + '</div>';
      html += '<div class="finding-text">' + escapeHTML(item.text) + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  var failureItems = [];
  DIMENSIONES.forEach(function(d) {
    productos.forEach(function(p) {
      var score = getScoreVal(d.id, p.id);
      if (!score || score > FAILURE_SCORE_MAX) return;
      failureItems.push({
        dim: d.nombre,
        prod: p.nombre,
        score: score,
        note: getScoreNote(d.id, p.id)
      });
    });
  });

  if (failureItems.length) {
    html += '<div class="failure-zone"><div class="bars-label">Zona de fricción prioritaria</div><div class="failure-list">';
    failureItems.forEach(function(item) {
      html += '<div class="failure-item">';
      html += '<div class="failure-item-top"><span class="failure-dim">' + escapeHTML(item.dim) + '</span><span class="score-badge lo">' + item.score + '</span></div>';
      html += '<div class="failure-prod">' + escapeHTML(item.prod) + '</div>';
      if (item.note) html += '<div class="failure-note">' + escapeHTML(item.note) + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  /* Export row */
  html += '<div class="export-row">';
  html += '<button class="btn-result-action primary" onclick="exportarPDF()">📄 Exportar PDF</button>';
  html += '<button class="btn-result-action ghost" onclick="exportarResultados()">📋 Copiar texto</button>';
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
  var maxScore  = DIMENSIONES.length * 5;
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
      var s = getScoreVal(d.id, p.id);
      row += (s + '/5').padEnd(COL);
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

  var hasNotas = DIMENSIONES.some(function(d) {
    return productos.some(function(p) {
      return !!getScoreNote(d.id, p.id);
    });
  });

  if (hasNotas) {
    lines.push('');
    lines.push('OBSERVACIONES CUALITATIVAS');
    lines.push('─'.repeat(ROW + COL * productos.length));
    DIMENSIONES.forEach(function(d) {
      productos.forEach(function(p) {
        var nota = getScoreNote(d.id, p.id);
        if (!nota) return;
        lines.push('[' + d.nombre + '] ' + p.nombre + ': ' + nota);
      });
    });
  }

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
  /* Version = number of prior snapshots with this name + 1.
     Calculated before unshift so the new session is not counted. */
  var version = STATE.historial.filter(function(h) { return h.nombre === nombre; }).length + 1;
  var sesion = {
    id:          Date.now(),
    nombre:      nombre,
    version:     version,
    fecha:       fechaHoy(),
    analista:    STATE.config.analista,
    productos:   JSON.parse(JSON.stringify(STATE.productos)),
    scores:      JSON.parse(JSON.stringify(STATE.scores)),
    notas:       JSON.parse(JSON.stringify(STATE.notas)),
    config:      JSON.parse(JSON.stringify(STATE.config)),
    dimensiones: JSON.parse(JSON.stringify(DIMENSIONES))
  };
  STATE.historial.unshift(sesion);
  if (STATE.historial.length > 10) STATE.historial = STATE.historial.slice(0, 10);
  saveState();
  renderSavedList();
  showToast('💾 Sesión guardada: ' + nombre + ' v' + version);
}

function cargarSesion(id) {
  var sesion = STATE.historial.find(function(h) { return h.id === id; });
  if (!sesion) return;
  STATE.config    = sesion.config || { nombre: sesion.nombre, analista: sesion.analista || '' };
  STATE.productos = JSON.parse(JSON.stringify(sesion.productos));
  STATE.scores    = JSON.parse(JSON.stringify(sesion.scores));
  STATE.notas     = sesion.notas ? JSON.parse(JSON.stringify(sesion.notas)) : {};
  _nextId = Math.max.apply(null, STATE.productos.map(function(p) { return p.id; })) + 1;
  irAPaso(1);
  renderConfig();
  showToast('📂 Sesión cargada: ' + (STATE.config.nombre || 'Benchmark'));
}

function nuevoBenchmark() {
  STATE.paso      = 1;
  STATE.config    = { nombre: '', analista: '' };
  STATE.productos = [{ id: 1, nombre: '', imagen: null }, { id: 2, nombre: '', imagen: null }];
  STATE.scores    = {};
  STATE.notas     = {};
  _nextId         = 3;
  saveState();
  irAPaso(1);
  renderConfig();
  showToast('✕ Benchmark reiniciado');
}

function renderSavedList() {
  var container = document.getElementById('saved-list');
  var summaryEl = document.getElementById('saved-history-summary');
  if (!container) return;
  if (!STATE.historial.length) {
    if (summaryEl) summaryEl.innerHTML = '';
    container.innerHTML = '<div class="empty-saved">Sin sesiones guardadas.</div>';
    return;
  }

  if (summaryEl) {
    var uniqueBenchmarks = {};
    var bestSession = null;
    STATE.historial.forEach(function(h) {
      if (h.nombre) uniqueBenchmarks[h.nombre] = true;
      var sessionSummary = summarizeSession(h);
      if (!bestSession || sessionSummary.leaderTotal > bestSession.summary.leaderTotal) {
        bestSession = { item: h, summary: sessionSummary };
      }
    });
    var latest = STATE.historial[0];
    summaryEl.innerHTML =
      '<div class="saved-summary-grid">' +
        '<div class="saved-summary-card">' +
          '<div class="saved-summary-label">Sesiones</div>' +
          '<div class="saved-summary-value">' + STATE.historial.length + '</div>' +
          '<div class="saved-summary-meta">Snapshots listos para reabrir</div>' +
        '</div>' +
        '<div class="saved-summary-card">' +
          '<div class="saved-summary-label">Benchmarks</div>' +
          '<div class="saved-summary-value">' + Object.keys(uniqueBenchmarks).length + '</div>' +
          '<div class="saved-summary-meta">Nombres distintos guardados</div>' +
        '</div>' +
        '<div class="saved-summary-card">' +
          '<div class="saved-summary-label">Mejor score</div>' +
          '<div class="saved-summary-value">' + bestSession.summary.leaderTotal + '/' + bestSession.summary.maxScore + '</div>' +
          '<div class="saved-summary-meta">' + escapeHTML(bestSession.summary.leaderName) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="saved-summary-foot">Última sesión: ' + escapeHTML(latest.nombre || 'Benchmark') + ' · ' + escapeHTML(latest.fecha || '') + '</div>';
  }

  container.innerHTML = STATE.historial.map(function(h) {
    var versionTag = h.version != null ? '<span class="saved-item-version">v' + h.version + '</span>' : '';
    var sessionSummary = summarizeSession(h);
    var productsLabel = sessionSummary.productos + ' ' + (sessionSummary.productos === 1 ? 'producto' : 'productos');
    var dimsLabel = sessionSummary.dimensiones + ' dim.';
    return '<div class="saved-item" onclick="cargarSesion(' + h.id + ')" role="button" tabindex="0"' +
      ' onkeydown="if(event.key===\'Enter\'||event.key===\' \')cargarSesion(' + h.id + ')"' +
      ' title="Cargar sesión: ' + escapeHTML(h.nombre) + '">' +
      '<div class="saved-item-top">' +
      '<div class="saved-item-name">' + escapeHTML(h.nombre) + versionTag + '</div>' +
      '<div class="saved-item-score">' + sessionSummary.leaderTotal + '/' + sessionSummary.maxScore + '</div>' +
      '</div>' +
      '<div class="saved-item-date">' + escapeHTML(h.fecha) +
        (h.analista ? ' · ' + escapeHTML(h.analista) : '') + '</div>' +
      '<div class="saved-item-meta">' +
      '<span class="saved-item-chip">' + escapeHTML(productsLabel) + '</span>' +
      '<span class="saved-item-chip">' + escapeHTML(dimsLabel) + '</span>' +
      '<span class="saved-item-chip">Líder: ' + escapeHTML(sessionSummary.leaderName) + '</span>' +
      '</div>' +
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
