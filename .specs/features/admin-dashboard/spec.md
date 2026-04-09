# Admin Dashboard - Especificacao da Feature

## Summary
Implementar a area administrativa do portal FragHub (rotas `/admin/*`, protegidas por role=admin) com dashboard de metricas, CRUD completo de jogadores, criacao manual de contas e log de acoes administrativas.

## System Process Context
1. Admin autentica no portal com credenciais validas e recebe JWT com claim `role=admin`.
2. Frontend redireciona para `/admin/dashboard`; middleware de autorizacao valida o claim antes de renderizar qualquer rota `/admin/*`.
3. API verifica `role=admin` no token JWT em cada endpoint `/api/admin/*` antes de processar a requisicao.
4. Admin visualiza metricas gerais no dashboard (jogadores, partidas, servidores, alertas).
5. Admin executa acoes sobre jogadores (busca, edita, bane, desbane, cria conta); cada acao e registrada no audit log (via feature `admin-logs`).
6. Toda acao administrativa gera um registro no sistema de audit log para rastreabilidade.

## Personas
- **Admin**: precisa de visibilidade rapida do estado do sistema e controle completo sobre contas de jogadores
- **Jogador**: pode ter sua conta editada, banida ou desbanimada por um admin sem que isso exija intervencao manual no banco de dados

## Requisitos Funcionais

### ADMINDASH-REQ-001 - Dashboard de Metricas
A rota `/admin/dashboard` deve exibir: total de jogadores cadastrados, numero de partidas realizadas hoje, quantidade de servidores de jogo online (consultado via API) e lista dos ultimos 5 alertas/acoes recentes do audit log.

### ADMINDASH-REQ-002 - Listagem e Busca de Jogadores
A rota `/admin/players` deve exibir uma tabela paginada de todos os jogadores com colunas: nome, email, Steam ID, role, status (ativo/banido) e data de cadastro. Deve suportar busca por nome, email ou Steam ID com debounce de 300ms.

### ADMINDASH-REQ-003 - Visualizacao de Perfil Completo do Jogador
Ao clicar em um jogador na listagem, o admin deve visualizar o perfil completo: dados pessoais, historico de partidas, ELO atual, historico de bans anteriores e acoes administrativas sofridas.

### ADMINDASH-REQ-004 - Edicao de Jogador
O admin deve poder editar: nome de exibicao, email e role (apenas entre `player` e `admin`). A acao deve ser confirmada via modal de confirmacao antes de ser persistida. A edicao gera registro no audit log.

### ADMINDASH-REQ-005 - Sistema de Ban de Jogador
O admin deve poder banir um jogador via soft delete: o campo `banned_at` e populado, um registro na tabela `player_bans` e criado com motivo (texto obrigatorio, max 500 chars) e duracao (em dias; 0 = permanente). Jogador banido nao consegue autenticar na API. A acao gera registro no audit log. Sincronizacao com CS2-SimpleAdmin/SourceBans++ e Out of Scope desta feature.

### ADMINDASH-REQ-006 - Desbanimento de Jogador
O admin deve poder desbanir um jogador banido, reativando sua conta. A acao registra o desbanimanto na tabela `player_bans` (campo `unbanned_at` e `unbanned_by`) e gera registro no audit log.

### ADMINDASH-REQ-007 - Criacao Manual de Conta pelo Admin
O admin deve poder criar uma nova conta via formulario com campos: nome, email e senha temporaria gerada automaticamente (exibida uma unica vez na tela). O usuario criado recebe role=`player` por padrao. A acao gera registro no audit log.

### ADMINDASH-REQ-008 - Middleware de Autorizacao de Admin
Toda rota `/api/admin/*` deve ter middleware que verifica `role=admin` no JWT. Requisicoes sem token valido retornam 401; com token valido mas role diferente de admin retornam 403. O middleware e aplicado de forma centralizada, nao por endpoint individualmente.

### ADMINDASH-REQ-009 - Protecao contra Auto-Ban e Auto-Remocao de Role
A API deve rejeitar com 400 qualquer tentativa de um admin banir a si mesmo ou remover a propria role admin. A validacao ocorre na camada de servico, antes de qualquer persistencia.

### ADMINDASH-REQ-010 - Navegacao Lateral
O layout `/admin/*` deve conter sidebar com secoes: Dashboard, Jogadores, Servidores (link para `/admin/servers`, feature `server-management-ui`) e Logs (link para `/admin/logs`, feature `admin-logs`). A secao ativa deve ser destacada visualmente.

## Requisitos Nao Funcionais

### ADMINDASH-NFR-001 - Seguranca de Autorizacao
Nenhum endpoint `/api/admin/*` pode ser acessado sem role=admin no JWT. A verificacao deve ocorrer no middleware antes do handler, sem excecoes.

### ADMINDASH-NFR-002 - Performance do Dashboard
O endpoint de metricas do dashboard deve responder em menos de 500ms em producao, utilizando queries otimizadas com indices adequados.

### ADMINDASH-NFR-003 - Conformidade com TypeScript Strict
Todo codigo novo (frontend e backend) deve compilar sem erros com `strict: true` no `tsconfig.json`.

### ADMINDASH-NFR-004 - Responsividade
O painel admin deve ser utilizavel em telas a partir de 1024px de largura (desktop-first, sem exigencia de mobile).

### ADMINDASH-NFR-005 - Consistencia com Design System
Os componentes do painel admin devem reutilizar o design system ja estabelecido na feature `frontend-setup` (paleta de cores, tipografia, componentes base).

## Criterios de Aceitacao

- **AC-001**: Um usuario com `role=player` que tenta acessar `GET /api/admin/players` recebe resposta 403 com mensagem de erro explicita.
- **AC-002**: Um admin consegue buscar um jogador pelo nome parcial e o resultado aparece em menos de 1 segundo sem recarregar a pagina.
- **AC-003**: Ao banir um jogador com motivo "teste" e duracao 7 dias, a tabela `player_bans` contem o registro correto e o jogador banido recebe 401 ao tentar autenticar.
- **AC-004**: Um admin nao consegue banir a si mesmo — a API retorna 400 com mensagem "Admin nao pode banir a si mesmo".
- **AC-005**: Ao criar uma conta manualmente, a senha temporaria e exibida uma unica vez no modal de confirmacao e o usuario criado aparece na listagem com status ativo.
- **AC-006**: Toda acao de ban, unban, edicao de role e criacao de conta gera um registro correspondente acessivel na UI de logs (`/admin/logs`).
- **AC-007**: O dashboard exibe metricas corretas de total de jogadores, partidas do dia e servidores online apos cada acao relevante.

## Out of Scope (esta feature)
- Sincronizacao de ban com CS2-SimpleAdmin (MySQL do servidor de jogo) — tratado em feature futura
- Sincronizacao de ban com SourceBans++ — tratado em feature futura
- Gerenciamento de servidores de jogo (start/stop/restart) — coberto pela feature `server-management-ui`
- Sistema de audit log detalhado com paginacao e filtros — coberto pela feature `admin-logs`
- Autenticacao 2FA para admins
- Gestao de multiplos niveis de permissao alem de `player` e `admin`

## Dependencias
- `auth-api`: JWT com claim de role; middleware de autenticacao existente
- `auth-ui`: contexto de autenticacao no frontend; guards de rota existentes
- `players-api`: endpoints de leitura de jogadores que podem ser reaproveitados
- `admin-logs` (feature paralela da v0.6): chamada ao servico de audit log apos cada acao administrativa

## Riscos Iniciais
- Escalada de privilegios via race condition ao editar a propria role — mitigacao: validacao no backend com ID do token, nao do payload da requisicao
- IDOR (Insecure Direct Object Reference) em endpoints de edicao — mitigacao: validar que o recurso alvo existe antes de qualquer modificacao
- Exibicao acidental de senha temporaria em logs de servidor — mitigacao: nunca logar o corpo da requisicao de criacao de conta
