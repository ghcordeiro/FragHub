# API Setup - Especificacao da Feature

## Summary
Bootstrap do projeto Node.js 20 LTS + Express + TypeScript (strict) em `/opt/fraghub/api/`, com ESLint, Prettier, conexao com MariaDB via Knex.js, health check endpoint e servico systemd `fraghub-api.service`.

## System Process Context
1. Operador executa o instalador da feature `api-setup`
2. Sistema verifica preconditions: Node.js 20 disponivel, database-baseline concluida, banco `fraghub_db` acessivel
3. Sistema cria estrutura de diretorios em `/opt/fraghub/api/`
4. Sistema gera `package.json`, `tsconfig.json`, `.eslintrc`, `.prettierrc`
5. Sistema instala dependencias via npm (`express`, `knex`, `mysql2`, `dotenv`, `zod`, etc.)
6. Sistema cria arquivo `.env` com credenciais do banco lidas do state do installer, com permissoes `600` e dono `fraghub`
7. Sistema cria o endpoint `GET /health` e compila o projeto TypeScript
8. Sistema cria e habilita a unidade systemd `fraghub-api.service` com usuario `fraghub`
9. Sistema inicia o servico e verifica que `GET /health` retorna HTTP 200

## Personas
- **Operador de Servidor**: precisa de uma API funcional subindo automaticamente no boot, sem configuracao manual
- **Desenvolvedor Contribuidor**: precisa de estrutura de projeto padronizada, linting e formatacao configurados para poder contribuir sem atrito
- **Plugin CS2/CS:GO**: precisa de um servidor HTTP respondendo em porta conhecida para consultas futuras

## Requisitos Funcionais

### APISETUP-REQ-001 - Precheck de Dependencias
Antes de iniciar o scaffold, o script deve verificar: (1) Node.js versao 20.x disponivel via `node --version`; (2) npm disponivel; (3) database-baseline marcada como concluida no state file do installer (`/opt/fraghub/state`); (4) usuario `fraghub` existente no sistema. Se qualquer condicao falhar, o script deve abortar com mensagem de erro clara e codigo de saida nao-zero.

### APISETUP-REQ-002 - Estrutura de Diretorios
O script deve criar a seguinte estrutura em `/opt/fraghub/api/`:
```
/opt/fraghub/api/
  src/
    routes/
    middleware/
    db/
    types/
  dist/
  .env
  package.json
  tsconfig.json
  .eslintrc.json
  .prettierrc.json
  .env.example
```
Todos os arquivos e diretorios devem pertencer ao usuario `fraghub` com grupo `fraghub`.

### APISETUP-REQ-003 - Configuracao TypeScript Strict
O `tsconfig.json` deve ter `strict: true`, `target: "ES2022"`, `module: "commonjs"`, `outDir: "./dist"`, `rootDir: "./src"`, `esModuleInterop: true` e `skipLibCheck: true`. O projeto deve compilar sem erros com `npx tsc --noEmit`.

### APISETUP-REQ-004 - ESLint e Prettier
ESLint configurado com `@typescript-eslint/recommended` e regra `no-console` como `warn`. Prettier configurado com `singleQuote: true`, `trailingComma: "all"`, `semi: true`, `printWidth: 100`. Scripts `lint` e `format` disponiveis no `package.json`.

### APISETUP-REQ-005 - Dependencias do Projeto
O `package.json` deve incluir as seguintes dependencias de producao: `express`, `knex`, `mysql2`, `dotenv`, `zod`, `cors`, `helmet`. Dependencias de desenvolvimento: `typescript`, `@types/express`, `@types/node`, `@types/cors`, `ts-node`, `nodemon`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`. Scripts obrigatorios: `build`, `start`, `dev`, `lint`, `format`.

### APISETUP-REQ-006 - Arquivo .env e .env.example
O arquivo `.env` deve conter no minimo: `PORT` (default 3001), `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `NODE_ENV`. Os valores de `DB_*` devem ser lidos do state file do installer — nunca hardcoded. O arquivo deve ter permissoes `600` com dono `fraghub:fraghub`. O `.env.example` deve conter as mesmas chaves com valores placeholder (sem dados sensiveis) e ser versionado no repositorio.

### APISETUP-REQ-007 - Conexao com MariaDB via Knex.js
O modulo `src/db/index.ts` deve exportar uma instancia Knex configurada com os valores do `.env`. A conexao deve usar charset `utf8mb4`. Na inicializacao da aplicacao, o sistema deve executar `knex.raw('SELECT 1')` para validar a conexao e logar erro fatal se falhar, encerrando o processo com codigo 1.

### APISETUP-REQ-008 - Endpoint GET /health
O endpoint `GET /health` deve retornar HTTP 200 com body JSON:
```json
{
  "status": "ok",
  "version": "<package.json version>",
  "db": "connected" | "disconnected",
  "timestamp": "<ISO 8601>"
}
```
O campo `db` deve refletir o estado real da conexao com MariaDB no momento da requisicao.

### APISETUP-REQ-009 - Servico systemd fraghub-api.service
Deve ser criada a unidade `/etc/systemd/system/fraghub-api.service` com: `User=fraghub`, `WorkingDirectory=/opt/fraghub/api`, `ExecStart=node dist/index.js`, `Restart=always`, `RestartSec=5`, `EnvironmentFile=/opt/fraghub/api/.env`, `StandardOutput=journal`, `StandardError=journal`. O servico deve ser habilitado via `systemctl enable` e iniciado via `systemctl start`.

### APISETUP-REQ-010 - State File do Installer
Ao concluir com sucesso, o script deve registrar `api-setup` como concluida no state file do installer em `/opt/fraghub/state`, seguindo o padrao ja estabelecido pela feature `cli-installer`.

## Requisitos Nao Funcionais

### APISETUP-NFR-001 - ShellCheck
Todos os scripts bash da feature devem passar no ShellCheck sem erros ou warnings nivel error.

### APISETUP-NFR-002 - Idempotencia
O script de instalacao deve ser idempotente: executar duas vezes nao deve causar erros nem duplicar configuracoes. Se `api-setup` ja estiver marcada como concluida no state file, o script deve pular e informar que ja foi instalado.

### APISETUP-NFR-003 - Seguranca do .env
O arquivo `.env` nunca deve ter permissoes acima de `600`. O `.env` nunca deve ser versionado no repositorio (`.gitignore` deve incluir `.env`).

### APISETUP-NFR-004 - Logs Estruturados
A aplicacao deve logar para stdout/stderr em formato legivel pelo journald. Nivel de log controlado pela variavel de ambiente `LOG_LEVEL` (default: `info`).

### APISETUP-NFR-005 - Porta Configuravel
A porta da API deve ser configuravel via variavel de ambiente `PORT`. O default deve ser `3001` para evitar conflito com portas comuns.

## Criterios de Aceitacao

- **AC-001**: Apos execucao do script, `systemctl is-active fraghub-api.service` retorna `active`
- **AC-002**: `curl -s http://localhost:3001/health` retorna HTTP 200 com campo `"status": "ok"` e `"db": "connected"`
- **AC-003**: `ls -la /opt/fraghub/api/.env` mostra permissoes `-rw-------` com dono `fraghub fraghub`
- **AC-004**: `npx tsc --noEmit` executado em `/opt/fraghub/api/` completa sem erros
- **AC-005**: `npm run lint` executado em `/opt/fraghub/api/` completa sem erros de lint
- **AC-006**: Executar o script de instalacao uma segunda vez resulta em mensagem "api-setup ja instalado" sem erros
- **AC-007**: `grep "api-setup" /opt/fraghub/state` retorna a linha de conclusao com timestamp
- **AC-008**: `systemctl enable fraghub-api.service` ja esta configurado — apos reboot, o servico sobe automaticamente

## Out of Scope (esta feature)
- Endpoints de autenticacao, usuarios, partidas ou qualquer logica de negocio (responsabilidade das features subsequentes)
- Configuracao de HTTPS/TLS (responsabilidade da feature `nginx-setup`)
- Configuracao do Nginx como reverse proxy
- Migrations do banco de dados (responsabilidade da feature `database-baseline`)
- Rate limiting global da API
- Monitoramento e alertas

## Dependencias
- `cli-installer` (v0.1): usuario `fraghub` criado, estrutura `/opt/fraghub/` existente, state file disponivel
- `database-baseline` (v0.2): MariaDB instalado, banco `fraghub_db` criado, usuario `fraghub_app` com senha gerada e gravada no state file

## Riscos Iniciais
- **Versao do Node.js no apt**: o repositorio NodeSource pode ter latencia de atualizacao para Ubuntu 22.04/24.04 — o precheck deve validar a versao exata 20.x e falhar se for diferente
- **Permissoes do .env**: se o processo de scaffold rodar como root e nao ajustar o dono para `fraghub`, o servico systemd nao conseguira ler o arquivo
- **Porta em uso**: a porta 3001 pode estar ocupada por outro processo — o precheck deve verificar disponibilidade da porta antes de iniciar o servico
