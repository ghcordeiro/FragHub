# Database Backup - Especificacao da Feature

## Summary

A feature `database-backup` configura backup automatico diario do banco `fraghub_db` via `mysqldump` com cron, rotacao local de 7 dias, compressao gzip, credenciais protegidas em arquivo `.my.cnf` com permissoes 600 e registro de resultado em log.

## System Process Context

1. Operador executa o fluxo de configuracao de backup em host com `database-baseline` concluida e MariaDB operacional.
2. Sistema valida pre-condicoes: MariaDB ativo, banco `fraghub_db` existente, usuario de backup com privilegios de leitura, espaco em disco disponivel.
3. Installer cria usuario dedicado de backup `fraghub_backup`@`127.0.0.1` com privilegio `SELECT, LOCK TABLES` no banco `fraghub_db`.
4. Installer cria arquivo `.my.cnf` com credenciais do usuario de backup, com permissoes 600 e dono igual ao usuario nao-root do sistema.
5. Installer cria script de backup `/opt/fraghub/scripts/db-backup.sh` com logica de dump, compressao e rotacao.
6. Installer registra cron job diario para o usuario nao-root apontando para o script de backup.
7. Installer executa uma rodada manual do script para verificar funcionamento antes de finalizar.
8. Installer exibe resumo operacional com caminho de backups, cron configurado e log de execucao.

## Personas

- **Admin da comunidade**: precisa de backup automatico do banco sem configuracao manual, com garantia de que dados de partidas e rankings estao protegidos.
- **Maintainer tecnico**: precisa de backup reexecutavel, credenciais protegidas, log de resultado e politica de retencao configuravel.

## Requisitos Funcionais

### DBKP-REQ-001 - Pre-check de backup

O fluxo deve validar, antes de alterar o host:

- servico MariaDB ativo e acessivel localmente;
- banco `fraghub_db` existente e com ao menos as tabelas nucleo presentes (`feature database-baseline` concluida);
- binario `mysqldump` disponivel no PATH do usuario de backup;
- espaco em disco suficiente no diretorio de destino dos backups (minimo 5 GB disponivel recomendado);
- `cron` ou `crontab` disponivel e funcional no sistema.

### DBKP-REQ-002 - Usuario dedicado de backup

O fluxo deve:

- criar usuario MariaDB `fraghub_backup`@`127.0.0.1` com privilegios minimos para dump: `SELECT, LOCK TABLES` restritos ao banco `fraghub_db`;
- nao reutilizar o usuario `fraghub_app` para operacoes de backup;
- detectar em reexecucao que o usuario ja existe e pular criacao.

### DBKP-REQ-003 - Arquivo de credenciais protegido

O fluxo deve:

- criar arquivo `/home/{usuario}/.my.cnf` (ou caminho equivalente gerenciado pelo installer) com secao `[mysqldump]` contendo `user` e `password` do usuario `fraghub_backup`;
- definir permissoes `600` e dono igual ao usuario nao-root do sistema que executara o cron;
- garantir que a senha nunca apareca em argumentos de linha de comando visiveis no `ps` (mysqldump deve ler credenciais do arquivo `.my.cnf` via `--defaults-file` ou configuracao padrao);
- nao versionar nem logar o conteudo do arquivo `.my.cnf`.

### DBKP-REQ-004 - Script de backup

O fluxo deve criar o script `/opt/fraghub/scripts/db-backup.sh` com as seguintes responsabilidades:

- executar `mysqldump` do banco `fraghub_db` usando credenciais do `.my.cnf` sem senha em linha de comando;
- comprimir o dump com `gzip` gerando arquivo no formato `fraghub_db_YYYYMMDD_HHMMSS.sql.gz`;
- salvar o arquivo comprimido no diretorio `/opt/fraghub/backups/db/`;
- aplicar rotacao: remover arquivos de backup com mais de 7 dias no mesmo diretorio;
- registrar resultado (sucesso ou falha com codigo de saida do `mysqldump`) em `/opt/fraghub/logs/db-backup.log` com timestamp;
- retornar codigo de saida nao-zero em caso de falha do dump.

### DBKP-REQ-005 - Permissoes do script e diretorio de backup

O fluxo deve:

- definir permissoes `700` no script `/opt/fraghub/scripts/db-backup.sh` com dono igual ao usuario nao-root;
- criar diretorio `/opt/fraghub/backups/db/` com permissoes `700` e dono igual ao usuario nao-root;
- garantir que outros usuarios do sistema nao possam ler os arquivos de backup.

### DBKP-REQ-006 - Cron job diario

O fluxo deve:

- registrar cron job no crontab do usuario nao-root apontando para `/opt/fraghub/scripts/db-backup.sh`;
- agendar execucao diaria em horario de baixo uso (padrao: 03:00 horario local do servidor);
- verificar antes de adicionar se entrada identica ja existe no crontab (idempotencia);
- nao adicionar entrada duplicada em reexecucao.

### DBKP-REQ-007 - Verificacao manual pos-configuracao

Apos configurar tudo, o fluxo deve:

- executar o script de backup manualmente uma vez para validar a cadeia completa (dump → compressao → arquivo gerado → log de resultado);
- verificar que arquivo `.sql.gz` foi criado com tamanho maior que zero no diretorio de backup;
- verificar que log de resultado foi atualizado com registro de sucesso;
- falhar a instalacao com mensagem acionavel se a execucao manual do script falhar.

### DBKP-REQ-008 - Idempotencia

Reexecucao do fluxo em host ja configurado deve:

- detectar usuario de backup ja existente no MariaDB e pular criacao;
- detectar arquivo `.my.cnf` ja existente com permissoes corretas e pular criacao;
- detectar script de backup ja existente e pular criacao (ou recriar apenas se versao diferente);
- detectar cron job ja registrado e pular adicao;
- registrar no log cada etapa pulada por ja estar concluida.

### DBKP-REQ-009 - Falha com recuperacao acionavel

Em caso de erro, o fluxo deve:

- interromper no ponto de falha sem remover artefatos de etapas anteriores bem-sucedidas;
- exibir causa resumida e codigo de saida nao-zero;
- apontar arquivo de log relevante com caminho absoluto;
- sugerir acao de recuperacao ou reexecucao compativel com estado parcial.

## Requisitos Nao Funcionais

### DBKP-NFR-001 - Seguranca de credenciais

Senha do usuario de backup nao deve aparecer em: argumentos de linha de comando, historico de shell, arquivos de log, saida do `ps aux`. O unico local autorizado e o arquivo `.my.cnf` com permissoes `600`.

### DBKP-NFR-002 - Uso de disco

O script de backup deve verificar espaco disponivel antes de executar o dump; se espaco livre no diretorio de backup for inferior a 500 MB, o script deve registrar aviso no log e retornar codigo de saida de erro sem executar o dump.

### DBKP-NFR-003 - Observabilidade

Cada execucao do script de backup deve produzir entrada no log `/opt/fraghub/logs/db-backup.log` com: timestamp, status (SUCCESS/FAILURE), tamanho do arquivo gerado e mensagem de erro em caso de falha.

### DBKP-NFR-004 - Compatibilidade

Solucao baseada exclusivamente em `mysqldump`, `gzip` e `cron`; sem dependencia de ferramentas de terceiros ou servicos externos de armazenamento.

### DBKP-NFR-005 - Principio de menor privilegio

Usuario `fraghub_backup` possui apenas `SELECT, LOCK TABLES` em `fraghub_db`; nenhum privilegio global ou em outros bancos e concedido.

## Criterios de Aceitacao

- **AC-001**: Usuario `fraghub_backup`@`127.0.0.1` existe no MariaDB com apenas `SELECT, LOCK TABLES` em `fraghub_db`, verificavel via `SHOW GRANTS`.
- **AC-002**: Arquivo `.my.cnf` com credenciais do `fraghub_backup` existe com permissoes `600` e dono correto; senha nao aparece em `ps aux` durante execucao do mysqldump.
- **AC-003**: Script `/opt/fraghub/scripts/db-backup.sh` existe com permissoes `700` e execucao manual gera arquivo `.sql.gz` com tamanho maior que zero em `/opt/fraghub/backups/db/`.
- **AC-004**: Apos execucao manual, `/opt/fraghub/logs/db-backup.log` contem entrada com timestamp, status SUCCESS e tamanho do arquivo.
- **AC-005**: Cron job esta registrado no crontab do usuario nao-root apontando para o script de backup com agendamento diario.
- **AC-006**: Reexecucao do fluxo de configuracao nao duplica o cron job nem recria artefatos ja existentes com configuracao correta.
- **AC-007**: Apos 8 dias de backups simulados (criacao manual de arquivos com datas antigas), o script de rotacao remove apenas arquivos com mais de 7 dias.
- **AC-008**: Pre-condicao ausente (ex.: MariaDB inativo) aborta o fluxo antes de qualquer alteracao e exibe diagnostico.

## Out of Scope (esta feature)

- Backup remoto ou sincronizacao com armazenamento externo (S3, FTP, SFTP etc.).
- Restauracao automatica ou semi-automatica de backups.
- Criptografia dos arquivos de backup em repouso.
- Notificacoes de falha de backup via Discord webhook ou email (feature futura de alertas).
- Backup de arquivos de configuracao do servidor de jogo ou demos.
- Interface web de gerenciamento de backups.

## Dependencias

- Feature `database-baseline` concluida (banco `fraghub_db` e usuario `fraghub_app` existentes, MariaDB operacional).
- Binarios `mysqldump`, `gzip` e `crontab` disponiveis no sistema.
- Usuario nao-root do sistema disponivel (provisionado pelo `cli-installer`).

## Riscos Iniciais

- Cron job pode conflitar com uso intenso de disco em servidor com poucos recursos se o dump for executado durante pico de atividade.
- Arquivo `.my.cnf` com permissoes incorretas pode expor credenciais a outros usuarios do sistema; verificacao de permissoes e obrigatoria.
- Crescimento de backups em disco sem monitoramento de espaco pode causar falha de dump sem aviso previo ao operador.
- Incompatibilidade de versao entre `mysqldump` e MariaDB pode gerar dumps corrompidos; requer teste de restauracao periodico (fora do escopo desta feature, mas documentado como risco).
