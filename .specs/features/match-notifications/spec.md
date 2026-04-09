# Match Notifications - Especificacao da Feature

## Summary
Implementar notificacoes automaticas de eventos de partida via Discord webhook e banner no portal, com graceful degradation para nao bloquear o fluxo da partida em caso de falha.

## System Process Context
1. Quando o sistema de matchmaking forma uma partida (`PLAYERS_FOUND` → `MAP_VOTE`), o modulo de notificacoes e acionado para enviar um embed no Discord e marcar uma notificacao pendente para cada jogador no portal.
2. Quando a partida finaliza (webhook de resultado recebido pela `matches-api`), o modulo envia um segundo embed no Discord com resultado, MVP e principais mudancas de ELO, e marca as notificacoes do portal como lidas/expiradas.
3. O portal verifica notificacoes pendentes do jogador autenticado via polling (reaproveitando o mesmo ciclo de 3s do `matchmaking-queue`) e exibe banner/badge na UI.
4. Se qualquer envio ao Discord falhar (timeout, webhook invalido, rate limit), o erro e logado e o fluxo da partida continua normalmente.

## Personas
- **Jogador**: quer ser avisado no Discord e no portal quando sua partida estiver pronta, sem precisar ficar olhando a tela o tempo todo.
- **Administrador**: configura o webhook Discord uma unica vez (via wizard do installer ou `.env`) e espera que as notificacoes funcionem sem intervencao manual.
- **Servidor Discord da comunidade**: recebe mensagens formatadas com embed sobre as partidas da comunidade.

## Requisitos Funcionais

### NOTIF-REQ-001 - Webhook Discord: Partida Formada
Quando uma partida for formada, o sistema deve enviar um embed Discord contendo: lista dos 10 jogadores (por nome de usuario e nivel ELO), divisao de times, mapa sorteado/escolhido (apos veto) e endereco de conexao do servidor (`connect ip:port`). O envio deve ocorrer apos a conclusao do map veto (estado `IN_PROGRESS`).

### NOTIF-REQ-002 - Webhook Discord: Partida Finalizada
Quando a partida finalizar (webhook de resultado recebido), o sistema deve enviar um embed Discord contendo: placar final (CT vs TR), time vencedor, jogador MVP (maior contribuicao — a definir pela `matches-api`: maior numero de kills ou metrica combinada), e as 3 maiores variacoes de ELO positivas e negativas da partida.

### NOTIF-REQ-003 - Configuracao do Webhook Discord
A URL do webhook Discord deve ser lida da variavel de ambiente `DISCORD_WEBHOOK_URL`. Se a variavel nao estiver definida, o modulo de notificacoes Discord deve ser desabilitado silenciosamente (sem erro, sem travamento). O wizard do `cli-installer` deve oferecer a coleta deste valor como etapa opcional.

### NOTIF-REQ-004 - Graceful Degradation
Falhas no envio do webhook Discord (timeout de 5 segundos, HTTP 4xx/5xx, excecao de rede) nao devem bloquear nem atrasar o fluxo da partida. O erro deve ser capturado, registrado no log com nivel `WARN` e a execucao deve continuar normalmente.

### NOTIF-REQ-005 - Notificacao no Portal: Banner de Partida Pronta
Quando o jogador tiver uma partida no estado `IN_PROGRESS`, o endpoint `GET /api/queue/status` (ou endpoint dedicado `GET /api/notifications/pending`) deve incluir o campo `matchReady: true` com as informacoes de conexao. O portal deve exibir um banner ou badge destacado na UI indicando que a partida esta pronta.

### NOTIF-REQ-006 - Notificacao no Portal via Polling
O portal deve aproveitar o ciclo de polling existente de 3 segundos do `matchmaking-queue` para verificar notificacoes pendentes. Nao e necessario endpoint separado se o `GET /api/queue/status` ja retornar as informacoes necessarias.

### NOTIF-REQ-007 - Dismissal de Notificacao no Portal
Ao clicar no banner ou apos a partida atingir o estado `FINISHED`, a notificacao de partida pronta deve ser descartada da UI. Nao e necessario persistir o estado de "lido" em banco de dados — o estado e derivado do estado da partida.

### NOTIF-REQ-008 - Formato dos Embeds Discord
Os embeds devem usar a API de embeds do Discord (objeto `embeds` no payload JSON): titulo, descricao, campos (fields) e cor. Cor sugerida: verde para partida formada, azul para resultado. Nao e necessario usar biblioteca externa — o payload pode ser construido manualmente.

## Requisitos Nao Funcionais

### NOTIF-NFR-001 - Timeout de Envio
O envio do webhook Discord deve ter timeout maximo de 5 segundos. Apos esse tempo, a requisicao deve ser cancelada e o erro tratado conforme NOTIF-REQ-004.

### NOTIF-NFR-002 - Nao Bloqueante
O envio de notificacoes deve ser feito de forma assicrona (fire-and-forget com tratamento de erro) para nao bloquear o fluxo principal da partida.

### NOTIF-NFR-003 - Sem Estado Persistido para Notificacoes
Notificacoes nao devem ser persistidas em banco de dados nesta versao. O estado de notificacao e derivado do estado da partida em memoria/banco.

### NOTIF-NFR-004 - Email Fora do Escopo
Notificacoes por email nao devem ser implementadas nesta versao.

## Criterios de Aceitacao

- **AC-001**: Com `DISCORD_WEBHOOK_URL` configurada e valida, apos uma partida atingir `IN_PROGRESS`, um embed e enviado ao canal Discord com os nomes dos 10 jogadores, os dois times, o mapa e o `connect ip:port`.
- **AC-002**: Apos a partida finalizar, um segundo embed e enviado ao Discord com placar final, time vencedor, MVP e as 3 maiores variacoes de ELO positivas e negativas.
- **AC-003**: Com `DISCORD_WEBHOOK_URL` ausente, o sistema nao gera nenhum erro e a partida flui normalmente — verificavel via logs sem entradas de erro relacionadas ao Discord.
- **AC-004**: Com `DISCORD_WEBHOOK_URL` configurada para URL invalida, o erro e registrado no log com nivel `WARN` e a partida continua para `IN_PROGRESS` sem atraso perceptivel (menos de 5s apos timeout).
- **AC-005**: `GET /api/queue/status` retorna `matchReady: true` e o `connectString` quando o jogador tem partida em `IN_PROGRESS`; o portal exibe o banner correspondente.
- **AC-006**: Apos a partida atingir `FINISHED`, o banner de partida pronta desaparece da UI do portal.
- **AC-007**: O embed Discord de partida formada contem exatamente 10 jogadores listados com seus respectivos niveis.

## Out of Scope (esta feature)
- Notificacoes por email (v2.0)
- Notificacoes push no browser (Web Push API, v2.0)
- Notificacoes por SMS ou outros canais
- Historico de notificacoes persistido para o jogador
- Multiplos canais Discord configurados por tipo de evento
- Rate limiting inteligente para evitar spam no Discord em partidas rapidas consecutivas

## Dependencias
- `matchmaking-queue`: fornece os eventos de partida formada e os estados `IN_PROGRESS` e `FINISHED` que disparam as notificacoes
- `matches-api`: fornece o resultado final, placar e dados de MVP apos o webhook de finalizacao
- `elo-system`: fornece as variacoes de ELO por jogador por partida para o embed de resultado
- `cli-installer`: deve ser atualizado para coletar `DISCORD_WEBHOOK_URL` como etapa opcional no wizard de instalacao

## Riscos Iniciais
- **Webhook Discord inativo ou deletado**: o administrador pode deletar o webhook no Discord sem atualizar o `.env`; graceful degradation mitiga o impacto no fluxo da partida.
- **Rate limit do Discord**: em cenarios de muitas partidas simultaneas, o Discord pode retornar HTTP 429; nao ha retry com backoff implementado nesta versao — o evento de notificacao e simplesmente perdido.
- **Formato do embed**: a apresentacao visual dos embeds depende do layout do Discord e pode precisar de ajustes esteticos apos feedback da comunidade.
