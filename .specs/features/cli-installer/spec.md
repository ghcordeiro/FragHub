# CLI Installer - Especificacao da Feature

## Summary

O CLI Installer e um wizard interativo que prepara uma instancia Ubuntu suportada para rodar o stack base do FragHub com seguranca minima, validacoes de ambiente e estrutura pronta para as proximas milestones.

## System Process Context

1. Operador executa o comando de instalacao no servidor alvo.
2. Installer valida pre-condicoes (OS, arquitetura, permissao sudo, rede e recursos minimos).
3. Installer coleta entradas obrigatorias e opcionais (hostname, segredos, configuracoes de rede e provedores).
4. Installer aplica setup base (dependencias, LinuxGSM, servicos, firewall e estrutura de diretorios).
5. Installer valida resultado final e gera resumo com proximos passos.

## Personas

- **Admin da comunidade**: quer instalar rapidamente sem conhecimento profundo de DevOps.
- **Maintainer tecnico**: precisa de idempotencia, logs claros e ponto de recuperacao em caso de falha.

## Requisitos Funcionais

### CLI-REQ-001 - Pre-check de ambiente

O installer deve validar:

- Ubuntu 22.04 ou 24.04 LTS
- arquitetura x86_64
- permissao sudo ativa
- conectividade de rede para repositorios necessarios
- disco livre minimo recomendado (>= 100 GB)
- memoria RAM minima recomendada (>= 8 GB para stack completo)

### CLI-REQ-002 - Fluxo interativo guiado

O installer deve executar wizard interativo com prompts claros para:

- server hostname
- Steam Web API Key (obrigatoria)
- senha de banco
- senha RCON
- email e senha admin inicial
- dominio (opcional)
- webhook Discord (opcional)
- credenciais Google OAuth (opcional)

### CLI-REQ-003 - Geracao segura de segredos

Quando senha de banco ou RCON nao for informada, o installer deve gerar segredos fortes automaticamente e registrar apenas versao mascarada nos logs.

### CLI-REQ-004 - Setup base de dependencias

O installer deve instalar e configurar, no minimo:

- LinuxGSM + SteamCMD + libs de compatibilidade
- Node.js 20 LTS
- MariaDB 10.6+ (ou equivalente compativel)
- Nginx
- UFW

### CLI-REQ-005 - Configuracao minima de seguranca

O installer deve:

- impedir execucao operacional como root para servicos de aplicacao
- aplicar regras UFW basicas (22/tcp, 80/tcp, 443/tcp opcional, portas de jogo)
- persistir configuracoes com permissoes restritas para arquivos sensiveis

### CLI-REQ-006 - Validacao final e resumo

Ao final, o installer deve executar validacoes de saude e imprimir resumo contendo:

- componentes instalados
- componentes pendentes/opcionais
- endpoints/portas relevantes
- proximos comandos recomendados

### CLI-REQ-007 - Idempotencia basica

Reexecutar o installer nao deve quebrar setup existente; etapas concluidas devem ser detectadas e reutilizadas quando seguro.

### CLI-REQ-008 - Falha com diagnostico acionavel

Em caso de falha, o installer deve:

- interromper no ponto de erro
- mostrar causa resumida
- apontar arquivo de log detalhado
- sugerir acao de recuperacao

## Requisitos Nao Funcionais

### CLI-NFR-001 - Observabilidade

Logs devem ser legiveis, com niveis (INFO/WARN/ERROR) e sem vazamento de segredos.

### CLI-NFR-002 - Tempo de feedback

Cada etapa deve sinalizar inicio/fim para reduzir incerteza operacional durante execucoes longas.

### CLI-NFR-003 - Confiabilidade operacional

Fluxo deve priorizar operacoes deterministicas, com verificacoes apos passos criticos.

### CLI-NFR-004 - Compatibilidade

Feature v0.1 cobre apenas Ubuntu LTS suportado e ambiente bare-metal/VM tradicional.

## Critérios de Aceitacao

- **AC-001**: Em Ubuntu 22.04/24.04 x86_64 valido, installer conclui sem erro fatal e entrega resumo final.
- **AC-002**: Em ambiente nao suportado (ex.: OS diferente), installer aborta antes de alterar sistema e informa motivo.
- **AC-003**: Campos obrigatorios ausentes no wizard geram mensagem clara e bloqueiam avancar.
- **AC-004**: Senhas auto-geradas nunca aparecem em texto puro no output.
- **AC-005**: Reexecucao apos sucesso nao causa duplicidade indevida de configuracao.
- **AC-006**: Em falha simulada de dependencia, usuario recebe log e orientacao minima de recuperacao.

## Out of Scope (v0.1)

- Painel web administrativo completo.
- Matchmaking completo e algoritmos de balanceamento.
- Setup de cluster/multi-servidor.
- Anti-smurf, decay de ELO e recursos planejados para v2.0+.
- Suporte Windows ou distribuicoes Linux fora da constituicao.

## Dependencias

- Definicoes de stack em `.specs/project/STACK.md`
- Regras tecnicas em `.specs/project/CONSTITUTION.md`
- Milestone `FragHub v0.1 - Installer Basico` no Linear

## Riscos Iniciais

- Instabilidade de repositorios externos no momento da instalacao.
- Variacoes de ambiente (cloud images customizadas) afetando pre-checks.
- Complexidade de manter idempotencia sem mascarar erros reais.
