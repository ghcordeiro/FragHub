# Steam Integration - Especificacao da Feature

## Summary
Vinculacao de conta Steam a uma conta FragHub ja existente via Steam OpenID 2.0, com armazenamento do Steam ID na tabela `users` e endpoint publico `/api/player/:steamid` para consulta por plugins in-game.

## System Process Context

### Fluxo de Vinculacao Steam
1. Usuario autenticado acessa `GET /auth/steam/link` (requer access token valido)
2. Sistema armazena `userId` em sessao ou state param assinado e redireciona para Steam OpenID
3. Steam autentica o usuario e redireciona para `GET /auth/steam/callback`
4. Sistema valida a resposta Steam OpenID (verificacao de assinatura obrigatoria)
5. Sistema verifica que o `steamid` nao esta vinculado a outra conta na tabela `users`
6. Sistema atualiza `steam_id` na tabela `users` para o usuario autenticado
7. Sistema redireciona para `FRONTEND_URL/profile` com indicador de sucesso

### Fluxo de Desvinculacao Steam
1. Usuario autenticado envia `DELETE /auth/steam/link` (requer access token valido)
2. Sistema define `steam_id = NULL` na tabela `users` para o usuario autenticado
3. Sistema retorna HTTP 204

### Consulta por Plugin In-Game
1. Plugin CS2/CS:GO envia `GET /api/player/:steamid`
2. Sistema busca usuario com aquele `steam_id` na tabela `users`
3. Sistema retorna dados publicos: nivel ELO, role e nome de exibicao
4. Se nao encontrado, retorna HTTP 404 com body JSON padrao

## Personas
- **Jogador**: precisa vincular sua conta Steam para poder entrar na queue de matchmaking — o fluxo deve ser simples e ocorrer no portal web
- **Plugin CS2/CS:GO**: consulta `GET /api/player/:steamid` no momento em que o jogador conecta ao servidor para obter nivel e role e aplicar tags in-game
- **Admin**: pode visualizar qual Steam ID esta vinculado a cada conta; pode desvincular Steam de um usuario via endpoint admin

## Requisitos Funcionais

### STEAMINT-REQ-001 - Coluna steam_id na Tabela users
A tabela `users` já possui `steam_id` (`VARCHAR(32)`, nullable, `UNIQUE`) na migration `001_create_users.sql` do `database-baseline`. Esta feature **não** exige nova migration só para criar a coluna. O Steam ID deve ser persistido no formato **SteamID64** (17 dígitos como string); validar na API antes de gravar. (Se no futuro se quiser alinhar o tamanho do tipo a 20 caracteres, isso pode ser uma migration opcional separada.)

### STEAMINT-REQ-002 - Endpoint de Inicio da Vinculacao Steam
`GET /auth/steam/link` deve ser protegido por `authMiddleware`. O sistema deve gerar um `state` assinado com HMAC-SHA256 contendo `{ userId, nonce, exp }` (expiracao de 10 minutos) e incluir na URL de redirect para Steam OpenID. O realm e o return_to devem ser configurados via `STEAM_REALM` e `STEAM_RETURN_URL` no `.env`.

### STEAMINT-REQ-003 - Endpoint de Callback Steam
`GET /auth/steam/callback` deve: (1) verificar a assinatura da resposta Steam via requisicao de validacao ao endpoint oficial `https://steamcommunity.com/openid/login` com `openid.mode=check_authentication`; (2) rejeitar com HTTP 400 se a validacao falhar; (3) extrair o Steam ID64 da URL `openid.claimed_id`; (4) verificar que o `state` param e valido e nao expirado; (5) recuperar o `userId` do state; (6) prosseguir com a vinculacao.

### STEAMINT-REQ-004 - Prevencao de Conta Steam Duplicada
Antes de vincular, o sistema deve verificar que o `steam_id` extraido nao esta vinculado a nenhuma outra conta na tabela `users`. Se ja estiver vinculado a outra conta, retornar HTTP 409 com mensagem `"Este Steam ID ja esta vinculado a outra conta FragHub"` e redirecionar para o frontend com indicador de erro.

### STEAMINT-REQ-005 - Desvinculacao de Steam
`DELETE /auth/steam/link` protegido por `authMiddleware` deve setar `steam_id = NULL` no usuario autenticado e retornar HTTP 204. Se o usuario nao tiver Steam vinculada, retornar HTTP 404.

### STEAMINT-REQ-006 - Endpoint Publico GET /api/player/:steamid
Endpoint publico (sem autenticacao) que busca usuario por `steam_id`. Retornar HTTP 200 com:
```json
{
  "steamId": "76561198xxxxxxxxx",
  "displayName": "NomeDoJogador",
  "level": 4,
  "role": "player" | "admin"
}
```
Se nao encontrado, retornar HTTP 404 com `{ "error": "Player not found" }`. Nenhum dado sensivel (email, password_hash, refresh tokens) deve ser exposto. O campo `level` deve ser derivado da coluna `elo_rating` da tabela `users` (ou `stats`) — se o sistema de ELO ainda nao existir, retornar `level: null`.

### STEAMINT-REQ-007 - Endpoint Admin de Desvinculacao
`DELETE /admin/players/:id/steam` protegido por `authMiddleware` + `requireRole('admin')` deve permitir que um admin remova a vinculacao Steam de qualquer usuario. Retornar HTTP 204 em caso de sucesso.

### STEAMINT-REQ-008 - Rate Limiting no Endpoint Publico
`GET /api/player/:steamid` deve ter rate limiting de 60 requisicoes por IP por minuto para prevenir scraping. Retornar HTTP 429 com `Retry-After` em caso de excesso.

### STEAMINT-REQ-009 - Variaveis de Ambiente Steam
As seguintes variaveis devem ser adicionadas ao `.env` e validadas no startup: `STEAM_REALM` (ex: `https://fraghub.example.com`), `STEAM_RETURN_URL` (URL absoluta do callback API, ex: `https://api.fraghub.example.com/auth/steam/callback`), `STEAM_STATE_SECRET` (segredo dedicado para HMAC do `state` em **STEAMINT-REQ-002**, minimo 32 caracteres). O sistema deve falhar ao iniciar se alguma estiver ausente ou invalida.

## Requisitos Nao Funcionais

### STEAMINT-NFR-001 - Validacao Obrigatoria da Resposta Steam
A verificacao `check_authentication` com os servidores Steam e obrigatoria — jamais confiar apenas no `claimed_id` sem validacao. O sistema deve rejeitar qualquer callback que nao passe nesta verificacao.

### STEAMINT-NFR-002 - Timeout na Chamada Steam
A requisicao de validacao ao Steam OpenID deve ter timeout de 5 segundos. Em caso de timeout ou erro de rede, retornar HTTP 503 com mensagem `"Servico Steam temporariamente indisponivel"`.

### STEAMINT-NFR-003 - Nao Expor Dados Sensiveis
O endpoint `/api/player/:steamid` e publico e chamado por plugins sem autenticacao — deve retornar apenas `steamId`, `displayName`, `level` e `role`. Nunca retornar `email`, `google_id`, `password_hash` ou dados de sessao.

### STEAMINT-NFR-004 - Cache do Endpoint Publico
O endpoint `GET /api/player/:steamid` pode retornar header `Cache-Control: max-age=60` para reduzir carga no banco em servidores com muitos jogadores conectados simultaneamente.

## Criterios de Aceitacao

- **AC-001**: Usuario autenticado acessa `GET /auth/steam/link`, e redirecionado para Steam, conclui autenticacao e volta com Steam ID salvo em `users.steam_id`
- **AC-002**: Tentar vincular um Steam ID ja vinculado a outra conta retorna HTTP 409 (ou redireciona com erro)
- **AC-003**: `DELETE /auth/steam/link` por usuario autenticado seta `steam_id = NULL` na tabela `users` e retorna HTTP 204
- **AC-004**: `GET /api/player/76561198xxxxxxxxx` com Steam ID existente retorna HTTP 200 com `displayName`, `level` e `role` sem campos sensiveis
- **AC-005**: `GET /api/player/00000000000000000` com Steam ID inexistente retorna HTTP 404 com `{ "error": "Player not found" }`
- **AC-006**: Callback Steam com resposta invalida (assinatura incorreta) retorna HTTP 400 sem vincular nenhuma conta
- **AC-007**: Mais de 60 requisicoes por minuto ao `GET /api/player/:steamid` do mesmo IP resulta em HTTP 429
- **AC-008**: Admin pode remover vinculacao Steam de qualquer usuario via `DELETE /admin/players/:id/steam`

## Out of Scope (esta feature)
- Login via Steam como metodo principal de autenticacao (Steam e apenas vinculacao, nao login)
- Sincronizacao de dados do perfil Steam (avatar, nome Steam) — apenas o Steam ID e armazenado
- Verificacao de posse do jogo CS2/CS:GO na conta Steam
- Integracao com Steam Web API para dados de partidas ou inventario
- Sistema de queue ou matchmaking (dependente de feature futura)

## Dependencias
- `auth-api`: middleware `authMiddleware` disponivel, tabela `users` existente, sistema de refresh tokens operacional
- `database-baseline` (v0.2): migration system disponivel para adicionar coluna `steam_id` na tabela `users`

## Riscos Iniciais
- **Dependencia externa Steam OpenID**: o servico de validacao Steam pode estar indisponivel — o sistema deve lidar com timeout e retornar erro amigavel sem quebrar o fluxo de autenticacao principal
- **Steam ID ja vinculado em concorrencia**: dois usuarios tentando vincular o mesmo Steam ID simultaneamente podem causar condicao de corrida — usar constraint UNIQUE na coluna `steam_id` e tratar o erro de constraint do banco
- **Expiracao do state param**: se o usuario demorar mais de 10 minutos no fluxo OAuth Steam, o state expira e o callback e rejeitado — necessario comunicar erro claro ao usuario para reiniciar o fluxo
- **Formato do Steam ID**: Steam retorna o ID no formato de URL (`https://steamcommunity.com/openid/id/76561198...`) — o sistema deve extrair apenas os digitos finais (SteamID64) de forma robusta
