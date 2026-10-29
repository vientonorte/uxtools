// QA e2e de Campo · WebKit con emulación iPhone (Playwright).
// Uso: npx vite@6 public --host 127.0.0.1 --port 3000 --strictPort
//      ITEMS=1,2,3 node tests/campo/e2e.mjs   (requiere playwright y axe-core instalados)
// Suites: unit (unit.cjs aparte) · p0 (autoguardado, upgrade) · p1qa (editar, retención, demo) · axe · texto plano.
import { webkit, devices } from "playwright";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const axeSrc = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const U = process.env.CAMPO_URL || "http://127.0.0.1:3000/campo/";
const ITEMS = new Set((process.env.ITEMS || "1").split(","));
const PASS = "prueba-QA-2026";
const SENT = "SENTINELA-PLANO-7Q";
const STORE = "campo.etnografia.v1";
const R = [];
const ok = (suite, name, cond, d = "") => R.push({ suite, name, pass: !!cond, d: cond ? "" : String(d) });

const browser = await webkit.launch();
async function fresh() {
  const ctx = await browser.newContext({ ...devices["iPhone 15"], acceptDownloads: true });
  const page = await ctx.newPage();
  page.errs = [];
  page.on("pageerror", (e) => page.errs.push(e.message));
  return { ctx, page };
}
const wait = (p, ms = 400) => p.waitForTimeout(ms);
async function setup(page) {
  await page.goto(U); await page.waitForSelector("#lock:not([hidden])");
  await page.fill("#lock-pass", PASS); await page.fill("#lock-again", PASS);
  await page.click("#lock-submit"); await page.waitForSelector("#lock", { state: "hidden" });
}
async function unlock(page) {
  await page.waitForSelector("#lock:not([hidden])");
  await page.fill("#lock-pass", PASS); await page.click("#lock-submit");
  await page.waitForSelector("#lock", { state: "hidden" }); await wait(page);
}
async function noPlain(page, label) {
  const dump = await page.evaluate(() => Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]));
  const all = dump.map(([k, v]) => k + v).join("\n");
  const blob = JSON.parse(dump.find(([k]) => k === "campo.etnografia.v1")?.[1] || "{}");
  ok("plano", `sin texto plano · ${label}`, blob.enc === true && !all.includes(SENT) && !all.includes("Pajaritos"), all.slice(0, 120));
}
async function axe(page, label) {
  await page.addScriptTag({ content: axeSrc });
  const v = await page.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] })).violations.map((x) => `${x.id}:${x.nodes.length}`));
  ok("axe", `axe · ${label}`, v.length === 0, v.join(","));
}
async function hide(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
async function show(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
async function startInterview(page) {
  await page.evaluate(() => { location.hash = "#/nuevo"; }); await wait(page);
  await page.fill('input[aria-label="Nombre del estudio"]', "Estudio QA");
  await page.click("#use-template"); await page.click("#save-study"); await wait(page, 600);
  await page.click("#script-ready"); await wait(page);
  await page.click("#start-batch"); await wait(page);
  await page.click("#start"); await wait(page, 600);
}
const rawBlob = (page) => page.evaluate((k) => localStorage.getItem(k), STORE);

// ── base ──
{
  const { ctx, page } = await fresh();
  await setup(page);
  await noPlain(page, "tras crear clave");
  for (const h of ["#/estudios", "#/nuevo", "#/guia", "#/observacion/nueva", "#/privacidad"]) {
    await page.evaluate((x) => { location.hash = x; }, h); await wait(page); await axe(page, h);
  }
  ok("base", "sin errores JS", page.errs.length === 0, page.errs.join("|"));
  await ctx.close();
}

// ── Ítem 1 · P0 autoguardado ──
if (ITEMS.has("1")) {
  const { ctx, page } = await fresh();
  await setup(page);
  await startInterview(page);
  ok("p0", "códigos P1, P2…", (await page.textContent("#title")).includes("P1"), await page.textContent("#title"));
  const before = await rawBlob(page);
  await page.fill("#note-text", SENT);
  await wait(page, 300);
  ok("p0", "no guarda antes de 1 s (debounce)", (await rawBlob(page)) === before);
  await wait(page, 1200);
  ok("p0", "guarda a 1 s", (await rawBlob(page)) !== before);
  ok("p0", "indicador Guardado hh:mm", /^Guardado \d{2}:\d{2}$/.test((await page.textContent("#saved")).trim()), await page.textContent("#saved"));
  await axe(page, "entrevista con indicador");
  await noPlain(page, "nota en curso");
  // cambio de app: guarda al tiro (sin esperar debounce)
  await page.fill("#q-now", "Pregunta editada QA");
  const b2 = await rawBlob(page);
  await hide(page); await wait(page, 300);
  ok("p0", "visibilitychange guarda al instante", (await rawBlob(page)) !== b2);
  await show(page);
  // recarga
  await page.reload(); await unlock(page);
  ok("p0", "restaura tras recargar · nota", (await page.inputValue("#note-text")) === SENT);
  ok("p0", "restaura tras recargar · pregunta", (await page.inputValue("#q-now")) === "Pregunta editada QA");
  // pagehide
  await page.fill("#note-text", "otra nota");
  const b3 = await rawBlob(page);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await wait(page, 300);
  ok("p0", "pagehide guarda al instante", (await rawBlob(page)) !== b3);
  // bloqueo al salir (fuera de entrevista) + restaura
  await page.evaluate(() => { location.hash = "#/nuevo"; }); await wait(page);
  await page.fill('input[aria-label="Nombre del estudio"]', "Borrador QA");
  await hide(page); await wait(page, 300);
  ok("p0", "bloquea al salir", await page.isVisible("#lock"));
  await show(page);
  await unlock(page);
  ok("p0", "restaura tras bloqueo · borrador estudio", (await page.inputValue('input[aria-label="Nombre del estudio"]')) === "Borrador QA");
  await noPlain(page, "tras bloqueo");
  ok("p0", "sin errores JS", page.errs.length === 0, page.errs.join("|"));
  await ctx.close();
}

if (ITEMS.has("2")) { const m = await import("./e2e-item2.mjs"); await m.run({ fresh, setup, unlock, ok, wait, noPlain, axe, rawBlob, PASS, SENT, STORE, U }); }
if (ITEMS.has("3")) { const m = await import("./e2e-item3.mjs"); await m.run({ fresh, setup, unlock, ok, wait, noPlain, axe, rawBlob, startInterview, hide, show, PASS, SENT, STORE, U }); }
if (ITEMS.has("R")) { const m = await import("./e2e-regresion.mjs"); await m.run({ fresh, unlock, ok, wait, noPlain, STORE, U }); }
if (ITEMS.has("E")) { const m = await import("./e2e-export.mjs"); await m.run({ fresh, setup, unlock, ok, wait, noPlain, STORE, U, SENT }); }
if (ITEMS.has("M")) { const m = await import("./e2e-mystery.mjs"); await m.run({ fresh, unlock, ok, wait, noPlain, axe, PASS, SENT, STORE, U }); }
if (ITEMS.has("4")) { const m = await import("./e2e-item4.mjs"); await m.run({ fresh, setup, unlock, ok, wait, noPlain, axe, rawBlob, startInterview, PASS, SENT, STORE, U }); }

await browser.close();
const bySuite = {};
for (const r of R) { bySuite[r.suite] ??= [0, 0]; bySuite[r.suite][r.pass ? 0 : 1]++; }
for (const r of R) console.log(`${r.pass ? "PASS" : "FAIL"} [${r.suite}] ${r.name}${r.d ? " — " + r.d : ""}`);
console.log("RESUMEN " + Object.entries(bySuite).map(([k, [p, f]]) => `${k} ${p}/${p + f}`).join(" · "));
process.exit(R.some((r) => !r.pass) ? 1 : 0);
