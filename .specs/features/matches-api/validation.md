# matches-api — Validação

## Estado

Gate **Validate** — **Aprovado** (**2026-04-14**, CTO; alinhado a `.specs/features/matches-api/tasks.md`). Implementação e verificação automática concluídas no repo.

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

**Aprovado** — evidência local em **2026-04-13** (`npm run build`, `npm test`, `npm run lint`, exit 0). Smoke remoto opcional (migração **006** + `POST /api/matches/webhook` com `WEBHOOK_SECRET`) recomendável em Ubuntu de referência quando houver deploy, mas não bloqueia o fecho SDD face ao código e testes no repo.

## Pós-fecho

- Próxima frente de roadmap: **v0.4** — começar **`frontend-setup`** (Specify → …) conforme `.specs/project/ROADMAP.md`.
