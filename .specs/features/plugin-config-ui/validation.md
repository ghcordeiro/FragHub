# plugin-config-ui — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Editor visual para configs de plugin
- [x] SourceMod `.cfg` syntax highlighting
- [x] Validação de sintaxe antes de save
- [x] Path traversal protection
- [x] Rollback a versão anterior
- [x] Diff antes de aplicar
- [x] Reload plugin automático
- [x] Log de mudanças (audit trail)

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Config carrega em editor | File path `/opt/fraghub/plugins/...` — ✅ lido |
| AC-002 | Sintaxe validada | `key = value;` obrigatório — ✅ regex |
| AC-003 | Path traversal blocked | `/../../../etc/passwd` → rejected — ✅ `path.resolve()` |
| AC-004 | Rollback funciona | Versão anterior restaurada — ✅ commit |
| AC-005 | Diff visualizado | Before/after comparison — ✅ lado-a-lado |
| AC-006 | Plugin reloaded | `sourcemod reload` executado — ✅ RCON |
| AC-007 | Audit trail | Mudança registrada em `audit_logs` — ✅ rastreado |

## Components

```
src/pages/admin/
└── PluginConfigPage.tsx

src/components/admin/
├── ConfigEditor.tsx (Monaco editor)
├── ConfigDiff.tsx
└── ConfigHistory.tsx
```

## Status

**✅ VALIDADO** — configuração segura de plugins com auditoria.
