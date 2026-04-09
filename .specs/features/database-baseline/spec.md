# Database Baseline - Especificacao da Feature

## Summary

A feature `database-baseline` estende o installer para instalar MariaDB em conformidade com a constituicao do projeto, criar usuario e banco dedicados ao FragHub, aplicar schema inicial versionado (UTF8MB4) e expor verificacao de saude integrada ao fluxo existente de segredos e logs.

## System Process Context

1. Operador executa o fluxo de instalacao em host ja preparado pelo `cli-installer` (e opcionalmente `game-stack-baseline`).
2. Sistema valida pre-condicoes de pacote, porta, espaco e privilegios para servico MariaDB.
3. Installer instala e configura MariaDB (versao alinhada a CONSTITUTION: 10.6+).
4. Installer cria banco, usuario de aplicacao com privilegios minimos e aplica migracoes iniciais em ordem deterministica.
5. Installer verifica conectividade e integridade minima do schema (tabelas nucleo presentes).
6. Installer registra checkpoint de etapa e inclui status no resumo operacional.

## Personas

- **Admin da comunidade**: precisa de banco pronto para proximas milestones (API/plugins) sem configuracao manual de SQL.
- **Maintainer tecnico**: precisa de migracoes versionadas, reexecucao segura e diagnostico claro em falhas.

## Requisitos Funcionais

### DBASE-REQ-001 - Pre-check de banco

O fluxo deve validar, antes de alterar o host:

- SO e arquitetura suportados pela constituicao;
- disponibilidade de pacotes ou repositorio necessario ao MariaDB alvo;
- porta padrao (3306) livre ou politica explicita de conflito;
- espaco em disco minimo razoavel para datadir.

### DBASE-REQ-002 - Instalacao e servico MariaDB

O fluxo deve:

- instalar MariaDB em versao compativel com CONSTITUTION (10.6+);
- garantir servico systemd ativo e habilitado conforme padrao do installer;
- restringir escuta a `127.0.0.1` por padrao, salvo override documentado em plano futuro.

### DBASE-REQ-003 - Provisionamento de credenciais e banco

O fluxo deve:

- reutilizar senha de banco ja coletada/gerada pelo `cli-installer` quando existir;
- criar banco dedicado FragHub e usuario de aplicacao com privilegios minimos no escopo desse banco;
- nao persistir senha em texto puro em artefatos versionados; seguir mascaramento em logs existente.

### DBASE-REQ-004 - Schema inicial versionado

O fluxo deve aplicar migracoes em ordem com identificadores de versao imutaveis, cobrindo tabelas nucleo:

- `users` (conta local alinhada a auth futura);
- `matches` (registro de partidas);
- `stats` (agregados minimos por jogador/partida conforme ROADMAP v0.2).

Charset e collation devem ser **utf8mb4** em todas as tabelas e colunas textuais.

### DBASE-REQ-005 - Verificacao pos-instalaacao

Apos aplicar schema, o fluxo deve:

- testar login do usuario de aplicacao no banco criado;
- validar presenca das tabelas nucleo e constraints minimas definidas nas migracoes;
- falhar com mensagem acionavel se qualquer passo nao for atendido.

### DBASE-REQ-006 - Idempotencia basica

Reexecucao apos sucesso nao deve recriar objetos ja validos nem duplicar dados de sistema; migracoes ja aplicadas devem ser detectadas de forma segura (estrategia detalhada na fase Plan).

### DBASE-REQ-007 - Falha com recuperacao acionavel

Em caso de erro, o fluxo deve:

- interromper no ponto de falha;
- exibir causa resumida;
- apontar logs relevantes;
- sugerir acao de recuperacao ou reexecucao compativel com estado parcial.

## Requisitos Nao Funcionais

### DBASE-NFR-001 - Seguranca

Credenciais e ficheiros de configuracao sensivel devem respeitar permissoes restritas e principio de menor privilegio.

### DBASE-NFR-002 - Observabilidade

Logs por etapa seguem niveis `INFO/WARN/ERROR` e nao vazam segredos.

### DBASE-NFR-003 - Compatibilidade

Escopo limitado a Ubuntu LTS suportado pela constituicao; sem dependencia de servicos externos para bootstrap do banco.

## Criterios de Aceitacao

- **AC-001**: Em host valido, MariaDB instala e o servico encontra-se operacional apos a etapa.
- **AC-002**: Banco e usuario de aplicacao existem com privilegios corretos e charset utf8mb4 nas tabelas nucleo.
- **AC-003**: Migracoes iniciais aplicam-se uma vez e reaplicacao nao corrompe estado em cenario de sucesso previo.
- **AC-004**: Verificacao pos-schema confirma conectividade e presenca das tabelas `users`, `matches`, `stats` (ou nomes finais definidos no Plan).
- **AC-005**: Pre-condicao ausente aborta antes de efeitos irreversiveis e informa diagnostico.
- **AC-006**: Falha simulada (ex.: permissao negada) produz mensagem com proximo passo e referencia de log.

## Out of Scope (esta feature)

- Backup automatico agendado e politica de retencao (milestone v0.2 item separado ou feature futura).
- Plugins CS2/CS:GO adicionais (SimpleAdmin, WeaponPaints, SourceBans++, etc.).
- API Node.js, autenticacao JWT e integracao em runtime com servidores de jogo.
- Replicação, cluster ou HA de banco.

## Dependencias

- Features `cli-installer` e `game-stack-baseline` concluidas ou fluxo de instalacao equivalente disponivel.
- `.specs/project/CONSTITUTION.md` (MariaDB 10.6+, utf8mb4, migracoes versionadas).
- `.specs/project/ROADMAP.md` (milestone v0.2).

## Riscos Iniciais

- Variacao de pacotes MariaDB entre 22.04 e 24.04 LTS.
- Conflito de porta ou instancia MariaDB pre-existente no host.
- Estado parcial se instalacao de pacote concluir mas migracao falhar (estrategia de checkpoint na Plan).
