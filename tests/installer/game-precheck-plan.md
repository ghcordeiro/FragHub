# Game Stack Precheck - Validation Plan (T-01)

## Objetivo

Validar que o modulo `game_precheck` bloqueia provisionamento de stack de jogo em ambientes sem pre-condicoes minimas e libera execucao quando o host esta pronto.

## Escopo de verificacao

- Pre-condicoes do `cli-installer` concluido.
- Runtime LinuxGSM disponivel no host.
- Conectividade para endpoints criticos de distribuicao.
- Estrutura minima de diretorios esperada para stack de jogo.

## Casos de teste

### GP-01 - Caminho feliz (host pronto)

- Setup:
  - `bootstrap.done` presente.
  - `effective.env` presente.
  - `${HOME}/fraghub/linuxgsm/linuxgsm.sh` executavel.
- Execucao:
  - `bash scripts/installer/game-precheck.sh`.
- Esperado:
  - exit code `0`;
  - log de sucesso por check;
  - marcador `game-precheck.done` criado.

### GP-02 - Falha por pre-condicao ausente do installer

- Setup:
  - remover `bootstrap.done`.
- Execucao:
  - `bash scripts/installer/game-precheck.sh`.
- Esperado:
  - exit code `!= 0`;
  - erro acionavel apontando pre-condicao ausente;
  - nenhuma etapa de provisionamento de jogo executada.

### GP-03 - Falha por runtime LinuxGSM ausente

- Setup:
  - remover ou tornar nao executavel `${HOME}/fraghub/linuxgsm/linuxgsm.sh`.
- Execucao:
  - `bash scripts/installer/game-precheck.sh`.
- Esperado:
  - exit code `!= 0`;
  - erro indicando runtime LinuxGSM invalido.

### GP-04 - Falha de conectividade externa

- Setup:
  - simular indisponibilidade de rede para endpoints Steam/GitHub.
- Execucao:
  - `bash scripts/installer/game-precheck.sh`.
- Esperado:
  - exit code `!= 0`;
  - endpoint com falha identificado no log.

### GP-05 - Idempotencia da etapa

- Setup:
  - executar `game-precheck.sh` duas vezes seguidas em host valido.
- Execucao:
  - rerun da etapa via `install.sh`.
- Esperado:
  - estado `game_precheck=done` reutilizado quando consistencia minima for verdadeira;
  - rerun nao altera estado funcional do host.

## Critérios de aceite da task T-01

- Casos positivos e negativos documentados por pre-condicao.
- Criterios de bloqueio antes de alteracao do sistema explicitados.
