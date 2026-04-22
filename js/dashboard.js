/* ── DASHBOARD JS ─────────────────────────────────────────── */

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
  try {
    var bmRaw = localStorage.getItem('uxbenchmark-state');
    if (bmRaw) {
      var bmState = JSON.parse(bmRaw);
      bmSessions = (bmState.historial && bmState.historial.length) || 0;
      if (bmState.config && bmState.config.analista) {
        lastAnalista = bmState.config.analista;
      } else if (bmState.historial && bmState.historial.length) {
        var last = bmState.historial[0];
        if (last.analista) lastAnalista = last.analista;
      }
    }
  } catch (e) { /* pass */ }

  var uxDocs = 0;
  try {
    var uxRaw = localStorage.getItem('uxflow-historial');
    if (uxRaw) {
      var uxList = JSON.parse(uxRaw);
      uxDocs = Array.isArray(uxList) ? uxList.length : 0;
    }
  } catch (e) { /* pass */ }

  var getEl = function (id) { return document.getElementById(id); };
  if (getEl('kpi-benchmarks')) getEl('kpi-benchmarks').textContent = bmSessions;
  if (getEl('kpi-uxflow'))     getEl('kpi-uxflow').textContent     = uxDocs;
  if (getEl('kpi-analista'))   getEl('kpi-analista').textContent   = lastAnalista.length > 12
    ? lastAnalista.substring(0, 12) + '…'
    : lastAnalista;

  if (getEl('meta-bm-sessions'))
    getEl('meta-bm-sessions').textContent = bmSessions + ' ' + (bmSessions === 1 ? 'sesión' : 'sesiones');
  try {
    var bmRaw2 = localStorage.getItem('uxbenchmark-state');
    if (bmRaw2) {
      var bmState2 = JSON.parse(bmRaw2);
      if (bmState2.historial && bmState2.historial.length) {
        if (getEl('meta-bm-last'))
          getEl('meta-bm-last').textContent = 'Último: ' + bmState2.historial[0].fecha;
      }
    }
  } catch (e) { /* pass */ }

  if (getEl('meta-ux-docs'))
    getEl('meta-ux-docs').textContent = uxDocs + ' ' + (uxDocs === 1 ? 'documento' : 'documentos');
  try {
    var uxRaw2 = localStorage.getItem('uxflow-historial');
    if (uxRaw2) {
      var uxList2 = JSON.parse(uxRaw2);
      if (Array.isArray(uxList2) && uxList2.length) {
        if (getEl('meta-ux-last'))
          getEl('meta-ux-last').textContent = 'Último: ' + uxList2[0].fecha;
      }
    }
  } catch (e) { /* pass */ }
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

  try {
    var bmRaw = localStorage.getItem('uxbenchmark-state');
    if (bmRaw) {
      var bmState = JSON.parse(bmRaw);
      if (bmState.historial && bmState.historial.length) {
        bmState.historial.forEach(function (h) {
          items.push({
            type:  'bm',
            title: h.nombre || 'Benchmark sin título',
            sub:   h.analista ? 'Analista: ' + h.analista : 'Benchmark',
            date:  h.fecha || '',
            ts:    h.id || 0
          });
        });
      }
    }
  } catch (e) { /* pass */ }

  try {
    var uxRaw = localStorage.getItem('uxflow-historial');
    if (uxRaw) {
      var uxList = JSON.parse(uxRaw);
      if (Array.isArray(uxList)) {
        uxList.forEach(function (h) {
          items.push({
            type:  'uxf',
            title: h.titulo || 'Documento UXFlow',
            sub:   h.linea || 'UXFlow',
            date:  h.fecha || '',
            ts:    h.id || 0
          });
        });
      }
    }
  } catch (e) { /* pass */ }

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
