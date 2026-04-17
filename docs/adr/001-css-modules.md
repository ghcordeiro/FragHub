# ADR-001: CSS Modules como metodologia de estilos de componente

**Status:** Accepted
**Date:** 2026-04-17
**Feature:** frontend-refactor-stitch

## Contexto

O código atual usa inline styles (`style={{ ... }}`) em 100% dos componentes React. Isso torna impossível:
- Reutilizar estilos (violação de DRY)
- Aplicar pseudo-classes (`:hover`, `:focus`) sem JavaScript
- Garantir dark mode via CSS custom properties
- Escalar sem acoplamento estilo/lógica

Alternativas avaliadas:
1. **CSS Modules** — arquivos `.module.css` com estilos scoped automaticamente pelo Vite
2. **CSS-in-JS (styled-components / emotion)** — estilos em JavaScript, runtime overhead
3. **Tailwind CSS** — utility-first, proibido pela CONSTITUTION e pela NFR-001
4. **CSS global + BEM** — sem encapsulamento, colisões em SPAs grandes

## Decisão

**Usar CSS Modules.** Um arquivo `.module.css` por componente, importado como objeto de classes.

```tsx
import styles from './Button.module.css'
<button className={styles.primary}>...</button>
```

Estilos dinâmicos baseados em props usam `cx()` pattern ou template literals:
```tsx
<button className={`${styles.btn} ${styles[variant]}`}>...</button>
```

## Consequências

**Positivo:**
- Zero runtime overhead (Vite compila para CSS estático)
- Scoping automático — sem colisões de classe
- Suporte nativo a `:hover`, `@media`, `@keyframes`
- Compatível com CSS custom properties globais

**Negativo:**
- Dois arquivos por componente (`.tsx` + `.module.css`)
- Não permite props dinâmicas inline complexas (requer fallback para `style={}`)

**Regra de ouro:** inline styles `style={}` apenas para valores computados em runtime (ex: `width: ${progress}%`). Valores estáticos sempre em `.module.css`.
