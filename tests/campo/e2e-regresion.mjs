// Regresión P0 (27-oct): datos creados en a92874f / b81a1fe abiertos con la versión actual.
// Fixtures: localStorage real (passphrase) de esas versiones, con estudio + ficha OBS-27-10-BAQ-1.
// También simula la caché mezclada de Safari (index.html viejo + app.js nuevo).
import fs from "fs";
const FX = JSON.parse(fs.readFileSync(new URL("./fixtures-old.json", import.meta.url), "utf8"));

export async function run({ fresh, unlock, ok, wait, noPlain, STORE, U }) {
  for (const ver of ["a92874f", "b81a1fe"]) {
    const { ctx, page } = await fresh();
    await page.addInitScript(([data, flag]) => {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
    }, [FX[ver], "seeded-" + ver]);
    await page.goto(U); await unlock(page);
    const before = FX[ver][STORE];
    await page.evaluate(() => { location.hash = "#/observacion"; }); await wait(page);
    ok("regresion", `${ver} · ficha vieja visible`, (await page.textContent("main")).includes("OBS-27-10-BAQ-1"));
    const edit = page.locator('button[aria-label="Editar ficha OBS-27-10-BAQ-1"]');
    ok("regresion", `${ver} · botón Editar ficha`, (await edit.count()) === 1);
    await edit.click(); await wait(page);
    ok("regresion", `${ver} · Editar ficha abre con datos`, (await page.inputValue("textarea[name=vi]")) === "Fila vieja en tótem" && (await page.textContent("#obs-code")).includes("OBS-27-10-BAQ-1"));
    await page.fill("textarea[name=vi]", "Fila vieja en tótem (editada)");
    await page.click("text=Guardar cambios"); await wait(page, 700);
    const list = await page.textContent("main");
    ok("regresion", `${ver} · ficha editada sin duplicar`, list.includes("(editada)") && (await page.locator("main article").count()) === 1);
    for (const [hash, sel] of [["#/estudios", "Estudio Baquedano"], ["#/privacidad", "Guardar privacidad"], ["#/evidencias", "Fichas de observación (1)"], ["#/guia", "Ver mis fichas (1)"]]) {
      await page.evaluate((x) => { location.hash = x; }, hash); await wait(page);
      ok("regresion", `${ver} · ${hash}`, (await page.textContent("body")).includes(sel), (await page.textContent("main")).slice(0, 80));
    }
    for (const tab of ["Estudios", "Campo", "Registro", "Evidencias", "Guía"]) {
      await page.click(`#tabbar >> text=${tab}`); await wait(page);
      ok("regresion", `${ver} · pestaña ${tab}`, (await page.textContent("main")).trim().length > 0);
    }
    await page.click("#tabbar >> text=Estudios"); await wait(page);
    await page.click("#privacy"); await wait(page);
    ok("regresion", `${ver} · Privacidad desde cabecera`, (await page.isVisible("#build")));
    ok("regresion", `${ver} · copia previa intacta`, (await page.evaluate((k) => localStorage.getItem(k + ".antes-de-migrar"), STORE)) === before);
    await page.reload(); await unlock(page);
    await page.evaluate(() => { location.hash = "#/observacion"; }); await wait(page);
    ok("regresion", `${ver} · edición sobrevive a recargar`, (await page.textContent("main")).includes("(editada)"));
    await noPlain(page, `regresion ${ver}`);
    ok("regresion", `${ver} · sin errores JS`, page.errs.length === 0, page.errs.join("|"));
    await ctx.close();
  }
  // Caché mezclada: index.html sin meta campo-build (viejo) + app.js nuevo → aviso «Actualizar ahora».
  {
    const { ctx, page } = await fresh();
    await page.route(/\/campo\/(index\.html)?$/, async (route) => {
      const res = await route.fetch(); let body = await res.text();
      body = body.replace(/<meta name="campo-build"[^>]*>/, "");
      await route.fulfill({ response: res, body });
    });
    await page.goto(U); await wait(page, 600);
    ok("regresion", "caché mezclada · muestra aviso de versión nueva", await page.isVisible("#update-now"));
    ok("regresion", "caché mezclada · sin errores JS", page.errs.length === 0, page.errs.join("|"));
    await ctx.close();
  }
}
