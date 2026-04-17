/* ── TAB SWITCHING ─────────────────────────────────────────── */
(function () {
  var tabs = document.querySelectorAll('.product-tab');
  var panels = document.querySelectorAll('.product-panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');

      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');

      panels.forEach(function (p) { p.classList.remove('active'); });
      var targetPanel = document.getElementById('panel-' + target);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
})();
