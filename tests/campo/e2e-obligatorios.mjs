// Del hallazgo al test · 30-oct-2026 · QA 29-oct P1 #16 (WCAG 3.3.2 Etiquetas o instrucciones).
// Criterio: en /mystery/nueva, Punto y «Lo que sentí» se ven marcados como obligatorios
// ANTES de guardar (texto visible «obligatorio» en su etiqueta), no solo al fallar.
// Rojo a propósito: hoy solo llevan `required`, sin marca visible.
export async function run({ fresh, setup, ok, wait }) {
  const { ctx, page } = await fresh();
  await setup(page);
  await page.evaluate(() => { location.hash = "#/mystery/nueva"; }); await wait(page);
  for (const name of ["punto", "sentir"]) {
    const label = await page.evaluate((n) => {
      const el = document.querySelector(`[name="${n}"]`);
      return (el?.labels?.[0] || el?.closest("label"))?.innerText || "";
    }, name);
    ok("obligatorios", `${name} · etiqueta dice obligatorio`, /obligatori/i.test(label), JSON.stringify(label));
  }
  ok("obligatorios", "sin errores JS", page.errs.length === 0, page.errs.join("|"));
  await ctx.close();
}
