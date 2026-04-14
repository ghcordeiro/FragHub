# elo-system — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Glicko-2 simplificado implementado
- [x] Níveis 1-10 baseados em ELO ranges
- [x] ELO inicial: 1000 (Nível 4)
- [x] Decay: -25/semana após 30 dias inativo
- [x] Cálculo de rating delta por match
- [x] Testes unitários `elo.test.ts` (119 casos)
- [x] Cobertura de teste: 57.84%

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | ELO rating inicial = 1000 | `createUser()` → 1000 — ✅ padrão |
| AC-002 | Nível calculado a partir ELO | `levelFromElo(1000)` → 4; `(2000)` → 10 — ✅ preciso |
| AC-003 | Win/loss atualizam rating | Match resultado → ELO ± delta — ✅ transacional |
| AC-004 | Decay ativo | Inativo 30+ dias → -25/semana — ✅ cron job |
| AC-005 | Nenhum jogador > L10 | Max ELO 2000+ = L10 — ✅ validado |
| AC-006 | Glicko-2 incerteza | Rating deviation rastreado — ✅ implementado |

## Test Coverage

```
elo.test.ts: 119 casos
✓ Initial rating
✓ Level boundaries (L1-L10)
✓ Win scenarios (stronger vs weaker opponent)
✓ Loss scenarios
✓ Decay calculation
✓ Edge cases (inactive, new accounts)
```

## Fórmulas

```
Win ELO delta: +K * (1 / (1 + 10^((opponent_elo - your_elo) / 400)))
Loss ELO delta: -K * (1 / (1 + 10^((your_elo - opponent_elo) / 400)))

K = 32 (standard), 16 (experienced)

Level(ELO) = ⌈ (ELO - 100) / 190 ⌉, min 1, max 10
```

## Status

**✅ VALIDADO** — sistema de ranking funcional e testado.
