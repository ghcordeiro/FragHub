# auth-api — Validação

## Gates

- **Validate:** em progresso. Evidência automática local registada abaixo; ACs que exigem MariaDB + HTTP de ponta a ponta permanecem em UAT/E2E.

## Evidência E2E remoto (2026-04-13)

Host: `ranch@192.168.1.200`, repo remoto `/home/ranch/FragHub`.

Comando:

```bash
bash .cursor/skills/ssh-ubuntu-e2e/scripts/run-e2e-remote.sh --rerun --reset-database-baseline --reset-api-step
```

Resultado: migracao **004** aplicada no remoto; **api-setup** reexecutado; smoke auth:

`Smoke auth-api OK (health, register, login negativo, login, refresh, logout, refresh revogado).`

**Nota:** Em instalações que já tinham `database_baseline` antes da `004`, é necessário `--reset-database-baseline` (ou `FRAGHUB_FORCE_ALL=1`) para aplicar `google_id` / `refresh_tokens`; caso contrário `POST /auth/register` falha com `Unknown column 'google_id'`.

## Evidência local (2026-04-12)

Comando (exit 0):

```bash
cd services/fraghub-api && npm ci --no-audit --no-fund && npm run build && npm test && npm run lint
```

Resultado: **build OK**, **Vitest 7 testes** (`src/middleware/auth.test.ts`), **ESLint OK**.

## Matriz AC / REQ

| AC / REQ | Estado | Evidência |
|----------|--------|-----------|
| AUTHAPI-NFR-005 | Coberto | Testes unitários do middleware (ver comando acima). |
| T-08 / build | Coberto | `tsc` + `eslint` no mesmo comando. |
| AC-001, AC-002, AC-003, AC-007 | Parcial E2E 2026-04-13 | Smoke remoto: health, register 201, login 401/200, refresh 200, logout 204, refresh 401. **AC-006 (429)** e rotação fina ainda não exercitados no script. |
| AC-004, AC-005, AC-009 | Pendente | Smoke não cobre middleware nem admin (precisa JWT + DB role admin). |
| AC-006 | Pendente | Rate limit: 11× login no mesmo IP. |
| AC-008, AC-011 | UAT pendente | Google OAuth real + callback; state inválido → `?error=oauth_state`. |
| AC-010 | Coberto E2E 2026-04-13 | Remoto: `Migracao aplicada: 004 (auth_google_refresh)` + `verify_post_install` sem falhas. |

## Instalador (checklist UAT)

1. `database-baseline` com ficheiro `004_auth_google_id_refresh_tokens.sql` aplicado.
2. `api-setup.sh` com `FRAGHUB_API_TEMPLATE_DIR` apontando ao repo (ou cópia de `services/fraghub-api`).
3. `curl -sS http://127.0.0.1:<PORT>/health` → JSON `status: ok`.
4. Substituir placeholders Google no `.env` da API antes de validar AC-008.

## Fecho do gate Validate

Marcar **Validate** como **Aprovado** em `tasks.md` apenas após:

- preencher a coluna «Evidência» para AC-001…011 com outputs (curl/log) ou referência a run E2E; e
- revisão humana rápida do checklist acima.
