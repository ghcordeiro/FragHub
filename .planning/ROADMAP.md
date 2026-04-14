# FragHub Roadmap

## Current Milestone: v0.3 — API Backend

Phase 3 is in progress. See phase breakdown below.

---

## Phase Breakdown

### Phase 1: v0.1 — Instalador básico ✅

**Goal:** Servidor funcionando com plugins essenciais

- cli-installer — wizard interativo, pre-checks, LinuxGSM, UFW, systemd
- game-stack-baseline — CS2/CS:GO, MetaMod, CounterStrikeSharp, MatchZy, SourceMod, Get5, systemd services

**Status:** Complete
**Specs:** `.specs/features/cli-installer/`, `.specs/features/game-stack-baseline/`

---

### Phase 2: v0.2 — Banco de dados e plugins ✅

**Goal:** Persistência de dados e plugins completos

- database-baseline — MariaDB, banco fraghub_db, schema inicial, utf8mb4
- plugins-extended-cs2 — CS2-SimpleAdmin, WeaponPaints, demo-recorder automático
- plugins-extended-csgo — SourceBans++, Weapons & Knives, RankMe
- database-backup — backup diário via cron, rotação 7 dias, .my.cnf seguro

**Status:** Complete
**Specs:** `.specs/features/database-baseline/`, `.specs/features/plugins-extended-*/`, `.specs/features/database-backup/`

---

### Phase 3: v0.3 — API backend 🔄

**Goal:** API REST para o portal com autenticação, integração Steam, e webhook de partidas

**Features:**

- api-setup — Node.js 20 + Express + TypeScript, Knex, systemd, health check
  - Status: Validate (CTO check 2026-04-13)
  - Spec: `.specs/features/api-setup/`

- auth-api — Google OAuth, email/senha, JWT access+refresh, roles, rate limiting
  - Status: ✅ Validate Aprovado (2026-04-13)
  - Spec: `.specs/features/auth-api/`

- steam-integration — Steam OpenID vinculação, /api/player/{steamid}
  - Status: ✅ Validate Aprovado (2026-04-13)
  - Spec: `.specs/features/steam-integration/`

- players-api — CRUD jogadores, perfil, endpoint público por steamid
  - Status: ✅ Validate Aprovado (2026-04-13)
  - Spec: `.specs/features/players-api/`

- matches-api — partidas, stats, webhook MatchZy/Get5
  - Status: 🔄 Implement Concluído, Validate PENDING (E2E smoke test needed)
  - Spec: `.specs/features/matches-api/`
  - **Next action:** UAT remoto no servidor + aprovação humana

**Completion Criteria:** login funcionando, API respondendo, webhook MatchZy/Get5 processando partidas

**Status:** 4/5 features validated, 1 awaiting validation

---

### Phase 4: v0.4 — Frontend portal ⬜

**Goal:** Interface web básica com login, perfis e leaderboard

**Plans:**
- [ ] 04-01-PLAN.md — Bootstrap React + auth UI + profile + leaderboard + Nginx SSL

**Features:**
- frontend-setup — React 18+ + TypeScript + Vite, Zustand, React Router v6
- nginx-ssl — reverse proxy Nginx, SSL certbot, headers de segurança
- auth-ui — Login, Registro, Google OAuth, vinculação Steam, gestão de sessão
- player-profile-ui — perfil público, stats, histórico, badge nível 1-10
- leaderboard-ui — ranking público por ELO, paginado, filtros

**Completion Criteria:** usuário consegue logar e ver próprio perfil

**Status:** Planned (1 plan)
**Specs:** `.specs/features/frontend-setup/`, `.specs/features/nginx-ssl/`, `.specs/features/auth-ui/`, `.specs/features/player-profile-ui/`, `.specs/features/leaderboard-ui/`

---

### Phase 5: v0.5 — Sistema de matchmaking ⬜

**Goal:** Queue e balanceamento de times

- elo-system — Glicko-2 simplificado, níveis 1-10 (ELO inicial 1000 = Nível 4)
- matchmaking-queue — fila 5v5, balanceamento por ELO, map veto, state machine
- match-notifications — Discord webhook, banner no portal quando partida pronta
- fraghub-tags-plugin — plugin CS2 (C#) + CS:GO (SourcePawn) com tags [N]/[ADMIN]

**Completion Criteria:** queue funcionando, times balanceados, tags in-game

**Status:** Not started
**Specs:** `.specs/features/elo-system/`, `.specs/features/matchmaking-queue/`, `.specs/features/match-notifications/`, `.specs/features/fraghub-tags-plugin/`

---

### Phase 6: v0.6 — Painel admin ⬜

**Goal:** Gerenciamento completo

- admin-dashboard — dashboard, CRUD jogadores, ban/unban, criação de contas
- server-management-ui — start/stop/restart, console RCON via web (isolado)
- admin-logs — audit log de ações admin, retenção 90 dias
- plugin-config-ui — edição de .cfg via UI com allowlist de paths

**Completion Criteria:** admin consegue gerenciar tudo pela web

**Status:** Not started
**Specs:** `.specs/features/admin-dashboard/`, `.specs/features/server-management-ui/`, `.specs/features/admin-logs/`, `.specs/features/plugin-config-ui/`

---

### Phase 7: v1.0 — Produção ⬜

**Goal:** Release público

- upgrade-command — fraghub upgrade com backup, migrations, rollback automático
- ci-cd — GitHub Actions: lint + ShellCheck + tests + release tag
- tests-suite — bats-core (bash), Jest+Supertest (API), Vitest (React), Playwright (e2e)
- security-audit — OWASP Top 10, JWT, cookies, RCON, permissões — zero Critical/High
- docs-release — README, INSTALL, CONTRIBUTING, CHANGELOG, LICENSE, CODE_OF_CONDUCT
- landing-page — página pública, SEO, WCAG 2.1 AA, bilíngue PT/EN

**Completion Criteria:** projeto pronto para uso público

**Status:** Not started
**Specs:** `.specs/features/upgrade-command/`, `.specs/features/ci-cd/`, `.specs/features/tests-suite/`, `.specs/features/security-audit/`, `.specs/features/docs-release/`, `.specs/features/landing-page/`

---

## Future (v2.0+)

- Sistema anti-smurf (verificação de horas, Prime)
- Demo viewer no browser
- Heatmaps de posicionamento
- Sistema de seasons (rankings sazonais)
- Discord bot completo (queue via Discord)
- Mobile app (React Native)
- Múltiplos servidores (cluster)
- Decay de ELO por inatividade
- Fila em Redis (substituir fila em memória da v0.5)
- SSE/WebSockets para notificações em tempo real

---

## Legend

- ✅ Complete
- 🔄 In progress
- ⬜ Not started
- **Next action:** indicates blocker or pending task
