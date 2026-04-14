# ADR 0007 — Integração Steam (OpenID vinculação + endpoint público de jogador)

## Status

Aceite (fase Plan da feature `steam-integration`).

## Contexto

A Constituição exige **Steam OpenID** para **vinculação** (não como login principal; login continua em `auth-api`). Os plugins in-game precisam de **`GET /api/player/:steamid`** sem credenciais do portal. O modelo `users` já inclui `steam_id` nullable único (`database-baseline`).

## Decisão

1. **Protocolo** — **Steam OpenID 2.0** (`https://steamcommunity.com/openid/login`): redirect do utilizador autenticado; callback com parâmetros OpenID; validação obrigatória via **`openid.mode=check_authentication`** no mesmo endpoint (**STEAMINT-NFR-001**). Nunca persistir `steam_id` sem resposta `is_valid:true`.
2. **Rede** — Cliente HTTP (`fetch` nativo) para Steam com **timeout 5 s**; falha/timeout → **HTTP 503** com corpo alinhado à spec (**STEAMINT-NFR-002**).
3. **State anti-CSRF / binding** — Parâmetro `state` assinado com **HMAC-SHA256** (payload JSON ou string canónica) contendo `userId`, `nonce` aleatório e `exp` (10 minutos), codificado para URL; verificação no callback antes de atualizar `users.steam_id`. Segredo dedicado **`STEAM_STATE_SECRET`** (≥32 caracteres), distinto de `JWT_SECRET` (**STEAMINT-REQ-002**, **STEAMINT-REQ-009**).
4. **Realm e return_to** — `STEAM_REALM` e `STEAM_RETURN_URL` obrigatórios no startup (zod); `return_to` deve coincidir com a URL registada no fluxo OpenID enviada ao Steam.
5. **SteamID64** — Extrair identificador numérico de 17 dígitos a partir de `openid.claimed_id` (URL `…/openid/id/76561198…`); validar regex antes de gravar.
6. **Concorrência / duplicados** — Conflito por `UNIQUE(steam_id)` tratado como **409** alinhado a **STEAMINT-REQ-004**; verificação pré-update + tratamento de erro de constraint.
7. **Endpoint público** — `GET /api/player/:steamid` sem auth; resposta mínima `steamId`, `displayName`, `level`, `role`; `level` derivado de `elo_rating` quando existir coluna; caso contrário **`null`** até a feature `elo-system` (**STEAMINT-REQ-006**). Header **`Cache-Control: max-age=60`** (**STEAMINT-NFR-004**).
8. **Rate limit** — **60 req/min por IP** no endpoint público (**STEAMINT-REQ-008**), padrão alinhado a `express-rate-limit` na API existente.
9. **Admin** — `DELETE /admin/players/:id/steam` com `authMiddleware` + `requireRole('admin')` (**STEAMINT-REQ-007**), reutilizando o mesmo stack de `auth-api`.

## Consequências

- Não se usa **Steam Web API** nesta feature (fora de escopo na spec).
- Dependência runtime dos servidores Valve; indisponibilidade reflete-se em 503 no callback, não afeta login email/Google.
- O frontend (`auth-ui`) deverá iniciar o fluxo com **Bearer** válido em `GET /auth/steam/link` e tratar redirects de sucesso/erro para `FRONTEND_URL`.

## Relações

- Depende de: ADR-0005, ADR-0006, `database-baseline`, coluna `users.steam_id` existente.
- Habilita: `players-api`, plugins (tags / fila), `matchmaking-queue` (futuro).
