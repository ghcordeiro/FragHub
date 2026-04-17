# ADR-004: NavBar Mobile — CSS + Estado JS Mínimo

**Status:** Accepted
**Date:** 2026-04-17
**Feature:** frontend-refactor-stitch

## Contexto

A NavBar tem 4 links de navegação + 2 CTAs. Em viewports < 768px, esses elementos não cabem em uma linha. Opções:

1. **Esconder links, mostrar hamburguer** — estado JS (`isOpen: boolean`) controla visibilidade do menu. Simples, familiar para usuários.
2. **Scroll horizontal** — links ficam numa faixa scrollável. Ruim UX em mobile.
3. **Quebrar para 2 linhas** — logo + nav numa linha, CTAs noutra. Funcional mas ocupa muito espaço vertical.
4. **CSS-only hamburger** — checkbox hack. Sem acessibilidade de teclado/screen reader.

## Decisão

**Opção 1: hamburger com `useState` mínimo + CSS para animação.**

```tsx
const [menuOpen, setMenuOpen] = useState(false)
// ...
<button aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
  ☰
</button>
<nav className={menuOpen ? styles.menuOpen : styles.menuClosed}>
  {/* links */}
</nav>
```

CSS faz a animação (max-height transition). JS só mantém o boolean.

Fechamento automático: `useEffect` com listener `resize` fecha o menu ao expandir para desktop.

## Consequências

**Positivo:**
- Acessível: `aria-expanded`, `aria-label`, navegável por teclado
- CSS anima a transição (sem GSAP/framer-motion)
- Estado JS mínimo (1 boolean) — sem biblioteca de estado para isso

**Negativo:**
- Requires `useEffect` para fechar ao redimensionar
- Clicking fora não fecha (implementar `useClickOutside` hook se necessário — defer para v1.1)

**Breakpoint:** `768px` — alinhado com outros componentes responsivos do projeto.
