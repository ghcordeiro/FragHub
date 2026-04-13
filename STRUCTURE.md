# FragHub — Estrutura do repositório

Árvore alinhada ao estado atual do mono-repo (instalador em bash, API TypeScript, especificações SDD). Pastas **planeadas** e ainda sem código no Git aparecem na secção [Fora do repo (ainda)](#fora-do-repo-ainda).

```
FragHub/
├── .specs/                          # SDD: constitution, roadmap, features
│   ├── project/
│   │   ├── CONSTITUTION.md
│   │   ├── PROJECT.md
│   │   ├── STACK.md
│   │   ├── LEVELS.md
│   │   ├── AUTH.md
│   │   ├── ROADMAP.md
│   │   ├── DEPENDENCIES.md
│   │   └── STATE.md
│   ├── planning/
│   │   └── PLANNING.md
│   └── features/                    # Uma pasta por feature (spec/plan/tasks/validation)
│       ├── cli-installer/
│       ├── database-baseline/
│       ├── database-backup/
│       ├── game-stack-baseline/
│       ├── api-setup/
│       ├── auth-api/
│       └── …                        # outras features (plugins, UI, etc.)
│
├── scripts/
│   └── installer/                   # Instalador interativo (Ubuntu LTS)
│       ├── install.sh               # Orquestra o pipeline (entry point)
│       ├── state.sh                 # Estado por etapa (steps.env)
│       ├── input.sh                 # Wizard CLI
│       ├── secrets.sh
│       ├── bootstrap.sh
│       ├── precheck.sh
│       ├── database-baseline.sh
│       ├── database-backup.sh
│       ├── api-setup.sh             # Sincroniza template da API → /opt/fraghub/api, systemd
│       ├── verify.sh
│       ├── summary.sh
│       ├── logging.sh
│       ├── game-*.sh                # Stack de jogo (opcional, FRAGHUB_ENABLE_GAME_STACK)
│       ├── plugins-*.sh
│       └── sql/
│           ├── database/            # Migrações versionadas (001…004, …)
│           ├── plugins-cs2/
│           └── plugins-csgo/
│
├── services/
│   └── fraghub-api/                 # Código-fonte da API (template para api-setup.sh)
│       ├── src/
│       │   ├── index.ts
│       │   ├── config/
│       │   ├── db/
│       │   ├── routes/              # ex.: auth.ts montado em /auth
│       │   ├── middleware/
│       │   ├── services/
│       │   └── types/
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
│
├── docs/                            # ADRs e diagramas C4 (público técnico)
│   ├── adr/                         # Architecture Decision Records
│   └── architecture/                # Context (L1) / Container (L2)
│
├── tests/
│   └── installer/                   # Planos e notas de teste do instalador
│
├── AGENTS.md                        # Contrato para agentes (Cursor, etc.)
├── STRUCTURE.md                     # Este ficheiro
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── .gitignore
```

## Descrição das pastas

### `.specs/`

Especificação e planeamento internos (SDD): não substituem documentação de utilizador final.

### `scripts/installer/`

Instalador bash para Ubuntu 22.04/24.04. O **único entry point** suportado no repo é `scripts/installer/install.sh` (com o working directory no clone do FragHub).

### `services/fraghub-api/`

Backend HTTP (Express + TypeScript + Knex + MariaDB). O instalador copia este diretório para o servidor alvo (por defeito `/opt/fraghub/api`) e gera `.env` com segredos e URLs.

### `docs/`

Registos de decisão (`adr/`) e vistas arquiteturais (`architecture/`). Não inclui ainda guias tipo “installation.md” na raiz de `docs/`; o fluxo principal está no instalador e nas specs.

### `tests/`

Material de apoio a testes (ex.: planos E2E do instalador).

### `.github/`

Não presente neste snapshot do repositório; CI/CD pode ser adicionado mais tarde.

---

## Fora do repo (ainda)

Itens previstos no desenho do produto mas **sem pasta correspondente** (ou vazia) neste checkout:

- **`portal/`** — frontend + backend “portal” monorepo (a API atual vive em `services/fraghub-api`).
- **`plugins/`** — plugins CS2/SourceMod para tags FragHub (podem existir noutro repositório ou milestone futuro).

Quando forem criados, este ficheiro deve ser atualizado.
