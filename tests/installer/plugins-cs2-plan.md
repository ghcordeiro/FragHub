# CS2 Plugins - Validation Plan (T-03)

## Objetivo

Validar instalacao do bundle base CS2 (MetaMod, CounterStrikeSharp, MatchZy) com evidencias minimas detectaveis e falha acionavel.

## Casos de teste

### CS2P-01 - Bundle instalado com sucesso

- Setup: `FRAGHUB_ENABLE_GAME_STACK=1`, `game_bootstrap.done` presente.
- Execucao: `bash scripts/installer/plugins-cs2.sh`.
- Esperado:
  - exit code `0`;
  - manifestos `.installed` de MetaMod/CounterStrikeSharp/MatchZy presentes;
  - `plugins-cs2.done` criado.

### CS2P-02 - Falha por dependencia de bootstrap

- Setup: remover `game-bootstrap.done`.
- Execucao: `bash scripts/installer/plugins-cs2.sh`.
- Esperado:
  - exit code `!= 0`;
  - erro acionavel indicando dependencia ausente.

### CS2P-03 - Falha de download simulado

- Setup: forcar origem invalida de plugin (URL override invalida).
- Execucao: `bash scripts/installer/plugins-cs2.sh`.
- Esperado:
  - etapa interrompe com erro claro;
  - estado nao marcado como concluido.

## Critérios de aceite da task T-03

- Criterios de presenca/ativacao minima por plugin documentados.
- Cenarios de falha com recuperacao mapeados.
