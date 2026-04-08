# CLI Installer - Tasks (TDAD)

## Convencoes

- `T-XX` = tarefa de teste/verificacao.
- `I-XX` = tarefa de implementacao.
- Cada `I-XX` possui ao menos uma `T-XX` pareada.

## Backlog atomico

### T-01 - Plano de validacao dos pre-checks

- What: definir casos para OS, arquitetura, sudo, disco, RAM e rede.
- Where: `tests/installer/precheck-plan.md`.
- Done when:
  - [ ] Casos positivos e negativos documentados.
  - [ ] Criterios de falha claros por check.
- Depends on: nenhuma.

### I-01 - Implementar modulo `precheck`

- What: criar execucao de pre-checks com mensagens acionaveis.
- Where: `scripts/installer/precheck.sh`.
- Done when:
  - [ ] Todos os checks de `CLI-REQ-001` cobertos.
  - [ ] Falhas encerram com codigo de saida != 0.
  - [ ] Sem alteracao de sistema em ambiente nao suportado.
- Depends on: T-01.

### T-02 - Validar UX do wizard e campos obrigatorios

- What: definir roteiro de validacao para prompts obrigatorios/opcionais.
- Where: `tests/installer/input-plan.md`.
- Done when:
  - [ ] Casos de campo vazio e formato invalido cobertos.
  - [ ] Criterios de bloqueio para campos obrigatorios definidos.
- Depends on: nenhuma.

### I-02 - Implementar modulo `collect_input`

- What: implementar wizard interativo com validacao de entradas e defaults.
- Where: `scripts/installer/input.sh`.
- Done when:
  - [ ] Campos obrigatorios bloqueiam avancar quando invalidos.
  - [ ] Campos opcionais aceitam omissao segura.
  - [ ] Saida sanitizada para nao vazar segredos.
- Depends on: I-01, T-02.

### T-03 - Testes de seguranca para segredos e logs

- What: definir checklist de mascaramento de segredos em logs e stdout.
- Where: `tests/installer/security-plan.md`.
- Done when:
  - [ ] Lista de segredos sensiveis validada.
  - [ ] Criterio de mascaramento definido.
- Depends on: nenhuma.

### I-03 - Implementar geracao de segredos e mascaramento

- What: adicionar geracao segura de senha e mascaramento em logs.
- Where: `scripts/installer/secrets.sh`, `scripts/installer/logging.sh`.
- Done when:
  - [ ] Segredos auto-gerados quando ausentes.
  - [ ] Nenhum segredo em texto puro no output.
  - [ ] Permissao restrita para arquivos sensiveis.
- Depends on: I-02, T-03.

### T-04 - Validacao de idempotencia e retomada

- What: definir cenarios de reexecucao apos sucesso/falha parcial.
- Where: `tests/installer/idempotency-plan.md`.
- Done when:
  - [ ] Cenarios de rerun mapeados.
  - [ ] Resultado esperado por etapa documentado.
- Depends on: nenhuma.

### I-04 - Implementar `state store` local por etapa

- What: persistir estado por etapa para permitir reexecucao segura.
- Where: `scripts/installer/state.sh`.
- Done when:
  - [ ] Marcadores de etapa persistidos.
  - [ ] Skip condicionado a verificacao minima.
  - [ ] Falha parcial permite retomada controlada.
- Depends on: I-01, T-04.

### T-05 - Smoke test da instalacao baseline

- What: definir teste final de saude para componentes basicos instalados.
- Where: `tests/installer/smoke-plan.md`.
- Done when:
  - [ ] Lista de componentes obrigatorios definida.
  - [ ] Criterios de PASS/FAIL claros.
- Depends on: nenhuma.

### I-05 - Implementar bootstrap, verify e summarize

- What: implementar instalacao base, checks finais e resumo de saida.
- Where: `scripts/installer/bootstrap.sh`, `scripts/installer/verify.sh`, `scripts/installer/summary.sh`.
- Done when:
  - [ ] Dependencias base instaladas conforme spec.
  - [ ] Health checks finais executados.
  - [ ] Resumo final com pendencias e proximos passos.
- Depends on: I-03, I-04, T-05.

## Ordem recomendada de execucao

1. T-01 + I-01
2. T-02 + I-02
3. T-03 + I-03
4. T-04 + I-04
5. T-05 + I-05

## Mapeamento para Linear

- `FRA-9` cobre a primeira fatia de implementacao (pre-checks), alinhada a `T-01` + `I-01`.
- Demais tasks devem ser abertas como sub-issues de `FRA-5` antes de iniciar execucao completa.
