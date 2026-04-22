/* ─── CONSTANTES ─────────────────────────────────────────────── */
var UXFLOW_SCREENSHOT_MAX_DIM = 1200;
var UXFLOW_STORAGE_KEY = 'uxflow-historial';
var MAX_PROMPT_ACTION_CLAUSES = 3;

var historial = readHistory();
var _uxflowScreenshot = null;
var _lastDocModel = null;

var LINEA_COPY = {
  'Wealth Management': 'Soluciones patrimoniales y acompañamiento personalizado para clientes de alto valor.',
  'Investment Management': 'Fondos, portafolios y decisiones de inversión con foco en claridad operativa.',
  'Corporate Solutions': 'Procesos corporativos, cobertura y coordinación entre múltiples actores de negocio.',
  'Otro': 'Flujo transversal con reglas, decisiones y artefactos personalizados.'
};

var COUNTRY_FLAGS = {
  'Chile': '🇨🇱',
  'Colombia': '🇨🇴',
  'México': '🇲🇽',
  'Perú': '🇵🇪',
  'Uruguay': '🇺🇾',
  'Argentina': '🇦🇷',
  'Ecuador': '🇪🇨',
  'Brasil': '🇧🇷'
};

var COUNTRY_PHONES = {
  'Chile': '+56 2 2000 0000',
  'Colombia': '+57 1 555 0000',
  'México': '+52 55 5000 0000',
  'Perú': null,
  'Uruguay': '+598 2 000 0000',
  'Argentina': '+54 11 0000 0000',
  'Ecuador': '+593 2 000 0000',
  'Brasil': '+55 11 4000 0000'
};

/* ─── UTILIDADES ─────────────────────────────────────────────── */
function readHistory() {
  try {
    var raw = localStorage.getItem(UXFLOW_STORAGE_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    return sanitizeHistory(parsed);
  } catch (e) {
    return [];
  }
}

function sanitizeHistory(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(function (item) {
    return item &&
      typeof item === 'object' &&
      Number.isFinite(Number(item.id));
  }).map(function (item) {
    return {
      id: Number(item.id),
      titulo: String(item.titulo || 'Proyecto UX'),
      linea: String(item.linea || 'Otro'),
      criterios: String(item.criterios || ''),
      paises: String(item.paises || ''),
      fecha: String(item.fecha || fechaHoy()),
      screenshot: typeof item.screenshot === 'string' ? item.screenshot : null,
      flow: item.flow && typeof item.flow === 'object' ? item.flow : {}
    };
  });
}

function writeHistory() {
  try {
    localStorage.setItem(UXFLOW_STORAGE_KEY, JSON.stringify(historial));
  } catch (e) {
    /* ignore storage errors */
  }
}

function scrollToApp() {
  document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
}

function setSaveStatus(status) {
  var el = document.getElementById('save-status');
  if (!el) return;
  el.style.display = '';
  if (status === 'saved') {
    el.textContent = '● Guardado';
    el.className = 'nav-save-status';
  } else {
    el.textContent = '○ Sin guardar';
    el.className = 'nav-save-status unsaved';
  }
}

function normalizePrompt(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, ' ')
    .replace(/^\s*\d+[.)]\s+/gm, ' ')
    .replace(/[`*_~#>|]/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim();
}

function titleCase(str) {
  return String(str || '').replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

function uniqueItems(items) {
  var seen = {};
  return items.filter(function (item) {
    var key = String(item || '').toLowerCase();
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function slugToSentence(text) {
  var clean = String(text || '').trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function extractActor(prompt) {
  var match = prompt.match(/yo como\s+([^,.]+?)\s+quiero/i);
  if (match) return titleCase(match[1]);
  if (/negocio/i.test(prompt)) return 'Negocio';
  if (/analista/i.test(prompt)) return 'Analista UX';
  if (/cliente|usuario/i.test(prompt)) return 'Usuario final';
  return 'Equipo UX';
}

function extractGoal(prompt) {
  var match = prompt.match(/quiero\s+([^,.]+?)(?:,|\.| con | para | filtrando | validando |$)/i);
  if (match) return slugToSentence(match[1]);
  return slugToSentence(prompt) || 'Documentar el flujo';
}

function inferCountries(prompt, rawInput) {
  var fromInput = String(rawInput || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean);
  var joined = normalizePrompt(prompt + ' ' + rawInput);
  var catalog = Object.keys(COUNTRY_FLAGS);
  var fromPrompt = catalog.filter(function (country) {
    return new RegExp(country, 'i').test(joined);
  });
  var all = uniqueItems(fromInput.concat(fromPrompt));
  return all.length ? all : ['Chile', 'Colombia', 'México'];
}

function inferLinea(prompt, selected) {
  if (selected && selected !== 'Otro') return selected;
  if (/wealth|patrimonial/i.test(prompt)) return 'Wealth Management';
  if (/investment|invers/i.test(prompt)) return 'Investment Management';
  if (/corporate|empresa|corporativo/i.test(prompt)) return 'Corporate Solutions';
  return selected || 'Otro';
}

function splitPromptClauses(prompt) {
  return uniqueItems(
    normalizePrompt(prompt)
      .split(/\s*(?:,|;|\.| y luego | luego | entonces | para | con | donde )\s*/i)
      .map(function (item) { return item.trim(); })
      .filter(function (item) { return item.length > 8; })
  );
}

function detectEdgeCases(prompt) {
  var cases = [];
  var source = prompt.toLowerCase();
  if (/nulo|null|sin dato|sin datos|vac[ií]o/.test(source)) cases.push('Manejo de datos nulos o vacíos');
  if (/error|fallback|resil|degrad/.test(source)) cases.push('Fallback o recuperación frente a error');
  if (/pa[ií]s/.test(source) && /l[ií]nea/.test(source)) cases.push('Consistencia entre filtros de país y línea');
  if (/valid/.test(source)) cases.push('Validación antes de publicar o renderizar');
  return uniqueItems(cases);
}

function detectSteps(prompt, actor, goal, linea, countries, edgeCases) {
  var source = prompt.toLowerCase();
  var knownDetails = {};
  var steps = [{
    label: 'Inicio',
    detail: actor + ' inicia la solicitud',
    tone: 'dark'
  }];

  if (/actualiz|editar|modific/.test(source)) {
    steps.push({ label: 'Preparar contenido', detail: 'Se identifica el bloque o componente a actualizar', tone: 'light' });
  }
  if (/seleccion|elige|l[ií]nea/.test(source)) {
    steps.push({ label: 'Seleccionar línea', detail: linea, tone: 'light' });
  }
  if (/filtr|pa[ií]s|mercado/.test(source)) {
    steps.push({ label: 'Filtrar países', detail: countries.join(' · '), tone: 'cyan-bg' });
  }
  if (/tabla|listado|contacto|resultado|visualiza|mostrar/.test(source)) {
    steps.push({ label: 'Renderizar salida', detail: 'Se muestra el estado principal con datos disponibles', tone: 'light' });
  }
  if (/valid|integridad|regla/.test(source)) {
    steps.push({ label: 'Validar integridad', detail: 'Se comprueban reglas y consistencia antes del publish', tone: 'light' });
  }
  steps.forEach(function (item) {
    var key = String(item.detail || '').toLowerCase().trim();
    if (key) knownDetails[key] = true;
  });
  splitPromptClauses(prompt).slice(0, MAX_PROMPT_ACTION_CLAUSES).forEach(function (clause) {
    var action = slugToSentence(
      clause
        .replace(/^yo como\s+[^,.]+?\s+quiero\s+/i, '')
        .replace(/^quiero\s+/i, '')
        .trim()
    );
    var actionKey = action.toLowerCase();
    if (!action || actionKey === goal.toLowerCase() || knownDetails[actionKey]) return;
    knownDetails[actionKey] = true;
    steps.push({ label: 'Acción', detail: action, tone: 'light' });
  });
  if (!steps.some(function (item) { return item.label === 'Renderizar salida'; })) {
    steps.push({ label: 'Resolver flujo', detail: goal, tone: 'cyan-bg' });
  }
  edgeCases.forEach(function (item) {
    steps.push({ label: 'Caso borde', detail: item, tone: 'warning' });
  });
  steps.push({
    label: 'Resultado',
    detail: goal,
    tone: edgeCases.length ? 'light' : 'dark'
  });

  return steps;
}

function buildCriteria(goal, linea, countries, edgeCases, prompt) {
  var criteria = [
    'La acción principal queda documentada como "' + goal + '".',
    'La línea activa para el flujo es "' + linea + '" y se refleja en la salida.',
    'Los países contemplados en el flujo son ' + countries.join(', ') + '.',
    'La interfaz comunica estados, validaciones y resultado final sin ambigüedad.'
  ];

  if (/contacto|tabla|listado/.test(prompt.toLowerCase())) {
    criteria.push('La estructura de tabla conserva jerarquía visual y CTA incluso cuando faltan datos.');
  }
  if (/filtro|filtr/.test(prompt.toLowerCase())) {
    criteria.push('Los filtros impactan el resultado sin desalinear contenido, tabs o copy contextual.');
  }
  edgeCases.forEach(function (item) {
    criteria.push('Existe manejo explícito para: ' + item + '.');
  });

  return uniqueItems(criteria).slice(0, 6);
}

function buildFlowModel() {
  var tituloInput = document.getElementById('titulo').value || 'Proyecto UX';
  var prompt = normalizePrompt(document.getElementById('criterios').value);
  var countries = inferCountries(prompt, document.getElementById('paises').value);
  var linea = inferLinea(prompt, document.getElementById('linea').value);
  var actor = extractActor(prompt);
  var goal = extractGoal(prompt);
  var edgeCases = detectEdgeCases(prompt);
  var steps = detectSteps(prompt, actor, goal, linea, countries, edgeCases);
  var criteria = buildCriteria(goal, linea, countries, edgeCases, prompt);

  return {
    title: tituloInput,
    actor: actor,
    goal: goal,
    linea: linea,
    countries: countries,
    prompt: prompt,
    edgeCases: edgeCases,
    steps: steps,
    criteria: criteria,
    tabDescription: LINEA_COPY[linea] || LINEA_COPY.Otro
  };
}

/* ─── RENDER ─────────────────────────────────────────────────── */
function renderOverview(model) {
  var container = document.getElementById('doc-overview');
  if (!container) return;
  container.innerHTML =
    '<div class="doc-overview-card">' +
      '<div class="doc-overview-label">Actor</div>' +
      '<div class="doc-overview-value">' + escapeHTML(model.actor) + '</div>' +
      '<div class="doc-overview-meta">Origen del requerimiento que activa el flujo.</div>' +
    '</div>' +
    '<div class="doc-overview-card">' +
      '<div class="doc-overview-label">Objetivo</div>' +
      '<div class="doc-overview-value">' + model.steps.length + '</div>' +
      '<div class="doc-overview-meta">' + escapeHTML(model.goal) + '</div>' +
    '</div>' +
    '<div class="doc-overview-card">' +
      '<div class="doc-overview-label">Mercados</div>' +
      '<div class="doc-overview-value">' + model.countries.length + '</div>' +
      '<div class="doc-overview-meta">' + escapeHTML(model.countries.join(', ')) + '</div>' +
    '</div>' +
    '<div class="doc-overview-card">' +
      '<div class="doc-overview-label">Casos borde</div>' +
      '<div class="doc-overview-value">' + model.edgeCases.length + '</div>' +
      '<div class="doc-overview-meta">' + escapeHTML(model.edgeCases.join(' · ') || 'Sin alertas críticas detectadas') + '</div>' +
    '</div>';
}

function renderFlow(model) {
  var container = document.getElementById('flow-steps');
  if (!container) return;
  var html = '';
  model.steps.forEach(function (step, index) {
    html += '<div class="flow-step ' + step.tone + '">' +
      escapeHTML(step.label) +
      (step.detail ? '<div class="flow-sub">' + escapeHTML(step.detail) + '</div>' : '') +
      '</div>';
    if (index < model.steps.length - 1) html += '<div class="flow-connector"></div>';
  });
  container.innerHTML = html;
}

function renderCriteria(model) {
  var container = document.getElementById('criteria-list');
  if (!container) return;
  container.innerHTML = model.criteria.map(function (item) {
    return '<div class="criteria-item">' + escapeHTML(item) + '</div>';
  }).join('');
}

function renderTabs(model) {
  var tabRow = document.getElementById('tab-row');
  var pillBox = document.getElementById('flag-pills');
  var tabContent = document.querySelector('.tab-desc');
  if (!tabRow || !pillBox || !tabContent) return;

  var tabs = ['Wealth Management', 'Investment Management', 'Corporate Solutions'];
  if (tabs.indexOf(model.linea) === -1) tabs.unshift(model.linea);
  tabRow.innerHTML = tabs.slice(0, 4).map(function (tab, index) {
    var isActive = tab === model.linea || (index === 0 && tabs.indexOf(model.linea) === -1);
    return '<div class="tab-item' + (isActive ? ' active' : '') + '">' + escapeHTML(tab) + '</div>';
  }).join('');

  tabContent.textContent = model.tabDescription;
  pillBox.innerHTML = model.countries.slice(0, 5).map(function (country) {
    return '<span class="flag-pill"><span class="flag-emoji">' + (COUNTRY_FLAGS[country] || '🌎') + '</span>' + escapeHTML(country) + '</span>';
  }).join('');
}

function renderTable(model) {
  var tbody = document.getElementById('tabla-body');
  var note = document.querySelector('.warn-note');
  if (!tbody || !note) return;
  var missingCount = 0;
  tbody.innerHTML = model.countries.map(function (country) {
    var phone = COUNTRY_PHONES[country] || null;
    if (!phone) missingCount++;
    return phone
      ? '<tr><td>' + escapeHTML(country) + '</td><td>' + escapeHTML(phone) + '</td><td><span class="action-pill">Ir al sitio</span></td></tr>'
      : '<tr class="warn-row"><td>' + escapeHTML(country) + '</td><td><em>No disponible</em></td><td><span class="action-pill">Fallback</span></td></tr>';
  }).join('');

  note.textContent = missingCount
    ? '⚠ ' + missingCount + ' mercado(s) requieren fallback o tratamiento de datos faltantes.'
    : '✓ La estructura principal mantiene datos completos en los mercados considerados.';
}

function renderAnalytics(model) {
  var bars = document.querySelectorAll('.bar-col .bar');
  var labels = document.querySelectorAll('.bar-col .bar-label');
  var active = ['WM', 'IM', 'CS', 'OPS'];
  var baseHeights = [92, 70, 54, 36];
  var bias = Math.min(model.countries.length * 4, 16);
  for (var i = 0; i < bars.length; i++) {
    var bar = bars[i];
    var label = labels[i];
    if (!bar || !label) continue;
    bar.style.height = Math.max(20, baseHeights[i] + (i === 0 ? bias : Math.round(bias / (i + 1)))) + '%';
    if (i === 0) label.textContent = model.linea === 'Wealth Management' ? 'WM' :
      model.linea === 'Investment Management' ? 'IM' :
      model.linea === 'Corporate Solutions' ? 'CS' : active[i];
  }

  var total = model.countries.length || 1;
  var complete = model.countries.filter(function (country) { return !!COUNTRY_PHONES[country]; }).length;
  var penalty = model.edgeCases.length * 6;
  var pct = Math.max(18, Math.min(98, Math.round((complete / total) * 100) - penalty));
  var circle = document.getElementById('donut-circle');
  var pctEl = document.getElementById('donut-pct');
  if (circle && pctEl) {
    var circum = 2 * Math.PI * 28;
    circle.setAttribute('stroke-dasharray', circum);
    circle.setAttribute('stroke-dashoffset', circum * (1 - pct / 100));
    pctEl.textContent = pct + '%';
  }
}

function renderDoc(model) {
  _lastDocModel = model;
  document.getElementById('doc-titulo').textContent = model.title.toUpperCase();
  document.getElementById('doc-fecha').textContent = 'FECHA: ' + fechaHoy();
  document.getElementById('canvas-date').textContent = fechaHoy();
  renderOverview(model);
  renderFlow(model);
  renderCriteria(model);
  renderTabs(model);
  renderTable(model);
  renderAnalytics(model);
}

/* ─── GENERACIÓN DE DOC ─────────────────────────────────────── */
function generarDoc(options) {
  var settings = options || {};
  var btn = document.getElementById('btn-gen');
  var app = document.getElementById('editor');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Generando…';
  }
  if (app) app.classList.add('loading');

  var model = buildFlowModel();

  setTimeout(function () {
    renderDoc(model);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚡ Generar documentación';
    }
    if (app) app.classList.remove('loading');
    setSaveStatus(settings.preserveStatus ? 'saved' : 'unsaved');
    showToast(settings.toastMessage || '✅ Flujo y documentación regenerados desde el prompt');
  }, 420);
}

/* ─── EXPORT ────────────────────────────────────────────────── */
function copiarFigma() {
  var model = _lastDocModel || buildFlowModel();
  var lines = [
    'UXFLOW Export',
    '──────────────',
    'Proyecto: ' + model.title,
    'Línea: ' + model.linea,
    'Actor: ' + model.actor,
    'Objetivo: ' + model.goal,
    'Países: ' + model.countries.join(', '),
    'Pasos: ' + model.steps.map(function (step) { return step.label; }).join(' → '),
    '──────────────',
    'Generado con vientonorte/uxflow'
  ];
  navigator.clipboard.writeText(lines.join('\n'))
    .then(function () { showToast('📋 Copiado. Artefacto listo para Figma o QA.'); })
    .catch(function () { showToast('⚠ No se pudo copiar. Usa copiar manual.'); });
}

/* ─── HISTORIAL ─────────────────────────────────────────────── */
function guardarHistorial() {
  var model = _lastDocModel || buildFlowModel();
  var item = {
    titulo: model.title,
    linea: model.linea,
    criterios: model.prompt,
    paises: model.countries.join(', '),
    fecha: fechaHoy(),
    id: Date.now(),
    screenshot: _uxflowScreenshot || null,
    flow: {
      actor: model.actor,
      goal: model.goal,
      steps: model.steps,
      criteria: model.criteria,
      edgeCases: model.edgeCases
    }
  };
  historial.unshift(item);
  if (historial.length > 20) historial = historial.slice(0, 20);
  writeHistory();
  renderHistorial();
  showToast('💾 Activo guardado en historial');
  setSaveStatus('saved');
}

function cargarDesdeHistorial(id) {
  var item = historial.find(function (entry) { return entry.id === id; });
  if (!item) return;
  document.getElementById('titulo').value = item.titulo || 'Proyecto UX';
  document.getElementById('linea').value = item.linea || 'Otro';
  document.getElementById('criterios').value = item.criterios || '';
  document.getElementById('paises').value = item.paises || '';
  _uxflowScreenshot = item.screenshot || null;
  renderDocScreenshot(_uxflowScreenshot);
  renderUxflowScreenshotPreview(_uxflowScreenshot);
  generarDoc({
    preserveStatus: true,
    toastMessage: '📂 Activo restaurado desde historial'
  });
  document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
}

function renderHistorial() {
  var grid = document.getElementById('history-grid');
  if (!grid) return;
  if (!historial.length) {
    grid.innerHTML = '<div class="empty-history">Sin activos guardados aún. Genera y guarda tu primer documento.</div>';
    return;
  }
  grid.innerHTML = historial.map(function (item) {
    var flow = item.flow || {};
    var steps = Array.isArray(flow.steps) ? flow.steps.length : 0;
    var edgeCases = Array.isArray(flow.edgeCases) ? flow.edgeCases.length : 0;
    return '<div class="history-card" onclick="cargarDesdeHistorial(' + item.id + ')">' +
      '<div class="history-card-title">' + escapeHTML(item.titulo) + '</div>' +
      '<div class="history-card-date">' + escapeHTML(item.linea) + ' · ' + escapeHTML(item.fecha) + '</div>' +
      '<div class="history-card-meta">' +
        '<span class="history-chip">' + (steps || '0') + ' pasos</span>' +
        '<span class="history-chip">' + (edgeCases || '0') + ' casos borde</span>' +
      '</div>' +
      '</div>';
  }).join('');
}

/* ─── SCREENSHOT ────────────────────────────────────────────── */
function onUxflowScreenshot(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠ Solo se aceptan imágenes');
    input.value = '';
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var w = img.width;
      var h = img.height;
      var scale = Math.min(1, UXFLOW_SCREENSHOT_MAX_DIM / Math.max(w, h));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      _uxflowScreenshot = canvas.toDataURL('image/jpeg', 0.82);
      renderUxflowScreenshotPreview(_uxflowScreenshot);
      renderDocScreenshot(_uxflowScreenshot);
      setSaveStatus('unsaved');
      showToast('📷 Captura adjuntada al documento');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderUxflowScreenshotPreview(dataUrl) {
  var preview = document.getElementById('uxflow-screenshot-preview');
  if (!preview) return;
  if (!dataUrl) {
    preview.innerHTML = '';
    return;
  }
  preview.innerHTML = '<img src="' + dataUrl + '" alt="Vista previa de la captura"' +
    ' style="max-width:100%;max-height:80px;border-radius:6px;border:1px solid rgba(0,181,226,0.4);display:block;margin-top:4px;">';
}

function renderDocScreenshot(dataUrl) {
  var display = document.getElementById('uxflow-doc-screenshot');
  if (!display) return;
  if (!dataUrl) {
    display.style.display = 'none';
    display.innerHTML = '';
    return;
  }
  display.style.display = 'block';
  display.innerHTML =
    '<div class="uxflow-ss-header">' +
      '<span>📷 Captura de pantalla del flujo</span>' +
      '<button class="uxflow-ss-remove" onclick="removeUxflowScreenshot()" aria-label="Quitar captura" title="Quitar">✕</button>' +
    '</div>' +
    '<img class="uxflow-screenshot-img" src="' + dataUrl + '" alt="Captura de pantalla del flujo UX">';
}

function removeUxflowScreenshot() {
  _uxflowScreenshot = null;
  renderDocScreenshot(null);
  renderUxflowScreenshotPreview(null);
  var input = document.getElementById('uxflow-screenshot');
  if (input) input.value = '';
  setSaveStatus('unsaved');
  showToast('🗑 Captura eliminada');
}

/* ─── PDF EXPORT ────────────────────────────────────────────── */
function exportarPDF() {
  window.print();
}

/* ─── EVENTOS E INIT ────────────────────────────────────────── */
function bindDirtyState() {
  ['titulo', 'linea', 'criterios', 'paises'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () { setSaveStatus('unsaved'); });
    el.addEventListener('change', function () { setSaveStatus('unsaved'); });
  });
}

document.getElementById('doc-fecha').textContent = 'FECHA: ' + fechaHoy();
document.getElementById('canvas-date').textContent = fechaHoy();
bindDirtyState();
renderHistorial();
renderDocScreenshot(null);
generarDoc();
if (historial.length) setSaveStatus('saved');
