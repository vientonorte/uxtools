# UX Tools — SURA Investments

Suite de herramientas UX en producción para SURA Investments.

## Productos

| Producto | Descripción | URL |
|----------|-------------|-----|
| **UX Benchmark** | Análisis comparativo de experiencia de usuario para productos digitales | [benchmark.html](https://vientonorte.github.io/uxtools/benchmark.html) |
| **UXFLOW** | Motor de documentación técnica UX automatizada: flujos, criterios de aceptación, tablas y assets para Figma | [uxflow.html](https://vientonorte.github.io/uxtools/uxflow.html) |
| **Operating Model DX** | Pipeline de priorización ejecutiva con Matriz Eisenhower: consolida señales desde Jira, Miro, Figma y Teams en decisiones priorizadas mediante scoring automático | [eisenhower.html](https://vientonorte.github.io/uxtools/eisenhower.html) |
| **RF Recon Console** | Blueprint UX para operación SIGINT (tipo IMSI catcher): arquitectura de información en 4 fases, dashboard táctico de 3 paneles y reglas de UX crítica. **Prototipo de interfaz con datos simulados** — no controla hardware ni captura radiofrecuencia | [imsi.html](https://vientonorte.github.io/uxtools/imsi.html) |

## Preview

### UX Benchmark — en producción

[![UX Benchmark en producción](https://github.com/user-attachments/assets/93be08b4-e1d4-4920-8360-8740bdd4c404)](https://vientonorte.github.io/uxtools/benchmark.html)

## Estructura

```
index.html          → Dashboard / hub con tabs de productos
benchmark.html      → App: UX Benchmark (embed Figma)
uxflow.html         → App: UXFLOW Auto-Doc Engine
eisenhower.html     → App: Operating Model DX (Eisenhower Matrix)
imsi.html           → App: RF Recon Console (módulos fuente, blueprint UX SIGINT)
voc.html            → App: Mapa VOC con bitácora local y archivos adjuntos
                      (fotos/capturas comprimidas en el cliente, solo localStorage)
public/
  imsi.html         → Build autocontenido de RF Recon Console que sirve GitHub
                      Pages (Vite copia public/ al dist). Generado, no editar a mano.
  voc.html          → Build autocontenido de Mapa VOC
.github/workflows/
  ci.yml            → Validación automática para PRs y main
  deploy.yml        → Deploy formal a GitHub Pages mediante artifact
scripts/
  validate-static.js → Smoke check de HTML, assets y sintaxis JS
  build-imsi.cjs     → Inyecta css/ + js/imsi.js en public/imsi.html (artefacto desplegable)
css/
  tokens.css        → Design tokens (variables, colores, tipografía)
  base.css          → Reset, grain overlay, scrollbar
  nav.css           → Navegación y footer compartidos
  dashboard.css     → Estilos del dashboard (index.html)
  benchmark.css     → Estilos de Benchmark (benchmark.html)
  uxflow.css        → Estilos de UXFLOW (uxflow.html)
  eisenhower.css    → Estilos de Operating Model DX (eisenhower.html)
  imsi.css          → Estilos de RF Recon Console (imsi.html) — tema táctico oscuro
js/
  dashboard.js      → KPIs, actividad y búsqueda del dashboard
  benchmark.js      → App benchmark: evaluación, notas, resultados, screenshots
  admin.js          → Content manager: dimensiones, sesiones y export
  uxflow.js         → Motor de generación, clipboard, historial
  eisenhower.js     → Motor de scoring, clasificación Eisenhower y gestión de fricciones
  imsi.js           → Simulación de capturas, waterfall/heatmap, hold-to-trigger, export forense
```

## Deploy

El sitio se publica automáticamente con GitHub Pages desde `main` mediante GitHub Actions:

- `CI` valida referencias HTML y sintaxis JS en cada PR y push
- `Deploy to GitHub Pages` genera un artifact y publica solo si la validación pasa

**https://vientonorte.github.io/uxtools/**

## Revisión técnica reciente

- [Revisión por módulo (2026-05-18)](docs/revision-modulos-2026-05-18.md)
