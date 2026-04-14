# Database Backup - Tasks (TDAD)

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
- Cada `I-XX` deve ter ao menos uma `T-XX` pareada.

## Backlog atomico

### T-01 - Plano de validacao de pre-check e privilegios de backup

- What: definir verificacoes de MariaDB ativo, banco baseline existente, `mysqldump`, `cron` e grants minimos.
- Where: `tests/installer/database-backup-plan.md`.
- Done when:
  - [x] Critérios de PASS/FAIL para pre-condicoes de `DBKP-REQ-001` definidos.
  - [x] Evidencia de grants para `fraghub_backup` mapeada.
- Depends on: nenhuma.

### I-01 - Implementar `database_backup` no installer

- What: criar fluxo de configuracao de backup diario com script, `.my.cnf`, rotacao e cron idempotente.
- Where: `scripts/installer/database-backup.sh`, `scripts/installer/install.sh`, `scripts/installer/state.sh`.
- Done when:
  - [x] Usuario `fraghub_backup` e `.my.cnf` aplicados com menor privilegio.
  - [x] Script `/opt/fraghub/scripts/db-backup.sh` criado com rotação 7 dias e check de espaco.
  - [x] Cron diario em 03:00 configurado sem duplicidade.
  - [x] Execucao manual pos-setup validada na etapa.
- Depends on: T-01.

### T-02 - Plano de validacao por AC e rotacao

- What: definir roteiro por AC-001..AC-008 incluindo simulacao de arquivos com mais de 7 dias.
- Where: `.specs/features/database-backup/validation.md`.
- Done when:
  - [x] Evidencias para AC-001..AC-008 documentadas.
  - [x] Resultado de rotacao e idempotencia registrado.
- Depends on: I-01.

## Ordem recomendada de execucao

1. T-01 + I-01
2. T-02
