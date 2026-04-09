# Game Stack Bootstrap - Validation Plan (T-02)

## Objetivo

Validar o provisionamento baseline de CS2 e CS:GO via LinuxGSM, incluindo ordem de execucao, evidencias minimas por jogo e comportamento de rerun seguro.

## Escopo de verificacao

- Provisionamento em ordem deterministica: CS2 -> CS:GO.
- Evidencias minimas de bootstrap por instancia.
- Comportamento de dry-run e modo real.
- Idempotencia de etapa com state store.

## Casos de teste

### GB-01 - Caminho feliz em dry-run

- Setup:
  - `FRAGHUB_ENABLE_GAME_STACK=1`
  - `FRAGHUB_GAME_BOOTSTRAP_DRY_RUN=1`
  - `game_precheck.done` presente.
- Execucao:
  - `bash scripts/installer/game-bootstrap.sh`.
- Esperado:
  - exit code `0`;
  - placeholders de bootstrap para CS2 e CS:GO criados;
  - marcador `game-bootstrap.done` criado.

### GB-02 - Caminho feliz em modo real

- Setup:
  - host com LinuxGSM funcional e conectividade.
  - `FRAGHUB_GAME_BOOTSTRAP_DRY_RUN=0`.
- Execucao:
  - `bash scripts/installer/game-bootstrap.sh`.
- Esperado:
  - scripts de instancia LinuxGSM (`cs2server`, `csgoserver`) presentes e executaveis;
  - evidencia de auto-install por jogo registrada no log;
  - marcador de etapa criado.

### GB-03 - Falha por precheck nao concluido

- Setup:
  - remover `game-precheck.done`.
- Execucao:
  - `bash scripts/installer/game-bootstrap.sh`.
- Esperado:
  - exit code `!= 0`;
  - erro acionavel indicando dependencia de `game_precheck`.

### GB-04 - Falha parcial em uma trilha de jogo

- Setup:
  - induzir erro no provisionamento de CS:GO (ex.: endpoint indisponivel).
- Execucao:
  - `bash scripts/installer/game-bootstrap.sh`.
- Esperado:
  - etapa interrompida com diagnostico claro;
  - estado nao marcado como concluido sem consistencia minima.

### GB-05 - Rerun sem duplicidade indevida

- Setup:
  - concluir etapa uma vez com sucesso.
- Execucao:
  - rerun via `install.sh` com stack habilitada.
- Esperado:
  - etapa `game_bootstrap` pulada quando verificacao de consistencia passar;
  - sem reprocessamento desnecessario.

## Critérios de aceite da task T-02

- Criterios de PASS/FAIL definidos para CS2 e CS:GO.
- Evidencias esperadas de provisionamento minimo documentadas.
