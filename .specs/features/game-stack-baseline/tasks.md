# Game Stack Baseline - Tasks (TDAD)

## Gates SDD

| Gate | Estado | Aprovador | Data |
|------|--------|-----------|------|
| Specify (`spec.md`) | Aprovado | utilizador | 2026-04-13 |
| Plan (`plan.md`) | Aprovado | utilizador | 2026-04-13 |
| Tasks (abaixo) | Aprovado | utilizador | 2026-04-13 |
| Implement | Concluído no repo | — | 2026-04-13 |
| Validate | Aprovado | utilizador | 2026-04-13 |

---

## Convencoes

- `T-XX` = tarefa de teste/verificacao.
- `I-XX` = tarefa de implementacao.
- Cada `I-XX` possui ao menos uma `T-XX` pareada.

## Backlog atomico

### T-01 - Plano de validacao de pre-check da stack de jogo

- What: definir casos de pre-condicao para host com `cli-installer`, runtime LinuxGSM/SteamCMD e estrutura esperada de diretórios.
- Where: `tests/installer/game-precheck-plan.md`.
- Done when:
  - [x] Casos positivos e negativos por pre-condicao documentados.
  - [x] Criterios de bloqueio antes de alteracao de sistema definidos.
- Depends on: nenhuma.

### I-01 - Implementar modulo `game_precheck`

- What: criar validacao especifica da stack de jogo antes do provisionamento dual.
- Where: `scripts/installer/game-precheck.sh`, `scripts/installer/install.sh`.
- Done when:
  - [x] Checks de `GSTACK-REQ-001` cobertos.
  - [x] Falha aborta com diagnostico acionavel e sem side effects de instalacao.
  - [x] Checkpoint de etapa integrado ao state store.
- Depends on: T-01.

### T-02 - Plano de smoke para provisionamento CS2/CS:GO

- What: definir roteiro de validacao baseline para provisionamento das duas instancias de jogo.
- Where: `tests/installer/game-bootstrap-plan.md`.
- Done when:
  - [x] Criterios de PASS/FAIL por jogo definidos.
  - [x] Evidencias esperadas de provisionamento minimo mapeadas.
- Depends on: nenhuma.

### I-02 - Implementar modulo `game_bootstrap`

- What: provisionar instancias baseline de CS2 e CS:GO em ordem deterministica.
- Where: `scripts/installer/game-bootstrap.sh`, `scripts/installer/install.sh`.
- Done when:
  - [x] Provisionamento CS2 concluido com verificacao minima.
  - [x] Provisionamento CS:GO concluido com verificacao minima.
  - [x] Reexecucao reaproveita etapas consistentes sem duplicidade indevida.
- Depends on: I-01, T-02.

### T-03 - Plano de validacao de plugins CS2

- What: definir checklist de instalacao e deteccao minima de MetaMod, CounterStrikeSharp e MatchZy.
- Where: `tests/installer/plugins-cs2-plan.md`.
- Done when:
  - [x] Criterios de presenca/ativacao minima por plugin documentados.
  - [x] Cenarios de falha com recuperacao mapeados.
- Depends on: nenhuma.

### I-03 - Implementar modulo `plugin_install_cs2`

- What: instalar bundle de plugins base do CS2 com verificacao minima por etapa.
- Where: `scripts/installer/plugins-cs2.sh`, `scripts/installer/install.sh`.
- Done when:
  - [x] MetaMod, CounterStrikeSharp e MatchZy instalados.
  - [x] Verificacao minima de bundle CS2 executada.
  - [x] Falhas reportadas com acao de recuperacao.
- Depends on: I-02, T-03.

### T-04 - Plano de validacao de plugins CS:GO

- What: definir checklist de instalacao e deteccao minima de MetaMod, SourceMod e Get5.
- Where: `tests/installer/plugins-csgo-plan.md`.
- Done when:
  - [x] Criterios de presenca/ativacao minima por plugin documentados.
  - [x] Cenarios de falha com recuperacao mapeados.
- Depends on: nenhuma.

### I-04 - Implementar modulo `plugin_install_csgo`

- What: instalar bundle de plugins base do CS:GO com verificacao minima por etapa.
- Where: `scripts/installer/plugins-csgo.sh`, `scripts/installer/install.sh`.
- Done when:
  - [x] MetaMod, SourceMod e Get5 instalados.
  - [x] Verificacao minima de bundle CS:GO executada.
  - [x] Falhas reportadas com acao de recuperacao.
- Depends on: I-03, T-04.

### T-05 - Plano de validacao de servicos systemd de jogo

- What: definir testes de `start/stop/restart/status`, logs e comportamento de habilitacao no boot.
- Where: `tests/installer/game-services-plan.md`.
- Done when:
  - [x] Cenários operacionais e de falha documentados.
  - [x] Criterios de PASS/FAIL para servicos de cada jogo definidos.
- Depends on: nenhuma.

### I-05 - Implementar `service_config` para CS2/CS:GO

- What: criar e configurar unidades `fraghub-cs2.service` e `fraghub-csgo.service`.
- Where: `scripts/installer/game-services.sh`, `scripts/installer/install.sh`.
- Done when:
  - [x] Unidades systemd criadas com operacoes basicas funcionais.
  - [x] Habilitacao de boot controlada por politica definida.
  - [x] Logs operacionais acessiveis via `journalctl`.
- Depends on: I-04, T-05.

### T-06 - Plano de validacao E2E, idempotencia e diagnostico final

- What: definir bateria final para AC-001..AC-006, incluindo rerun e falha simulada.
- Where: `tests/installer/game-e2e-plan.md`.
- Done when:
  - [x] Cenarios E2E para primeiro run e rerun documentados.
  - [x] Cenarios de erro com orientacao de recuperacao previstos.
- Depends on: nenhuma.

### I-06 - Implementar `game_verify` e `game_summary` no fluxo principal

- What: consolidar health checks finais da stack de jogo, resumo operacional e checkpoints finais.
- Where: `scripts/installer/game-verify.sh`, `scripts/installer/game-summary.sh`, `scripts/installer/install.sh`, `scripts/installer/state.sh`.
- Done when:
  - [x] Verificacoes finais cobrem provisionamento, plugins e servicos.
  - [x] Resumo final exibe status por jogo e comandos recomendados.
  - [x] Reexecucao respeita checkpoints e evita duplicidade.
- Depends on: I-05, T-06.

## Ordem recomendada de execucao

1. T-01 + I-01
2. T-02 + I-02
3. T-03 + I-03
4. T-04 + I-04
5. T-05 + I-05
6. T-06 + I-06

## Mapeamento para Linear

- Issue pai: `FRA-13`.
- Cada task desta lista deve virar sub-issue apos aprovacao do gate de Tasks.
