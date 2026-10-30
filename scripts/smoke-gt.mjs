// Smoke + accesibilidad (axe, WCAG 2 A/AA) de /campo/gt/ con datos ficticios. Uso: BASE=http://localhost:8080 node scripts/smoke-gt.mjs
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:8080";
const csv = [
  "Nombre,¿Qué edad tienes?,¿Con qué pagas la mayoría de tus viajes en micro o Metro?,Cuéntanos tu experiencia",
  ...Array.from({ length: 6 }, (_, i) => `Persona Ficticia ${i},18 a 24,"QR de la app Red, Tarjeta bip!",Relato ficticio número ${i} del viaje`),
].join("\n");
writeFileSync("/tmp/gt-fixture.csv", csv);

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE + "/campo/gt/", { waitUntil: "networkidle" });
const fail = (m) => { console.error("✗ " + m); process.exitCode = 1; };

if (!(await page.locator("main").count())) fail("sin <main>");
await page.setInputFiles("#f-csv", "/tmp/gt-fixture.csv");
await page.waitForTimeout(500);
const body = await page.locator("body").innerText();
if (body.includes("Persona Ficticia")) fail("se ve un nombre en pantalla");
if (!body.includes("Pueden traer nombres")) fail("falta aviso de texto libre");
if (!(await page.locator("#free-opt").count())) fail("falta opción para incluir texto libre");

for (const state of ["con datos"]) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  r.violations.forEach((v) => fail(`axe ${state}: ${v.id} (${v.impact}) ×${v.nodes.length} — ${v.help}`));
}
if (errors.length) fail("errores JS: " + errors.join(" | "));
await browser.close();
if (!process.exitCode) console.log("✓ /campo/gt/ smoke + axe AA sin violaciones");
