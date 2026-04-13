# C4 L1 — Auth API (Contexto)

```mermaid
flowchart TD
  player[UtilizadorJogadorOuAdmin]
  google[GoogleOAuth]
  spa[FrontendFragHub]
  api[FragHubAPI_Node]
  db[(MariaDB_fraghub_db)]

  player -->|emailSenha_JSON| api
  player -->|navegadorRedirect| google
  google -->|callbackCodigo| api
  api -->|JWT_accessCorpo_cookieRefresh| spa
  api -->|users_refresh_tokens| db
  spa -->|BearerJWT| api
```

## Notas

- O **frontend** ainda não existe na v0.3 completa; o fluxo OAuth assume `FRONTEND_URL` configurável.
- **Steam** e **plugins** ficam fora deste diagrama (features separadas).
