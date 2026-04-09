# Game Stack Baseline - Especificacao da Feature

## Summary

A feature `game-stack-baseline` estende o installer v0.1 para provisionar os servidores de jogo (CS2 e CS:GO Legacy), instalar plugins competitivos base e registrar servicos de execucao/recuperacao para operacao inicial da comunidade FragHub.

## System Process Context

1. Operador executa o fluxo de instalacao de stack de jogo em host ja preparado pelo `cli-installer`.
2. Sistema valida pre-condicoes de runtime (artefatos LinuxGSM presentes, conectividade SteamCMD e estrutura de diretorios esperada).
3. Installer provisiona instancias de servidor CS2 e CS:GO com LinuxGSM.
4. Installer aplica camada de plugins base por jogo:
   - CS2: MetaMod, CounterStrikeSharp e MatchZy.
   - CS:GO: MetaMod, SourceMod e Get5.
5. Installer cria e habilita servicos systemd basicos para start/stop/status e reinicio apos reboot.
6. Installer executa verificacoes finais de saude e gera resumo operacional com proximos comandos.

## Personas

- **Admin da comunidade**: precisa subir ambos os servidores com configuracao inicial valida sem ajustes manuais extensos.
- **Maintainer tecnico**: precisa de setup reexecutavel, diagnostico claro e baseline consistente para evolucoes de plugins.

## Requisitos Funcionais

### GSTACK-REQ-001 - Pre-check especifico da stack de jogo

O fluxo deve validar, antes de alterar o host:

- precondicoes do `cli-installer` concluido;
- disponibilidade dos bins/ferramentas necessarios ao provisionamento dos jogos;
- estrutura de diretórios esperada para artefatos dos servidores.

### GSTACK-REQ-002 - Provisionamento de servidores de jogo

O fluxo deve provisionar:

- 1 instancia CS2 baseline;
- 1 instancia CS:GO Legacy baseline;
- estrutura inicial de arquivos para configuracao por ambiente.

### GSTACK-REQ-003 - Instalacao de plugins base (CS2)

O fluxo deve instalar e validar minimamente:

- MetaMod (CS2);
- CounterStrikeSharp;
- MatchZy.

### GSTACK-REQ-004 - Instalacao de plugins base (CS:GO)

O fluxo deve instalar e validar minimamente:

- MetaMod (CS:GO);
- SourceMod;
- Get5.

### GSTACK-REQ-005 - Servicos systemd basicos

O fluxo deve criar unidades systemd para cada servidor de jogo com:

- start/stop/restart/status;
- habilitacao opcional para inicializacao no boot;
- logs acessiveis para diagnostico.

### GSTACK-REQ-006 - Resumo operacional e diagnostico

Ao final, o installer deve exibir:

- status de provisionamento por jogo;
- status de plugins por jogo;
- status de servicos systemd;
- comandos recomendados de operacao e recuperacao.

### GSTACK-REQ-007 - Idempotencia basica da stack

Reexecucao nao deve duplicar instalacoes ou sobrescrever artefatos validos sem necessidade; etapas concluidas devem ser detectadas e reutilizadas de forma segura.

### GSTACK-REQ-008 - Falha com recuperacao acionavel

Em caso de erro, o fluxo deve:

- interromper no ponto de falha;
- exibir causa resumida;
- apontar logs relevantes;
- sugerir acao de recuperacao/reexecucao.

## Requisitos Nao Funcionais

### GSTACK-NFR-001 - Confiabilidade operacional

Etapas criticas devem possuir verificacao pos-execucao para reduzir estados parcialmente inconsistentes.

### GSTACK-NFR-002 - Seguranca operacional

Operacoes de servico e arquivos sensiveis devem respeitar principio de menor privilegio e permissoes restritas.

### GSTACK-NFR-003 - Observabilidade

Logs por etapa devem seguir niveis `INFO/WARN/ERROR` e manter rastreabilidade de falha sem vazamento de segredos.

### GSTACK-NFR-004 - Compatibilidade de escopo

Esta feature cobre apenas Ubuntu LTS suportado pela constituicao do projeto.

## Critérios de Aceitacao

- **AC-001**: Em host com `cli-installer` valido, o fluxo provisiona CS2 e CS:GO com sucesso.
- **AC-002**: Em precondicao ausente, o fluxo aborta antes de alterar estado e informa motivo.
- **AC-003**: Plugins base de cada jogo ficam instalados e detectaveis por verificacao minima.
- **AC-004**: Servicos systemd sao criados com comandos operacionais funcionais (`start/stop/status`).
- **AC-005**: Reexecucao apos sucesso nao gera duplicidade indevida de instalacao/configuracao.
- **AC-006**: Em falha simulada de plugin/provisionamento, usuario recebe diagnostico e orientacao de recuperacao.

## Out of Scope (v0.1)

- Ajustes finos de gameplay e regras competitivas avancadas de cada plugin.
- Painel web de gerenciamento de servidores.
- Auto-healing completo multi-host ou orquestracao de cluster.
- Integracoes avancadas com banco/API alem do baseline minimo necessario ao boot.

## Dependencias

- Feature previa `cli-installer` aprovada e concluida.
- Definicoes de stack em `.specs/project/STACK.md`.
- Regras tecnicas em `.specs/project/CONSTITUTION.md`.

## Riscos Iniciais

- Mudancas de distribuicao/canal de download de plugins de terceiros.
- Divergencias de versao entre engines dos jogos e plugins base.
- Estados parciais em provisionamento interrompido sem checkpoints robustos.
