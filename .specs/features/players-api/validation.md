# players-api — Validação

## Pré-requisitos (ambiente)

- Aplicar migração **`005_players_api_users_ban_elo`** (instalador: `database-baseline.sh` inclui `005|…`); a API espera colunas `elo_rating`, `banned_at`, `banned_reason` em `users`.

## Evidência local (automática) — 2026-04-13

Comando (exit 0):

```bash
cd services/fraghub-api && npm run build && npm test && npm run lint
```

Resultado: **tsc OK**, **Vitest** (incl. `elo.test.ts`, `auth.test.ts` — banido → `401` / `Account banned`), **ESLint OK**.

## E2E Ubuntu (ssh-ubuntu-e2e) — **2026-04-13** (PASS)

Comando (repo local → `ranch@192.168.1.200`, `REMOTE_DIR=/home/ranch/FragHub`):

```bash
bash .cursor/skills/ssh-ubuntu-e2e/scripts/run-e2e-remote.sh \
  --remote-dir /home/ranch/FragHub \
  --rerun --reset-database-baseline --reset-api-step
```

Resultado: **exit 0** (~3,7 min).

- **Migração 005:** aplicada no remoto — log: `Migracao aplicada: 005 (players_api_ban_elo).`
- **API:** `npm run lint` + `npm run build` no remoto; `fraghub-api.service` e porta **3001** OK.
- **Idempotência:** segundo `install.sh` (rerun) concluiu com etapas já feitas (pulando).
- **Smoke auth-api (curl no Ubuntu):** `Smoke auth-api OK (health, register, login negativo, login, refresh, logout, refresh revogado).`

*Nota anterior (rede indisponível no ambiente do agente) substituída após SSH reestabelecido.*

## Matriz AC / REQ (resumo)

| AC / REQ | Estado | Evidência |
|----------|--------|-----------|
| PLAYAPI-REQ-001, 007, 009, AC-001, AC-005 | Implementado | `GET /api/players` + zod query + envelope `data`/`meta`. |
| PLAYAPI-REQ-002, AC-002 | Implementado | `GET /api/players/:id` + stats agregados de `stats`; banido → 404. |
| PLAYAPI-REQ-003, AC-006, NFR-001–003 | Implementado | `GET /api/player/:steamid` em `routes/players.ts` + limiter + `level` via `utils/elo.ts`. |
| PLAYAPI-REQ-004, AC-003, AC-008 | Implementado | `PATCH /api/players/me` + validação 422. |
| PLAYAPI-REQ-005, AC-004, AC-007 | Implementado | `DELETE /api/players/:id` (admin) + transação ban + `revokeAllForUser`. |
| PLAYAPI-REQ-006 | Implementado | SQL `005` + `authMiddleware` banido. |
| PLAYAPI-REQ-008 | Implementado | `src/utils/elo.ts` + testes unitários. |

## Gate Validate

**Aprovado** (**2026-04-13**). Aprovador: utilizador (confirmação explícita). Evidências: secções *Evidência local* e *E2E Ubuntu* acima; alinhado a `tasks.md`.
