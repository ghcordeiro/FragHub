# Database Baseline - Plan

## Objetivo de arquitetura

Provisionar MariaDB local-only para o FragHub com schema versionado, credenciais seguras e validação pós-instalação idempotente.

## Módulos e responsabilidades

1. `scripts/installer/database-baseline.sh`
   - pre-check (SO, arquitetura, porta 3306, espaço em disco);
   - instalação/configuração do MariaDB com bind local;
   - criação de `fraghub_db` e `fraghub_app`;
   - aplicação de migrações e verificação final.
2. `scripts/installer/sql/database/*.sql`
   - migrações versionadas para `users`, `matches`, `stats`.
3. integração em `install.sh` + `state.sh`
   - etapa dedicada `database_baseline` com checkpoint e rerun seguro.

## Estratégia de segurança

- `bind-address=127.0.0.1` em arquivo dedicado (`/etc/mysql/conf.d/fraghub.cnf`).
- credenciais de app em arquivo local não versionado (`mysql-app.cnf`, permissão 600).
- execução SQL sem expor senha em argumentos.

## Estratégia de idempotência

- `CREATE ... IF NOT EXISTS` para banco/usuário/objetos base.
- `schema_migrations` como fonte de verdade para skip de migrações.
- etapa pulada apenas quando marcador + verificação de consistência estiverem válidos.

## Critérios de saída

- [x] Fluxo de `database-baseline` integrado ao installer.
- [x] Migrações versionadas implementadas.
- [x] Verificações de schema/charset e login de aplicação implementadas.
- [ ] Gate humano de revisão/approve.
