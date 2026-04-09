# FragHub Roadmap

## Milestones

### v0.1 — Instalador básico ✅
> Servidor funcionando com plugins essenciais

- [x] `cli-installer` — wizard interativo, pre-checks, LinuxGSM, UFW, systemd
- [x] `game-stack-baseline` — CS2/CS:GO, MetaMod, CounterStrikeSharp, MatchZy, SourceMod, Get5, systemd services

**Critério de conclusão**: servidor CS2 e CS:GO rodando, partidas funcionando

---

### v0.2 — Banco de dados e plugins
> Persistência de dados e plugins completos

- [~] `database-baseline` — MariaDB, banco fraghub_db, schema inicial (users, matches, stats, migrations), utf8mb4
- [ ] `plugins-extended-cs2` — CS2-SimpleAdmin, WeaponPaints, demo-recorder automático
- [ ] `plugins-extended-csgo` — SourceBans++, Weapons & Knives, RankMe
- [ ] `database-backup` — backup diário via cron, rotação 7 dias, .my.cnf seguro

**Critério de conclusão**: stats salvando no banco, bans sincronizados

---

### v0.3 — API backend
> API REST para o portal

- [ ] `api-setup` — Node.js 20 + Express + TypeScript, Knex, systemd, health check
- [ ] `auth-api` — Google OAuth, email/senha, JWT access+refresh, roles, rate limiting
- [ ] `steam-integration` — Steam OpenID vinculação, /api/player/{steamid}
- [ ] `players-api` — CRUD jogadores, perfil, endpoint público por steamid
- [ ] `matches-api` — partidas, stats, webhook MatchZy/Get5

**Critério de conclusão**: login funcionando, API respondendo

---

### v0.4 — Frontend portal
> Interface web básica

- [ ] `frontend-setup` — React 18+ + TypeScript + Vite, Zustand, React Router v6
- [ ] `nginx-ssl` — reverse proxy Nginx, SSL certbot, headers de segurança
- [ ] `auth-ui` — Login, Registro, Google OAuth, vinculação Steam, gestão de sessão
- [ ] `player-profile-ui` — perfil público, stats, histórico, badge nível 1-10
- [ ] `leaderboard-ui` — ranking público por ELO, paginado, filtros

**Critério de conclusão**: usuário consegue logar e ver próprio perfil

---

### v0.5 — Sistema de matchmaking
> Queue e balanceamento de times

- [ ] `elo-system` — Glicko-2 simplificado, níveis 1-10 (ELO inicial 1000 = Nível 4)
- [ ] `matchmaking-queue` — fila 5v5, balanceamento por ELO, map veto, state machine
- [ ] `match-notifications` — Discord webhook, banner no portal quando partida pronta
- [ ] `fraghub-tags-plugin` — plugin CS2 (C#) + CS:GO (SourcePawn) com tags [N]/[ADMIN]

**Critério de conclusão**: queue funcionando, times balanceados, tags in-game

---

### v0.6 — Painel admin
> Gerenciamento completo

- [ ] `admin-dashboard` — dashboard, CRUD jogadores, ban/unban, criação de contas
- [ ] `server-management-ui` — start/stop/restart, console RCON via web (isolado)
- [ ] `admin-logs` — audit log de ações admin, retenção 90 dias
- [ ] `plugin-config-ui` — edição de .cfg via UI com allowlist de paths

**Critério de conclusão**: admin consegue gerenciar tudo pela web

---

### v1.0 — Produção
> Release público

- [ ] `upgrade-command` — fraghub upgrade com backup, migrations, rollback automático
- [ ] `ci-cd` — GitHub Actions: lint + ShellCheck + tests + release tag
- [ ] `tests-suite` — bats-core (bash), Jest+Supertest (API), Vitest (React), Playwright (e2e)
- [ ] `security-audit` — OWASP Top 10, JWT, cookies, RCON, permissões — zero Critical/High
- [ ] `docs-release` — README, INSTALL, CONTRIBUTING, CHANGELOG, LICENSE, CODE_OF_CONDUCT
- [ ] `landing-page` — página pública, SEO, WCAG 2.1 AA, bilíngue PT/EN

**Critério de conclusão**: projeto pronto para uso público

---

## Futuro (v2.0+)

- [ ] Sistema anti-smurf (verificação de horas, Prime)
- [ ] Demo viewer no browser
- [ ] Heatmaps de posicionamento
- [ ] Sistema de seasons (rankings sazonais)
- [ ] Discord bot completo (queue via Discord)
- [ ] Mobile app (React Native)
- [ ] Múltiplos servidores (cluster)
- [ ] Decay de ELO por inatividade
- [ ] Fila em Redis (substituir fila em memória da v0.5)
- [ ] SSE/WebSockets para notificações em tempo real

---

## Legenda

- [ ] Não iniciado
- [~] Em progresso (spec pronto, aguardando Plan)
- [x] Concluído
