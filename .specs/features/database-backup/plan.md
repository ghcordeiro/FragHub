# Database Backup - Plan

## Objetivo de arquitetura

Provisionar backup local diario de `fraghub_db` com `mysqldump` + `gzip` e rotacao de 7 dias, com credenciais protegidas e execucao agendada por cron no usuario nao-root do installer.

## Escopo desta fase

- Usuario dedicado de backup no MariaDB.
- Provisionamento de `.my.cnf` seguro.
- Script `db-backup.sh` com verificacao de espaco, dump, compressao, rotacao e log estruturado.
- Registro idempotente de cron diario (03:00).
- Validacao manual pos-configuracao executando o script uma vez.

## Estrategia de implementacao

1. **Precheck de backup**
   - validar `mariadb` ativo, banco/tabelas nucleo, `mysqldump` e `crontab` no PATH;
   - validar espaco minimo para backup.
2. **Credenciais e menor privilegio**
   - criar/reutilizar `fraghub_backup`@`127.0.0.1` com `SELECT, LOCK TABLES`;
   - escrever `.my.cnf` com permissao `600`.
3. **Script de backup**
   - gerar `fraghub_db_YYYYMMDD_HHMMSS.sql.gz`;
   - registrar `SUCCESS/FAILURE` em `/opt/fraghub/logs/db-backup.log`;
   - remover backups com mais de 7 dias.
4. **Agendamento**
   - registrar cron job idempotente para 03:00.
5. **Validacao**
   - executar backup manual e validar arquivo/log.

## Decisoes principais

- Nao usar usuario `fraghub_app` para backup.
- Nao passar senha em argumento de linha de comando.
- Preservar artefatos ja corretos em reexecucao.

## Riscos e mitigacoes

- Falta de espaco em disco: script falha cedo com mensagem acionavel.
- Cron indisponivel: abortar antes de criar artefatos incompletos.
- Permissao incorreta em `.my.cnf`: corrigir para `600` automaticamente.

## Gate de saida

- [x] Plano aderente ao spec e CONSTITUTION.
- [x] Fluxo idempotente e com menor privilegio definido.
- [ ] Gate humano para avancar/revisar tasks.
