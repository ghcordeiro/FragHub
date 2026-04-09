# ELO System - Especificacao da Feature

## Summary
Implementar o sistema de ELO na API usando Glicko-2 simplificado, atualizando automaticamente o ranking de cada jogador ao receber o webhook de resultado de partida e expondo endpoints de consulta de historico.

## System Process Context
1. Ao criar conta, o jogador recebe ELO inicial de 1000 (Nivel 4).
2. Ao finalizar uma partida, a `matches-api` recebe o webhook autenticado (shared secret) com o resultado.
3. O sistema de ELO calcula a variacao de pontos para cada jogador com base no resultado (vitoria/derrota), no ELO atual e no numero de partidas jogadas (coeficiente K adaptativo).
4. O ELO de cada jogador e atualizado na base de dados e o nivel (1-10) e recalculado pelas faixas definidas.
5. O historico de ELO e registrado por partida para consulta posterior via endpoint dedicado.

## Personas
- **Jogador competitivo**: quer ver sua evolucao de ELO partida a partida e entender seu nivel atual.
- **Administrador**: precisa garantir que o sistema e imune a manipulacoes e que o ELO reflete partidas reais.
- **Plugin in-game**: consome o nivel do jogador via `/api/player/{steamid}` para exibir a tag correta no servidor.

## Requisitos Funcionais

### ELO-REQ-001 - ELO Inicial
Ao criar uma conta de jogador (via `players-api`), o campo `elo` deve ser inicializado em `1000` e o nivel calculado como `4`.

### ELO-REQ-002 - Calculo de Variacao por Partida
O calculo da variacao de ELO deve usar Glicko-2 simplificado: coeficiente K adaptativo baseado no numero de partidas jogadas (K=40 para menos de 10 partidas, K=20 para 10-30 partidas, K=10 para mais de 30 partidas). A variacao e calculada individualmente para cada jogador com base no ELO medio do time adversario.

### ELO-REQ-003 - Atualizacao via Webhook Autenticado
O ELO dos jogadores so pode ser atualizado quando a `matches-api` processar um webhook de resultado de partida autenticado via shared secret (header `X-Webhook-Secret`). Qualquer tentativa de atualizacao direta do ELO por outro meio deve ser bloqueada.

### ELO-REQ-004 - Mapeamento ELO para Nivel
O nivel do jogador (1-10) deve ser calculado automaticamente a partir do ELO com as seguintes faixas:
- Nivel 1: 0–500 | Nivel 2: 501–750 | Nivel 3: 751–900 | Nivel 4: 901–1050
- Nivel 5: 1051–1200 | Nivel 6: 1201–1350 | Nivel 7: 1351–1530 | Nivel 8: 1531–1750
- Nivel 9: 1751–2000 | Nivel 10: 2001+

### ELO-REQ-005 - Historico de ELO por Jogador
O endpoint `GET /api/players/:id/elo-history` deve retornar a lista de entradas de historico do jogador com: `matchId`, `eloAntes`, `eloDepois`, `variacao`, `resultado` (win/loss) e `timestamp`. Paginacao opcional via query params `page` e `limit`.

### ELO-REQ-006 - Registro de Historico por Partida
A cada atualizacao de ELO, o sistema deve persistir um registro na tabela `elo_history` contendo todos os campos listados no REQ-005, vinculado ao `match_id` e ao `player_id`.

### ELO-REQ-007 - ELO Minimo
O ELO de um jogador nao pode cair abaixo de 0 (floor). Em caso de variacao negativa que resulte em valor negativo, o ELO e fixado em 0.

### ELO-REQ-008 - Campo de Nivel no Endpoint de Jogador
O endpoint `GET /api/players/:id` e `GET /api/player/:steamid` devem retornar os campos `elo` e `level` calculados e atualizados.

## Requisitos Nao Funcionais

### ELO-NFR-001 - Atomicidade das Atualizacoes
A atualizacao de ELO de todos os jogadores de uma partida deve ocorrer em uma unica transacao de banco de dados para evitar estados inconsistentes.

### ELO-NFR-002 - Idempotencia do Webhook
O processamento do webhook de resultado nao deve atualizar o ELO mais de uma vez para a mesma partida. O `match_id` deve ser verificado antes de qualquer atualizacao.

### ELO-NFR-003 - Performance
O calculo e persistencia do ELO para uma partida de 10 jogadores deve completar em menos de 500ms.

### ELO-NFR-004 - Sem Decay de ELO
Decay de ELO (perda por inatividade) esta fora do escopo desta versao e nao deve ser implementado.

## Criterios de Aceitacao

- **AC-001**: Ao criar um novo jogador, o campo `elo` retornado pela API e `1000` e `level` e `4`.
- **AC-002**: Apos receber um webhook valido de partida finalizada, o ELO de todos os 10 jogadores e atualizado na base de dados e um registro e inserido em `elo_history` para cada um.
- **AC-003**: Um webhook com `X-Webhook-Secret` invalido ou ausente retorna HTTP 401 e nao altera nenhum ELO.
- **AC-004**: Um segundo webhook com o mesmo `match_id` nao altera nenhum ELO (idempotencia verificavel via `elo_history`).
- **AC-005**: `GET /api/players/:id/elo-history` retorna lista ordenada por `timestamp` decrescente com os campos `matchId`, `eloAntes`, `eloDepois`, `variacao`, `resultado` e `timestamp`.
- **AC-006**: Jogador com ELO 50 que sofre variacao de -100 tem ELO fixado em 0, nao em -50.
- **AC-007**: Um jogador com menos de 10 partidas tem coeficiente K=40; entre 10-30 partidas, K=20; acima de 30, K=10 — verificavel pelos valores de variacao registrados no historico.
- **AC-008**: `GET /api/players/:id` e `GET /api/player/:steamid` retornam `elo` e `level` corretos e atualizados apos cada partida.

## Out of Scope (esta feature)
- Decay de ELO por inatividade (v2.0)
- Rating Deviation completo do Glicko-2 (volatilidade e desvio padrao)
- Interface visual de historico de ELO (pertence a `player-profile-ui`)
- Recalculo retroativo de ELO para partidas anteriores
- Sistema de temporadas ou reset de ELO

## Dependencias
- `matches-api`: fornece o webhook de resultado de partida e o modelo de match com lista de jogadores e resultado
- `players-api`: fornece o modelo de jogador e os endpoints de consulta; o campo `elo` e `level` devem ser adicionados ou atualizados neste modelo
- Banco de dados MariaDB 10.6+ com tabela `elo_history` a ser criada via migration

## Riscos Iniciais
- **Inflacao de ELO com poucos jogadores**: com base pequena de usuarios, os calculos podem gerar distribuicao de ELO irreal; as faixas podem precisar de ajuste apos dados reais de producao.
- **Calibracao das faixas 1-10**: os limites de ELO foram definidos a priori e podem nao refletir a distribuicao real dos jogadores — monitoramento pos-lancamento necessario.
- **Coeficiente K simplificado**: a simplificacao do Glicko-2 (sem deviation) pode penalizar ou beneficiar excessivamente jogadores recentes.
