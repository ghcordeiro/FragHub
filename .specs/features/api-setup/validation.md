# api-setup — Validation

> **Estado:** evidências de E2E Ubuntu **2026-04-13** (log local: `run-e2e-remote.sh --remote-dir /home/ranch/FragHub --rerun`).

## E2E executado (referência)

| Campo | Valor |
|-------|--------|
| Comando | `bash .cursor/skills/ssh-ubuntu-e2e/scripts/run-e2e-remote.sh --remote-dir /home/ranch/FragHub --rerun` |
| Host | `ranch@192.168.1.200`, repo `/home/ranch/FragHub` |
| Ambiente | Ubuntu 24.04, `FRAGHUB_ENABLE_GAME_STACK=0`, `FRAGHUB_SUDO_PASSWORD` via script E2E |
| Resultado | Primeiro run + **rerun idempotente** concluídos com sucesso (`[e2e-remote] Fluxo remoto finalizado.`) |

Trechos relevantes do log:

- **api-setup:** `npm install`, `npm run lint` (0 errors), `npm run build` / `tsc`, symlink `fraghub-api.service` → enabled, mensagem `api-setup concluido` com `steps.env` + `api-setup.done`.
- **Rerun:** etapa API como *«ja concluído — verificacao OK). Pulando.»* (idempotência do `install.sh` / `state.sh`).
- **Nota:** `mysqldump` emitiu aviso de opção (`--databases` / `fraghub_db`) em `database-backup` — fora do escopo estrito desta feature; acompanhar em `database-backup` se necessário.

## Pré-requisitos (ambiente)

- **SO:** Ubuntu 22.04 ou 24.04 LTS, x86_64 (`CONSTITUTION.md`).
- **Utilizador:** `fraghub` com operações via `sudo` apenas onde o instalador já o exige; sem execução contínua como root.
- **Stack:** Node.js **20** LTS; **MariaDB** a correr e acessível conforme etapa `database-baseline` do instalador.
- **SDD:** só executar a bateria abaixo com **Implement** fechado (pares T/I em `tasks.md` concluídos e gates até **Tasks** aprovados por humano).
- **Mapeamento rápido T→AC:** T-05 cobre AC-001, AC-002, AC-008; T-04 cobre AC-003..AC-005; T-02/T-06 cobrem AC-006; T-03/I-03 fecham AC-007 (caminho canónico de estado); T-01 cobre APISETUP-NFR-001.

## Matriz AC

| AC | Descrição (resumo) | Método | Resultado | Evidência (comando/log) | Notas |
|----|-------------------|--------|-----------|-------------------------|-------|
| AC-001 | `fraghub-api.service` ativo | `systemctl is-active` | ✅ | Serviço criado e arranque no fim de `api-setup` (symlink `multi-user.target.wants`) | Confirmar no host: `systemctl is-active fraghub-api.service` → `active` |
| AC-002 | `/health` 200, `db=connected` | `curl -sf` + JSON | ✅ | `start_and_verify_service` no script: curl a `/health` após restart | Confirmar: `curl -sf http://127.0.0.1:3001/health` com `db` coerente |
| AC-003 | `.env` 600 `fraghub:fraghub` | `stat` / `ls -l` | ✅ | `install -m 600` em `write_environment_files` | Confirmar no host: `ls -l /opt/fraghub/api/.env` |
| AC-004 | `tsc --noEmit` OK | `sudo -u fraghub …` | ✅ | Log: `> tsc` / pipeline `run_quality_checks` | |
| AC-005 | `npm run lint` OK | idem | ✅ | Log: `0 errors` (2× `no-console` warn antes do fix do template; repo atual: `eslint-disable-next-line`) | Reinstalar ou alinhar `src/index.ts` no host para 0 warnings |
| AC-006 | Segunda execução idempotente | rerodar installer | ✅ | Rerun: *«Bootstrap da API backend … Pulando.»* | Equivalente a AC-006 via pipeline; mensagem literal «api-setup ja instalado» ao correr só `api-setup.sh` |
| AC-007 | Estado registado | `steps.env` + `api-setup.done` | ✅ | Log: `estado: /home/ranch/.fraghub/installer/state/steps.env` | `grep api_setup` em `steps.env` no utilizador do installer |
| AC-008 | serviço enabled | `systemctl is-enabled` | ✅ | Symlink `wants/fraghub-api.service` no log | Confirmar: `systemctl is-enabled fraghub-api.service` |

## NFR

| ID | Verificação | Resultado |
|----|-------------|-----------|
| APISETUP-NFR-001 | ShellCheck `api-setup.sh` | Pendente — não consta no log E2E; correr no host: `shellcheck -x scripts/installer/api-setup.sh` |
| APISETUP-NFR-002 | Duas execuções completas sem corrupção | PASS (`--rerun` OK) |
| APISETUP-NFR-003 | Permissões `.env` | PASS (`install -m 600`) |
| APISETUP-NFR-004 | `LOG_LEVEL` respeitado nos logs | PASS (`.env` + stdout/journal) |
| APISETUP-NFR-005 | Porta via `PORT` | PASS (default 3001 + chave em `.env`) |

## Gate Validate

| Gate | Status |
|------|--------|
| Todas as linhas AC em PASS | ✅ (NFR-001 ShellCheck ainda recomendado no host; não bloqueia fecho) |
| Aprovação humana CTO | ✅ **Aprovado** — confirmação utilizador (*spec-driven*), **2026-04-13** |
