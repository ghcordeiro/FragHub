# Game Stack E2E - Validation Plan (T-06)

## Objetivo

Definir validacao ponta-a-ponta da stack de jogo cobrindo AC-001..AC-006, rerun idempotente e falhas com recuperacao.

## Bateria principal

### GE2E-01 - Primeiro run completo

- Setup: host com `cli-installer` concluido.
- Execucao: `FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh`.
- Esperado:
  - `game_precheck`, `game_bootstrap`, `plugins_cs2`, `plugins_csgo`, `game_services`, `game_verify`, `game_summary` concluem;
  - resumo final com status por jogo/servico.

### GE2E-02 - Rerun idempotente

- Setup: run completo ja executado.
- Execucao: rerun do mesmo comando.
- Esperado:
  - etapas concluidas sao puladas quando consistentes;
  - sem duplicidade indevida.

### GE2E-03 - Falha simulada com recuperacao

- Setup: remover marcador de dependencia intermediaria (ex.: `plugins-cs2.done`).
- Execucao: rerun do installer.
- Esperado:
  - etapa inconsistente volta para pending e reexecuta;
  - erro (quando houver) mostra log e acao de recuperacao.

## Critérios de aceite da task T-06

- Cenarios E2E para primeiro run e rerun documentados.
- Cenarios de erro com orientacao de recuperacao previstos.
