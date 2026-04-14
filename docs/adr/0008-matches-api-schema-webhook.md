# ADR 0008 — Schema de partidas, webhook MatchZy/Get5 e idempotência

## Status

Aceite (2026-04-13).

## Contexto

A feature `matches-api` precisa de:

- colunas em `matches` e `stats` alinhadas ao spec (placar, vencedor, payload bruto, fonte do webhook);
- `POST /api/matches/webhook` com segredo partilhado e idempotência por `(webhook_source, external_match_id)`;
- `user_id` opcional em `stats` quando a Steam do jogador não está vinculada em `users`.

O baseline v0.2 criou `matches` e `stats` com um subconjunto mínimo de colunas.

## Decisão

1. **Migração versionada `006`** — alterações aditivas em `matches` e `stats`; FK `stats.user_id` passa a `ON DELETE SET NULL` e `user_id` nullable; índice composto `(match_id, steam_id)` em `stats`; `UNIQUE (webhook_source, external_match_id)` em `matches` para NFR de idempotência.
2. **Segredo do webhook** — variável `WEBHOOK_SECRET` (≥32 caracteres), header `X-Fraghub-Secret`; não registado em logs em produção.
3. **Discord** — `DISCORD_WEBHOOK_URL` opcional; falhas isoladas com try/catch (não falham o webhook).
4. **ELO** — função `updateElo(matchId)` stub até existir `elo-system`.

## Consequências

- Instaladores que já correram `database-baseline` precisam aplicar `006` (re-run baseline ou migração isolada).
- Plugins devem enviar `matchid` estável por mapa/série para o par `external_match_id` acordado no Plan (ex.: `matchid-mapN` para MatchZy).
