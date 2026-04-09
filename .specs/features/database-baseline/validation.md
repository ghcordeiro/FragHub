# Database Baseline - Validation Report

## Status do gate

- Gate de Validate: **EM PROGRESSO**.
- Escopo: AC-001..AC-007 de `.specs/features/database-baseline/spec.md`.

## Evidencias executadas

- `bash -n scripts/installer/database-baseline.sh`
- `bash -n scripts/installer/install.sh`
- Revisao estatica dos artefatos SQL em `scripts/installer/sql/database/*.sql`.

## Resultado por criterio de aceitacao

| AC | Status | Resultado |
| --- | --- | --- |
| AC-001 | PASS (estatico) | Script garante `mariadb` ativo+enabled e escreve `/etc/mysql/conf.d/fraghub.cnf` com `bind-address=127.0.0.1`. |
| AC-002 | PASS (estatico) | Provisiona `fraghub_db` utf8mb4 + `fraghub_app@127.0.0.1` com grants minimos via SQL idempotente. |
| AC-003 | PASS (estatico) | Migrações criam `schema_migrations`, `users`, `matches`, `stats` em utf8mb4_unicode_ci. |
| AC-004 | PASS (estatico) | Controle por `schema_migrations` evita reaplicar migrações registradas. |
| AC-005 | PASS (estatico) | Verificacao testa login real de `fraghub_app` em `fraghub_db` com defaults-file temporário. |
| AC-006 | PASS (local) | Pre-check aborta antes de alterações quando porta 3306 está em uso sem MariaDB. |
| AC-007 | PASS (estatico) | Falhas SQL propagam erro com mensagem acionavel e caminho do log absoluto. |

## Riscos residuais

- Falta execucao E2E em Ubuntu real com `sudo -n` para fechar gate com evidência runtime completa.
