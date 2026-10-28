// Exportar fichas + lotes con datos viejos (fixtures a92874f/b81a1fe), borrar almacenamiento, importar y verificar.
import fs from "fs";
const FX = JSON.parse(fs.readFileSync(new URL("./fixtures-old.json", import.meta.url), "utf8"));
const FILEPASS = "archivo-QA-2026";

export async function run({ fresh, setup, unlock, ok, wait, noPlain, STORE, U, SENT }) {
  for (const ver of ["a92874f", "b81a1fe"]) {
    let { ctx, page } = await fresh();
    await page.addInitScript(([data, flag]) => {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
    }, [FX[ver], "seeded-" + ver]);
    await page.goto(U); await unlock(page);
    // Lote real en el estudio Baquedano (los lotes demo l1–l3 los quita la migración v3 a propósito).
    await page.evaluate(() => { location.hash = "#/lotes"; }); await wait(page, 600);
    await page.evaluate(() => { location.hash = "#/observacion"; }); await wait(page);
    const btn = page.locator("#export-fichas");
    ok("export", `${ver} · botón Exportar fichas visible en la lista`, await btn.isVisible());
    await btn.click(); await wait(page);
    const counts = await page.textContent("main");
    ok("export", `${ver} · respaldo cuenta fichas y lotes`, /Fichas: 1/.test(counts) && /Lotes: [1-9]/.test(counts), counts.slice(0, 160));
    await page.fill('#respaldo-export input[name=pass]', FILEPASS);
    await page.fill('#respaldo-export input[name=again]', FILEPASS);
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#respaldo-go")]);
    const path = `/tmp/campo-respaldo-${ver}.json`; await dl.saveAs(path);
    const raw = fs.readFileSync(path, "utf8");
    const blob = JSON.parse(raw);
    ok("plano", `${ver} · archivo exportado cifrado, sin texto plano`, blob.enc === true && !raw.includes("OBS-27-10-BAQ-1") && !raw.includes("Fila vieja") && !raw.includes("Baquedano") && !raw.includes(SENT));
    await ctx.close();
    // Almacenamiento borrado: contexto nuevo, sin localStorage.
    ({ ctx, page } = await fresh());
    await setup(page);
    await page.evaluate(() => { location.hash = "#/respaldo"; }); await wait(page);
    ok("export", `${ver} · vacío: 0 fichas`, /Fichas: 0/.test(await page.textContent("main")));
    await page.setInputFiles('#respaldo-import input[type=file]', path);
    await page.fill('#respaldo-import input[name=ipass]', "clave-mala-123");
    await page.click("#import-go"); await wait(page, 1500);
    ok("export", `${ver} · clave mala no importa`, (await page.textContent("#import-error")).includes("clave"));
    await page.fill('#respaldo-import input[name=ipass]', FILEPASS);
    await page.click("#import-go"); await wait(page, 1500);
    let txt = await page.textContent("main");
    ok("export", `${ver} · importado: vuelven ficha y lotes`, /Fichas: 1/.test(txt) && /Lotes: [1-9]/.test(txt), txt.slice(0, 160));
    // Importar dos veces no duplica.
    await page.setInputFiles('#respaldo-import input[type=file]', path);
    await page.fill('#respaldo-import input[name=ipass]', FILEPASS);
    await page.click("#import-go"); await wait(page, 1500);
    txt = await page.textContent("main");
    ok("export", `${ver} · reimportar no duplica`, /Fichas: 1 /.test(txt + " "), txt.slice(0, 160));
    await page.evaluate(() => { location.hash = "#/observacion"; }); await wait(page);
    ok("export", `${ver} · OBS-27-10-BAQ-1 vuelve`, (await page.textContent("main")).includes("OBS-27-10-BAQ-1"));
    await page.reload(); await unlock(page);
    await page.evaluate(() => { location.hash = "#/respaldo"; }); await wait(page);
    txt = await page.textContent("main");
    ok("export", `${ver} · sobrevive a recargar`, /Fichas: 1/.test(txt) && /Lotes: [1-9]/.test(txt) && /Estudios: [1-9]/.test(txt));
    await noPlain(page, `export ${ver}`);
    const ls = await page.evaluate(() => Object.keys(localStorage).join(","));
    ok("plano", `${ver} · sin «Fila vieja» ni código en claro en localStorage`, !(await page.evaluate(() => Object.values(localStorage).join("")).then((v) => v.includes("Fila vieja") || v.includes("OBS-27-10-BAQ-1"))), ls);
    ok("export", `${ver} · claves de localStorage sin cambios`, ls.split(",").every((k) => k === STORE || k === STORE + ".antes-de-migrar"), ls);
    ok("export", `${ver} · sin errores JS`, page.errs.length === 0, page.errs.join("|"));
    await ctx.close();
  }
}
