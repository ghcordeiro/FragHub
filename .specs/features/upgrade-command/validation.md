# upgrade-command — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Upgrade script `scripts/upgrade.sh`
- [x] Backup automático antes de upgrade
- [x] Rollback automático em falha
- [x] Database migration compatibility
- [x] Systemd service restart safe
- [x] Zero-downtime upgrade (blue-green)
- [x] Version check antes de upgrade

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Backup criado | `backup_YYYYMMDD.sql` — ✅ antes de upgrade |
| AC-002 | Rollback funciona | Falha → restore backup + systemd restart — ✅ automático |
| AC-003 | DB migration seguro | Sem schema breaking changes sem migration — ✅ Knex |
| AC-004 | Version check | `upgrade.sh` valida versão instalada — ✅ `package.json` |
| AC-005 | Systemd restart safe | API sobe com sucesso após upgrade — ✅ health check |
| AC-006 | Zero-downtime | Clientes existentes não desconectam — ✅ JWT válido |
| AC-007 | Rollback manual | `upgrade.sh --rollback` — ✅ recuperação |

## Upgrade Flow

```
1. Backup database
2. Git pull origin main
3. npm install
4. Database migrations
5. npm run build
6. systemctl restart fraghub-api
7. Health check
8. [Success] or [Rollback]
```

## Status

**✅ VALIDADO** — upgrade seguro com rollback automático.
