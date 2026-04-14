# Phase 6: v0.6 — Painel admin - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning (autonomous mode)

<domain>
## Phase Boundary

Gerenciamento completo via web. Dashboard com CRUD de jogadores, ban/unban, criação de contas. Painel de servidor (start/stop/restart). Audit log de ações. Edição de .cfg via UI.

### Features

1. **admin-dashboard** — Dashboard com visão geral, CRUD jogadores, ban/unban, criação de contas
   - Spec: `.specs/features/admin-dashboard/`

2. **server-management-ui** — Start/stop/restart servers, console RCON via web (isolado)
   - Spec: `.specs/features/server-management-ui/`

3. **admin-logs** — Audit log de ações admin, retenção 90 dias
   - Spec: `.specs/features/admin-logs/`

4. **plugin-config-ui** — Edição de .cfg via UI com allowlist de paths
   - Spec: `.specs/features/plugin-config-ui/`

</domain>

<decisions>
## Implementation Decisions

### Admin Roles & Permissions

- **Admin role** — Created in Phase 3 auth-api, extends to frontend
- **Permission levels:** Super-admin (all actions), moderator (ban/unban only), support (view-only)
- **Frontend role check:** ProtectedRoute with role requirement

### RCON Isolation

- **RCON console** — Isolated sandbox, whitelist of commands only
- **Not exposed:** Server file system, OS commands, arbitrary Cvar changes
- **Allowed:** Game commands (mp_roundtime, mp_freezetime, etc.), admin commands (ban, kick, say)
- **Implementation:** Backend validates command against allowlist, forwards to RCON via LinuxGSM API

### Audit Logging

- **Events tracked:** Player creation, ban/unban, server start/stop, console command, config edit
- **Retention:** 90 days (auto-purge older logs)
- **Stored:** `admin_logs` table in MariaDB
- **Display:** Filterable by admin, action type, date range

### Config UI Allowlist

- **Files editable:** `.cfg` files in `/csgo/cfg/`, `/cs2/cfg/` only
- **Denied paths:** System files, plugins, executables, sensitive configs
- **Changes tracked:** Logged in audit trail with before/after diffs

</decisions>

<specifics>
## Specific Requirements

### Completion Criteria

- [ ] Admin dashboard loaded
- [ ] Can create user accounts via UI
- [ ] Can ban/unban players
- [ ] Server start/stop/restart working
- [ ] RCON console working (safe commands only)
- [ ] Audit log populated and queryable
- [ ] Config editor working with allowlist enforced

</specifics>

</domain>
