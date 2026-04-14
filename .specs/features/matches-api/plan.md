# matches-api — Plan (payloads + modelo interno)

> Complementa `spec.md`. **ADR:** `docs/adr/0008-matches-api-schema-webhook.md`.

## Modelo interno normalizado (após parse)

- `game`: `cs2` \| `csgo` (MatchZy → `cs2`; Get5 → `csgo`).
- `map`: nome do mapa (ex. `de_inferno`).
- `team1Score` / `team2Score`: placar do mapa.
- `winner`: `team1` \| `team2` \| `draw`.
- `durationSeconds` \| `serverIp`: opcionais.
- `externalMatchId`: string única por fonte — **MatchZy `map_result`:** `String(matchid) + '-' + String(map_number)`; **Get5 JSON `map_result` / equivalente:** `String(matchid) + '-' + (map_name ou mapNumber)` quando `matchid` existir; se só `series_end` agregar série inteira, usar `String(matchid) + '-series'` apenas quando o payload trouxer placar agregado único (v1 aceita `map_result`-like JSON; `series_end` genérico pode exigir evolução).
- `playedAt`: ISO ou `NOW()` se ausente.
- `players[]`: `{ steamId64, team, kills, deaths, assists, headshots, mvps, score, pingAvg? }`.

## MatchZy — evento `map_result`

Referência: [MatchZy Events — map_result](https://shobhit-pathak.github.io/MatchZy/events.html).

Campos usados no parser v1:

| Campo | Uso |
|--------|-----|
| `event` | literal `map_result` |
| `matchid` | número → parte de `externalMatchId` |
| `map_number` | número → parte de `externalMatchId` |
| `team1.score` / `team2.score` | placar |
| `team1.players[]` / `team2.players[]` | lista de jogadores |
| `players[].steamid` | SteamID64 (string) |
| `players[].name` | nome (não persistido em `stats`; útil para Discord) |
| `players[].stats.kills` / `deaths` / `assists` | ints (defaults 0) |
| `players[].stats.headshots` / `mvp` | opcionais → `headshots` / `mvps` |
| `players[].stats.score` | campo `score` em `stats` |
| `winner.team` | `team1` \| `team2`; se ausente, derivar dos scores |
| `map_name` (se existir no payload) ou inferência futura | `map`; fallback `unknown` se vazio |

## Get5 (CS:GO) — HTTP JSON

Get5 envia vários eventos; o spec cita `series_end`. Na prática muitas instalações expõem JSON semelhante a `map_result` com `event` e `team1` / `team2`.

Parser v1:

1. Se `event === 'map_result'` e estrutura espelha MatchZy (scores + `players` array ou objeto SteamID → stats), **reutilizar** o mesmo normalizador com `game: 'csgo'` e `webhook_source: 'get5'`.
2. Se `event === 'series_end'`: aceitar `team{1,2}.stats.players` **ou** `team{1,2}.players` (array ou mapa SteamID→stats); `series_score` ou `score` para placar da série; `external_match_id` interno `{matchid}-series`; `map_name` opcional (default `series`).

## Respostas HTTP (webhook)

- **200** `{ matchId }` — ID interno `matches.id`.
- **401** — segredo inválido ou ausente.
- **400** — Zod / payload incompleto.
- **409** — violação `uq_matches_webhook_external`.
- **500** — falha na transação após validação.

## Query pública `includeRaw`

- `GET /api/matches/:id?includeRaw=true` apenas com JWT admin (`authMiddleware` + `requireRole('admin')`).
