# Plugins Extended CS:GO - Especificacao da Feature

## Summary

A feature `plugins-extended-csgo` estende o servidor CS:GO Legacy provisionado pelo `game-stack-baseline` instalando SourceBans++ (sistema de bans com schema MySQL, sem web panel nesta feature), Weapons & Knives (skins de armas e facas via MySQL) e RankMe (estatisticas e ranking por jogador via MySQL), criando os schemas/tabelas necessarios no banco `fraghub_db`.

## System Process Context

1. Operador executa o fluxo de plugins estendidos CS:GO em host com `game-stack-baseline` e `database-baseline` concluidos.
2. Sistema valida pre-condicoes: plugins base CS:GO presentes (MetaMod, SourceMod, Get5), banco `fraghub_db` acessivel pelo usuario `fraghub_app`.
3. Installer baixa e instala SourceBans++ (componente servidor SourceMod) no diretorio de plugins do SourceMod.
4. Installer cria schema e tabelas necessarios ao SourceBans++ no banco `fraghub_db` e gera configuracao apontando para o banco.
5. Installer baixa e instala Weapons & Knives no diretorio de plugins do SourceMod.
6. Installer cria schema e tabelas necessarios ao Weapons & Knives no banco `fraghub_db` e gera configuracao.
7. Installer baixa e instala RankMe no diretorio de plugins do SourceMod.
8. Installer cria schema e tabelas necessarios ao RankMe no banco `fraghub_db` e gera configuracao.
9. Installer executa verificacao de presenca de cada plugin instalado e das tabelas criadas.
10. Installer registra checkpoint e exibe resumo operacional.

## Personas

- **Admin da comunidade**: precisa gerenciar bans de jogadores diretamente no servidor CS:GO com historico persistido em banco.
- **Jogador**: quer usar skins de armas e facas personalizadas no servidor e acompanhar seu ranking.
- **Maintainer tecnico**: precisa de instalacao reexecutavel, schemas versionados e diagnostico claro em falhas.

## Requisitos Funcionais

### PLGCSGO-REQ-001 - Pre-check de plugins estendidos CS:GO

O fluxo deve validar, antes de alterar o host:

- presenca e integridade dos plugins base CS:GO: MetaMod, SourceMod e Get5 (instalados pelo `game-stack-baseline`);
- banco `fraghub_db` acessivel via `fraghub_app`@`127.0.0.1` com privilegios suficientes para criacao de tabelas;
- conectividade de rede para download de releases (GitHub, AlliedModders ou canais oficiais dos plugins);
- espaco em disco suficiente para arquivos de plugin (minimo 2 GB disponivel na particao de instalacao).

### PLGCSGO-REQ-002 - Instalacao do SourceBans++ (componente servidor)

O fluxo deve:

- baixar a release mais recente compativel do SourceBans++ a partir do canal oficial;
- instalar apenas os arquivos de plugin SourceMod (`addons/sourcemod/plugins/`, `addons/sourcemod/extensions/`, `addons/sourcemod/configs/`) necessarios ao componente de servidor;
- gerar o arquivo de configuracao `sourcebans.cfg` (ou equivalente) apontando para `fraghub_db` em `127.0.0.1` com credenciais de `fraghub_app`;
- credenciais nao devem aparecer em logs nem em argumentos visiveis no `ps`.

### PLGCSGO-REQ-003 - Schema do SourceBans++

O fluxo deve:

- criar no banco `fraghub_db` todas as tabelas requeridas pelo SourceBans++ (conforme SQL de instalacao oficial);
- registrar a aplicacao desse schema na tabela `schema_migrations` com versao prefixada (ex.: `plgcsgo_sourcebans_001`);
- detectar em reexecucao que o schema ja existe via `schema_migrations` e pular sem erros.

### PLGCSGO-REQ-004 - Instalacao do Weapons & Knives

O fluxo deve:

- baixar a release mais recente compativel do Weapons & Knives a partir do canal oficial;
- instalar os arquivos no diretorio de plugins do SourceMod;
- gerar o arquivo de configuracao apontando para `fraghub_db` em `127.0.0.1` com credenciais de `fraghub_app`.

### PLGCSGO-REQ-005 - Schema do Weapons & Knives

O fluxo deve:

- criar no banco `fraghub_db` todas as tabelas requeridas pelo Weapons & Knives (conforme SQL de instalacao oficial);
- registrar a aplicacao desse schema na tabela `schema_migrations` com versao prefixada (ex.: `plgcsgo_weaponsknives_001`);
- detectar em reexecucao que o schema ja existe via `schema_migrations` e pular sem erros.

### PLGCSGO-REQ-006 - Instalacao do RankMe

O fluxo deve:

- baixar a release mais recente compativel do RankMe a partir do canal oficial (AlliedModders ou GitHub);
- instalar os arquivos no diretorio de plugins do SourceMod;
- gerar o arquivo de configuracao do RankMe apontando para `fraghub_db` em `127.0.0.1` com credenciais de `fraghub_app`;
- configurar RankMe para usar o banco `fraghub_db` como backend de persistencia (nao usar SQLite).

### PLGCSGO-REQ-007 - Schema do RankMe

O fluxo deve:

- criar no banco `fraghub_db` todas as tabelas requeridas pelo RankMe (conforme SQL de instalacao oficial);
- registrar a aplicacao desse schema na tabela `schema_migrations` com versao prefixada (ex.: `plgcsgo_rankme_001`);
- detectar em reexecucao que o schema ja existe via `schema_migrations` e pular sem erros.

### PLGCSGO-REQ-008 - Verificacao pos-instalacao

Apos instalar todos os plugins, o fluxo deve:

- verificar presenca dos arquivos de plugin (`.smx` compilado) nos diretorios esperados do SourceMod;
- verificar presenca das tabelas de cada plugin no banco `fraghub_db`;
- verificar que os arquivos de configuracao de banco existem com permissoes restritas;
- falhar com mensagem acionavel se qualquer verificacao nao for atendida.

### PLGCSGO-REQ-009 - Idempotencia

Reexecucao do fluxo em host ja configurado deve:

- detectar plugin ja instalado (arquivo `.smx` presente no diretorio) e pular download/instalacao;
- detectar schema ja registrado em `schema_migrations` e pular criacao de tabelas;
- nao sobrescrever arquivos de configuracao validos existentes;
- registrar no log cada etapa pulada por ja estar concluida.

### PLGCSGO-REQ-010 - Falha com recuperacao acionavel

Em caso de erro, o fluxo deve:

- interromper no plugin/etapa com falha sem reverter plugins ja instalados com sucesso;
- exibir causa resumida com nome do plugin e etapa com falha;
- apontar arquivo de log relevante com caminho absoluto;
- sugerir acao de recuperacao ou reexecucao parcial.

## Requisitos Nao Funcionais

### PLGCSGO-NFR-001 - Compatibilidade de versao

Versoes dos plugins devem ser verificadas quanto a compatibilidade com a versao do SourceMod instalada; incompatibilidade conhecida deve gerar aviso expliciito e abortar a instalacao do plugin especifico.

### PLGCSGO-NFR-002 - Seguranca de credenciais

Credenciais de banco em arquivos de configuracao de plugins devem ter permissoes `600` com dono igual ao usuario de servico do servidor CS:GO; nunca devem aparecer em argumentos de linha de comando nem em logs.

### PLGCSGO-NFR-003 - Observabilidade

Logs por etapa seguem niveis `INFO/WARN/ERROR`; downloads de release registram versao baixada; falhas de schema incluem mensagem de erro SQL resumida.

### PLGCSGO-NFR-004 - Rastreabilidade de versao de plugin

A versao instalada de cada plugin deve ser registrada em arquivo de manifesto local (ex.: `/opt/fraghub/state/plugins-csgo.json`) para auditoria e suporte a futuras atualizacoes.

### PLGCSGO-NFR-005 - Isolamento de configuracao de stats

A configuracao do RankMe nao deve sobrescrever tabelas ou configuracoes de stats pre-existentes de outros plugins sem confirmacao explicita do operador.

## Criterios de Aceitacao

- **AC-001**: Apos execucao bem-sucedida, os arquivos `.smx` do SourceBans++ estao presentes no diretorio de plugins do SourceMod com configuracao apontando para `fraghub_db`.
- **AC-002**: As tabelas do SourceBans++ estao criadas no banco `fraghub_db` e registradas na `schema_migrations` com prefixo `plgcsgo_sourcebans`.
- **AC-003**: Os arquivos `.smx` do Weapons & Knives estao presentes no diretorio de plugins com configuracao de banco, e suas tabelas estao criadas no `fraghub_db`.
- **AC-004**: Os arquivos `.smx` do RankMe estao presentes no diretorio de plugins com backend MySQL configurado apontando para `fraghub_db`, e suas tabelas estao criadas.
- **AC-005**: Reexecucao em host ja configurado nao sobrescreve plugins nem reaplica schemas ja registrados em `schema_migrations`.
- **AC-006**: Pre-condicao ausente (ex.: SourceMod nao instalado) aborta o fluxo antes de qualquer alteracao e exibe diagnostico.
- **AC-007**: Versao instalada de cada plugin esta registrada no manifesto local em `/opt/fraghub/state/plugins-csgo.json`.
- **AC-008**: Arquivos de configuracao com credenciais de banco possuem permissoes `600` verificaveis.

## Out of Scope (esta feature)

- Web panel do SourceBans++ (requer PHP + Apache/Nginx separado; feature futura dedicada).
- Configuracao de admins iniciais no SourceBans++ (responsabilidade do operador pos-instalacao).
- Sincronizacao de skins ou inventario de jogadores entre servidores.
- Interface de consulta de rankings (responsabilidade da feature de portal web).
- Atualizacao automatica de plugins (sem intervencao manual).
- Plugins CS2 (escopo exclusivo CS:GO Legacy).

## Dependencias

- Feature `game-stack-baseline` concluida (MetaMod, SourceMod e Get5 instalados).
- Feature `database-baseline` concluida (banco `fraghub_db`, usuario `fraghub_app` e tabela `schema_migrations` disponiveis).
- Conectividade com canais de download dos plugins durante a instalacao.

## Riscos Iniciais

- SourceBans++ web panel requer PHP e servidor web separado; qualquer referencia ao web panel nesta feature representa risco de escopo indevido.
- RankMe pode tentar criar tabelas com nomes conflitantes com outros plugins de stats no mesmo banco; requer revisao de nomes de tabelas antes da instalacao.
- Versao do SourceMod disponivel no host pode nao suportar todos os plugins na versao mais recente disponivel; verificacao de compatibilidade e critica.
- Canais de download de plugins CS:GO (AlliedModders forums, GitHub) podem mudar estrutura de URL ou descontinuar releases antigas.
