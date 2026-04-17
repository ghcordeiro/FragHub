# Plan — Frontend Refactor Stitch

**Feature:** `frontend-refactor-stitch`
**Status:** Plan
**Date:** 2026-04-17

---

## Duplication Hunter — Padrões existentes a extrair

Análise do código atual revelou os seguintes padrões repetidos que devem virar componentes atômicos reutilizáveis:

| Padrão duplicado | Ocorrências | Componente resultante |
|-----------------|-------------|----------------------|
| Error div `#ffebee / #c62828` inline | LoginPage, RegisterPage, LeaderboardPage, ProfilePage | `ErrorAlert` |
| Loading paragraph `<p>Carregando...</p>` | LeaderboardPage, ProfilePage, PublicProfilePage | `LoadingSpinner` |
| Button `#007bff` inline + disabled/opacity | LoginPage, RegisterPage, LeaderboardPage (clear), RankingTable (paginação) | `Button` (variant: primary, ghost, danger) |
| Label + Input div wrapper | LoginPage ×2, RegisterPage ×3 | `InputField` |
| `PlayerAvatar` fallback com `#e0e0e0` | PlayerAvatar.tsx (já existe, só precisa dark mode update) | atualizar `PlayerAvatar` |

---

## Arquitetura de Componentes

### Árvore completa pós-refactor

```
src/
├── components/
│   ├── ui/                          ← NOVO: componentes atômicos
│   │   ├── Button.tsx + Button.module.css
│   │   ├── InputField.tsx + InputField.module.css
│   │   ├── ErrorAlert.tsx + ErrorAlert.module.css
│   │   └── LoadingSpinner.tsx + LoadingSpinner.module.css
│   ├── Layout.tsx + Layout.module.css   ← NOVO: shell com NavBar
│   ├── NavBar.tsx + NavBar.module.css   ← NOVO
│   ├── LevelBadge.tsx + LevelBadge.module.css   ← REFACTOR
│   ├── PlayerAvatar.tsx + PlayerAvatar.module.css  ← REFACTOR
│   ├── RankingTable.tsx + RankingTable.module.css  ← REFACTOR
│   ├── AdminLayout.tsx (sem redesign)
│   └── ProtectedRoute.tsx (sem mudança)
│
├── pages/
│   ├── HomePage/
│   │   ├── HomePage.tsx              ← REFACTOR
│   │   ├── HomePage.module.css       ← NOVO
│   │   ├── HeroSection.tsx           ← NOVO
│   │   ├── StatsRow.tsx              ← NOVO
│   │   └── FeatureCards.tsx          ← NOVO
│   ├── LeaderboardPage/
│   │   ├── LeaderboardPage.tsx       ← REFACTOR
│   │   ├── LeaderboardPage.module.css ← NOVO
│   │   └── PodiumSection.tsx         ← NOVO
│   ├── LoginPage.tsx + LoginPage.module.css  ← REFACTOR
│   ├── RegisterPage.tsx + RegisterPage.module.css  ← REFACTOR
│   ├── ProfilePage.tsx + ProfilePage.module.css  ← REFACTOR
│   ├── PublicProfilePage.tsx + PublicProfilePage.module.css ← REFACTOR
│   ├── AuthCallbackPage.tsx (sem mudança)
│   └── admin/ (sem redesign)
│
├── index.css   ← SUBSTITUIÇÃO COMPLETA (design tokens)
├── App.tsx     ← LIMPEZA (remover boilerplate Vite)
└── App.css     ← REMOVER ou esvaziar
```

### Responsabilidades por componente

#### `Layout` + `NavBar`
- `Layout`: wrapper com `<NavBar>` + `<Outlet />` (React Router)
- `NavBar`: logo, nav links, auth actions (condicional via `useSession`)
- Glassmorphism: `backdrop-filter: blur(8px)`, `background: rgba(17,19,25,0.75)`
- Mobile: links colapsam em menu hamburger (estado JS, sem biblioteca)

#### Componentes atômicos (`ui/`)
- `Button`: `variant` prop (`primary` | `ghost` | `danger`), `size` prop (`sm` | `md`), `isLoading` prop
- `InputField`: `label`, `id`, `error`, todos os props nativos de `<input>`
- `ErrorAlert`: `message: string` — fundo `--error-container`, texto `--on-error`
- `LoadingSpinner`: CSS-only spinner animado com `--primary`

#### `LevelBadge` (refactor)
- Props mantidas: `level`, `size`
- Migrar de inline styles para CSS Module
- Glow via `box-shadow` em níveis 9-10

#### `PodiumSection` (novo)
- Props: `players: Player[]` (pega os 3 primeiros)
- Layout: #1 no centro (maior), #2 esquerda, #3 direita

---

## CSS Architecture

### Metodologia: CSS Modules + CSS Custom Properties

```
index.css          → design tokens globais (:root custom properties)
                     reset mínimo (box-sizing, margin 0)
                     tipografia base (font-family, font-size, color)

*.module.css       → estilos de componente (scoped via CSS Modules)
                     referenciam tokens via var(--token)
                     nunca hardcoded hex colors
```

### Regra de ouro para inline styles
Permitido **apenas** para valores dinâmicos que não podem ser expressos em CSS:
```tsx
// ✅ OK — valor computado em runtime
<div style={{ width: `${progress}%` }} />

// ❌ Proibido — valor estático que deveria ser token
<div style={{ backgroundColor: '#007bff' }} />
```

---

## ADRs Associados

| ID | Título | Arquivo |
|----|--------|---------|
| ADR-001 | CSS Modules como metodologia de estilos | `docs/adr/001-css-modules.md` |
| ADR-002 | CSS Custom Properties para design tokens | `docs/adr/002-css-custom-properties.md` |
| ADR-003 | Zero bibliotecas de UI | `docs/adr/003-zero-ui-libraries.md` |
| ADR-004 | NavBar mobile via CSS + state JS mínimo | `docs/adr/004-navbar-mobile.md` |

---

## C4 Diagrams

Ver `docs/architecture/frontend-refactor-context.md` (L1) e `docs/architecture/frontend-refactor-container.md` (L2).

---

## Plano de Execução — 7 Waves

### Wave 1 — Design Tokens Globais
**Arquivo:** `index.css`
**Ação:** Substituição completa. Remove boilerplate Vite, aplica 34+ CSS custom properties do Tactical Monolith.
**Também:** `index.html` — adicionar `<link>` Google Fonts.
**Gate:** `npm run build` verde.

### Wave 2 — Layout Shell + NavBar
**Arquivos novos:** `Layout.tsx`, `Layout.module.css`, `NavBar.tsx`, `NavBar.module.css`
**Atualizar:** `router.tsx` — envolver rotas públicas com `<Layout>`
**Também:** `App.tsx` limpeza, `App.css` esvaziar.
**Gate:** NavBar aparece em todas as rotas públicas, não aparece em `/admin`.

### Wave 3 — Componentes Atômicos UI
**Arquivos novos:** `ui/Button.tsx`, `ui/InputField.tsx`, `ui/ErrorAlert.tsx`, `ui/LoadingSpinner.tsx` + `.module.css` de cada
**Gate:** Componentes renderizam corretamente com storybook ou inspeção visual.

### Wave 4 — HomePage
**Arquivos:** `HomePage.tsx`, `HomePage.module.css`, `HeroSection.tsx`, `StatsRow.tsx`, `FeatureCards.tsx`
**Gate:** Hero + stats + cards renderizam. `npm run build` verde.

### Wave 5 — LeaderboardPage + Componentes Visuais
**Arquivos:** `LeaderboardPage.tsx`, `LeaderboardPage.module.css`, `PodiumSection.tsx`, `LevelBadge.tsx` (refactor), `LevelBadge.module.css`, `RankingTable.tsx` (refactor), `RankingTable.module.css`, `PlayerAvatar.tsx` (refactor), `PlayerAvatar.module.css`
**Gate:** Top-3 renderiza, tabela sem bordas, LevelBadge com glow em 9-10.

### Wave 6 — Auth Pages
**Arquivos:** `LoginPage.tsx`, `LoginPage.module.css`, `RegisterPage.tsx`, `RegisterPage.module.css`
**Usa:** `Button`, `InputField`, `ErrorAlert` da Wave 3.
**Gate:** Login e Register funcionam (fluxo preservado).

### Wave 7 — Profile Pages
**Arquivos:** `ProfilePage.tsx`, `ProfilePage.module.css`, `PublicProfilePage.tsx`, `PublicProfilePage.module.css`
**Gate:** Perfil carrega, nome editável funciona, match history exibe.

---

## Dependências entre Waves

```
Wave 1 (tokens) ──┬──> Wave 2 (layout)  ──┬──> Wave 4 (HomePage)
                  │                        │
                  └──> Wave 3 (ui/)   ─────┴──> Wave 5 (leaderboard)
                                           │
                                           ├──> Wave 6 (auth)
                                           │
                                           └──> Wave 7 (profiles)
```

Wave 1 → 2 → 3 devem ser executadas em sequência.
Waves 4, 5, 6, 7 podem ser executadas em qualquer ordem após Wave 3.

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Admin pages quebram com dark mode | Média | Testar `/admin/dashboard` após Wave 1 |
| CSS Modules conflitam com `index.css` global | Baixa | CSS Modules são scoped; tokens globais ficam em `:root` |
| `window.innerWidth` em RankingTable quebra SSR futuro | Baixa | Remover na Wave 5, usar media queries puras |
| Google Fonts não carregam offline | Baixa | Documentar — não bloqueia v1.0 |
