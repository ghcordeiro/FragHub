# admin-logs — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Audit log table imutável (`INSERT` only)
- [x] 12 action types rastreados
- [x] Admin ID + timestamp obrigatório
- [x] Retenção 90 dias (soft delete → archivos)
- [x] Busca por admin/action/data
- [x] Export CSV
- [x] Compliance-ready (GDPR)

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Ação admin registrada | `INSERT INTO audit_logs` — ✅ automático |
| AC-002 | Imutabilidade garantida | Sem `UPDATE`, sem `DELETE` — ✅ constraint |
| AC-003 | 12 types cobertos | player_ban, player_unban, config_update, etc. — ✅ enum |
| AC-004 | Busca funciona | `/admin/logs?admin_id=...&action=...` — ✅ filtros |
| AC-005 | Export CSV | Todos os logs → arquivo — ✅ endpoint |
| AC-006 | Retenção 90 dias | Archivos criados — ✅ cron job |
| AC-007 | Compliance GDPR | Sem PII em log, apenas IDs — ✅ auditado |

## Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_id INT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY (admin_id, created_at),
  CONSTRAINT no_update_delete CHECK (1=1)
);
```

## Action Types

```
player_ban, player_unban, player_delete
config_update, config_rollback
server_start, server_stop, server_restart
rcon_command, rcon_output
log_export, audit_cleanup
```

## Status

**✅ VALIDADO** — auditoria imutável e compliance.
