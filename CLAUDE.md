# CLAUDE.md — `vientonorte/uxtools`

## Project
UXFLOW / uxtools — UX Auto-Doc Engine para SURA Investments.
Live: https://vientonorte.github.io/uxtools/
Owner: Rö (Rodrigo Gaete Gaona)

## Tech stack
- Vanilla JS (sin framework)
- HTML5
- CSS3 (sin preprocesador)
- localStorage para historial
- Clipboard API para export Figma
- GitHub Pages para deploy

## Architectural decisions
1. **No frameworks** — el proyecto es ligero, sin build step.
2. **localStorage como fuente de verdad** del historial. No migrar a IndexedDB salvo necesidad probada.
3. **Client-side only** — GitHub Pages no soporta backend.
4. **Sin dependencias externas en runtime** — todo el código se sirve desde el repo.

## Design tokens (SURA)
```css
:root {
  --color-primary: #001A72;    /* navy */
  --color-accent: #00B5E2;     /* cyan */
  --color-text: #001A72;
  --color-text-secondary: #4A5568;
  --color-bg: #FFFFFF;
  --color-bg-alt: #F7FAFC;
  --color-border: #E2E8F0;

  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'DM Mono', 'Menlo', monospace;

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
}
```

## Conventions
- **HTML**: semántico (header, main, nav, section, article). ARIA solo cuando HTML no alcance.
- **CSS**: BEM-style nomenclature (`.block__element--modifier`).
- **JS**: módulos en archivos separados; sin minify manual.
- **Naming**: kebab-case en archivos, camelCase en variables JS.
- **Commits**: convencionales (`feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `test:`).

## Compatibility
- Soportar últimas 2 versiones estables de Chrome, Firefox, Safari, Edge.
- No usar features sin soporte cross-browser confirmado.

## Accessibility (WCAG 2.2 AA mínimo)
- Foco visible en todos los interactivos.
- Targets táctiles ≥24×24 px.
- Contraste texto ≥4.5:1.
- Navegación completa por teclado.
- Lectores pantalla: NVDA + VoiceOver testeados.

## Privacy
- No trackers ni analytics que comprometan privacidad.
- localStorage solo en cliente del usuario.
- Sin telemetría a servidores externos.

## Common commands
```bash
# Servir localmente
python3 -m http.server 8000
# o
npx serve .

# Deploy (push a main → GitHub Pages)
git push origin main

# Verificar deploy
curl -I https://vientonorte.github.io/uxtools/
```

## Known gotchas
- Clipboard API requiere HTTPS o localhost; en `file://` no funciona.
- localStorage limit ~5–10MB según navegador.
- GitHub Pages cachea agresivo; cambios pueden tardar minutos en propagar.

## Do NOT
- Agregar frameworks (React, Vue, Svelte).
- Introducir build step (Vite, Webpack, Rollup).
- Romper retrocompatibilidad de exports antiguos guardados en localStorage.
- Agregar trackers ni analytics.
- Usar tipografías externas más allá de Space Grotesk + DM Mono.

## Definition of Done para cualquier feature
- [ ] WCAG 2.2 AA auditado
- [ ] Funciona en últimas 2 versiones Chrome/Firefox/Safari/Edge
- [ ] Sin regresiones en exports legacy
- [ ] README actualizado
- [ ] Changelog actualizado
- [ ] Deploy verificado en producción
