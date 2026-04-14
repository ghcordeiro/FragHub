# steam-integration — Plan

> Fase **Plan** (SDD). Requisitos: `spec.md`. Decisão: `docs/adr/0007-steam-integration-openid-public-player.md`. Diagramas: `docs/architecture/steam-integration-context-l1.md`, `docs/architecture/steam-integration-container-l2.md`.

## 1. Objectivo

Entregar vinculação **Steam OpenID 2.0** a utilizadores já autenticados (`auth-api`), desvinculação self-service e admin, e **`GET /api/player/:steamid`** público com rate limit e cache — sobre Express + Knex existentes, sem nova migration obrigatória para `steam_id` (**STEAMINT-REQ-001**).

## 2. Componentes

| Componente | Responsabilidade | Ficheiros previstos (indicativos) |
|------------|------------------|-----------------------------------|
| Config / env | `STEAM_REALM`, `STEAM_RETURN_URL`, `STEAM_STATE_SECRET` + validação zod | `src/config/env.ts` |
| Serviço Steam OpenID | Montar redirect, `check_authentication`, parse SteamID64 | `src/services/steamOpenIdService.ts` |
| Serviço / repo utilizador | Ler/atualizar `steam_id`, conflitos UNIQUE | estender `src/services/userService.ts` ou `steamLinkService.ts` |
| Rotas Steam | `GET /auth/steam/link`, `GET /auth/steam/callback` | `src/routes/steam.ts` |
| Rotas jogador público | `GET /api/player/:steamid` | `src/routes/playerPublic.ts` ou `src/routes/player.ts` |
| Rotas admin | `DELETE /admin/players/:id/steam` | `src/routes/admin.ts` (extensão) ou dentro de router admin existente |
| Rate limit | 60/min no GET público | reutilizar `express-rate-limit` |
| Nível derivado | `level` a partir de `elo_rating` ou `null` | helper em serviço ou `src/utils/levelFromElo.ts` |

## 3. Integração

- Montar routers em `src/index.ts`: prefixo `/auth` para link/callback Steam (junto ao router auth ou router dedicado); `/api/player` para recurso público.
- Reutilizar `authMiddleware` / `requireRole` de `src/middleware/auth.ts`.
- Callback: redireccionar browser para `FRONTEND_URL` com query de sucesso/erro (alinhar mensagens à spec: 409 duplicado, state inválido, etc.).

## 4. Ordem de implementação sugerida

1. Env + `.env.example` (sem secrets).
2. Serviço OpenID (redirect + validação + timeout).
3. `GET /auth/steam/link` + `GET /auth/steam/callback` + persistência `steam_id`.
4. `DELETE /auth/steam/link`.
5. `GET /api/player/:steamid` + limiter + `Cache-Control`.
6. `DELETE /admin/players/:id/steam`.
7. Testes unitários (parsing SteamID64, state HMAC, resposta pública sem campos sensíveis) onde viável sem rede.

## 5. Riscos

| Risco | Mitigação |
|-------|-----------|
| Steam indisponível | 503 no callback; não alterar `steam_id` |
| Corrida em UNIQUE | Transação + tratamento erro 1062 / constraint |
| Scraping no endpoint público | Rate limit + cache curto |

## 6. Critérios de saída da Implement

Todos os **AC-001..AC-008** em `spec.md` com evidência em `validation.md`.
