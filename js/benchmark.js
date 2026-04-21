/* ─── DIMENSIONES PREDEFINIDAS ──────────────────────────────── */
var DIMENSIONES = [
  {
    id: 'd1', nombre: 'Primera Impresión', desc: 'Onboarding, hero y percepción inicial',
    criterios: [
      'La propuesta de valor es comprensible en menos de 5 segundos',
      'El hero o pantalla inicial es visualmente atractivo y coherente con la marca',
      'La primera experiencia genera confianza y credibilidad',
      'Los CTAs principales están correctamente jerarquizados y son visibles',
      'La carga y primer render ocurren sin fricciones ni errores visibles'
    ]
  },
  {
    id: 'd2', nombre: 'Navegación', desc: 'Arquitectura de información y menús',
    criterios: [
      'El menú principal es claro, intuitivo y consistente en todas las pantallas',
      'Las funciones clave se alcanzan en 3 clics o menos',
      'Existen indicadores de posición (breadcrumbs, tabs activos u otros)',
      'La navegación mobile es accesible y funcional con gestos táctiles',
      'Las etiquetas y denominaciones son consistentes y sin ambigüedad'
    ]
  },
  {
    id: 'd3', nombre: 'Usabilidad', desc: 'Facilidad de uso y eficiencia en tareas',
    criterios: [
      'Las tareas primarias se completan sin errores ni confusión',
      'Los mensajes de error son claros, específicos y orientados a la solución',
      'El sistema provee feedback adecuado para cada acción del usuario',
      'Los formularios son fáciles de completar y validan en tiempo real',
      'La curva de aprendizaje es baja para usuarios nuevos'
    ]
  },
  {
    id: 'd4', nombre: 'Diseño Visual', desc: 'Jerarquía, tipografía y consistencia',
    criterios: [
      'La jerarquía visual guía correctamente la atención del usuario',
      'La tipografía es legible y consistente en tamaño, peso y línea base',
      'Los colores y espaciados se aplican de forma consistente en todo el producto',
      'Los componentes (botones, inputs, tarjetas) son visualmente homogéneos',
      'El sistema de diseño está bien aplicado y no presenta inconsistencias'
    ]
  },
  {
    id: 'd5', nombre: 'Accesibilidad', desc: 'Contraste, foco y compatibilidad WCAG',
    criterios: [
      'El contraste de texto sobre fondo cumple WCAG 2.1 AA (mínimo 4.5:1)',
      'Todos los elementos interactivos tienen indicadores de foco visibles',
      'Las imágenes informativas incluyen texto alternativo (alt text) descriptivo',
      'El flujo de tabulado con teclado es lógico y completo',
      'Los componentes son compatibles con lectores de pantalla'
    ]
  },
  {
    id: 'd6', nombre: 'Performance', desc: 'Velocidad y respuesta de la interfaz',
    criterios: [
      'El tiempo de carga inicial de la página es inferior a 3 segundos',
      'Las transiciones y animaciones son fluidas y no afectan la interacción',
      'Las imágenes y recursos están optimizados (WebP, lazy loading, etc.)',
      'Las respuestas a acciones del usuario son inmediatas (< 100 ms)',
      'No se observan cuellos de botella ni bloqueos en el hilo principal'
    ]
  },
  {
    id: 'd7', nombre: 'Experiencia Mobile', desc: 'Adaptación responsiva y gestos táctiles',
    criterios: [
      'El layout se adapta correctamente a pantallas pequeñas (< 390 px)',
      'Los targets táctiles tienen un tamaño mínimo de 44×44 pt',
      'Los gestos nativos (deslizar, pellizcar) están implementados donde corresponde',
      'El contenido no requiere zoom horizontal para ser leído',
      'Los formularios activan el teclado correcto según el tipo de campo'
    ]
  },
  {
    id: 'd8', nombre: 'Conversión', desc: 'CTA, formularios y rutas clave de negocio',
    criterios: [
      'Los CTAs principales son visibles, descriptivos y generan urgencia adecuada',
      'El flujo de conversión principal tiene el menor número de pasos posible',
      'Los formularios de conversión son cortos y solo piden datos esenciales',
      'Existe claridad sobre qué ocurrirá tras completar la acción principal',
      'Las métricas de conversión (abandonos, errores) son trazables en el diseño'
    ]
  }
];

var COLORES = ['#00B5E2', '#0033A0', '#3DBA6F', '#FF8C00', '#9B59B6'];

/* ─── ESTADO ─────────────────────────────────────────────────── */
var STATE = {
  paso:      1,
  config:    { nombre: '', analista: '' },
  productos: [
    { id: 1, nombre: 'SURA Investments', imagen: null },
    { id: 2, nombre: '', imagen: null }
  ],
  scores:    {},
  notas:     {},
  fotos:     {},
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
      /* Ensure new fields exist for sessions saved before this version */
      if (!STATE.notas) STATE.notas = {};
      if (!STATE.fotos) STATE.fotos = {};
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
    if (!STATE.notas[d.id])  STATE.notas[d.id]  = {};
    STATE.productos.forEach(function(p) {
      var inp = document.getElementById('score-' + d.id + '-' + p.id);
      if (inp) {
        var val = parseInt(inp.value, 10);
        if (!isNaN(val)) {
          STATE.scores[d.id][p.id] = Math.min(5, Math.max(1, val));
        }
      }
      var nota = document.getElementById('nota-' + d.id + '-' + p.id);
      if (nota) STATE.notas[d.id][p.id] = nota.value;
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
  if (s >= 4) return 'hi';
  if (s >= 3) return 'md';
  return 'lo';
}

function scoreInputClass(s) {
  if (s >= 4) return 'score-input score-high';
  if (s >= 3) return 'score-input score-mid';
  return 'score-input score-low';
}

/* ─── IMÁGENES ───────────────────────────────────────────────── */
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

/* ─── FOTOGRAFÍAS DE EVALUACIÓN ──────────────────────────────── */
function onEvalFotoUpload(dimId, prodId, input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠ Solo se aceptan imágenes');
    input.value = '';
    return;
  }
  resizeImageToBase64(file, 600, 0.80, function(dataUrl) {
    if (!STATE.fotos[dimId]) STATE.fotos[dimId] = {};
    STATE.fotos[dimId][prodId] = dataUrl;
    saveState();
    renderEval();
    showToast('📷 Foto de evidencia cargada');
  });
}

function eliminarEvalFoto(dimId, prodId) {
  if (STATE.fotos[dimId]) {
    delete STATE.fotos[dimId][prodId];
    saveState();
    renderEval();
    showToast('🗑 Foto eliminada');
  }
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

  DIMENSIONES.forEach(function(d, dIdx) {
    var criteriosHtml = d.criterios.map(function(c, i) {
      return '<li class="criterio-item"><span class="criterio-num">' + (i + 1) + '</span>' + escapeHTML(c) + '</li>';
    }).join('');

    html += '<div class="eval-dim-card">';

    /* Dimension header */
    html += '<div class="eval-dim-header">';
    html += '<div class="eval-dim-index">' + (dIdx + 1).toString().padStart(2, '0') + '</div>';
    html += '<div class="eval-dim-info">';
    html += '<div class="eval-dim-name">' + escapeHTML(d.nombre) + '</div>';
    html += '<div class="eval-dim-desc">' + escapeHTML(d.desc) + '</div>';
    html += '</div></div>';

    /* Criteria */
    html += '<div class="eval-criterios">';
    html += '<div class="eval-criterios-label">Criterios de evaluación</div>';
    html += '<ul class="criterios-list">' + criteriosHtml + '</ul>';
    html += '</div>';

    /* Per-product evaluations */
    html += '<div class="eval-prods-grid">';

    productos.forEach(function(p) {
      var stored = STATE.scores[d.id] && STATE.scores[d.id][p.id] !== undefined
        ? STATE.scores[d.id][p.id] : '';
      var cls = stored !== '' ? scoreInputClass(stored) : 'score-input';
      var nota = (STATE.notas[d.id] && STATE.notas[d.id][p.id]) || '';
      var foto = (STATE.fotos[d.id] && STATE.fotos[d.id][p.id]) || null;

      var imgTag = p.imagen
        ? '<img class="eval-prod-mini-thumb" src="' + p.imagen + '" alt="' + escapeHTML(p.nombre) + '">'
        : '';

      var fotoArea;
      if (foto) {
        fotoArea = '<div class="eval-foto-preview">' +
          '<img class="eval-foto-thumb" src="' + foto + '" alt="Evidencia ' + escapeHTML(d.nombre) + '">' +
          '<div class="eval-foto-actions">' +
          '<label class="btn-eval-foto-change" for="efoto-' + d.id + '-' + p.id + '" title="Cambiar foto">🔄 Cambiar</label>' +
          '<button class="btn-eval-foto-remove" onclick="eliminarEvalFoto(\'' + d.id + '\',' + p.id + ')" title="Quitar foto" aria-label="Quitar foto de evidencia">✕</button>' +
          '</div>' +
          '<input type="file" id="efoto-' + d.id + '-' + p.id + '" accept="image/*" class="img-input-hidden" onchange="onEvalFotoUpload(\'' + d.id + '\',' + p.id + ',this)">' +
          '</div>';
      } else {
        fotoArea = '<div class="eval-foto-empty">' +
          '<label class="btn-eval-foto-upload" for="efoto-' + d.id + '-' + p.id + '" title="Subir foto de evidencia">📷 Subir evidencia</label>' +
          '<input type="file" id="efoto-' + d.id + '-' + p.id + '" accept="image/*" class="img-input-hidden" onchange="onEvalFotoUpload(\'' + d.id + '\',' + p.id + ',this)">' +
          '</div>';
      }

      html += '<div class="eval-prod-block">';
      html += '<div class="eval-prod-block-header">' + imgTag + '<span class="eval-prod-block-name">' + escapeHTML(p.nombre) + '</span></div>';

      /* Quantitative score */
      html += '<div class="eval-quant-row">';
      html += '<label class="eval-field-label">Puntuación cuantitativa</label>';
      html += '<div class="eval-score-wrap">';
      html += '<input type="number" id="score-' + d.id + '-' + p.id + '" class="' + cls + '"' +
        ' min="1" max="5" value="' + (stored !== '' ? stored : '') + '" placeholder="—"' +
        ' oninput="onScoreInput(this)" aria-label="' + escapeHTML(d.nombre) + ' — ' + escapeHTML(p.nombre) + '">';
      html += '<div class="eval-score-guide"><span class="sg lo">1–2 Deficiente</span><span class="sg mid">3 Aceptable</span><span class="sg hi">4–5 Destacado</span></div>';
      html += '</div></div>';

      /* Qualitative notes */
      html += '<div class="eval-qual-row">';
      html += '<label class="eval-field-label" for="nota-' + d.id + '-' + p.id + '">Observaciones cualitativas</label>';
      html += '<textarea id="nota-' + d.id + '-' + p.id + '" class="eval-nota-textarea"' +
        ' placeholder="Describe hallazgos, patrones observados, citas del usuario o recomendaciones…"' +
        ' oninput="autoSave()" rows="3">' + escapeHTML(nota) + '</textarea>';
      html += '</div>';

      /* Photo evidence */
      html += '<div class="eval-foto-row">';
      html += '<label class="eval-field-label">Evidencia fotográfica</label>';
      html += fotoArea;
      html += '</div>';

      html += '</div>'; /* /eval-prod-block */
    });

    html += '</div>'; /* /eval-prods-grid */
    html += '</div>'; /* /eval-dim-card */
  });

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
  var maxScore = DIMENSIONES.length * 5;
  var bmNombre = STATE.config.nombre || 'UX Benchmark';
  var fecha    = fechaHoy();

  /* ── Derived analytics ──────────────────────────────── */
  var FAILURE_THRESHOLD = 2; /* score <= this is "failed" */

  /* Dimensions with average score <= threshold across all products */
  var dimsFailed = DIMENSIONES.filter(function(d) {
    var scored = productos.filter(function(p) {
      return STATE.scores[d.id] && STATE.scores[d.id][p.id] !== undefined;
    });
    if (!scored.length) return false;
    var avg = scored.reduce(function(acc, p) {
      return acc + STATE.scores[d.id][p.id];
    }, 0) / scored.length;
    return avg <= FAILURE_THRESHOLD;
  });

  /* Products with total score below 40 % of maximum */
  var productosFailed = productos.filter(function(p) {
    return totales[p.id] < maxScore * 0.4;
  });

  /* Best and worst single dimension (by average across products) */
  var dimAvgs = DIMENSIONES.map(function(d) {
    var scored = productos.filter(function(p) {
      return STATE.scores[d.id] && STATE.scores[d.id][p.id] !== undefined;
    });
    var avg = scored.length
      ? scored.reduce(function(acc, p) { return acc + STATE.scores[d.id][p.id]; }, 0) / scored.length
      : 0;
    return { d: d, avg: avg };
  }).filter(function(x) { return x.avg > 0; });
  var bestDim  = dimAvgs.length ? dimAvgs.slice().sort(function(a, b) { return b.avg - a.avg; })[0] : null;
  var worstDim = dimAvgs.length ? dimAvgs.slice().sort(function(a, b) { return a.avg - b.avg; })[0] : null;
  var winnerPct = Math.round((totales[winner.id] / maxScore) * 100);

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

  /* Table */
  html += '<table class="result-table"><thead><tr><th class="dim-h">Dimensión</th>';
  productos.forEach(function(p) {
    var imgTag = p.imagen
      ? '<div class="result-prod-thumb"><img src="' + p.imagen + '" alt="' + escapeHTML(p.nombre) + '"></div>'
      : '';
    html += '<th>' + imgTag + escapeHTML(p.nombre) + '</th>';
  });
  html += '</tr></thead><tbody>';

  DIMENSIONES.forEach(function(d) {
    var isFailed = dimsFailed.indexOf(d) !== -1;
    html += '<tr' + (isFailed ? ' class="dim-failed-row"' : '') + '>';
    html += '<td class="dim-n">' + (isFailed ? '<span class="failed-badge" title="Dimensión en zona de fracaso">✕</span> ' : '') + escapeHTML(d.nombre) + '</td>';
    productos.forEach(function(p) {
      var s  = (STATE.scores[d.id] && STATE.scores[d.id][p.id] !== undefined) ? STATE.scores[d.id][p.id] : 0;
      var isBest = totales[p.id] === maxTotal;
      var badgeCls = s <= FAILURE_THRESHOLD ? 'score-badge fail' : (isBest ? 'score-badge best' : 'score-badge ' + scoreClass(s));
      html += '<td><span class="' + badgeCls + '">' + (s || '—') + '</span></td>';
    });
    html += '</tr>';
  });

  /* Totals row */
  html += '<tr class="total-row"><td class="dim-n">Total</td>';
  productos.forEach(function(p) {
    var isBest   = totales[p.id] === maxTotal;
    var isFailed = productosFailed.indexOf(p) !== -1;
    var badgeCls = isFailed ? 'score-badge fail' : (isBest ? 'score-badge best' : 'score-badge ' + scoreClass(totales[p.id] / DIMENSIONES.length));
    html += '<td><span class="' + badgeCls + '">' + totales[p.id] + '</span></td>';
  });
  html += '</tr></tbody></table>';

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
    html += '<div class="bar-value">' + totales[p.id] + '</div>';
    html += '</div>';
  });
  html += '</div>';

  /* ── RESUMEN EJECUTIVO ─────────────────────────────── */
  html += '<div class="summary-section">';
  html += '<div class="summary-label">📊 Resumen ejecutivo</div>';
  html += '<div class="summary-insights">';

  html += '<div class="summary-insight highlight">';
  html += '<div class="si-icon">🏆</div>';
  html += '<div class="si-body"><div class="si-title">Producto mejor evaluado</div>';
  html += '<div class="si-text"><strong>' + escapeHTML(winner.nombre) + '</strong> lidera con ' +
    totales[winner.id] + '/' + maxScore + ' puntos (' + winnerPct + '% del máximo posible).</div></div>';
  html += '</div>';

  if (bestDim) {
    html += '<div class="summary-insight positive">';
    html += '<div class="si-icon">✅</div>';
    html += '<div class="si-body"><div class="si-title">Dimensión más fortalecida</div>';
    html += '<div class="si-text"><strong>' + escapeHTML(bestDim.d.nombre) + '</strong> es el área con mejor desempeño (promedio ' + bestDim.avg.toFixed(1) + '/5). ' + escapeHTML(bestDim.d.desc) + '.</div></div>';
    html += '</div>';
  }

  if (worstDim && (!bestDim || worstDim.d.id !== bestDim.d.id)) {
    var worstLevel = worstDim.avg <= FAILURE_THRESHOLD ? 'critical' : 'warning';
    html += '<div class="summary-insight ' + worstLevel + '">';
    html += '<div class="si-icon">' + (worstLevel === 'critical' ? '🔴' : '⚠️') + '</div>';
    html += '<div class="si-body"><div class="si-title">Dimensión con mayor oportunidad de mejora</div>';
    html += '<div class="si-text"><strong>' + escapeHTML(worstDim.d.nombre) + '</strong> muestra el menor promedio (' + worstDim.avg.toFixed(1) + '/5). Priorizar mejoras en: ' + escapeHTML(worstDim.d.desc.toLowerCase()) + '.</div></div>';
    html += '</div>';
  }

  if (dimsFailed.length > 0) {
    html += '<div class="summary-insight critical">';
    html += '<div class="si-icon">🔴</div>';
    html += '<div class="si-body"><div class="si-title">Dimensiones en zona de fracaso</div>';
    html += '<div class="si-text">' + dimsFailed.length + ' dimensión' + (dimsFailed.length > 1 ? 'es' : '') + ' ' +
      'con puntuación media ≤ ' + FAILURE_THRESHOLD + ': <strong>' +
      dimsFailed.map(function(d) { return escapeHTML(d.nombre); }).join(', ') + '</strong>. ' +
      'Requieren atención inmediata antes de continuar el ciclo de diseño.</div></div>';
    html += '</div>';
  }

  if (productosFailed.length > 0) {
    html += '<div class="summary-insight critical">';
    html += '<div class="si-icon">❌</div>';
    html += '<div class="si-body"><div class="si-title">Productos en zona de fracaso</div>';
    html += '<div class="si-text"><strong>' + productosFailed.map(function(p) { return escapeHTML(p.nombre); }).join(', ') + '</strong> ' +
      (productosFailed.length === 1 ? 'obtiene' : 'obtienen') + ' menos del 40 % del puntaje máximo posible, indicando experiencias deficientes que necesitan rediseño prioritario.</div></div>';
    html += '</div>';
  }

  if (dimsFailed.length === 0 && productosFailed.length === 0) {
    html += '<div class="summary-insight positive">';
    html += '<div class="si-icon">✅</div>';
    html += '<div class="si-body"><div class="si-title">Sin dimensiones en fracaso</div>';
    html += '<div class="si-text">Todos los productos superan el umbral mínimo de calidad (> ' + FAILURE_THRESHOLD + '/5 en todas las dimensiones). Continúa iterando para alcanzar la excelencia.</div></div>';
    html += '</div>';
  }

  html += '</div>'; /* /summary-insights */
  html += '</div>'; /* /summary-section */

  /* ── ZONA DE FRACASO ───────────────────────────────── */
  if (dimsFailed.length > 0 || productosFailed.length > 0) {
    html += '<div class="failure-zone">';
    html += '<div class="failure-zone-header">';
    html += '<div class="failure-zone-icon">⚠</div>';
    html += '<div><div class="failure-zone-title">Zona de Fracaso — Requiere acción inmediata</div>';
    html += '<div class="failure-zone-sub">Elementos con puntuación media ≤ ' + FAILURE_THRESHOLD + '/5</div></div>';
    html += '</div>';
    html += '<div class="failure-items">';

    dimsFailed.forEach(function(d) {
      html += '<div class="failure-item">';
      html += '<div class="fi-dim-name">' + escapeHTML(d.nombre) + '</div>';
      html += '<div class="fi-products">';
      productos.forEach(function(p) {
        var s = (STATE.scores[d.id] && STATE.scores[d.id][p.id]) ? STATE.scores[d.id][p.id] : 0;
        if (s <= FAILURE_THRESHOLD) {
          var nota = (STATE.notas[d.id] && STATE.notas[d.id][p.id]) ? STATE.notas[d.id][p.id] : '';
          html += '<div class="fi-product-row">';
          html += '<span class="fi-prod-name">' + escapeHTML(p.nombre) + '</span>';
          html += '<span class="score-badge fail">' + s + '</span>';
          if (nota) html += '<span class="fi-nota">' + escapeHTML(nota) + '</span>';
          html += '</div>';
        }
      });
      html += '</div></div>';
    });

    html += '</div></div>'; /* /failure-items /failure-zone */
  }

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
  var maxScore  = DIMENSIONES.length * 5;
  var lines     = [];

  lines.push('UX BENCHMARK EXPORT');
  lines.push('══════════════════════════════════════');
  lines.push('Benchmark: ' + bmNombre);
  if (STATE.config.analista) lines.push('Analista:  ' + STATE.config.analista);
  lines.push('Fecha:     ' + fechaHoy());
  lines.push('Productos: ' + productos.map(function(p) { return p.nombre; }).join(', '));
  lines.push('');

  /* Quantitative scores table */
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

  /* Qualitative notes */
  var hasNotas = DIMENSIONES.some(function(d) {
    return productos.some(function(p) {
      return STATE.notas[d.id] && STATE.notas[d.id][p.id];
    });
  });
  if (hasNotas) {
    lines.push('');
    lines.push('OBSERVACIONES CUALITATIVAS');
    lines.push('─'.repeat(ROW + COL * productos.length));
    DIMENSIONES.forEach(function(d) {
      var dimHasNota = productos.some(function(p) {
        return STATE.notas[d.id] && STATE.notas[d.id][p.id];
      });
      if (!dimHasNota) return;
      lines.push(d.nombre + ':');
      productos.forEach(function(p) {
        var nota = STATE.notas[d.id] && STATE.notas[d.id][p.id];
        if (nota) lines.push('  [' + p.nombre + '] ' + nota);
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
    fotos:       JSON.parse(JSON.stringify(STATE.fotos)),
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
  STATE.fotos     = sesion.fotos ? JSON.parse(JSON.stringify(sesion.fotos)) : {};
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
  STATE.fotos     = {};
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
  var versionTag = h.version != null ? '<span class="saved-item-version">v' + h.version + '</span>' : '';
    return '<div class="saved-item" onclick="cargarSesion(' + h.id + ')" role="button" tabindex="0"' +
      ' onkeydown="if(event.key===\'Enter\'||event.key===\' \')cargarSesion(' + h.id + ')"' +
      ' title="Cargar sesión: ' + escapeHTML(h.nombre) + '">' +
      '<div class="saved-item-name">' + escapeHTML(h.nombre) + versionTag + '</div>' +
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
