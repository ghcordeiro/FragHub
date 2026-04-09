# Server Management UI - Especificacao da Feature

## Summary
Implementar a interface de gerenciamento de servidores de jogo no painel admin, com listagem de status, controle de ciclo de vida via systemd e console RCON via web — com isolamento obrigatorio de credenciais RCON no backend.

## System Process Context
1. Admin acessa `/admin/servers`; frontend solicita `GET /api/admin/servers` e exibe a lista de servidores com status atual.
2. Para verificar status, a API consulta o estado do servico systemd correspondente no host (via execucao de `systemctl is-active`).
3. Para obter jogadores conectados e uptime, a API executa o comando RCON `status` e processa o output — a senha RCON nunca trafega para o frontend.
4. Admin aciona start/stop/restart: API executa `systemctl start|stop|restart <servico>` no host e retorna resultado; a acao e registrada no audit log.
5. Admin digita comando RCON no console web: frontend envia `POST /api/admin/servers/:id/rcon` com `{command}`; API valida o comando contra allowlist, executa via biblioteca RCON com credenciais armazenadas no servidor, retorna output; comando e resultado sao registrados no audit log.
6. Rate limiter protege o endpoint RCON contra abuso; sessao admin e revalidada a cada requisicao.

## Personas
- **Admin**: precisa controlar o ciclo de vida dos servidores de jogo e executar comandos RCON de manutencao sem precisar de acesso SSH ao host
- **Infraestrutura (implicita)**: o host Ubuntu onde os servicos rodam — nunca expoe senha RCON diretamente

## Requisitos Funcionais

### SRVMGMT-REQ-001 - Listagem de Servidores
A rota `/admin/servers` deve exibir todos os servidores cadastrados (CS2 e CS:GO) com: nome, tipo (CS2/CS:GO), status (online/offline), porta de jogo, uptime e numero de jogadores conectados. Os dados de status sao obtidos em tempo real via polling a cada 30 segundos ou via refresh manual.

### SRVMGMT-REQ-002 - Controle de Ciclo de Vida via systemd
Para cada servidor, o admin deve poder executar as acoes: `start`, `stop` e `restart`. A API executa o comando `systemctl <acao> <nome-do-servico>` no host. O resultado (sucesso ou erro) e exibido ao admin em tempo real. Nenhuma dessas acoes usa RCON.

### SRVMGMT-REQ-003 - Console RCON via Web (Proxy de API)
O admin deve ter acesso a um input de texto para digitar comandos RCON. O frontend envia apenas o texto do comando para `POST /api/admin/servers/:id/rcon`; a API e o unico componente que conhece a senha RCON; a API executa o comando e retorna o output como texto. A senha RCON nunca aparece em nenhuma resposta da API, log de acesso, ou payload do frontend.

### SRVMGMT-REQ-004 - Allowlist de Comandos RCON
A API deve manter uma allowlist configuravel de comandos RCON permitidos. Comandos que alterem a senha RCON (ex: `rcon_password`, `sv_password`) ou que possam causar dano catastrofico ao host (ex: comandos de shell injection) devem ser explicitamente bloqueados, retornando 400 com mensagem explicativa. A allowlist deve ser definida em arquivo de configuracao, nao hardcoded.

### SRVMGMT-REQ-005 - Sanitizacao de Comandos RCON
Antes de executar qualquer comando RCON, a API deve sanitizar a entrada removendo caracteres de controle, sequencias de escape e tentativas de injecao de multiplos comandos (ex: separadores `;`, `&&`, pipes). O comando resultante apos sanitizacao e o que e registrado no audit log.

### SRVMGMT-REQ-006 - Rate Limiting no Endpoint RCON
O endpoint `POST /api/admin/servers/:id/rcon` deve ter rate limiting estrito: maximo de 20 requisicoes por minuto por admin. Ao atingir o limite, retorna 429 com header `Retry-After`.

### SRVMGMT-REQ-007 - Status de Recursos do Servidor
A UI deve exibir para cada servidor online: uptime (obtido via `systemctl show`), numero de jogadores conectados e mapa atual (obtidos via comando RCON `status`). Esses dados sao atualizados a cada 30 segundos automaticamente.

### SRVMGMT-REQ-008 - Log de Comandos RCON e Acoes de Ciclo de Vida
Toda execucao de comando RCON e toda acao start/stop/restart deve ser registrada no audit log (feature `admin-logs`) com: admin_id, server_id, action_type (`rcon_command` ou `server_lifecycle`), comando enviado (pos-sanitizacao), output retornado e timestamp.

### SRVMGMT-REQ-009 - Credenciais RCON Armazenadas com Seguranca
As senhas RCON dos servidores devem ser armazenadas encriptadas no banco de dados (AES-256 ou equivalente), ou em arquivo de configuracao com permissoes restritas (600) no host. A API carrega as credenciais em runtime; elas nunca sao retornadas em nenhum endpoint, nem mesmo para admins.

### SRVMGMT-REQ-010 - Autenticacao e Autorizacao Obrigatoria
Todos os endpoints `/api/admin/servers/*` exigem JWT valido com `role=admin`. O middleware de autorizacao da feature `admin-dashboard` e reutilizado. Requisicao sem autenticacao valida retorna 401 ou 403.

## Requisitos Nao Funcionais

### SRVMGMT-NFR-001 - Isolamento Absoluto de Senha RCON
**Critico.** A senha RCON nao deve aparecer em: respostas de API, logs de aplicacao, logs de acesso HTTP, payloads enviados ao frontend, comentarios de codigo ou variaveis de ambiente expostas ao processo do frontend. Revisao de seguranca obrigatoria antes do merge desta feature.

### SRVMGMT-NFR-002 - Validacao de Entrada no Endpoint RCON
Toda entrada de comando RCON deve passar por validacao e sanitizacao antes de qualquer processamento. Entrada invalida deve ser rejeitada com 400; nunca deve atingir a biblioteca RCON sem passar pela allowlist e sanitizacao.

### SRVMGMT-NFR-003 - Timeout na Execucao RCON
Requisicoes RCON devem ter timeout de 5 segundos. Se o servidor de jogo nao responder dentro do prazo, a API retorna 504 ao admin sem travar o processo Node.js.

### SRVMGMT-NFR-004 - Conformidade com TypeScript Strict
Todo codigo novo deve compilar com `strict: true`. A biblioteca RCON utilizada deve ter tipos TypeScript adequados ou wrapper tipado.

### SRVMGMT-NFR-005 - Disponibilidade Independente dos Servidores de Jogo
A UI de gerenciamento deve continuar funcional (exibindo status "offline") mesmo quando todos os servidores de jogo estao inacessiveis. Falhas de conexao RCON nao devem derrubar o processo da API.

## Criterios de Aceitacao

- **AC-001**: O frontend em nenhuma hipotese recebe a senha RCON — inspecionando as respostas de todos os endpoints `/api/admin/servers/*` na DevTools, a string da senha nao aparece em nenhum payload.
- **AC-002**: Ao enviar o comando `rcon_password nova_senha` via console RCON, a API retorna 400 com mensagem "Comando nao permitido" e nenhuma alteracao e feita no servidor de jogo.
- **AC-003**: Um admin sem JWT valido que tenta `POST /api/admin/servers/1/rcon` recebe 401; um usuario com `role=player` recebe 403.
- **AC-004**: Apos 20 requisicoes RCON em menos de 1 minuto pelo mesmo admin, a 21a requisicao recebe 429 com header `Retry-After`.
- **AC-005**: O admin executa `restart` em um servidor CS2 e o status muda de "online" para "offline" e volta a "online" dentro de 30 segundos, com o evento registrado no audit log.
- **AC-006**: Com o servidor de jogo desligado, a pagina `/admin/servers` carrega normalmente exibindo o servidor com status "offline", sem erro 500 na API.
- **AC-007**: O comando `status` retorna o numero correto de jogadores conectados e o output e exibido no console RCON da UI.
- **AC-008**: Tentativa de injecao via comando `status; cat /etc/passwd` e sanitizada e bloqueada antes de chegar a biblioteca RCON.

## Out of Scope (esta feature)
- Configuracao de arquivos `.cfg` dos plugins via UI — coberto pela feature `plugin-config-ui`
- Sistema de audit log com paginacao e filtros — coberto pela feature `admin-logs`
- Monitoramento avancado de recursos do host (CPU, RAM, disco) — fora do escopo v1.0
- Provisionamento de novos servidores de jogo via UI — o installer CLI e responsavel por isso
- Console RCON com streaming em tempo real (WebSocket) — v2.0 se necessario
- Autenticacao direta no painel de administracao do SourceBans++ — Out of Scope do projeto

## Dependencias
- `admin-dashboard`: middleware de autorizacao `role=admin`; layout e navegacao lateral
- `game-stack-baseline`: servicos systemd dos servidores de jogo ja existentes; configuracoes RCON ja definidas
- `admin-logs` (feature paralela da v0.6): servico de audit log para registrar comandos e acoes

## Riscos Iniciais
- **Critico — Vazamento de senha RCON**: qualquer bug no proxy de API pode expor a senha; mitigacao: nunca incluir credenciais no objeto de resposta; teste de seguranca obrigatorio
- **Critico — Injecao via RCON**: comando malicioso pode executar acoes destrutivas no servidor de jogo; mitigacao: allowlist + sanitizacao rigorosa, nunca blocklist
- **Alto — Shell injection via systemctl**: se o nome do servico vier de input do usuario, pode haver injecao de shell; mitigacao: nomes de servicos devem ser fixos em arquivo de configuracao, nunca interpolados diretamente de input HTTP
- **Medio — DoS via console RCON**: muitas requisicoes RCON podem sobrecarregar o servidor de jogo; mitigacao: rate limiting estrito por admin
- **Medio — Servidor de jogo em partida ativa**: restart durante partida causa interrupcao; mitigacao: aviso na UI se houver jogadores conectados antes de confirmar a acao
