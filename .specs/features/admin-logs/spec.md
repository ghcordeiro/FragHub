# Admin Logs - Especificacao da Feature

## Summary
Implementar o sistema de audit log para acoes administrativas, com tabela dedicada no banco, API com paginacao e filtros, UI de consulta no painel admin e purge automatico configuravel de registros antigos.

## System Process Context
1. Sempre que um admin executa uma acao (ban, unban, edicao, criacao de conta, comando RCON, start/stop/restart de servidor), o servico responsavel chama o modulo de audit log passando os dados da acao.
2. O modulo persiste o registro na tabela `admin_audit_logs` de forma assincrona (sem bloquear a resposta ao cliente); falha no log nao deve reverter a acao principal.
3. Um job cron executado diariamente verifica registros com `created_at` anterior ao limite de retencao configurado (padrao: 90 dias) e os remove da tabela.
4. O admin acessa `/admin/logs`; o frontend solicita `GET /api/admin/logs` com parametros de paginacao e filtros; a API retorna os registros formatados.
5. O admin pode clicar em um registro para ver o campo `details` completo em um modal.

## Personas
- **Admin**: precisa auditar acoes passadas para rastrear quem fez o que e quando, especialmente em casos de disputa ou investigacao de abuso
- **Auditoria / Compliance (implicita)**: os logs servem como evidencia de acoes administrativas no sistema

## Requisitos Funcionais

### ADMINLOG-REQ-001 - Tabela de Audit Log
Criar a tabela `admin_audit_logs` com as colunas: `id` (BIGINT, PK, auto-increment), `admin_id` (FK para `users`), `action_type` (VARCHAR, enum: `ban_player`, `unban_player`, `edit_player`, `create_player`, `change_role`, `rcon_command`, `server_start`, `server_stop`, `server_restart`), `target_type` (VARCHAR: `player`, `server`, nullable), `target_id` (BIGINT, nullable), `details` (JSON), `ip_address` (VARCHAR, nullable), `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP). Indices em `admin_id`, `action_type` e `created_at`.

### ADMINLOG-REQ-002 - Registro Automatico de Acoes
O modulo de audit log deve ser chamado apos as seguintes acoes nas features dependentes: ban de jogador, unban de jogador, edicao de dados de jogador, criacao manual de conta, mudanca de role, execucao de comando RCON via portal, start/stop/restart de servidor de jogo. O registro e persistido de forma assincrona; falhas de persistencia sao logadas no log de aplicacao mas nao interrompem o fluxo principal.

### ADMINLOG-REQ-003 - API de Consulta de Logs com Paginacao
Endpoint `GET /api/admin/logs` deve aceitar os parametros: `page` (default: 1), `limit` (default: 50, max: 200), `action_type` (filtro opcional), `admin_id` (filtro opcional), `date_from` (filtro opcional, ISO 8601), `date_to` (filtro opcional, ISO 8601). Retorna objeto `{data: [], total: N, page: N, limit: N}`.

### ADMINLOG-REQ-004 - UI de Listagem de Logs com Filtros
A rota `/admin/logs` deve exibir uma tabela com colunas: timestamp, admin (nome), tipo de acao, alvo (tipo + nome/ID) e um botao de detalhes. A UI deve oferecer filtros por tipo de acao (dropdown com todas as opcoes) e por intervalo de data (date range picker). Paginacao com controles de pagina anterior/proxima e exibicao do total de registros.

### ADMINLOG-REQ-005 - Modal de Detalhes do Log
Ao clicar em um registro, um modal deve exibir o conteudo completo do campo `details` (JSON formatado) e todas as colunas do registro, incluindo IP do admin no momento da acao.

### ADMINLOG-REQ-006 - Purge Automatico por Retencao
Um job cron (configuravel via variavel de ambiente `AUDIT_LOG_RETENTION_DAYS`, default: 90) deve executar diariamente e deletar registros com `created_at` mais antigo que o limite. O job deve logar quantos registros foram removidos na execucao. O periodo de retencao minimo aceito e 30 dias.

### ADMINLOG-REQ-007 - Autorizacao Exclusiva para Admins
O endpoint `GET /api/admin/logs` deve exigir JWT valido com `role=admin`. O modulo de escrita do audit log e interno (sem endpoint publico de escrita). Nenhum jogador pode ler ou escrever logs.

## Requisitos Nao Funcionais

### ADMINLOG-NFR-001 - Assincronia do Registro
A persistencia do audit log nao deve adicionar latencia perceptivel (>50ms) ao tempo de resposta das acoes administrativas. Utilizar persistencia assincrona com tratamento de erro isolado.

### ADMINLOG-NFR-002 - Integridade dos Dados
O campo `details` deve sempre ser um JSON valido. A camada de servico deve validar e serializar os dados antes de persistir; nunca armazenar strings nao-serializadas.

### ADMINLOG-NFR-003 - Indices de Performance
As queries de listagem com filtros devem executar em menos de 200ms para tabelas com ate 100.000 registros. Os indices em `admin_id`, `action_type` e `created_at` sao obrigatorios.

### ADMINLOG-NFR-004 - Conformidade com TypeScript Strict
Todo codigo novo deve compilar com `strict: true`. Os tipos para `action_type` e `target_type` devem ser union types TypeScript, nao strings livres.

### ADMINLOG-NFR-005 - Imutabilidade dos Registros
Registros de audit log nao devem ser editaveis apos criacao. Nao deve existir endpoint de update ou delete manual de logs; apenas o purge automatico por retencao e permitido.

## Criterios de Aceitacao

- **AC-001**: Apos um admin banir um jogador, um registro com `action_type=ban_player` e `target_id` correto aparece imediatamente na listagem de logs em `/admin/logs`.
- **AC-002**: A API `GET /api/admin/logs?action_type=rcon_command` retorna apenas registros do tipo `rcon_command`, sem outros tipos misturados.
- **AC-003**: A API `GET /api/admin/logs?date_from=2026-01-01&date_to=2026-01-31` retorna apenas registros dentro do intervalo informado.
- **AC-004**: Um usuario com `role=player` que chama `GET /api/admin/logs` recebe 403.
- **AC-005**: Ao clicar em um registro de `rcon_command` na UI, o modal exibe o comando executado (pos-sanitizacao) e o output retornado pelo servidor.
- **AC-006**: Com `AUDIT_LOG_RETENTION_DAYS=30`, o job cron remove todos os registros com mais de 30 dias e loga a quantidade removida; registros recentes permanecem intactos.
- **AC-007**: Uma falha simulada na persistencia do audit log (banco indisponivel) nao impede a conclusao de um ban de jogador — a acao principal e bem-sucedida e o erro de log e registrado no log de aplicacao.

## Out of Scope (esta feature)
- Logs de acoes de jogadores comuns (apenas acoes administrativas sao auditadas nesta feature)
- Anonimizacao de IPs ou dados pessoais no campo `details` — avaliado para v2.0
- Exportacao de logs para CSV ou sistemas externos (SIEM, Splunk etc.) — v2.0
- Alertas em tempo real por email/webhook quando acoes criticas sao executadas — v2.0
- Interface de busca full-text no campo `details` — v2.0

## Dependencias
- `admin-dashboard`: middleware de autorizacao `role=admin`; o modulo de audit log e chamado pelas acoes desta feature
- `server-management-ui` (feature paralela da v0.6): acoes de RCON e ciclo de vida de servidor geram registros neste sistema
- Banco de dados MariaDB 10.6+ ja configurado pela feature `database-baseline`

## Riscos Iniciais
- Volume excessivo de logs em ambientes com alta atividade de admins — mitigacao: purge configuravel e indices adequados
- Dados sensiveis (ex: output de comandos RCON, IPs de admins) no campo `details` — mitigacao: documentar quais campos sao armazenados; anonimizacao planejada para v2.0
- Falha do job cron de purge nao detectada — mitigacao: logar resultado de cada execucao; monitorar via log de aplicacao
