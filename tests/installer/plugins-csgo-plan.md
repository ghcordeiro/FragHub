# CS:GO Plugins - Validation Plan (T-04)

## Objetivo

Validar instalacao do bundle base CS:GO (MetaMod, SourceMod, Get5) com evidencias minimas detectaveis e falha acionavel.

## Casos de teste

### CSGOP-01 - Bundle instalado com sucesso

- Setup: `FRAGHUB_ENABLE_GAME_STACK=1`, `game_bootstrap.done` presente.
- Execucao: `bash scripts/installer/plugins-csgo.sh`.
- Esperado:
  - exit code `0`;
  - manifestos `.installed` de MetaMod/SourceMod/Get5 presentes;
  - `plugins-csgo.done` criado.

### CSGOP-02 - Falha por dependencia de bootstrap

- Setup: remover `game-bootstrap.done`.
- Execucao: `bash scripts/installer/plugins-csgo.sh`.
- Esperado:
  - exit code `!= 0`;
  - erro acionavel indicando dependencia ausente.

### CSGOP-03 - Falha de download simulado

- Setup: forcar origem invalida de plugin (URL override invalida).
- Execucao: `bash scripts/installer/plugins-csgo.sh`.
- Esperado:
  - etapa interrompe com erro claro;
  - estado nao marcado como concluido.

## Critérios de aceite da task T-04

- Criterios de presenca/ativacao minima por plugin documentados.
- Cenarios de falha com recuperacao mapeados.
