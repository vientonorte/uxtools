// Ítem M · Mystery shopper (Figma 290:27) + upgrade v3 → v4 sin pérdida.
// Datos de EJEMPLO rotulados: ningún dato real de entrevistados.
export async function run({ fresh, unlock, ok, wait, noPlain, axe, PASS, SENT, STORE, U }) {
  const { ctx, page } = await fresh();
  await page.goto(U); await page.waitForSelector("#lock:not([hidden])");
  const old = {
    schema: 3,
    settings: { encrypt: true, retentionDays: 30, autoDelete: false, lockOnLeave: true, cloudEnabled: false },
    activeStudyId: "s-ej",
    studies: [{ id: "s-ej", name: "EJEMPLO Estudio v3", scriptReady: true, segments: [{ id: "jovenes", label: "Jóvenes · Estudio", quota: 3, done: 1 }], questions: [] }],
    interviews: [{ id: "e-ej", studyId: "s-ej", code: "EJ-P1", number: "01", segmentId: "jovenes", contact: "", savedAt: Date.now(), consent: { participate: true, audio: true, photos: false, cloud: false }, notes: [{ t: "01:00", text: SENT }], tags: [], audio: [], photos: [], videos: [] }],
    batches: [{ id: "b-ej", studyId: "s-ej", name: "Hoy", goal: 3, done: 1 }],
    observations: [{ id: "obs-ej", code: "OBS-29-10-EJE-1", lugar: "EJEMPLO lugar", when: "2026-10-29T10:00", franja: "punta", clima: "", corte: false, tema: "recarga", vi: "EJEMPLO fila en tótem", supongo: "", porPreguntar: false, traba: "", ayuda: "", foto: "", pistas: [], savedAt: Date.now() }],
    futuraClave: { de: "versión más nueva" },
    draft: null,
  };
  await page.evaluate(async ({ PASS, STORE, old }) => {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const base = await crypto.subtle.importKey("raw", enc.encode(PASS), "PBKDF2", false, ["deriveKey"]);
    const aes = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, enc.encode(JSON.stringify(old)));
    const b = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
    localStorage.setItem(STORE, JSON.stringify({ v: 2, enc: true, iter: 600000, salt: b(salt), iv: b(iv), data: b(data) }));
  }, { PASS, STORE, old });
  const before = await page.evaluate((k) => localStorage.getItem(k), STORE);
  await page.reload(); await unlock(page);
  ok("mystery", "upgrade v3→v4 · copia previa intacta", (await page.evaluate((k) => localStorage.getItem(k + ".antes-de-migrar"), STORE)) === before);
  await page.evaluate(() => { location.hash = "#/estudios"; }); await wait(page);
  ok("mystery", "upgrade · estudio sigue", (await page.textContent("main")).includes("EJEMPLO Estudio v3"));
  await page.evaluate(() => { location.hash = "#/observacion"; }); await wait(page);
  ok("mystery", "upgrade · ficha de observación sigue", (await page.textContent("main")).includes("OBS-29-10-EJE-1"));
  await page.evaluate(() => { location.hash = "#/evidencias?study=s-ej"; }); await wait(page);
  ok("mystery", "upgrade · registro sigue", (await page.textContent("main")).includes("Registros (1)"));
  await page.evaluate(() => { location.hash = "#/respaldo"; }); await wait(page);
  ok("mystery", "upgrade · conteos completos", (await page.textContent("main")).includes("Fichas: 1 · Mystery: 0 · Lotes: 1 · Estudios: 1 · Registros: 1"), (await page.textContent("main")).slice(0, 200));

  // Flujo: Guía → Mystery → nueva ficha
  await page.evaluate(() => { location.hash = "#/guia"; }); await wait(page);
  await page.click("#go-mystery"); await wait(page);
  ok("mystery", "lista vacía", (await page.textContent("main")).includes("Todavía no hay fichas de mystery"));
  await axe(page, "#/mystery");
  await page.click("#ms-create"); await wait(page);
  await axe(page, "#/mystery/nueva");
  await page.click("#ms-save"); await wait(page);
  ok("mystery", "validación · foco en Punto", await page.evaluate(() => document.activeElement?.name === "punto"));
  ok("mystery", "validación · mensaje", (await page.textContent("#ms-error")).includes("Falta el punto y lo que sentiste"));
  await page.fill('input[name="punto"]', "EJEMPLO Unión Latinoamericana");
  await page.check('input[name="escenario"][value="1"]');
  ok("mystery", "qué medir cambia con escenario", (await page.textContent("#ms-medir")).includes("tótem funcionaba"));
  await page.check('input[name="medio"][value="qr"]');
  await page.fill('input[name="total"]', "3:15");
  await page.fill('input[name="intentos"]', "2");
  await page.fill('input[name="mensaje"]', "EJEMPLO tarjeta no válida");
  await page.fill('textarea[name="sentir"]', "EJEMPLO me sentí apurado");
  await page.fill('textarea[name="pista"]', "EJEMPLO avisar saldo antes");
  await page.click("#ms-save"); await wait(page, 700);
  const list = await page.textContent("main");
  ok("mystery", "ficha guardada con código MS-AAAAMMDD-NN", /MS-\d{8}-01/.test(list), list.slice(0, 200));
  ok("mystery", "ficha muestra datos", list.includes("Medio de pago: QR") && list.includes("«EJEMPLO tarjeta no válida»"));
  const edit = page.locator('button[aria-label^="Editar ficha MS-"]');
  await edit.click(); await wait(page);
  ok("mystery", "editar abre con datos", (await page.inputValue('textarea[name="sentir"]')) === "EJEMPLO me sentí apurado" && (await page.isChecked('input[name="medio"][value="qr"]')));
  await page.fill('textarea[name="sentir"]', "EJEMPLO me sentí apurado (editada)");
  await page.click("#ms-save"); await wait(page, 700);
  ok("mystery", "editar sin duplicar", (await page.locator("main article").count()) === 1 && (await page.textContent("main")).includes("(editada)"));
  await page.reload(); await unlock(page);
  await page.evaluate(() => { location.hash = "#/mystery"; }); await wait(page);
  ok("mystery", "sobrevive a recargar", (await page.textContent("main")).includes("(editada)"));
  await page.evaluate(() => { location.hash = "#/observacion"; }); await wait(page);
  ok("mystery", "observación intacta tras mystery", (await page.textContent("main")).includes("OBS-29-10-EJE-1"));
  await noPlain(page, "mystery");
  ok("mystery", "sin errores JS", page.errs.length === 0, page.errs.join("|"));
  await ctx.close();
}
