# Game Stack Baseline - Plan

## Objetivo de arquitetura

Provisionar uma baseline operacional de servidores CS2 e CS:GO Legacy, com plugins competitivos essenciais e serviços de operacao minima, preservando idempotencia, seguranca e diagnostico acionavel.

## Escopo deste plano

- Orquestracao da instalacao da stack de jogo em fases.
- Estrategia de provisionamento por jogo (CS2 e CS:GO).
- Estrategia de instalacao e verificacao minima de plugins base.
- Modelo de servicos systemd para operacao e reinicio.
- Validacoes finais, resumo operacional e fluxo de recuperacao.

## Arquitetura proposta

### Modulos

1. `game_precheck`
   - valida pre-condicoes do `cli-installer`, runtime e artefatos base.
2. `game_bootstrap`
   - provisiona instancias baseline de CS2 e CS:GO via LinuxGSM.
3. `plugin_install_cs2`
   - instala MetaMod, CounterStrikeSharp e MatchZy para CS2.
4. `plugin_install_csgo`
   - instala MetaMod, SourceMod e Get5 para CS:GO.
5. `service_config`
   - cria unidades systemd basicas para cada servidor.
6. `game_verify`
   - valida saude minima de provisionamento, plugins e servicos.
7. `game_summary`
   - imprime status final e comandos recomendados de operacao.

### Contratos internos

- Cada modulo retorna `OK`, `WARN` ou `FAIL`.
- `FAIL` interrompe pipeline e aciona diagnostico de recuperacao.
- `WARN` permite continuidade com risco registrado no resumo.
- Cada etapa relevante grava checkpoint no state store local.

## Estrategia de provisionamento

- Provisionamento por jogo em ordem deterministica: CS2 -> CS:GO.
- Cada trilha de jogo isola artefatos para reduzir impacto cruzado.
- Verificacao minima apos cada trilha antes de avancar.
- Reexecucao reutiliza etapas concluidas com consistencia validada.

## Estrategia de plugins

- Plugins sao instalados por "bundle por jogo" para simplificar retry.
- Cada bundle possui verificacao minima de presenca/ativacao.
- Falha em plugin interrompe apenas a progressao da fase atual e gera orientacao de recuperacao.

## Estrategia de servicos systemd

- Criar unidades dedicadas por servidor (`fraghub-cs2.service`, `fraghub-csgo.service`).
- Operacoes padrao: `start`, `stop`, `restart`, `status`.
- Habilitacao de boot configuravel pelo operador (default conservador: nao habilitar automaticamente sem confirmacao de health check).

## Idempotencia e rollback pragmatico

- Reuso do state store local para checkpoints por fase e por jogo.
- Skip apenas com verificacao minima de consistencia (sem skip cego).
- Rollback best-effort em v0.1: limpar artefatos temporarios da fase falha e preservar componentes estaveis.

## Observabilidade e seguranca

- Logging por fase com niveis `INFO/WARN/ERROR`.
- Mascaramento de segredos e sem vazar credenciais nos logs.
- Arquivos sensiveis e unidades com permissoes restritas e principio de menor privilegio.

## Entregaveis obrigatorios desta fase

- `spec.md` da feature (ja produzido).
- ADR-0003: estrategia de provisionamento dual por trilhas de jogo.
- ADR-0004: modelagem de operacao via systemd por servidor.
- C4 L1 e L2 da feature `game-stack-baseline`.

## Riscos e mitigacoes

- **Mudanca em distribuicao de plugins** -> fallback de origem e validacao pos-download.
- **Incompatibilidade de versoes** -> checks explicitos de prerequisito por jogo/plugin.
- **Estados parciais** -> checkpoints por etapa + recomendacoes objetivas de recuperacao.

## Critérios de saída da fase Plan

- [x] Arquitetura documentada e consistente com `CONSTITUTION.md`.
- [x] Decisoes significativas registradas em ADR.
- [x] Diagramas C4 L1 e L2 publicados.
- [ ] Gate humano para avancar para `tasks.md`.
