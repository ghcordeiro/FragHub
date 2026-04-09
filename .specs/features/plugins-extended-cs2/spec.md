# Plugins Extended CS2 - Especificacao da Feature

## Summary

A feature `plugins-extended-cs2` estende o servidor CS2 provisionado pelo `game-stack-baseline` instalando CS2-SimpleAdmin (gerenciamento de admins via MySQL), WeaponPaints (skins de armas via MySQL) e demo-recorder automatico (gravacao de demos pos-partida), criando os schemas/tabelas necessarios no banco `fraghub_db`.

## System Process Context

1. Operador executa o fluxo de plugins estendidos CS2 em host com `game-stack-baseline` e `database-baseline` concluidos.
2. Sistema valida pre-condicoes: plugins base CS2 presentes (MetaMod, CounterStrikeSharp, MatchZy), banco `fraghub_db` acessivel pelo usuario `fraghub_app`.
3. Installer baixa e instala CS2-SimpleAdmin no diretorio de plugins do CounterStrikeSharp.
4. Installer cria schema e tabelas necessarios ao CS2-SimpleAdmin no banco `fraghub_db` e gera arquivo de configuracao apontando para o banco local.
5. Installer baixa e instala WeaponPaints no diretorio de plugins do CounterStrikeSharp.
6. Installer cria schema e tabelas necessarios ao WeaponPaints no banco `fraghub_db` e gera arquivo de configuracao.
7. Installer configura demo-recorder automatico (via hook MatchZy ou script pos-partida) com diretorio de saida definido.
8. Installer executa verificacao de presenca de cada plugin instalado e das tabelas criadas.
9. Installer registra checkpoint e exibe resumo operacional.

## Personas

- **Admin da comunidade**: precisa gerenciar admins e bans diretamente no servidor CS2 sem configuracao manual de SQL.
- **Jogador**: quer usar skins de armas personalizadas no servidor.
- **Maintainer tecnico**: precisa de instalacao reexecutavel, schemas versionados e diagnostico claro em falhas.

## Requisitos Funcionais

### PLGCS2-REQ-001 - Pre-check de plugins estendidos CS2

O fluxo deve validar, antes de alterar o host:

- presenca e integridade dos plugins base CS2: MetaMod, CounterStrikeSharp e MatchZy (instalados pelo `game-stack-baseline`);
- banco `fraghub_db` acessivel via `fraghub_app`@`127.0.0.1` com privilegios suficientes para criacao de tabelas;
- conectividade de rede para download de releases do GitHub (CS2-SimpleAdmin, WeaponPaints);
- espaco em disco suficiente para arquivos de plugin e demos (minimo 5 GB disponivel em particao de instalacao).

### PLGCS2-REQ-002 - Instalacao do CS2-SimpleAdmin

O fluxo deve:

- baixar a release mais recente compativel do CS2-SimpleAdmin a partir do canal oficial (GitHub releases);
- instalar os arquivos no diretorio de plugins do CounterStrikeSharp (`/home/csserver/serverfiles/game/csgo/addons/counterstrikesharp/plugins/`);
- gerar o arquivo de configuracao `CS2-SimpleAdmin.json` apontando para `fraghub_db` em `127.0.0.1` com credenciais de `fraghub_app`;
- credenciais nao devem aparecer em logs nem em argumentos visiveis no `ps`.

### PLGCS2-REQ-003 - Schema do CS2-SimpleAdmin

O fluxo deve:

- criar no banco `fraghub_db` todas as tabelas requeridas pelo CS2-SimpleAdmin (conforme SQL de instalacao oficial do plugin);
- registrar a aplicacao desse schema na tabela `schema_migrations` com versao prefixada (ex.: `plgcs2_simpleadmin_001`);
- detectar em reexecucao que o schema ja existe via `schema_migrations` e pular sem erros.

### PLGCS2-REQ-004 - Instalacao do WeaponPaints

O fluxo deve:

- baixar a release mais recente compativel do WeaponPaints a partir do canal oficial (GitHub releases);
- instalar os arquivos no diretorio de plugins do CounterStrikeSharp;
- gerar o arquivo de configuracao do WeaponPaints apontando para `fraghub_db` em `127.0.0.1` com credenciais de `fraghub_app`.

### PLGCS2-REQ-005 - Schema do WeaponPaints

O fluxo deve:

- criar no banco `fraghub_db` todas as tabelas requeridas pelo WeaponPaints (conforme SQL de instalacao oficial do plugin);
- registrar a aplicacao desse schema na tabela `schema_migrations` com versao prefixada (ex.: `plgcs2_weaponpaints_001`);
- detectar em reexecucao que o schema ja existe via `schema_migrations` e pular sem erros.

### PLGCS2-REQ-006 - Configuracao do demo-recorder automatico

O fluxo deve:

- configurar gravacao automatica de demos apos cada partida encerrada pelo MatchZy (via configuracao de hook `OnMatchEnd` ou equivalente suportado pelo MatchZy);
- definir diretorio de saida de demos em caminho fixo e documentado (ex.: `/opt/fraghub/demos/cs2/`);
- garantir permissoes corretas no diretorio de demos para o usuario de servico do servidor CS2;
- nao gravar demos de partidas interrompidas (status diferente de `finished` ou `abandoned`).

### PLGCS2-REQ-007 - Verificacao pos-instalacao

Apos instalar todos os plugins, o fluxo deve:

- verificar presenca dos arquivos de plugin (`.dll` ou equivalente) nos diretorios esperados;
- verificar presenca das tabelas de cada plugin no banco `fraghub_db`;
- verificar existencia e permissoes do diretorio de demos;
- falhar com mensagem acionavel se qualquer verificacao nao for atendida.

### PLGCS2-REQ-008 - Idempotencia

Reexecucao do fluxo em host ja configurado deve:

- detectar plugin ja instalado (arquivo presente no diretorio) e pular download/instalacao;
- detectar schema ja registrado em `schema_migrations` e pular criacao de tabelas;
- nao sobrescrever arquivos de configuracao validos existentes;
- registrar no log cada etapa pulada por ja estar concluida.

### PLGCS2-REQ-009 - Falha com recuperacao acionavel

Em caso de erro, o fluxo deve:

- interromper no plugin/etapa com falha sem reverter plugins ja instalados com sucesso;
- exibir causa resumida com nome do plugin e etapa com falha;
- apontar arquivo de log relevante com caminho absoluto;
- sugerir acao de recuperacao ou reexecucao parcial.

## Requisitos Nao Funcionais

### PLGCS2-NFR-001 - Compatibilidade de versao

Versoes dos plugins CS2-SimpleAdmin e WeaponPaints devem ser verificadas quanto a compatibilidade com a versao do CounterStrikeSharp instalada; incompatibilidade deve gerar aviso expliciito e abortar a instalacao do plugin especifico.

### PLGCS2-NFR-002 - Seguranca de credenciais

Credenciais de banco em arquivos de configuracao de plugins devem ter permissoes `600` com dono igual ao usuario de servico do servidor CS2; nunca devem aparecer em argumentos de linha de comando nem em logs.

### PLGCS2-NFR-003 - Observabilidade

Logs por etapa seguem niveis `INFO/WARN/ERROR`; downloads de release registram versao baixada; falhas de schema incluem mensagem de erro SQL resumida.

### PLGCS2-NFR-004 - Rastreabilidade de versao de plugin

A versao instalada de cada plugin deve ser registrada em arquivo de manifesto local (ex.: `/opt/fraghub/state/plugins-cs2.json`) para auditoria e suporte a futuras atualizacoes.

## Criterios de Aceitacao

- **AC-001**: Apos execucao bem-sucedida, os arquivos do CS2-SimpleAdmin estao presentes no diretorio de plugins do CounterStrikeSharp com configuracao apontando para `fraghub_db`.
- **AC-002**: As tabelas do CS2-SimpleAdmin estao criadas no banco `fraghub_db` e registradas na `schema_migrations` com prefixo `plgcs2_simpleadmin`.
- **AC-003**: Apos execucao bem-sucedida, os arquivos do WeaponPaints estao presentes no diretorio de plugins com configuracao apontando para `fraghub_db`, e suas tabelas estao em `fraghub_db`.
- **AC-004**: O diretorio de demos `/opt/fraghub/demos/cs2/` existe com permissoes corretas e o demo-recorder esta configurado no MatchZy.
- **AC-005**: Reexecucao em host ja configurado nao sobrescreve plugins nem reaplica schemas ja registrados em `schema_migrations`.
- **AC-006**: Pre-condicao ausente (ex.: CounterStrikeSharp nao instalado) aborta o fluxo antes de qualquer alteracao e exibe diagnostico.
- **AC-007**: Versao instalada de cada plugin esta registrada no manifesto local em `/opt/fraghub/state/plugins-cs2.json`.

## Out of Scope (esta feature)

- Interface web ou painel de administracao do CS2-SimpleAdmin.
- Configuracao de admins iniciais no banco (responsabilidade do operador pos-instalacao).
- Sincronizacao de skins entre servidores ou backup de skins de jogadores.
- Processamento, analise ou visualizacao de arquivos de demo gravados.
- Atualizacao automatica de plugins (sem intervencao manual).
- Plugins CS:GO (escopo exclusivo CS2).

## Dependencias

- Feature `game-stack-baseline` concluida (MetaMod, CounterStrikeSharp e MatchZy instalados).
- Feature `database-baseline` concluida (banco `fraghub_db`, usuario `fraghub_app` e tabela `schema_migrations` disponiveis).
- Conectividade com GitHub releases durante a instalacao.

## Riscos Iniciais

- Versoes de CS2-SimpleAdmin e WeaponPaints sao atreladas a versao especifica do CounterStrikeSharp; atualizacoes do engine CS2 podem quebrar compatibilidade sem aviso.
- Canais de download (GitHub releases) podem mudar URL ou estrutura entre releases, exigindo manutencao do installer.
- Schema SQL dos plugins de terceiros pode evoluir entre versoes, exigindo revisao do SQL de instalacao a cada atualizacao.
- Demos de alta qualidade podem consumir espaco em disco rapidamente em servidores com muitas partidas.
