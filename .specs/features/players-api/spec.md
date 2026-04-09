# Players API - Especificacao da Feature

## Summary
Endpoints REST para listagem publica de jogadores, visualizacao de perfis, atualizacao do proprio perfil e gerenciamento administrativo de contas, com rate limiting no endpoint publico por Steam ID.

## System Process Context

### Listagem de Jogadores
1. Cliente (anonimo ou autenticado) envia `GET /api/players` com parametros opcionais de paginacao
2. Sistema consulta tabela `users` retornando apenas campos publicos com paginacao
3. Sistema retorna lista paginada com metadados de paginacao

### Visualizacao de Perfil por ID
1. Cliente envia `GET /api/players/:id`
2. Sistema busca usuario por `id` na tabela `users`
3. Sistema agrega stats da tabela `stats` para o usuario
4. Sistema retorna perfil publico com stats e historico resumido

### Consulta por Steam ID (Plugins)
1. Plugin in-game envia `GET /api/player/:steamid` no momento em que jogador conecta
2. Sistema busca usuario por `steam_id` na tabela `users`
3. Sistema retorna nivel, role e nome de exibicao para aplicacao de tags in-game

### Atualizacao de Perfil Proprio
1. Jogador autenticado envia `PATCH /api/players/me` com campos a atualizar
2. Sistema valida campos (nome de exibicao: 3-32 chars, sem caracteres especiais perigosos)
3. Sistema atualiza registro na tabela `users`
4. Sistema retorna perfil atualizado

### Remocao/Banimento por Admin
1. Admin autenticado envia `DELETE /api/players/:id`
2. Sistema marca o usuario como banido (soft delete: campo `banned_at` + `banned_reason`)
3. Sistema revoga todos os refresh tokens do usuario na tabela `refresh_tokens`
4. Sistema retorna HTTP 204

## Personas
- **Jogador**: quer visualizar seu proprio perfil, seus stats e o ranking de outros jogadores; quer atualizar seu nome de exibicao
- **Visitante Anonimo**: pode navegar pelo ranking e perfis publicos sem criar conta
- **Admin**: precisa remover ou banir jogadores que violam regras do servidor
- **Plugin CS2/CS:GO**: consulta `/api/player/:steamid` para aplicar tags `[N4]` e `[ADMIN]` in-game

## Requisitos Funcionais

### PLAYAPI-REQ-001 - GET /api/players (Listagem Publica)
Endpoint publico (sem autenticacao) que retorna lista paginada de jogadores. Parametros de query: `page` (default 1), `limit` (default 20, max 100), `sort` (valores aceitos: `elo_desc`, `elo_asc`, `name_asc`, default `elo_desc`). Cada item da lista deve conter: `id`, `displayName`, `level`, `steamId` (nullable), `stats.wins`, `stats.losses`, `stats.kdr`. Retornar com metadados: `{ data: [], meta: { total, page, limit, totalPages } }`.

### PLAYAPI-REQ-002 - GET /api/players/:id (Perfil Publico)
Endpoint publico que retorna perfil completo de um jogador. Campos retornados: `id`, `displayName`, `level`, `eloRating`, `steamId` (nullable), `role`, `createdAt`, e objeto `stats` com `wins`, `losses`, `draws`, `kills`, `deaths`, `assists`, `kdr`, `headshots`, `hsPercent`, `mvps`, `matchesPlayed`. Retornar HTTP 404 se usuario nao encontrado ou banido. Nunca retornar `email`, `password_hash`, `google_id` ou `banned_reason`.

### PLAYAPI-REQ-003 - GET /api/player/:steamid (Endpoint de Plugin)
Endpoint publico para consulta por Steam ID, conforme definido em `steam-integration`. Esta feature e responsavel pela implementacao deste endpoint no contexto do router de players. Retornar: `{ steamId, displayName, level, role }`. Rate limiting: 60 req/IP/min. HTTP 404 se nao encontrado ou banido.

### PLAYAPI-REQ-004 - PATCH /api/players/me (Atualizacao de Perfil Proprio)
Endpoint protegido por `authMiddleware`. Campos atualizaveis: `displayName` (string, 3-32 caracteres, sem HTML ou scripts). O sistema deve sanitizar o valor antes de salvar. Campos nao atualizaveis via este endpoint: `email`, `role`, `steam_id`, `elo_rating`. Retornar HTTP 200 com perfil atualizado. Retornar HTTP 422 com detalhes de validacao em caso de dados invalidos.

### PLAYAPI-REQ-005 - DELETE /api/players/:id (Banimento por Admin)
Endpoint protegido por `authMiddleware` + `requireRole('admin')`. Aceita body opcional `{ reason: string }`. O sistema deve: (1) verificar que o usuario alvo existe; (2) setar `banned_at = NOW()` e `banned_reason` na tabela `users`; (3) revogar todos os refresh tokens do usuario na tabela `refresh_tokens` (setar `revoked_at = NOW()`); (4) retornar HTTP 204. Um admin nao pode banir a si proprio (HTTP 403). Usuarios banidos nao aparecem em listagens publicas e recebem HTTP 401 ao tentar usar tokens validos.

### PLAYAPI-REQ-006 - Campos banned_at e banned_reason na Tabela users
A migration desta feature deve adicionar as colunas `banned_at` (DATETIME, nullable) e `banned_reason` (VARCHAR 500, nullable) na tabela `users`. O `authMiddleware` deve verificar se `banned_at IS NOT NULL` e retornar HTTP 401 com `{ "error": "Account banned" }` para usuarios banidos com tokens validos.

### PLAYAPI-REQ-007 - Paginacao Consistente
Todos os endpoints de listagem devem retornar o envelope de paginacao no mesmo formato: `{ data: T[], meta: { total: number, page: number, limit: number, totalPages: number } }`. O `limit` maximo absoluto e 100 — valores acima devem ser ignorados e substituidos por 100.

### PLAYAPI-REQ-008 - Calculo de Level a partir do ELO
O campo `level` nos responses deve ser calculado a partir de `elo_rating` seguindo a tabela de niveis do projeto (Glicko-2 simplificado, niveis 1-10). A logica de calculo deve residir em `src/utils/elo.ts` para ser reutilizavel por outras features. Tabela de referencia provisoria: nivel 1 (<800), nivel 2 (800-999), nivel 3 (1000-1199), nivel 4 (1200-1399) ... nivel 10 (>2500). A tabela definitiva sera refinada na feature `elo-system`.

### PLAYAPI-REQ-009 - Validacao de Parametros de Query
Parametros de query invalidos (ex: `page=abc`, `limit=-1`, `sort=invalido`) devem resultar em HTTP 400 com mensagem de validacao clara. Usar zod para validacao de parametros de entrada.

## Requisitos Nao Funcionais

### PLAYAPI-NFR-001 - Rate Limiting no Endpoint de Plugin
`GET /api/player/:steamid` deve ter rate limiting de 60 req/IP/min com resposta HTTP 429 e header `Retry-After`. Este endpoint e chamado frequentemente por plugins — o rate limiting deve ser suficientemente generoso para nao bloquear operacoes legitimas.

### PLAYAPI-NFR-002 - Nao Expor Dados Sensiveis
Nenhum endpoint desta feature deve retornar: `email`, `password_hash`, `google_id`, `steam_id` de outros usuarios sem consentimento, `refresh_tokens`, `banned_reason` (visivel apenas para admins), dados de localizacao ou IP.

### PLAYAPI-NFR-003 - Usuarios Banidos Invissiveis
Usuarios com `banned_at IS NOT NULL` nao devem aparecer em `GET /api/players` nem ser acessiveis via `GET /api/players/:id` ou `GET /api/player/:steamid` — retornar HTTP 404 como se o usuario nao existisse, para nao revelar que a conta foi banida.

### PLAYAPI-NFR-004 - Indice no Banco para Steam ID
A coluna `steam_id` na tabela `users` deve ter indice para suportar consultas eficientes em `GET /api/player/:steamid`. A migration deve criar o indice junto com a coluna (ou reutilizar o indice da feature `steam-integration`).

## Criterios de Aceitacao

- **AC-001**: `GET /api/players` sem autenticacao retorna HTTP 200 com lista paginada; nenhum campo sensivel (email, password_hash) aparece no response
- **AC-002**: `GET /api/players/:id` com ID valido retorna HTTP 200 com `stats.kdr`, `level` calculado e `steamId` (null se nao vinculado); com ID invalido retorna HTTP 404
- **AC-003**: `PATCH /api/players/me` com `displayName: "NovoNome"` atualiza o campo e retorna HTTP 200 com perfil atualizado; sem autenticacao retorna HTTP 401
- **AC-004**: `DELETE /api/players/:id` por admin bane o usuario: o usuario nao aparece mais em `GET /api/players` e seu access token valido passa a receber HTTP 401
- **AC-005**: `GET /api/players?page=1&limit=5&sort=elo_desc` retorna exatamente 5 jogadores ordenados por ELO decrescente com `meta.total` correto
- **AC-006**: `GET /api/player/:steamid` com Steam ID valido retorna HTTP 200 com `level` e `role`; com Steam ID inexistente retorna HTTP 404
- **AC-007**: Admin nao consegue banir a si proprio — `DELETE /api/players/:adminId` retorna HTTP 403
- **AC-008**: `PATCH /api/players/me` com `displayName` de 2 caracteres retorna HTTP 422 com mensagem de validacao

## Out of Scope (esta feature)
- Calculo e atualizacao de ELO (responsabilidade da feature `elo-system`)
- Historico completo de partidas por jogador (listagem via `matches-api`)
- Upload de avatar/foto de perfil
- Sistema de amizades ou seguir outros jogadores
- Notificacoes para o jogador banido
- Desbloqueio de ban (unban) via API — sera tratado em feature administrativa futura

## Dependencias
- `auth-api`: middlewares `authMiddleware` e `requireRole` disponiveis; tabela `users` existente com colunas `id`, `email`, `display_name`, `role`, `elo_rating`, `steam_id`
- `database-baseline` (v0.2): tabela `stats` existente com colunas de kills, deaths, assists, wins, losses
- `steam-integration`: coluna `steam_id` na tabela `users` disponivel; endpoint `/api/player/:steamid` pode ser colocado nesta feature ou na steam-integration — a implementacao deve evitar duplicacao de rotas

## Riscos Iniciais
- **Endpoint `/api/player/:steamid` duplicado**: tanto `steam-integration` quanto `players-api` referenciam este endpoint — definir claramente que a implementacao vive em `players-api` e `steam-integration` apenas define o requisito
- **Calculo de level sem elo-system**: a feature `elo-system` ainda nao existe em v0.3 — o calculo de level deve usar `elo_rating` com valor default (1000, nivel 4) para novos usuarios e uma tabela provisoria
- **Soft delete vs hard delete**: usar soft delete (banned_at) pode criar complexidade em queries futuras — todos os endpoints devem filtrar `WHERE banned_at IS NULL` consistentemente
