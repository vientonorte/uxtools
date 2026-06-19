/* ── SUITE NAV — shared organism for static HTML pages ─────── */
/* Security: external URLs allowlisted; labels from static config only */

(function () {
  var EXTERNAL_LINKS = {
    vientonorte: 'https://vientonorte.github.io/',
    github: 'https://github.com/vientonorte/uxtools',
  };

  var SUITE_MODULES = [
    { id: 'suite', label: 'UX Tools', shortLabel: 'Suite', logo: 'UXT', badge: 'Hub', staticPath: 'index.html' },
    { id: 'benchmark', label: 'UX Benchmark', shortLabel: 'Benchmark', logo: 'BM', badge: 'v2.0', staticPath: 'benchmark.html' },
    { id: 'uxflow', label: 'UXFLOW', shortLabel: 'UXFlow', logo: 'UXF', badge: 'v1.0', staticPath: 'uxflow.html' },
    { id: 'eisenhower', label: 'Operating Model DX', shortLabel: 'DX', logo: 'DX', badge: 'v1.0', staticPath: 'eisenhower.html' },
    { id: 'voc', label: 'Mapa Vocacional', shortLabel: 'VOC', logo: 'VOC', badge: 'v2', staticPath: 'voc.html' },
    { id: 'admin', label: 'Content Manager', shortLabel: 'Admin', logo: 'UXT', badge: 'Admin', staticPath: 'admin.html', variant: 'admin' },
  ];

  var NAV_MODULE_LINKS = SUITE_MODULES.filter(function (m) { return m.id !== 'suite'; });

  function getModule(id) {
    for (var i = 0; i < SUITE_MODULES.length; i++) {
      if (SUITE_MODULES[i].id === id) return SUITE_MODULES[i];
    }
    return SUITE_MODULES[0];
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function buildModuleLinks(activeId, className) {
    return NAV_MODULE_LINKS.map(function (item) {
      var active = item.id === activeId;
      var classes = className + (active ? ' active' : '') + (item.variant === 'admin' ? ' nav-link-admin' : '');
      var prefix = item.variant === 'admin' ? '⚙ ' : '';
      return '<span role="listitem"><a class="' + classes + '" href="' + escapeAttr(item.staticPath) + '"' +
        (active ? ' aria-current="page"' : '') + '>' + prefix + escapeAttr(item.shortLabel) + '</a></span>';
    }).join('');
  }

  function buildDrawerList(activeId) {
    return SUITE_MODULES.map(function (item) {
      var active = item.id === activeId;
      return '<li><a class="nav-drawer-link' + (active ? ' active' : '') + '" href="' + escapeAttr(item.staticPath) + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<span class="nav-drawer-link-logo" aria-hidden="true">' + escapeAttr(item.logo) + '</span>' +
        '<span>' + escapeAttr(item.label) + '</span></a></li>';
    }).join('');
  }

  function bindMenu(nav) {
    var btn = nav.querySelector('.nav-menu-btn');
    var drawer = nav.querySelector('.nav-drawer');
    if (!btn || !drawer) return;

    var panelId = drawer.id;

    function closeMenu() {
      drawer.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Abrir menú de módulos');
      document.body.style.overflow = '';
    }

    function openMenu() {
      drawer.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Cerrar menú de módulos');
      document.body.style.overflow = 'hidden';
      var first = drawer.querySelector('.nav-drawer-link, .nav-drawer-close');
      if (first) first.focus();
    }

    btn.addEventListener('click', function () {
      if (drawer.hidden) openMenu();
      else closeMenu();
    });

    nav.querySelectorAll('.nav-drawer-backdrop, .nav-drawer-close, .nav-drawer-link, .nav-drawer-utility').forEach(function (el) {
      el.addEventListener('click', function () { closeMenu(); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !drawer.hidden) {
        event.preventDefault();
        closeMenu();
        btn.focus();
      }
    });

    btn.setAttribute('aria-controls', panelId);
    btn.setAttribute('aria-expanded', 'false');
  }

  function renderSuiteNav(container) {
    var activeId = container.getAttribute('data-module') || 'suite';
    var showSave = container.getAttribute('data-save-status') === 'true';
    var module = getModule(activeId);
    var drawerId = 'nav-drawer-' + activeId;

    var saveHtml = showSave
      ? '<span class="nav-save-status" id="save-status" role="status" aria-live="polite" title="Estado del guardado">● Auto-guardado</span>'
      : '';

    container.className = 'suite-nav';
    container.setAttribute('aria-label', 'Navegación principal');
    container.innerHTML =
      '<a class="nav-brand" href="index.html" aria-label="' + escapeAttr(module.label) + ' — Inicio">' +
        '<div class="nav-logo" aria-hidden="true">' + escapeAttr(module.logo) + '</div>' +
        '<span class="nav-title">' + escapeAttr(module.label) + '</span>' +
        (module.badge ? '<span class="nav-badge">' + escapeAttr(module.badge) + '</span>' : '') +
      '</a>' +
      '<div class="nav-modules-desktop" role="list" aria-label="Módulos de la suite">' +
        buildModuleLinks(activeId, 'nav-link') +
      '</div>' +
      '<div class="nav-actions">' +
        saveHtml +
        '<a class="nav-link nav-link-utility" href="' + EXTERNAL_LINKS.vientonorte + '" rel="noopener noreferrer">← vientonorte</a>' +
        '<a class="btn-nav" href="' + EXTERNAL_LINKS.github + '" rel="noopener noreferrer">GitHub</a>' +
        '<button type="button" class="nav-menu-btn" aria-label="Abrir menú de módulos">' +
          '<span class="nav-menu-icon" aria-hidden="true"></span>' +
          '<span class="nav-menu-label">Módulos</span>' +
        '</button>' +
      '</div>' +
      '<div id="' + drawerId + '" class="nav-drawer" hidden role="dialog" aria-modal="true" aria-label="Menú de módulos UX Tools">' +
        '<button type="button" class="nav-drawer-backdrop" aria-label="Cerrar menú"></button>' +
        '<div class="nav-drawer-panel">' +
          '<div class="nav-drawer-header">' +
            '<span class="nav-drawer-title">UX Tools Suite</span>' +
            '<button type="button" class="nav-drawer-close">Cerrar</button>' +
          '</div>' +
          '<ul class="nav-drawer-list">' + buildDrawerList(activeId) + '</ul>' +
          '<div class="nav-drawer-footer">' +
            '<a class="nav-drawer-utility" href="' + EXTERNAL_LINKS.vientonorte + '" rel="noopener noreferrer">← vientonorte</a>' +
            '<a class="nav-drawer-utility" href="' + EXTERNAL_LINKS.github + '" rel="noopener noreferrer">GitHub</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    bindMenu(container);
  }

  function initVocNav(container) {
    var drawerId = 'nav-drawer-voc';
    container.className = 'suite-nav';
    container.setAttribute('aria-label', 'Navegación principal');
    container.innerHTML =
      '<a class="nav-brand" href="index.html" aria-label="Mapa Vocacional — Inicio">' +
        '<div class="nav-logo" aria-hidden="true">VOC</div>' +
        '<span class="nav-title">Mapa Vocacional</span>' +
        '<span class="nav-badge">v2</span>' +
      '</a>' +
      '<div class="nav-modules-desktop" role="list" aria-label="Módulos de la suite">' +
        buildModuleLinks('voc', 'nav-link').replace(/<a /g, '<span role="listitem"><a ').replace(/<\/a>/g, '</a></span>') +
      '</div>' +
      '<div class="nav-actions">' +
        '<a class="nav-link nav-link-utility" href="' + EXTERNAL_LINKS.vientonorte + '" rel="noopener noreferrer">← vientonorte</a>' +
        '<button type="button" class="nav-menu-btn" aria-label="Abrir menú de módulos">' +
          '<span class="nav-menu-icon" aria-hidden="true"></span>' +
          '<span class="nav-menu-label">Módulos</span>' +
        '</button>' +
      '</div>' +
      '<div id="' + drawerId + '" class="nav-drawer" hidden role="dialog" aria-modal="true" aria-label="Menú de módulos UX Tools">' +
        '<button type="button" class="nav-drawer-backdrop" aria-label="Cerrar menú"></button>' +
        '<div class="nav-drawer-panel">' +
          '<div class="nav-drawer-header">' +
            '<span class="nav-drawer-title">UX Tools Suite</span>' +
            '<button type="button" class="nav-drawer-close">Cerrar</button>' +
          '</div>' +
          '<ul class="nav-drawer-list">' + buildDrawerList('voc') + '</ul>' +
          '<div class="nav-drawer-footer">' +
            '<a class="nav-drawer-utility" href="' + EXTERNAL_LINKS.vientonorte + '" rel="noopener noreferrer">← vientonorte</a>' +
            '<a class="nav-drawer-utility" href="' + EXTERNAL_LINKS.github + '" rel="noopener noreferrer">GitHub</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    bindMenu(container);
  }

  function init() {
    document.querySelectorAll('[data-suite-nav]').forEach(function (el) {
      if (el.getAttribute('data-theme') === 'voc') initVocNav(el);
      else renderSuiteNav(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.initSuiteNav = renderSuiteNav;
})();