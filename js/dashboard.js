/* ── TAB SWITCHING ─────────────────────────────────────────── */
(function () {
  var tabs = document.querySelectorAll('.product-tab');
  var panels = document.querySelectorAll('.product-panel');

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
      var targetPanel = document.getElementById('panel-' + target);
      if (targetPanel) targetPanel.classList.add('active');
    });

    /* Keyboard navigation between tabs */
    tab.addEventListener('keydown', function (e) {
      var tabsArr = Array.prototype.slice.call(tabs);
      var idx = tabsArr.indexOf(tab);
      var next;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = tabsArr[(idx + 1) % tabsArr.length];
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = tabsArr[(idx - 1 + tabsArr.length) % tabsArr.length];
      }

      if (next) {
        next.focus();
        next.click();
      }
    });
  });
})();

/* ── SCROLL REVEAL ──────────────────────────────────────── */
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
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeEls.forEach(function (el) { observer.observe(el); });
  } else {
    /* Fallback: show all immediately */
    fadeEls.forEach(function (el) { el.classList.add('visible'); });
  }
})();
