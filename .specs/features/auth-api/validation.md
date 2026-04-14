# auth-api — Validação

## Gates

- **Validate:** **Aprovado** (**2026-04-13**). Aprovador: utilizador (confirmação explícita de validação completa). Mantêm-se abaixo as evidências automáticas e E2E já registadas.

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
| AUTHAPI-NFR-005 | Coberto | Testes unitários do middleware (comando local acima). |
| T-08 / build | Coberto | `tsc` + `eslint` no mesmo comando. |
| AC-001, AC-002, AC-003, AC-007 | Coberto | Smoke E2E remoto **2026-04-13** + confirmação de validação **2026-04-13**. |
| AC-004, AC-005, AC-009 | Coberto | Testes unitários middleware/roles + confirmação de validação **2026-04-13**. |
| AC-006 | Coberto | Confirmação de validação **2026-04-13** (rate limit 429 / `Retry-After` conforme spec). |
| AC-008, AC-011 | Coberto | Confirmação de validação **2026-04-13** (OAuth Google + state). |
| AC-010 | Coberto | E2E remoto: migration **004** + `verify_post_install` sem falhas. |

## Instalador (checklist UAT)

1. `database-baseline` com ficheiro `004_auth_google_id_refresh_tokens.sql` aplicado.
2. `api-setup.sh` com `FRAGHUB_API_TEMPLATE_DIR` apontando ao repo (ou cópia de `services/fraghub-api`).
3. `curl -sS http://127.0.0.1:<PORT>/health` → JSON `status: ok`.
4. Substituir placeholders Google no `.env` da API antes de validar AC-008.

## Fecho do gate Validate

Gate **Validate** fechado em **2026-04-13** com aprovação do utilizador; alinhado a `tasks.md`.
