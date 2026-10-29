// Ítem M · Mystery shopper (Figma 290:27) + upgrade v3 → v4 sin pérdida.
// Datos de EJEMPLO rotulados: ningún dato real de entrevistados.
export async function run({ fresh, unlock, ok, wait, noPlain, axe, PASS, SENT, STORE, U }) {
  const { ctx, page } = await fresh();
  await page.goto(U); await page.waitForSelector("#lock:not([hidden])");
  const old = {
    schema: 3,
    settings: { encrypt: true, retentionDays: 30, autoDelete: false, lockOnLeave: true, cloudEnabled: false },
    activeStudyId: "s-ej",
    studies: [{ id: "s-ej", name: "EJEMPLO Maas v3", scriptReady: true, segments: [{ id: "jovenes", label: "Jóvenes · Estudio", quota: 3, done: 1 }], questions: [] }],
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
  ok("mystery", "upgrade · estudio sigue", (await page.textContent("main")).includes("EJEMPLO Maas v3"));
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
  await page.selectOption('select[name="punto"]', "ULA");
  await page.check('input[name="escenario"][value="1"]');
  ok("mystery", "qué medir cambia con escenario", (await page.textContent("#ms-medir")).includes("tótem funcionaba"));
  await page.check('input[name="medio"][value="qr"]');
    await page.fill('input[name="intentos"]', "2");
  await page.fill('input[name="mensaje"]', "EJEMPLO tarjeta no válida");
  await page.fill('textarea[name="sentir"]', "EJEMPLO me sentí apurado");
  await page.fill('textarea[name="pista"]', "EJEMPLO avisar saldo antes");
  ok("mystery", "estudio Maas por defecto", (await page.inputValue('select[name="studyId"]')) === "s-ej");
  await page.check('input[name="salida"][value="MS-1"]');
  await page.fill('input[name="espera"]', "2");
  await page.fill('input[name="uso"]', "1.5");
  ok("mystery", "total se calcula", (await page.textContent("#ms-total")).includes("3.5 min"));
  await page.fill('input[name="saldoIni"]', "1500");
  await page.fill('input[name="saldoFin"]', "800");
  await page.fill('input[name="foto"]', "12");
  await page.check('input[name="fotoOk"]');
  await page.setInputFiles("#ms-audio-file", { name: "EJEMPLO-voz.m4a", mimeType: "audio/mp4", buffer: Buffer.from("x") });
  ok("mystery", "nota de voz anotada", (await page.textContent("#ms-audio-list")).includes("EJEMPLO-voz.m4a"));
  await page.click("#ms-save"); await wait(page, 700);
  const list = await page.textContent("main");
  ok("mystery", "ficha guardada con código MS-AAAAMMDD-NN", /MS-\d{8}-01/.test(list), list.slice(0, 200));
  ok("mystery", "ficha muestra datos", list.includes("Medio de pago: QR") && list.includes("«EJEMPLO tarjeta no válida»"));
  ok("mystery", "estudio, salida, total, saldo, foto y voz", list.includes("Estudio: EJEMPLO Maas v3 · Salida: MS-1") && list.includes("Tiempo total: 3.5 min") && list.includes("Foto N° 12") && list.includes("EJEMPLO-voz.m4a") && /Saldo: \$1\.?500 → \$800/.test(list), list.slice(0, 400));
  await page.evaluate(() => { location.hash = "#/evidencias?study=s-ej"; }); await wait(page);
  ok("mystery", "Evidencias muestra fichas mystery", (await page.textContent("main")).includes("Fichas mystery (1)"));
  await page.evaluate(() => { location.hash = "#/mystery"; }); await wait(page);
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
  // P0 QA 29-oct (datos de EJEMPLO, sin personas reales)
  await page.evaluate(() => { location.hash = "#/mystery/nueva"; }); await wait(page);
  ok("p0qa", "Punto es selector con códigos", (await page.locator('select[name="punto"] option[value="PAJ"]').count()) === 1 && (await page.locator('select[name="punto"] option[value="IRZ"]').count()) === 1);
  await page.selectOption('select[name="punto"]', "PAJ");
  await page.fill('textarea[name="sentir"]', "EJEMPLO P0");
  await page.fill('input[name="espera"]', "-2");
  await page.click("#ms-save"); await wait(page);
  ok("p0qa", "espera negativa → error, no se guarda", (await page.textContent("#ms-error")).includes("0 o más minutos") && (await page.inputValue('input[name="espera"]')) === "-2" && (await page.evaluate(() => location.hash)).startsWith("#/mystery/nueva"));
  await page.fill('input[name="espera"]', "3");
  await page.fill('input[name="obs"]', "OBS-mal");
  await page.click("#ms-save"); await wait(page);
  ok("p0qa", "Sesión OBS con formato inválido → error", (await page.textContent("#ms-error")).includes("OBS-DD-MM-LUGAR-N"));
  await page.fill('input[name="obs"]', "OBS-29-10-EJE-1");
  await page.fill('input[name="foto"]', "EJEMPLO-7");
  await page.click("#ms-save"); await wait(page);
  ok("p0qa", "foto sin casilla caras difuminadas → error", (await page.textContent("#ms-error")).includes("caras difuminadas"));
  await page.check('input[name="fotoOk"]');
  await page.click("#ms-save"); await wait(page, 700);
  let txt = await page.textContent("main");
  ok("p0qa", "guarda con punto, sesión OBS y foto", txt.includes("PAJ ·") && txt.includes("Sesión OBS: OBS-29-10-EJE-1") && txt.includes("caras difuminadas ✓"), txt.slice(0, 400));
  ok("p0qa", "dos fichas", (await page.locator("main article").count()) === 2);
  await page.locator('button[aria-label^="Editar ficha MS-"]').first().click(); await wait(page);
  await page.click("#ms-delete"); await wait(page, 200);
  ok("p0qa", "borrar pide confirmación", await page.isVisible("#ms-delete-confirm"));
  await page.click("#ms-delete-no"); await wait(page, 200);
  ok("p0qa", "cancelar no borra", !(await page.isVisible("#ms-delete-confirm")));
  await page.click("#ms-delete"); await page.click("#ms-delete-yes"); await wait(page, 700);
  ok("p0qa", "confirmar borra solo esa ficha", (await page.locator("main article").count()) === 1);
  await noPlain(page, "mystery");
  ok("mystery", "sin errores JS", page.errs.length === 0, page.errs.join("|"));
  await ctx.close();

  // Fichas creadas con e347f5e (v4, montos y tiempos en texto): se convierten y el texto no convertible queda en *_raw.
  {
    const { ctx, page } = await fresh();
    await page.goto(U); await page.waitForSelector("#lock:not([hidden])");
    const v4 = { schema: 4, settings: old.settings, activeStudyId: "s-ej", studies: old.studies, interviews: [], batches: [], observations: [], draft: null,
      mystery: [{ id: "ms-ej", code: "MS-20261029-01", punto: "EJEMPLO punto", when: "2026-10-29T10:00", escenario: "1", medio: "bip", espera: "2:30", uso: "rápido", total: "3:15", saldoIni: "$1.500", saldoFin: "800", sentir: "EJEMPLO", savedAt: 1 }] };
    await page.evaluate(async ({ PASS, STORE, v4 }) => {
      const enc = new TextEncoder(); const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
      const base = await crypto.subtle.importKey("raw", enc.encode(PASS), "PBKDF2", false, ["deriveKey"]);
      const aes = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
      const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, enc.encode(JSON.stringify(v4)));
      const b = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
      localStorage.setItem(STORE, JSON.stringify({ v: 2, enc: true, iter: 600000, salt: b(salt), iv: b(iv), data: b(data) }));
    }, { PASS, STORE, v4 });
    const before = await page.evaluate((k) => localStorage.getItem(k), STORE);
    await page.reload(); await unlock(page);
    ok("mystery", "v4 texto · copia previa intacta", (await page.evaluate((k) => localStorage.getItem(k + ".antes-de-migrar"), STORE)) === before);
    const u = await page.evaluate(() => globalThis.__campoMs && true);
    await page.evaluate(() => { location.hash = "#/mystery"; }); await wait(page);
    const t = await page.textContent("main");
    ok("mystery", "v4 texto · ficha sigue con total convertido", t.includes("MS-20261029-01") && t.includes("Tiempo total: 3.25 min") && /Saldo: \$1\.?500 → \$800/.test(t), t.slice(0, 300));
    await page.click('button[aria-label="Editar ficha MS-20261029-01"]'); await wait(page);
    ok("mystery", "v4 texto · espera 2:30 → 2.5", (await page.inputValue('input[name="espera"]')) === "2.5" && u);
    const raw = await page.evaluate(() => { const m = globalThis.__campoMs; const st = { studies: [], mystery: [{ uso: "rápido", espera: "1" }] }; m.normalizeMystery(st); return st.mystery[0]; });
    ok("mystery", "no convertible → uso_raw", raw.uso === null && raw.uso_raw === "rápido" && raw.espera === 1 && raw.total === 1, JSON.stringify(raw));
    ok("mystery", "v4 texto · sin errores JS", page.errs.length === 0, page.errs.join("|"));
    await ctx.close();
  }
}
