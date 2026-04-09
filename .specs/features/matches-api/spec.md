# Matches API - Especificacao da Feature

## Summary
Endpoints REST para listagem e consulta de partidas, recebimento de resultados via webhook do MatchZy (CS2) e Get5 (CS:GO), e consulta de historico e stats agregadas por jogador.

## System Process Context

### Recepcao de Resultado via Webhook
1. Partida termina no servidor CS2 (MatchZy) ou CS:GO (Get5)
2. Plugin envia `POST /api/matches/webhook` com payload de resultado e header `X-Fraghub-Secret`
3. Sistema valida o shared secret no header
4. Sistema detecta o formato do payload (MatchZy ou Get5) e normaliza para estrutura interna
5. Sistema insere a partida na tabela `matches` e as stats individuais na tabela `stats`
6. Sistema calcula delta de ELO (stub — quando `elo-system` existir, dispara atualizacao real)
7. Sistema envia notificacao Discord via webhook (se `DISCORD_WEBHOOK_URL` configurado)
8. Sistema retorna HTTP 200

### Consulta de Partidas
1. Cliente envia `GET /api/matches` com parametros de paginacao e filtros opcionais
2. Sistema consulta tabela `matches` com JOIN em `stats` e `users`
3. Sistema retorna lista paginada de partidas com dados basicos

### Consulta de Detalhes de Partida
1. Cliente envia `GET /api/matches/:id`
2. Sistema busca partida por ID com todas as stats de jogadores
3. Sistema retorna detalhes completos da partida

### Consulta de Historico de Jogador
1. Cliente envia `GET /api/players/:id/matches`
2. Sistema busca partidas em que o jogador participou (via tabela `stats`)
3. Sistema retorna historico paginado

### Consulta de Stats Agregadas de Jogador
1. Cliente envia `GET /api/players/:id/stats`
2. Sistema agrega dados da tabela `stats` para o jogador
3. Sistema retorna totais, medias e percentuais calculados

## Personas
- **Jogador**: quer ver historico de partidas, seus stats e o historico de outros jogadores para comparar desempenho
- **Visitante Anonimo**: pode navegar pelo historico de partidas e perfis publicos sem autenticacao
- **Admin**: precisa visualizar todas as partidas registradas, inclusive as com possivel erro de registro
- **Plugin MatchZy/Get5**: envia resultado de partida automaticamente ao termino via webhook HTTP POST
- **Sistema de Ranking**: consome os resultados das partidas para atualizar ELO (feature futura `elo-system`)

## Requisitos Funcionais

### MATCHAPI-REQ-001 - Estrutura da Tabela matches
A tabela `matches` deve conter no minimo: `id` (PK auto-increment), `game` (ENUM 'cs2', 'csgo'), `map` (VARCHAR 64), `team1_score` (TINYINT), `team2_score` (TINYINT), `winner` (ENUM 'team1', 'team2', 'draw'), `duration_seconds` (INT, nullable), `server_ip` (VARCHAR 45, nullable), `webhook_source` (ENUM 'matchzy', 'get5'), `raw_payload` (JSON — payload original preservado para auditoria), `played_at` (DATETIME), `created_at` (DATETIME). Migration versionada obrigatoria.

### MATCHAPI-REQ-002 - Estrutura da Tabela stats
A tabela `stats` deve conter no minimo: `id` (PK auto-increment), `match_id` (FK `matches.id`, ON DELETE CASCADE), `user_id` (FK `users.id`, ON DELETE SET NULL), `steam_id` (VARCHAR 20 — preservado mesmo se usuario for removido), `team` (ENUM 'team1', 'team2'), `kills` (INT), `deaths` (INT), `assists` (INT), `headshots` (INT), `mvps` (INT), `score` (INT), `ping_avg` (SMALLINT, nullable), `created_at` (DATETIME). Indice composto em `(match_id, steam_id)`.

### MATCHAPI-REQ-003 - POST /api/matches/webhook (Recepcao de Resultado)
Endpoint interno que recebe resultados de partida. Autenticacao: header `X-Fraghub-Secret` deve corresponder ao valor de `WEBHOOK_SECRET` no `.env` — se ausente ou incorreto, retornar HTTP 401. O endpoint deve: (1) detectar o formato do payload (MatchZy ou Get5); (2) normalizar para a estrutura interna; (3) inserir em `matches` e `stats` dentro de uma transacao de banco; (4) resolver `user_id` a partir de `steam_id` para cada jogador (pode ser NULL se Steam nao estiver vinculada); (5) retornar HTTP 200 com `{ matchId }` em caso de sucesso.

### MATCHAPI-REQ-004 - Formato MatchZy (CS2)
O sistema deve aceitar o payload do evento `map_result` do MatchZy. Campos esperados no payload MatchZy (a confirmar no Plan): `matchid`, `map_number`, `map_name`, `team1: { name, score, players: [...] }`, `team2: { ... }`. Cada jogador deve incluir `steamid64`, `kills`, `deaths`, `assists`, `headshots`, `mvps`, `score`. O mapeamento completo deve ser documentado no Plan desta feature. A spec define apenas que o formato deve ser suportado.

### MATCHAPI-REQ-005 - Formato Get5 (CS:GO)
O sistema deve aceitar o payload do evento `series_end` do Get5. Campos esperados (a confirmar no Plan): `matchid`, `map_name`, `team1: { name, series_score, stats: { players: [...] } }`, `team2: { ... }`. O mapeamento completo deve ser documentado no Plan desta feature.

### MATCHAPI-REQ-006 - Preservacao do Payload Original
O campo `raw_payload` (JSON) na tabela `matches` deve armazenar o payload original recebido do webhook integralmente, sem modificacao. Isso permite auditoria e reprocessamento futuro caso o mapeamento seja corrigido.

### MATCHAPI-REQ-007 - Notificacao Discord
Se a variavel de ambiente `DISCORD_WEBHOOK_URL` estiver configurada, o sistema deve enviar uma notificacao para o webhook Discord apos registrar uma partida com sucesso. O formato da mensagem deve conter: mapa, placar, resultado e top fragger. Em caso de falha no envio Discord, o sistema deve logar o erro mas nao retornar erro no webhook de partida (o registro da partida nao deve depender do Discord).

### MATCHAPI-REQ-008 - Stub de Atualizacao de ELO
Apos registrar a partida, o sistema deve chamar uma funcao `updateElo(matchId)` que, nesta versao, apenas loga `"ELO update pending: matchId={id}"` e retorna sem fazer nada. Quando a feature `elo-system` for implementada, esta funcao sera substituida pela logica real. A integracao deve estar estruturada para permitir substituicao sem refatoracao do webhook.

### MATCHAPI-REQ-009 - GET /api/matches (Listagem Publica)
Endpoint publico com paginacao. Parametros: `page`, `limit` (max 50), `game` (filtro: `cs2` ou `csgo`), `map` (filtro por nome de mapa). Cada item da lista retorna: `id`, `game`, `map`, `team1Score`, `team2Score`, `winner`, `durationSeconds`, `playedAt`, `playerCount`. Nao retornar `raw_payload` na listagem.

### MATCHAPI-REQ-010 - GET /api/matches/:id (Detalhes da Partida)
Endpoint publico que retorna partida completa. Alem dos campos basicos, retornar array `players` com stats individuais de cada jogador: `steamId`, `displayName` (nullable), `team`, `kills`, `deaths`, `assists`, `headshots`, `mvps`, `score`, `kdr` (calculado). Nao retornar `raw_payload` no response padrao — disponivel apenas para admins via query param `?includeRaw=true` com autenticacao admin.

### MATCHAPI-REQ-011 - GET /api/players/:id/matches (Historico de Partidas)
Endpoint publico com paginacao. Retorna partidas em que o jogador participou, ordenadas por `played_at DESC`. Cada item inclui o resultado da partida e as stats do jogador naquela partida. Parametros: `page`, `limit` (max 50), `game`.

### MATCHAPI-REQ-012 - GET /api/players/:id/stats (Stats Agregadas)
Endpoint publico que retorna stats totais e medias do jogador: `matchesPlayed`, `wins`, `losses`, `draws`, `kills`, `deaths`, `assists`, `headshots`, `mvps`, `kdr` (calculado), `hsPercent` (calculado), `avgKillsPerMatch` (calculado). Retornar HTTP 404 se usuario nao encontrado.

## Requisitos Nao Funcionais

### MATCHAPI-NFR-001 - Seguranca do Webhook
O endpoint `POST /api/matches/webhook` nao deve ser acessivel publicamente sem o shared secret. O secret deve ter no minimo 32 caracteres aleatorios. O header deve ser `X-Fraghub-Secret` e nao deve ser logado em producao.

### MATCHAPI-NFR-002 - Transacao Atomica no Registro
A insercao de uma partida (tabela `matches`) e suas stats (tabela `stats`) deve ocorrer dentro de uma unica transacao Knex. Se qualquer parte falhar, toda a transacao deve ser revertida e o webhook deve retornar HTTP 500 com mensagem de erro.

### MATCHAPI-NFR-003 - Idempotencia do Webhook
O endpoint deve prevenir insercao duplicada de partidas pelo mesmo `matchid` do plugin. O campo `webhook_source` + `matchid` (armazenado em coluna separada) deve ter constraint UNIQUE na tabela `matches` para rejeitar duplicatas com HTTP 409.

### MATCHAPI-NFR-004 - Rate Limiting no Webhook
O endpoint de webhook deve ter rate limiting de 10 req/IP/min para prevenir abuso mesmo com autenticacao por secret. Servidores de jogo legitimos nunca devem exceder este limite.

### MATCHAPI-NFR-005 - Nao Bloquear em Erros de Servicos Externos
Falhas no envio de notificacoes Discord ou na chamada ao stub de ELO nao devem propagar excecao para o handler do webhook. Usar try/catch com logging de erros.

## Criterios de Aceitacao

- **AC-001**: `POST /api/matches/webhook` sem header `X-Fraghub-Secret` retorna HTTP 401
- **AC-002**: `POST /api/matches/webhook` com payload MatchZy valido e secret correto insere partida e stats no banco e retorna HTTP 200 com `{ matchId }`
- **AC-003**: `POST /api/matches/webhook` com payload Get5 valido e secret correto insere partida e stats no banco e retorna HTTP 200 com `{ matchId }`
- **AC-004**: Envio do mesmo `matchid` duas vezes no webhook retorna HTTP 409 na segunda chamada sem duplicar dados no banco
- **AC-005**: `GET /api/matches` retorna HTTP 200 com lista paginada; campo `raw_payload` nao aparece no response
- **AC-006**: `GET /api/matches/:id` retorna HTTP 200 com array `players` contendo kills, deaths e kdr calculado de cada jogador
- **AC-007**: `GET /api/players/:id/matches` retorna historico paginado ordenado por `playedAt DESC`
- **AC-008**: `GET /api/players/:id/stats` retorna `kdr` e `hsPercent` calculados corretamente a partir dos totais de kills/deaths/headshots
- **AC-009**: Se `DISCORD_WEBHOOK_URL` configurado, apos registro de partida bem-sucedido o Discord recebe notificacao; falha no Discord nao impede o retorno HTTP 200 do webhook
- **AC-010**: Admin autenticado acessando `GET /api/matches/:id?includeRaw=true` recebe o campo `rawPayload` com o payload original; usuario comum nao recebe este campo

## Out of Scope (esta feature)
- Calculo e persistencia de atualizacao de ELO (stub apenas — responsabilidade da feature `elo-system`)
- Sistema de queue e criacao de partidas (matchmaking)
- Download de demos gravadas
- Live score / acompanhamento de partida em tempo real
- Revisao manual ou contestacao de resultado de partida
- Integracao com SourceBans++ para banimentos in-game automaticos baseados em comportamento

## Dependencias
- `players-api`: tabela `users` com `steam_id`, endpoint `/api/players/:id` disponivel; `authMiddleware` e `requireRole` disponiveis
- `database-baseline` (v0.2): tabelas `matches` e `stats` definidas com schema base — esta feature adiciona colunas adicionais via migration versionada
- `api-setup`: conexao Knex configurada, suporte a transacoes disponivel

## Riscos Iniciais
- **Divergencia de formato MatchZy vs Get5**: os payloads de resultado podem ter estruturas significativamente diferentes — o Plan deve mapear ambos os formatos antes da implementacao para evitar retrabalho no mapeamento
- **Steam ID nao vinculado**: jogadores que nao vincularam Steam ao FragHub terao `user_id = NULL` na tabela `stats` — o sistema deve suportar este caso sem erros, preservando apenas o `steam_id`
- **Webhook sem autenticacao mutua**: o servidor de jogo envia o webhook sem TLS mutuo — o shared secret e a unica barreira; se o servidor de jogo for comprometido, resultados podem ser forjados
- **Payload malformado do plugin**: plugins mal configurados podem enviar payloads incompletos ou com campos faltando — o sistema deve validar o payload com zod e retornar HTTP 400 com detalhes do erro de validacao
- **Coluna external_match_id para idempotencia**: a constraint UNIQUE para prevencao de duplicatas requer uma coluna `external_match_id` (VARCHAR 255) na tabela `matches` — a migration deve criá-la com indice UNIQUE composto de `(webhook_source, external_match_id)`
