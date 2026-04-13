# api-setup — Plano técnico

> **Rascunho operacional.** Avançar fase Implement apenas após gate **Tasks** aprovado e contexto Linear/Paperclip carregado (AGENTS.md).

## Objetivo

Entregar, via `scripts/installer/api-setup.sh` e etapa `api_setup` do pipeline, o bootstrap descrito em `spec.md`: projeto Node 20 + Express + TypeScript strict + Knex + ESLint/Prettier + systemd `fraghub-api.service` + `GET /health`.

## Decisões de arquitetura

| Tema | Escolha | Registro |
|------|---------|----------|
| Persistência / queries | Knex + mysql2 | `docs/adr/0005-api-backend-bootstrap-instalador.md` |
| Layout em disco | `/opt/fraghub/api/` com `src/` → `dist/` | idem + `spec.md` REQ-002 |
| Estado installer | `steps.env` + marcadores `.done` (ADR-0002) | `state.sh`, `api-setup.sh` |
| Porta default | `3001` | alinhar specs dependentes que ainda citam `3000` |

## Diagramas C4

Escopo **Medium** — sem diagrama C4 dedicado nesta fase; o contexto L1/L2 do backend será refinado na feature `auth-api` ou documento de arquitetura agregado se o CTO aprovar extensão de escopo.

## Integração no pipeline

- `install.sh`: `run_step api_setup` após `database_backup`.
- `state.sh`: `fraghub_state_verify_api_setup` valida marcador, unit systemd, `package.json`, `dist/index.js`, `.env`.
- `verify.sh` / `summary.sh`: smoke e mensagem ao operador.

## Lacunas conhecidas (resolver nas tasks)

1. **AC-006 / idempotência**: a spec pede mensagem explícita ao reexecutar o script; hoje a idempotência forte está no `install.sh` (`fraghub_state_should_skip`). Definir se o módulo `api-setup.sh` deve sair cedo quando já concluído.
2. **AC-007 / caminho**: a spec menciona `/opt/fraghub/state`; o estado canónico do installer é `~/.fraghub/installer/state/steps.env` (ADR-0002). Atualizar spec ou implementação para um único critério verificável.
3. **`.gitignore` no scaffold**: garantir que o projeto gerado inclui exclusão de `.env` conforme NFR (mesmo fora do repo monorepo).
4. **Grep graph-first**: exploração de impacto depende do MCP code-review-graph; com ferramenta indisponível, usar revisão manual dos ficheiros listados em `tasks.md`.

## Riscos residuais

- Node 20 ausente no SO → precheck deve falhar cedo (já previsto).
- Porta em uso por processo estranho → precheck com `ss` (já previsto).
- `Requires=mariadb.service` pode variar se o unit MariaDB tiver nome diferente na distro — validar em Ubuntu 22.04/24.04 na fase Validate.
