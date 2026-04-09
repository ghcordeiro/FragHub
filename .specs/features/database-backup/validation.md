# Database Backup - Validation Report

## Status do gate

- Gate de Validate: **EM PROGRESSO**.
- Escopo: AC-001..AC-008 de `.specs/features/database-backup/spec.md`.

## Evidencias executadas

- `bash -n scripts/installer/*.sh`
- Revisao estatica de:
  - `scripts/installer/database-backup.sh`
  - geracao de `/opt/fraghub/scripts/db-backup.sh` via heredoc;
  - integracao com `install.sh`, `state.sh` e `verify.sh`.

## Resultado por criterio de aceitacao

| AC | Status | Resultado |
| --- | --- | --- |
| AC-001 | PASS (estatico) | Script provisiona `fraghub_backup@127.0.0.1` com grants restritos (`SELECT, LOCK TABLES`). |
| AC-002 | PASS (estatico) | `.my.cnf` e gravado com permissao `600` e dono nao-root; mysqldump usa defaults-file. |
| AC-003 | PASS (estatico) | Script de backup e criado em `/opt/fraghub/scripts/db-backup.sh` com `700` e gera `.sql.gz`. |
| AC-004 | PASS (estatico) | Log inclui timestamp/status (`SUCCESS`/`FAILURE`) e tamanho do arquivo. |
| AC-005 | PASS (estatico) | Cron diario `03:00` e adicionado de forma idempotente no crontab do usuario. |
| AC-006 | PASS (estatico) | Reexecucao detecta cron e artefatos existentes, sem duplicacao. |
| AC-007 | PASS (estatico) | Rotacao implementada por `find ... -mtime +7 -delete` para reter ate 7 dias. |
| AC-008 | PASS (estatico) | Pre-checks (MariaDB, mysqldump, disco, schema baseline) abortam antes de alteracoes quando falham. |

## Riscos residuais

- Fechamento definitivo do gate requer evidencias runtime em Ubuntu real (`sudo -n`, cron ativo e dump real).
- Validacao de restauracao dos dumps permanece fora de escopo desta feature.
