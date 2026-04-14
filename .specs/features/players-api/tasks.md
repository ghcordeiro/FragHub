# players-api — Tasks (TDAD)

> **Gates:** aprovação humana explícita antes de avançar de fase. **Implement** só com evidência em `validation.md`.  
> **Nota:** endpoint plugin consolidado em `services/fraghub-api/src/routes/players.ts` (evolução face à entrega inicial em `steam-integration`).

## Gates SDD

| Gate | Estado | Aprovador | Data |
|------|--------|-----------|------|
| Specify (`spec.md`) | Aprovado | utilizador | 2026-04-13 |
| Plan | *Não requerido* (`PLANNING.md`: Medium — sem ADR obrigatória listada) | — | — |
| Tasks (abaixo) | Aprovado | utilizador | 2026-04-13 |
| Implement | Concluído no repo | — | 2026-04-13 |
| Validate | Aprovado | utilizador | 2026-04-13 |

---

### Par 1 — Schema banimento

- **T-01**: Migration adiciona `banned_at`, `banned_reason` em `users`; instalação idempotente — **PLAYAPI-REQ-006**. Índice `steam_id`: já coberto por `uq_users_steam_id` (**PLAYAPI-NFR-004**).
- **I-01**: Novo ficheiro SQL em `scripts/installer/sql/database/` + registo em pipeline de migrações usado pela API (Knex ou equivalente existente).

### Par 2 — Auth e visibilidade banidos

- **T-02**: Utilizador com `banned_at` set e JWT válido → **401** `{ "error": "Account banned" }` — **PLAYAPI-REQ-006**. Listagens / perfil público / plugin: banido → **404** — **PLAYAPI-NFR-003**.
- **I-02**: Ajuste `authMiddleware` (e queries públicas) conforme spec.

### Par 3 — Listagem pública

- **T-03**: `GET /api/players` 200, envelope `{ data, meta }`, query validada (zod), `sort`/`page`/`limit` — **PLAYAPI-REQ-001**, **007**, **009**, **AC-001**, **AC-005**.
- **I-03**: Router + validação + Knex (excluir `banned_at IS NOT NULL`).

### Par 4 — Perfil por id

- **T-04**: `GET /api/players/:id` 200 com stats agregados; 404 se inexistente ou banido — **PLAYAPI-REQ-002**, **AC-002**, **NFR-002/003**.
- **I-04**: Handler + join/agregação `stats` + DTO sem campos sensíveis.

### Par 5 — Perfil próprio

- **T-05**: `PATCH /api/players/me` autenticado atualiza `displayName`; 401 sem auth; 422 validação — **PLAYAPI-REQ-004**, **AC-003**, **AC-008**.
- **I-05**: Rota + sanitização + zod body.

### Par 6 — Banimento admin

- **T-06**: `DELETE /api/players/:id` admin: soft ban + revogar `refresh_tokens`; 403 auto-ban — **PLAYAPI-REQ-005**, **AC-004**, **AC-007**.
- **I-06**: Rota `requireRole('admin')` + transação ou sequência segura.

### Par 7 — Endpoint plugin (consolidação)

- **T-07**: `GET /api/player/:steamid` alinhado a **PLAYAPI-REQ-003**, **PLAYAPI-NFR-001–003**, **AC-006**; nível calculado (**PLAYAPI-REQ-008**).
- **I-07**: `routes/players.ts` — `level` a partir de `elo_rating`, banidos excluídos no endpoint plugin.

### Par 8 — Util nível (reuso)

- **T-08**: Função de mapeamento ELO → nível 1–10 testada unitariamente — **PLAYAPI-REQ-008**.
- **I-08**: `src/utils/elo.ts` (ou nome acordado com convenção do repo) + testes; substituir uso pontual de `levelFromEloRating` onde a spec mandar.

### Par 9 — Qualidade

- **T-09**: `npm run build` + `lint` + `test` verdes; `/health` intacto.
- **I-09**: `index.ts` monta rotas sem conflitos; smoke em `validation.md`.

## Dependências entre pares

`I-01` antes de `I-02`–`I-07`. `I-08` pode paralelizar com `I-03`/`I-04` após `I-01`. `I-07` depende de `I-02` (filtro banidos) e idealmente `I-08` (nível).

## Sumário para tracker

- **Feature:** `players-api` (v0.3)
- **Artefactos:** `spec.md`; Plan formal omitido pelo planeamento do projeto; ADRs só se surgir decisão arquitetural durante Implement.
- **Estado:** feature encerrada SDD **2026-04-13** (todos os gates, incl. **Validate**).
