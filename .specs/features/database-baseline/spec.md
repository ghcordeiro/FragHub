# Database Baseline - Especificacao da Feature

## Summary

A feature `database-baseline` estende o installer para instalar MariaDB em conformidade com a constituicao do projeto, criar usuario dedicado `fraghub_app` e banco `fraghub_db` com privilegios minimos, aplicar schema inicial versionado (utf8mb4) com tabelas nucleo e controle de migracoes, e expor verificacao de saude integrada ao fluxo existente de segredos e logs.

## System Process Context

1. Operador executa o fluxo de instalacao em host ja preparado pelo `cli-installer` (e opcionalmente `game-stack-baseline`).
2. Sistema valida pre-condicoes de pacote, porta, espaco em disco e privilegios para instalacao do MariaDB.
3. Installer instala e configura MariaDB 10.6+ restringindo escuta ao endereco `127.0.0.1`.
4. Installer cria banco `fraghub_db` e usuario de aplicacao `fraghub_app` com privilegios minimos restritos ao banco criado.
5. Installer aplica migracoes SQL em ordem deterministica, registrando cada migracao aplicada na tabela `schema_migrations`.
6. Installer verifica conectividade com credenciais de aplicacao e presenca das tabelas nucleo esperadas.
7. Installer registra checkpoint de etapa e inclui status no resumo operacional.

## Personas

- **Admin da comunidade**: precisa de banco pronto para proximas milestones (API, plugins) sem configuracao manual de SQL.
- **Maintainer tecnico**: precisa de migracoes versionadas e reexecucao segura com diagnostico claro em falhas.

## Requisitos Funcionais

### DBASE-REQ-001 - Pre-check de banco

O fluxo deve validar, antes de alterar o host:

- SO e arquitetura suportados pela constituicao (Ubuntu 22.04/24.04 LTS, x86_64);
- disponibilidade de pacotes ou repositorio necessario ao MariaDB alvo;
- porta padrao 3306 livre ou ausencia de instancia MariaDB pre-existente em conflito;
- espaco em disco minimo disponivel no datadir (minimo 2 GB recomendado).

### DBASE-REQ-002 - Instalacao e configuracao do MariaDB

O fluxo deve:

- instalar MariaDB em versao compativel com a constituicao (10.6+);
- garantir servico systemd `mariadb` ativo e habilitado no boot;
- configurar `bind-address = 127.0.0.1` em arquivo de configuracao dedicado (ex.: `/etc/mysql/conf.d/fraghub.cnf`) para restringir acesso exclusivamente local;
- nao alterar configuracoes globais de outros servicos MySQL/MariaDB pre-existentes no host.

### DBASE-REQ-003 - Provisionamento de banco e usuario de aplicacao

O fluxo deve:

- criar banco `fraghub_db` com charset `utf8mb4` e collation `utf8mb4_unicode_ci`;
- criar usuario `fraghub_app`@`127.0.0.1` com privilegios minimos: `SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER` restritos ao banco `fraghub_db`;
- reutilizar senha de banco ja coletada ou gerada pelo `cli-installer` quando existir no cofre de segredos;
- nao persistir senha em texto puro em artefatos versionados; seguir mascaramento em logs existente.

### DBASE-REQ-004 - Tabela de controle de migracoes

O fluxo deve criar a tabela `schema_migrations` antes de aplicar qualquer outra migracao, contendo ao menos:

- `version` (VARCHAR, chave primaria): identificador unico e imutavel da migracao (ex.: `001`, `002`);
- `applied_at` (DATETIME): timestamp de aplicacao;
- `description` (VARCHAR): descricao legivel da migracao.

Migracoes ja registradas em `schema_migrations` nao devem ser reaplicadas em nenhuma circunstancia.

### DBASE-REQ-005 - Schema inicial versionado

O fluxo deve aplicar migracoes em ordem numerica crescente cobrindo as tabelas nucleo:

- `users`: representa conta de jogador local alinhada a autenticacao futura (campos minimos: `id`, `email`, `password_hash`, `display_name`, `role`, `steam_id`, `created_at`, `updated_at`);
- `matches`: registro de partidas (campos minimos: `id`, `game`, `map`, `status`, `started_at`, `ended_at`, `created_at`);
- `stats`: agregados por jogador/partida (campos minimos: `id`, `match_id`, `user_id`, `kills`, `deaths`, `assists`, `score`, `created_at`).

Charset e collation devem ser `utf8mb4` / `utf8mb4_unicode_ci` em todas as tabelas e colunas textuais. Cada migracao deve ser registrada em `schema_migrations` apos execucao bem-sucedida.

### DBASE-REQ-006 - Verificacao pos-instalacao

Apos aplicar schema, o fluxo deve:

- testar login do usuario `fraghub_app` no banco `fraghub_db` com credenciais provisionadas;
- validar presenca de todas as tabelas nucleo definidas nas migracoes (`schema_migrations`, `users`, `matches`, `stats`);
- verificar charset e collation das tabelas criadas;
- falhar com mensagem acionavel se qualquer validacao nao for atendida.

### DBASE-REQ-007 - Idempotencia baseada em schema_migrations

Reexecucao apos sucesso nao deve recriar objetos ja validos nem duplicar dados de sistema:

- banco e usuario ja existentes com configuracao correta sao detectados e reutilizados;
- migracoes registradas em `schema_migrations` sao puladas;
- apenas migracoes novas (nao registradas) sao aplicadas em reexecucao.

### DBASE-REQ-008 - Falha com recuperacao acionavel

Em caso de erro, o fluxo deve:

- interromper no ponto de falha sem reverter etapas anteriores bem-sucedidas;
- exibir causa resumida e codigo de saida nao-zero;
- apontar arquivo de log relevante com caminho absoluto;
- sugerir acao de recuperacao ou reexecucao compativel com estado parcial.

## Requisitos Nao Funcionais

### DBASE-NFR-001 - Seguranca

- `bind-address = 127.0.0.1` impede exposicao de porta 3306 na rede;
- usuario `fraghub_app` possui apenas privilegios minimos necessarios no escopo de `fraghub_db`;
- senha do usuario de aplicacao nao aparece em argumentos de linha de comando visiveis no `ps` (usar arquivo de opcoes ou variavel de ambiente temporaria);
- arquivos de configuracao com credenciais devem ter permissoes `600` ou `640` com dono `mysql` ou usuario nao-root do sistema.

### DBASE-NFR-002 - Observabilidade

Logs por etapa seguem niveis `INFO/WARN/ERROR` e nao vazam segredos em nenhuma saida de log ou terminal.

### DBASE-NFR-003 - Compatibilidade

Escopo limitado a Ubuntu LTS suportado pela constituicao (22.04 e 24.04); sem dependencia de servicos externos para bootstrap do banco.

### DBASE-NFR-004 - Desempenho de instalacao

O fluxo completo de instalacao e schema nao deve exceder 5 minutos em condicoes normais de rede.

## Criterios de Aceitacao

- **AC-001**: Em host valido, MariaDB instala, servico `mariadb` esta ativo/enabled e `bind-address = 127.0.0.1` esta configurado.
- **AC-002**: Banco `fraghub_db` e usuario `fraghub_app`@`127.0.0.1` existem com charset `utf8mb4` e privilegios minimos verificaveis via `SHOW GRANTS`.
- **AC-003**: Tabelas `schema_migrations`, `users`, `matches` e `stats` estao presentes com charset `utf8mb4_unicode_ci` apos a instalacao.
- **AC-004**: Reexecucao do fluxo em host ja configurado nao recria banco, usuario nem reaplica migracoes registradas em `schema_migrations`.
- **AC-005**: Login com credenciais de `fraghub_app` no banco `fraghub_db` via `mysql -u fraghub_app -p fraghub_db` retorna sucesso.
- **AC-006**: Pre-condicao ausente (ex.: porta 3306 em uso por outro processo) aborta o fluxo antes de qualquer alteracao e exibe diagnostico com causa.
- **AC-007**: Falha simulada em migracao SQL (ex.: permissao negada) produz mensagem com proximo passo sugerido e caminho do log de erro.

## Out of Scope (esta feature)

- Backup automatico agendado e politica de retencao (feature `database-backup`).
- Plugins CS2/CS:GO adicionais que criam schemas proprios (SimpleAdmin, WeaponPaints, SourceBans++, RankMe etc.).
- API Node.js, autenticacao JWT e integracao em runtime com servidores de jogo.
- Replicacao, cluster ou alta disponibilidade de banco.
- Tuning avancado de performance do MariaDB (innodb_buffer_pool_size etc.).
- Web panel de administracao de banco de dados.

## Dependencias

- Feature `cli-installer` concluida (cofre de segredos e logging disponiveis).
- `.specs/project/CONSTITUTION.md` (MariaDB 10.6+, utf8mb4, migracoes versionadas).
- `.specs/project/ROADMAP.md` (milestone v0.2, tabelas nucleo).

## Riscos Iniciais

- Variacao de versao de pacotes MariaDB entre Ubuntu 22.04 e 24.04 LTS pode exigir repositorios distintos.
- Conflito com instancia MariaDB ou MySQL pre-existente no host pode impedir configuracao de `bind-address`.
- Estado parcial se instalacao de pacote concluir mas migracao falhar requer estrategia de checkpoint robusta.
- Senha gerada automaticamente pelo `cli-installer` pode nao estar acessivel se cofre de segredos estiver corrompido.
