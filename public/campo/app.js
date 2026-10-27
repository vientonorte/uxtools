import { GUIA } from "./guia-data.js";
const STORE = "campo.etnografia.v1";
const TABS = {
  "/estudios": "estudios",
  "/nuevo": "estudios",
  "/preparar": "estudios",
  "/lotes": "campo",
  "/consentimiento": "campo",
  "/entrevista": "campo",
  "/registro": "registro",
  "/evidencias": "evidencias",
  "/privacidad": "estudios",
  "/guia": "guia",
  "/observacion": "guia",
  "/observacion/nueva": "guia",
};

const SEGMENTS = [
  ["jovenes", "Jóvenes · Estudio", 3],
  ["familias", "Familias · Alguien a cargo", 3],
  ["rutinarios", "Rutinarios · Horario fijo", 2],
  ["distribuida", "Distribuida · Varios destinos", 2],
];

const TEMPLATE = [
  { block: "Apertura", text: "¿Cómo llegaste hoy hasta aquí?" },
  { block: "Apertura", text: "¿Recargas tu tarjeta? ¿Dónde?" },
  { block: "Apertura", text: "¿Por qué ahí?" },
  { block: "Clasificador", text: "¿Con qué frecuencia viajas?" },
  { block: "Segmento", text: "¿Qué cambia cuando viajas con alguien a cargo?" },
  { block: "Cierre", text: "Agradecer y explicar el límite de uso de datos." },
];

const TAGS = ["#recarga", "#espera", "#cuidado", "#transbordo"];

let state = null;
let key = null; // { aes: CryptoKey, salt: Uint8Array } solo en memoria
const ITER = 600000;
const LEGACY_ITER = 120000;
let lockMode = "unlock"; // unlock | setup | migrate
let pendingPlain = null;
let locked = false;

const $ = (id) => document.getElementById(id);
const main = $("main");
const live = $("live");

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function segments(quotas = [3, 3, 2, 2], done = [0, 0, 0, 0]) {
  return SEGMENTS.map(([id, label, fallback], i) => ({
    id,
    label,
    quota: quotas[i] ?? fallback,
    done: done[i] ?? 0,
  }));
}

function seed() {
  return {
    settings: {
      encrypt: true,
      retentionDays: 30,
      autoDelete: false,
      lockOnLeave: true,
      cloudEnabled: false,
    },
    activeStudyId: "a",
    studies: [
      {
        id: "a",
        name: "Estudio Demo A · Línea X",
        scriptReady: true,
        segments: segments([3, 3, 2, 2], [2, 1, 0, 0]),
        questions: TEMPLATE.map((q, i) => ({ id: `q${i}`, ...q })),
      },
      {
        id: "b",
        name: "Estudio Demo B · Feria",
        scriptReady: false,
        segments: segments([2, 2, 1, 1], [0, 0, 0, 0]),
        questions: [],
      },
    ],
    interviews: [
      {
        id: "e0417",
        studyId: "a",
        code: "E-0417",
        number: "07",
        segmentId: "jovenes",
        contact: "",
        savedAt: Date.parse("2026-10-22T10:40:00-03:00"),
        consent: { participate: true, audio: false, photos: false, cloud: false },
        notes: [
          { t: "02:10", text: "Recarga en kiosko, no en app" },
          { t: "04:55", text: "Evita hora punta por niño" },
        ],
        tags: ["#recarga", "#espera", "#cuidado"],
        audio: [],
        photos: [],
        videos: [],
      },
    ],
    batches: [
      { id: "l1", studyId: "a", name: "Lote 1 · Estación Demo Norte", window: "08:00–10:00", goal: 4, done: 4 },
      { id: "l2", studyId: "a", name: "Lote 2 · Estación Demo Centro", window: "10:30–12:30", goal: 4, done: 3 },
      { id: "l3", studyId: "a", name: "Lote 3 · Estación Demo Sur", window: "15:00–17:00", goal: 4, done: 0 },
    ],
    draft: null,
  };
}

function b64(bytes) {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (const n of arr) s += String.fromCharCode(n);
  return btoa(s);
}

function unb64(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(pass, salt, iterations = ITER) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function makeKey(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { aes: await derive(pass, salt, ITER), salt };
}

async function encryptWithKey(obj, k) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    k.aes,
    new TextEncoder().encode(JSON.stringify(obj)),
  );
  const meta = k.meta || { kdf: "PBKDF2-SHA256", iter: ITER };
  return { v: 3, enc: true, ...meta, salt: b64(k.salt), iv: b64(iv), data: b64(data) };
}

async function encryptJSON(obj, pass) {
  return encryptWithKey(obj, await makeKey(pass));
}

// ── Passkey (WebAuthn PRF) ────────────────────────────────────────────
// La salida PRF (32 bytes, ligada a la passkey y a prfSalt) es material de
// clave; HKDF-SHA256 la convierte en la clave AES-GCM. Sin servidor: el
// challenge es local y la seguridad viene de que solo el autenticador puede
// producir la salida PRF. Nada de esto se guarda en claro salvo credId y sales.
const PRF_INFO = new TextEncoder().encode("campo.etnografia aes-gcm v1");

function hasWebAuthn() {
  return typeof window.PublicKeyCredential === "function" && !!navigator.credentials;
}

async function prfToKey(prfOut, salt) {
  const base = await crypto.subtle.importKey("raw", prfOut, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: PRF_INFO },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function prfEval(credId, prfSalt) {
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: credId }],
      userVerification: "required",
      timeout: 60000,
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  });
  const out = cred?.getClientExtensionResults?.().prf?.results?.first;
  if (!out) throw new Error("no-prf");
  return out;
}

async function makePasskeyKey() {
  const prfSalt = crypto.getRandomValues(new Uint8Array(32));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Campo · etnografía", id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "investigador", displayName: "Investigador · Campo" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      timeout: 60000,
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  });
  const ext = cred.getClientExtensionResults?.().prf || {};
  if (!ext.enabled && !ext.results?.first) throw new Error("no-prf");
  const credId = new Uint8Array(cred.rawId);
  // Algunos autenticadores (iCloud Keychain) no devuelven la salida en create(): pedirla con get().
  const out = ext.results?.first || (await prfEval(credId, prfSalt));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { aes: await prfToKey(out, salt), salt, meta: { kdf: "WEBAUTHN-PRF-HKDF-SHA256", credId: b64(credId), prfSalt: b64(prfSalt) } };
}

async function passkeyKeyFromBlob(blob) {
  const out = await prfEval(unb64(blob.credId), unb64(blob.prfSalt));
  const salt = unb64(blob.salt);
  return { aes: await prfToKey(out, salt), salt, meta: { kdf: blob.kdf, credId: blob.credId, prfSalt: blob.prfSalt } };
}

async function decryptWithKey(blob, aes) {
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, aes, unb64(blob.data));
  return JSON.parse(new TextDecoder().decode(clear));
}

function isPasskeyBlob(blob) {
  return blob?.kdf === "WEBAUTHN-PRF-HKDF-SHA256";
}

async function decryptJSON(blob, pass) {
  const aes = await derive(pass, unb64(blob.salt), Number(blob.iter) || LEGACY_ITER);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(blob.iv) },
    aes,
    unb64(blob.data),
  );
  return JSON.parse(new TextDecoder().decode(clear));
}

async function load() {
  const raw = localStorage.getItem(STORE);
  locked = true;
  state = null;
  if (!raw) {
    showLock("setup", "Primer uso: crea tu clave, con 8 caracteres o más.\nTodo queda protegido en este teléfono.\nLa clave no se guarda: anótala en un lugar seguro.");
    return;
  }
  const blob = JSON.parse(raw);
  if (!blob.enc) {
    pendingPlain = blob.payload;
    showLock("migrate", "Hay datos sin proteger de una versión anterior.\nCrea una clave para protegerlos.\nLa copia sin proteger se borra.");
    return;
  }
  showLock("unlock", "Tu estudio está protegido en este teléfono.\nEscribe tu clave para abrirlo.");
}

function showLock(mode, help) {
  lockMode = mode;
  $("lock").hidden = false;
  $("lock-help").textContent = help;
  $("lock-form").hidden = false;
  $("lock-again-field").hidden = mode === "unlock";
  $("lock-pass").autocomplete = mode === "unlock" ? "current-password" : "new-password";
  $("lock-submit").textContent = mode === "unlock" ? "Desbloquear" : "Crear clave y proteger datos";
  let pk = false;
  try { pk = isPasskeyBlob(JSON.parse(localStorage.getItem(STORE) || "null")); } catch { pk = false; }
  // Estudio con passkey: solo la passkey lo abre (no hay frase).
  $("lock-form").hidden = mode === "unlock" && pk;
  $("lock-passkey").hidden = !hasWebAuthn() || (mode === "unlock" && !pk);
  $("lock-passkey").textContent = mode === "unlock" ? "Desbloquear con passkey" : "Crear passkey y proteger datos";
  $("lock-or").hidden = $("lock-passkey").hidden || $("lock-form").hidden;
  $("lock-pass").value = "";
  $("lock-again").value = "";
  $("lock-error").textContent = "";
}

async function persist() {
  if (!state || !key) return; // nunca se guarda en claro
  delete state.exportPass;
  state.settings.encrypt = true;
  localStorage.setItem(STORE, JSON.stringify(await encryptWithKey(state, key)));
}

function route() {
  const raw = (location.hash || "#/estudios").slice(1);
  const [path, query] = raw.split("?");
  return { path: path || "/estudios", params: new URLSearchParams(query || "") };
}

let toastTimer = 0;
function say(text, visible = "Guardado ✓") {
  live.textContent = text;
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = h("p", { id: "toast", class: "toast", "aria-hidden": "true" });
    document.body.append(toast);
  }
  toast.textContent = visible || text;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2000);
}

let draftTimer = 0;
function persistSoon() {
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(() => persist(), 400);
}

function studyById(id) {
  return state.studies.find((s) => s.id === id) || state.studies[0] || null;
}

function tally(study) {
  const done = study.segments.reduce((n, s) => n + s.done, 0);
  const quota = study.segments.reduce((n, s) => n + s.quota, 0);
  return { done, quota };
}

function h(tag, props = {}, kids = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (name === "class") node.className = value;
    else if (name === "text") node.textContent = value;
    else node.setAttribute(name, value === true ? "" : String(value));
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}

function field(label, input) {
  return h("label", { class: "field" }, [h("span", { text: label }), input]);
}

function input(props) {
  return h("input", props);
}

function button(text, attrs = {}) {
  return h("button", { type: "button", ...attrs, text });
}

function showChrome(path) {
  const back = $("back");
  const privacy = $("privacy");
  const tabbar = $("tabbar");
  const solo = ["/nuevo", "/consentimiento", "/entrevista"].includes(path);
  back.classList.toggle("hidden", path === "/estudios" || path === "/privacidad");
  privacy.classList.toggle("hidden", path !== "/estudios");
  tabbar.classList.toggle("hidden", solo);
  for (const link of tabbar.querySelectorAll("a")) {
    const on = link.dataset.tab === TABS[path];
    if (on) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

function head(eyebrow, title, subtitle) {
  $("eyebrow").textContent = eyebrow || "";
  $("title").textContent = title;
  $("subtitle").textContent = subtitle || "";
}

function paint(node) {
  main.replaceChildren(node);
}

function screenSinEstudio() {
  head("Campo", "Sin estudios", "Crea uno para empezar");
  const box = h("div", { id: "empty-study" });
  box.append(h("p", { class: "notice", text: "Todav\u00eda no tienes estudios.\nCrea uno para empezar." }));
  box.append(button("Crear estudio", { "data-go": "#/nuevo", id: "empty-create" }));
  paint(box);
}

const DAY = 24 * 60 * 60 * 1000;
function dueAt(row) {
  return row.retainUntil || ((row.savedAt || Date.now()) + state.settings.retentionDays * DAY);
}
function deleteAt(row) {
  return Math.max(dueAt(row), (row.warnedAt || Date.now()) + 3 * DAY);
}
function expiring() {
  if (!state?.settings.autoDelete) return [];
  const soon = Date.now() + 3 * DAY;
  return state.interviews.filter((row) => dueAt(row) <= soon);
}
function shortDate(ms) {
  return new Date(ms).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
}
function retentionWarning() {
  const soon = expiring();
  if (!soon.length) return null;
  let marked = false;
  for (const row of soon) if (!row.warnedAt) { row.warnedAt = Date.now(); marked = true; }
  if (marked) persist();
  const studyName = (row) => state.studies.find((x) => x.id === row.studyId)?.name || "Estudio";
  const card = h("section", { class: "card notice", id: "retention-warning", role: "status", "aria-labelledby": "ret-title" }, [
    h("h2", { id: "ret-title", text: "Se borra pronto" }),
    h("p", { text: "Estas entrevistas se borran en 72 h o menos.\nExp\u00f3rtalas antes si las necesitas." }),
    ul(soon.map((row) => row.code + " \u00b7 " + studyName(row) + " \u00b7 se borra el " + shortDate(deleteAt(row)))),
  ]);
  const canPostpone = soon.filter((row) => !row.postponed);
  if (canPostpone.length) card.append(button("Posponer 7 d\u00edas", { id: "postpone" }));
  else card.append(h("p", { class: "meta", text: "Ya pospusiste una vez." }));
  card.append(button("Exportar evidencias", { class: "secondary", "data-go": "#/evidencias?study=" + soon[0].studyId }));
  card.addEventListener("click", async (event) => {
    if (!(event.target instanceof HTMLElement) || event.target.id !== "postpone") return;
    for (const row of canPostpone) {
      row.retainUntil = Math.max(dueAt(row), Date.now()) + 7 * DAY;
      row.postponed = true;
      row.warnedAt = null;
    }
    await persist();
    say("Borrado pospuesto 7 d\u00edas.", "Pospuesto \u2713");
    render();
  });
  return card;
}

function screenEstudios() {
  head("Campo", "Mis estudios", "Tus datos quedan solo en este teléfono, protegidos con tu clave");
  const box = h("div");
  const warning = retentionWarning();
  if (warning) box.append(warning);
  if (!state.studies.length) box.append(h("p", { class: "notice", id: "no-studies", text: "Todav\u00eda no tienes estudios.\nCrea uno para empezar." }));
  for (const study of state.studies) {
    const t = tally(study);
    const card = h("article", { class: "card" }, [
      h("h2", { text: study.name }),
      h("p", { text: `${t.done} de ${t.quota} entrevistas` }),
    ]);
    card.append(button("Abrir estudio", { "data-go": `#/preparar?study=${study.id}` }));
    box.append(card);
  }
  box.append(button("Crear estudio", { "data-go": "#/nuevo" }));
  box.append(h("p", { class: "notice", text: "Sin sincronización en la nube. Respaldo: exportación manual." }));
  if (state.settings.autoDelete) {
    box.append(h("p", { class: "notice", text: "Borrado autom\u00e1tico activo.\nTe avisamos aqu\u00ed 72 h antes de borrar." }));
  }
  paint(box);
}

function screenNuevo() {
  head("", "Nuevo estudio", "Define guion, segmentos y cupos");
  const draft = {
    name: "Estudio Demo C · Paraderos",
    questions: [],
    segments: segments([3, 3, 2, 2]),
  };
  const box = h("div");
  const name = input({ type: "text", value: draft.name, "aria-label": "Nombre del estudio" });
  box.append(field("Nombre del estudio", name));
  const plant = h("section", { class: "card" }, [
    h("h2", { text: "Partir desde plantilla" }),
    button("Usar plantilla guion v3", { id: "use-template" }),
    h("p", { text: "Carga Apertura (P1–P3, 2b), Clasificador, 4 segmentos y Cierre. Sin datos personales." }),
  ]);
  box.append(plant);
  const list = h("div", { id: "q-list" });
  const segs = h("div", { id: "seg-list" });
  box.append(h("h2", { text: "Segmentos y cupos" }), segs, h("h2", { text: "Preguntas" }), list);
  box.append(button("Guardar estudio", { id: "save-study" }));

  function drawQuestions() {
    list.replaceChildren();
    if (!draft.questions.length) {
      list.append(h("p", { class: "meta", text: "Sin preguntas todavía." }));
      return;
    }
    draft.questions.forEach((q, index) => {
      const text = input({ type: "text", value: q.text, "data-q": String(index) });
      const row = h("div", { class: "card q" }, [
        h("p", { class: "meta", text: q.block }),
        text,
        h("div", { class: "row" }, [
          button("Subir", { class: "secondary", "data-up": String(index) }),
          button("Bajar", { class: "secondary", "data-down": String(index) }),
          button("Eliminar", { class: "secondary", "data-del": String(index) }),
        ]),
      ]);
      list.append(row);
    });
  }
  function drawSegs() {
    segs.replaceChildren();
    for (const seg of draft.segments) {
      segs.append(h("div", { class: "card stepper" }, [
        h("span", { text: seg.label }),
        h("div", { class: "row" }, [
          button("−", { class: "icon-btn", "data-minus": seg.id, "aria-label": `Restar cupo ${seg.label}` }),
          h("strong", { text: String(seg.quota) }),
          button("+", { class: "icon-btn", "data-plus": seg.id, "aria-label": `Sumar cupo ${seg.label}` }),
        ]),
      ]));
    }
  }
  box.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id === "use-template") {
      draft.questions = TEMPLATE.map((q, i) => ({ id: uid("q"), ...q }));
      drawQuestions();
      say("Plantilla guion v3 cargada");
    }
    if (t.dataset.up) move(Number(t.dataset.up), -1);
    if (t.dataset.down) move(Number(t.dataset.down), 1);
    if (t.dataset.del) {
      draft.questions.splice(Number(t.dataset.del), 1);
      drawQuestions();
    }
    if (t.dataset.minus || t.dataset.plus) {
      const seg = draft.segments.find((s) => s.id === (t.dataset.minus || t.dataset.plus));
      seg.quota = Math.max(0, seg.quota + (t.dataset.plus ? 1 : -1));
      drawSegs();
    }
    if (t.id === "save-study") {
      const created = {
        id: uid("s"),
        name: name.value.trim() || "Estudio sin nombre",
        scriptReady: draft.questions.length > 0,
        segments: draft.segments.map((s) => ({ ...s, done: 0 })),
        questions: draft.questions.map((q) => ({ ...q, text: q.text })),
      };
      state.studies.unshift(created);
      state.activeStudyId = created.id;
      persist().then(() => {
        location.hash = `#/preparar?study=${created.id}`;
      });
    }
  });
  box.addEventListener("change", (event) => {
    const t = event.target;
    if (t instanceof HTMLInputElement && t.dataset.q) {
      draft.questions[Number(t.dataset.q)].text = t.value;
    }
  });
  function move(index, dir) {
    const next = index + dir;
    if (next < 0 || next >= draft.questions.length) return;
    const [item] = draft.questions.splice(index, 1);
    draft.questions.splice(next, 0, item);
    drawQuestions();
  }
  drawSegs();
  drawQuestions();
  paint(box);
}

function screenPreparar(study) {
  state.activeStudyId = study.id;
  head(study.name, "Preparar guion", study.scriptReady ? "Guion v3 · Apertura → Segmento → Cierre" : "Este estudio todavía no tiene guion");
  const box = h("div");
  const blocks = new Map();
  for (const q of study.questions) {
    if (!blocks.has(q.block)) blocks.set(q.block, []);
    blocks.get(q.block).push(q);
  }
  if (!blocks.size) box.append(h("p", { class: "notice", text: "Carga la plantilla desde Nuevo estudio, o abre el demo A." }));
  for (const [block, items] of blocks) {
    const card = h("section", { class: "card" }, [h("h2", { text: block })]);
    items.forEach((q, i) => {
      const label = block === "Apertura" ? `P${i + 1} · ${q.text}` : q.text;
      card.append(h("p", { text: label }));
    });
    box.append(card);
  }
  box.append(h("h2", { text: "Segmentos" }));
  const chips = h("div", { class: "row" });
  for (const seg of study.segments) chips.append(h("span", { class: "chip", text: seg.label }));
  box.append(chips);
  const cupos = study.segments.map((s) => `${s.label.split(" · ")[0]} ${s.done}/${s.quota}`).join(" · ");
  box.append(h("section", { class: "card" }, [h("h2", { text: "Cupos del lote" }), h("p", { text: cupos })]));
  box.append(h("p", { text: "Cierre: agradecer y explicar el límite de uso de datos." }));
  box.append(button("Guion listo", { "data-go": `#/lotes?study=${study.id}`, id: "script-ready" }));
  box.addEventListener("click", (event) => {
    const t = event.target;
    if (t instanceof HTMLElement && t.id === "script-ready") {
      study.scriptReady = study.questions.length > 0 || study.scriptReady;
      persist();
    }
  });
  paint(box);
}

function screenLotes(study) {
  const today = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "2-digit" });
  head(study.name, "Lotes del d\u00eda", today.charAt(0).toUpperCase() + today.slice(1));
  const box = h("div");
  let rows = state.batches.filter((b) => b.studyId === study.id);
  if (!rows.length) {
    const goal = study.segments.reduce((n, s) => n + s.quota, 0) || 4;
    state.batches.push({ id: uid("l"), studyId: study.id, name: "Hoy", window: "Sin horario", goal, done: 0 });
    rows = state.batches.filter((b) => b.studyId === study.id);
    persist();
    box.append(h("p", { class: "notice", text: "Creamos un lote: Hoy.\nPuedes partir ya." }));
  }
  for (const batch of rows) {
    box.append(h("article", { class: "card" }, [
      h("h2", { text: batch.name }),
      h("p", { text: `${batch.window} · ${batch.done}/${batch.goal}${batch.done >= batch.goal ? " ✓" : ""}` }),
    ]));
  }
  const open = rows.find((b) => b.done < b.goal) || rows[rows.length - 1];
  const label = open.done < open.goal ? `Iniciar ${open.name.split(" · ")[0].toLowerCase()}` : "Iniciar entrevista extra";
  box.append(button(open.name === "Hoy" && open.done < open.goal ? "Iniciar entrevista" : label, { "data-go": `#/consentimiento?study=${study.id}&batch=${open.id}`, id: "start-batch" }));
  paint(box);
}

function blankConsent() {
  return { participate: false, audio: false, photos: false, cloud: false };
}

function screenConsent(study, batchId, interviewId) {
  head(study.name, "Consentimiento", "Se registra por entrevista. No bloquea la grabación.");
  const box = h("form");
  box.append(h("p", { class: "card", text: "Propósito, uso anónimo, derecho a retirarse y a pedir borrado (Ley 19.628)." }));
  const checks = [
    ["participate", "La persona acepta participar"],
    ["audio", "Acepta grabación de audio"],
    ["photos", "Acepta fotos sin rostro"],
  ];
  const prior = interviewId
    ? (state.draft && state.draft.id === interviewId ? state.draft : state.interviews.find((i) => i.id === interviewId)) || null
    : null;
  const savedPrior = prior && prior !== state.draft ? prior : null;
  const consent = { ...blankConsent(), ...(prior && prior.consent) };
  for (const [name, label] of checks) {
    const boxCheck = h("label", { class: "check" }, [
      input({ type: "checkbox", name, checked: consent[name] ? true : null }),
      h("span", { text: label }),
    ]);
    box.append(boxCheck);
  }
  const cloudCard = h("section", { class: "card" }, [
    h("p", { class: "eyebrow", text: "Opcional y separado" }),
    h("label", { class: "check" }, [
      input({ type: "checkbox", name: "cloud", disabled: state.settings.cloudEnabled ? null : true, checked: state.settings.cloudEnabled && consent.cloud ? true : null }),
      h("span", { text: "Acepta transcripción en la nube" }),
    ]),
    h("p", { text: "Opt-in explícito por entrevista: envía audio a un tercero. Si no se marca, el audio nunca sale del teléfono." }),
  ]);
  if (!state.settings.cloudEnabled) cloudCard.append(h("p", { class: "meta", text: "La transcripción en la nube está apagada en Privacidad." }));
  box.append(cloudCard);
  const used = new Set(state.interviews.filter((i) => i.studyId === study.id).map((i) => i.code));
  if (state.draft && state.draft.studyId === study.id) used.add(state.draft.code);
  const current = prior ? prior.code : "";
  let seq = state.interviews.filter((i) => i.studyId === study.id).length + 1;
  while (used.has(`P${seq}`)) seq += 1;
  const code = input({ type: "text", name: "code", value: current || `P${seq}`, autocomplete: "off" });
  box.append(field("Código anónimo (no nombre)", code));
  box.append(button(savedPrior ? "Guardar consentimiento" : "Iniciar entrevista", { type: "submit", id: "start" }));
  box.append(button("Continuar sin consentimiento de audio", { type: "submit", id: "start-no-audio", class: "secondary" }));
  box.append(h("p", { text: "Ningún check es obligatorio. El estado queda guardado en la entrevista y se puede completar después." }));
  box.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(box);
    const submitter = event.submitter;
    const next = {
      participate: data.get("participate") === "on",
      audio: submitter && submitter.id === "start-no-audio" ? false : data.get("audio") === "on",
      photos: data.get("photos") === "on",
      cloud: state.settings.cloudEnabled && data.get("cloud") === "on",
    };
    if (savedPrior) {
      savedPrior.code = String(data.get("code") || "").trim() || savedPrior.code;
      savedPrior.consent = next;
      await persist();
      say("Consentimiento guardado.");
      location.hash = `#/registro?id=${savedPrior.id}`;
      return;
    }
    const existing = interviewId && state.draft && state.draft.id === interviewId ? state.draft : null;
    const draft = existing || {
      id: uid("e"),
      studyId: study.id,
      batchId: batchId || "",
      number: String(state.interviews.filter((i) => i.studyId === study.id).length + 1).padStart(2, "0"),
      segmentId: study.segments[0]?.id || "jovenes",
      contact: "",
      notes: [],
      tags: [],
      audio: [],
      photos: [],
      videos: [],
      startedAt: Date.now(),
      questionIndex: 0,
    };
    draft.code = String(data.get("code") || "").trim() || draft.code || "SIN-CODIGO";
    draft.consent = next;
    state.draft = draft;
    persist().then(() => {
      location.hash = `#/entrevista?id=${draft.id}`;
    });
  });
  paint(box);
}

function elapsed(startedAt) {
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function screenEntrevista(draft, study) {
  head(study.name, `Entrevista ${draft.code}`, `${elapsed(draft.startedAt)} en entrevista · ${study.segments.find((s) => s.id === draft.segmentId)?.label || ""}`);
  const box = h("div");
  if (!draft.consent.audio) {
    const warn = h("p", { class: "notice", role: "status" });
    warn.append("Sin consentimiento de audio registrado. ");
    warn.append(button("Registrar", { "data-go": `#/consentimiento?study=${study.id}&batch=${draft.batchId || ""}&id=${draft.id}` }));
    box.append(warn);
  }
  const audioInput = input({ type: "file", accept: "audio/*", id: "audio-file" });
  audioInput.hidden = true;
  const photoInput = input({ type: "file", accept: "image/*", capture: "environment", id: "photo-file" });
  photoInput.hidden = true;
  box.append(button("Anotar audio de Notas de voz", { id: "pick-audio" }));
  box.append(h("p", { class: "meta", text: "Graba con Notas de voz.\nAquí se anota solo el nombre y el tamaño del clip.\nEl audio queda en Notas de voz, no en esta app." }));
  const audioList = h("div", { id: "audio-list" });
  box.append(audioList, audioInput);
  // Grabación en la app (beta) oculta: grababa 4 s y no guardaba el audio.
  const recStatus = h("p", { id: "rec-status", class: "meta", role: "status", text: "" });
  const controls = h("div", { class: "row" }, [
    button("Anotar foto", { id: "pick-photo", class: "chip" }),
    button("Nota", { id: "add-note", class: "chip" }),
  ]);
  box.append(controls, photoInput);
  box.append(h("p", { class: "meta", text: "La foto queda en tu galería.\nAquí se anota solo el nombre y el tamaño." }));
  const noteInput = input({ type: "text", id: "note-text", placeholder: "Nota con la hora de la entrevista", value: draft.noteDraft || "", "aria-label": "Nota" });
  box.append(noteInput);
  noteInput.addEventListener("input", () => { draft.noteDraft = noteInput.value; persistSoon(); });
  const notes = h("div", { class: "card", id: "notes" });
  box.append(notes);
  box.append(h("h2", { text: "Tags" }));
  const tags = h("div", { class: "row", id: "tags" });
  box.append(tags);
  const q = study.questions[draft.questionIndex] || study.questions[0];
  const qInput = input({ type: "text", id: "q-now", value: q ? q.text : "" });
  box.append(field("Pregunta actual", qInput));
  const seg = h("select", { id: "segment" });
  for (const item of study.segments) {
    const opt = h("option", { value: item.id, text: item.label });
    if (item.id === draft.segmentId) opt.setAttribute("selected", "");
    seg.append(opt);
  }
  box.append(field("Categoría / segmento", seg));
  box.append(button("Terminar y registrar", { id: "finish" }));

  function drawLists() {
    const kb = (n) => (n ? ` · ${Math.max(1, Math.round(n / 1024))} KB` : "");
    audioList.replaceChildren(
      ...draft.audio.map((a) => h("p", { text: `Audio: ${a.name}${kb(a.bytes)}` })),
      ...draft.photos.map((p) => h("p", { text: `Foto: ${p.name}${kb(p.bytes)}` })),
    );
    notes.replaceChildren(...draft.notes.map((n) => h("p", { text: `${n.t} · ${n.text}` })));
    tags.replaceChildren(...TAGS.map((tag) => button(tag, {
      class: "chip",
      "data-tag": tag,
      "aria-pressed": draft.tags.includes(tag) ? "true" : "false",
    })));
  }
  drawLists();
  box.addEventListener("click", async (event) => {
    const t = event.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id === "pick-audio") audioInput.click();
    if (t.id === "pick-photo") photoInput.click();
    if (t.id === "add-note") {
      const text = noteInput.value.trim();
      if (!text) return;
      draft.notes.push({ t: elapsed(draft.startedAt), text });
      noteInput.value = "";
      draft.noteDraft = "";
      await persist();
      drawLists();
      say("Nota guardada en este teléfono");
    }
    if (t.dataset.tag) {
      const tag = t.dataset.tag;
      draft.tags = draft.tags.includes(tag) ? draft.tags.filter((x) => x !== tag) : [...draft.tags, tag];
      await persist();
      drawLists();
    }
    if (t.id === "rec") {
      if (!navigator.mediaDevices?.getUserMedia) {
        recStatus.textContent = "Este navegador no abre el micrófono. Usa Notas de voz y adjunta el archivo.";
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        const chunks = [];
        rec.addEventListener("dataavailable", (ev) => chunks.push(ev.data));
        rec.addEventListener("stop", async () => {
          stream.getTracks().forEach((track) => track.stop());
          draft.audio.push({ name: `beta-${draft.code}-${draft.audio.length + 1}.webm`, bytes: chunks.reduce((n, c) => n + c.size, 0) });
          await persist();
          drawLists();
          recStatus.textContent = "Clip guardado solo con su nombre y tamaño. El audio no sale del teléfono.";
        });
        rec.start();
        recStatus.textContent = "Grabando 4 segundos en este teléfono.";
        setTimeout(() => rec.state === "recording" && rec.stop(), 4000);
      } catch {
        recStatus.textContent = "El micrófono no autorizó la grabación. Adjunta el audio desde Notas de voz.";
      }
    }
    if (t.id === "finish") {
      draft.segmentId = seg.value;
      draft.questionText = qInput.value;
      await persist();
      location.hash = `#/registro?id=${draft.id}`;
    }
  });
  audioInput.addEventListener("change", async () => {
    const file = audioInput.files && audioInput.files[0];
    if (!file) return;
    draft.audio.push({ name: file.name, bytes: file.size });
    await persist();
    drawLists();
    say("Audio anotado: nombre y tamaño. El clip queda en Notas de voz.", "Anotado ✓");
  });
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    draft.photos.push({ name: file.name, bytes: file.size });
    await persist();
    drawLists();
    say("Foto anotada: nombre y tamaño. La foto queda en tu galería.", "Anotado ✓");
  });
  paint(box);
  const timer = window.setInterval(() => {
    if (route().path !== "/entrevista") {
      window.clearInterval(timer);
      return;
    }
    $("subtitle").textContent = `${elapsed(draft.startedAt)} en entrevista · ${study.segments.find((s) => s.id === draft.segmentId)?.label || ""}`;
  }, 1000);
}

function currentInterview(id) {
  if (state.draft && state.draft.id === id) return state.draft;
  return state.interviews.find((item) => item.id === id) || state.draft || state.interviews[0];
}

function screenRegistro(item, study) {
  const saved = state.interviews.some((row) => row.id === item.id);
  head(study.name, "Registro de respuesta", "Hoja de registro · Guerrilla");
  const box = h("form");
  const number = input({ type: "text", name: "number", value: item.number || "" });
  const code = input({ type: "text", name: "code", value: item.code || "" });
  const contact = input({ type: "text", name: "contact", value: item.contact || "", placeholder: "Vacío si no lo entrega" });
  const seg = h("select", { name: "segment" });
  for (const option of study.segments) {
    const node = h("option", { value: option.id, text: option.label });
    if (option.id === item.segmentId) node.setAttribute("selected", "");
    seg.append(node);
  }
  const when = input({
    type: "text",
    name: "when",
    value: new Date(item.savedAt || Date.now()).toLocaleString("es-CL", { hour12: false }),
  });
  box.append(
    field("N°", number),
    field("Código (en vez de nombre)", code),
    field("Contacto (opcional)", contact),
    h("p", { class: "meta", text: "Si la persona no entrega contacto, déjalo vacío." }),
    field("Categoría / segmento", seg),
    field("Fecha", when),
  );
  const c = item.consent || blankConsent();
  const status = `Consentimiento: audio ${c.audio ? "sí" : "sin registrar"} · fotos ${c.photos ? "sí" : "no"} · nube ${c.cloud ? "sí" : "no"}`;
  const line = h("p", { class: "card", text: status });
  line.append(button("Completar", { "data-go": `#/consentimiento?study=${study.id}&id=${item.id}` }));
  box.append(line);
  if (!saved) box.append(button("Guardar registro", { type: "submit" }));
  else box.append(h("p", { text: "Este registro ya está en este teléfono." }));
  box.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saved) return;
    const data = new FormData(box);
    item.number = String(data.get("number") || "");
    item.code = String(data.get("code") || "");
    item.contact = String(data.get("contact") || "");
    item.segmentId = String(data.get("segment") || item.segmentId);
    item.savedAt = Date.now();
    state.interviews.push(item);
    const segRow = study.segments.find((row) => row.id === item.segmentId);
    if (segRow) segRow.done += 1;
    const batch = state.batches.find((row) => row.id === item.batchId);
    if (batch) batch.done += 1;
    if (state.draft && state.draft.id === item.id) state.draft = null;
    await persist();
    say("Registro guardado en este teléfono");
    location.hash = `#/lotes?study=${study.id}`;
  });
  paint(box);
}

function strength(pass) {
  let n = 0;
  if (pass.length >= 8) n += 1;
  if (pass.length >= 12) n += 1;
  if (/[0-9]/.test(pass) && /[a-zA-Z]/.test(pass)) n += 1;
  if (/[^a-zA-Z0-9]/.test(pass)) n += 1;
  return n;
}

function screenEvidencias(study) {
  head(study.name, "Evidencias", "Elige qué exportar");
  const rows = state.interviews.filter((row) => row.studyId === study.id);
  const photos = rows.reduce((n, row) => n + row.photos.length, 0);
  const videos = rows.reduce((n, row) => n + row.videos.length, 0);
  const box = h("form");
  for (const [name, label] of [
    ["photos", `Fotos (${photos})`],
    ["videos", `Videos (${videos})`],
    ["records", `Registros (${rows.length})`],
    ["observations", `Fichas de observación (${obsList().length})`],
  ]) {
    const check = input({ type: "checkbox", name, checked: true });
    box.append(h("label", { class: "check" }, [check, h("span", { text: label })]));
  }
  box.append(h("p", { class: "notice", text: "El audio y las transcripciones solo se exportan con permiso.\nLas fotos van sin ubicación GPS." }));
  const pass = input({ type: "password", name: "pass", autocomplete: "new-password" });
  const again = input({ type: "password", name: "again", autocomplete: "new-password" });
  const bars = h("div", { class: "bars", id: "bars" }, [h("i"), h("i"), h("i"), h("i")]);
  box.append(h("section", { class: "card" }, [
    h("h2", { text: "Paso 2 de 3 · Clave del archivo" }),
    field("Clave del archivo", pass),
    bars,
    field("Repite la clave", again),
  ]));
  const local = input({ type: "radio", name: "dest", value: "phone", checked: true });
  const icloud = input({ type: "radio", name: "dest", value: "icloud" });
  const drive = input({ type: "radio", name: "dest", value: "drive" });
  box.append(h("section", { class: "card" }, [
    h("h2", { text: "Paso 3 de 3 · Destino" }),
    h("label", { class: "check" }, [local, h("span", { text: "Guardar en este teléfono (Archivos)" })]),
    h("label", { class: "check" }, [icloud, h("span", { text: "iCloud Drive" })]),
    h("label", { class: "check" }, [drive, h("span", { text: "Google Drive" })]),
    h("p", { class: "notice", text: "Por ahora no se abre iCloud ni Drive.\nEl archivo protegido se guarda en Descargas." }),
  ]));
  const err = h("p", { class: "error", role: "alert", id: "export-error" });
  pass.setAttribute("aria-describedby", "export-error");
  again.setAttribute("aria-describedby", "export-error");
  box.append(err, button("Exportar evidencias", { type: "submit" }));
  pass.addEventListener("input", () => {
    const n = strength(pass.value);
    for (const [i, bar] of [...bars.children].entries()) bar.classList.toggle("on", i < n);
  });
  box.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(box);
    const passphrase = String(data.get("pass") || "");
    if (passphrase.length < 8 || passphrase !== String(data.get("again") || "")) {
      err.textContent = "Las claves no coinciden o son muy cortas.\nEscribe la misma clave dos veces, con 8 caracteres o más.";
      return;
    }
    const includeAudio = rows.some((row) => row.consent.cloud);
    const payload = {
      study: study.name,
      exportedAt: new Date().toISOString(),
      destination: String(data.get("dest") || "phone"),
      photos: data.get("photos") ? rows.flatMap((row) => row.photos.map((p) => ({ code: row.code, name: p.name }))) : [],
      videos: data.get("videos") ? rows.flatMap((row) => row.videos) : [],
      records: data.get("records") ? rows.map((row) => ({
        code: row.code,
        number: row.number,
        segmentId: row.segmentId,
        contact: row.contact ? "entregado" : "",
        notes: row.notes,
        tags: row.tags,
        consent: row.consent,
        audio: includeAudio && row.consent.cloud ? row.audio.map((a) => a.name) : [],
      })) : [],
      observations: data.get("observations") ? obsList() : [],
    };
    const packed = await encryptJSON(payload, passphrase);
    const file = new Blob([JSON.stringify(packed)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = h("a", { href: url, download: `evidencias-${study.id}.campo.json` });
    a.click();
    // iOS: si se revoca al tiro, se corta la descarga a Archivos. Se revoca a los 60 s.
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    err.textContent = "";
    pass.value = "";
    again.value = "";
    for (const bar of bars.children) bar.classList.remove("on");
    say("Archivo protegido guardado en Descargas. Va sin GPS y sin audio si no hubo permiso.", "Exportado ✓");
  });
  paint(box);
}

function screenPrivacidad(study) {
  head("", "Privacidad", "Tus datos quedan protegidos en este teléfono");
  const box = h("form");
  const s = state.settings;
  const auto = input({ type: "checkbox", name: "autoDelete", checked: s.autoDelete ? true : null });
  const lockLeave = input({ type: "checkbox", name: "lockOnLeave", checked: s.lockOnLeave ? true : null });
  const cloud = input({ type: "checkbox", name: "cloudEnabled", checked: s.cloudEnabled ? true : null });
  const days = input({ type: "number", name: "retentionDays", min: "1", value: String(s.retentionDays) });
  const pass = input({ type: "password", name: "key", autocomplete: "new-password" });
  const err = h("p", { class: "error", role: "alert", id: "privacy-error" });
  days.setAttribute("aria-describedby", "privacy-error");
  box.append(
    h("p", { class: "notice", text: "La protección está siempre activa.\nDeja la clave vacía para mantener la actual." }),
    field("Nueva clave (opcional)", pass),
    field("Retención (días)", days),
    h("label", { class: "check" }, [auto, h("span", { text: "Borrar automáticamente al cumplir el plazo" })]),
    h("p", { class: "notice", text: "Te avisamos en Mis estudios 72 h antes de borrar.\nPuedes exportar o posponer 7 d\u00edas, una vez." }),
    h("label", { class: "check" }, [lockLeave, h("span", { text: "Bloquear al salir de la app" })]),
    h("label", { class: "check" }, [cloud, h("span", { text: "Permitir transcripción en la nube (solo con permiso)" })]),
    err,
    button("Guardar privacidad", { type: "submit" }),
  );
  const confirmWipe = input({ type: "text", id: "wipe-confirm", autocomplete: "off", autocapitalize: "characters", "aria-describedby": "wipe-help" });
  const wipeBtn = button("Borrar estudio y evidencias", { id: "wipe", class: "danger", disabled: true });
  if (study) box.append(h("section", { class: "card danger-zone", "aria-labelledby": "wipe-title" }, [
    h("h2", { id: "wipe-title", text: "Borrar estudio" }),
    h("p", { id: "wipe-help", text: "Borra el estudio y sus evidencias de este teléfono.\nNo se puede deshacer." }),
    field("Escribe BORRAR para confirmar", confirmWipe),
    wipeBtn,
  ]));
  confirmWipe.addEventListener("input", () => { wipeBtn.disabled = confirmWipe.value.trim() !== "BORRAR"; });
  box.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(box);
    const nextKey = String(data.get("key") || "");
    const rawDays = String(data.get("retentionDays") || "").trim();
    const nDays = Number(rawDays);
    days.setAttribute("aria-invalid", "false");
    if (!rawDays || !Number.isInteger(nDays) || nDays < 1) {
      days.setAttribute("aria-invalid", "true");
      err.textContent = "La retención tiene que ser de 1 día o más.\nEscribe un número entero, por ejemplo 30.";
      days.focus();
      return;
    }
    if (nextKey && nextKey.length < 8) {
      err.textContent = "La nueva clave necesita 8 caracteres o más.";
      return;
    }
    state.settings.autoDelete = data.get("autoDelete") === "on";
    state.settings.lockOnLeave = data.get("lockOnLeave") === "on";
    state.settings.cloudEnabled = data.get("cloudEnabled") === "on";
    state.settings.retentionDays = nDays;
    if (nextKey) key = await makeKey(nextKey);
    applyRetention();
    await persist();
    err.textContent = "";
    say("Privacidad guardada.");
    render();
  });
  wipeBtn.addEventListener("click", async () => {
    if (!study || confirmWipe.value.trim() !== "BORRAR") return;
    state.studies = state.studies.filter((row) => row.id !== study.id);
    state.interviews = state.interviews.filter((row) => row.studyId !== study.id);
    state.batches = state.batches.filter((row) => row.studyId !== study.id);
    if (state.draft && state.draft.studyId === study.id) state.draft = null;
    state.activeStudyId = state.studies[0]?.id || "";
    await persist();
    say("Estudio y evidencias borrados de este teléfono", "Borrado ✓");
    location.hash = "#/estudios";
  });
  paint(box);
}

function applyRetention() {
  if (!state?.settings.autoDelete) return;
  // Solo borra lo que ya se avisó en pantalla hace 72 h o más y ya venció.
  const now = Date.now();
  const before = state.interviews.length;
  state.interviews = state.interviews.filter((row) => !(row.warnedAt && now >= dueAt(row) && now - row.warnedAt >= 3 * DAY));
  if (state.interviews.length !== before) persist();
}

// ---- Guía de observación v3 + ficha ----
const OBS_TEMAS = GUIA.temas.map((t) => [t.id, `${t.n} · ${t.name}`]);
const OBS_PISTAS = [["recarga", "Recarga"], ["transbordo", "Transbordo"], ["pago", "Pago"], ["informacion", "Información"]];

function obsList() {
  if (!Array.isArray(state.observations)) state.observations = [];
  return state.observations;
}

function lugarCode(text) {
  const clean = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z]/g, "").toUpperCase();
  return clean.slice(0, 3) || "XXX";
}

function obsCode(lugar, when) {
  const d = when ? new Date(when) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const prefix = `OBS-${dd}-${mm}-${lugarCode(lugar)}-`;
  const n = obsList().filter((o) => o.code.startsWith(prefix)).length + 1;
  return `${prefix}${n}`;
}

function fold(title, kids, open = false) {
  return h("details", { class: "card fold", open: open || null }, [h("summary", { text: title }), ...kids]);
}

function ul(items) {
  return h("ul", {}, items.map((t) => h("li", { text: t })));
}

function screenGuia() {
  head("Campo", "Guía de observación", "v3 · FRUTA · Maas Chile");
  const box = h("div");
  box.append(h("p", { class: "notice", text: `Objetivo: ${GUIA.objetivo}` }));
  box.append(button("Crear ficha de observación", { "data-go": "#/observacion/nueva" }));
  box.append(button(`Ver mis fichas (${obsList().length})`, { "data-go": "#/observacion", class: "secondary" }));
  box.append(fold("Antes de salir · Al registrar", [ul(GUIA.antes)], true));
  box.append(fold("Sesiones", GUIA.sesiones.map((s) => h("div", { class: "session" }, [
    h("h3", { text: `${s.id} · ${s.dia}` }),
    h("p", { text: s.hora }),
    h("p", { text: s.recorrido }),
    h("p", { class: "meta", text: s.bloques }),
  ]))));
  for (const t of GUIA.temas) {
    box.append(fold(`${t.n} · ${t.name}`, [
      ...t.items.map(([k, v]) => h("p", {}, [h("strong", { text: `${k}: ` }), document.createTextNode(v)])),
      h("h3", { text: "Qué ya vimos" }), ul(t.vimos),
      h("h3", { text: "Dónde observarlo" }), h("p", { text: t.donde }),
      h("h3", { text: "Cuándo" }), h("p", { text: t.cuando }),
      h("h3", { text: "Pista para Maas" }), h("p", { text: t.pista }),
    ]));
  }
  box.append(fold("Ética de observación", [ul(GUIA.etica)]));
  box.append(fold("Puntos de observación", [ul(GUIA.puntos)]));
  paint(box);
}

function screenObsLista() {
  head("Guía", "Fichas de observación", "Guardadas solo en este teléfono");
  const box = h("div");
  box.append(button("Crear ficha", { "data-go": "#/observacion/nueva" }));
  const rows = obsList();
  if (!rows.length) box.append(h("p", { class: "notice", text: "Todavía no hay fichas." }));
  for (const o of [...rows].reverse()) {
    const tema = OBS_TEMAS.find(([id]) => id === o.tema)?.[1] || "";
    box.append(h("article", { class: "card" }, [
      h("h2", { text: o.code }),
      h("p", { class: "meta", text: `${o.lugar} · ${o.when.replace("T", " ")} · ${tema}` }),
      h("p", { text: `Vi: ${o.vi}` }),
      o.supongo ? h("p", { text: `Supongo (por preguntar): ${o.supongo}` }) : null,
      o.traba ? h("p", { text: `Traba: ${o.traba}` }) : null,
      o.ayuda ? h("p", { text: `Ayuda: ${o.ayuda}` }) : null,
      o.foto ? h("p", { text: `Foto N° ${o.foto}` }) : null,
      o.pistas?.length ? h("p", { text: `Pista para Maas: ${o.pistas.join(", ")}` }) : null,
    ]));
  }
  paint(box);
}

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function radios(name, options, legend) {
  return h("fieldset", { class: "card" }, [
    h("legend", { text: legend }),
    ...options.map(([v, l], i) => h("label", { class: "check" }, [input({ type: "radio", name, value: v, checked: i === 0 ? true : null }), h("span", { text: l })])),
  ]);
}

function screenObsNueva() {
  head("Guía", "Nueva ficha", "Lo que ves, sin nombres ni rostros");
  const box = h("form", { novalidate: true });
  const lugar = input({ type: "text", name: "lugar", required: true, placeholder: "Ej.: Pajaritos, paradero 516" });
  const when = input({ type: "datetime-local", name: "when", required: true, value: nowLocal() });
  const code = h("p", { class: "meta", id: "obs-code" });
  const upd = () => { code.textContent = `Código: ${obsCode(lugar.value, when.value)}`; };
  lugar.addEventListener("input", upd);
  when.addEventListener("input", upd);
  upd();
  const area = (name, ph, req) => h("textarea", { name, rows: "3", placeholder: ph || null, required: req || null });
  box.append(
    code,
    field("Lugar", lugar),
    field("Fecha y hora", when),
    radios("franja", [["punta", "Punta"], ["valle", "Valle"], ["noche", "Noche"]], "Contexto · franja"),
    field("Clima", input({ type: "text", name: "clima", placeholder: "Ej.: soleado, lluvia" })),
    radios("corte", [["no", "No"], ["si", "Sí"]], "¿Hay corte de servicio?"),
    radios("tema", OBS_TEMAS, "Tema"),
    field("Lo que vi (sin interpretar)", area("vi", null, true)),
    field("Lo que supongo · por preguntar", area("supongo")),
    field("Qué traba (una línea)", input({ type: "text", name: "traba" })),
    field("Qué ayuda (una línea)", input({ type: "text", name: "ayuda" })),
    field("Foto · número de referencia (sin rostros)", input({ type: "text", name: "foto", inputmode: "numeric" })),
    h("fieldset", { class: "card" }, [
      h("legend", { text: "Pista para Maas" }),
      ...OBS_PISTAS.map(([v, l]) => h("label", { class: "check" }, [input({ type: "checkbox", name: "pista", value: v }), h("span", { text: l })])),
    ]),
  );
  const err = h("p", { class: "error", role: "alert", id: "obs-error" });
  lugar.setAttribute("aria-describedby", "obs-error");
  box.querySelector('[name="vi"]').setAttribute("aria-describedby", "obs-error");
  box.append(err, button("Guardar ficha", { type: "submit" }));
  if (Array.isArray(state.obsDraft)) {
    for (const [name, value] of state.obsDraft) {
      for (const el of box.querySelectorAll(`[name="${name}"]`)) {
        if (el.type === "checkbox" || el.type === "radio") { if (el.value === value) el.checked = true; } else el.value = value;
      }
    }
    upd();
  }
  box.addEventListener("input", () => { state.obsDraft = [...new FormData(box).entries()].map(([k, v]) => [k, String(v)]); persistSoon(); });
  box.addEventListener("change", () => { state.obsDraft = [...new FormData(box).entries()].map(([k, v]) => [k, String(v)]); persistSoon(); });
  box.addEventListener("submit", async (event) => {
    event.preventDefault();
    const d = new FormData(box);
    const vi = String(d.get("vi") || "").trim();
    const lug = String(d.get("lugar") || "").trim();
    const missing = [];
    if (!lug) missing.push("el lugar");
    if (!vi) missing.push("lo que viste");
    box.querySelector('[name="lugar"]').setAttribute("aria-invalid", lug ? "false" : "true");
    box.querySelector('[name="vi"]').setAttribute("aria-invalid", vi ? "false" : "true");
    if (missing.length) {
      err.textContent = `Falta ${missing.join(" y ")}.\nCompleta el campo marcado para guardar.`;
      box.querySelector(lug ? '[name="vi"]' : '[name="lugar"]').focus();
      return;
    }
    const w = String(d.get("when") || nowLocal());
    obsList().push({
      id: uid("obs"),
      code: obsCode(lug, w),
      lugar: lug,
      when: w,
      franja: String(d.get("franja")),
      clima: String(d.get("clima") || ""),
      corte: d.get("corte") === "si",
      tema: String(d.get("tema")),
      vi,
      supongo: String(d.get("supongo") || ""),
      porPreguntar: Boolean(String(d.get("supongo") || "").trim()),
      traba: String(d.get("traba") || ""),
      ayuda: String(d.get("ayuda") || ""),
      foto: String(d.get("foto") || ""),
      pistas: d.getAll("pista").map(String),
      savedAt: Date.now(),
    });
    state.obsDraft = null;
    await persist();
    say("Ficha guardada en este teléfono.");
    location.hash = "#/observacion";
  });
  paint(box);
}

async function render() {
  if (locked || !state) return;
  applyRetention();
  const { path, params } = route();
  showChrome(path);
  const study = studyById(params.get("study") || state.activeStudyId);
  if (path === "/estudios") return screenEstudios();
  if (path === "/nuevo") return screenNuevo();
  if (!study && ["/preparar", "/lotes", "/consentimiento", "/entrevista", "/registro", "/evidencias"].includes(path)) return screenSinEstudio();
  if (path === "/preparar") return screenPreparar(study);
  if (path === "/lotes") return screenLotes(study);
  if (path === "/consentimiento") return screenConsent(study, params.get("batch"), params.get("id"));
  if (path === "/entrevista") {
    const draft = state.draft && state.draft.id === params.get("id") ? state.draft : state.draft;
    if (!draft) {
      location.hash = `#/lotes?study=${study.id}`;
      return;
    }
    return screenEntrevista(draft, studyById(draft.studyId));
  }
  if (path === "/registro") {
    const item = currentInterview(params.get("id"));
    if (!item) {
      location.hash = "#/estudios";
      return;
    }
    return screenRegistro(item, studyById(item.studyId));
  }
  if (path === "/evidencias") return screenEvidencias(study);
  if (path === "/privacidad") return screenPrivacidad(study);
  if (path === "/guia") return screenGuia();
  if (path === "/observacion") return screenObsLista();
  if (path === "/observacion/nueva") return screenObsNueva();
  location.hash = "#/estudios";
}

function goBack() {
  const { path, params } = route();
  const study = params.get("study") || state?.activeStudyId || "";
  const map = {
    "/nuevo": "#/estudios",
    "/preparar": "#/estudios",
    "/lotes": `#/preparar?study=${study}`,
    "/consentimiento": `#/lotes?study=${study}`,
    "/entrevista": `#/consentimiento?study=${study}`,
    "/registro": `#/entrevista?id=${params.get("id") || state?.draft?.id || ""}`,
    "/evidencias": "#/estudios",
    "/privacidad": "#/estudios",
    "/guia": "#/estudios",
    "/observacion": "#/guia",
    "/observacion/nueva": "#/observacion",
  };
  location.hash = map[path] || "#/estudios";
}

document.addEventListener("click", (event) => {
  const t = event.target;
  if (!(t instanceof HTMLElement)) return;
  if (t.id === "back") goBack();
  if (t.id === "privacy") location.hash = `#/privacidad?study=${state?.activeStudyId || ""}`;
  const dest = t.dataset.go;
  if (dest) location.hash = dest;
});

$("lock-open").addEventListener("click", () => {
  $("lock").hidden = true;
  $("lock-open").hidden = true;
});

async function finishUnlock() {
  locked = false;
  $("lock").hidden = true;
  $("lock-error").textContent = "";
  if (!location.hash) location.hash = "#/estudios";
  render();
}

$("lock-passkey").addEventListener("click", async () => {
  $("lock-error").textContent = "";
  try {
    if (lockMode !== "unlock") {
      key = await makePasskeyKey();
      state = lockMode === "migrate" ? pendingPlain : seed();
      pendingPlain = null;
      state.settings.encrypt = true;
      if (lockMode === "migrate") state.settings.lockOnLeave = true;
      await persist();
      return finishUnlock();
    }
    const blob = JSON.parse(localStorage.getItem(STORE) || "{}");
    const k = await passkeyKeyFromBlob(blob);
    state = await decryptWithKey(blob, k.aes);
    key = k;
    return finishUnlock();
  } catch (err) {
    $("lock-error").textContent = String(err?.message) === "no-prf"
      ? "Este teléfono no permite abrir con passkey.\nUsa tu clave."
      : "No se pudo usar la passkey (cancelada o no corresponde a este estudio).";
  }
});

$("lock-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const pass = $("lock-pass").value;
  if (lockMode !== "unlock") {
    if (pass.length < 8 || pass !== $("lock-again").value) {
      $("lock-error").textContent = "Las claves no coinciden o son muy cortas.\nEscribe la misma clave dos veces, con 8 caracteres o más.";
      return;
    }
    key = await makeKey(pass);
    state = lockMode === "migrate" ? pendingPlain : seed();
    pendingPlain = null;
    state.settings.encrypt = true;
    if (lockMode === "migrate") state.settings.lockOnLeave = true;
    await persist(); // sobrescribe la copia en claro
    locked = false;
    $("lock").hidden = true;
    if (!location.hash) location.hash = "#/estudios";
    render();
    return;
  }
  try {
    const blob = JSON.parse(localStorage.getItem(STORE) || "{}");
    if (!blob.enc) throw new Error("plain");
    state = await decryptJSON(blob, pass);
    if ((Number(blob.iter) || LEGACY_ITER) < ITER || "exportPass" in state) {
      key = await makeKey(pass);
      await persist(); // migración a 600k
    } else {
      key = { aes: await derive(pass, unb64(blob.salt), ITER), salt: unb64(blob.salt) };
    }
    locked = false;
    $("lock").hidden = true;
    $("lock-error").textContent = "";
    render();
  } catch {
    $("lock-error").textContent = "Esa clave no es correcta.\nRevísala y vuelve a intentarlo.";
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden" || !state?.settings.lockOnLeave) return;
  // No bloquear con entrevista u observación abierta: Notas de voz, cámara o archivos sacan de la app.
  if (["/consentimiento", "/entrevista", "/observacion/nueva"].includes(route().path)) {
    window.clearTimeout(draftTimer);
    persist();
    return;
  }
  {
    key = null;
    locked = true;
    state = null;
    $("lock").hidden = false;
    showLock("unlock", "Saliste de la app. Vuelve a escribir la clave del investigador.");
    $("lock-open").hidden = true;
    main.replaceChildren();
  }
});

window.addEventListener("hashchange", async () => {
  await render();
  const title = $("title");
  if (!title || locked) return;
  title.setAttribute("tabindex", "-1");
  title.focus();
});

load().then(() => {
  if (!location.hash) location.hash = "#/estudios";
  render();
});
