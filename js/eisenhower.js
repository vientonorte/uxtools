/* ── CONSTANTS ──────────────────────────────────────────────── */
var STORAGE_KEY = 'dx-frictions';
var frictions = [];
var currentEditId = null;

/* ── SCORING THRESHOLDS ─────────────────────────────────────── */
function classifyUrgency(score) {
  if (score >= 10) return 'alta';
  if (score >= 7) return 'media';
  return 'baja';
}

function classifyImportance(score) {
  if (score >= 10) return 'alta';
  if (score >= 7) return 'media';
  return 'baja';
}

function getQuadrant(urgency, importance) {
  var urgLevel = classifyUrgency(urgency);
  var impLevel = classifyImportance(importance);
  
  if (urgLevel === 'alta' && impLevel === 'alta') return 'hacer';
  if (impLevel === 'alta') return 'planificar';
  if (urgLevel === 'alta') return 'delegar';
  return 'monitorear';
}

/* ── UTILITIES ───────────────────────────────────────────────── */
function escapeHTML(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str || '')));
  return div.innerHTML;
}

function formatDate(timestamp) {
  var d = new Date(timestamp);
  var day = ('0' + d.getDate()).slice(-2);
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var year = d.getFullYear();
  return day + '/' + month + '/' + year;
}

function loadFrictions() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFrictions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(frictions));
    showSaveStatus();
    return true;
  } catch (e) {
    return false;
  }
}

function showSaveStatus() {
  var el = document.getElementById('save-status');
  if (!el) return;
  el.style.display = 'inline';
  setTimeout(function() {
    el.style.display = 'none';
  }, 2000);
}

/* ── FRICTION CRUD ───────────────────────────────────────────── */
function createFriction(data) {
  var urgencia = parseInt(data.severidad) + parseInt(data.frecuencia) + 
                 parseInt(data.sla) + parseInt(data.bloqueo);
  var importancia = parseInt(data.impactoCliente) + parseInt(data.impactoOperacional) + 
                    parseInt(data.alcance) + parseInt(data.riesgo);
  
  var friction = {
    id: Date.now(),
    fecha: Date.now(),
    equipo: data.equipo,
    friccion: data.friccion,
    tipo: data.tipo,
    evidencia: data.evidencia,
    severidad: parseInt(data.severidad),
    frecuencia: parseInt(data.frecuencia),
    sla: parseInt(data.sla),
    bloqueo: parseInt(data.bloqueo),
    impactoCliente: parseInt(data.impactoCliente),
    impactoOperacional: parseInt(data.impactoOperacional),
    alcance: parseInt(data.alcance),
    riesgo: parseInt(data.riesgo),
    urgencia: urgencia,
    importancia: importancia,
    cuadrante: getQuadrant(urgencia, importancia),
    owner: data.owner,
    estado: data.estado,
    proximaAccion: data.proximaAccion
  };
  
  frictions.unshift(friction);
  saveFrictions();
  return friction;
}

function updateFriction(id, data) {
  var index = frictions.findIndex(function(f) { return f.id === id; });
  if (index === -1) return null;
  
  var urgencia = parseInt(data.severidad) + parseInt(data.frecuencia) + 
                 parseInt(data.sla) + parseInt(data.bloqueo);
  var importancia = parseInt(data.impactoCliente) + parseInt(data.impactoOperacional) + 
                    parseInt(data.alcance) + parseInt(data.riesgo);
  
  frictions[index] = {
    id: id,
    fecha: frictions[index].fecha,
    equipo: data.equipo,
    friccion: data.friccion,
    tipo: data.tipo,
    evidencia: data.evidencia,
    severidad: parseInt(data.severidad),
    frecuencia: parseInt(data.frecuencia),
    sla: parseInt(data.sla),
    bloqueo: parseInt(data.bloqueo),
    impactoCliente: parseInt(data.impactoCliente),
    impactoOperacional: parseInt(data.impactoOperacional),
    alcance: parseInt(data.alcance),
    riesgo: parseInt(data.riesgo),
    urgencia: urgencia,
    importancia: importancia,
    cuadrante: getQuadrant(urgencia, importancia),
    owner: data.owner,
    estado: data.estado,
    proximaAccion: data.proximaAccion
  };
  
  saveFrictions();
  return frictions[index];
}

function deleteFriction(id) {
  frictions = frictions.filter(function(f) { return f.id !== id; });
  saveFrictions();
}

/* ── RENDER ──────────────────────────────────────────────────── */
function renderMatrix() {
  var filters = getFilters();
  var filtered = applyFilters(frictions, filters);
  
  // Clear quadrants
  document.getElementById('quadrant-hacer').innerHTML = '';
  document.getElementById('quadrant-planificar').innerHTML = '';
  document.getElementById('quadrant-delegar').innerHTML = '';
  document.getElementById('quadrant-monitorear').innerHTML = '';
  
  // Render frictions
  filtered.forEach(function(friction) {
    var card = createFrictionCard(friction);
    var quadrantEl = document.getElementById('quadrant-' + friction.cuadrante);
    if (quadrantEl) {
      quadrantEl.appendChild(card);
    }
  });
  
  updateStats(filtered);
  updateTeamFilter();
}

function createFrictionCard(friction) {
  var card = document.createElement('div');
  card.className = 'friction-card';
  card.onclick = function() { showFrictionDetail(friction.id); };
  
  var statusClass = 'status-' + friction.estado;
  
  card.innerHTML = 
    '<div class="friction-header">' +
      '<div class="friction-team">' + escapeHTML(friction.equipo) + '</div>' +
      '<div class="friction-badges">' +
        '<span class="friction-badge badge-type">' + escapeHTML(friction.tipo) + '</span>' +
        '<span class="friction-badge badge-status ' + statusClass + '">' + escapeHTML(friction.estado) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="friction-desc">' + escapeHTML(friction.friccion) + '</div>' +
    '<div class="friction-meta">' +
      '<div class="friction-scores">' +
        '<div class="score-item">' +
          '<span class="score-label">U:</span>' +
          '<span class="score-value">' + friction.urgencia + '</span>' +
        '</div>' +
        '<div class="score-item">' +
          '<span class="score-label">I:</span>' +
          '<span class="score-value">' + friction.importancia + '</span>' +
        '</div>' +
      '</div>' +
      '<div>' + formatDate(friction.fecha) + '</div>' +
    '</div>';
  
  return card;
}

function updateStats(filtered) {
  var stats = {
    hacer: 0,
    planificar: 0,
    delegar: 0,
    monitorear: 0
  };
  
  filtered.forEach(function(f) {
    stats[f.cuadrante]++;
  });
  
  document.getElementById('stat-critical').textContent = stats.hacer;
  document.getElementById('stat-important').textContent = stats.planificar;
  document.getElementById('stat-delegate').textContent = stats.delegar;
  document.getElementById('stat-monitor').textContent = stats.monitorear;
  document.getElementById('stat-total').textContent = filtered.length;
}

function updateTeamFilter() {
  var teams = {};
  frictions.forEach(function(f) {
    teams[f.equipo] = true;
  });
  
  var select = document.getElementById('filter-team');
  var currentValue = select.value;
  select.innerHTML = '<option value="">Todos los equipos</option>';
  
  Object.keys(teams).sort().forEach(function(team) {
    var option = document.createElement('option');
    option.value = team;
    option.textContent = team;
    select.appendChild(option);
  });
  
  select.value = currentValue;
}

/* ── FILTERS ─────────────────────────────────────────────────── */
function getFilters() {
  return {
    team: document.getElementById('filter-team').value,
    type: document.getElementById('filter-type').value,
    status: document.getElementById('filter-status').value
  };
}

function applyFilters(items, filters) {
  return items.filter(function(f) {
    if (filters.team && f.equipo !== filters.team) return false;
    if (filters.type && f.tipo !== filters.type) return false;
    if (filters.status && f.estado !== filters.status) return false;
    return true;
  });
}

/* ── MODAL MANAGEMENT ───────────────────────────────────────── */
function openNewFrictionModal() {
  currentEditId = null;
  document.getElementById('modal-title').textContent = 'Nueva fricción DX';
  document.getElementById('friction-form').reset();
  document.getElementById('friction-modal').classList.add('open');
}

function openEditFrictionModal(id) {
  var friction = frictions.find(function(f) { return f.id === id; });
  if (!friction) return;
  
  currentEditId = id;
  document.getElementById('modal-title').textContent = 'Editar fricción DX';
  
  // Populate form
  document.getElementById('f-equipo').value = friction.equipo;
  document.getElementById('f-friccion').value = friction.friccion;
  document.getElementById('f-tipo').value = friction.tipo;
  document.getElementById('f-evidencia').value = friction.evidencia || '';
  document.getElementById('f-severidad').value = friction.severidad;
  document.getElementById('f-frecuencia').value = friction.frecuencia;
  document.getElementById('f-sla').value = friction.sla;
  document.getElementById('f-bloqueo').value = friction.bloqueo;
  document.getElementById('f-impacto-cliente').value = friction.impactoCliente;
  document.getElementById('f-impacto-operacional').value = friction.impactoOperacional;
  document.getElementById('f-alcance').value = friction.alcance;
  document.getElementById('f-riesgo').value = friction.riesgo;
  document.getElementById('f-owner').value = friction.owner || '';
  document.getElementById('f-estado').value = friction.estado;
  document.getElementById('f-proxima-accion').value = friction.proximaAccion || '';
  
  document.getElementById('friction-modal').classList.add('open');
}

function closeFrictionModal() {
  document.getElementById('friction-modal').classList.remove('open');
  currentEditId = null;
}

function showFrictionDetail(id) {
  var friction = frictions.find(function(f) { return f.id === id; });
  if (!friction) return;
  
  currentEditId = id;
  
  var cuadranteLabels = {
    hacer: '🔴 Hacer ahora',
    planificar: '🟠 Planificar',
    delegar: '🟡 Delegar',
    monitorear: '🟢 Monitorear'
  };
  
  var content = 
    '<div class="detail-section">' +
      '<div class="detail-section-title">Información básica</div>' +
      '<div class="detail-field">' +
        '<div class="detail-label">Equipo afectado</div>' +
        '<div class="detail-value">' + escapeHTML(friction.equipo) + '</div>' +
      '</div>' +
      '<div class="detail-field">' +
        '<div class="detail-label">Descripción</div>' +
        '<div class="detail-value">' + escapeHTML(friction.friccion) + '</div>' +
      '</div>' +
      '<div class="detail-field">' +
        '<div class="detail-label">Tipo de fricción</div>' +
        '<div class="detail-value">' + escapeHTML(friction.tipo) + '</div>' +
      '</div>' +
      (friction.evidencia ? 
        '<div class="detail-field">' +
          '<div class="detail-label">Evidencia</div>' +
          '<div class="detail-value"><a href="' + escapeHTML(friction.evidencia) + '" target="_blank" rel="noopener noreferrer">Ver evidencia ↗</a></div>' +
        '</div>' : '') +
      '<div class="detail-field">' +
        '<div class="detail-label">Fecha de captura</div>' +
        '<div class="detail-value">' + formatDate(friction.fecha) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="detail-section">' +
      '<div class="detail-section-title">Scoring y clasificación</div>' +
      '<div class="detail-scores">' +
        '<div class="detail-score-card">' +
          '<div class="detail-score-value">' + friction.urgencia + '</div>' +
          '<div class="detail-score-label">Urgencia</div>' +
        '</div>' +
        '<div class="detail-score-card">' +
          '<div class="detail-score-value">' + friction.importancia + '</div>' +
          '<div class="detail-score-label">Importancia</div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-field" style="margin-top: 16px;">' +
        '<div class="detail-label">Cuadrante</div>' +
        '<div class="detail-cuadrante ' + friction.cuadrante + '">' + cuadranteLabels[friction.cuadrante] + '</div>' +
      '</div>' +
      '<div class="detail-field">' +
        '<div class="detail-label">Variables de urgencia</div>' +
        '<div class="detail-value">Severidad: ' + friction.severidad + ' · Frecuencia: ' + friction.frecuencia + ' · SLA: ' + friction.sla + ' · Bloqueo: ' + friction.bloqueo + '</div>' +
      '</div>' +
      '<div class="detail-field">' +
        '<div class="detail-label">Variables de importancia</div>' +
        '<div class="detail-value">Impacto cliente: ' + friction.impactoCliente + ' · Impacto operacional: ' + friction.impactoOperacional + ' · Alcance: ' + friction.alcance + ' · Riesgo: ' + friction.riesgo + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="detail-section">' +
      '<div class="detail-section-title">Governance</div>' +
      '<div class="detail-field">' +
        '<div class="detail-label">Owner</div>' +
        '<div class="detail-value">' + (friction.owner ? escapeHTML(friction.owner) : '—') + '</div>' +
      '</div>' +
      '<div class="detail-field">' +
        '<div class="detail-label">Estado</div>' +
        '<div class="detail-value">' + escapeHTML(friction.estado) + '</div>' +
      '</div>' +
      (friction.proximaAccion ?
        '<div class="detail-field">' +
          '<div class="detail-label">Próxima acción</div>' +
          '<div class="detail-value">' + escapeHTML(friction.proximaAccion) + '</div>' +
        '</div>' : '') +
    '</div>';
  
  document.getElementById('detail-content').innerHTML = content;
  document.getElementById('detail-modal').classList.add('open');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('open');
  currentEditId = null;
}

function editCurrentFriction() {
  closeDetailModal();
  if (currentEditId) {
    openEditFrictionModal(currentEditId);
  }
}

/* ── FORM HANDLING ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('friction-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      var formData = {
        equipo: document.getElementById('f-equipo').value.trim(),
        friccion: document.getElementById('f-friccion').value.trim(),
        tipo: document.getElementById('f-tipo').value,
        evidencia: document.getElementById('f-evidencia').value.trim(),
        severidad: document.getElementById('f-severidad').value,
        frecuencia: document.getElementById('f-frecuencia').value,
        sla: document.getElementById('f-sla').value,
        bloqueo: document.getElementById('f-bloqueo').value,
        impactoCliente: document.getElementById('f-impacto-cliente').value,
        impactoOperacional: document.getElementById('f-impacto-operacional').value,
        alcance: document.getElementById('f-alcance').value,
        riesgo: document.getElementById('f-riesgo').value,
        owner: document.getElementById('f-owner').value.trim(),
        estado: document.getElementById('f-estado').value,
        proximaAccion: document.getElementById('f-proxima-accion').value.trim()
      };
      
      if (currentEditId) {
        updateFriction(currentEditId, formData);
      } else {
        createFriction(formData);
      }
      
      closeFrictionModal();
      renderMatrix();
    });
  }
  
  // Filter listeners
  var filterTeam = document.getElementById('filter-team');
  var filterType = document.getElementById('filter-type');
  var filterStatus = document.getElementById('filter-status');
  
  if (filterTeam) filterTeam.addEventListener('change', renderMatrix);
  if (filterType) filterType.addEventListener('change', renderMatrix);
  if (filterStatus) filterStatus.addEventListener('change', renderMatrix);
  
  // Close modal on background click
  document.getElementById('friction-modal').addEventListener('click', function(e) {
    if (e.target === this) closeFrictionModal();
  });
  document.getElementById('detail-modal').addEventListener('click', function(e) {
    if (e.target === this) closeDetailModal();
  });
});

/* ── EXPORT ──────────────────────────────────────────────────── */
function exportToCSV() {
  var filters = getFilters();
  var filtered = applyFilters(frictions, filters);
  
  if (!filtered.length) {
    alert('No hay fricciones para exportar con los filtros actuales.');
    return;
  }
  
  var headers = [
    'ID', 'Fecha', 'Equipo', 'Fricción', 'Tipo', 'Evidencia',
    'Severidad', 'Frecuencia', 'SLA', 'Bloqueo',
    'Impacto Cliente', 'Impacto Operacional', 'Alcance', 'Riesgo',
    'Urgencia', 'Importancia', 'Cuadrante',
    'Owner', 'Estado', 'Próxima Acción'
  ];
  
  var csv = headers.join(',') + '\n';
  
  filtered.forEach(function(f) {
    var row = [
      f.id,
      formatDate(f.fecha),
      '"' + f.equipo.replace(/"/g, '""') + '"',
      '"' + f.friccion.replace(/"/g, '""') + '"',
      f.tipo,
      f.evidencia ? '"' + f.evidencia.replace(/"/g, '""') + '"' : '',
      f.severidad,
      f.frecuencia,
      f.sla,
      f.bloqueo,
      f.impactoCliente,
      f.impactoOperacional,
      f.alcance,
      f.riesgo,
      f.urgencia,
      f.importancia,
      f.cuadrante,
      f.owner ? '"' + f.owner.replace(/"/g, '""') + '"' : '',
      f.estado,
      f.proximaAccion ? '"' + f.proximaAccion.replace(/"/g, '""') + '"' : ''
    ];
    csv += row.join(',') + '\n';
  });
  
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  var url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'dx-frictions-' + Date.now() + '.csv');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
}

/* ── SCROLL ──────────────────────────────────────────────────── */
function scrollToMatrix() {
  var el = document.getElementById('matrix-container');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ── INITIALIZATION ──────────────────────────────────────────── */
frictions = loadFrictions();
renderMatrix();
