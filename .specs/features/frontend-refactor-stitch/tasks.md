# Tasks — Frontend Refactor Stitch

**Feature:** `frontend-refactor-stitch`
**Date:** 2026-04-17

---

## Gates SDD

| Gate | Status | Aprovador | Data |
|------|--------|-----------|------|
| Specify | ✅ Aprovado | Utilizador | 2026-04-17 |
| Plan | ✅ Aprovado | Utilizador | 2026-04-17 |
| Tasks | ⏳ Aguardando confirmação formal | — | — |
| Implement | 🔒 Bloqueado até Tasks aprovado | — | — |
| Validate | 🔒 Bloqueado | — | — |

---

## Estrutura TDAD

Cada wave tem um par T/I: o T define os critérios de verificação (build gate + AC checklist), o I executa a implementação. O T é executado **após** o I para fechar o wave.

> **Nota:** Testes unitários estão fora de escopo desta feature (spec FR-OUT). Os "T" tasks são gates de build/lint/inspeção visual.

---

## Wave 1 — Design Tokens + Fonts + Limpeza App

### T-01 — Verificar tokens globais, fonts e limpeza App.tsx

**What:** Gate de build + inspeção do `index.css` e `App.tsx`.

**Where:** `fraghub-web/src/index.css`, `fraghub-web/index.html`, `fraghub-web/src/App.tsx`, `fraghub-web/src/App.css`

**Done-when:**
- [ ] `npm run build` passa sem erros (AC-001.1, AC-017.3, NFR-004)
- [ ] `npm run lint` passa sem novos erros (NFR-005)
- [ ] Todas as 34+ CSS vars do spec FR-001 estão em `:root` de `index.css` (AC-001.2)
- [ ] `body { background: var(--background); color: var(--on-surface); }` presente (AC-001.3)
- [ ] `index.html` tem `<link>` Google Fonts com Space Grotesk (400,500,600,700) e Inter (400,500,600) com `display=swap` (AC-002.1, AC-002.2, AC-002.3)
- [ ] `App.tsx` sem referências a `reactLogo`, `viteLogo`, `heroImg` (AC-017.1)
- [ ] `App.css` sem estilos do boilerplate Vite (AC-017.2)

---

### I-01 — Implementar tokens globais, fonts e limpeza App.tsx

**What:** Substituir `index.css` com os 34+ tokens Tactical Monolith. Adicionar Google Fonts no `index.html`. Limpar `App.tsx` e `App.css`.

**Where:** `fraghub-web/src/index.css`, `fraghub-web/index.html`, `fraghub-web/src/App.tsx`, `fraghub-web/src/App.css`

**Done-when:**
- [ ] `index.css` substituído com todos os tokens de FR-001 (valores exatos do spec)
- [ ] `<link>` Google Fonts adicionado no `<head>` do `index.html`
- [ ] `App.tsx` limpo do boilerplate Vite (sem logos, sem contador de cliques)
- [ ] `App.css` esvaziado ou removido
- [ ] Wave 1 gate: T-01 executado e todos os checks passando

**Dependências:** nenhuma

---

## Wave 2 — Layout Shell + NavBar

### T-02 — Verificar Layout e NavBar

**What:** Inspeção visual da NavBar em rotas públicas e ausência em `/admin`.

**Where:** `fraghub-web/src/components/Layout.tsx`, `fraghub-web/src/components/NavBar.tsx`, `fraghub-web/src/router.tsx`

**Done-when:**
- [ ] NavBar visível em `/`, `/leaderboard`, `/login`, `/register`, `/players/*` (AC-003.1)
- [ ] NavBar ausente em `/admin/*` — AdminLayout não impactado (AC-003.2)
- [ ] Link ativo tem cor `var(--primary)` (AC-003.3)
- [ ] NavBar tem `position: sticky; top: 0; z-index: 100` no CSS (AC-003.4)
- [ ] Background glassmorphism: `rgba(17,19,25,0.75)` + `backdrop-filter: blur(8px)` (AC-004.1, AC-004.2)
- [ ] `npm run build` verde (NFR-004)

---

### I-02 — Criar Layout.tsx, NavBar.tsx e atualizar router.tsx

**What:** Criar componentes de layout shell. Envolver rotas públicas com `<Layout>` no router.

**Where:** `fraghub-web/src/components/Layout.tsx`, `Layout.module.css`, `NavBar.tsx`, `NavBar.module.css`, `fraghub-web/src/router.tsx`

**Done-when:**
- [ ] `Layout.tsx` criado — wrapper com `<NavBar>` + `<Outlet />`
- [ ] `NavBar.tsx` criado — logo FRAGHUB (left), links nav (center), LOGIN + JOIN QUEUE (right)
- [ ] Estado de menu hamburger mobile: links colapsam em viewport < 768px (NFR-008)
- [ ] `router.tsx` atualizado para usar `<Layout>` nas rotas públicas, sem alterar `/admin`
- [ ] Zero inline styles estáticos nos novos componentes (NFR-001, NFR-002)
- [ ] Wave 2 gate: T-02 executado e todos os checks passando

**Dependências:** I-01 (tokens disponíveis)

---

## Wave 3 — Componentes Atômicos UI

### T-03 — Verificar componentes atômicos

**What:** Inspeção de TypeScript e build para os 4 componentes atômicos.

**Where:** `fraghub-web/src/components/ui/`

**Done-when:**
- [ ] `Button` aceita props `variant: 'primary' | 'ghost' | 'danger'`, `size: 'sm' | 'md'`, `isLoading: boolean` — sem `any` (NFR-003)
- [ ] `InputField` aceita `label`, `id`, `error` + todos os props nativos de `<input>` via spread (NFR-003)
- [ ] `ErrorAlert` renderiza com `--error-container` background e `--on-error` texto
- [ ] `LoadingSpinner` usa CSS animation com `var(--primary)` — zero JS para animação
- [ ] Nenhum componente tem inline styles estáticos (NFR-001)
- [ ] `npm run build` e `npm run lint` verdes (NFR-004, NFR-005)

---

### I-03 — Criar componentes atômicos ui/

**What:** Criar os 4 componentes atômicos reutilizáveis com CSS Modules.

**Where:** `fraghub-web/src/components/ui/Button.tsx`, `Button.module.css`, `InputField.tsx`, `InputField.module.css`, `ErrorAlert.tsx`, `ErrorAlert.module.css`, `LoadingSpinner.tsx`, `LoadingSpinner.module.css`

**Done-when:**
- [ ] `Button.tsx` com variantes primary (gradient), ghost (outline-variant), danger (error-container)
- [ ] `InputField.tsx` com label, input e mensagem de erro — campo em `--surface-container`
- [ ] `ErrorAlert.tsx` — fundo `--error-container`, texto `--on-error`
- [ ] `LoadingSpinner.tsx` — CSS-only spinner com `--primary`
- [ ] Todos os estilos em `.module.css` — referenciando tokens via `var(--token)`
- [ ] Wave 3 gate: T-03 executado e todos os checks passando

**Dependências:** I-01 (tokens), I-02 (opcional — Layout não bloqueia atoms)

---

## Wave 4 — HomePage

### T-04 — Verificar HomePage

**What:** Inspeção visual e build da HomePage com hero, stats e feature cards.

**Where:** `fraghub-web/src/pages/HomePage/`

**Done-when:**
- [ ] Hero ocupa `min-height: 60vh` (AC-005.1)
- [ ] CTAs "Get Started" → `/register` e "View Leaderboard" → `/leaderboard` (AC-005.2)
- [ ] Headline usa `var(--font-display)` (AC-005.3)
- [ ] Em mobile (< 768px) CTAs empilham verticalmente (AC-005.4)
- [ ] 3 stats exibidos em row (flex/grid); em mobile em coluna (AC-006.1, AC-006.2)
- [ ] Valores stat em `--font-display` (AC-006.3)
- [ ] 4 cards em grid 2×2 (desktop) e 1×4 (mobile) (AC-007.1)
- [ ] Hover aplica `--surface-container-high` (AC-007.2)
- [ ] Nenhum card tem `border` explícita (AC-007.3)
- [ ] `npm run build` verde (NFR-004)

---

### I-04 — Implementar HomePage com HeroSection, StatsRow, FeatureCards

**What:** Refatorar `HomePage.tsx` e criar sub-componentes.

**Where:** `fraghub-web/src/pages/HomePage/HomePage.tsx`, `HomePage.module.css`, `HeroSection.tsx`, `StatsRow.tsx`, `FeatureCards.tsx`

**Done-when:**
- [ ] `HeroSection.tsx` — headline + subtitle + 2 CTAs (FR-005)
- [ ] `StatsRow.tsx` — 3 stats mock (FR-006)
- [ ] `FeatureCards.tsx` — 4 cards (FR-007) com hover via CSS (`:hover`)
- [ ] `HomePage.tsx` compõe os 3 sub-componentes
- [ ] Zero inline styles estáticos (NFR-001)
- [ ] Wave 4 gate: T-04 executado e todos os checks passando

**Dependências:** I-01 (tokens), I-02 (Layout), I-03 (Button para CTAs)

---

## Wave 5 — LeaderboardPage + Componentes Visuais

### T-05 — Verificar LeaderboardPage e componentes visuais

**What:** Inspeção visual + build da LeaderboardPage com PodiumSection, tabela redesenhada e LevelBadge/RankingTable/PlayerAvatar refatorados.

**Where:** `fraghub-web/src/pages/LeaderboardPage/`, `fraghub-web/src/components/`

**Done-when:**
- [ ] Top-3 só renderiza quando `players.length >= 3` (AC-008.1)
- [ ] Posição #1 tem destaque visual (maior ou badge especial) (AC-008.2)
- [ ] Cards top-3 usam `--surface-container-low` (AC-008.3)
- [ ] Zero `border` explícito nas linhas da tabela (AC-009.1)
- [ ] Row do usuário logado tem `--secondary-container` (AC-009.2)
- [ ] Colunas K/D e W/L ocultam em `< 768px` via CSS (AC-009.3)
- [ ] Selects sem `border` light-mode (AC-010.1)
- [ ] Botão de página ativa com `var(--primary-container)` (AC-010.2)
- [ ] Prev/Next desabilitados com `opacity: 0.4` (AC-010.3)
- [ ] LevelBadge: nível 9-10 tem glow (`box-shadow` de FR-011) (AC-011.1)
- [ ] LevelBadge: zero inline styles, usa CSS vars (AC-011.2)
- [ ] RankingTable: zero inline styles (AC-012.1)
- [ ] RankingTable: `window.innerWidth` removido, responsividade via CSS media queries (AC-012.2)
- [ ] `npm run build` verde (NFR-004)

---

### I-05 — Implementar LeaderboardPage + refatorar LevelBadge, RankingTable, PlayerAvatar

**What:** Refatorar LeaderboardPage e criar PodiumSection. Atualizar LevelBadge, RankingTable e PlayerAvatar para CSS Modules + dark mode.

**Where:** `fraghub-web/src/pages/LeaderboardPage/`, `fraghub-web/src/components/LevelBadge.tsx`, `LevelBadge.module.css`, `RankingTable.tsx`, `RankingTable.module.css`, `PlayerAvatar.tsx`, `PlayerAvatar.module.css`

**Done-when:**
- [ ] `PodiumSection.tsx` — podium #1 centro, #2 esq, #3 dir (FR-008)
- [ ] `LeaderboardPage.tsx` — usa PodiumSection, RankingTable refatorada, filtros e paginação (FR-009, FR-010)
- [ ] `LevelBadge.tsx` — migrado de inline styles para CSS Module com mapeamento de cores do spec (FR-011)
- [ ] `RankingTable.tsx` — zero inline styles, `window.innerWidth` removido (FR-012)
- [ ] `PlayerAvatar.tsx` — atualizado para dark mode (`--surface-container-high` como fallback)
- [ ] Wave 5 gate: T-05 executado e todos os checks passando

**Dependências:** I-01, I-02, I-03

---

## Wave 6 — Auth Pages

### T-06 — Verificar LoginPage e RegisterPage

**What:** Inspeção visual + build das páginas de auth com design system.

**Where:** `fraghub-web/src/pages/LoginPage.tsx`, `fraghub-web/src/pages/RegisterPage.tsx`

**Done-when:**
- [ ] Background da página é `var(--background)` (AC-013.1)
- [ ] Card usa `--surface-container-low` sem border explícita (AC-013.2)
- [ ] Zero inline styles em LoginPage (AC-013.3)
- [ ] RegisterPage consistente visualmente com LoginPage (AC-014.1)
- [ ] Zero inline styles em RegisterPage (AC-014.2)
- [ ] Fluxo de auth funcional (submit, erros, redirect) — NFR-009
- [ ] `npm run build` e `npm run lint` verdes

---

### I-06 — Refatorar LoginPage e RegisterPage

**What:** Remover todos os inline styles das auth pages. Usar `Button`, `InputField`, `ErrorAlert` da Wave 3.

**Where:** `fraghub-web/src/pages/LoginPage.tsx`, `LoginPage.module.css`, `fraghub-web/src/pages/RegisterPage.tsx`, `RegisterPage.module.css`

**Done-when:**
- [ ] `LoginPage.tsx` — usa `InputField` para campos, `Button` para submit, `ErrorAlert` para erros
- [ ] `RegisterPage.tsx` — mesma abordagem que LoginPage
- [ ] CSS Modules criados com tokens do design system
- [ ] Lógica de negócio (chamadas de API, state Zustand) inalterada (NFR-009)
- [ ] Wave 6 gate: T-06 executado e todos os checks passando

**Dependências:** I-01, I-02, I-03

---

## Wave 7 — Profile Pages

### T-07 — Verificar ProfilePage e PublicProfilePage

**What:** Inspeção visual + build das páginas de perfil.

**Where:** `fraghub-web/src/pages/ProfilePage.tsx`, `fraghub-web/src/pages/PublicProfilePage.tsx`

**Done-when:**
- [ ] ProfilePage usa `--surface-container-low` para seções (AC-015.1)
- [ ] Zero inline styles em ProfilePage (AC-015.2)
- [ ] LevelBadge atualizado renderiza corretamente no perfil (AC-015.3)
- [ ] PublicProfilePage consistente com ProfilePage (AC-016.1)
- [ ] Zero inline styles em PublicProfilePage (AC-016.2)
- [ ] Edição de username funcional (NFR-009)
- [ ] `npm run build` verde

---

### I-07 — Refatorar ProfilePage e PublicProfilePage

**What:** Remover inline styles e aplicar design system nas páginas de perfil.

**Where:** `fraghub-web/src/pages/ProfilePage.tsx`, `ProfilePage.module.css`, `fraghub-web/src/pages/PublicProfilePage.tsx`, `PublicProfilePage.module.css`

**Done-when:**
- [ ] `ProfilePage.tsx` — seções com `--surface-container-low`, usa LevelBadge + PlayerAvatar atualizados
- [ ] `PublicProfilePage.tsx` — estrutura análoga ao ProfilePage
- [ ] CSS Modules com tokens do design system
- [ ] Lógica de API e Zustand inalterada (NFR-009)
- [ ] Wave 7 gate: T-07 executado e todos os checks passando

**Dependências:** I-01, I-02, I-03, I-05 (LevelBadge + PlayerAvatar)

---

## Wave Final — Admin Regression + NFRs Cross-Cutting

### T-08 — Gate final: Admin regression + NFRs globais

**What:** Verificação cruzada de NFRs e regressão das páginas admin.

**Where:** Todo o `fraghub-web/src/`

**Done-when:**
- [ ] Admin pages (`/admin/*`) não quebram — textos e backgrounds legíveis em dark mode (AC-018.1, AC-018.2)
- [ ] Zero UI libraries externas introduzidas (NFR-001)
- [ ] Zero CSS-in-JS (NFR-002)
- [ ] `tsc --noEmit` passa sem novos erros `any` (NFR-003)
- [ ] `npm run build` final verde (NFR-004)
- [ ] `npm run lint` final sem erros novos (NFR-005)
- [ ] Contraste WCAG AA verificado em LevelBadge e componentes de texto (NFR-006)
- [ ] `<title>` e `<meta og:*>` presentes em HomePage e LeaderboardPage (NFR-007)
- [ ] Testar em viewport 375px — sem overflow horizontal (NFR-008)
- [ ] Fluxo completo: register → login → leaderboard → perfil — funcional (NFR-009)

---

### I-08 — Correções de regressão e polish final

**What:** Corrigir qualquer regressão encontrada no T-08. Adicionar meta tags. Garantir responsividade 375px.

**Where:** Arquivos impactados pelo T-08

**Done-when:**
- [ ] Todas as regressões de admin corrigidas
- [ ] Meta tags adicionadas em HomePage e LeaderboardPage
- [ ] Viewport 375px sem overflow
- [ ] Gate final: T-08 passando integralmente

**Dependências:** I-01 a I-07

---

## Dependências entre Waves

```
I-01 (tokens) ──┬──> I-02 (layout) ──┬──> I-04 (HomePage)
                │                    │
                └──> I-03 (ui/)  ────┴──> I-05 (leaderboard + components)
                                     │
                                     ├──> I-06 (auth pages)
                                     │
                                     └──> I-07 (profiles) ← depende também de I-05
                                                         ↓
                                                    I-08 (final)
```

Waves 4, 5, 6 paralelas após Wave 3. Wave 7 depende de I-05 (LevelBadge/PlayerAvatar).

---

## Sumário para tracker

**Feature:** `frontend-refactor-stitch`
**Objetivo:** Aplicar o design system "Tactical Monolith" (dark mode, obsidian + electric blue, Space Grotesk + Inter) em todo o `fraghub-web` via CSS Modules + CSS custom properties.
**Waves:** 8 pares T/I (16 tasks) em sequência 1→2→3→{4,5,6}→7→8.
**Critério de done:** `npm run build` + `npm run lint` verdes, zero inline styles estáticos, WCAG AA, zero regressão funcional.
