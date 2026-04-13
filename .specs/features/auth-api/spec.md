# Auth API - Especificacao da Feature

## Summary
Sistema de autenticacao completo com registro e login por email/senha, Google OAuth 2.0, JWT access+refresh tokens, middleware de autenticacao/autorizacao por role e rate limiting nos endpoints de auth.

## System Process Context

### Fluxo de Registro (Email/Senha)
1. Usuario envia `POST /auth/register` com email e senha
2. Sistema valida formato do email, forca da senha e unicidade do email na tabela `users`
3. Sistema gera hash bcrypt da senha (cost factor 12)
4. Sistema insere usuario na tabela `users` com role `player`
5. Sistema retorna access token JWT (15min) no body e refresh token JWT (7d) em cookie httpOnly

### Fluxo de Login (Email/Senha)
1. Usuario envia `POST /auth/login` com email e senha
2. Sistema busca usuario pelo email, verifica hash bcrypt
3. Sistema invalida refresh tokens anteriores do dispositivo (se `device_id` fornecido)
4. Sistema gera access token + refresh token, salva refresh token na tabela `refresh_tokens`
5. Sistema retorna access token no body e seta cookie httpOnly com refresh token

### Fluxo de Google OAuth
1. Usuario acessa `GET /auth/google` — sistema redireciona para Google com scopes `email profile`
2. Google redireciona para `GET /auth/google/callback` com codigo de autorizacao
3. Sistema troca codigo por tokens Google, extrai email e nome
4. Se email ja existe na tabela `users`, faz login; se nao existe, cria conta com role `player`
5. Sistema retorna access token + seta cookie de refresh token, redireciona para frontend

### Fluxo de Refresh
1. Cliente envia `POST /auth/refresh` (cookie httpOnly com refresh token enviado automaticamente)
2. Sistema valida refresh token: verifica assinatura JWT, busca na tabela `refresh_tokens`, verifica que nao foi revogado
3. Sistema rotaciona: invalida o refresh token atual, gera novo par access+refresh
4. Sistema retorna novo access token no body e novo refresh token no cookie

### Fluxo de Logout
1. Cliente envia `POST /auth/logout` (com cookie de refresh token)
2. Sistema extrai refresh token do cookie, marca como revogado na tabela `refresh_tokens`
3. Sistema limpa o cookie httpOnly
4. Sistema retorna HTTP 204

## Personas
- **Jogador**: precisa criar conta e logar de forma simples, seja por email ou conta Google, sem friccao
- **Admin**: precisa de acesso privilegiado a rotas de gerenciamento; pode criar contas manualmente para outros usuarios
- **Desenvolvedor Contribuidor**: precisa de middleware de auth reutilizavel e bem documentado para proteger novas rotas
- **Plugin CS2/CS:GO**: nao usa auth diretamente, mas consulta endpoints publicos que dependem do middleware estar bem isolado

## Requisitos Funcionais

### AUTHAPI-REQ-001 - Tabela refresh_tokens
Deve existir a tabela `refresh_tokens` no banco `fraghub_db` com as colunas: `id` (PK auto-increment), `user_id` (FK para `users.id`, ON DELETE CASCADE), `token_hash` (VARCHAR 64, hash SHA-256 do token), `device_id` (VARCHAR 255, nullable), `expires_at` (DATETIME), `revoked_at` (DATETIME, nullable), `created_at` (DATETIME). O token JWT raw nunca deve ser armazenado — apenas seu hash SHA-256.

### AUTHAPI-REQ-002 - Registro com Email/Senha
`POST /auth/register` deve aceitar `{ email, password, displayName? }`. Validacoes obrigatorias: email em formato valido (zod), senha com minimo 8 caracteres contendo letra maiuscula, letra minuscula e numero, email unico na tabela `users`. Em caso de email ja existente, retornar HTTP 409. Em caso de sucesso, retornar HTTP 201 com access token e setar cookie de refresh token.

### AUTHAPI-REQ-003 - Login com Email/Senha
`POST /auth/login` deve aceitar `{ email, password, deviceId? }`. Verificar hash bcrypt com `bcrypt.compare`. Em caso de credenciais invalidas, retornar HTTP 401 com mensagem generica (nao indicar se o email existe ou nao). Em caso de sucesso, retornar HTTP 200 com `{ accessToken, user: { id, email, displayName, role } }` e setar cookie de refresh token.

### AUTHAPI-REQ-004 - Google OAuth 2.0
`GET /auth/google` inicia o fluxo OAuth com redirect para Google. `GET /auth/google/callback` processa o retorno. A URL de callback deve ser configurada via variavel de ambiente `GOOGLE_REDIRECT_URI`. Client ID e Secret devem vir de `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`. Apos autenticacao bem-sucedida, redirecionar para `FRONTEND_URL` com o access token como query param (unico uso permitido de token em URL — expirar em 30s).

### AUTHAPI-REQ-005 - JWT Access Token
Access tokens devem ser JWTs assinados com algoritmo `HS256` usando `JWT_SECRET` do `.env`. Payload minimo: `{ sub: userId, email, role, iat, exp }`. Expiracao: 15 minutos. O secret deve ter no minimo 32 caracteres.

### AUTHAPI-REQ-006 - JWT Refresh Token
Refresh tokens devem ser JWTs assinados com `JWT_REFRESH_SECRET` separado do access token secret. Expiracao: 7 dias. O cookie deve ter flags: `httpOnly`, `secure` (em producao), `sameSite: strict`, `path: /auth`. Na tabela `refresh_tokens`, armazenar apenas o hash SHA-256 do token.

### AUTHAPI-REQ-007 - Rotacao de Refresh Tokens
A cada chamada bem-sucedida a `POST /auth/refresh`, o refresh token atual deve ser revogado e um novo par gerado. Se um refresh token ja revogado for apresentado, o sistema deve revogar TODOS os refresh tokens do usuario (indicativo de roubo de token) e retornar HTTP 401.

### AUTHAPI-REQ-008 - Middleware de Autenticacao
`authMiddleware` deve extrair o Bearer token do header `Authorization`, verificar assinatura e expiracao JWT, buscar o usuario na tabela `users` e injetar `req.user = { id, email, role }` no request. Se o token for invalido ou expirado, retornar HTTP 401 com `{ error: "Unauthorized" }`. O middleware deve ser exportado de `src/middleware/auth.ts`.

### AUTHAPI-REQ-009 - Middleware de Autorizacao por Role
`requireRole(...roles: Role[])` deve ser um middleware factory que verifica se `req.user.role` esta na lista de roles permitidas. Se nao estiver, retornar HTTP 403. Uso: `router.delete('/players/:id', authMiddleware, requireRole('admin'), handler)`.

### AUTHAPI-REQ-010 - Rate Limiting em Endpoints de Auth
Os endpoints `POST /auth/login`, `POST /auth/register` e `POST /auth/refresh` devem ter rate limiting independente: maximo 10 requisicoes por IP por minuto para login e registro; 20 por minuto para refresh. Usar `express-rate-limit`. Em caso de excesso, retornar HTTP 429 com header `Retry-After`.

### AUTHAPI-REQ-011 - Criacao Manual de Conta por Admin
`POST /auth/admin/create-user` protegido por `authMiddleware` + `requireRole('admin')` deve permitir que um admin crie uma conta com `{ email, password, displayName?, role }`. Retornar HTTP 201 com dados do usuario criado (sem senha).

### AUTHAPI-REQ-012 - Logout
`POST /auth/logout` deve aceitar o cookie de refresh token, marcar o token como revogado na tabela `refresh_tokens` via `revoked_at = NOW()`, limpar o cookie e retornar HTTP 204. Endpoint nao requer access token valido (permite logout mesmo com access token expirado).

### AUTHAPI-REQ-013 - Migracoes de schema (users + refresh_tokens)
O schema atual de `users` (migration `001_create_users.sql`) expoe `steam_id` e **nao** expoe `google_id`. Esta feature deve incluir migracao(oes) versionada(s) em `scripts/installer/sql/database/` que: (1) adicionem coluna `google_id VARCHAR(255) NULL` com indice unico (nullable) para contas Google; (2) criem a tabela `refresh_tokens` conforme **AUTHAPI-REQ-001**. Utilizadores criados apenas via Google OAuth devem receber `password_hash` = bcrypt de segredo aleatorio opaco (nunca texto previsivel ou vazio em resposta).

### AUTHAPI-REQ-014 - Protecao CSRF no OAuth
O fluxo `GET /auth/google` → Google → `GET /auth/google/callback` deve usar parametro `state` nao previsivel (e.g. aleatorio armazenado em cookie httpOnly de curta duracao ou equivalente) validado no callback antes de trocar o codigo por tokens.

## Requisitos Nao Funcionais

### AUTHAPI-NFR-001 - Seguranca de Senhas
Senhas nunca devem ser logadas, retornadas em responses ou armazenadas em texto plano. O campo `password_hash` da tabela `users` nunca deve aparecer em respostas de API.

### AUTHAPI-NFR-002 - Mensagens de Erro Genericas
Endpoints de login e registro nao devem indicar se o email existe no sistema (protecao contra enumeracao de usuarios). Sempre retornar a mesma mensagem em caso de falha de autenticacao.

### AUTHAPI-NFR-003 - Variaveis de Ambiente Obrigatorias
O servidor deve falhar ao iniciar se `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` ou `FRONTEND_URL` nao estiverem definidos no `.env`. Validar com zod no startup.

### AUTHAPI-NFR-004 - HTTPS em Producao
Os cookies de refresh token devem ter flag `secure: true` quando `NODE_ENV=production`. Em desenvolvimento (`NODE_ENV=development`), a flag pode ser `false` para facilitar testes locais.

### AUTHAPI-NFR-005 - Cobertura de Testes Unitarios
Os middlewares `authMiddleware` e `requireRole` devem ter testes unitarios cobrindo: token valido, token expirado, token malformado, role insuficiente, ausencia de header Authorization.

## Criterios de Aceitacao

- **AC-001**: `POST /auth/register` com email valido e senha forte retorna HTTP 201, body contem `accessToken` e response tem `Set-Cookie` com refresh token httpOnly
- **AC-002**: `POST /auth/login` com credenciais corretas retorna HTTP 200; com credenciais erradas retorna HTTP 401 sem indicar se o email existe
- **AC-003**: `POST /auth/refresh` com cookie de refresh token valido retorna novo `accessToken` e novo cookie de refresh token; o token anterior nao pode mais ser usado (rotacao)
- **AC-004**: Rota protegida com `authMiddleware` retorna HTTP 401 sem token; HTTP 200 com token valido; HTTP 401 com token expirado
- **AC-005**: Rota com `requireRole('admin')` retorna HTTP 403 quando chamada por usuario com role `player`
- **AC-006**: `POST /auth/login` com mais de 10 requisicoes por minuto do mesmo IP retorna HTTP 429 com header `Retry-After`
- **AC-007**: `POST /auth/logout` revoga o refresh token; chamada subsequente a `POST /auth/refresh` com o mesmo token retorna HTTP 401
- **AC-008**: Fluxo Google OAuth completo redireciona para `FRONTEND_URL` com access token apos autenticacao bem-sucedida
- **AC-009**: Admin pode criar usuario via `POST /auth/admin/create-user`; jogador comum recebe HTTP 403 na mesma rota
- **AC-010**: Migracoes **AUTHAPI-REQ-013** aplicadas e registadas em `schema_migrations` sem regressao em `users` existentes
- **AC-011**: Requisicao OAuth callback sem `state` valido retorna HTTP 400 ou redireciona para `FRONTEND_URL` com erro controlado (sem vazar secrets)

## Out of Scope (esta feature)
- Vinculacao de conta Steam (responsabilidade da feature `steam-integration`)
- Two-factor authentication (2FA)
- Recuperacao de senha por email (forgot password flow)
- Login via Discord ou outras redes sociais alem do Google
- Gerenciamento de sessoes em multiplos dispositivos com UI
- Blacklist de JWTs em memoria (usa revogacao via banco apenas)

## Dependencias
- `api-setup`: projeto Node.js + Express + TypeScript scaffoldado, conexao Knex configurada, servico systemd ativo
- `database-baseline` (v0.2): tabela `users` com `id`, `email`, `password_hash`, `display_name`, `role`, `steam_id`, `created_at`, `updated_at` — **AUTHAPI-REQ-013** adiciona `google_id` e `refresh_tokens`

## Riscos Iniciais
- **CSRF em OAuth redirect**: o state parameter do OAuth deve ser validado para evitar ataques CSRF — implementar com token de estado aleatorio em sessao ou cookie temporario
- **Rotacao de refresh tokens e concorrencia**: em caso de multiplas requisicoes simultaneas de refresh, pode haver condicao de corrida — usar transacao de banco para garantir atomicidade da rotacao
- **Revogacao em multiplos dispositivos**: ao fazer logout, apenas o token do dispositivo atual e revogado por default — revogar todos os tokens do usuario exige endpoint separado nao coberto nesta spec
- **Secret rotation**: se `JWT_SECRET` for rotacionado, todos os access tokens validos se tornam invalidos imediatamente — sem mecanismo de grace period nesta versao
