# matchmaking-queue — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Fila de matchmaking em memória
- [x] State machine (pending → veto → live → complete)
- [x] Balanceamento automático por ELO
- [x] Map veto (alternating bans)
- [x] Timeout (15 min na veto, 60 min na live)
- [x] Concorrência thread-safe (Mutex)
- [x] Desistência durante queue (remover jogador)
- [x] Notificação em tempo real

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Jogador entra na queue | `POST /api/queue/join` — ✅ 200 |
| AC-002 | 10 jogadores → match criado | Auto-trigger (5v5) — ✅ automático |
| AC-003 | Times balanceados por ELO | Diff médio < 50 ELO — ✅ algoritmo |
| AC-004 | Veto de mapas | Alternating bans → map final — ✅ funciona |
| AC-005 | Timeout em veto | 15 min inativo → match cancelado — ✅ cron |
| AC-006 | Jogador sai da queue | `DELETE /api/queue/leave` → ✅ remove |
| AC-007 | Match criado → webhook | MatchZy/Get5 await resultado — ✅ integrado |
| AC-008 | Concorrência segura | Múltiplas `/join` simultâneas → sem race — ✅ Mutex |

## State Machine

```
pending (waiting for 10)
  ↓
veto (15 min para map voting)
  ↓
live (match rodando)
  ↓
complete (resultado registrado)
```

## Status

**✅ VALIDADO** — matchmaking com balanceamento e segurança concorrente.
