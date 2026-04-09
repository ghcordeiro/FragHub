# Matchmaking Queue - Especificacao da Feature

## Summary
Implementar o sistema completo de fila de matchmaking end-to-end: entrada/saida de jogadores, formacao automatica de partida com balanceamento por ELO, state machine de partida, map veto com eliminacao alternada e inicializacao via RCON, com pagina de status em tempo real no portal.

## System Process Context
1. Jogador autenticado com Steam vinculada acessa o portal e clica em "Entrar na Fila" na pagina `/queue`.
2. O cliente chama `POST /api/queue/join`; o servidor valida autenticacao, Steam vinculada e ausencia de partida ativa do jogador.
3. A fila em memoria acumula jogadores. Quando 10 jogadores estao presentes, o servidor forma dois times balanceados por ELO (diferenca maxima entre ELO medio dos times e configuravel).
4. A partida entra no estado `PLAYERS_FOUND` e o map veto comeca: cada capitan elimina um mapa alternadamente do pool configuravel ate restar um.
5. Apos o veto, a partida avanca para `IN_PROGRESS`: o servidor emite o comando RCON para iniciar a partida no servidor de jogo com o mapa escolhido.
6. A `matches-api` recebe o webhook de finalizacao e avanca o estado para `FINISHED`, acionando o sistema de ELO e notificacoes.
7. O portal faz polling a cada 3 segundos em `GET /api/queue/status` e atualiza a UI conforme o estado da partida.

## Personas
- **Jogador casual**: quer entrar na fila com um clique e ser notificado quando a partida estiver pronta.
- **Capitao de time**: precisa eliminar mapas no veto de forma intuitiva via portal.
- **Administrador**: precisa configurar pool de mapas, diferenca maxima de ELO e timeout de fila sem alterar codigo.
- **Servidor de jogo (RCON)**: recebe o comando de inicio de partida com o mapa e configuracoes corretas.

## Requisitos Funcionais

### QUEUE-REQ-001 - Entrada na Fila
`POST /api/queue/join` deve: validar JWT do jogador, verificar que o jogador possui Steam vinculada, verificar que o jogador nao esta em outra partida ativa (`IN_PROGRESS`) e adicionar o jogador a fila em memoria com `timestamp` de entrada. Retorna HTTP 200 com posicao na fila ou HTTP 409 se o jogador ja estiver na fila ou em partida ativa.

### QUEUE-REQ-002 - Saida da Fila
`POST /api/queue/leave` deve remover o jogador da fila em memoria se estiver presente. Retorna HTTP 200. Nao tem efeito se o jogador nao estiver na fila (nao deve retornar erro).

### QUEUE-REQ-003 - Status da Fila
`GET /api/queue/status` deve retornar o estado atual do jogador autenticado: `NOT_IN_QUEUE`, `IN_QUEUE` (posicao, total na fila), `PLAYERS_FOUND` (lista de jogadores, times formados), `MAP_VOTE` (estado atual do veto, mapa que o jogador deve eliminar, se for seu turno), `IN_PROGRESS` (info do servidor, mapa, connect string) ou `FINISHED`.

### QUEUE-REQ-004 - Formacao Automatica de Partida
Quando 10 jogadores estiverem na fila, o servidor deve automaticamente: ordenar jogadores por ELO, distribuir nos dois times usando algoritmo de balanceamento (snake draft: 1-2-2-2-2-1) para minimizar diferenca de ELO medio. Se a diferenca entre ELO medio dos times ultrapassar o valor configuravel `MAX_ELO_DIFF`, o sistema deve reagrupar antes de prosseguir.

### QUEUE-REQ-005 - Timeout de Inatividade na Fila
Jogadores que nao renovarem presenca (via `GET /api/queue/status` ou qualquer request autenticado) por mais de `QUEUE_TIMEOUT_MINUTES` (configuravel, padrao 10 minutos) devem ser removidos automaticamente da fila. O sistema deve verificar timeouts a cada 60 segundos via processo interno.

### QUEUE-REQ-006 - State Machine de Partida
A partida deve seguir os estados em sequencia:
- `WAITING_PLAYERS`: aguardando completar 10 jogadores.
- `PLAYERS_FOUND`: 10 jogadores confirmados, times definidos, aguardando inicio do veto.
- `MAP_VOTE`: veto em andamento.
- `IN_PROGRESS`: mapa escolhido, RCON enviado, partida rodando no servidor.
- `FINISHED`: webhook de resultado recebido, ELO e notificacoes processados.
Transicoes invalidas (ex: `FINISHED` → `MAP_VOTE`) devem ser rejeitadas.

### QUEUE-REQ-007 - Map Veto por Eliminacao
Durante `MAP_VOTE`, os dois capitaes (jogador com maior ELO de cada time) eliminam mapas alternadamente do pool configuravel ate restar um. `POST /api/queue/vote-map` com `{ "action": "ban", "map": "de_mirage" }` registra a eliminacao. O sistema deve validar que e a vez do capitao e que o mapa ainda esta no pool. Timeout de 30 segundos por turno de veto (configuravel); se expirar, o servidor escolhe aleatoriamente um mapa do pool restante para banir.

### QUEUE-REQ-008 - Inicio de Partida via RCON
Apos conclusao do map veto, o servidor deve enviar comando RCON ao servidor de jogo com: mapa escolhido, lista de jogadores (SteamIDs), configuracoes da partida (MatchZy para CS2 / Get5 para CS:GO). Em caso de falha no RCON, o sistema deve: registrar erro no log, aguardar 30 segundos e tentar novamente (ate 3 tentativas). Se todas falharem, a partida retorna para `WAITING_PLAYERS` e os jogadores sao notificados.

### QUEUE-REQ-009 - Pagina de Fila no Portal (`/queue`)
A pagina `/queue` deve: exibir o estado atual do jogador (baseado em polling a cada 3 segundos de `GET /api/queue/status`), permitir entrar/sair da fila, exibir a tela de map veto interativa quando for a vez do capitao, e exibir as informacoes de connect do servidor quando a partida comecar.

### QUEUE-REQ-010 - Pool de Mapas Configuravel
O pool de mapas disponivel para o veto deve ser configuravel via variavel de ambiente `QUEUE_MAP_POOL` (lista separada por virgula). Padrao: `de_dust2,de_mirage,de_inferno,de_nuke,de_overpass,de_ancient,de_anubis`.

### QUEUE-REQ-011 - Prevencao de Duplicatas
Um jogador nao pode estar na fila mais de uma vez simultaneamente. O sistema deve usar o `player_id` como chave unica na estrutura em memoria.

### QUEUE-REQ-012 - Limpeza de Partida Finalizada
Apos a partida atingir o estado `FINISHED`, o registro da partida deve ser removido da memoria e o estado do jogador em `GET /api/queue/status` deve retornar `NOT_IN_QUEUE`.

## Requisitos Nao Funcionais

### QUEUE-NFR-001 - Fila em Memoria
A fila e mantida em memoria no processo Node.js (sem Redis). Isso significa que a fila e perdida ao reiniciar o processo — comportamento documentado e aceito para v0.5. Redis e previsto para v2.0.

### QUEUE-NFR-002 - Concorrencia
O acesso a estrutura de fila em memoria deve ser protegido contra race conditions. Como Node.js e single-threaded, o loop de eventos garante atomicidade por operacao — nao e necessario mutex, mas o codigo nao deve usar operacoes assincronas intermediarias dentro de modificacoes criticas da fila.

### QUEUE-NFR-003 - Polling
O portal deve usar polling HTTP a cada 3 segundos para `GET /api/queue/status`. SSE e WebSocket sao v2.0.

### QUEUE-NFR-004 - Configurabilidade
Os parametros `MAX_ELO_DIFF`, `QUEUE_TIMEOUT_MINUTES`, `QUEUE_MAP_POOL` e `VETO_TIMEOUT_SECONDS` devem ser lidos de variaveis de ambiente com valores default documentados.

### QUEUE-NFR-005 - Logs
Todos os eventos criticos (jogador entrou/saiu da fila, partida formada, veto iniciado/concluido, RCON enviado/falhou, partida finalizada) devem ser registrados no sistema de logging existente com nivel `INFO` ou `ERROR`.

## Criterios de Aceitacao

- **AC-001**: Jogador sem Steam vinculada recebe HTTP 403 ao chamar `POST /api/queue/join`.
- **AC-002**: Ao atingir 10 jogadores na fila, `GET /api/queue/status` de qualquer dos 10 jogadores retorna estado `PLAYERS_FOUND` com os dois times formados e ELO medio de cada time calculado.
- **AC-003**: A diferenca entre ELO medio dos dois times formados nao ultrapassa `MAX_ELO_DIFF` (verificavel via resposta do `GET /api/queue/status`).
- **AC-004**: Durante `MAP_VOTE`, `POST /api/queue/vote-map` do capitao correto bane o mapa informado e atualiza o pool; tentativa do mesmo endpoint por jogador nao-capitao retorna HTTP 403.
- **AC-005**: Apos o veto concluir, o sistema envia o comando RCON e a partida avanca para `IN_PROGRESS`; `GET /api/queue/status` retorna a connect string do servidor.
- **AC-006**: Jogador inativo por mais de `QUEUE_TIMEOUT_MINUTES` e removido da fila; confirmavel via `GET /api/queue/status` que retorna `NOT_IN_QUEUE`.
- **AC-007**: Se o RCON falhar 3 vezes consecutivas, a partida retorna para `WAITING_PLAYERS` e os jogadores sao recolocados na fila automaticamente.
- **AC-008**: Jogador que chama `POST /api/queue/join` duas vezes recebe HTTP 409 na segunda chamada.
- **AC-009**: A pagina `/queue` exibe o estado atualizado em no maximo 6 segundos apos mudanca de estado (2 ciclos de polling de 3s).
- **AC-010**: Apos a partida atingir `FINISHED`, `GET /api/queue/status` retorna `NOT_IN_QUEUE` para todos os jogadores que participaram.

## Out of Scope (esta feature)
- Fila persistente com Redis (v2.0)
- WebSocket ou Server-Sent Events para atualizacoes em tempo real (v2.0)
- Fila para mais de um servidor simultaneamente (multi-server, v2.0)
- Sistema de penalidade por desistencia na fila ou veto (v2.0)
- Matchmaking por regiao geografica (v2.0)
- Fila para modalidades diferentes de 5v5 (ex: 2v2, pistol only)

## Dependencias
- `elo-system`: fornece o ELO atualizado de cada jogador para o balanceamento de times
- `auth-api`: validacao de JWT para todos os endpoints da fila
- `steam-integration`: verificacao de Steam vinculada no `POST /api/queue/join`
- `matches-api`: criacao do registro de partida ao formar os times; recepcao do webhook de finalizacao para avancar para `FINISHED`
- Servidor de jogo (CS2/CS:GO) com RCON habilitado e configurado no `cli-installer`
- `frontend-setup`: base do frontend React para a pagina `/queue`
- `auth-ui`: autenticacao no portal para acesso a pagina `/queue`

## Riscos Iniciais
- **Perda de fila ao reiniciar**: a fila em memoria e zerada a cada restart do processo Node.js — partidas em andamento nao sao afetadas (persistidas no banco), mas jogadores na fila perdem a posicao.
- **Race condition em requests simultaneos**: multiplos requests de `join` quase simultaneos de diferentes jogadores podem causar comportamento inesperado; mitigado pelo event loop single-threaded do Node.js, mas o codigo deve evitar awaits dentro de secoes criticas.
- **Desistencia durante map veto**: jogador que fecha o browser durante o veto deixa o capitao sem resposta; mitigado pelo timeout de veto automatico.
- **Falha de RCON**: o servidor de jogo pode estar offline, reiniciando ou com RCON mal configurado; a logica de retry e fallback para `WAITING_PLAYERS` mitiga, mas a experiencia do usuario e degradada.
- **Balanceamento ruim com ELO inicial**: jogadores novos (todos em ELO 1000) formam times perfeitamente balanceados no papel, mas com habilidade real desigual — limitacao conhecida do periodo de calibracao.
