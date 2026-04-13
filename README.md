# FragHub

> All-in-one open source toolkit for CS2/CS:GO community servers — game servers, matchmaking, web portal, and automated setup in one interactive install.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## What is FragHub?

FragHub is an open source toolkit that aims to provide a complete CS2/CS:GO community stack: game servers, matchmaking, web portal, and an ELO-style ranking system, driven by an **interactive installer** on Ubuntu LTS.

**Target workflow:** clone the repo on the server (or sync it), run the installer once, iterate with idempotent re-runs.

## Features

- **Dual game support** — CS2 and CS:GO Legacy (optional game stack in the installer)
- **Interactive installer** — Wizard-based setup (`scripts/installer/install.sh`)
- **MariaDB baseline** — Versioned SQL migrations and app user provisioning
- **HTTP API** — `services/fraghub-api`: Express, TypeScript, JWT auth (email/password + Google OAuth hooks), refresh rotation, rate limits (see `docs/adr/0006-auth-api-jwt-oauth-refresh.md`)
- **Web portal** — Planned (frontend not in this repo yet)
- **ELO-style levels** — Specified in `.specs/project/`; matchmaking milestones ahead
- **In-game tags** — Planned plugins integration
- **Steam / Discord** — Partially specified; Steam linking and webhooks are roadmap items

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
| Installer | Bash, systemd, MariaDB, UFW (see installer scripts) |
| API | Node.js 20, Express, TypeScript, Knex, `services/fraghub-api` |
| Database | MariaDB, `fraghub_db`, utf8mb4 |
| CS2 / CS:GO | CounterStrikeSharp / SourceMod, MatchZy / Get5 (when game stack is enabled) |

## Level system (vision)

Faceit-style ranking with 10 levels (detail in `.specs/project/LEVELS.md`):

| Level | ELO Range | Level | ELO Range |
|-------|-----------|-------|-----------|
| 1 | 100-500 | 6 | 1201-1350 |
| 2 | 501-750 | 7 | 1351-1530 |
| 3 | 751-900 | 8 | 1531-1750 |
| 4 | 901-1050 | 9 | 1751-2000 |
| 5 | 1051-1200 | 10 | 2001+ |

## Documentation

| Doc | Purpose |
|-----|---------|
| [STRUCTURE.md](STRUCTURE.md) | Repository layout (source of truth for folders) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [AGENTS.md](AGENTS.md) | Agent / automation contract for this repo |
| [docs/adr/](docs/adr/) | Architecture Decision Records |
| [docs/architecture/](docs/architecture/) | C4-style context/container notes |
| [.specs/project/ROADMAP.md](.specs/project/ROADMAP.md) | Milestones and feature order |

End-user guides (`docs/installation.md`, etc.) are not present yet; installation is defined by the installer and feature specs.

## Roadmap (high level)

- [x] v0.1 — Basic installer + optional game stack baseline
- [x] v0.2 — Database baseline, extended plugins, backup
- [x] v0.3 (in progress) — API bootstrap (`api-setup`) + auth API in repo; validate/extend per `.specs/features/auth-api/`
- [ ] v0.4 — Web frontend
- [ ] v0.5 — Matchmaking system
- [ ] v0.6 — Admin panel
- [ ] v1.0 — Production-hardening release

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
