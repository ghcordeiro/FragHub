# matches-api — Validação

## Estado

Gate **Validate** — **Aguardando** evidência E2E / smoke webhook + aprovação humana.

## Pré-requisitos

- Migração **`006_matches_api_schema.sql`** aplicada (`database-baseline.sh`).
- `WEBHOOK_SECRET` (≥32) em `.env` (gerado por `api-setup.sh` em instalações novas).

## Evidência local (automática) — 2026-04-13

Comando (exit 0):

```bash
cd services/fraghub-api && npm run build && npm test && npm run lint
```

Resultado: **tsc OK**, **Vitest** (incl. `matchWebhookPayloads.test.ts` — MatchZy `map_result`, Get5 `map_result` com players record, Get5 `series_end`), **ESLint OK**.

## Notas de implementação v1

- **Get5:** `map_result` (players array ou mapa) + **`series_end`** com `team*.stats.players` ou `team*.players`.
- **Admin `rawPayload`:** `GET /api/matches/:id?includeRaw=true` com Bearer admin (MATCHAPI-REQ-010).

## Gate Validate

**Pendente** — confirmar com UAT remoto (migração **006** + curl ao webhook) e aprovação explícita.
