// Chrome headless a 360px: un estudio por instrumento, recarga, sin desborde horizontal.
// Uso: node tests/campo/plantillas-360.mjs
// Requiere google-chrome. No instala dependencias. Guarda PNG en CAMPO_SHOTS (default /opt/cursor/artifacts).
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../public", import.meta.url));
const SHOTS = process.env.CAMPO_SHOTS || "/opt/cursor/artifacts";
const PASS = "prueba-QA-2026";
const PORT = Number(process.env.CAMPO_PORT || 8765);
const DEBUG = Number(process.env.CAMPO_DEBUG_PORT || 9333);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".json": "application/json" };

function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!rel || rel.endsWith("/")) rel += "index.html";
    const file = normalize(join(ROOT, rel));
    if (!file.startsWith(ROOT + "/")) { res.writeHead(403); res.end(); return; }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404); res.end("no");
    }
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

async function waitJson(url) {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch { /* chrome todavía arranca */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Chrome no abrió el puerto de depuración");
}

function cdp(ws) {
  let n = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) events.push(msg);
  });
  return {
    send(method, params = {}) {
      const id = ++n;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    take(method) {
      return events.filter((e) => e.method === method).map((e) => e.params);
    },
  };
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  rmSync("/tmp/campo-chrome-360", { recursive: true, force: true });
  const server = await startServer();
  const chrome = spawn("google-chrome-stable", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
    `--remote-debugging-port=${DEBUG}`, "--user-data-dir=/tmp/campo-chrome-360",
    "--window-size=360,800", "about:blank",
  ], { stdio: "ignore" });
  const failures = [];
  try {
    await waitJson(`http://127.0.0.1:${DEBUG}/json/version`);
    const pages = await waitJson(`http://127.0.0.1:${DEBUG}/json/list`);
    const page = pages.find((p) => p.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener("open", resolve); ws.addEventListener("error", reject); });
    const c = cdp(ws);
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await c.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
    await c.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/campo/` });

    const evalJson = async (expression) => {
      const out = await c.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (out.exceptionDetails) {
        const d = out.exceptionDetails;
        throw new Error(d.exception?.description || d.text || JSON.stringify(d));
      }
      return out.result?.value;
    };
    const waitFor = async (expression, timeout = 8000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await evalJson(expression)) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      const text = await evalJson(`document.body ? document.body.innerText.slice(0, 400) : ""`);
      throw new Error(`timeout ${expression} · ${text}`);
    };
    const shot = async (name) => {
      const png = await c.send("Page.captureScreenshot", { format: "png" });
      const file = join(SHOTS, name);
      writeFileSync(file, Buffer.from(png.data, "base64"));
      return file;
    };
    const overflow = () => evalJson(`(() => {
      const doc = document.documentElement;
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 2 && r.right > doc.clientWidth + 1) bad.push((el.id || el.className || el.tagName) + ":" + Math.round(r.right));
      }
      return { sw: doc.scrollWidth, cw: doc.clientWidth, bad: bad.slice(0, 6) };
    })()`);
    const checkOverflow = async (label) => {
      const o = await overflow();
      if (o.sw > o.cw + 1 || o.bad.length) failures.push(`${label}: scroll ${o.sw}>${o.cw} ${o.bad.join(", ")}`);
      return o;
    };

    await waitFor(`(document.querySelector("#lock-help")?.textContent || "").includes("Primer uso")`);
    await evalJson(`(() => {
      document.querySelector("#lock-pass").value = ${JSON.stringify(PASS)};
      document.querySelector("#lock-again").value = ${JSON.stringify(PASS)};
      document.querySelector("#lock-form").requestSubmit();
    })()`);
    await waitFor(`document.querySelector("#lock").hidden === true`, 30000);

    const templates = await evalJson(`(() => {
      const sel = document.querySelector("#instrumento");
      if (!sel) { location.hash = "#/nuevo"; return null; }
      return [...sel.options].map((o) => ({ id: o.value, nombre: o.textContent }));
    })()`);
    if (!templates) {
      await waitFor(`location.hash.includes("/nuevo") && document.querySelector("#instrumento")`);
    }
    await evalJson(`location.hash = "#/nuevo"`);
    await waitFor(`document.querySelector("#instrumento")`);
    const list = await evalJson(`[...document.querySelector("#instrumento").options].map((o) => ({ id: o.value, nombre: o.textContent }))`);
    if (!list.length) throw new Error("el selector de instrumento está vacío");

    for (const tpl of list) {
      await evalJson(`location.hash = "#/nuevo"`);
      await waitFor(`document.querySelector("#instrumento")`);
      await evalJson(`(() => {
        const s = document.querySelector("#instrumento");
        s.value = ${JSON.stringify(tpl.id)};
        s.dispatchEvent(new Event("change", { bubbles: true }));
        document.querySelector("#use-template").click();
        const name = document.querySelector('input[aria-label="Nombre del estudio"]');
        name.value = ${JSON.stringify(tpl.nombre)};
        name.dispatchEvent(new Event("input", { bubbles: true }));
      })()`);
      await waitFor(`document.querySelectorAll("#q-list input").length > 0`);
      await evalJson(`(() => { window.scrollTo(0, 0); const toast = document.querySelector("#toast"); if (toast) toast.hidden = true; })()`);
      const file = await shot(`campo-360-nuevo-${tpl.id}.png`);
      const o = await checkOverflow(`nuevo ${tpl.id}`);
      console.log(`nuevo ${tpl.id} ${o.sw}x${o.cw} ${file}`);
      await evalJson(`document.querySelector("#save-study").click()`);
      await waitFor(`document.querySelector("#script-ready")`);
      await checkOverflow(`preparar ${tpl.id}`);
    }

    await evalJson(`document.documentElement.dataset.mark = "antes"`);
    try { await evalJson(`location.reload()`); } catch { /* el contexto se destruye al recargar */ }
    await waitFor(`document.documentElement.dataset.mark !== "antes" && (document.querySelector("#lock-help")?.textContent || "").includes("Escribe tu clave")`, 30000);
    await evalJson(`(() => {
      document.querySelector("#lock-pass").value = ${JSON.stringify(PASS)};
      document.querySelector("#lock-form").requestSubmit();
    })()`);
    await waitFor(`document.querySelector("#lock").hidden === true`, 30000);
    await evalJson(`location.hash = "#/estudios"`);
    await waitFor(`document.querySelector("#title") && document.querySelector("#title").textContent === "Mis estudios"`);
    const names = await evalJson(`[...document.querySelectorAll("article.card h2")].map((h) => h.textContent)`);
    const plain = await evalJson(`localStorage.getItem("campo.etnografia.v1") || ""`);
    const missing = list.filter((t) => !names.includes(t.nombre)).map((t) => t.nombre);
    if (missing.length) failures.push(`tras recarga faltan: ${missing.join(", ")} (vistos: ${names.join(" | ")})`);
    if (names.length < list.length) failures.push(`estudios ${names.length} < instrumentos ${list.length} (antes de recargar en preparar no se listan)`);
    if (plain.includes("Entrevista de guerrilla") || plain.includes("¿Qué viniste")) failures.push("el almacén tiene texto plano");
    let blob;
    try { blob = JSON.parse(plain); } catch { blob = {}; }
    if (blob.enc !== true) failures.push("el almacén no está cifrado");
    await evalJson(`window.scrollTo(0, 0)`);
    const listShot = await shot("campo-360-estudios-tras-recarga.png");
    const o = await checkOverflow("estudios tras recarga");
    console.log(`estudios ${names.length} ${o.sw}x${o.cw} ${listShot}`);
    console.log(names.join(" · "));
    const font = await evalJson(`document.fonts.check('700 28px "Roboto Slab"')`);
    console.log(`roboto slab ${font}`);
    const exceptions = c.take("Runtime.exceptionThrown").map((p) => p.exceptionDetails?.text || p.exceptionDetails?.exception?.description || "error");
    if (exceptions.length) failures.push(`JS: ${exceptions.join(" | ")}`);
    if (failures.length) {
      console.error(failures.join("\n"));
      process.exitCode = 1;
    } else {
      console.log("sin desborde horizontal");
    }
    ws.close();
  } finally {
    chrome.kill("SIGKILL");
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
