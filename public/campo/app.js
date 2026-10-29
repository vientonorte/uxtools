import { GUIA } from "./guia-data.js?v=7";
// BUILD debe coincidir con <meta name="campo-build"> y con los ?v= de index.html.
// Si no coinciden, Safari está mezclando archivos de dos versiones (caché de GitHub Pages, max-age=600).
const BUILD = "7";
const STORE = "campo.etnografia.v1"; // la clave no cambia entre versiones: así una actualización nunca "pierde" el estudio
const BACKUP = STORE + ".antes-de-migrar"; // copia cifrada previa a cada migración
const SCHEMA = 4; // v4: agrega state.mystery (fichas de mystery shopper)
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
  "/respaldo": "guia",
  "/observacion/nueva": "guia",
  "/mystery": "guia",
  "/mystery/nueva": "guia",
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
    schema: SCHEMA,
    settings: {
      encrypt: true,
      retentionDays: 30,
      autoDelete: false,
      lockOnLeave: true,
      cloudEnabled: false,
    },
    activeStudyId: "",
    studies: [],
    interviews: [],
    batches: [],
    observations: [],
    mystery: [],
    draft: null,
  };
}

// ── Esquema y migración ────────────────────────────────────────────────
// Regla: migrar solo AGREGA o completa campos. Nunca borra estudios, entrevistas,
// lotes, fichas ni claves desconocidas (pueden venir de una versión más nueva).
const SETTINGS_DEFAULT = { encrypt: true, retentionDays: 30, autoDelete: false, lockOnLeave: true, cloudEnabled: false };
function migrate(st) {
  const from = Number(st?.schema) || 1;
  if (!st || typeof st !== "object") return { state: st, from, changed: false };
  if (from >= SCHEMA) return { state: st, from, changed: false };
  st.settings = { ...SETTINGS_DEFAULT, ...(st.settings || {}) };
  for (const k of ["studies", "interviews", "batches", "observations", "mystery"]) if (!Array.isArray(st[k])) st[k] = [];
  for (const study of st.studies) {
    if (!Array.isArray(study.segments)) study.segments = segments();
    if (!Array.isArray(study.questions)) study.questions = [];
  }
  const rows = [...st.interviews, ...(st.draft ? [st.draft] : [])];
  for (const row of rows) {
    for (const k of ["notes", "tags", "audio", "photos", "videos"]) if (!Array.isArray(row[k])) row[k] = [];
    row.consent = { participate: false, audio: false, photos: false, cloud: false, ...(row.consent || {}) };
  }
  if (st.draft === undefined) st.draft = null;
  if (from < 3) dropDemo(st);
  st.schema = SCHEMA;
  return { state: st, from, changed: true };
}

// v3: quita «Estudio Demo A/B» de versiones anteriores, solo si no tienen datos reales.
function dropDemo(st) {
  const isDemoRow = (row) => row.id === "e0417" && row.code === "E-0417";
  const demo = st.studies.filter((x) => ["a", "b"].includes(x.id) && /^Estudio Demo [AB] /.test(x.name || ""));
  const drop = new Set(demo.filter((x) => !st.interviews.some((row) => row.studyId === x.id && !isDemoRow(row)) && !(st.draft && st.draft.studyId === x.id)).map((x) => x.id));
  if (!drop.size) return;
  st.studies = st.studies.filter((x) => !drop.has(x.id));
  st.interviews = st.interviews.filter((row) => !(drop.has(row.studyId) && isDemoRow(row)));
  st.batches = st.batches.filter((b) => !drop.has(b.studyId));
  if (drop.has(st.activeStudyId)) st.activeStudyId = st.studies[0]?.id || "";
}

// Antes de reescribir datos de una versión anterior, deja la copia cifrada original aparte.
let backupDone = false; // una sola copia por apertura: la más antigua
function keepBackup() {
  if (backupDone) return;
  backupDone = true;
  const raw = localStorage.getItem(STORE);
  if (raw) localStorage.setItem(BACKUP, raw);
}

async function upgrade() {
  const res = migrate(state);
  state = res.state;
  const msChanged = state && typeof state === "object" ? normalizeMystery(state) : false;
  if (res.changed || msChanged) {
    keepBackup();
    await persist();
  }
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
  // encryptWithKey serializa el estado de inmediato: aunque luego se bloquee, se guarda esta foto.
  const packed = await encryptWithKey(state, key);
  localStorage.setItem(STORE, JSON.stringify(packed));
  markSaved(Date.now());
}

function hhmm(ms) {
  return new Date(ms).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function markSaved(ms) {
  const el = $("saved");
  if (!el) return;
  el.textContent = `Guardado ${hhmm(ms)}`;
  el.hidden = false;
}

// Guarda ya lo pendiente (al salir de la app, bloquear o cerrar la pestaña).
function flush() {
  window.clearTimeout(draftTimer);
  return persist();
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
const AUTOSAVE_MS = 1000; // autoguardado: 1 s después de dejar de escribir
function persistSoon() {
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(() => persist(), AUTOSAVE_MS);
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
  if (!state.studyDraft) state.studyDraft = { name: "", questions: [], segments: segments([3, 3, 2, 2]) };
  const draft = state.studyDraft;
  const box = h("div");
  const name = input({ type: "text", value: draft.name, "aria-label": "Nombre del estudio", placeholder: "Ej.: Paraderos Línea 5" });
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
      state.studyDraft = null;
      state.activeStudyId = created.id;
      persist().then(() => {
        location.hash = `#/preparar?study=${created.id}`;
      });
    }
  });
  box.addEventListener("input", (event) => {
    const t = event.target;
    if (t instanceof HTMLInputElement && t.dataset.q) draft.questions[Number(t.dataset.q)].text = t.value;
    if (t === name) draft.name = name.value;
    persistSoon();
  });
  box.addEventListener("click", () => persistSoon());
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
  if (!blocks.size) box.append(h("p", { class: "notice", text: "Este estudio no tiene preguntas.\nCrea un estudio nuevo con la plantilla guion v3." }));
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
  const qInput = input({ type: "text", id: "q-now", value: draft.questionText ?? (q ? q.text : "") });
  qInput.addEventListener("input", () => { draft.questionText = qInput.value; persistSoon(); });
  box.append(field("Pregunta actual", qInput));
  const seg = h("select", { id: "segment" });
  for (const item of study.segments) {
    const opt = h("option", { value: item.id, text: item.label });
    if (item.id === draft.segmentId) opt.setAttribute("selected", "");
    seg.append(opt);
  }
  seg.addEventListener("change", () => { draft.segmentId = seg.value; persistSoon(); });
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
  if (!saved) {
    box.addEventListener("input", () => {
      const data = new FormData(box);
      item.number = String(data.get("number") || "");
      item.code = String(data.get("code") || "");
      item.contact = String(data.get("contact") || "");
      item.segmentId = String(data.get("segment") || item.segmentId);
      persistSoon();
    });
  }
  if (!saved) box.append(button("Guardar registro", { type: "submit" }));
  else box.append(h("p", { class: "meta", text: "Este registro ya está en este teléfono.\nPuedes corregirlo y guardar los cambios." }), button("Guardar cambios", { type: "submit", id: "save-edit" }));
  box.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saved) {
      const data = new FormData(box);
      const nextSeg = String(data.get("segment") || item.segmentId);
      if (nextSeg !== item.segmentId) {
        const from = study.segments.find((row) => row.id === item.segmentId);
        const to = study.segments.find((row) => row.id === nextSeg);
        if (from) from.done = Math.max(0, from.done - 1);
        if (to) to.done += 1;
      }
      item.number = String(data.get("number") || "");
      item.code = String(data.get("code") || "").trim() || item.code;
      item.contact = String(data.get("contact") || "");
      item.segmentId = nextSeg;
      item.editedAt = Date.now();
      await persist();
      say("Cambios guardados.");
      return;
    }
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

// iOS Safari: la descarga por <a download> de un blob suele fallar. Orden: compartir archivo
// (Guardar en Archivos / iCloud) → descarga → abrir en pestaña nueva.
async function saveFile(blob, name) {
  try {
    const f = new File([blob], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: name });
      return "share";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancel";
  }
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  if (!("download" in HTMLAnchorElement.prototype)) window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "download";
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
    ["mystery", `Fichas mystery (${msList().filter((m) => m.studyId === study.id).length})`],
  ]) {
    const check = input({ type: "checkbox", name, checked: true });
    box.append(h("label", { class: "check" }, [check, h("span", { text: label })]));
  }
  const msRows = msList().filter((m) => m.studyId === study.id);
  if (msRows.length) box.append(fold(`Fichas mystery de este estudio (${msRows.length})`, [ul(msRows.map((m) => `${m.code} · ${m.salida || "sin salida"} · ${m.punto} · escenario ${m.escenario}`))]));
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
      mystery: data.get("mystery") ? msList().filter((m) => m.studyId === study.id) : [],
      batches: state.batches.filter((b) => b.studyId === study.id),
    };
    const packed = await encryptJSON(payload, passphrase);
    const file = new Blob([JSON.stringify(packed)], { type: "application/json" });
    if ((await saveFile(file, `evidencias-${study.id}.campo.json`)) === "cancel") return;
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
  box.noValidate = true; // el error de retención se muestra en la app, no en el globo del navegador
  const s = state.settings;
  const auto = h("select", { name: "retention", id: "retention" });
  for (const [v, l] of [["never", "Nunca"], ["30", "A los 30 días"], ["90", "A los 90 días"], ["180", "A los 180 días"]]) {
    const opt = h("option", { value: v, text: l });
    const cur = s.autoDelete ? String(s.retentionDays) : "never";
    if (v === cur) opt.setAttribute("selected", "");
    auto.append(opt);
  }
  if (s.autoDelete && ![30, 90, 180].includes(Number(s.retentionDays))) {
    const opt = h("option", { value: String(s.retentionDays), text: `A los ${s.retentionDays} días` });
    opt.setAttribute("selected", "");
    auto.append(opt);
  }
  const lockLeave = input({ type: "checkbox", name: "lockOnLeave", checked: s.lockOnLeave ? true : null });
  const cloud = input({ type: "checkbox", name: "cloudEnabled", checked: s.cloudEnabled ? true : null });
  const pass = input({ type: "password", name: "key", autocomplete: "new-password" });
  const err = h("p", { class: "error", role: "alert", id: "privacy-error" });
  auto.setAttribute("aria-describedby", "retention-help");
  box.append(
    h("p", { class: "notice", text: "La protección está siempre activa.\nDeja la clave vacía para mantener la actual." }),
    field("Nueva clave (opcional)", pass),
    field("Borrar entrevistas automáticamente", auto),
    h("p", { class: "notice", id: "retention-help", text: "Por defecto, nunca se borran.\nSi eliges un plazo, te avisamos 72 h antes.\nPuedes exportar o posponer 7 d\u00edas, una vez." }),
    h("label", { class: "check" }, [lockLeave, h("span", { text: "Bloquear al salir de la app" })]),
    h("label", { class: "check" }, [cloud, h("span", { text: "Permitir transcripción en la nube (solo con permiso)" })]),
    err,
    button("Guardar privacidad", { type: "submit" }),
    h("p", { class: "meta", id: "build", text: `Versión de la app: ${BUILD}` }),
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
    const ret = String(data.get("retention") || "never");
    if (nextKey && nextKey.length < 8) {
      err.textContent = "La nueva clave necesita 8 caracteres o más.";
      return;
    }
    state.settings.autoDelete = ret !== "never";
    state.settings.lockOnLeave = data.get("lockOnLeave") === "on";
    state.settings.cloudEnabled = data.get("cloudEnabled") === "on";
    if (ret !== "never") state.settings.retentionDays = Number(ret);
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
  box.append(button(`Mystery shopper (${msList().length})`, { "data-go": "#/mystery", class: "secondary", id: "go-mystery" }));
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
  box.append(button("Exportar fichas", { class: "secondary", id: "export-fichas", "data-go": "#/respaldo" }));
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
      button("Editar ficha", { class: "secondary", "data-go": `#/observacion/nueva?id=${o.id}`, "aria-label": `Editar ficha ${o.code}` }),
    ]));
  }
  paint(box);
}

// ── Respaldo completo: exportar / importar ─────────────────────────────
// El archivo va siempre cifrado (misma clave del archivo que Evidencias).
// Importar FUSIONA: agrega lo que falta por id (o por código) y nunca borra ni sobrescribe.
const BACKUP_KINDS = ["studies", "interviews", "batches", "observations", "mystery"];
function backupPayload() {
  const out = { kind: "campo-respaldo", version: 1, build: BUILD, schema: SCHEMA, exportedAt: new Date().toISOString() };
  for (const k of BACKUP_KINDS) out[k] = JSON.parse(JSON.stringify(state[k] || []));
  return out;
}
function mergeBackup(st, data) {
  const added = {};
  for (const k of BACKUP_KINDS) {
    if (!Array.isArray(st[k])) st[k] = [];
    const ids = new Set(st[k].map((x) => x && x.id).filter(Boolean));
    const codes = new Set(st[k].map((x) => x && x.code).filter(Boolean));
    added[k] = 0;
    for (const row of Array.isArray(data?.[k]) ? data[k] : []) {
      if (!row || typeof row !== "object") continue;
      if ((row.id && ids.has(row.id)) || (row.code && codes.has(row.code))) continue;
      st[k].push(row);
      if (row.id) ids.add(row.id);
      if (row.code) codes.add(row.code);
      added[k] += 1;
    }
  }
  if (!st.activeStudyId && st.studies[0]) st.activeStudyId = st.studies[0].id;
  return added;
}
globalThis.__campoMerge = mergeBackup; // para pruebas unitarias

function screenRespaldo() {
  head("Guía", "Exportar e importar fichas", "Respaldo cifrado de fichas, lotes, estudios y registros");
  const box = h("div");
  const counts = `Fichas: ${obsList().length} · Mystery: ${msList().length} · Lotes: ${state.batches.length} · Estudios: ${state.studies.length} · Registros: ${state.interviews.length}`;
  box.append(h("p", { class: "notice", text: counts }));
  const ex = h("form", { id: "respaldo-export" });
  const pass = input({ type: "password", name: "pass", autocomplete: "new-password" });
  const again = input({ type: "password", name: "again", autocomplete: "new-password" });
  const err = h("p", { class: "error", role: "alert", id: "respaldo-error" });
  pass.setAttribute("aria-describedby", "respaldo-error");
  ex.append(h("section", { class: "card" }, [
    h("h2", { text: "Exportar" }),
    field("Clave del archivo", pass),
    field("Repite la clave", again),
    err,
    button("Exportar fichas", { type: "submit", id: "respaldo-go" }),
  ]));
  ex.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pass.value.length < 8 || pass.value !== again.value) {
      err.textContent = "Las claves no coinciden o son muy cortas.\nEscribe la misma clave dos veces, con 8 caracteres o más.";
      return;
    }
    const packed = await encryptJSON(backupPayload(), pass.value);
    const stamp = new Date().toISOString().slice(0, 10);
    const how = await saveFile(new Blob([JSON.stringify(packed)], { type: "application/json" }), `campo-respaldo-${stamp}.campo.json`);
    if (how === "cancel") return;
    err.textContent = ""; pass.value = ""; again.value = "";
    say(how === "share" ? "Respaldo cifrado listo para guardar en Archivos." : "Respaldo cifrado guardado en Descargas.", "Exportado ✓");
  });
  const im = h("form", { id: "respaldo-import" });
  const file = input({ type: "file", name: "file", accept: ".json,application/json" });
  const ipass = input({ type: "password", name: "ipass", autocomplete: "current-password" });
  const ierr = h("p", { class: "error", role: "alert", id: "import-error" });
  ipass.setAttribute("aria-describedby", "import-error");
  im.append(h("section", { class: "card" }, [
    h("h2", { text: "Importar" }),
    h("p", { class: "notice", text: "Suma lo que falta. No borra ni cambia lo que ya tienes." }),
    field("Archivo de respaldo", file),
    field("Clave del archivo", ipass),
    ierr,
    button("Importar fichas", { type: "submit", id: "import-go" }),
  ]));
  im.addEventListener("submit", async (event) => {
    event.preventDefault();
    const f = file.files && file.files[0];
    if (!f) { ierr.textContent = "Elige un archivo de respaldo."; return; }
    let data;
    try {
      const blob = JSON.parse(await f.text());
      data = blob && blob.enc ? await decryptJSON(blob, ipass.value) : blob;
    } catch {
      ierr.textContent = "No se pudo abrir el archivo. Revisa la clave.";
      return;
    }
    if (!data || !BACKUP_KINDS.some((k) => Array.isArray(data[k]))) { ierr.textContent = "El archivo no tiene fichas ni lotes."; return; }
    keepBackup();
    const added = mergeBackup(state, data);
    normalizeMystery(state);
    await persist();
    ierr.textContent = ""; ipass.value = "";
    say(`Importado: ${added.observations} fichas, ${added.mystery} mystery, ${added.batches} lotes, ${added.studies} estudios, ${added.interviews} registros.`, "Importado ✓");
    render();
  });
  box.append(ex, im);
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

function screenObsNueva(editId) {
  const editing = editId ? obsList().find((o) => o.id === editId) || null : null;
  head("Guía", editing ? `Editar ${editing.code}` : "Nueva ficha", "Lo que ves, sin nombres ni rostros");
  const box = h("form", { novalidate: true });
  const lugar = input({ type: "text", name: "lugar", required: true, placeholder: "Ej.: Pajaritos, paradero 516" });
  const when = input({ type: "datetime-local", name: "when", required: true, value: nowLocal() });
  const code = h("p", { class: "meta", id: "obs-code" });
  const upd = () => { code.textContent = `Código: ${editing ? editing.code : obsCode(lugar.value, when.value)}`; };
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
  box.append(err, button(editing ? "Guardar cambios" : "Guardar ficha", { type: "submit" }));
  if (editing) {
    const fill = { lugar: editing.lugar, when: editing.when, franja: editing.franja, clima: editing.clima, corte: editing.corte ? "si" : "no", tema: editing.tema, vi: editing.vi, supongo: editing.supongo, traba: editing.traba, ayuda: editing.ayuda, foto: editing.foto };
    for (const [name, value] of Object.entries(fill)) {
      for (const el of box.querySelectorAll(`[name="${name}"]`)) {
        if (el.type === "radio") el.checked = el.value === value; else el.value = value ?? "";
      }
    }
    for (const el of box.querySelectorAll('[name="pista"]')) el.checked = (editing.pistas || []).includes(el.value);
    upd();
  } else if (Array.isArray(state.obsDraft)) {
    for (const [name, value] of state.obsDraft) {
      for (const el of box.querySelectorAll(`[name="${name}"]`)) {
        if (el.type === "checkbox" || el.type === "radio") { if (el.value === value) el.checked = true; } else el.value = value;
      }
    }
    upd();
  }
  const keep = () => { if (!editing) { state.obsDraft = [...new FormData(box).entries()].map(([k, v]) => [k, String(v)]); persistSoon(); } };
  box.addEventListener("input", keep);
  box.addEventListener("change", keep);
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
    if (editing) {
      Object.assign(editing, {
        lugar: lug, when: w, franja: String(d.get("franja")), clima: String(d.get("clima") || ""),
        corte: d.get("corte") === "si", tema: String(d.get("tema")), vi,
        supongo: String(d.get("supongo") || ""), porPreguntar: Boolean(String(d.get("supongo") || "").trim()),
        traba: String(d.get("traba") || ""), ayuda: String(d.get("ayuda") || ""), foto: String(d.get("foto") || ""),
        pistas: d.getAll("pista").map(String), editedAt: Date.now(),
      });
      await persist();
      say("Ficha actualizada.");
      location.hash = "#/observacion";
      return;
    }
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

// ---- Mystery shopper (Guía 05 · FRUTA · Maas Chile, Figma 290:27) ----
// Una ficha por escenario. Se guarda en state.mystery, aparte de las fichas de observación.
const MS_ESCENARIOS = [
  ["1", "Recargar en tótem", "Tiempo de espera y de uso · intentos · mensajes de error · si el tótem funcionaba"],
  ["2", "Recargar en boletería", "Largo de la fila (personas) · tiempo total · medios de pago aceptados"],
  ["3", "Recargar en almacén del barrio", "¿Había cartel? · ¿había sistema? · monto mínimo · comisión (si la hay) · tiempo"],
  ["4", "Pagar con bip!, QR o tarjeta bancaria", "Tiempo en el validador · intentos · qué muestra la pantalla · si el conductor interviene"],
  ["5", "Transbordo", "Tiempo de caminata · ¿cobró de nuevo? · señalética"],
  ["6", "Saldo bajo o negativo", "Mensaje en el validador · qué pasa después · cómo recargas desde ahí"],
  ["7", "Pedir información al personal", "Tiempo hasta la respuesta · si la respuesta fue clara · si te derivaron a otro lugar"],
  ["8", "Corte de servicio", "Cómo te enteraste · señalética · tiempo extra · costo extra"],
];
const MS_MEDIOS = [["bip", "bip!"], ["qr", "QR"], ["tarjeta", "Tarjeta bancaria"], ["efectivo", "Efectivo"]];
const MS_TEXT = ["punto", "puntoOtro", "when", "escenario", "medio", "afluencia", "clima", "intentos", "mensaje", "ayuda", "medir", "sentir", "pista", "studyId", "salida", "foto"];
const MS_NUM = { espera: "min", uso: "min", saldoIni: "clp", saldoFin: "clp" };
const MS_FIELDS = [...MS_TEXT, ...Object.keys(MS_NUM)];
// P0 QA 29-oct: «Punto» usa códigos de lugar. Fuentes: deck Proceso «Dónde se reparten los QR» (12 puntos),
// points.json del afiche (MAT y códigos nuevos por lugar real CMO…IRZ) y PLAN-OBS-CONTEXTUAL 28-oct (PEN, NOS).
const MS_PUNTOS = [
  ["GEN", "General (sin punto)"], ["LLE", "Los Leones (L1/L6)"], ["UCA", "Universidad Católica (L1)"],
  ["UCH", "Universidad de Chile (L1/L3)"], ["LHE", "Los Héroes (L1/L2)"], ["ECE", "Estación Central (L1 + Tren Nos)"],
  ["BAQ", "Baquedano (L1/L5)"], ["ULA", "Unión Latinoamericana (L1)"], ["LRE", "Las Rejas (L1)"],
  ["PAJ", "Pajaritos (L1 + paradero)"], ["SPA", "San Pablo (L1/L5)"], ["PMA", "Plaza de Maipú (L5)"],
  ["MAT", "Av. Matta, control de pago (L3)"], ["PEN", "Peñalolén Alto, paraderos"], ["NOS", "Estación Tren Nos, San Bernardo"],
  ["CMO", "Compañía de Jesús con Morandé"], ["PZA", "Plaza de Armas"], ["PBU", "Parque Bustamante"],
  ["BEA", "Bellas Artes"], ["SIS", "Santa Isabel"], ["IRZ", "Irarrázaval"],
];
const MS_SALIDAS = [["MS-1", "MS-1 · Jue 30-oct · escenarios 1, 2, 7"], ["MS-2", "MS-2 · Mar 4-nov · escenarios 4, 5, 6"], ["MS-3", "MS-3 · Jue 6-nov · escenarios 3, 6"], ["MS-4", "MS-4 · Si hay corte anunciado · escenario 8"]];

// Minutos como número: «2:30» → 2.5, «3» → 3, «1,5» → 1.5. null si no se puede.
function parseMin(v) {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? v : null;
  const t = String(v ?? "").trim().replace(/\s*min\.?$/i, "");
  if (!t) return null;
  let m = t.match(/^(\d+):([0-5]\d)$/);
  if (m) return Math.round((Number(m[1]) + Number(m[2]) / 60) * 100) / 100;
  m = t.match(/^\d+(?:[.,]\d+)?$/);
  return m ? Number(t.replace(",", ".")) : null;
}
// Pesos CLP enteros: «$1.500» → 1500. null si no se puede.
function parseCLP(v) {
  if (typeof v === "number") return Number.isInteger(v) ? v : null;
  const t = String(v ?? "").trim().replace(/^\$\s*/, "").replace(/\s*(clp|pesos)$/i, "");
  if (!t) return null;
  if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  return /^-?\d+$/.test(t) ? Number(t) : null;
}
function msTotal(m) {
  return typeof m.espera === "number" && typeof m.uso === "number" ? Math.round((m.espera + m.uso) * 100) / 100 : typeof m.espera === "number" ? m.espera : typeof m.uso === "number" ? m.uso : null;
}
function defaultMsStudy(st) {
  return (st.studies.find((x) => /maas/i.test(x.name || "")) || studyById(st.activeStudyId) || st.studies[0] || {}).id || "";
}
// Normaliza fichas mystery (aditivo e idempotente): texto → número; si no se puede, el original queda en *_raw.
// Nunca borra campos ni fichas. Devuelve true si cambió algo.
function normalizeMystery(st) {
  if (!Array.isArray(st.mystery)) { st.mystery = []; return true; }
  let changed = false;
  for (const m of st.mystery) {
    if (!m || typeof m !== "object") continue;
    for (const [k, kind] of Object.entries(MS_NUM)) {
      const v = m[k];
      if (v == null || typeof v === "number") continue;
      const n = kind === "min" ? parseMin(v) : parseCLP(v);
      if (String(v).trim() && n === null && m[k + "_raw"] === undefined) m[k + "_raw"] = String(v);
      m[k] = n; changed = true;
    }
    if (typeof m.total === "string") {
      const n = parseMin(m.total);
      if (m.total.trim() && n === null && m.total_raw === undefined) m.total_raw = m.total;
      m.total = n; changed = true;
    }
    const t = msTotal(m);
    if (m.total == null && t != null) { m.total = t; changed = true; }
    for (const k of ["audio"]) if (!Array.isArray(m[k])) { m[k] = []; changed = true; }
    if (m.studyId === undefined) { m.studyId = defaultMsStudy(st); changed = true; }
    if (m.salida === undefined) { m.salida = ""; changed = true; }
    if (m.foto === undefined) { m.foto = ""; changed = true; }
  }
  return changed;
}
globalThis.__campoMs = { parseMin, parseCLP, normalizeMystery }; // para pruebas unitarias

function msList() {
  if (!Array.isArray(state.mystery)) state.mystery = [];
  return state.mystery;
}

function msCode(when) {
  const d = when ? new Date(when) : new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const prefix = `MS-${ymd}-`;
  const n = msList().filter((m) => String(m.code || "").startsWith(prefix)).length + 1;
  return `${prefix}${String(n).padStart(2, "0")}`;
}

function clp(n) {
  return typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—";
}

function screenMsLista() {
  head("Guía", "Mystery shopper", "Una ficha por escenario · solo en este teléfono");
  const box = h("div");
  box.append(h("p", { class: "notice", text: "Regla de oro: viajas como usuario real, pagas siempre el pasaje y no engañas ni perjudicas a nadie." }));
  box.append(button("Crear ficha de mystery", { "data-go": "#/mystery/nueva", id: "ms-create" }));
  box.append(fold("Escenarios", MS_ESCENARIOS.map(([n, name, medir]) => h("p", {}, [h("strong", { text: `${n} · ${name}: ` }), document.createTextNode(medir)]))));
  box.append(fold("Ética", [ul([
    "No grabes ni fotografíes a personas. No registres nombres de trabajadores ni de pasajeros.",
    "No evadas nunca. Pagas siempre el pasaje.",
    "No hagas reclamos ni evalúes al personal: evaluamos el sistema.",
    "Si algo se vuelve incómodo o inseguro, lo abandonas y lo anotas.",
  ])]));
  const rows = msList();
  if (!rows.length) box.append(h("p", { class: "notice", text: "Todavía no hay fichas de mystery." }));
  for (const m of [...rows].reverse()) {
    const esc = MS_ESCENARIOS.find(([n]) => n === m.escenario)?.[1] || "";
    const medio = MS_MEDIOS.find(([v]) => v === m.medio)?.[1] || "";
    box.append(h("article", { class: "card" }, [
      h("h2", { text: m.code }),
      h("p", { class: "meta", text: `${m.punto === "otro" ? `Otro: ${m.puntoOtro || "—"}` : m.punto} · ${String(m.when || "").replace("T", " ")} · ${m.escenario}. ${esc}` }),
      h("p", { text: `Estudio: ${studyById(m.studyId)?.name || "sin estudio"} · Salida: ${m.salida || "sin salida"}` }),
      medio ? h("p", { text: `Medio de pago: ${medio}` }) : null,
      m.total != null ? h("p", { text: `Tiempo total: ${m.total} min` }) : m.total_raw ? h("p", { text: `Tiempo total (texto original): ${m.total_raw}` }) : null,
      m.saldoIni != null || m.saldoFin != null ? h("p", { text: `Saldo: ${clp(m.saldoIni)} → ${clp(m.saldoFin)}` }) : null,
      m.foto ? h("p", { text: `Foto N° ${m.foto}` }) : null,
      m.audio?.length ? h("p", { text: `Nota de voz: ${m.audio.map((a) => a.name).join(", ")}` }) : null,
      m.intentos || m.mensaje ? h("p", { text: `Intentos: ${m.intentos || "—"} · Mensaje: ${m.mensaje ? `«${m.mensaje}»` : "—"}` }) : null,
      m.sentir ? h("p", { text: `Lo que sentí: ${m.sentir}` }) : null,
      m.pista ? h("p", { text: `Pista para Maas: ${m.pista}` }) : null,
      button("Editar ficha", { class: "secondary", "data-go": `#/mystery/nueva?id=${m.id}`, "aria-label": `Editar ficha ${m.code}` }),
    ]));
  }
  paint(box);
}

function screenMsNueva(editId) {
  const editing = editId ? msList().find((m) => m.id === editId) || null : null;
  head("Guía", editing ? `Editar ${editing.code}` : "Nueva ficha de mystery", "Sin nombres ni rostros · montos y tiempos tal cual");
  const box = h("form", { novalidate: true, id: "ms-form" });
  // Fichas antiguas con texto libre: si no es un código conocido, se conserva como opción para no perder el dato.
  const legacy = editing && editing.punto && !MS_PUNTOS.some(([c]) => c === editing.punto) && editing.punto !== "otro" ? editing.punto : "";
  const punto = h("select", { name: "punto", required: true }, [
    h("option", { value: "", text: "Elige el punto" }),
    ...MS_PUNTOS.map(([c, l]) => h("option", { value: c, text: `${c} · ${l}` })),
    legacy ? h("option", { value: legacy, text: `${legacy} (texto anterior)` }) : null,
    h("option", { value: "otro", text: "Otro (descríbelo abajo)" }),
  ]);
  const puntoOtro = input({ type: "text", name: "puntoOtro", id: "ms-punto-otro", placeholder: "Lugar real, sin nombres de personas" });
  const puntoOtroField = field("Otro punto · ¿dónde?", puntoOtro);
  const syncOtro = () => { puntoOtroField.hidden = punto.value !== "otro"; };
  punto.addEventListener("change", syncOtro);
  const when = input({ type: "datetime-local", name: "when", required: true, value: nowLocal() });
  const code = h("p", { class: "meta", id: "ms-code" });
  const medir = h("p", { class: "notice", id: "ms-medir" });
  const upd = () => {
    code.textContent = `Código: ${editing ? editing.code : msCode(when.value)}`;
    const sel = box.querySelector('[name="escenario"]:checked')?.value || "1";
    medir.textContent = `Qué medir: ${MS_ESCENARIOS.find(([n]) => n === sel)[2]}`;
    const t = msTotal({ espera: parseMin(box.querySelector('[name="espera"]')?.value), uso: parseMin(box.querySelector('[name="uso"]')?.value) });
    totalOut.textContent = `Tiempo total: ${t == null ? "—" : `${t} min`} (se calcula)`;
  };
  const area = (name, ph, req) => h("textarea", { name, rows: "3", placeholder: ph || null, required: req || null });
  const txt = (name, ph, extra = {}) => input({ type: "text", name, placeholder: ph || null, ...extra });
  const totalOut = h("p", { class: "meta", id: "ms-total", "aria-live": "polite" });
  const audio = editing ? [...(editing.audio || [])] : Array.isArray(state.msAudio) ? [...state.msAudio] : [];
  const msAudioInput = input({ type: "file", accept: "audio/*", id: "ms-audio-file" });
  msAudioInput.hidden = true;
  const msAudioBtn = button("Anotar nota de voz", { type: "button", id: "ms-pick-audio", class: "secondary" });
  const msAudioList = h("div", { id: "ms-audio-list" });
  const paintAudio = () => msAudioList.replaceChildren(...audio.map((a) => h("p", { text: `Nota de voz: ${a.name}` })));
  msAudioBtn.addEventListener("click", () => msAudioInput.click());
  msAudioInput.addEventListener("change", () => {
    const f = msAudioInput.files && msAudioInput.files[0];
    if (!f) return;
    audio.push({ name: f.name, bytes: f.size });
    if (!editing) { state.msAudio = audio; persistSoon(); }
    paintAudio();
  });
  paintAudio();
  box.append(
    code,
    field("Estudio", h("select", { name: "studyId" }, [h("option", { value: "", text: "Sin estudio" }), ...state.studies.map((x) => h("option", { value: x.id, text: x.name }))])),
    radios("salida", MS_SALIDAS, "Salida"),
    field("Punto", punto),
    puntoOtroField,
    field("Fecha y hora", when),
    radios("escenario", MS_ESCENARIOS.map(([n, name]) => [n, `${n} · ${name}`]), "Escenario"),
    medir,
    radios("medio", MS_MEDIOS, "Medio de pago"),
    radios("afluencia", [["media", "Media"], ["baja", "Baja"], ["alta", "Alta"]], "Afluencia"),
    field("Clima", txt("clima", "Ej.: soleado, lluvia")),
    field("Espera (minutos)", input({ type: "number", name: "espera", min: "0", step: "0.1", inputmode: "decimal" })),
    field("Uso (minutos)", input({ type: "number", name: "uso", min: "0", step: "0.1", inputmode: "decimal" })),
    totalOut,
    field("N.º de intentos", input({ type: "number", name: "intentos", min: "0", inputmode: "numeric" })),
    field("Mensaje literal del equipo", txt("mensaje", "Cópialo tal como sale")),
    field("¿Pediste ayuda? ¿Quién te ayudó? (rol, no nombre)", txt("ayuda", "Ej.: cajera de boletería")),
    field("Saldo antes (pesos CLP)", input({ type: "number", name: "saldoIni", step: "1", inputmode: "numeric" })),
    field("Saldo después (pesos CLP)", input({ type: "number", name: "saldoFin", step: "1", inputmode: "numeric" })),
    field("Foto · número de referencia (sin personas)", txt("foto", null, { inputmode: "numeric" })),
    msAudioBtn, h("p", { class: "meta", text: "Graba con Notas de voz, solo tu voz.\nAquí se anota solo el nombre y el tamaño del clip." }), msAudioList, msAudioInput,
    field("Qué mediste (lo propio del escenario)", area("medir")),
    field("Lo que sentí (una frase en primera persona)", area("sentir", null, true)),
    field("Pista para Maas · ¿qué resolvería la app aquí?", area("pista")),
  );
  const err = h("p", { class: "error", role: "alert", id: "ms-error" });
  punto.setAttribute("aria-describedby", "ms-error");
  box.querySelector('[name="sentir"]').setAttribute("aria-describedby", "ms-error");
  for (const k of ["espera", "uso"]) box.querySelector(`[name="${k}"]`).setAttribute("aria-describedby", "ms-error");
  box.append(err, button(editing ? "Guardar cambios" : "Guardar ficha", { type: "submit", id: "ms-save" }));
  if (editing) {
    // P0 QA 29-oct: borrar una ficha (prueba, error o dato sensible), con paso de confirmación.
    const delBtn = button("Borrar ficha", { type: "button", id: "ms-delete", class: "danger" });
    const yes = button(`Sí, borrar ${editing.code}`, { type: "button", id: "ms-delete-yes", class: "danger" });
    const no = button("Cancelar", { type: "button", id: "ms-delete-no", class: "secondary" });
    const confirmBox = h("div", { id: "ms-delete-confirm", role: "alertdialog", "aria-labelledby": "ms-delete-q" }, [
      h("p", { class: "notice", id: "ms-delete-q", text: `¿Borrar la ficha ${editing.code}?\nNo se puede deshacer.` }), yes, no,
    ]);
    confirmBox.hidden = true;
    delBtn.addEventListener("click", () => { confirmBox.hidden = false; delBtn.hidden = true; no.focus(); });
    no.addEventListener("click", () => { confirmBox.hidden = true; delBtn.hidden = false; delBtn.focus(); });
    yes.addEventListener("click", async () => {
      const i = msList().indexOf(editing);
      if (i >= 0) msList().splice(i, 1);
      await persist();
      say(`Ficha ${editing.code} borrada.`, "Borrada ✓");
      location.hash = "#/mystery";
    });
    box.append(delBtn, confirmBox);
  }
  const fillFrom = (pairs) => {
    for (const [name, value] of pairs) {
      for (const el of box.querySelectorAll(`[name="${name}"]`)) {
        if (el.type === "radio") el.checked = el.value === value; else el.value = value ?? "";
      }
    }
  };
  if (editing) fillFrom(MS_FIELDS.map((k) => [k, editing[k] == null ? "" : String(editing[k])]));
  else if (Array.isArray(state.msDraft)) fillFrom(state.msDraft);
  else fillFrom([["studyId", defaultMsStudy(state)]]);
  upd();
  syncOtro();
  box.addEventListener("change", upd);
  box.addEventListener("input", upd);
  when.addEventListener("input", upd);
  const keep = () => { if (!editing) { state.msDraft = [...new FormData(box).entries()].map(([k, v]) => [k, String(v)]); persistSoon(); } };
  box.addEventListener("input", keep);
  box.addEventListener("change", keep);
  box.addEventListener("submit", async (event) => {
    event.preventDefault();
    const d = new FormData(box);
    const row = Object.fromEntries(MS_TEXT.map((k) => [k, String(d.get(k) || "").trim()]));
    for (const [k, kind] of Object.entries(MS_NUM)) {
      const v = String(d.get(k) || "").trim();
      row[k] = kind === "min" ? parseMin(v) : parseCLP(v);
    }
    row.total = msTotal(row);
    row.audio = audio;
    // P0 QA 29-oct: un tiempo negativo o ilegible no se borra en silencio; se avisa y no se guarda.
    const badTime = ["espera", "uso"].filter((k) => String(d.get(k) || "").trim() && row[k] === null);
    for (const k of ["espera", "uso"]) box.querySelector(`[name="${k}"]`).setAttribute("aria-invalid", badTime.includes(k) ? "true" : "false");
    if (badTime.length) {
      const names = badTime.map((k) => (k === "espera" ? "la espera" : "el uso")).join(" y ");
      err.textContent = `Revisa ${names}: debe ser 0 o más minutos.\nNo se guardó; tu dato sigue en el campo.`;
      box.querySelector(`[name="${badTime[0]}"]`).focus();
      return;
    }
    const missing = [];
    if (row.punto !== "otro") row.puntoOtro = "";
    if (row.punto === "otro" && !row.puntoOtro) row.punto = "";
    if (!row.punto) missing.push("el punto");
    if (!row.sentir) missing.push("lo que sentiste");
    punto.setAttribute("aria-invalid", row.punto ? "false" : "true");
    box.querySelector('[name="sentir"]').setAttribute("aria-invalid", row.sentir ? "false" : "true");
    if (missing.length) {
      err.textContent = `Falta ${missing.join(" y ")}.\nCompleta el campo marcado para guardar.`;
      box.querySelector(row.punto ? '[name="sentir"]' : '[name="punto"]').focus();
      return;
    }
    if (!row.when) row.when = nowLocal();
    if (editing) {
      Object.assign(editing, row, { editedAt: Date.now() });
      await persist();
      say("Ficha actualizada.");
    } else {
      msList().push({ id: uid("ms"), code: msCode(row.when), ...row, savedAt: Date.now() });
      state.msDraft = null;
      state.msAudio = null;
      await persist();
      say("Ficha de mystery guardada en este teléfono.");
    }
    location.hash = "#/mystery";
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
  if (path === "/observacion/nueva") return screenObsNueva(params.get("id"));
  if (path === "/respaldo") return screenRespaldo();
  if (path === "/mystery") return screenMsLista();
  if (path === "/mystery/nueva") return screenMsNueva(params.get("id"));
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
    "/respaldo": "#/observacion",
    "/mystery": "#/guia",
    "/mystery/nueva": "#/mystery",
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
      state = lockMode === "migrate" ? migrate(pendingPlain).state : seed();
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
    await upgrade();
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
    state = lockMode === "migrate" ? migrate(pendingPlain).state : seed();
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
      keepBackup();
      await persist(); // migración a 600k
    } else {
      key = { aes: await derive(pass, unb64(blob.salt), ITER), salt: unb64(blob.salt) };
    }
    await upgrade();
    locked = false;
    $("lock").hidden = true;
    $("lock-error").textContent = "";
    render();
  } catch {
    $("lock-error").textContent = "Esa clave no es correcta.\nRevísala y vuelve a intentarlo.";
  }
});

window.addEventListener("pagehide", () => { flush(); });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden") return;
  flush(); // siempre se guarda antes de salir, aunque no se bloquee
  if (!state?.settings.lockOnLeave) return;
  // No bloquear con entrevista u observación abierta: Notas de voz, cámara o archivos sacan de la app.
  if (["/consentimiento", "/entrevista", "/observacion/nueva"].includes(route().path)) return;
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

// Versión mezclada (index.html viejo en caché + app.js nuevo): avisar y recargar sin caché.
// No toca localStorage: solo vuelve a pedir los archivos de la app.
function checkBuild() {
  const meta = document.querySelector('meta[name="campo-build"]')?.content || "";
  if (meta === BUILD) return true;
  const bar = h("div", { class: "notice update-bar", role: "alert", id: "update-bar" }, [
    h("p", { text: "Hay una versión nueva de Campo. Tus datos se mantienen." }),
    button("Actualizar ahora", { id: "update-now" }),
  ]);
  document.body.prepend(bar);
  $("update-now").addEventListener("click", async () => {
    try { await Promise.all(["./", "./index.html", `./app.js?v=${BUILD}`, `./app.css?v=${BUILD}`, `./guia-data.js?v=${BUILD}`].map((u) => fetch(u, { cache: "reload" }))); } catch {}
    location.reload();
  });
  return false;
}
checkBuild();

load().then(() => {
  if (!location.hash) location.hash = "#/estudios";
  render();
});
