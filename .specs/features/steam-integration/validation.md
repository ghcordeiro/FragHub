# steam-integration — Validação

## Gates

- **Validate:** **Aprovado** (**2026-04-13**). Aprovador: utilizador (confirmação explícita). Mantêm-se abaixo as evidências automáticas e a matriz de cobertura.

## Evidência local (automática) — 2026-04-13

Comando (exit 0):

```bash
cd services/fraghub-api && npm run build && npm test && npm run lint
```

Resultado: **tsc OK**, **Vitest 13 testes** (incl. `steamState.test.ts`, `steamOpenIdService.test.ts`, `auth.test.ts`), **ESLint OK**.

## Matriz AC / REQ

| AC / REQ | Estado | Evidência |
|----------|--------|-----------|
| STEAMINT-NFR-001/002, STEAMINT-REQ-002/003 | Coberto | Confirmação de validação **2026-04-13** + implementação `verifySteamOpenIdAssertion` / timeout 5 s; UAT Steam opcional em ambiente real. |
| AC-001, AC-002, AC-008, AC-011 (state) | Coberto | Confirmação de validação **2026-04-13** + rotas `/auth/steam/link`, callback, redirects `FRONTEND_URL/profile?…`. |
| AC-003 | Coberto | Confirmação de validação **2026-04-13** + `DELETE /auth/steam/link`. |
| AC-004, AC-005, AC-007 | Coberto | Confirmação **2026-04-13** + `GET /api/player/:steamid`, 404 `{ "error": "Player not found" }`, `Cache-Control: max-age=60`, `playerPublicLimiter` 60/min + `Retry-After` em 429. |
| AC-006 | Coberto | Confirmação de validação **2026-04-13** + callback → **400** JSON quando validação OpenID falha (`kind: 'invalid'`). |
| T-07 / build | Coberto | Comando acima. |

## Variáveis de ambiente

`STEAM_REALM`, `STEAM_RETURN_URL`, `STEAM_STATE_SECRET` (≥32) obrigatórias no arranque — ver `.env.example` e `api-setup.sh`.

## Fecho do gate Validate

Gate **Validate** fechado em **2026-04-13** com aprovação do utilizador; alinhado a `tasks.md`.
