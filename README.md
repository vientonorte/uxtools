# UX Tools — SURA Investments

Suite de herramientas UX en producción para SURA Investments.

## Productos

| Producto | Descripción | URL |
|----------|-------------|-----|
| **UX Benchmark** | Análisis comparativo de experiencia de usuario para productos digitales | [benchmark.html](benchmark.html) |
| **UXFLOW** | Motor de documentación técnica UX automatizada: flujos, criterios de aceptación, tablas y assets para Figma | [uxflow.html](uxflow.html) |

## Estructura

```
index.html          → Dashboard / hub con tabs de productos
benchmark.html      → App: UX Benchmark (embed Figma)
uxflow.html         → App: UXFLOW Auto-Doc Engine
css/
  tokens.css        → Design tokens (variables, colores, tipografía)
  base.css          → Reset, grain overlay, scrollbar
  nav.css           → Navegación y footer compartidos
  dashboard.css     → Estilos del dashboard (index.html)
  benchmark.css     → Estilos de Benchmark (benchmark.html)
  uxflow.css        → Estilos de UXFLOW (uxflow.html)
js/
  dashboard.js      → Lógica de tabs del dashboard
  uxflow.js         → Motor de generación, clipboard, historial
```

## Deploy

El sitio se publica automáticamente con GitHub Pages desde la rama `main`:

**https://vientonorte.github.io/uxtools/**