# steam-integration — Tasks (TDAD)

> Marcar **Implement** só com evidência em `validation.md`. **Gates:** aprovação humana explícita antes de avançar de fase.

## Gates SDD

| Gate | Estado | Aprovador | Data |
|------|--------|-----------|------|
| Specify (`spec.md`) | Aprovado | utilizador | 2026-04-13 |
| Plan (`plan.md` + ADR-0007 + C4 L1/L2) | Aprovado | utilizador | 2026-04-13 |
| Tasks (abaixo) | Aprovado | utilizador | 2026-04-13 |
| Implement | Concluído no repo | — | 2026-04-13 |
| Validate | Aprovado | utilizador | 2026-04-13 |

---

### Par 1 — Configuração

- **T-01**: Arranque falha sem `STEAM_REALM`, `STEAM_RETURN_URL`, `STEAM_STATE_SECRET` válidos — **STEAMINT-REQ-009**.
- **I-01**: Estender `src/config/env.ts` + `.env.example` (placeholders, sem secrets).

### Par 2 — OpenID e vinculação

- **T-02**: Fluxo manual ou E2E: utilizador autenticado segue link Steam e `users.steam_id` fica preenchido — **AC-001**, **STEAMINT-REQ-002/003/004**, **STEAMINT-NFR-001/002**.
- **I-02**: `steamOpenIdService` + rotas `GET /auth/steam/link`, `GET /auth/steam/callback`; redirects para `FRONTEND_URL` em sucesso/erro.

### Par 3 — Desvinculação

- **T-03**: `DELETE /auth/steam/link` limpa `steam_id` e retorna 204; sem Steam → 404 — **AC-003**, **STEAMINT-REQ-005**.
- **I-03**: Rota + serviço Knex.

### Par 4 — Endpoint público

- **T-04**: `GET /api/player/:steamid` 200/404, sem campos sensíveis, cache e rate limit — **AC-004**, **AC-005**, **AC-007**, **STEAMINT-REQ-006/008**, **STEAMINT-NFR-003/004**.
- **I-04**: Router público + limiter + projeção DTO; `level` null se sem `elo_rating`.

### Par 5 — Callback inválido e duplicado

- **T-05**: Callback com assinatura inválida → 400 sem alterar DB — **AC-006**. Steam já vinculado a outro user → **AC-002** / 409.
- **I-05**: Testes unitários ou integração leve para parse/validação onde não exigir rede Steam.

### Par 6 — Admin

- **T-06**: Admin remove Steam de qualquer utilizador — **AC-008**, **STEAMINT-REQ-007**.
- **I-06**: `DELETE /admin/players/:id/steam` + `requireRole('admin')`.

### Par 7 — Integração app

- **T-07**: `GET /health` intacto; `npm run build` + `lint` + `test` verdes.
- **I-07**: `index.ts` monta rotas; smoke documentado em `validation.md`.

## Dependências entre pares

`I-01` antes de `I-02`. `I-02` antes de `I-03`–`I-06`. `I-04` pode seguir `I-01` em paralelo com `I-02` após env estável.

## Sumário para tracker

- **Feature:** `steam-integration` (v0.3)
- **Artefactos:** `plan.md`, ADR `docs/adr/0007-steam-integration-openid-public-player.md`, C4 `docs/architecture/steam-integration-*-l*.md`
- **Próximo (roadmap v0.3):** feature **`players-api`** — Specify (gate) → Plan/Tasks → Implement → Validate.
