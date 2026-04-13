# auth-api — Tasks (TDAD)

> **Backlog executável.** Marcar concluído só com evidência em `validation.md`. **Gate Plan → Tasks:** aguardar aprovação humana explícita antes de iniciar **I-xx**.

## Gates SDD

| Gate | Estado | Aprovador | Data |
|------|--------|-----------|------|
| Specify (`spec.md`) | Aprovado | utilizador | 2026-04-13 |
| Plan (`plan.md` + ADR-0006 + C4 L1/L2) | Aprovado | utilizador | 2026-04-13 |
| Tasks (abaixo) | Aprovado | utilizador | 2026-04-13 |
| Implement | Concluído no repo | — | 2026-04-12 |
| Validate | Em progresso (evidências parciais em `validation.md`) | — | 2026-04-12 |

---

### Par 1 — Schema

- **T-01**: Migration(ões) aplicam `google_id` + `refresh_tokens`; `schema_migrations` consistente; utilizadores existentes intactos (**AC-010**).
- **I-01**: Adicionar ficheiros SQL versionados em `scripts/installer/sql/database/` e integração com o fluxo de migrations existente.

### Par 2 — Configuração e dependências

- **T-02**: Servidor recusa arranque sem env obrigatórios (zod) — **AUTHAPI-NFR-003**.
- **I-02**: `src/config/env.ts`, `.env.example` atualizado (sem secrets), dependências npm acordadas.

### Par 3 — Core auth (email/senha)

- **T-03**: `POST /register`, `POST /login`, `POST /logout` cumprem AC-001, AC-002, AC-007 e NFR-001/002.
- **I-03**: Serviços user/token, rotas, hashing bcrypt, cookies refresh.

### Par 4 — Refresh e rotação

- **T-04**: `POST /auth/refresh` roda tokens; reuse revogado invalida sessões — **AC-003**, **AUTHAPI-REQ-007**.
- **I-04**: Persistência `refresh_tokens`, transação na rotação.

### Par 5 — Middlewares e admin

- **T-05**: `authMiddleware` + `requireRole` cobrem **AC-004**, **AC-005**, **AC-009**; testes **AUTHAPI-NFR-005**.
- **I-05**: `src/middleware/auth.ts`, rota admin create-user, testes unitários.

### Par 6 — Rate limit

- **T-06**: **AC-006** — 429 com `Retry-After` nos limites da spec.
- **I-06**: `express-rate-limit` por rota/IP.

### Par 7 — Google OAuth

- **T-07**: Fluxo manual ou automatizado valida **AC-008** e **AC-011** (state).
- **I-07**: Rotas `/auth/google`, callback, serviço OAuth, cookie state.

### Par 8 — Integração app

- **T-08**: `GET /health` continua OK; API sobe com systemd após alterações.
- **I-08**: `index.ts` monta rotas; build `tsc` + lint limpos.

## Dependências entre pares

`I-01` antes de persistência de tokens. `I-03`–`I-04` antes de `I-07` (OAuth cria utilizadores). `I-05` pode seguir `I-03`.

## Sumário para tracker

- **Feature:** `auth-api` (v0.3)
- **Plan:** `plan.md` + ADR `docs/adr/0006-auth-api-jwt-oauth-refresh.md` + C4 em `docs/architecture/auth-api-*.md`
- **Próximo:** fechar **Validate** — UAT/E2E contra AC-001…011 e `database-baseline` + `api-setup` num alvo Ubuntu; atualizar `validation.md` com outputs.
