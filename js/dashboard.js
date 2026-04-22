/* ── DASHBOARD JS ─────────────────────────────────────────── */

function readJSONStorage(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function getBenchmarkSessions() {
  var bmState = readJSONStorage('uxbenchmark-state', {});
  return Array.isArray(bmState.historial) ? bmState.historial : [];
}

function getUxflowSessions() {
  var uxList = readJSONStorage('uxflow-historial', []);
  return Array.isArray(uxList) ? uxList : [];
}

function summarizeBenchmarkSession(session) {
  var dims = Array.isArray(session.dimensiones) && session.dimensiones.length ? session.dimensiones : [];
  var productos = Array.isArray(session.productos) ? session.productos.filter(function (p) { return p && p.nombre; }) : [];
  var maxScore = dims.length * 5;
  var leaderName = 'Sin datos';
  var leaderTotal = 0;

  productos.forEach(function (p) {
    var total = dims.reduce(function (acc, dim) {
      var entry = session.scores && session.scores[dim.id] && session.scores[dim.id][p.id];
      if (typeof entry === 'object' && entry) return acc + (entry.val || 0);
      return acc + (entry || 0);
    }, 0);
    if (total >= leaderTotal) {
      leaderTotal = total;
      leaderName = p.nombre;
    }
  });

  return {
    title: session.nombre || 'Benchmark sin título',
    subtitle: session.analista ? 'Analista: ' + session.analista : 'Benchmark',
    date: session.fecha || '',
    ts: session.id || 0,
    score: leaderTotal && maxScore ? leaderTotal + '/' + maxScore : productos.length + ' productos',
    href: 'benchmark.html',
    type: 'bm',
    meta: leaderName
  };
}

function summarizeUxflowSession(session) {
  var flow = session.flow || {};
  var steps = Array.isArray(flow.steps) ? flow.steps.length : 0;
  var edgeCases = Array.isArray(flow.edgeCases) ? flow.edgeCases.length : 0;
  return {
    title: session.titulo || 'Documento UXFlow',
    subtitle: session.linea || 'UXFlow',
    date: session.fecha || '',
    ts: session.id || 0,
    score: steps ? steps + ' pasos' : 'Documento',
    href: 'uxflow.html',
    type: 'uxf',
    meta: edgeCases ? edgeCases + ' casos borde' : 'Sin casos borde'
  };
}

/* ── GREETING ─── */
(function () {
  var el = document.getElementById('dash-greeting');
  if (!el) return;
  var h = new Date().getHours();
  var saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  var dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var now = new Date();
  var dateStr = dias[now.getDay()] + ' ' + now.getDate() + ' ' + meses[now.getMonth()];
  el.textContent = saludo + ' · ' + dateStr;
})();

/* ── LOAD KPIs FROM localStorage ─── */
(function () {
  var bmSessions = 0;
  var lastAnalista = '—';
  var bmState = readJSONStorage('uxbenchmark-state', {});
  bmSessions = (bmState.historial && bmState.historial.length) || 0;
  if (bmState.config && bmState.config.analista) {
    lastAnalista = bmState.config.analista;
  } else if (bmState.historial && bmState.historial.length) {
    var last = bmState.historial[0];
    if (last.analista) lastAnalista = last.analista;
  }

  var uxDocs = 0;
  var uxList = getUxflowSessions();
  uxDocs = uxList.length;

  var getEl = function (id) { return document.getElementById(id); };
  if (getEl('kpi-benchmarks')) getEl('kpi-benchmarks').textContent = bmSessions;
  if (getEl('kpi-uxflow'))     getEl('kpi-uxflow').textContent     = uxDocs;
  if (getEl('kpi-analista'))   getEl('kpi-analista').textContent   = lastAnalista.length > 12
    ? lastAnalista.substring(0, 12) + '…'
    : lastAnalista;

  if (getEl('meta-bm-sessions'))
    getEl('meta-bm-sessions').textContent = bmSessions + ' ' + (bmSessions === 1 ? 'sesión' : 'sesiones');
  if (bmState.historial && bmState.historial.length) {
    if (getEl('meta-bm-last'))
      getEl('meta-bm-last').textContent = 'Último: ' + bmState.historial[0].fecha;
  }

  if (getEl('meta-ux-docs'))
    getEl('meta-ux-docs').textContent = uxDocs + ' ' + (uxDocs === 1 ? 'documento' : 'documentos');
  if (uxList.length) {
    if (getEl('meta-ux-last'))
      getEl('meta-ux-last').textContent = 'Último: ' + uxList[0].fecha;
  }
})();

/* ── ACTIVITY FEED ─── */
(function () {
  var container = document.getElementById('activity-list');
  if (!container) return;

  var items = [];

  function escapeHTMLDash(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str || '')));
    return d.innerHTML;
  }

  getBenchmarkSessions().forEach(function (h) {
    items.push({
      type:  'bm',
      title: h.nombre || 'Benchmark sin título',
      sub:   h.analista ? 'Analista: ' + h.analista : 'Benchmark',
      date:  h.fecha || '',
      ts:    h.id || 0
    });
  });

  getUxflowSessions().forEach(function (h) {
    items.push({
      type:  'uxf',
      title: h.titulo || 'Documento UXFlow',
      sub:   h.linea || 'UXFlow',
      date:  h.fecha || '',
      ts:    h.id || 0
    });
  });

  if (!items.length) return;

  items.sort(function (a, b) { return b.ts - a.ts; });

  var html = items.slice(0, 10).map(function (item) {
    var badgeLabel = item.type === 'bm' ? 'Benchmark' : 'UXFlow';
    return '<div class="activity-item">' +
      '<div class="activity-dot ' + item.type + '" aria-hidden="true"></div>' +
      '<div class="activity-body">' +
        '<div class="activity-title">' + escapeHTMLDash(item.title) + '</div>' +
        '<div class="activity-sub">' + escapeHTMLDash(item.sub) + '</div>' +
      '</div>' +
      '<span class="activity-badge ' + item.type + '">' + badgeLabel + '</span>' +
      '<span class="activity-date">' + escapeHTMLDash(item.date) + '</span>' +
      '</div>';
  }).join('');

  container.innerHTML = html;
})();

/* ── WORKSPACE RECENT ─── */
(function () {
  var container = document.getElementById('workspace-recent-list');
  if (!container) return;

  var artifacts = getBenchmarkSessions().map(summarizeBenchmarkSession)
    .concat(getUxflowSessions().map(summarizeUxflowSession))
    .sort(function (a, b) { return b.ts - a.ts; });

  if (!artifacts.length) return;

  container.innerHTML = artifacts.slice(0, 5).map(function (item) {
    var icon = item.type === 'bm' ? '📊' : '⚡';
    return '<a class="recent-artifact" href="' + item.href + '">' +
      '<div class="recent-artifact-icon" aria-hidden="true">' + icon + '</div>' +
      '<div class="recent-artifact-body">' +
        '<div class="recent-artifact-title">' + item.title + '</div>' +
        '<div class="recent-artifact-meta">' + item.subtitle + ' · ' + item.date + ' · ' + item.meta + '</div>' +
      '</div>' +
      '<div class="recent-artifact-score">' + item.score + '</div>' +
      '</a>';
  }).join('');
})();

/* ── SEARCH ─── */
(function () {
  var input = document.getElementById('dash-search');
  if (!input) return;
  input.addEventListener('input', function () {
    var q = input.value.toLowerCase().trim();
    var cards = document.querySelectorAll('.module-card');
    cards.forEach(function (card) {
      var text = card.textContent.toLowerCase();
      card.style.opacity = (!q || text.indexOf(q) !== -1) ? '' : '0.3';
    });
    var recents = document.querySelectorAll('.recent-artifact');
    recents.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      item.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    });
    var acts = document.querySelectorAll('.activity-item');
    acts.forEach(function (act) {
      var text = act.textContent.toLowerCase();
      act.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    });
  });
})();

/* ── SCROLL REVEAL ─── */
(function () {
  var fadeEls = document.querySelectorAll('.fade-up');
  if (!fadeEls.length) return;
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    fadeEls.forEach(function (el) { observer.observe(el); });
  } else {
    fadeEls.forEach(function (el) { el.classList.add('visible'); });
  }
})();
