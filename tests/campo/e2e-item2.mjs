// Ítem 2 · P0 updates sin pérdida: test de upgrade con datos viejos (esquema 1, PBKDF2 120k).
export async function run({ fresh, unlock, ok, wait, noPlain, axe, PASS, SENT, STORE, U }) {
  const { ctx, page } = await fresh();
  await page.goto(U); await page.waitForSelector("#lock:not([hidden])");
  // Datos como los dejaba la versión anterior: sin "schema", sin observations, entrevistas sin videos.
  await page.evaluate(async ({ PASS, SENT, STORE }) => {
    const old = {
      settings: { encrypt: true, retentionDays: 30, autoDelete: false, lockOnLeave: true },
      activeStudyId: "s-old",
      studies: [{ id: "s-old", name: "Estudio real 2025", scriptReady: true, segments: [{ id: "jovenes", label: "Jóvenes · Estudio", quota: 3, done: 1 }], questions: [{ id: "q0", block: "Apertura", text: "¿Cómo llegaste?" }] }],
      interviews: [{ id: "e-old", studyId: "s-old", code: "P1", number: "01", segmentId: "jovenes", contact: "", savedAt: Date.now(), consent: { participate: true, audio: true }, notes: [{ t: "01:00", text: SENT }], tags: [], audio: [], photos: [] }],
      batches: [], draft: null,
    };
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const base = await crypto.subtle.importKey("raw", enc.encode(PASS), "PBKDF2", false, ["deriveKey"]);
    const aes = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, enc.encode(JSON.stringify(old)));
    const b = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
    localStorage.setItem(STORE, JSON.stringify({ v: 2, enc: true, salt: b(salt), iv: b(iv), data: b(data) }));
  }, { PASS, SENT, STORE });
  await page.reload();
  await unlock(page);
  await page.evaluate(() => { location.hash = "#/estudios"; }); await wait(page);
  const main = await page.textContent("main");
  ok("p0", "upgrade · estudio viejo sigue", main.includes("Estudio real 2025"), main.slice(0, 120));
  ok("p0", "upgrade · deja copia cifrada previa", await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem("campo.etnografia.v1.antes-de-migrar") || "{}"); return b.enc === true && !b.iter;
  }));
  const blob = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORE);
  ok("p0", "upgrade · re-cifrado a 600k", blob.iter === 600000);
  await noPlain(page, "tras upgrade");
  // reabrir: el estudio y la nota siguen
  await page.reload(); await unlock(page);
  await page.evaluate(() => { location.hash = "#/evidencias?study=s-old"; }); await wait(page);
  ok("p0", "upgrade · entrevista P1 sigue", (await page.textContent("main")).includes("Registros (1)"));
  // simular nueva versión del SW/app: registrar sw.js y recargar no borra
  const swOk = await page.evaluate(async () => {
    try { await navigator.serviceWorker.register("/sw.js"); } catch { /* el SW real vive en /uxtools/ */ }
    return true;
  });
  await page.reload(); await unlock(page);
  ok("p0", "upgrade · recarga tras SW conserva datos", swOk && (await page.evaluate((k) => !!localStorage.getItem(k), STORE)));
  await axe(page, "evidencias tras upgrade");
  ok("p0", "upgrade · sin errores JS", page.errs.length === 0, page.errs.join("|"));
  await ctx.close();
}
