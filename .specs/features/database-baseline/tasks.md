# Database Baseline - Tasks (TDAD)

## Tarefas

### T-01 - Plano de validação da baseline de banco
- [x] Casos de pre-check e pós-check definidos.
- [x] Evidências por AC planejadas.

### I-01 - Implementar módulo `database-baseline`
- [x] Pre-check DBASE-REQ-001.
- [x] Instalação/configuração MariaDB DBASE-REQ-002.
- [x] Provisionamento DB/usuário DBASE-REQ-003.
- [x] `schema_migrations` DBASE-REQ-004.
- [x] Migrações nucleares DBASE-REQ-005.
- [x] Verificação pós-instalação DBASE-REQ-006.
- [x] Idempotência DBASE-REQ-007.
- [x] Erros acionáveis DBASE-REQ-008.

### I-02 - Integrar ao pipeline e estado
- [x] Etapa `database_baseline` em `install.sh`.
- [x] Checkpoint e verify em `state.sh`.
- [x] Smoke ampliado em `verify.sh`/`summary.sh`.

## Ordem executada

1. T-01
2. I-01
3. I-02
