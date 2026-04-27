# FragHub

> All-in-one open source toolkit for CS2/CS:GO community servers — game servers, matchmaking, web portal, and automated setup in one interactive install.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![CI](https://github.com/ghcordeiro/FragHub/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ghcordeiro/FragHub/actions/workflows/ci.yml)

## What is FragHub?

FragHub is an open source toolkit that provides a complete CS2/CS:GO community stack: game servers, matchmaking with ELO ranking, web portal, and a LAN sysadmin panel — all driven by an **interactive installer** on Ubuntu LTS.

**Target workflow:** clone the repo on the server, run the installer once, iterate with idempotent re-runs.

## Features

- **Dual game support** — CS2 and CS:GO Legacy (optional game stack in the installer)
- **Interactive installer** — Wizard-based setup (`scripts/installer/install.sh`)
- **MariaDB baseline** — Versioned SQL migrations and app user provisioning
- **HTTP API** (`services/fraghub-api`) — Express, TypeScript, JWT auth (email/password + Google OAuth), refresh rotation, rate limits, matchmaking queue
- **Web portal** (`fraghub-web`) — React + Vite + TypeScript: player profiles, ELO chart, K/D leaderboard, match history, admin panel
- **Live scoreboard** — Real-time in-game match state served via `/api/live`
- **SysAdmin panel** (`services/fraghub-sysadmin`) — LAN-only, no-auth Express + React app for server management: services, logs, database, system info, CS2 updates
- **ELO-style levels** — Glicko-2 simplified algorithm, 10 levels (1–10)
- **CS2 plugins** (C# / CounterStrikeSharp):
  - `fraghub-tags` — in-game level tag display
  - `fraghub-x1draft` — 1v1 duel map-draft and veto system
- **CS:GO plugin** (SourcePawn / SourceMod): `fraghub-tags` — in-game level tag display
- **Steam / Discord** — Steam OpenID linking, Discord match notifications
- **Nginx + SSL** — Reverse proxy with Certbot auto-renewal

## Quick start (installer)

The installer expects a **full clone** (it resolves paths relative to `scripts/installer/`). Piping a raw script from `curl` without a checkout is not supported.

```bash
git clone https://github.com/ghcordeiro/FragHub.git
cd FragHub
bash scripts/installer/install.sh
```

> **Requirements:** Ubuntu 22.04 or 24.04 LTS, `sudo`, network access. Game stack and resource sizing: see `.specs/project/ROADMAP.md` and installer pre-checks.

## Requirements (typical lab server)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| RAM | 4 GB (DB + API only) | 8–16 GB with game servers |
| Disk | 65 GB | 100 GB |
| CPU | 2 cores | 4+ cores |

## Tech stack

| Area | Choice |
|------|--------|
| Installer | Bash, systemd, MariaDB, UFW, Nginx, Certbot |
| API | Node.js 20, Express, TypeScript, Knex (`services/fraghub-api`) |
| Web portal | React 18, Vite, TypeScript (`fraghub-web`) |
| SysAdmin panel | React 19, Express, Vite — LAN-only, port 8080 (`services/fraghub-sysadmin`) |
| Database | MariaDB, `fraghub_db`, utf8mb4 |
| CS2 plugins | CounterStrikeSharp (C#) — fraghub-tags, fraghub-x1draft |
| CS:GO plugins | SourceMod (SourcePawn) — fraghub-tags |
| Matchmaking | MatchZy / Get5 (when game stack enabled) |

## Level system

Faceit-style ranking with 10 levels (detail in `.specs/project/LEVELS.md`):

| Level | ELO Range | Level | ELO Range |
|-------|-----------|-------|-----------|
| 1 | 100–500 | 6 | 1201–1350 |
| 2 | 501–750 | 7 | 1351–1530 |
| 3 | 751–900 | 8 | 1531–1750 |
| 4 | 901–1050 | 9 | 1751–2000 |
| 5 | 1051–1200 | 10 | 2001+ |

## Services overview

| Service | Port | Purpose |
|---------|------|---------|
| `fraghub-api` | configured (default 3000) | REST API — auth, players, matches, queue, live, admin |
| `fraghub-web` | served via Nginx | Public web portal |
| `fraghub-sysadmin` | 8080 (LAN-only) | Server management panel — no auth required |

## Documentation

| Doc | Purpose |
|-----|---------|
| [STRUCTURE.md](STRUCTURE.md) | Repository layout (source of truth for folders) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [AGENTS.md](AGENTS.md) | Agent / automation contract for this repo |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [docs/adr/](docs/adr/) | Architecture Decision Records |
| [docs/architecture/](docs/architecture/) | C4-style context/container notes |
| [.specs/project/ROADMAP.md](.specs/project/ROADMAP.md) | Milestones and feature order |

## Roadmap (high level)

- [x] v0.1 — Basic installer + optional game stack baseline
- [x] v0.2 — Database baseline, extended plugins, backup
- [x] v0.3 — API (auth, Steam, players, matches webhooks)
- [x] v0.4 — Web frontend (React, auth UI, profiles, leaderboard)
- [x] v0.5 — Matchmaking system (ELO, queue, notifications, in-game tags)
- [x] v0.6 — Admin panel (dashboard, player mgmt, server control, audit logs)
- [x] v1.0 — Production release (upgrade command, CI/CD, tests, security audit)

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening PRs.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).

## Author

**Guilherme Cordeiro** ([@ghcordeiro](https://github.com/ghcordeiro))

---

<p align="center">
  Made with care for the CS community
</p>
