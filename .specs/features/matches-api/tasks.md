# matches-api — Tasks (TDAD)

> **Gates:** aprovação humana explícita antes de avançar de fase. **Implement** com evidência em `validation.md`.

## Gates SDD

| Gate | Estado | Aprovador | Data |
|------|--------|-----------|------|
| Specify (`spec.md`) | Aprovado | utilizador | 2026-04-13 |
| Plan (`plan.md` + ADR-0008) | Aprovado | utilizador | 2026-04-13 |
| Tasks (abaixo) | Aprovado | utilizador | 2026-04-13 |
| Implement | Concluído no repo | — | 2026-04-13 |
| Validate | Aprovado — E2E smoke test passou; webhook funcionando | CTO | 2026-04-14 |

---

### Par 1 — Schema

- **T-01**: Migração `006` aplica colunas `matches`/`stats`, FK `stats.user_id` SET NULL, UNIQUE `(webhook_source, external_match_id)` — **MATCHAPI-REQ-001/002**, **NFR-002/003**.
- **I-01**: `006_matches_api_schema.sql` + `database-baseline.sh`.

### Par 2 — Config e limites

- **T-02**: Arranque exige `WEBHOOK_SECRET` ≥32; `DISCORD_WEBHOOK_URL` opcional — **NFR-001**, **REQ-007**.
- **I-02**: `env.ts`, `.env.example`, `api-setup.sh`, `test-env.ts`.

### Par 3 — Webhook

- **T-03**: Secret inválido → 401; MatchZy válido → 200 `{ matchId }`; duplicado → 409 — **AC-001/002/004**, **REQ-003/006**, **NFR-002–005**.
- **T-04**: Get5 (JSON `map_result`-like ou `series_end` mínimo) → 200 — **AC-003**.
- **I-03**: `matchWebhookPayloads` (zod) + `matchWebhookService` + `POST /api/matches/webhook` + limiter 10/min.

### Par 4 — Pós-processamento

- **T-05**: Após insert, stub `updateElo` loga; Discord opcional não quebra 200 — **REQ-007/008**, **AC-009**, **NFR-005**.
- **I-04**: `eloUpdateStub.ts`, `discordNotify.ts` (fetch + log).

### Par 5 — Leitura pública

- **T-06**: `GET /api/matches`, `GET /api/matches/:id` sem `raw_payload`; admin `includeRaw` — **AC-005/006/010**, **REQ-009/010**.
- **T-07**: `GET /api/players/:id/matches`, `GET /api/players/:id/stats` — **AC-007/008**, **REQ-011/012**.
- **I-05**: `routes/matches.ts` (+ montagem em `index.ts` antes de `players`).

### Par 6 — Qualidade

- **T-08**: Testes parser + `build`/`lint`/`test` verdes.
- **I-06**: `matchWebhookPayloads.test.ts` (samples MatchZy / Get5-like).

## Dependências

`I-01` → `I-03`; `I-02` paralelo após `I-01`; `I-05` após `I-03`; `I-06` no fim.

## Sumário para tracker

- **Feature:** `matches-api` (v0.3) — **encerrada** (Validate **2026-04-14**).
- **Artefactos:** `plan.md`, ADR `docs/adr/0008-matches-api-schema-webhook.md`, `validation.md`
- **Próximo (roadmap):** **v0.4** — `frontend-setup` (`.specs/features/frontend-setup/spec.md`; gate Specify conforme SDD).
