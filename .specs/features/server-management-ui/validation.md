# server-management-ui — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Start/stop/restart servidores (systemd)
- [x] RCON console isolado
- [x] Command allowlist (whitelist)
- [x] Config file editor (path traversal protection)
- [x] Log viewer (últimas 1000 linhas)
- [x] Server health status
- [x] Permissões granulares por comando
- [x] Timeout para RCON (5 seg)

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Servidor start/stop | `systemctl start fraghub-cs2` — ✅ executado |
| AC-002 | RCON isolado | Comandos restritos (allowlist) — ✅ validado |
| AC-003 | Command validação | Entrada → whitelist check — ✅ bloqueado |
| AC-004 | Path traversal impossible | `/../../../etc/passwd` → rejectado — ✅ `path.resolve()` |
| AC-005 | Config editor seguro | Apenas diretório `/opt/fraghub/` — ✅ validado |
| AC-006 | RCON timeout | 5 seg sem resposta → cancel — ✅ implementado |
| AC-007 | Log viewer | Últimas 1000 linhas cached — ✅ performante |
| AC-008 | Permissões granulares | Admin ≠ config editor — ✅ RBAC |

## RCON Allowlist

```
mp_maxmoney 16000
mp_startmoney 2400
ammo_grenade_limit_total 4
mp_buy_anywhere 1
sv_cheats 0
map de_mirage
```

## Status

**✅ VALIDADO** — gerenciamento seguro de servidores.
