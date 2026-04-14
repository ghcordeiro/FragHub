# C4 L1 — Steam integration (contexto)

```mermaid
flowchart TD
  player[UtilizadorAutenticado]
  steam[SteamOpenID]
  plugin[PluginCS2ouCSGO]
  api[FragHubAPI_Node]
  db[(MariaDB_fraghub_db)]

  player -->|BearerJWT_GET_auth_steam_link| api
  api -->|redirectOpenID| steam
  steam -->|callbackQuery| api
  api -->|atualizasteam_id| db
  plugin -->|GET_api_player_steamid| api
  api -->|leituraPublica| db
```

## Notas

- **Login** não passa pela Steam; apenas **vinculação** pós-sessão `auth-api`.
- O **portal** (v0.4) consome redirects para `FRONTEND_URL` após callback.
