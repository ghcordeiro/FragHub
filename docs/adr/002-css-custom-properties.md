# ADR-002: CSS Custom Properties para Design Tokens

**Status:** Accepted
**Date:** 2026-04-17
**Feature:** frontend-refactor-stitch

## Contexto

O design system Tactical Monolith (Stitch) define 34+ tokens de cor, 2 famílias de fontes, escala de espaçamento e raios de borda. Esses valores precisam ser acessíveis em todos os componentes do `fraghub-web`.

Alternativas:
1. **CSS Custom Properties** (`--var: value` em `:root`) — nativo, zero runtime, funciona em qualquer arquivo `.css` ou `.module.css`
2. **JS Theme Object** (ex: `theme.colors.primary`) — requer Context API ou store, overhead de re-renders
3. **SCSS Variables** (`$primary: #adc6ff`) — requer preprocessador, não atualiza dinamicamente
4. **Hardcoded hex em cada componente** — estado atual, inaceitável para design system

## Decisão

**Usar CSS Custom Properties em `index.css` (`:root`).** Todos os tokens do Tactical Monolith são definidos como CSS custom properties acessíveis globalmente.

```css
/* index.css */
:root {
  --primary: #adc6ff;
  --primary-container: #4d8eff;
  --surface: #111319;
  /* ... */
}
```

Referenciados em qualquer `.module.css`:
```css
/* Button.module.css */
.primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-container));
}
```

## Consequências

**Positivo:**
- Zero runtime JavaScript — puro CSS
- Atualizável por media query (`prefers-color-scheme`) sem JS
- DevTools inspeciona valores em tempo real
- Compartilhado entre CSS Modules sem imports adicionais

**Negativo:**
- Não é type-safe (não há autocompletar de tokens em `.module.css` sem plugin de IDE)
- Nomes de variáveis devem ser mantidos manualmente consistentes

**Convenção de nomes:** kebab-case prefixado por categoria (`--surface-*`, `--on-surface-*`, `--primary-*`, etc.) seguindo Material Design 3 naming convention (base do Stitch).
