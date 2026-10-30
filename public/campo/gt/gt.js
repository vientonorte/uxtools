// Campo · Teoría fundamentada. UI sobre GTCore (gt-core.js). Solo localStorage; nada se sube.
const G = globalThis.GTCore;
const KEY = "campo.gt.v1";
const $ = (id) => document.getElementById(id);
const blank = () => ({ kind: "campo-gt", version: 1, fields: [], dropped: [], records: [], notes: [], codes: [], categories: [], core: { name: "", status: "" }, memos: [], segment: [] });
let st = load();
let lastCT = null, lastChart = null;
let lastParsed = null; // CSV crudo solo en memoria (nunca en localStorage), para incluir texto libre si se pide

function load() {
  try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { return blank(); }
}
function save(msg) {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { say("No se pudo guardar: el almacenamiento está lleno."); return; }
  if (msg) say(msg);
}
function say(t) { $("live").textContent = ""; setTimeout(() => { $("live").textContent = t; }, 30); }
function h(tag, attrs = {}, kids = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") el.textContent = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null) el.append(c);
  return el;
}
const uid = (p, list) => p + "-" + String(list.length + 1).padStart(3, "0") + "-" + Math.random().toString(36).slice(2, 5);
function download(name, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = h("a", { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const readText = (file) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsText(file); });

// ── 1. Datos ──
$("f-csv").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  lastParsed = G.parseCSV(await readText(file));
  e.target.value = "";
  applyClean(false);
});
function applyClean(includeFreeText) {
  if (!lastParsed) return;
  const clean = G.sanitize(lastParsed, { includeFreeText });
  st.fields = clean.fields; st.dropped = clean.dropped; st.freeText = clean.freeText; st.freeTextIncluded = includeFreeText; st.records = clean.records; st.segment = [];
  save(`Encuesta cargada: ${clean.records.length} respuestas. Quité ${clean.dropped.length} columnas con datos personales${includeFreeText ? "" : ` y ${clean.freeText.length} de texto libre`}.`); render();
}
$("f-notes").addEventListener("change", async (e) => {
  for (const file of e.target.files) {
    const id = "N-" + String(st.notes.length + 1).padStart(3, "0");
    st.notes.push({ id, text: G.redactText(await readText(file)) }); // sin nombre de archivo: puede traer nombres
  }
  e.target.value = "";
  save("Fichas cargadas. Quité correos, teléfonos y RUT del texto."); render();
});
$("b-export").addEventListener("click", () => download(`campo-gt-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(st, null, 1), "application/json"));
$("f-import").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const d = JSON.parse(await readText(file));
    if (d.kind !== "campo-gt") throw new Error();
    st = Object.assign(blank(), d); save("Análisis importado."); render();
  } catch { say("Ese archivo no es un análisis de Campo."); }
  e.target.value = "";
});
$("b-preset").addEventListener("click", async () => {
  try {
    const p = await (await fetch("./preset-fruta-29oct.json")).json();
    let added = 0;
    for (const c of p.codes) if (!st.codes.some((x) => x.id === c.id)) { st.codes.push(c); added++; }
    for (const k of p.categories) if (!st.categories.some((x) => x.id === k.id)) st.categories.push(k);
    for (const m of p.memos) if (!st.memos.some((x) => x.id === m.id)) st.memos.push(m);
    if (!st.core.name) st.core = Object.assign({}, p.core);
    save(`Agregué ${added} códigos del preset. No borré nada.`); render();
  } catch { say("No pude cargar el preset."); }
});
$("b-clear").addEventListener("click", () => {
  if (!confirm("¿Borrar respuestas y fichas de este equipo? Los códigos quedan.")) return;
  st.records = []; st.fields = []; st.dropped = []; st.notes = []; st.segment = [];
  save("Borré las respuestas y fichas."); render();
});
function renderData() {
  const box = $("data-status"); box.replaceChildren();
  box.append(h("p", { text: `${st.records.length} respuestas · ${st.fields.length} columnas · ${st.notes.length} fichas` }));
  if ((st.freeText || []).length) {
    box.append(h("div", { class: "warn", role: "note" }, [
      h("p", { text: st.freeTextIncluded ? "Incluiste columnas de texto libre. Revisa que no tengan nombres:" : "Dejé fuera columnas de texto libre. Pueden traer nombres:" }),
      h("ul", {}, st.freeText.map((f) => h("li", { text: f }))),
      lastParsed ? h("label", { class: "check" }, [h("input", { type: "checkbox", id: "free-opt", checked: st.freeTextIncluded ? "" : false, onchange: (e) => applyClean(e.target.checked) }), "Incluir texto libre (revisé que no hay nombres)"])
        : h("p", { class: "meta", text: "Para incluirlas, vuelve a cargar el CSV." })
    ]));
  }
  if (st.dropped.length) box.append(h("p", { text: "Columnas quitadas por datos personales:" }), h("ul", {}, st.dropped.map((d) => h("li", { text: `${d.field} (${d.why})` }))));
  $("ids").replaceChildren(...st.records.map((r) => h("option", { value: r.id })), ...st.notes.map((n) => h("option", { value: n.id })));
  for (const id of ["c-field", "s-field", "x-row", "x-col", "g-field"]) {
    const sel = $(id), prev = sel.value;
    sel.replaceChildren(...(id === "c-field" ? [h("option", { value: "", text: "— ficha o sin campo —" })] : []), ...st.fields.map((f) => h("option", { value: f, text: f })));
    if (prev) sel.value = prev;
  }
}

// ── 2. Códigos ──
$("form-code").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("c-name").value.trim(); if (!name) return;
  const src = { rowId: $("c-row").value.trim(), field: $("c-field").value, excerpt: G.redactText($("c-excerpt").value.trim()), ref: "" };
  st.codes.push({ id: uid("K", st.codes), name, description: $("c-desc").value.trim(), sources: src.rowId || src.excerpt ? [src] : [] });
  e.target.reset(); save(`Código «${name}» agregado.`); render(); $("c-name").focus();
});
function renderCodes() {
  $("code-list").replaceChildren(...st.codes.map((c) => h("li", {}, [
    h("label", { class: "field" }, [h("span", { text: "Código" }), h("input", { value: c.name, onchange: (e) => { c.name = e.target.value; save("Código editado."); renderCats(); } })]),
    h("label", { class: "field" }, [h("span", { text: "Qué significa" }), h("input", { value: c.description || "", onchange: (e) => { c.description = e.target.value; save("Código editado."); } })]),
    h("p", { class: "meta", text: c.sources.length ? "Fuente: " + c.sources.map((s) => [s.rowId, s.field, s.excerpt && `«${s.excerpt}»`, s.ref].filter(Boolean).join(" · ")).join(" | ") : "Sin fuente" }),
    h("button", { type: "button", class: "danger", "aria-label": `Quitar código ${c.name}`, onclick: () => {
      if (!confirm(`¿Quitar «${c.name}»?`)) return;
      st.codes = st.codes.filter((x) => x !== c); st.categories.forEach((k) => { k.codeIds = k.codeIds.filter((i) => i !== c.id); });
      save("Código quitado."); render();
    }, text: "Quitar" })
  ])));
}

// ── 3. Categorías ──
$("form-cat").addEventListener("submit", (e) => {
  e.preventDefault(); const name = $("k-name").value.trim(); if (!name) return;
  st.categories.push({ id: uid("C", st.categories), name, codeIds: [], conditions: "", actions: "", consequences: "" });
  e.target.reset(); save(`Categoría «${name}» agregada.`); render();
});
function renderCats() {
  $("cat-list").replaceChildren(...st.categories.map((k) => {
    const area = (prop, label) => h("label", { class: "field" }, [h("span", { text: label }), h("textarea", { rows: 2, onchange: (e) => { k[prop] = e.target.value; save("Categoría editada."); } }, [k[prop] || ""])]);
    return h("fieldset", { class: "card" }, [
      h("legend", { text: k.name }),
      h("label", { class: "field" }, [h("span", { text: "Nombre" }), h("input", { value: k.name, onchange: (e) => { k.name = e.target.value; save("Categoría editada."); renderCats(); } })]),
      h("p", { class: "meta", text: "Códigos en esta categoría:" }),
      h("div", { class: "row" }, st.codes.map((c) => h("label", { class: "check" }, [
        h("input", { type: "checkbox", checked: k.codeIds.includes(c.id) ? "" : false, onchange: (e) => { k.codeIds = e.target.checked ? [...k.codeIds, c.id] : k.codeIds.filter((i) => i !== c.id); save(); } }), c.name]))),
      area("conditions", "Condiciones"), area("actions", "Acciones e interacciones"), area("consequences", "Consecuencias"),
      h("button", { type: "button", class: "danger", text: "Quitar categoría", onclick: () => { if (confirm(`¿Quitar «${k.name}»?`)) { st.categories = st.categories.filter((x) => x !== k); save("Categoría quitada."); renderCats(); } } })
    ]);
  }));
}

// ── 4. Núcleo y memos ──
$("core-name").addEventListener("change", (e) => { st.core.name = e.target.value; save("Núcleo guardado."); });
$("core-status").addEventListener("change", (e) => { st.core.status = e.target.value; save("Estado guardado."); });
$("form-memo").addEventListener("submit", (e) => {
  e.preventDefault(); const title = $("m-title").value.trim(); if (!title) return;
  st.memos.push({ id: uid("M", st.memos), title, text: G.redactText($("m-text").value), at: new Date().toISOString() });
  e.target.reset(); save("Memo agregado."); renderMemos();
});
function renderMemos() {
  $("core-name").value = st.core.name || ""; $("core-status").value = st.core.status || "";
  $("memo-list").replaceChildren(...st.memos.map((m) => h("li", {}, [h("strong", { text: m.title }), h("p", { text: m.text }),
    h("button", { type: "button", class: "danger", text: "Quitar", "aria-label": `Quitar memo ${m.title}`, onclick: () => { st.memos = st.memos.filter((x) => x !== m); save("Memo quitado."); renderMemos(); } })])));
}

// ── 5. Cálculos ──
function renderRefs() {
  const box = $("refs"); box.replaceChildren();
  if (!st.records.length) { box.append(h("p", { class: "meta", text: "Carga la encuesta para calcular." })); return; }
  box.append(h("ul", { class: "list" }, G.REFERENCES.map((ref) => {
    const r = G.runReference(st.records, st.fields, ref);
    if (r.missing) return h("li", { text: `${ref.id} · ${ref.label}: no encontré las columnas.` });
    const exp = ref.expected.total ? `${ref.expected.n}/${ref.expected.total}` : `n=${ref.expected.n}`;
    return h("li", {}, [`${r.id} · ${r.label}: n=${r.n} de ${r.total} (${r.pct}%). Referencia ${exp}. `, h("span", { class: r.matches ? "ok" : "no", text: r.matches ? "Coincide" : "No coincide" })]);
  })));
}
const segRecords = () => G.filter(st.records, st.segment);
$("form-seg").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!$("s-field").value) return say("Primero carga la encuesta.");
  st.segment.push({ field: $("s-field").value, op: $("s-op").value, value: $("s-val").value.trim() });
  $("s-val").value = ""; save(); renderSeg();
});
$("s-field").addEventListener("change", fillOptions);
function fillOptions() {
  const f = $("s-field").value;
  $("s-opts").replaceChildren(...(f ? G.optionsOf(st.records, f, true) : []).map((o) => h("option", { value: o })));
}
function renderSeg() {
  fillOptions();
  const ops = { contains: "incluye la opción", textIncludes: "texto contiene", eq: "es igual a", answered: "respondió", in: "es uno de", notIn: "no es" };
  $("seg-conds").replaceChildren(...st.segment.map((c, i) => h("li", {}, [`${c.field} ${ops[c.op]} ${c.op === "answered" ? "" : `«${c.value}»`} `,
    h("button", { type: "button", class: "secondary", text: "Quitar", "aria-label": `Quitar condición ${i + 1}`, onclick: () => { st.segment.splice(i, 1); save(); renderSeg(); } })])));
  const r = G.segment(st.records, st.segment);
  $("seg-out").textContent = st.records.length ? `Segmento: n=${r.n} de ${r.total} (${r.pct}%)` : "";
}
$("form-ct").addEventListener("submit", (e) => {
  e.preventDefault(); if (!st.records.length) return say("Primero carga la encuesta.");
  lastCT = G.crosstab($("x-seg").checked ? segRecords() : st.records, $("x-row").value, $("x-col").value);
  const t = h("table", {}, [h("caption", { text: `Cruce: ${lastCT.rowField} × ${lastCT.colField} (base ${lastCT.total})` }),
    h("thead", {}, h("tr", {}, [h("th", { scope: "col", text: "" }), ...lastCT.cols.map((c) => h("th", { scope: "col", text: c })), h("th", { scope: "col", text: "Total" })])),
    h("tbody", {}, lastCT.rows.map((r) => h("tr", {}, [h("th", { scope: "row", text: r.row }), ...r.cells.map((c) => h("td", { text: `${c.n} (${c.pct}%)` })), h("td", { text: String(r.total) })])))]);
  $("ct-out").replaceChildren(t); $("b-ct-csv").hidden = false; say(`Cruce listo. Base ${lastCT.total}.`);
});
$("b-ct-csv").addEventListener("click", () => lastCT && download("cruce.csv", G.crosstabCSV(lastCT), "text/csv"));

// ── 6. Gráficos ──
$("form-chart").addEventListener("submit", (e) => {
  e.preventDefault(); if (!st.records.length) return say("Primero carga la encuesta.");
  const field = $("g-field").value, data = G.frequencies($("g-seg").checked ? segRecords() : st.records, field, $("g-multi").checked);
  const title = $("g-title").value.trim() || field;
  lastChart = { title, field, data };
  $("chart-svg").innerHTML = G.barChartSVG({ id: "gt-chart", title: `${title} (n=${data[0] ? data[0].total : 0})`, data });
  $("chart-table").replaceChildren(h("table", {}, [h("caption", { text: title }),
    h("thead", {}, h("tr", {}, ["Respuesta", "n", "%"].map((x) => h("th", { scope: "col", text: x })))),
    h("tbody", {}, data.map((d) => h("tr", {}, [h("th", { scope: "row", text: d.label }), h("td", { text: String(d.n) }), h("td", { text: d.pct + "%" })])))]));
  $("chart").hidden = false; say("Gráfico listo.");
});
const svgText = () => $("chart-svg").innerHTML;
$("b-svg").addEventListener("click", () => download("grafico.svg", svgText(), "image/svg+xml"));
$("b-csv").addEventListener("click", () => lastChart && download("grafico.csv", G.toCSV(["Respuesta", "n", "%", "Base"], lastChart.data.map((d) => [d.label, d.n, d.pct, d.total])), "text/csv"));
$("b-png").addEventListener("click", () => {
  const svg = $("chart-svg").querySelector("svg"); if (!svg) return;
  const w = +svg.getAttribute("width"), hh = +svg.getAttribute("height"), img = new Image();
  img.onload = () => {
    const c = h("canvas", { width: w * 2, height: hh * 2 }); const ctx = c.getContext("2d"); ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
    c.toBlob((b) => b && download("grafico.png", b));
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText());
});

function render() { renderData(); renderCodes(); renderCats(); renderMemos(); renderRefs(); renderSeg(); }
render();
