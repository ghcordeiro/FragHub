# FragHub

> All-in-one open source toolkit for CS2/CS:GO community servers — game servers, matchmaking, web portal, and automated setup in one interactive install.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## 🎯 What is FragHub?

FragHub is an open source toolkit that lets you create a complete CS2/CS:GO community server with matchmaking, web portal, and ELO ranking system in minutes.

**One command, full stack.**

## ✨ Features

- 🎮 **Dual game support** — CS2 and CS:GO Legacy simultaneously
- 🔧 **Interactive installer** — Wizard-based setup, no manual configuration
- 🌐 **Web portal** — Player profiles, leaderboards, match history
- 📊 **ELO system** — Faceit-style levels 1-10 with skill-based matchmaking
- 🏷️ **In-game tags** — Show player level or admin role on scoreboard
- 🛡️ **Admin panel** — Manage players, bans, servers via web
- 🔗 **Steam integration** — Login with Steam, link accounts
- 📱 **Discord webhooks** — Match notifications

## 🚀 Quick Start

```bash
# Download and run installer
curl -sSL https://raw.githubusercontent.com/ghcordeiro/FragHub/main/install.sh | bash
```

> ⚠️ **Requirements**: Ubuntu 22.04/24.04 LTS, 8GB RAM, 100GB disk

## 📋 Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| RAM | 4 GB | 8-16 GB |
| Disk | 65 GB | 100 GB |
| CPU | 2 cores | 4 cores |

## 🏗️ Tech Stack

| Layer | CS2 | CS:GO |
|-------|-----|-------|
| Framework | CounterStrikeSharp | SourceMod |
| Match system | MatchZy | Get5 |
| Admin | CS2-SimpleAdmin | SourceBans++ |
| Skins | WeaponPaints | Weapons & Knives |

**Portal**: Node.js + Express + React + TypeScript + MariaDB

## 📊 Level System

Faceit-style ranking with 10 levels:

| Level | ELO Range | Level | ELO Range |
|-------|-----------|-------|-----------|
| 1 | 100-500 | 6 | 1201-1350 |
| 2 | 501-750 | 7 | 1351-1530 |
| 3 | 751-900 | 8 | 1531-1750 |
| 4 | 901-1050 | 9 | 1751-2000 |
| 5 | 1051-1200 | 10 | 2001+ |

## 📖 Documentation

- [Installation Guide](docs/installation.md)
- [Configuration](docs/configuration.md)
- [API Reference](docs/api-reference.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🗺️ Roadmap

- [x] Project specification
- [ ] v0.1 — Basic installer + game servers
- [ ] v0.2 — Database + plugins
- [ ] v0.3 — API backend
- [ ] v0.4 — Web frontend
- [ ] v0.5 — Matchmaking system
- [ ] v0.6 — Admin panel
- [ ] v1.0 — Production release

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Guilherme Cordeiro** ([@ghcordeiro](https://github.com/ghcordeiro))

---

<p align="center">
  Made with ❤️ for the CS community
</p>
