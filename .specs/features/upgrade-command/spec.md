# Upgrade Command - Especificacao da Feature

## Summary
Comando `fraghub upgrade` que atualiza o FragHub de forma segura com backup automatico, aplicacao de migracoes e rollback em caso de falha.

## System Process Context
1. Operador executa `fraghub upgrade` no servidor onde o FragHub esta instalado
2. O script verifica a versao atual (arquivo `.fraghub-version`) e a versao mais recente disponivel no repositorio
3. Operador confirma explicitamente que deseja prosseguir com o upgrade
4. O script faz dump do banco MariaDB como ponto de restauracao
5. Nova versao e baixada via `git pull` ou download de release tag
6. Migracoes de banco pendentes sao aplicadas em ordem numerica
7. Servicos API e Nginx sao reiniciados via systemd
8. Em caso de qualquer falha: backup e restaurado, versao anterior e mantida e log e gerado

## Personas
- **Operador de servidor**: precisa atualizar o FragHub para obter novas funcionalidades e correcoes sem perder dados de partidas e ranking
- **Administrador da comunidade**: precisa que o servidor permanceca estavel durante e apos o upgrade
- **Contribuidor open source**: precisa de um processo de upgrade documentado e reproduzivel para testar releases

## Requisitos Funcionais

### UPGRADE-REQ-001 - Verificacao de versao pre-upgrade
O script deve ler o arquivo `.fraghub-version` no host, consultar a versao mais recente disponivel (via git tag ou API do GitHub) e exibir ao operador as versoes atual e alvo antes de qualquer alteracao.

### UPGRADE-REQ-002 - Confirmacao explicita do operador
O script deve exigir que o operador digite `yes` (ou confirmacao equivalente nao ambigua) para prosseguir. Qualquer outra entrada deve abortar o processo sem realizar alteracoes.

### UPGRADE-REQ-003 - Backup automatico do banco MariaDB
Antes de qualquer alteracao, o script deve executar `mysqldump` do banco `fraghub` e salvar o dump com timestamp em `/var/backups/fraghub/` com permissao 600. O backup deve ser verificado (tamanho > 0) antes de continuar.

### UPGRADE-REQ-004 - Download da nova versao
O script deve suportar dois metodos de atualizacao: `git pull --rebase` para instalacoes via clone, e download de tarball de release tag para instalacoes via curl. O metodo deve ser detectado automaticamente pela presenca do diretorio `.git`.

### UPGRADE-REQ-005 - Aplicacao de migracoes versionadas
O script deve aplicar todas as migracoes SQL pendentes em `/scripts/migrations/` cujo numero de versao seja superior ao registrado na tabela `schema_migrations`. Cada migracao deve ser aplicada em transacao separada.

### UPGRADE-REQ-006 - Reinicio de servicos via systemd
Apos migracoes bem-sucedidas, o script deve reiniciar os servicos `fraghub-api` e `nginx` via `systemctl restart`. Deve aguardar confirmacao de que ambos estao em estado `active (running)` antes de declarar sucesso.

### UPGRADE-REQ-007 - Rollback automatico em caso de falha
Em qualquer etapa apos o backup (download, migracoes, reinicio), se ocorrer erro, o script deve: (1) restaurar o dump do banco via `mysql`, (2) reverter os arquivos para a versao anterior (via `git reset --hard` ou reexpansao do tarball anterior), (3) reiniciar servicos na versao anterior, (4) registrar o motivo da falha no log.

### UPGRADE-REQ-008 - Log detalhado do processo
Todas as etapas, comandos executados, saidas e erros devem ser registrados em `/var/log/fraghub/upgrade-{timestamp}.log` com nivel de detalhe suficiente para diagnostico post-mortem.

### UPGRADE-REQ-009 - Atualizacao do arquivo de versao
Apos upgrade bem-sucedido, o script deve atualizar o arquivo `.fraghub-version` com a nova versao e registrar data e hora do upgrade.

## Requisitos Nao Funcionais

### UPGRADE-NFR-001 - Tempo de inatividade maximo
O tempo de inatividade dos servicos (API + Nginx fora do ar) durante o upgrade nao deve exceder 5 minutos em condicoes normais.

### UPGRADE-NFR-002 - Integridade do backup
O script deve validar o dump gerado (verificar que nao esta vazio e que o arquivo nao foi corrompido) antes de prosseguir com qualquer alteracao destrutiva.

### UPGRADE-NFR-003 - Idempotencia de migracoes
O sistema de migracoes deve ser idempotente: executar o upgrade duas vezes nao deve aplicar a mesma migracao duas vezes nem resultar em erro.

### UPGRADE-NFR-004 - Conformidade ShellCheck
O script `upgrade.sh` deve passar no ShellCheck sem warnings (excecoes documentadas em `.shellcheckrc`).

### UPGRADE-NFR-005 - Seguranca de credenciais
Nenhuma senha de banco de dados ou credencial deve aparecer em texto plano nos logs. Credenciais devem ser lidas de variaveis de ambiente ou de `/etc/fraghub/.env` com permissao 600.

### UPGRADE-NFR-006 - Compatibilidade de versao
O script deve verificar que a versao alvo e compativel com a versao atual antes de prosseguir (ex: impedir downgrade, alertar sobre saltos de mais de uma major version).

## Criterios de Aceitacao
- **AC-001**: Dado um servidor com FragHub v0.5 instalado, quando executo `fraghub upgrade` para v1.0 e confirmo com `yes`, entao todos os servicos estao em estado `active (running)` apos o processo e `.fraghub-version` contem `1.0`.
- **AC-002**: Dado que o backup foi criado com sucesso mas uma migracao SQL falha, quando o rollback e executado, entao o banco retorna ao estado pre-upgrade verificado pelo numero de versao na tabela `schema_migrations`.
- **AC-003**: Dado que executo `fraghub upgrade` e nao digito `yes` na confirmacao, entao nenhum arquivo e modificado, nenhum backup e criado e o processo encerra com codigo de saida diferente de zero.
- **AC-004**: Dado um upgrade bem-sucedido, quando verifico `/var/log/fraghub/upgrade-{timestamp}.log`, entao o log contem registro de cada etapa (backup, download, migracoes, reinicio) com timestamps.
- **AC-005**: Dado que executo `fraghub upgrade` duas vezes consecutivas para a mesma versao alvo, entao na segunda execucao o script detecta que ja esta na versao mais recente e encerra sem realizar alteracoes.
- **AC-006**: Dado um servidor com partida em andamento (processo `cs2` ativo), quando executo `fraghub upgrade`, entao o script exibe aviso sobre partida em andamento e aguarda confirmacao adicional antes de prosseguir.
- **AC-007**: Dado um backup gerado com sucesso, quando verifico as permissoes do arquivo em `/var/backups/fraghub/`, entao as permissoes sao 600 e o dono e o usuario do sistema (nao root).

## Out of Scope (esta feature)
- Interface web para upgrade (upgrade e exclusivamente via CLI)
- Upgrade automatico agendado (sem intervencao do operador)
- Rollback para versoes anteriores a versao instalada (apenas desfaz o upgrade atual)
- Migracao de dados entre diferentes engines de banco (MariaDB para PostgreSQL, etc.)
- Notificacao de jogadores conectados antes do upgrade
- Suporte a clusters ou multiplos servidores simultaneos

## Dependencias
- `scripts/installer/install.sh` e todos os modulos do installer (v0.1 + v0.2) devem estar implementados
- Sistema de migracoes versionadas em `scripts/migrations/` com tabela `schema_migrations`
- Arquivo `.fraghub-version` presente no host apos instalacao
- Servicos systemd `fraghub-api` e `nginx` configurados e funcionais
- Utilitarios `mysqldump` e `mysql` disponiveis no PATH
- Permissao de escrita em `/var/backups/fraghub/` e `/var/log/fraghub/`

## Riscos Iniciais
- **Upgrade durante partida ativa**: reiniciar API durante uma partida pode corromper estado da fila ou resultado nao registrado — mitigacao: detectar processo `cs2` ativo e avisar operador
- **Falha parcial em migracoes**: se migracao 003 falha apos 001 e 002 aplicadas, rollback de banco e necessario mas pode ser lento em bases grandes (100k+ registros) — mitigacao: transacoes por migracao e timeout configuravel
- **Sem conexao com internet**: download da nova versao pode falhar silenciosamente se timeout nao for configurado — mitigacao: `curl --max-time` e verificacao de checksum do tarball
- **Versao desconhecida**: arquivo `.fraghub-version` ausente ou corrompido impede verificacao de compatibilidade — mitigacao: detectar ausencia e solicitar versao manualmente ao operador
