/* ─── ESTADO ─────────────────────────────────────────────── */
var historial = JSON.parse(localStorage.getItem('uxflow-historial') || '[]');

/* ─── UTILIDADES ─────────────────────────────────────────── */
function showToast(msg, delay) {
  delay = delay || 3000;
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, delay);
}

function scrollToApp() {
  document.getElementById('editor').scrollIntoView({ behavior: 'smooth' });
}

function fechaHoy() {
  return new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      return '<span class="flag-pill"><span class="flag-emoji">' + (flags[p] || '🌎') + '</span> ' + p + '</span>';
    }).join('');

    /* Tabla */
    var telefonos = { 'Chile': '+56 2 2000 0000', 'Colombia': '+57 1 555 0000', 'México': '+52 55 5000 0000', 'Perú': null, 'Uruguay': '+598 2 000 0000', 'Argentina': '+54 11 0000 0000' };
    var tbody = document.getElementById('tabla-body');
    tbody.innerHTML = paises.map(function (p) {
      var tel = telefonos[p] || null;
      return tel
        ? '<tr><td>' + p + '</td><td>' + tel + '</td><td><span class="action-pill">Ir al Sitio</span></td></tr>'
        : '<tr class="warn-row"><td>' + p + '</td><td><em>No disponible</em></td><td><span class="action-pill">Ir al Sitio</span></td></tr>';
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
  var item = { titulo: titulo, linea: linea, criterios: criterios, paises: paises, fecha: fechaHoy(), id: Date.now() };
  historial.unshift(item);
  if (historial.length > 20) historial = historial.slice(0, 20);
  localStorage.setItem('uxflow-historial', JSON.stringify(historial));
  renderHistorial();
  showToast('💾 Guardado en historial');
}

function cargarDesdeHistorial(id) {
  var item = historial.find(function (h) { return h.id === id; });
  if (!item) return;
  document.getElementById('titulo').value    = item.titulo;
  document.getElementById('linea').value     = item.linea;
  document.getElementById('criterios').value = item.criterios;
  document.getElementById('paises').value    = item.paises;
  generarDoc();
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
      '<div class="history-card-title">' + h.titulo + '</div>' +
      '<div class="history-card-date">' + h.linea + ' · ' + h.fecha + '</div>' +
      '</div>';
  }).join('');
}

/* ─── INICIALIZACIÓN ──────────────────────────────────────── */
document.getElementById('doc-fecha').textContent   = 'FECHA: ' + fechaHoy();
document.getElementById('canvas-date').textContent = fechaHoy();
renderHistorial();
