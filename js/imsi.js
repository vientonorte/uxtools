/* ─────────────────────────────────────────────────────────────
   RF RECON CONSOLE — js/imsi.js
   Blueprint UX para operación SIGINT (tipo IMSI catcher).

   ⚠ IMPORTANTE: Esta es una MAQUETA / PROTOTIPO de interfaz.
   No controla hardware SDR, no emite ni captura radiofrecuencia,
   no intercepta comunicaciones. Toda la data (IMSI/IMEI/TMSI,
   espectro, distancias) es SINTÉTICA, generada localmente para
   demostrar la experiencia de usuario y las reglas de UX crítica.
   No hay backend ni telemetría: localStorage solo en cliente.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var STORAGE_KEY = 'uxtools.imsi.session.v1';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Estado de la misión ──────────────────────────────────── */
  var state = {
    phase: 3, // arranca en la consola de operación (núcleo)
    bands: { '2G': true, '3G': true, '4G': true, '5G': false },
    txPower: 24,      // dBm (simulado)
    gain: 42,         // dB ganancia de antena
    cell: { mcc: '730', mnc: '01', lac: '20451', tac: '17002' },
    mode: 'passive',  // 'passive' | 'active'
    silent: false,
    captures: [],     // identidades simuladas
    frozenId: null,
    filter: 'all',    // all | white | target | catch
    whitelist: ['730011234500001', '730011234500002'],
    targets: ['730019988770100']
  };

  /* ── Catálogo de operadores (MCC/MNC → nombre) para realismo ── */
  var OPERATORS = {
    '730-01': { c: 'CL', n: 'Entel' },
    '730-02': { c: 'CL', n: 'Movistar' },
    '730-03': { c: 'CL', n: 'Claro' },
    '730-09': { c: 'CL', n: 'WOM' },
    '722-310': { c: 'AR', n: 'Claro AR' },
    '724-11': { c: 'BR', n: 'Vivo BR' },
    '310-260': { c: 'US', n: 'T-Mobile' }
  };
  var OPERATOR_KEYS = Object.keys(OPERATORS);
  var DEVICE_MODELS = [
    'Apple iPhone 14', 'Apple iPhone 15 Pro', 'Samsung Galaxy S23',
    'Samsung A54', 'Xiaomi Redmi 12', 'Motorola G84', 'Google Pixel 8',
    'Huawei P60', 'Oppo Reno 10', '— (no resuelto)'
  ];
  var RAT = ['2G', '3G', '4G', '5G'];

  /* ── Helpers ──────────────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
  function pad(n, len) { var s = String(n); while (s.length < len) s = '0' + s; return s; }

  function genImsi() {
    // MCC(3) + MNC(2) + MSIN(10) — totalmente aleatorio
    return '730' + pad(rnd(1, 9), 2) + pad(rnd(0, 9999999999), 10);
  }
  function genImei() {
    return pad(rnd(10000000, 99999999), 8) + pad(rnd(0, 9999999), 7);
  }
  function genTmsi() {
    var hex = '0123456789ABCDEF';
    var s = '';
    for (var i = 0; i < 8; i++) s += hex[rnd(0, 15)];
    return '0x' + s;
  }

  /* ── Persistencia (localStorage, fuente de verdad de config) ── */
  function saveSession() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        bands: state.bands, txPower: state.txPower, gain: state.gain,
        cell: state.cell, mode: state.mode, silent: state.silent,
        whitelist: state.whitelist, targets: state.targets
      }));
    } catch (e) { /* storage lleno o no disponible: degradación silenciosa */ }
  }
  function loadSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d.bands) state.bands = d.bands;
      if (typeof d.txPower === 'number') state.txPower = d.txPower;
      if (typeof d.gain === 'number') state.gain = d.gain;
      if (d.cell) state.cell = d.cell;
      if (d.mode) state.mode = d.mode;
      if (typeof d.silent === 'boolean') state.silent = d.silent;
      if (Array.isArray(d.whitelist)) state.whitelist = d.whitelist;
      if (Array.isArray(d.targets)) state.targets = d.targets;
    } catch (e) { /* json corrupto: ignora y usa defaults */ }
  }

  /* ── Clasificación de identidad ───────────────────────────── */
  function classify(imsi) {
    if (state.whitelist.indexOf(imsi) !== -1) return 'white';
    if (state.targets.indexOf(imsi) !== -1) return 'target';
    return 'catch';
  }

  /* ── Motor de simulación de capturas ──────────────────────── */
  var simTimer = null;
  function spawnCapture(forceTarget) {
    var imsi = forceTarget ? pick(state.targets) : genImsi();
    var cls = classify(imsi);
    var opKey = pick(OPERATOR_KEYS);
    var op = OPERATORS[opKey];
    var dbm = -rnd(48, 110); // -48 (cerca) a -110 (lejos)
    var cap = {
      id: 'c' + Date.now() + '-' + rnd(100, 999),
      ts: Date.now(),
      imsi: imsi,
      imei: genImei(),
      tmsi: genTmsi(),
      cc: op.c,
      op: op.n,
      dbm: dbm,
      rat: pick(RAT.filter(function (r) { return state.bands[r]; }).length ? RAT.filter(function (r) { return state.bands[r]; }) : RAT),
      model: cls === 'white' ? '[EQUIPO PROPIO]' : pick(DEVICE_MODELS),
      cls: cls
    };
    state.captures.unshift(cap);
    if (state.captures.length > 200) state.captures.pop(); // cap de memoria
    return cap;
  }

  function startSim() {
    if (simTimer) return;
    function tick() {
      // En modo pasivo se capturan menos identidades que en activo.
      var batch = state.mode === 'active' ? rnd(1, 3) : rnd(0, 1);
      var sawTarget = false;
      for (var i = 0; i < batch; i++) {
        // ~4% de probabilidad de que aparezca un objetivo conocido
        var forceTarget = state.targets.length && Math.random() < 0.04;
        var cap = spawnCapture(forceTarget);
        if (cap.cls === 'target') sawTarget = true;
      }
      renderTable();
      updateStats();
      if (sawTarget) raiseTargetAlert();
      simTimer = setTimeout(tick, rnd(900, 1800));
    }
    tick();
  }

  /* ── Alerta de objetivo (rojo + beep opcional) ────────────── */
  var audioCtx = null;
  function beep() {
    if (state.silent || reduceMotion) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = 'square'; o.frequency.value = 880;
      g.gain.value = 0.04;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.12);
    } catch (e) { /* sin contexto de audio: silencioso */ }
  }
  function raiseTargetAlert() {
    var live = $('#ident-live');
    if (live) live.textContent = '⚠ Objetivo enganchado detectado en radio de acción — ' + new Date().toLocaleTimeString();
    beep();
  }

  /* ── Render: tabla de identidades ─────────────────────────── */
  function dbmClass(dbm) {
    if (dbm >= -65) return 'dbm--near';
    if (dbm >= -90) return 'dbm--mid';
    return 'dbm--far';
  }
  function distLabel(dbm) {
    // Estimación grosera de distancia a partir de RSSI (simulada).
    var m = Math.round(Math.pow(10, (-dbm - 40) / 22) * 10);
    return dbm + ' dBm · ~' + m + ' m';
  }
  function clsBadge(cls) {
    if (cls === 'white') return '<span class="cls cls--white">WHITE-LIST</span>';
    if (cls === 'target') return '<span class="cls cls--target">● TARGET</span>';
    return '<span class="cls cls--catch">catch-all</span>';
  }

  function renderTable() {
    var tbody = $('#ident-body');
    if (!tbody) return;
    var rows = state.captures.filter(function (c) {
      if (state.filter === 'all') return true;
      if (state.filter === 'white') return c.cls === 'white';
      if (state.filter === 'target') return c.cls === 'target';
      if (state.filter === 'catch') return c.cls === 'catch';
      return true;
    });

    // Si hay fila congelada, asegurarse de mantenerla visible aunque
    // se filtre: el operador inspecciona un IMSI mientras sigue la captura.
    var html = rows.map(function (c) {
      var frozen = c.id === state.frozenId;
      var trClass = 'ident__row';
      if (c.cls === 'target') trClass += ' row--target';
      if (frozen) trClass += ' is-frozen';
      if (c.cls === 'target' && !frozen) trClass += ' is-alerting';
      return '<tr class="' + trClass + '" data-id="' + c.id + '" tabindex="0" role="row" aria-label="Identidad ' + c.imsi + '">' +
        '<td>' + clsBadge(c.cls) + '</td>' +
        '<td>' + c.imsi + '</td>' +
        '<td>' + c.imei + '</td>' +
        '<td>' + c.tmsi + '</td>' +
        '<td>' + c.cc + ' · ' + c.op + '</td>' +
        '<td class="dbm ' + dbmClass(c.dbm) + '">' + distLabel(c.dbm) + '</td>' +
        '<td>' + c.rat + '</td>' +
        '<td>' + c.model + '</td>' +
        '</tr>';
    }).join('');
    tbody.innerHTML = html || '<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--ops-muted)">Sin identidades capturadas. Inicia escaneo en Fase 2.</td></tr>';
  }

  /* Freeze: clic en fila fija el foco para inspección */
  function bindTableInteraction() {
    var tbody = $('#ident-body');
    if (!tbody) return;
    function toggleFreeze(id) {
      state.frozenId = (state.frozenId === id) ? null : id;
      var note = $('#freeze-note');
      if (note) note.classList.toggle('is-show', !!state.frozenId);
      renderTable();
    }
    tbody.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (tr) toggleFreeze(tr.getAttribute('data-id'));
    });
    tbody.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var tr = e.target.closest('tr[data-id]');
        if (tr) { e.preventDefault(); toggleFreeze(tr.getAttribute('data-id')); }
      }
    });
  }

  /* ── Stats ────────────────────────────────────────────────── */
  function updateStats() {
    var w = 0, t = 0, c = 0;
    state.captures.forEach(function (x) {
      if (x.cls === 'white') w++;
      else if (x.cls === 'target') t++;
      else c++;
    });
    setText('#count-all', state.captures.length);
    setText('#count-white', w);
    setText('#count-target', t);
    setText('#count-catch', c);
    // Resumen de Fase 4
    setText('#sum-total', state.captures.length);
    setText('#sum-target', t);
    setText('#sum-white', w);
    setText('#sum-catch', c);
  }
  function setText(sel, v) { var el = $(sel); if (el) el.textContent = v; }

  /* ── Panel A: métricas de hardware (simuladas) ────────────── */
  var hw = { temp: 47, batt: 88, rssi: -72, noise: 28 };
  function tickHardware() {
    hw.temp = clamp(hw.temp + rnd(-1, 2), 38, 92);
    hw.batt = clamp(hw.batt - (Math.random() < 0.25 ? 1 : 0), 5, 100);
    hw.rssi = clamp(hw.rssi + rnd(-3, 3), -110, -40);
    // El ruido sube con la ganancia: regla física simulada.
    hw.noise = clamp(Math.round((state.gain - 20) * 1.4) + rnd(-4, 6), 8, 100);

    renderHardware();
    // Abstracción de error: saturación de ruido en banda.
    if (hw.noise > 78 || hw.temp > 84) {
      var band = state.bands['4G'] ? 'B3 (1800 MHz)' : (state.bands['2G'] ? 'B8 (900 MHz)' : 'activa');
      showAlert('crit', '[!] Saturación de ruido en banda ' + band + ' — reduce la ganancia de antena.', 'gain');
    } else if (hw.temp > 74) {
      showAlert('warn', '[~] Temperatura del SDR elevada (' + hw.temp + '°C) — ventila el equipo.', null);
    } else {
      hideAlert();
    }
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function renderHardware() {
    setText('#hw-temp', hw.temp + ' °C');
    setText('#hw-batt', hw.batt + ' %');
    setText('#hw-rssi', hw.rssi + ' dBm');
    setText('#hw-noise', hw.noise + ' %');

    grade('#hw-temp', hw.temp, [70, 84], true);
    grade('#hw-batt', hw.batt, [20, 40], false);
    grade('#hw-noise', hw.noise, [55, 78], true);

    setBar('#bar-batt', hw.batt, hw.batt > 40 ? 'good' : hw.batt > 20 ? 'warn' : 'crit');
    setBar('#bar-noise', hw.noise, hw.noise < 55 ? 'good' : hw.noise < 78 ? 'warn' : 'crit');
    var rssiPct = Math.round((hw.rssi + 110) / 70 * 100);
    setBar('#bar-rssi', rssiPct, rssiPct > 55 ? 'good' : rssiPct > 30 ? 'warn' : 'crit');
    renderBlueprint();
  }
  function grade(sel, val, thr, higherWorse) {
    var el = $(sel); if (!el) return;
    el.classList.remove('is-good', 'is-warn', 'is-crit');
    var c;
    if (higherWorse) c = val >= thr[1] ? 'is-crit' : val >= thr[0] ? 'is-warn' : 'is-good';
    else c = val <= thr[0] ? 'is-crit' : val <= thr[1] ? 'is-warn' : 'is-good';
    el.classList.add(c);
  }
  function setBar(sel, pct, kind) {
    var el = $(sel); if (!el) return;
    el.style.width = clamp(pct, 0, 100) + '%';
    el.className = 'bar__fill bar__fill--' + kind;
  }

  /* ── Blueprint (Fase 1): refleja en vivo cada componente físico ── */
  function renderBlueprint() {
    setText('#bp-gain', state.gain + ' dB');
    setText('#bp-rssi', hw.rssi + ' dBm');
    setText('#bp-noise', hw.noise + ' %');
    setText('#bp-sdr', 'CONECTADO');
    setText('#bp-temp', hw.temp + ' °C');
    setText('#bp-batt', hw.batt + ' %');
    setText('#bp-mode', state.mode === 'active' ? 'ACTIVO' : 'PASIVO');
    var nb = Object.keys(state.bands).filter(function (k) { return state.bands[k]; }).length;
    setText('#bp-bands', nb + (nb === 1 ? ' banda' : ' bandas'));
  }

  /* ── Alertas abstraídas ───────────────────────────────────── */
  var alertFocus = null;
  function showAlert(kind, msg, focusField) {
    var box = $('#ops-alert');
    if (!box) return;
    box.className = 'ops-alert is-show ops-alert--' + kind;
    $('#ops-alert-msg').textContent = msg;
    alertFocus = focusField;
    $('#ops-alert-act').style.display = focusField ? '' : 'none';
  }
  function hideAlert() {
    var box = $('#ops-alert');
    if (box) box.className = 'ops-alert';
  }

  /* ── Waterfall del espectro (canvas) ──────────────────────── */
  function initWaterfall() {
    var canvas = $('#waterfall');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    function size() {
      var w = canvas.clientWidth || 600;
      canvas.width = w; canvas.height = 180;
    }
    size();
    window.addEventListener('resize', size);

    function colorFor(v) {
      // v: 0..1 intensidad → de azul oscuro a cian a amarillo
      if (v < 0.4) return 'rgba(0,' + Math.round(60 + v * 200) + ',' + Math.round(120 + v * 200) + ',0.9)';
      if (v < 0.75) return 'rgba(0,' + Math.round(200 + v * 50) + ',255,0.9)';
      return 'rgba(255,' + Math.round(220 - (v - 0.75) * 400) + ',32,0.95)';
    }
    function row() {
      var w = canvas.width, h = canvas.height;
      // desplaza hacia abajo (efecto cascada)
      var img = ctx.getImageData(0, 0, w, h - 1);
      ctx.putImageData(img, 0, 1);
      // dibuja nueva línea arriba
      var bins = 96;
      for (var i = 0; i < bins; i++) {
        var x0 = Math.floor(i / bins * w);
        var x1 = Math.floor((i + 1) / bins * w);
        // picos donde hay "celdas" activas + ruido proporcional a la ganancia
        var base = Math.random() * (hw.noise / 100) * 0.5;
        var peak = (i % 17 === 0 || i % 23 === 0) ? 0.5 + Math.random() * 0.5 : 0;
        var v = clamp(base + peak, 0, 1);
        ctx.fillStyle = colorFor(v);
        ctx.fillRect(x0, 0, x1 - x0, 1);
      }
    }
    var wfTimer = setInterval(row, reduceMotion ? 600 : 110);
    canvas._timer = wfTimer;
  }

  /* ── Heatmap de triangulación (canvas) ────────────────────── */
  function initHeatmap() {
    var canvas = $('#heatmap');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    function size() {
      var w = canvas.clientWidth || 400;
      canvas.width = w; canvas.height = 220;
    }
    size();
    window.addEventListener('resize', size);

    function draw() {
      var w = canvas.width, h = canvas.height;
      var cx = w / 2, cy = h - 18;
      ctx.clearRect(0, 0, w, h);
      // anillos de distancia (RTT)
      ctx.strokeStyle = 'rgba(33,208,122,0.18)';
      ctx.fillStyle = 'rgba(33,208,122,0.45)';
      ctx.font = '9px monospace';
      for (var r = 1; r <= 4; r++) {
        var rad = r / 4 * (h - 30);
        ctx.beginPath();
        ctx.arc(cx, cy, rad, Math.PI, 2 * Math.PI);
        ctx.stroke();
        ctx.fillText((r * 250) + 'm', cx + rad - 26, cy - 4);
      }
      // antena (origen)
      ctx.fillStyle = 'rgba(0,229,255,0.95)';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill();

      // blips de las últimas capturas
      var recent = state.captures.slice(0, 40);
      recent.forEach(function (c) {
        var norm = clamp((-c.dbm - 40) / 70, 0.05, 1); // 0 cerca .. 1 lejos
        var rad = norm * (h - 34);
        var ang = Math.PI + (Math.abs(hashAngle(c.id)) % 1000) / 1000 * Math.PI;
        var x = cx + Math.cos(ang) * rad;
        var y = cy + Math.sin(ang) * rad;
        var col = c.cls === 'target' ? 'rgba(255,59,48,0.95)'
          : c.cls === 'white' ? 'rgba(0,229,255,0.85)'
            : 'rgba(33,208,122,0.65)';
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, c.cls === 'target' ? 5 : 3, 0, 2 * Math.PI);
        ctx.fill();
        if (c.cls === 'target') {
          ctx.strokeStyle = 'rgba(255,59,48,0.5)';
          ctx.beginPath(); ctx.arc(x, y, 9, 0, 2 * Math.PI); ctx.stroke();
        }
      });
    }
    function hashAngle(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return h; }
    setInterval(draw, reduceMotion ? 800 : 400);
  }

  /* ── Hold-to-trigger (confirmación física de acción sensible) ─ */
  function bindHold(btn, onComplete) {
    if (!btn) return;
    var holdMs = 1200, raf = null, start = 0, fill = btn.querySelector('.hold-btn__fill');
    function step(ts) {
      if (!start) start = ts;
      var pct = Math.min((ts - start) / holdMs, 1);
      if (fill) fill.style.width = (pct * 100) + '%';
      if (pct >= 1) { finish(true); return; }
      raf = requestAnimationFrame(step);
    }
    function finish(ok) {
      cancelAnimationFrame(raf); raf = null; start = 0;
      btn.removeAttribute('data-armed');
      if (fill) fill.style.width = '0%';
      if (ok) onComplete();
    }
    function down(e) { e.preventDefault(); btn.setAttribute('data-armed', 'true'); raf = requestAnimationFrame(step); }
    function up() { if (raf) finish(false); }
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
    // Accesible por teclado: requiere mantener Enter/Espacio
    btn.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !raf) { e.preventDefault(); down(e); }
    });
    btn.addEventListener('keyup', function (e) {
      if (e.key === 'Enter' || e.key === ' ') up();
    });
  }

  /* ── Export forense (CSV / JSON reales desde data simulada) ── */
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function exportCSV() {
    var head = 'timestamp,clasificacion,imsi,imei,tmsi,pais,operador,rssi_dbm,rat,modelo\n';
    var rows = state.captures.map(function (c) {
      return [new Date(c.ts).toISOString(), c.cls, c.imsi, c.imei, c.tmsi, c.cc, c.op, c.dbm, c.rat, '"' + c.model + '"'].join(',');
    }).join('\n');
    download('recon-identidades-' + Date.now() + '.csv', head + rows, 'text/csv');
  }
  function exportJSON() {
    var payload = {
      _nota: 'PROTOTIPO UX — data simulada, sin captura real de RF',
      generado: new Date().toISOString(),
      mision: { bandas: state.bands, modo: state.mode, celda: state.cell, txPower: state.txPower },
      identidades: state.captures
    };
    download('recon-metadata-' + Date.now() + '.json', JSON.stringify(payload, null, 2), 'application/json');
  }

  /* ── Export PDF · ficha de infraestructura (vanilla, sin deps) ──
     Genera un PDF real (fuentes base-14, sin embeber) que documenta el
     MODELO de infraestructura/antena que muestra la maqueta. Todo el
     contenido es de nivel diseño con datos simulados: no es una lista de
     materiales ni una guía de despliegue de un sistema real. ───────── */
  function downloadBytes(filename, bytes, mime) {
    var blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Encodea un string a bytes WinAnsi (Windows-1252) para los fonts base-14.
  function winAnsi(str) {
    var sub = { 0x2014: 0x97, 0x2013: 0x96, 0x2022: 0x95, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2026: 0x85 };
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var cp = str.charCodeAt(i);
      if (cp <= 0xFF) out.push(cp);
      else if (sub[cp] != null) out.push(sub[cp]);
      else out.push(0x3F); // '?' para lo no representable
    }
    return out;
  }

  // Construye un PDF de una o varias páginas A4 a partir de "bloques".
  function buildInfraPDF(blocks) {
    var PAGE_W = 595.28, PAGE_H = 841.89;
    var ML = 54, MR = 54, MT = 792, MB = 60;
    var usableW = PAGE_W - ML - MR;
    var NAVY = [0, 0.10, 0.447], ACCENT = [0, 0.71, 0.886], GRAY = [0.29, 0.33, 0.41], INK = [0.10, 0.10, 0.12], RULE = [0.78, 0.82, 0.88];

    var pages = [[]], y = MT;
    function cur() { return pages[pages.length - 1]; }
    function newPage() { pages.push([]); y = MT; }
    function ensure(h) { if (y - h < MB) newPage(); }
    function charW(size, mono) { return (mono ? 0.6 : 0.52) * size; }
    function approxW(text, size, mono) { return String(text).length * charW(size, mono); }

    function wrap(text, size, mono, indent) {
      var max = Math.max(8, Math.floor((usableW - (indent || 0)) / charW(size, mono)));
      var words = String(text).split(/\s+/), lines = [], line = '';
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (!line) line = w;
        else if ((line + ' ' + w).length <= max) line += ' ' + w;
        else { lines.push(line); line = w; }
        while (line.length > max) { lines.push(line.slice(0, max)); line = line.slice(max); }
      }
      if (line) lines.push(line);
      return lines.length ? lines : [''];
    }

    function text(str, opt) {
      opt = opt || {};
      var size = opt.size || 10, font = opt.font || 'F1', mono = font === 'F3';
      var color = opt.color || INK, indent = opt.indent || 0, lead = size * 1.45;
      var x = ML + indent;
      wrap(str, size, mono, indent).forEach(function (ln) {
        ensure(lead);
        cur().push({ x: x, y: y, size: size, font: font, color: color, text: ln });
        y -= lead;
      });
    }
    function gap(h) { ensure(h); y -= h; }
    function rule() {
      ensure(12); y -= 4;
      cur().push({ rule: true, x0: ML, x1: PAGE_W - MR, y: y, color: RULE });
      y -= 8;
    }
    function kv(label, value) {
      var size = 10, lead = size * 1.45, lw = approxW(label, size, false);
      // Si etiqueta + valor no caben en una línea, apila el valor indentado.
      if (lw + 6 + approxW(value, size, true) > usableW) {
        text(label, { size: size, font: 'F2', color: NAVY });
        text(value, { size: size, font: 'F3', color: INK, indent: 12 });
        return;
      }
      ensure(lead);
      cur().push({ x: ML, y: y, size: size, font: 'F2', color: NAVY, text: label });
      cur().push({ x: ML + lw + 6, y: y, size: size, font: 'F3', color: INK, text: value });
      y -= lead;
    }

    // Renderiza la lista de bloques (DSL declarativo).
    blocks.forEach(function (b) {
      if (b.t === 'title') { text(b.v, { size: 19, font: 'F2', color: NAVY }); }
      else if (b.t === 'h2') { gap(8); text(b.v, { size: 13, font: 'F2', color: NAVY }); gap(2); }
      else if (b.t === 'small') { text(b.v, { size: 8.5, font: 'F1', color: GRAY }); }
      else if (b.t === 'p') { text(b.v, { size: 10, font: 'F1', color: INK }); gap(2); }
      else if (b.t === 'kv') { kv(b.k, b.v); }
      else if (b.t === 'li') { text('•  ' + b.v, { size: 10, font: 'F1', color: INK, indent: 10 }); }
      else if (b.t === 'rule') { rule(); }
      else if (b.t === 'gap') { gap(b.v || 8); }
    });

    // ── Serializa a bytes PDF ──
    var out = [], offsets = [];
    function w(str) { var b = winAnsi(str); for (var i = 0; i < b.length; i++) out.push(b[i]); }
    function obj(n) { offsets[n] = out.length; w(n + ' 0 obj\n'); }
    function num(v) { return (Math.round(v * 100) / 100).toString(); }
    function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

    w('%PDF-1.4\n%âãÏÓ\n');

    // 1 Catalog, 2 Pages, 3-5 Fonts
    obj(1); w('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    var next = 6, pageNums = [], contentNums = [];
    for (var p = 0; p < pages.length; p++) { contentNums.push(next++); pageNums.push(next++); }

    obj(2);
    w('<< /Type /Pages /Count ' + pages.length + ' /Kids [');
    w(pageNums.map(function (n) { return n + ' 0 R'; }).join(' '));
    w('] >>\nendobj\n');

    obj(3); w('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');
    obj(4); w('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');
    obj(5); w('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n');

    for (var pi = 0; pi < pages.length; pi++) {
      var stream = '';
      pages[pi].forEach(function (r) {
        var c = r.color || INK;
        if (r.rule) {
          stream += 'q 0.6 w ' + num(c[0]) + ' ' + num(c[1]) + ' ' + num(c[2]) + ' RG ' +
            num(r.x0) + ' ' + num(r.y) + ' m ' + num(r.x1) + ' ' + num(r.y) + ' l S Q\n';
        } else {
          stream += 'BT /' + r.font + ' ' + num(r.size) + ' Tf ' +
            num(c[0]) + ' ' + num(c[1]) + ' ' + num(c[2]) + ' rg ' +
            num(r.x) + ' ' + num(r.y) + ' Td (' + esc(r.text) + ') Tj ET\n';
        }
      });
      obj(contentNums[pi]);
      w('<< /Length ' + winAnsi(stream).length + ' >>\nstream\n' + stream + 'endstream\nendobj\n');

      obj(pageNums[pi]);
      w('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(PAGE_W) + ' ' + num(PAGE_H) + '] ' +
        '/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> ' +
        '/Contents ' + contentNums[pi] + ' 0 R >>\nendobj\n');
    }

    var xrefAt = out.length, count = next; // objetos 0..next-1
    function pad(v, len) { var s = String(v); while (s.length < len) s = '0' + s; return s; }
    w('xref\n0 ' + count + '\n0000000000 65535 f\r\n');
    for (var o = 1; o < count; o++) w(pad(offsets[o] || 0, 10) + ' 00000 n\r\n');
    w('trailer\n<< /Size ' + count + ' /Root 1 0 R >>\nstartxref\n' + xrefAt + '\n%%EOF');

    return new Uint8Array(out);
  }

  // Arma el contenido de la ficha desde el estado simulado actual.
  function exportInfraPDF() {
    var BAND_LABELS = { '2G': '2G · GSM 900', '3G': '3G · UMTS 2100', '4G': '4G · LTE B3', '5G': '5G · NR n78' };
    var enabled = Object.keys(state.bands).filter(function (k) { return state.bands[k]; })
      .map(function (k) { return BAND_LABELS[k] || k; });
    var modo = state.mode === 'active' ? 'ACTIVO (emisión, simulado)' : 'PASIVO (solo escucha, simulado)';

    var blocks = [
      { t: 'title', v: 'Ficha de Infraestructura — RF Recon Console' },
      { t: 'small', v: 'Blueprint UX · suite uxtools' },
      { t: 'small', v: 'Generado: ' + new Date().toLocaleString('es-CL', { hour12: false }) + ' · documento de diseño, no operativo' },
      { t: 'rule' },

      { t: 'h2', v: 'Aviso — prototipo con datos simulados' },
      { t: 'p', v: 'Este documento describe el MODELO de infraestructura representado en la maqueta de interfaz RF Recon Console. Los valores, antenas y componentes son representaciones de diseño con datos sintéticos. La página no controla hardware, no emite ni capta radiofrecuencia y no intercepta comunicaciones. No constituye una guía de despliegue ni una lista de materiales para construir un sistema real.' },
      { t: 'rule' },

      { t: 'h2', v: '1. Estación de la maqueta (Panel A)' },
      { t: 'p', v: 'Indicadores de estado que la interfaz muestra al operador. Todos los valores son sintéticos y se actualizan en el cliente.' },
      { t: 'kv', k: 'Estado SDR:', v: 'CONECTADO (simulado)' },
      { t: 'kv', k: 'Temperatura del equipo:', v: hw.temp + ' °C' },
      { t: 'kv', k: 'Batería:', v: hw.batt + ' %' },
      { t: 'kv', k: 'RSSI (nivel de señal):', v: hw.rssi + ' dBm' },
      { t: 'kv', k: 'Nivel de ruido:', v: hw.noise + ' %' },
      { t: 'p', v: 'Regla de UX simulada: el nivel de ruido sube con la ganancia de antena; al saturar, la interfaz abstrae el error técnico en una alerta accionable.' },

      { t: 'h2', v: '2. Antena y cadena de RF (modelo de UI)' },
      { t: 'p', v: 'Parámetros que la maqueta expone como controles. Son abstracciones de diseño, sin especificación física real.' },
      { t: 'kv', k: 'Ganancia de antena:', v: state.gain + ' dB (rango configurable 0–60 dB)' },
      { t: 'kv', k: 'Potencia de transmisión (Tx):', v: state.txPower + ' dBm (rango 0–43 dBm)' },
      { t: 'kv', k: 'Modo de operación:', v: modo },
      { t: 'gap', v: 4 },
      { t: 'p', v: 'Componentes representados en la interfaz (nivel conceptual):' },
      { t: 'li', v: 'Antena multibanda (representación de UI): elemento receptor con ganancia ajustable simulada.' },
      { t: 'li', v: 'Cadena de recepción / front-end RF: bloque conceptual reducido en la maqueta a indicadores de RSSI y ruido.' },
      { t: 'li', v: 'SDR (Software Defined Radio): nodo de UI con estado simulado — conexión, temperatura y batería.' },
      { t: 'li', v: 'Consola de control: la propia interfaz web de esta página (cliente, sin backend).' },

      { t: 'h2', v: '3. Bandas y celda (parámetros de la maqueta)' },
      { t: 'kv', k: 'Bandas habilitadas:', v: enabled.length ? enabled.join('  ·  ') : '— (ninguna)' },
      { t: 'kv', k: 'MCC · Mobile Country Code:', v: state.cell.mcc || '—' },
      { t: 'kv', k: 'MNC · Mobile Network Code:', v: state.cell.mnc || '—' },
      { t: 'kv', k: 'LAC · Location Area Code:', v: state.cell.lac || '—' },
      { t: 'kv', k: 'TAC · Tracking Area Code:', v: state.cell.tac || '—' },

      { t: 'h2', v: '4. Topología web ↔ móvil (conceptual)' },
      { t: 'p', v: 'En este blueprint, la "web" es la consola del operador y el "móvil" aparece únicamente como identidades sintéticas en la tabla de capturas. No existe ningún enlace real con el teléfono de ninguna persona: no hay emparejamiento, ni captura, ni canal de datos hacia dispositivos externos. La topología se documenta solo como diagrama de diseño de la experiencia.' },
      { t: 'rule' },
      { t: 'small', v: 'Documento generado en el navegador (cliente). Sin telemetría. Datos sintéticos. No apto para uso operativo.' }
    ];

    var bytes = buildInfraPDF(blocks);
    downloadBytes('recon-infraestructura-' + Date.now() + '.pdf', bytes, 'application/pdf');
  }

  /* ── Phase navigation ─────────────────────────────────────── */
  function setPhase(n) {
    state.phase = n;
    $all('.phase').forEach(function (p) {
      p.setAttribute('aria-selected', String(Number(p.getAttribute('data-phase')) === n));
    });
    $all('.phase-view').forEach(function (v) {
      v.classList.toggle('is-active', Number(v.getAttribute('data-phase')) === n);
    });
  }

  /* ── Wire-up de controles ─────────────────────────────────── */
  function bindControls() {
    // Fases
    $all('.phase').forEach(function (p) {
      p.addEventListener('click', function () { setPhase(Number(p.getAttribute('data-phase'))); });
    });

    // Bandas (Fase 1)
    $all('.band-toggle').forEach(function (b) {
      var band = b.getAttribute('data-band');
      b.setAttribute('aria-pressed', String(!!state.bands[band]));
      b.addEventListener('click', function () {
        state.bands[band] = !state.bands[band];
        b.setAttribute('aria-pressed', String(state.bands[band]));
        renderBlueprint();
        saveSession();
      });
    });

    // Celda MCC/MNC/LAC/TAC
    ['mcc', 'mnc', 'lac', 'tac'].forEach(function (k) {
      var el = $('#cell-' + k);
      if (!el) return;
      el.value = state.cell[k];
      el.addEventListener('input', function () { state.cell[k] = el.value; saveSession(); });
    });

    // Tx power + gain
    var tx = $('#tx-power');
    if (tx) {
      tx.value = state.txPower;
      setText('#tx-power-val', state.txPower + ' dBm');
      tx.addEventListener('input', function () { state.txPower = Number(tx.value); setText('#tx-power-val', state.txPower + ' dBm'); saveSession(); });
    }
    var gain = $('#antenna-gain');
    if (gain) {
      gain.value = state.gain;
      setText('#gain-val', state.gain + ' dB');
      gain.addEventListener('input', function () { state.gain = Number(gain.value); setText('#gain-val', state.gain + ' dB'); renderBlueprint(); saveSession(); });
    }

    // Modo pasivo/activo (Fase 2)
    $all('.mode-opt').forEach(function (m) {
      var mode = m.getAttribute('data-mode');
      m.setAttribute('aria-pressed', String(state.mode === mode));
      m.addEventListener('click', function () {
        if (mode === 'active') {
          // El modo activo (emisión) requiere confirmación: no se activa con un clic.
          showAlert('warn', 'Modo activo (emisión) requiere confirmación sostenida abajo ↓ — fuerza enganche de terminales.', null);
        } else {
          state.mode = 'passive';
          syncModeUI();
          saveSession();
        }
      });
    });
    bindHold($('#hold-active'), function () {
      state.mode = 'active';
      syncModeUI();
      saveSession();
      showAlert('warn', 'SIMULACIÓN: modo activo armado. En un sistema real esto emitiría señal. Aquí solo aumenta la tasa de capturas sintéticas.', null);
    });

    // Hold para "downgrade" simulado (regla de UX: dos pasos)
    bindHold($('#hold-downgrade'), function () {
      showAlert('crit', 'SIMULACIÓN: acción de degradación marcada. No se ejecuta ninguna operación real de radio en este prototipo.', null);
    });

    // Switches críticos: Silent / Emergency
    var silentBtn = $('#switch-silent');
    if (silentBtn) {
      silentBtn.setAttribute('aria-pressed', String(state.silent));
      silentBtn.addEventListener('click', function () {
        state.silent = !state.silent;
        silentBtn.setAttribute('aria-pressed', String(state.silent));
        saveSession();
      });
    }
    var emBtn = $('#switch-emergency');
    if (emBtn) {
      emBtn.addEventListener('click', function () {
        // Apagado de emergencia: detiene simulación y limpia visualización.
        if (simTimer) { clearTimeout(simTimer); simTimer = null; }
        showAlert('crit', 'APAGADO DE EMERGENCIA (simulado): captura detenida. Recarga la página para reanudar.', null);
        emBtn.setAttribute('aria-pressed', 'true');
      });
    }

    // Filtros de la consola de identidades
    $all('.filter-chip').forEach(function (f) {
      f.addEventListener('click', function () {
        state.filter = f.getAttribute('data-filter');
        $all('.filter-chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === f)); });
        renderTable();
      });
    });

    // Alert action → enfoca el campo problemático
    var alertAct = $('#ops-alert-act');
    if (alertAct) alertAct.addEventListener('click', function () {
      if (alertFocus === 'gain') { setPhase(1); var g = $('#antenna-gain'); if (g) g.focus(); }
    });

    // Export
    var cCSV = $('#exp-csv'); if (cCSV) cCSV.addEventListener('click', exportCSV);
    var cJSON = $('#exp-json'); if (cJSON) cJSON.addEventListener('click', exportJSON);
    var cPDF = $('#exp-pdf'); if (cPDF) cPDF.addEventListener('click', exportInfraPDF);
    var cPCAP = $('#exp-pcap');
    if (cPCAP) cPCAP.addEventListener('click', function () {
      showAlert('warn', 'PCAP de tráfico requiere captura real de red — no disponible en el prototipo. Exporta metadatos en CSV/JSON.', null);
    });
  }

  function syncModeUI() {
    $all('.mode-opt').forEach(function (m) {
      m.setAttribute('aria-pressed', String(m.getAttribute('data-mode') === state.mode));
    });
    setText('#mode-tag', state.mode === 'active' ? 'ACTIVO' : 'PASIVO');
    var tag = $('#mode-tag');
    if (tag) tag.style.color = state.mode === 'active' ? 'var(--ops-amber)' : 'var(--ops-green)';
    renderBlueprint();
  }

  /* ── Reloj de sesión ──────────────────────────────────────── */
  function startClock() {
    var el = $('#ops-clock');
    if (!el) return;
    function t() { el.textContent = new Date().toLocaleTimeString('es-CL', { hour12: false }); }
    t(); setInterval(t, 1000);
  }

  /* ── Init ─────────────────────────────────────────────────── */
  function init() {
    loadSession();
    bindControls();
    bindTableInteraction();
    syncModeUI();
    renderHardware();
    setPhase(state.phase);
    startClock();
    initWaterfall();
    initHeatmap();

    // Semilla inicial de capturas para que la consola no arranque vacía
    for (var i = 0; i < 8; i++) spawnCapture(false);
    renderTable();
    updateStats();

    startSim();
    setInterval(tickHardware, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
