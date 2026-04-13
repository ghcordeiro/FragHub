# ADR 0005 — Bootstrap da API backend via instalador

## Status

Aceito (proposta operacional para a feature `api-setup`).

## Contexto

A milestone v0.3 exige uma API REST em Node.js 20, TypeScript strict, Express, conexão MariaDB e serviço systemd, provisionada de forma repetível no servidor Ubuntu, alinhada à Constituição (sem root no runtime da app, JWT/cookies ficam para features posteriores).

## Decisão

1. **Scaffold em `/opt/fraghub/api/`** — código gerado no alvo de produção pelo script `scripts/installer/api-setup.sh`, com dono `fraghub:fraghub`, build (`tsc`) antes de habilitar o serviço.
2. **Query builder** — uso de **Knex.js** + driver `mysql2`, charset `utf8mb4`, validação de conexão com `SELECT 1` no startup e no endpoint `GET /health`.
3. **systemd** — unidade `fraghub-api.service`: `User=fraghub`, `WorkingDirectory=/opt/fraghub/api`, `ExecStart=node dist/index.js`, `EnvironmentFile` apontando para `.env` (0600), dependência lógica de rede e MariaDB (`After=` / `Requires=mariadb.service`).
4. **Credenciais** — leitura de campos já materializados pelo installer (ex.: `mysql-app.cnf` / ficheiros sob `FRAGHUB_INPUT_DIR`), sem passwords hardcoded no repositório FragHub.
5. **Estado de conclusão** — dupla trilha alinhada ao ADR-0002: ficheiro `steps.env` (etapa `api_setup=done`) gerido por `install.sh` + `state.sh`, e marcador `api-setup.done` sob o diretório de input do operador para verificação rápida e hooks de verify.

## Consequências

- O código da API **não** vive apenas no monorepo Git inicial; o instalador é a fonte de verdade do layout em produção até existir um pacote versionado publicado separadamente (futuro).
- Alterações de stack (versões npm, ESLint) devem ser feitas no script gerador ou num template versionado, com regressão nos ACs da feature.
- Especificações downstream (`nginx-ssl`, `frontend-setup`) devem referenciar a **porta documentada** da API (default **3001** na spec `api-setup`) para evitar drift.

## Relações

- Depende de: ADR-0001 (fases), ADR-0002 (estado local), `database-baseline`.
- Supersedes: n/a.
