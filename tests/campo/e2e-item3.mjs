// Ítem 3 · P1: editar ficha y registro, sin expiración por defecto, sin «Estudio Demo A/B».
export async function run({ fresh, setup, unlock, ok, wait, noPlain, axe, startInterview, PASS, STORE, U }) {
  const { ctx, page } = await fresh();
  await setup(page);
  const main = await page.textContent("main");
  ok("p1qa", "sin Estudio Demo A/B al crear", !/Demo/.test(main) && (await page.isVisible("#no-studies")), main.slice(0, 100));
  await axe(page, "estudios vacío");
  // retención: «Nunca» por defecto
  await page.evaluate(() => { location.hash = "#/privacidad"; }); await wait(page);
  ok("p1qa", "retención «Nunca» por defecto", (await page.inputValue("#retention")) === "never");
  await page.selectOption("#retention", "90"); await page.click("text=Guardar privacidad"); await wait(page, 600);
  await page.evaluate(() => { location.hash = "#/estudios"; }); await wait(page);
  await page.evaluate(() => { location.hash = "#/privacidad"; }); await wait(page);
  ok("p1qa", "retención 90 se guarda", (await page.inputValue("#retention")) === "90");
  await page.selectOption("#retention", "never"); await page.click("text=Guardar privacidad"); await wait(page, 600);
  await axe(page, "privacidad");
  // ficha: crear y editar
  await page.evaluate(() => { location.hash = "#/observacion/nueva"; }); await wait(page);
  await page.fill("input[name=lugar]", "Pajaritos, paradero 516");
  await page.fill("textarea[name=vi]", "Fila de 8 en tótem");
  await page.click("text=Guardar ficha"); await wait(page, 600);
  const code = (await page.textContent("main article h2")).trim();
  await page.click(`button[aria-label="Editar ficha ${code}"]`); await wait(page);
  ok("p1qa", "editar ficha precarga", (await page.inputValue("textarea[name=vi]")) === "Fila de 8 en tótem");
  ok("p1qa", "editar ficha mantiene código", (await page.textContent("#obs-code")).includes(code));
  await axe(page, "editar ficha");
  await page.fill("textarea[name=vi]", "Fila de 12 en tótem");
  await page.click("text=Guardar cambios"); await wait(page, 600);
  const list = await page.textContent("main");
  ok("p1qa", "ficha editada sin duplicar", list.includes("Fila de 12") && !list.includes("Fila de 8") && (await page.locator("main article").count()) === 1);
  // registro: guardar y luego editar
  await startInterview(page);
  await page.click("#finish"); await wait(page);
  await page.click("text=Guardar registro"); await wait(page, 600);
  await page.evaluate(() => { location.hash = "#/registro"; }); await wait(page);
  ok("p1qa", "registro guardado se puede editar", await page.isVisible("#save-edit"));
  await page.fill("input[name=contact]", "");
  await page.fill("input[name=number]", "99");
  await page.click("#save-edit"); await wait(page, 600);
  await page.reload(); await unlock(page);
  await page.evaluate(() => { location.hash = "#/registro"; }); await wait(page);
  ok("p1qa", "edición de registro persiste", (await page.inputValue("input[name=number]")) === "99");
  ok("p1qa", "código sigue P1", (await page.inputValue("input[name=code]")) === "P1");
  await axe(page, "registro editable");
  await noPlain(page, "tras editar");
  ok("p1qa", "sin errores JS", page.errs.length === 0, page.errs.join("|"));
  await ctx.close();

  // migración: datos viejos con demo A/B → demo sin datos reales se va, el resto queda
  const t = await fresh();
  const p2 = t.page;
  await p2.goto(U); await p2.waitForSelector("#lock:not([hidden])");
  await p2.evaluate(async ({ PASS, STORE }) => {
    const old = { schema: 2, settings: { encrypt: true, retentionDays: 30, autoDelete: false, lockOnLeave: true, cloudEnabled: false }, activeStudyId: "a",
      studies: [{ id: "a", name: "Estudio Demo A · Línea X", segments: [], questions: [] }, { id: "b", name: "Estudio Demo B · Feria", segments: [], questions: [] }, { id: "s-real", name: "Estudio real", segments: [], questions: [] }],
      interviews: [{ id: "e0417", studyId: "a", code: "E-0417", notes: [], tags: [], audio: [], photos: [], videos: [], consent: {} }, { id: "e-real", studyId: "b", code: "P1", notes: [], tags: [], audio: [], photos: [], videos: [], consent: {} }],
      batches: [{ id: "l1", studyId: "a" }], observations: [], draft: null };
    const enc = new TextEncoder(); const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
    const base = await crypto.subtle.importKey("raw", enc.encode(PASS), "PBKDF2", false, ["deriveKey"]);
    const aes = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, enc.encode(JSON.stringify(old)));
    const b = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
    localStorage.setItem(STORE, JSON.stringify({ v: 3, enc: true, kdf: "PBKDF2-SHA256", iter: 600000, salt: b(salt), iv: b(iv), data: b(data) }));
  }, { PASS, STORE });
  await p2.reload(); await unlock(p2);
  await p2.evaluate(() => { location.hash = "#/estudios"; }); await wait(p2);
  const m = await p2.textContent("main");
  ok("p1qa", "migración quita Demo A sin datos", !m.includes("Demo A"), m.slice(0, 160));
  ok("p1qa", "migración conserva Demo B con entrevista real", m.includes("Demo B"));
  ok("p1qa", "migración conserva estudio real", m.includes("Estudio real"));
  await t.ctx.close();
}
