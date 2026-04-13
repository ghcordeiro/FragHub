# ADR 0006 — Autenticação na API (JWT, refresh rotativo, Google OAuth)

## Status

Proposto (fase Plan da feature `auth-api`).

## Contexto

A Constituição fixa login por **Google OAuth** e **email/senha**, **JWT access + refresh**, cookies **httpOnly** / **secure** / **sameSite**, e roles **player** / **admin**. A API em `/opt/fraghub/api` (ADR-0005) já expõe Express + Knex + MariaDB; falta o módulo de auth sem violar o modelo de dados existente (`users` com `steam_id`, sem `google_id` até nova migration).

## Decisão

1. **Algoritmo e segredos** — Access e refresh JWT assinados com **HS256**; segredos distintos `JWT_SECRET` e `JWT_REFRESH_SECRET` (mínimo 32 caracteres), validados no startup (**AUTHAPI-NFR-003** / zod).
2. **Armazenamento de refresh** — Tabela `refresh_tokens`: persistir apenas **hash SHA-256** do JWT de refresh; rotação a cada `POST /auth/refresh`; reuse de token revogado dispara **revogação em massa** do utilizador (**AUTHAPI-REQ-007**).
3. **Senhas locais** — **bcrypt** (cost 12) para `password_hash`; mensagens genéricas em falhas de login (**AUTHAPI-NFR-002**).
4. **Google OAuth 2.0** — Authorization Code flow; `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`; callback valida **state** anti-CSRF (**AUTHAPI-REQ-014**). Pós-sucesso: redirecionar para `FRONTEND_URL` com access token em query **apenas** conforme spec (trade-off documentado; mitigar TTL curto e uso único).
5. **Transporte de refresh** — Cookie httpOnly, `path: /auth`, `sameSite: strict`, `secure` quando `NODE_ENV=production` (**AUTHAPI-NFR-004**).
6. **Rate limiting** — `express-rate-limit` com limites por IP definidos na spec para register/login/refresh (**AUTHAPI-REQ-010**).
7. **Schema** — Nova migration(ões) SQL sob `scripts/installer/sql/database/` para `google_id` + `refresh_tokens`, registadas pelo pipeline existente de migrations (**AUTHAPI-REQ-013**).

## Consequências

- **Steam** continua em feature à parte; `steam_id` na tabela `users` não é preenchido por `auth-api`.
- **Rotação de segredo JWT** invalida todos os access tokens imediatamente (sem grace period nesta versão).
- O redirect com token na query para o frontend exige coordenação com `frontend-setup` / `auth-ui` para troca imediata por sessão segura no cliente.

## Relações

- Depende de: ADR-0005 (bootstrap API), `database-baseline`, **AUTH** na Constituição.
- Habilita: `steam-integration`, `players-api`, `auth-ui`.
