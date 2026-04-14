# C4 L2 — Steam integration (contentores)

```mermaid
flowchart LR
  subgraph host[ServidorUbuntu]
    systemd[systemd_fraghub_api]
    node[ProcessoNode_fraghub_api]
    env[EnvironmentFile_opt_fraghub_api_env]
  end
  maria[(MariaDB)]
  steam[steamcommunity.com]

  systemd --> node
  env --> node
  node -->|Knex| maria
  node -->|HTTPS_check_authentication| steam
```

## Notas

- Mesmo processo Node que serve **auth** e **health** expõe rotas `/auth/steam/*` e `/api/player/*` (montagem em `index.ts`).
- **Nginx** (futuro) pode expor apenas paths necessários ao exterior.
