# Frontend Refactor — Stitch Design System

**Feature slug:** `frontend-refactor-stitch`
**Status:** Specify
**Date:** 2026-04-17
**Author:** Guilherme Cordeiro

---

## System Process Context

### O que é o sistema

FragHub é um portal web de comunidade competitiva para CS2/CS:GO. O frontend (`fraghub-web`) é uma SPA React servida por Nginx que expõe: página pública de entrada (HomePage), leaderboard global por ELO, perfis de jogadores, autenticação (login/registro/OAuth), e painel admin.

### Estado atual

O frontend foi gerado funcionalmente (React 18 + TypeScript + Vite + Zustand + React Router v6) mas **sem design**: todas as páginas usam inline styles com light-mode, sem CSS variables, sem layout shell, sem nav. O `App.tsx` é ainda o boilerplate Vite; o `main.tsx` já usa `RouterProvider` corretamente.

### O que este refactor faz

Aplica o design system **"Tactical Monolith"** — gerado no Stitch (projeto `10481525408153955016`, "FragHub Matchmaking Portal") — em todo o fraghub-web. O resultado é um portal dark-mode com identidade visual coesa: obsidian backgrounds, electric blue primary, Space Grotesk + Inter, sem bordas explícitas (separação por tonalidade), glassmorphism na nav.

### Fluxo impactado

```
Usuário → NavBar (glassmorphism) → HomePage (hero + stats + cards)
                                 → /leaderboard (top-3 + tabela rankeada)
                                 → /login / /register
                                 → /players/me  /players/:id
                                 → /admin/* (tokens herdados, sem redesign)
```

### Scope boundary

- **IN:** design system tokens, layout shell, todas as páginas públicas + auth, componentes visuais
- **OUT:** lógica de negócio, chamadas de API, state management (Zustand), Admin panel redesign

---

## Requisitos Funcionais

### FR-001 — Design Tokens Globais

**O quê:** `index.css` redefinido com todos os CSS custom properties do Tactical Monolith.

**Tokens obrigatórios:**

| Grupo | Variáveis |
|-------|-----------|
| Superfícies | `--surface`, `--surface-dim`, `--surface-container-low`, `--surface-container`, `--surface-container-high`, `--surface-container-highest`, `--surface-bright` |
| Primary | `--primary`, `--primary-container`, `--on-primary`, `--on-primary-container` |
| Secondary | `--secondary`, `--secondary-container`, `--on-secondary` |
| Tertiary | `--tertiary`, `--tertiary-container`, `--on-tertiary` |
| Error | `--error`, `--error-container`, `--on-error` |
| On-surface | `--on-surface`, `--on-surface-variant` |
| Outline | `--outline`, `--outline-variant` |
| Background | `--background`, `--on-background` |
| Elevation | `--shadow-glow` (primary tinted, 40px blur, 4% opacity) |
| Radius | `--radius-sm` (2px), `--radius-md` (4px), `--radius-lg` (8px) |
| Spacing | `--sp-xs` (4px), `--sp-sm` (8px), `--sp-md` (16px), `--sp-lg` (24px), `--sp-xl` (32px), `--sp-2xl` (48px) |
| Typography | `--font-display` (Space Grotesk), `--font-body` (Inter) |

**Valores (Tactical Monolith dark):**
```
--surface: #111319
--surface-dim: #111319
--surface-container-low: #191b22
--surface-container: #1e1f26
--surface-container-high: #282a30
--surface-container-highest: #33343b
--surface-bright: #373940
--primary: #adc6ff
--primary-container: #4d8eff
--on-primary: #002e6a
--on-primary-container: #00285d
--secondary: #b1c6f9
--secondary-container: #304671
--on-secondary: #182f59
--tertiary: #ffb786
--tertiary-container: #df7412
--on-tertiary: #502400
--error: #ffb4ab
--error-container: #93000a
--on-error: #690005
--on-surface: #e2e2eb
--on-surface-variant: #c2c6d6
--outline: #8c909f
--outline-variant: #424754
--background: #111319
--on-background: #e2e2eb
```

**AC-001.1:** Build compila sem erros após substituição do `index.css`.
**AC-001.2:** Todas as variáveis listadas estão definidas em `:root`.
**AC-001.3:** `body` tem `background: var(--background)` e `color: var(--on-surface)`.

---

### FR-002 — Google Fonts

**O quê:** Space Grotesk e Inter carregados via `<link>` no `index.html`.

**Pesos obrigatórios:**
- Space Grotesk: 400, 500, 600, 700
- Inter: 400, 500, 600

**AC-002.1:** Fonts carregam em produção (build estático, Nginx).
**AC-002.2:** `--font-display: 'Space Grotesk', sans-serif` e `--font-body: 'Inter', sans-serif` definidos em `:root`.
**AC-002.3:** `font-display: swap` no `@font-face` (ou via parâmetro da Google Fonts URL).

---

### FR-003 — Layout Shell com NavBar

**O quê:** Novo componente `Layout.tsx` que envolve todas as rotas públicas com uma NavBar persistente. O `router.tsx` é atualizado para usar `Layout` como elemento raiz nas rotas públicas.

**NavBar — estrutura:**
- Left: Logo `FRAGHUB` (Space Grotesk Bold, `--primary`)
- Center: links `LEADERBOARD`, `MATCHES`, `SERVERS`, `NEWS`
- Right: botão `LOGIN` (ghost) + botão `JOIN QUEUE` (gradient primary) — ou avatar do usuário quando logado

**AC-003.1:** NavBar aparece em `/`, `/leaderboard`, `/login`, `/register`, `/players/*`.
**AC-003.2:** NavBar NÃO aparece em `/admin/*` (AdminLayout já tem seu próprio nav).
**AC-003.3:** Link ativo recebe estilo destacado (`--primary` color).
**AC-003.4:** NavBar tem `position: sticky; top: 0; z-index: 100`.

---

### FR-004 — NavBar Glassmorphism

**O quê:** NavBar usa glassmorphism para integração visual com o fundo.

**Estilo obrigatório:**
```css
background: rgba(17, 19, 25, 0.75);  /* --surface a 75% */
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px);
border-bottom: 1px solid rgba(66, 71, 84, 0.3);  /* outline-variant a 30% */
```

**AC-004.1:** NavBar é semi-transparente sobre o hero da HomePage.
**AC-004.2:** `backdrop-filter` aplicado (sem fallback sólido necessário em v1.0).

---

### FR-005 — HomePage: Hero Section

**O quê:** Seção hero fullwidth com headline, subtitle e 2 CTAs.

**Conteúdo:**
- Headline: "Compete. Rank Up. Dominate." (Space Grotesk Bold, 3.5rem)
- Subtitle: "The all-in-one matchmaking hub for CS2/CS:GO community servers." (Inter, 1.125rem, `--on-surface-variant`)
- CTA primário: "Get Started" → `/register` (gradiente `--primary` → `--primary-container`)
- CTA secundário: "View Leaderboard" → `/leaderboard` (ghost, outline-variant a 20%)
- Background: `--surface-container-low` com gradiente sutil ou imagem de fundo (opcional)

**AC-005.1:** Hero ocupa pelo menos `min-height: 60vh`.
**AC-005.2:** CTAs navegam para as rotas corretas.
**AC-005.3:** Headline usa `--font-display`.
**AC-005.4:** Layout responsivo: em mobile (< 768px) CTAs empilham verticalmente.

---

### FR-006 — HomePage: Stats Row

**O quê:** Faixa horizontal com 3 stat blocks abaixo do hero.

**Stats (valores mock até API real):**
- "1,247 Players Registered"
- "8,392 Matches Played"
- "24 Active Servers"

**Estilo:** fundo `--surface-container`, label `--on-surface-variant` (label-sm, all-caps), valor `--primary` (Space Grotesk, 2rem).

**AC-006.1:** 3 stats exibidos em row (flex ou grid).
**AC-006.2:** Em mobile empilham em coluna.
**AC-006.3:** Valores em `--font-display`.

---

### FR-007 — HomePage: Feature Cards

**O quê:** Grid de 4 cards descrevendo as principais features do FragHub.

**Cards:**
1. **ELO System** — "Glicko-2 based ranking with 10 skill levels" + ícone
2. **Matchmaking** — "5v5 balanced queue with map veto" + ícone
3. **In-Game Tags** — "Real-time CS2/CS:GO level tags via plugin" + ícone
4. **Admin Panel** — "Full server management and audit trail" + ícone

**Estilo:** fundo `--surface-container-low`, sem bordas, hover → `--surface-container-high`, `--radius-md`, espaçamento generoso.

**AC-007.1:** 4 cards em grid (2×2 em desktop, 1×4 em mobile).
**AC-007.2:** Hover aplica `--surface-container-high` como background.
**AC-007.3:** Nenhum card usa border explícita para separação.

---

### FR-008 — LeaderboardPage: Top-3 Destaque

**O quê:** Seção acima da tabela com 3 player cards maiores para as posições #1, #2, #3.

**Cada card contém:**
- Avatar circular grande (64px+)
- Username (Space Grotesk Bold)
- LevelBadge (tamanho `lg`)
- 3 stat blocks: ELO Rating, K/D Ratio, Win Rate

**Layout:** #1 centralizado e maior, #2 à esquerda, #3 à direita (podium style).

**AC-008.1:** Top-3 só renderiza quando `players.length >= 3`.
**AC-008.2:** Posição #1 tem destaque visual (tamanho maior ou badge especial).
**AC-008.3:** Cards usam `--surface-container-low` como fundo.

---

### FR-009 — LeaderboardPage: Tabela Stitch

**O quê:** RankingTable redesenhada seguindo o padrão Stitch.

**Colunas:** Rank, Avatar+Nome, Level, ELO, W/L, Win%, K/D

**Estilo:**
- Header: `--on-surface-variant`, label-sm all-caps, sem border-bottom (tonal shift)
- Rows: alternar entre `--surface` e `--surface-container-low`
- Row atual usuário: `--secondary-container` + accent vertical esquerdo `--primary` (2px)
- Sem borders horizontais entre linhas

**AC-009.1:** Nenhum `border` explícito nas linhas da tabela (usar background alternado).
**AC-009.2:** Row do usuário logado tem destaque visual (`--secondary-container`).
**AC-009.3:** Colunas K/D e W/L ocultam em `< 768px`.

---

### FR-010 — LeaderboardPage: Filtros e Paginação

**O quê:** Filtros de Jogo e Período estilizados com design system. Paginação com chevrons.

**Filtros:** `<select>` com `--surface-container` background, sem border explícita, `--on-surface` text.
**Paginação:** botões numerados + prev/next com chevron icons; ativo em `--primary-container`.

**AC-010.1:** Selects não têm `border: 1px solid` com cor light-mode.
**AC-010.2:** Botão de página ativa tem `background: var(--primary-container)`.
**AC-010.3:** Prev/Next desabilitados têm `opacity: 0.4`.

---

### FR-011 — LevelBadge Redesign

**O quê:** LevelBadge atualizado com paleta Stitch e glow para níveis altos.

**Mapeamento de cores:**
| Nível | Cor | Glow |
|-------|-----|------|
| 1-2 | `--outline` (#8c909f) | Não |
| 3-5 | `--tertiary-container` (#df7412) | Não |
| 6-8 | `--primary` (#adc6ff) | Não |
| 9-10 | `--error` (#ffb4ab) | Sim — `box-shadow: 0 0 12px rgba(255,180,171,0.5)` |

**AC-011.1:** Nível 9 e 10 têm glow externo visível.
**AC-011.2:** Badge não usa inline styles — usa CSS variables.
**AC-011.3:** Contraste mínimo WCAG AA em todas as combinações.

---

### FR-012 — RankingTable Redesign

**O quê:** RankingTable usa design system sem inline styles.

**AC-012.1:** Zero inline styles em `RankingTable.tsx`.
**AC-012.2:** `window.innerWidth` removido — responsividade via CSS media queries.
**AC-012.3:** Links de jogadores usam `--primary` color.

---

### FR-013 — LoginPage Styled

**O quê:** Página de login com card centralizado estilizado com design system.

**Layout:** card `--surface-container-low`, campos de input `--surface-container`, botão primary gradient, link para registro.

**AC-013.1:** Background da página é `--background`.
**AC-013.2:** Card usa `--surface-container-low` sem border explícita.
**AC-013.3:** Zero inline styles.

---

### FR-014 — RegisterPage Styled

**O quê:** Mesma abordagem que LoginPage.

**AC-014.1:** Consistente visualmente com LoginPage.
**AC-014.2:** Zero inline styles.

---

### FR-015 — ProfilePage Styled

**O quê:** Perfil privado do jogador (`/players/me`) com design system.

**Seções:** header com avatar + username + LevelBadge, stats grid, match history.

**AC-015.1:** Usa `--surface-container-low` para seções.
**AC-015.2:** Zero inline styles.
**AC-015.3:** LevelBadge atualizado renderiza corretamente.

---

### FR-016 — PublicProfilePage Styled

**O quê:** Perfil público (`/players/:id`) com design system.

**AC-016.1:** Consistente com ProfilePage.
**AC-016.2:** Zero inline styles.

---

### FR-017 — Limpeza App.tsx / App.css

**O quê:** `App.tsx` deixa de ser o boilerplate Vite. `App.css` é limpo ou removido.

**AC-017.1:** `App.tsx` não tem mais referências a `reactLogo`, `viteLogo`, `heroImg` do boilerplate.
**AC-017.2:** `App.css` não tem estilos do boilerplate Vite.
**AC-017.3:** Build continua verde após limpeza.

---

### FR-018 — Admin Pages — Tokens Herdados

**O quê:** As páginas admin (`/admin/*`) herdam automaticamente os tokens CSS sem redesign visual.

**AC-018.1:** Admin pages não quebram após substituição do `index.css`.
**AC-018.2:** Textos e backgrounds admin são legíveis com o dark mode.

---

## Requisitos Não-Funcionais

### NFR-001 — Zero UI Libraries

Proibido: Tailwind CSS, MUI, Shadcn, Chakra, Ant Design, Bootstrap.
Permitido: CSS Modules (`.module.css`), CSS custom properties globais (`index.css`), inline styles **somente** para valores dinâmicos (ex: `width: ${level * 10}%`).

### NFR-002 — CSS Methodology

CSS Modules para estilos de componente (`.module.css`). Global tokens em `index.css`. Nenhum CSS-in-JS (styled-components, emotion).

### NFR-003 — TypeScript Strict

`tsconfig.json` com `"strict": true` mantido. Nenhum `any` novo introduzido.

### NFR-004 — Build Verde

`npm run build` deve passar sem erros e sem warnings novos.

### NFR-005 — Lint Verde

`npm run lint` deve passar sem erros novos.

### NFR-006 — WCAG 2.1 AA

Contraste mínimo 4.5:1 para texto normal, 3:1 para texto large/UI components. Verificado com DevTools ou axe.

### NFR-007 — Meta Tags

HomePage e LeaderboardPage têm `<title>` e `<meta og:*>` apropriados.

### NFR-008 — Mobile Responsivo

Layout funciona em viewports ≥ 375px. NavBar colapsa em menu hamburger ou esconde links em mobile.

### NFR-009 — Zero Regressão Funcional

Auth flows, chamadas de API, Zustand store, React Router — comportamento inalterado. Apenas presentation layer muda.

---

## Fora de Escopo

- Redesign do Admin panel (além de herdar tokens)
- Novas features (matchmaking UI, match history detalhada)
- Dark/light mode toggle
- Animações complexas / GSAP
- i18n
- Testes unitários (serão adicionados em fase separada)
