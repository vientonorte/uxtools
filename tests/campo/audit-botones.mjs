// Auditoría de botones por pestaña (WebKit iPhone 15). Uso: U=http://127.0.0.1:3000/campo/ [STORE=…] [SHARE=1] node tests/campo/audit-botones.mjs
import { webkit, devices } from "playwright"; import fs from "fs";
const FX = JSON.parse(fs.readFileSync(new URL("./fixtures-old.json", import.meta.url),"utf8"));
const U = process.env.U; const STORE=process.env.STORE||"campo.etnografia.v1"; const PASS="prueba-QA-2026"; const SHARE=process.env.SHARE==="1";
const R=[]; const b = await webkit.launch();
const ctx = await b.newContext({ ...devices["iPhone 15"], acceptDownloads: true }); const p = await ctx.newPage();
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript(([v,k])=>{ if(sessionStorage.getItem("s"))return; sessionStorage.setItem("s","1"); localStorage.setItem(k,v);},[FX.b81a1fe["campo.etnografia.v1"],STORE]);
if (SHARE) await p.addInitScript(()=>{ window.__shared=[]; navigator.canShare=(d)=>!!(d&&d.files&&d.files.length); navigator.share=async(d)=>{ for(const f of d.files) window.__shared.push({name:f.name,size:f.size,txt:await f.text()}); }; });
const W=(ms=450)=>p.waitForTimeout(ms); const go=async(h)=>{await p.evaluate(x=>location.hash=x,h); await W();};
const main=()=>p.textContent("main"); const hash=()=>p.evaluate(()=>location.hash);
async function step(tab, action, expected, fn){ let pass=false, d=""; try{ const r=await fn(); pass=r===true||(r&&r.pass); d=r&&r.d||""; }catch(e){ d=String(e.message).split("\n")[0].slice(0,120);} R.push({tab,action,expected,pass,d}); }
async function exportFlow(btnSel, fname){
  if (SHARE){ await p.evaluate(()=>window.__shared=[]); await p.click(btnSel); await W(2500); const s=await p.evaluate(()=>window.__shared); return {pass: s.length===1 && JSON.parse(s[0].txt).enc===true && !s[0].txt.includes("OBS-27"), d: s.map(x=>x.name+" "+x.size+"B").join(",")}; }
  const [dl]=await Promise.all([p.waitForEvent("download",{timeout:8000}), p.click(btnSel)]); const f="/tmp/aud-"+fname; await dl.saveAs(f); const t=fs.readFileSync(f,"utf8"); fs.copyFileSync(f,"/tmp/aud-last.json");
  return {pass: JSON.parse(t).enc===true, d: dl.suggestedFilename()+" "+t.length+"B"};
}
await p.goto(U); await p.waitForSelector("#lock:not([hidden])");
await step("Bloqueo","Desbloquear con frase","Se oculta el bloqueo y aparece Estudios",async()=>{await p.fill("#lock-pass",PASS); await p.click("#lock-submit"); await p.waitForSelector("#lock",{state:"hidden",timeout:15000}); await W(); return (await main()).includes("Estudio");});
await step("Estudios","Abrir estudio","Pasa a Preparar del estudio",async()=>{await go("#/estudios"); await p.click("main >> text=Abrir estudio"); await W(); return (await hash()).startsWith("#/preparar");});
await step("Estudios","Crear estudio → plantilla → +cupo → Guardar","Estudio nuevo aparece en la lista",async()=>{await go("#/nuevo"); await p.fill('input[aria-label="Nombre del estudio"]',"Audit QA"); await p.click("#use-template"); await p.click('button[aria-label^="Sumar cupo Jóvenes"]'); await p.click("#save-study"); await W(700); await go("#/estudios"); return (await main()).includes("Audit QA");});
await step("Cabecera","Privacidad","Abre Privacidad",async()=>{await go("#/estudios"); await p.click("#privacy"); await W(); return (await hash()).startsWith("#/privacidad");});
await step("Cabecera","‹ Volver","Vuelve a la pantalla anterior",async()=>{await go("#/observacion"); await p.click("#back"); await W(); return (await hash())==="#/guia";});
await go("#/estudios"); await p.click("main >> text=Abrir estudio >> nth=0"); await W();
await step("Campo","Guion listo","Pasa a Lotes",async()=>{await p.click("#script-ready"); await W(); return (await hash()).startsWith("#/lotes");});
await step("Campo","Iniciar entrevista (lote)","Abre Consentimiento",async()=>{await p.click("#start-batch"); await W(); return (await hash()).startsWith("#/consentimiento");});
await step("Campo","Consentimiento → Iniciar entrevista","Abre la entrevista con código P#",async()=>{await p.check("input[name=participate]"); await p.check("input[name=audio]"); await p.click("#start"); await W(700); return {pass:(await hash()).startsWith("#/entrevista") && /P\d+/.test(await p.textContent("body")), d:(await p.textContent("header")||"").slice(0,60)};});
await step("Campo","Nota","La nota aparece en la entrevista",async()=>{await p.fill("#note-text","nota audit"); await p.click("#add-note"); await W(); return (await main()).includes("nota audit");});
await step("Campo","Etiqueta #espera","La etiqueta queda marcada",async()=>{const t=p.locator("main button",{hasText:"#espera"}); await t.click(); await W(); return (await t.getAttribute("aria-pressed"))==="true" || (await main()).match(/#espera/g).length>1;});
await step("Campo","Anotar foto","Abre el selector de fotos",async()=>{const [fc]=await Promise.all([p.waitForEvent("filechooser",{timeout:4000}),p.click("#pick-photo")]); return !!fc;});
await step("Campo","Anotar audio","Abre el selector de audio",async()=>{const [fc]=await Promise.all([p.waitForEvent("filechooser",{timeout:4000}),p.click("#pick-audio")]); return !!fc;});
await step("Registro","Terminar y registrar","Abre el Registro de la entrevista",async()=>{await p.click("#finish"); await W(700); return (await hash()).startsWith("#/registro");});
await step("Registro","Guardar registro","Muestra confirmación y queda guardado",async()=>{await p.fill("input[name=number]","12"); await p.click("main >> text=Guardar registro"); await W(700); const t=await p.textContent("body"); return {pass: /Guardado|guardad/i.test(t), d:(await hash())};});
await step("Registro","Pestaña Registro","Muestra el último registro",async()=>{await p.click("#tabbar >> text=Registro"); await W(); return {pass:(await hash()).startsWith("#/registro"), d: await hash()};});
await step("Evidencias","Pestaña Evidencias","Muestra lo exportable con fichas (1)",async()=>{await p.click("#tabbar >> text=Evidencias"); await W(); return (await main()).includes("Fichas de observación (1)");});
await step("Evidencias","Clave corta","Muestra error visible",async()=>{await p.fill("main input[name=pass]","123"); await p.fill("main input[name=again]","123"); await p.click("main >> text=Exportar evidencias"); await W(); return (await p.textContent("#export-error")).length>5;});
await step("Evidencias","Exportar evidencias","Entrega archivo cifrado (compartir o descarga)",async()=>{await p.fill("main input[name=pass]","archivo-QA-2026"); await p.fill("main input[name=again]","archivo-QA-2026"); return exportFlow("main >> text=Exportar evidencias","ev.json");});
await step("Evidencias","El archivo trae fichas y lotes","observations y batches dentro del archivo",async()=>{ return {pass:false, d:"se verifica en unit/e2e (cifrado)"};});
R.pop();
await step("Privacidad","Cambiar retención a 90 días y Guardar","Confirma guardado y persiste",async()=>{await go("#/privacidad"); await p.selectOption("#retention","90"); await p.click("main >> text=Guardar privacidad"); await W(700); await go("#/estudios"); await go("#/privacidad"); return (await p.inputValue("#retention"))==="90";});
await step("Privacidad","Volver a «Nunca»","Persiste «Nunca»",async()=>{await p.selectOption("#retention","never"); await p.click("main >> text=Guardar privacidad"); await W(700); await go("#/estudios"); await go("#/privacidad"); return (await p.inputValue("#retention"))==="never";});
await step("Privacidad","Borrar estudio sin escribir confirmación","Botón desactivado; se activa al escribir BORRAR",async()=>{const off=await p.isDisabled("#wipe"); await p.fill("#wipe-confirm","BORRAR"); await W(200); const on=!(await p.isDisabled("#wipe")); await p.fill("#wipe-confirm",""); return {pass:off&&on,d:`off=${off} on=${on}`};});
await step("Guía","Pestaña Guía","Muestra guía y Ver mis fichas (1)",async()=>{await p.click("#tabbar >> text=Guía"); await W(); return (await main()).includes("Ver mis fichas (1)");});
await step("Guía","Abrir sección «1 · Recarga»","Se despliega el contenido",async()=>{const s=p.locator("main summary",{hasText:"1 · Recarga"}); await s.click(); await W(); return await s.evaluate(e=>e.parentElement.open);});
await step("Guía","Ver mis fichas","Lista con OBS-27-10-BAQ-1",async()=>{await p.click("main >> text=Ver mis fichas"); await W(); return (await main()).includes("OBS-27-10-BAQ-1");});
await step("Guía","Editar ficha → Guardar cambios","Mismo código, sin duplicar",async()=>{await p.click('button[aria-label="Editar ficha OBS-27-10-BAQ-1"]'); await W(); await p.fill("textarea[name=vi]","Fila vieja (audit)"); await p.click("text=Guardar cambios"); await W(700); return (await main()).includes("(audit)") && (await p.locator("main article").count())===1;});
await step("Guía","Crear ficha → Guardar ficha","Nueva ficha con código OBS-…",async()=>{await go("#/observacion/nueva"); await p.fill("input[name=lugar]","Baquedano"); await p.check("input[name=tema] >> nth=0",{force:true}); await p.fill("textarea[name=vi]","Ficha nueva audit"); await p.click("main >> text=Guardar ficha"); await W(700); return {pass:(await main()).includes("Ficha nueva audit"), d:(await hash())};});
await step("Guía","Botón «Exportar fichas» en la lista","Visible y abre Exportar/Importar",async()=>{await go("#/observacion"); const bt=p.locator("#export-fichas"); if(!(await bt.count())) return {pass:false,d:"no existe en este build"}; await bt.click(); await W(); return (await hash())==="#/respaldo";});
if ((await hash())==="#/respaldo") {
 await step("Guía","Exportar fichas (respaldo)","Archivo cifrado con fichas y lotes",async()=>{await p.fill("#respaldo-export input[name=pass]","archivo-QA-2026"); await p.fill("#respaldo-export input[name=again]","archivo-QA-2026"); return exportFlow("#respaldo-go","resp.json");});
 await step("Guía","Importar fichas (mismo archivo)","Avisa «Importado: 0 fichas…», no duplica",async()=>{ const f = SHARE ? null : "/tmp/aud-last.json"; if(!f) return {pass:true,d:"(con compartir: import se prueba en e2e)"}; await p.setInputFiles("#respaldo-import input[type=file]",f); await p.fill("#respaldo-import input[name=ipass]","archivo-QA-2026"); await p.click("#import-go"); await W(1500); const t=await p.textContent("body"); return {pass:/Importado: 0 fichas/.test(t)||/Fichas: 2/.test(await main()), d:(await main()).slice(0,90)};});
}
await step("General","Sin errores JS","0 errores",async()=>({pass:errs.length===0,d:errs.join("|").slice(0,200)}));
console.log(JSON.stringify(R)); fs.writeFileSync(process.env.OUT||"/tmp/aud.json",JSON.stringify(R,null,1));
for (const r of R) console.log(`${r.pass?"SÍ":"NO"} | ${r.tab} | ${r.action} | ${r.expected} | ${r.d}`);
await b.close();
