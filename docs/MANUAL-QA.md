<!-- Viento Norte Manual QA v1.0.0 · 2026-07-20 · colectivo -->

# Manual QA — uxtools

**App:** Hub multi-herramienta UX (Vite + HTML legacy + PWA)  
**Repo:** https://github.com/vientonorte/uxtools  
**Prod (referencia):** https://vientonorte.github.io/uxtools/  
**Versión checklist:** 1.0.0 · 2026-07-20

---

## Enlaces rápidos / mapa de tools

| Tool | Entry |
|------|--------|
| Hub / index | `index.html` · `hub.html` |
| App principal | `app.html` · `src/pages/Dashboard.tsx` |
| Benchmark | `benchmark.html` · `src/pages/Benchmark.tsx` |
| Eisenhower | `eisenhower.html` |
| UX Flow | `uxflow.html` · `src/pages/UxFlow.tsx` |
| VOC | `voc.html` |
| IMSI | `imsi.html` |
| Admin | `admin.html` · `src/pages/Admin.tsx` |
| Medicinal | `src/pages/Medicinal/*` |
| Brief | `src/pages/Brief.tsx` |
| Self Radar | `app.html#/selfradar` · `src/pages/Selfradar.tsx` |
| Kit TLP | `app.html#/kit-tlp` · `src/pages/KitTlp.tsx` |

---

## A · Smoke hub (5 min) — **obligatorio**

- [ ] **A1** `index.html` / hub carga; lista o cards de tools visibles
- [ ] **A2** Cada link de tool en hub abre sin 404
- [ ] **A3** Console limpia de errores rojos en hub
- [ ] **A4** manifest + SW (si aplica) sin error de register
- [ ] **A5** Nav de regreso al hub desde al menos 2 tools

**Resultado A:** PASS / FAIL

---

## B · Por herramienta (12–20 min)

Marcar cada tool: **P** = pass, **F** = fail, **N** = N/A / no en build.

| ID | Tool | Carga | Acción core | Persistencia* | Notas |
|----|------|-------|-------------|---------------|-------|
| B1 | Dashboard / app | [ ] | [ ] | [ ] | |
| B2 | Benchmark | [ ] | [ ] | [ ] | |
| B3 | Eisenhower | [ ] | [ ] | [ ] | |
| B4 | UX Flow | [ ] | [ ] | [ ] | |
| B5 | VOC | [ ] | [ ] | [ ] | |
| B6 | IMSI | [ ] | [ ] | [ ] | |
| B7 | Admin | [ ] | [ ] | [ ] | |
| B8 | Medicinal | [ ] | [ ] | [ ] | FAQ / ID card |
| B9 | Brief | [ ] | [ ] | [ ] | |

\*Persistencia: reload mantiene estado local si la tool lo promete.

**Criterio acción core (ejemplos):**

- **Eisenhower:** crear ítem en cuadrante, mover, borrar  
- **Benchmark:** cargar/comparar set mínimo  
- **UX Flow:** crear nodo o paso y verlo en canvas  
- **VOC:** capturar o listar input de voz/cliente  
- **Medicinal:** abrir FAQ + artículo legal sin roto  
- **Admin:** login/guard o panel solo si hay auth local  

**Resultado B:** PASS / FAIL (fallan tools: _____)

---

## C · Datos locales / privacidad (5 min)

- [ ] **C1** Tools no envían PII a red sin acción explícita del usuario
- [ ] **C2** Clear site data → tools vuelven a estado inicial sin crash
- [ ] **C3** Export (si existe) descarga archivo usable
- [ ] **C4** LICENSE / aviso medicinal visible donde corresponda

**Resultado C:** PASS / FAIL / N/A

---

## D · PWA + Offline (8 min)

- [ ] **D1** SW registered
- [ ] **D2** Offline: hub o shell carga
- [ ] **D3** Al menos 1 tool usable offline o muestra empty-state claro
- [ ] **D4** Online de nuevo: sin corrupción de localStorage

**Resultado D:** PASS / FAIL / N/A

---

## E · Mobile (8 min)

- [ ] **E1** Hub usable en 390×844
- [ ] **E2** Tools con canvas/tablas: pinch/scroll no rompe UI crítica
- [ ] **E3** Botones touch ≥ ~44px en flujos primarios
- [ ] **E4** Landscape no tapa controles esenciales

**Resultado E:** PASS / FAIL

---

## F · Build dual HTML/Vite (5 min)

- [ ] **F1** Entry legacy (`.html`) y route Vite (si hay) no divergen en features críticas documentadas
- [ ] **F2** `npm run build` / Pages deploy sirve assets con paths correctos (no 404 de JS/CSS)

**Resultado F:** PASS / FAIL / N/A

---

## Z · A11y mínimo (5 min)

- [ ] **Z1** Hub: tab a cada card/link de tool
- [ ] **Z2** Focus visible
- [ ] **Z3** Modales (Medicinal EditModal, etc.): Escape cierra
- [ ] **Z4** Headings por tool razonables
- [ ] **Z5** Contraste spot en hub

**Resultado Z:** PASS / FAIL

---

## Go / No-Go

| Check | OK |
|-------|-----|
| Smoke hub A PASS | [ ] |
| Tools core del release en B PASS | [ ] |
| Offline D PASS o N/A | [ ] |
| Cero S0/S1 | [ ] |

**Decisión:** GO / GO condicional / NO-GO  
**Executor:** ___________ **Fecha:** ___________ **SHA:** ___________  
**Tools en scope del release:** ___________

---

## Protocolo colectivo (extracto)

Severidades: **S0** crash/security (bloquea) · **S1** feature crítica (bloquea) · **S2** UX material · **S3** cosmético.

Gate: Smoke A PASS + 0× S0/S1 = GO. Registrar sesión en issue/PR o archivo de log local.

A11y mínimo (sección Z): tab order, focus visible, Escape en modales, contraste spot, reduced-motion.

Fuente del paquete: workflow Viento Norte · Manual QA 1.0.0
