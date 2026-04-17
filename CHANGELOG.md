# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Instalador: etapa `admin-bootstrap` após `api-setup` — cria ou atualiza o utilizador admin na BD a partir de `FRAGHUB_ADMIN_EMAIL` / `FRAGHUB_ADMIN_PASSWORD` (bcrypt custo 12, alinhado à API); `FRAGHUB_ADMIN_BOOTSTRAP_PURGE=1` remove utilizadores e dados dependentes antes do upsert; migração `010_admin_panel.sql` incluída no `database-baseline`.
- Instalador: etapas `portal-setup` (build Vite de `fraghub-web` para `/opt/fraghub/portal/dist`) e `nginx_setup` (site `fraghub`, `default_server`, remoção de `sites-enabled/default`, proxy `/api` → API na porta configurada); `verify` confirma portal e rejeita a página “Welcome to nginx!”; `bootstrap` com stack de jogo valida `linuxgsm.sh` para evitar estado inconsistente.

### Fixed
- Instalador CS2 (stack de jogo): `plugins-extended-cs2` passa a **descarregar os ZIPs reais** do GitHub (CS2-SimpleAdmin, WeaponPaints), extrair para `linuxgsm/<instancia>/serverfiles/game/csgo/addons/counterstrikesharp/`, gravar JSON de BD em `configs/plugins/...`, e validar ficheiros no servidor; `plugins-cs2` regista aviso de que MetaMod/CSS/MatchZy ainda são só marcadores até instalacao manual ou LGSM mods. `game_verify`/`state` alinhados aos novos caminhos.
- `fraghub-api`: `tsc` verde (`updatePlayerEloOnMatch` com `matchId` string, `Number(cnt)` no ELO, tipo `QueueRuntimeConfig` em `joinQueue`, `Knex.QueryBuilder` nos subqueries, shim `uuid`); `api-setup`: `FRAGHUB_API_SKIP_LINT=1` opcional para instalação quando o ESLint do pacote ainda não passa.
- API + portal: `GET /api/players/me` para o perfil autenticado (evita colisão com `GET /api/players/:id` e 404 em `"me"`); listagem pública inclui `eloRating`; frontend envia `sort=elo_desc` e mapeia `{ data, meta }` do leaderboard; `PATCH /players/me` envia `displayName`.
- `nginx.sh`: usar apenas `fraghub_log` de `logging.sh` (removidas chamadas inexistentes a `fraghub_log_info` / `_success` / `_warn`).
- `state.sh`: `fraghub_state_verify_verify` confirma portal, site Nginx e que `http://127.0.0.1:80/` não é a página default do nginx, para não saltar `verify.sh` com estado obsoleto.
- `fraghub-web`: `tsconfig` compatível com TypeScript 6 (`ignoreDeprecations`), ESLint verde nas páginas admin, cliente HTTP com refresh JWT seguro (uma retentativa, sem `user!`), exemplo `.env.example` para deploy.

### Added
- Production release foundation infrastructure
- Upgrade command with backup, migration, and rollback support
- CI/CD pipeline with ShellCheck, TypeScript, ESLint, Prettier validation
- Comprehensive test suite with unit and integration tests
- Test coverage reporting (vitest with coverage-v8)

## [1.0.0] - 2026-04-14

### Added
- Initial public release
- FragHub — all-in-one toolkit for CS2/CS:GO community servers
- Interactive installer with pre-checks and dependency management
- HTTP API (Express, TypeScript, JWT auth, Google OAuth)
- MariaDB baseline with versioned migrations
- Admin panel with player management, server control, and audit logging
- Web portal (React 18, Vite, TypeScript)
- Nginx reverse proxy with automatic SSL (Certbot)
- ELO-style ranking system (Glicko-2)
- Player profiles with match history
- Leaderboard with pagination and filtering
- Admin dashboard with real-time metrics
- Security features: rate limiting, CSRF protection, command validation

### Infrastructure
- GitHub Actions CI/CD pipeline
- Automated testing (unit + integration)
- Automated releases on version tags
- Code quality gates (ShellCheck, TypeScript, ESLint, Prettier)
- Comprehensive logging and monitoring

## Features by Version

### v0.1 — Game Stack Baseline
- Game server provisioning (CS2/CS:GO)
- SourceMod/CounterStrikeSharp plugin infrastructure

### v0.2 — Database & Auth API
- MariaDB with migrations
- User authentication (email/password + Google OAuth)
- JWT tokens with refresh rotation
- Steam linking foundation

### v0.3 — Core APIs
- Players API (profiles, stats)
- Matches API (webhook integration, result recording)
- ELO calculation engine

### v0.4 — Web Portal
- React 18 frontend (Vite, TypeScript)
- Login/Register pages
- Player profiles (private + public)
- Leaderboard with pagination
- Nginx reverse proxy with SSL automation

### v0.5 — Matchmaking Queue
- Queue service with balancing
- ELO-based team formation
- Match notifications (Discord webhooks)

### v0.6 — Admin Panel
- Admin dashboard with metrics
- Player management (ban/unban)
- Server control (RCON, restart)
- Plugin configuration
- Immutable audit logging

### v1.0 — Production Release
- Upgrade command with backup and rollback
- CI/CD pipeline for automated quality gates
- Comprehensive test suite
- Documentation (README, CONTRIBUTING, LICENSE)
- Community guidelines (CODE_OF_CONDUCT)

## [0.6.0] - 2026-04-14

### Added
- Admin panel with dashboard, player management, server control
- Admin API with 12 endpoints
- RCON service with command validation
- Plugin configuration management
- Immutable audit logging system
- Role-based access control

### Fixed
- Path traversal vulnerability in plugin config paths
- Command injection prevention with blocklist validation
- Self-ban prevention in admin endpoints

## [0.5.0] - 2026-04-10

### Added
- Queue service foundation
- ELO-based team balancing algorithm
- Match notifications system
- Discord webhook integration

## [0.4.0] - 2026-04-08

### Added
- React 18 web portal with Vite
- Session management with JWT
- Login/Register pages with validation
- Player profile pages
- Leaderboard component
- Nginx reverse proxy configuration
- SSL automation with Certbot

### Security
- HttpOnly refresh token cookies
- CORS protection
- Rate limiting on auth endpoints

## [0.3.0] - 2026-04-05

### Added
- Players API with profile endpoints
- Matches API with webhook support
- ELO calculation engine (Glicko-2)
- Match result recording
- Player statistics aggregation

## [0.2.0] - 2026-03-30

### Added
- MariaDB setup and migrations system
- User authentication API (email/password)
- Google OAuth integration
- JWT token generation and validation
- Refresh token rotation
- Rate limiting middleware

## [0.1.0] - 2026-03-20

### Added
- Interactive installer script
- Game server provisioning (CS2 and CS:GO)
- SourceMod and CounterStrikeSharp support
- Pre-checks for OS, architecture, resources
- Systemd service configuration
- UFW firewall setup
