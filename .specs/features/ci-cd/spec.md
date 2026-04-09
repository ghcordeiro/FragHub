# CI/CD - Especificacao da Feature

## Summary
Pipeline de integracao e entrega continua via GitHub Actions que valida qualidade de codigo em todo push/PR e publica GitHub Releases automaticamente ao criar tags de versao.

## System Process Context
1. Desenvolvedor abre Pull Request ou faz push em qualquer branch do repositorio
2. Workflow `ci.yml` e disparado automaticamente e executa validacoes de qualidade (ShellCheck, TypeScript, ESLint, Prettier, testes unitarios)
3. Se alguma validacao falha, o PR nao pode ser mergeado (branch protection rule)
4. Desenvolvedor cria tag `vX.Y.Z` quando o codigo esta pronto para release
5. Workflow `release.yml` e disparado pela tag, gera o changelog a partir do `CHANGELOG.md` e cria o GitHub Release com os artefatos correspondentes
6. Badge de status no `README.md` reflete o estado atual do CI no branch principal

## Personas
- **Contribuidor externo**: precisa saber rapidamente se sua contribuicao quebrou algo antes do review humano
- **Mantenedor do projeto**: precisa garantir que apenas codigo validado chegue ao branch principal e que releases sejam criadas de forma reproduzivel
- **Operador de servidor**: precisa confiar que a versao publicada passou por validacoes automatizadas

## Requisitos Funcionais

### CICD-REQ-001 - Workflow de CI disparado por push e PR
O arquivo `.github/workflows/ci.yml` deve ser disparado em qualquer push para qualquer branch e em abertura/atualizacao de Pull Requests para o branch `main`.

### CICD-REQ-002 - ShellCheck em todos os scripts bash
O job de CI deve executar ShellCheck em todos os arquivos `.sh` do repositorio. Excecoes legitimas devem ser documentadas no arquivo `.shellcheckrc` na raiz do repositorio com comentario justificando cada excecao.

### CICD-REQ-003 - Verificacao de tipos TypeScript
O job de CI deve executar `tsc --noEmit` tanto no diretorio do backend (`api/`) quanto no frontend (`web/`) com as configuracoes `tsconfig.json` de cada projeto. Erros de tipo devem bloquear o merge.

### CICD-REQ-004 - Lint do codigo JavaScript/TypeScript
O job de CI deve executar ESLint no codigo do backend e do frontend. A configuracao de ESLint de cada projeto deve ser respeitada. Warnings nao devem bloquear; apenas errors devem bloquear o merge.

### CICD-REQ-005 - Verificacao de formatacao com Prettier
O job de CI deve executar `prettier --check` em todos os arquivos `.ts`, `.tsx`, `.js` e `.json` do repositorio. Arquivos mal formatados devem bloquear o merge.

### CICD-REQ-006 - Execucao de testes unitarios
O job de CI deve executar os testes unitarios da API (`npm test` no diretorio `api/`) e os testes do frontend (`npm test` no diretorio `web/`) quando esses diretórios possuirem suites de teste configuradas.

### CICD-REQ-007 - Workflow de release disparado por tag
O arquivo `.github/workflows/release.yml` deve ser disparado quando uma tag no formato `v[0-9]+.[0-9]+.[0-9]+` for criada no repositorio.

### CICD-REQ-008 - Geracao automatica de GitHub Release
O workflow de release deve criar um GitHub Release usando o conteudo da secao correspondente a tag no `CHANGELOG.md` como corpo da release. O titulo da release deve ser o nome da tag.

### CICD-REQ-009 - Badge de status no README
O `README.md` deve conter um badge de status do workflow de CI apontando para o branch `main`, exibindo `passing` ou `failing` conforme o estado atual.

### CICD-REQ-010 - Jobs paralelos no CI
Os jobs de CI (ShellCheck, TypeScript backend, TypeScript frontend, ESLint, Prettier, testes) devem ser executados em paralelo para reduzir o tempo total do pipeline.

## Requisitos Nao Funcionais

### CICD-NFR-001 - Tempo maximo do pipeline de CI
O pipeline completo de CI nao deve ultrapassar 10 minutos em condicoes normais (sem cache frio).

### CICD-NFR-002 - Cache de dependencias
O CI deve utilizar cache do GitHub Actions para `node_modules` (baseado em `package-lock.json`) a fim de reduzir tempo de instalacao entre execucoes.

### CICD-NFR-003 - Versao fixada do Node.js
Os workflows devem usar `actions/setup-node` com versao Node.js 20 LTS explicitamente declarada (nao `latest`), respeitando a CONSTITUTION do projeto.

### CICD-NFR-004 - Ambiente de CI reproduzivel
Os workflows devem rodar em `ubuntu-22.04` (runner fixo, nao `ubuntu-latest`) para garantir reproducibilidade.

### CICD-NFR-005 - Seguranca de secrets
Nenhuma credencial, token ou secret deve aparecer em texto plano nos workflows. Todos os secrets devem ser referenciados via `${{ secrets.NOME }}`.

### CICD-NFR-006 - Idempotencia do workflow de release
Criar a mesma tag duas vezes nao deve gerar dois releases. Se o release ja existe, o workflow deve falhar com mensagem clara.

## Criterios de Aceitacao
- **AC-001**: Dado um PR com um script bash contendo erro de ShellCheck, quando o CI executa, entao o job de ShellCheck falha e o status do PR e marcado como `failing`, impedindo o merge.
- **AC-002**: Dado um PR com erro de tipo TypeScript no backend, quando o CI executa, entao o job `typescript-backend` falha e o merge e bloqueado.
- **AC-003**: Dado um PR com codigo nao formatado (Prettier), quando o CI executa, entao o job de Prettier falha com lista dos arquivos que precisam de formatacao.
- **AC-004**: Dado que crio a tag `v1.0.0` no repositorio, quando o workflow `release.yml` executa, entao um GitHub Release `v1.0.0` e criado com o corpo contendo o changelog da versao 1.0.0 extraido do `CHANGELOG.md`.
- **AC-005**: Dado que todos os jobs do CI passam num PR, quando acesso o PR no GitHub, entao o status check aparece como verde e o merge e permitido (branch protection configurada).
- **AC-006**: Dado que o pipeline de CI e executado com cache quente, quando verifico o tempo total de execucao, entao o tempo e inferior a 10 minutos.
- **AC-007**: Dado que acesso o `README.md` no GitHub apos um CI bem-sucedido no branch `main`, entao o badge de CI exibe `passing`.

## Out of Scope (esta feature)
- Deploy automatico para servidor de producao (o deploy e manual via installer/upgrade)
- Testes de integracao ou E2E no pipeline de CI (apenas testes unitarios)
- Notificacoes de CI por email, Slack ou Discord
- Self-hosted runners do GitHub Actions
- Publicacao de imagem Docker ou pacote npm
- Analise de cobertura de codigo no CI (apenas execucao dos testes)

## Dependencias
- Repositorio GitHub com branch `main` configurado como branch principal
- Arquivo `CHANGELOG.md` com secoes no formato `## [vX.Y.Z]` para geracao automatica de releases
- `tsconfig.json` configurados e funcionais em `api/` e `web/`
- `package.json` com scripts `test`, `lint` e `build` em `api/` e `web/`
- `.eslintrc` ou `eslint.config.js` configurados em `api/` e `web/`
- `.prettierrc` configurado na raiz do projeto
- ShellCheck instalado como dependencia do workflow (via `apt` ou `action`)

## Riscos Iniciais
- **Falsos positivos do ShellCheck**: scripts complexos com substituicoes de variaveis ou `eval` podem gerar warnings que nao sao erros reais — mitigacao: `.shellcheckrc` com excecoes documentadas caso a caso
- **Tempo de CI excessivo**: instalacao de dependencias sem cache pode ultrapassar 10 minutos — mitigacao: cache agressivo de `node_modules` e paralelizacao de jobs
- **Compatibilidade entre versoes de ferramentas**: versao de ESLint, Prettier ou TypeScript no CI diverge do ambiente local — mitigacao: versoes fixadas no `package.json` (sem `^` ou `~`)
- **Dependencias do workflow desatualizadas**: actions como `actions/checkout@v3` podem ser depreciadas — mitigacao: usar tags de versao major fixadas (`@v4`) e revisar periodicamente
