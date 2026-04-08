# FragHub - Estrutura de pastas

```
FragHub/
├── .specs/                          # Especificações do projeto (SDD)
│   ├── project/                     # Docs do projeto
│   │   ├── CONSTITUTION.md          # Regras imutáveis
│   │   ├── PROJECT.md               # Visão e objetivos
│   │   ├── STACK.md                 # Stack técnico detalhado
│   │   ├── LEVELS.md                # Sistema de níveis/ELO
│   │   ├── AUTH.md                  # Sistema de autenticação
│   │   ├── ROADMAP.md               # Milestones
│   │   ├── DEPENDENCIES.md          # Mapa de dependências
│   │   └── STATE.md                 # Decisões e histórico
│   │
│   └── features/                    # Specs de features (futuro)
│       ├── cli-installer/
│       ├── matchmaking/
│       └── admin-panel/
│
├── installer/                       # Script de instalação
│   ├── install.sh                   # Entry point
│   ├── lib/                         # Funções auxiliares
│   │   ├── utils.sh
│   │   ├── detect.sh
│   │   ├── install-cs2.sh
│   │   ├── install-csgo.sh
│   │   ├── install-db.sh
│   │   └── install-portal.sh
│   ├── configs/                     # Templates de config
│   │   ├── nginx/
│   │   ├── systemd/
│   │   └── game-servers/
│   └── README.md
│
├── portal/                          # Aplicação web
│   ├── backend/                     # API Node.js
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── middleware/
│   │   │   └── config/
│   │   ├── prisma/                  # Schema e migrations
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                    # React app
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── styles/
│       ├── package.json
│       └── vite.config.ts
│
├── plugins/                         # Plugins customizados
│   ├── cs2/                         # CounterStrikeSharp
│   │   └── FragHubTags/
│   │       ├── FragHubTags.cs
│   │       └── FragHubTags.csproj
│   │
│   └── csgo/                        # SourceMod
│       └── fraghub-tags/
│           ├── scripting/
│           │   └── fraghub_tags.sp
│           └── configs/
│
├── docs/                            # Documentação pública
│   ├── installation.md
│   ├── configuration.md
│   ├── api-reference.md
│   └── troubleshooting.md
│
├── .github/                         # GitHub configs
│   ├── workflows/                   # CI/CD
│   │   └── ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .gitignore
├── LICENSE                          # GPL-3.0
├── README.md                        # README principal
└── CONTRIBUTING.md
```

## Descrição das pastas

### `.specs/`
Documentação técnica interna (SDD). Não é documentação para usuários — é para desenvolvimento.

### `installer/`
Scripts bash do instalador interativo. Entry point é `install.sh`.

### `portal/`
Aplicação web completa (monorepo com backend + frontend).

### `plugins/`
Plugins customizados do FragHub (tags de nível). Um pra CS2, outro pra CS:GO.

### `docs/`
Documentação para usuários finais (como instalar, configurar, etc).

### `.github/`
Templates de issue/PR e workflows de CI/CD.

---

## O que criar agora (primeiro commit)

```
FragHub/
├── .specs/project/           # ← Specs que já criamos
├── .gitignore
├── LICENSE                   # Já criado pelo GitHub
├── README.md                 # Atualizar com descrição boa
└── CONTRIBUTING.md           # Básico
```

O resto das pastas cria conforme for implementando cada milestone.
