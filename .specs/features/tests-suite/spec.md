# Tests Suite - Especificacao da Feature

## Summary
Suite de testes abrangente cobrindo scripts bash (bats-core), API Node.js (Jest + Supertest), frontend React (Vitest + Testing Library) e smoke test E2E (Playwright), com cobertura minima de 60% nas funcoes de negocio da API.

## System Process Context
1. Desenvolvedor implementa uma funcionalidade e executa `npm test` ou `bats` localmente antes de abrir PR
2. Pipeline de CI executa toda a suite automaticamente em cada push e PR
3. Relatorio de cobertura e gerado e exibido no output do CI (nao bloqueia, mas e registrado)
4. Testes de integracao bash usam ambiente isolado (container ou VM) para nao afetar sistema do desenvolvedor
5. Testes da API usam banco `fraghub_test` isolado, criado e destruido a cada execucao
6. Smoke test E2E exige servidor FragHub rodando (ambiente de staging ou CI com servico ativo)

## Personas
- **Desenvolvedor contribuidor**: precisa de feedback rapido sobre regressoes ao modificar codigo existente
- **Mantenedor do projeto**: precisa garantir que funcoes criticas (ELO, auth, matchmaking) nao regridam entre versoes
- **Operador de servidor**: precisa de confianca que o installer funcionara corretamente no ambiente dele

## Requisitos Funcionais

### TESTS-REQ-001 - Testes de integracao dos scripts bash com bats-core
Devem existir testes bats-core em `tests/installer/` cobrindo as etapas principais do installer: `precheck.sh` (verificacao de OS, arquitetura, recursos minimos), `bootstrap.sh` (instalacao de dependencias), `database.sh` (criacao de banco e usuario MariaDB) e `plugins.sh` (verificacao de plugins CS2). Cada modulo deve ter ao menos 3 casos de teste (caminho feliz, dependencia ausente, permissao negada).

### TESTS-REQ-002 - Testes unitarios de calculo de ELO (Glicko-2)
Devem existir testes Jest em `api/tests/unit/elo.test.ts` cobrindo: calculo de novo rating apos vitoria, calculo apos derrota, calculo em empate, comportamento com RD (Rating Deviation) alto (jogador inativo) e garantia de que o rating nunca vai abaixo de 100 (floor de seguranca).

### TESTS-REQ-003 - Testes unitarios de autenticacao JWT
Devem existir testes Jest em `api/tests/unit/auth.test.ts` cobrindo: geracao de token JWT com claims obrigatorios (sub, iat, exp, role), validacao de token valido, rejeicao de token expirado, rejeicao de token com assinatura invalida e rejeicao de token sem claim `role`.

### TESTS-REQ-004 - Testes unitarios de matchmaking (balanceamento de times)
Devem existir testes Jest em `api/tests/unit/matchmaking.test.ts` cobrindo: balanceamento de 10 jogadores em 2 times com diferenca maxima de rating, comportamento com numero impar de jogadores na fila, comportamento com fila vazia e garantia de que nenhum jogador aparece em ambos os times.

### TESTS-REQ-005 - Testes de integracao da API com Supertest
Devem existir testes Supertest em `api/tests/integration/` cobrindo os endpoints criticos: `POST /auth/login` (credenciais validas, invalidas, rate limit), `GET /players/:id/profile` (player existente, inexistente, sem autorizacao) e `GET /leaderboard` (resposta paginada com estrutura correta).

### TESTS-REQ-006 - Banco de teste isolado para API
Os testes de integracao da API devem usar um banco MariaDB separado (`fraghub_test`), criado via script de setup antes dos testes e destruido apos. O banco de teste nao deve interferir com o banco de producao.

### TESTS-REQ-007 - Testes de componentes React com Vitest + Testing Library
Devem existir testes em `web/tests/components/` cobrindo: `LoginForm` (renderizacao, submit com dados validos, exibicao de erro em credenciais invalidas), `PlayerProfile` (renderizacao de dados do jogador, exibicao de loading state) e `Leaderboard` (renderizacao de lista paginada, comportamento ao clicar em pagina seguinte).

### TESTS-REQ-008 - Smoke test E2E com Playwright
Deve existir um teste Playwright em `tests/e2e/smoke.spec.ts` cobrindo o fluxo: (1) acessa pagina inicial, (2) navega para registro, (3) cria conta com dados validos, (4) faz login com a conta criada, (5) acessa a pagina de leaderboard e verifica que a tabela e exibida. O teste deve ser marcado como `@smoke` e executado separadamente do CI principal.

### TESTS-REQ-009 - Cobertura minima de 60% nas funcoes de negocio
A cobertura de linhas dos modulos `elo.ts`, `auth.ts` e `matchmaking.ts` (ou equivalentes) deve ser de no minimo 60%, medida pelo Jest com `--coverage`. O relatorio deve ser gerado em `coverage/` e exibido no output do CI.

### TESTS-REQ-010 - Scripts npm para execucao de suites
Cada diretorio com testes deve ter scripts npm padronizados: `npm test` executa todos os testes, `npm run test:unit` executa apenas unitarios, `npm run test:integration` executa apenas integracao e `npm run test:coverage` executa com relatorio de cobertura.

### TESTS-REQ-011 - Mock de RCON para testes de server-management
Testes que dependem de comunicacao RCON com o servidor CS2 devem usar um mock/stub que simula respostas do protocolo RCON sem necessidade de servidor real. O mock deve ser reutilizavel entre diferentes suites de teste.

## Requisitos Nao Funcionais

### TESTS-NFR-001 - Tempo maximo de execucao dos testes unitarios
Os testes unitarios da API e do frontend (excluindo integracao e E2E) devem completar em menos de 60 segundos.

### TESTS-NFR-002 - Isolamento entre testes
Cada teste deve ser independente: nao deve depender de estado deixado por teste anterior. Setup e teardown devem ser realizados em hooks `beforeEach`/`afterEach`.

### TESTS-NFR-003 - Testes deterministicos
Testes nao devem depender de data/hora atual, numeros aleatorios nao seeded ou ordem de execucao. Datas devem ser mockadas com `jest.useFakeTimers()` ou equivalente.

### TESTS-NFR-004 - Compatibilidade com Node.js 20 LTS
Todos os testes devem executar sem warning ou erro em Node.js 20 LTS, conforme CONSTITUTION do projeto.

### TESTS-NFR-005 - Nenhum teste flaky aceito no CI
Testes que falham de forma intermitente devem ser corrigidos ou marcados como `skip` com issue registrada. Testes flaky nao devem ser mergeados no branch `main`.

## Criterios de Aceitacao
- **AC-001**: Dado que executo `npm run test:coverage` no diretorio `api/`, entao o relatorio de cobertura exibe 60% ou mais de cobertura de linhas nos modulos `elo.ts`, `auth.ts` e `matchmaking.ts`.
- **AC-002**: Dado que executo `bats tests/installer/precheck.bats`, entao o teste que simula ausencia do `curl` falha com mensagem de erro legivel e codigo de saida diferente de zero.
- **AC-003**: Dado que executo os testes unitarios de ELO com um jogador vitorioso contra oponente de rating superior, entao o novo rating do vencedor e maior que o rating anterior e o novo rating do perdedor e menor.
- **AC-004**: Dado que executo os testes de auth com um token expirado, entao o teste confirma que a funcao de validacao retorna erro com mensagem `token expired` (ou equivalente).
- **AC-005**: Dado que executo o smoke test Playwright contra um servidor FragHub em execucao, entao o fluxo completo (registro, login, leaderboard) conclui sem erros e o teste passa em menos de 30 segundos.
- **AC-006**: Dado que executo os testes de integracao da API, entao o banco `fraghub_test` e criado antes dos testes e removido apos, sem deixar residuos no sistema.
- **AC-007**: Dado que executo `npm test` no diretorio `web/`, entao os testes do componente `LoginForm` verificam que um erro e exibido quando o submit e feito com campos vazios.
- **AC-008**: Dado que todos os testes unitarios passam, entao o tempo total de execucao e inferior a 60 segundos em maquina com 2 vCPUs e 4 GB RAM.

## Out of Scope (esta feature)
- Testes de carga ou stress (load testing com k6, Locust, etc.)
- Testes de acessibilidade automatizados (cobertura por auditoria separada)
- Testes de seguranca automatizados (SAST/DAST — cobertura pela feature `security-audit`)
- Testes de compatibilidade multi-browser alem do Chromium no Playwright
- Cobertura de 100% do codebase (meta e 60% apenas nas funcoes de negocio criticas)
- Testes dos scripts de instalacao em todos os ambientes de SO possiveis

## Dependencias
- Todas as features implementadas (v0.1 a v0.6 + upgrade-command) para testes de integracao
- MariaDB disponivel no ambiente de CI para testes de integracao da API
- bats-core instalado no ambiente de CI e de desenvolvimento
- Jest configurado em `api/` com `ts-jest` para TypeScript
- Vitest configurado em `web/`
- Playwright com browser Chromium disponivel no ambiente de CI (para smoke test E2E)
- Servidor FragHub em execucao para testes E2E (ambiente de staging separado)

## Riscos Iniciais
- **Cobertura retroativa custosa**: escrever testes para codigo ja existente sem design testavel pode exigir refatoracao — mitigacao: priorizar funcoes puras (ELO, auth) que nao dependem de infra
- **Testes E2E frageis**: Playwright depende de servidor ativo e pode ser afetado por lentidao de rede ou timeout de servicos — mitigacao: separar E2E do CI principal e marcar como `@smoke` com execucao opcional
- **Mock de RCON complexo**: protocolo RCON e binario e a implementacao do mock precisa ser fiel o suficiente para testar casos de erro — mitigacao: usar biblioteca existente de mock RCON ou interceptar no nivel de TCP
- **Banco de teste em CI**: MariaDB no GitHub Actions requer servico adicional no workflow, aumentando complexidade e tempo do CI — mitigacao: usar `services:` do GitHub Actions com health check configurado
