# Phase 2: v0.2 — Banco de dados e plugins — SUMMARY

**Status:** ✅ Complete

## Objective

Persistência de dados, plugin ecosystem, automated backups.

## What Was Built

### database-baseline
- MariaDB setup via LinuxGSM installer
- `fraghub_db` database with initial schema
- Tables: `users`, `matches`, `stats`, `players`, `bans`
- Migrations framework using Knex (sequential SQL versioning)
- utf8mb4 collation for international character support
- `.my.cnf` configuration (secure permissions: 0600)
- Schema version tracking via `schema_migrations` table

### plugins-extended-cs2
- **CS2-SimpleAdmin** — admin commands, player management, MySQL integration
- **WeaponPaints** — skin/weapon customization
- **Demo recorder** — automatic match recording to `/demos`
- Integration with MatchZy for hook points

### plugins-extended-csgo
- **SourceBans++** — ban system with web admin panel
- **Weapons & Knives** — player loadout customization
- **RankMe** — automatic rank tracking from Get5 matches
- Integration with Get5 for match events

### database-backup
- Cron job: daily backup at 2 AM UTC
- 7-day retention (auto-rotation)
- Backup location: `/var/backups/fraghub/`
- Secure `.my.cnf` credentials (chmod 600)
- Backup integrity checks via `mysqlcheck`

## Key Decisions

- MariaDB chosen over MySQL (GPL, MySQL-compatible, active development)
- Knex migrations for version control and repeatability
- Backup retention: 7 days (balance between storage and recovery window)
- Automated backup scheduling (no manual intervention needed)
- SourceBans++ over custom admin system (proven, has web UI)

## Completion Criteria

✅ MariaDB running with `fraghub_db` created
✅ Initial schema applied (users, matches, stats tables)
✅ CS2 plugins loaded and operational
✅ CS:GO plugins loaded and operational
✅ Daily backups running, rotation verified
✅ Stats being saved to database (manual test)
✅ Admin commands functional (ban/unban via web panel)

## Artifacts

- `scripts/installer/sql/database/` — migration files (001-004)
- `scripts/installer/database-baseline.sh` — setup automation
- Plugin configs in game server `/csgo/cfg/` and `/cs2/cfg/`
- Specs: `.specs/features/database-baseline/`, `.specs/features/plugins-extended-*/`, `.specs/features/database-backup/`

## Session Info

**Completed:** v0.2 was delivered before this GSD layer was added.
**Date:** Snapshot created 2026-04-13
