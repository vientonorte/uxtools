/* ─── ESTADO ─────────────────────────────────────────────── */
var historial;
try {
  historial = JSON.parse(localStorage.getItem('uxflow-historial') || '[]');
} catch (e) {
  historial = [];
}

/* Current screenshot dataUrl (not persisted until "Guardar") */
var _uxflowScreenshot = null;

/* ─── UTILIDADES ─── ver js/utils.js ─────────────────────────── */

function scrollToApp() {
  document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
}

/* ─── ESTADO GUARDADO ─────────────────────────────────────── */
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

/* ─── GENERACIÓN DE DOC ──────────────────────────────────── */
function generarDoc() {
  var titulo    = document.getElementById('titulo').value || 'Proyecto UX';
  var linea     = document.getElementById('linea').value;
  var paisesRaw = document.getElementById('paises').value;
  var criterios = document.getElementById('criterios').value;
  var paises    = paisesRaw.split(',').map(function (p) { return p.trim(); }).filter(Boolean);

  /* Loading state */
  var btn = document.getElementById('btn-gen');
  btn.disabled = true;
  btn.textContent = 'Generando…';

  setTimeout(function () {
    /* Título */
    document.getElementById('doc-titulo').textContent = titulo.toUpperCase();
    document.getElementById('doc-fecha').textContent = 'FECHA: ' + fechaHoy();
    document.getElementById('canvas-date').textContent = fechaHoy();

    /* Tabs */
    var tabs = ['Wealth Management', 'Investment Mgmt', 'Corporate'];
    var tabRow = document.getElementById('tab-row');
    tabRow.innerHTML = '';
    tabs.forEach(function (t, i) {
      var d = document.createElement('div');
      d.className = 'tab-item' + (i === 0 ? ' active' : '');
      d.textContent = t;
      tabRow.appendChild(d);
    });

    /* Banderas */
    var flags = { 'Chile': '🇨🇱', 'Colombia': '🇨🇴', 'México': '🇲🇽', 'Perú': '🇵🇪', 'Uruguay': '🇺🇾', 'Argentina': '🇦🇷', 'Ecuador': '🇪🇨', 'Brasil': '🇧🇷' };
    var pillBox = document.getElementById('flag-pills');
    pillBox.innerHTML = paises.slice(0, 4).map(function (p) {
      var safe = escapeHTML(p);
      return '<span class="flag-pill"><span class="flag-emoji">' + (flags[p] || '🌎') + '</span> ' + safe + '</span>';
    }).join('');

    /* Tabla */
    var telefonos = { 'Chile': '+56 2 2000 0000', 'Colombia': '+57 1 555 0000', 'México': '+52 55 5000 0000', 'Perú': null, 'Uruguay': '+598 2 000 0000', 'Argentina': '+54 11 0000 0000' };
    var tbody = document.getElementById('tabla-body');
    tbody.innerHTML = paises.map(function (p) {
      var safe = escapeHTML(p);
      var tel = telefonos[p] || null;
      return tel
        ? '<tr><td>' + safe + '</td><td>' + escapeHTML(tel) + '</td><td><span class="action-pill">Ir al Sitio</span></td></tr>'
        : '<tr class="warn-row"><td>' + safe + '</td><td><em>No disponible</em></td><td><span class="action-pill">Ir al Sitio</span></td></tr>';
    }).join('');

    /* Donut adaptivo */
    var total     = paises.length || 1;
    var completos = paises.filter(function (p) { return telefonos[p]; }).length;
    var pct       = Math.round((completos / total) * 100);
    document.getElementById('donut-pct').textContent = pct + '%';
    var circum = 2 * Math.PI * 28;
    var offset = circum * (1 - pct / 100);
    document.getElementById('donut-circle').setAttribute('stroke-dasharray', circum);
    document.getElementById('donut-circle').setAttribute('stroke-dashoffset', offset);

    btn.disabled = false;
    btn.textContent = '⚡ Generar documentación';
    showToast('✅ Documentación generada');
  }, 700);
}

/* ─── COPIAR PARA FIGMA ──────────────────────────────────── */
function copiarFigma() {
  var titulo = document.getElementById('doc-titulo').textContent;
  var linea  = document.getElementById('linea').value;
  var fecha  = fechaHoy();
  var texto  = 'UXFLOW Export\n──────────────\nProyecto: ' + titulo + '\nLínea: ' + linea + '\nFecha: ' + fecha + '\nStatus: FINAL_UX_REVIEW\n──────────────\nGenerado con vientonorte/uxflow';
  navigator.clipboard.writeText(texto)
    .then(function () { showToast('📋 Copiado. ¡Listo para Figma!'); })
    .catch(function () { showToast('⚠ No se pudo copiar. Usa Ctrl+C.'); });
}

/* ─── HISTORIAL ──────────────────────────────────────────── */
function guardarHistorial() {
  var titulo    = document.getElementById('titulo').value || 'Sin título';
  var linea     = document.getElementById('linea').value;
  var criterios = document.getElementById('criterios').value;
  var paises    = document.getElementById('paises').value;
  var item = { titulo: titulo, linea: linea, criterios: criterios, paises: paises, fecha: fechaHoy(), id: Date.now(), screenshot: _uxflowScreenshot || null };
  historial.unshift(item);
  if (historial.length > 20) historial = historial.slice(0, 20);
  try {
    localStorage.setItem('uxflow-historial', JSON.stringify(historial));
  } catch (e) {
    /* Storage may be full or unavailable (private browsing) */
  }
  renderHistorial();
  showToast('💾 Guardado en historial');
  setSaveStatus('saved');
}

function cargarDesdeHistorial(id) {
  var item = historial.find(function (h) { return h.id === id; });
  if (!item) return;
  document.getElementById('titulo').value    = item.titulo;
  document.getElementById('linea').value     = item.linea;
  document.getElementById('criterios').value = item.criterios;
  document.getElementById('paises').value    = item.paises;
  _uxflowScreenshot = item.screenshot || null;
  generarDoc();
  renderDocScreenshot(_uxflowScreenshot);
  renderUxflowScreenshotPreview(_uxflowScreenshot);
  document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
}

function renderHistorial() {
  var grid = document.getElementById('history-grid');
  if (!historial.length) {
    grid.innerHTML = '<div class="empty-history">Sin activos guardados aún. Genera y guarda tu primer documento.</div>';
    return;
  }
  grid.innerHTML = historial.map(function (h) {
    return '<div class="history-card" onclick="cargarDesdeHistorial(' + h.id + ')">' +
      '<div class="history-card-title">' + escapeHTML(h.titulo) + '</div>' +
      '<div class="history-card-date">' + escapeHTML(h.linea) + ' · ' + escapeHTML(h.fecha) + '</div>' +
      '</div>';
  }).join('');
}

/* ─── SCREENSHOT (adjunta al documento) ──────────────────── */
function onUxflowScreenshot(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠ Solo se aceptan imágenes');
    input.value = '';
    return;
  }
  /* Reuse resizeImageToBase64 from benchmark.js if available, else use FileReader directly */
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var maxDim = 1200;
      var w = img.width, h = img.height;
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      _uxflowScreenshot = canvas.toDataURL('image/jpeg', 0.82);
      renderUxflowScreenshotPreview(_uxflowScreenshot);
      renderDocScreenshot(_uxflowScreenshot);
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
  showToast('🗑 Captura eliminada');
}

/* ─── PDF EXPORT ─────────────────────────────────────────── */
function exportarPDF() {
  window.print();
}

/* ─── INICIALIZACIÓN ──────────────────────────────────────── */
document.getElementById('doc-fecha').textContent   = 'FECHA: ' + fechaHoy();
document.getElementById('canvas-date').textContent = fechaHoy();
renderHistorial();
if (historial.length) setSaveStatus('saved');
