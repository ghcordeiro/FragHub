# C4 L2 — Auth API (Contentores)

```mermaid
flowchart LR
  subgraph host[ServidorUbuntu]
    systemd[systemd_fraghub_api]
    node[ProcessoNode_dist_index_js]
    env[EnvironmentFile_opt_fraghub_api_env]
  end
  maria[(MariaDB)]

  systemd --> node
  env --> node
  node -->|Knex_mysql2| maria
```

## Notas

- Um único processo Node serve **health** e **auth** no mesmo porto (default **3001**).
- Cookies de refresh limitados a `path: /auth` na spec; Nginx (futuro `nginx-ssl`) pode expor `/auth` e `/api` com o mesmo upstream.
