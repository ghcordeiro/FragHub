# Plano de idempotência e retomada (T-04)

## Objetivo

Documentar cenários de reexecução do instalador com **state store** local (`~/.fraghub/installer/state/steps.env`), alinhado ao `plan.md` e **ADR-0002**.

## Etapas rastreadas (v0.1)

| Etapa | Marcador `done` implica | Verificação mínima antes de skip |
| --- | --- | --- |
| `precheck` | Pre-checks executados com sucesso | Linux, `/etc/os-release`, `sudo -n` |
| `input` | Wizard concluído | Existe `~/.fraghub/installer/input.env` |
| `secrets` | Segredos aplicados | Existe `~/.fraghub/installer/effective.env` não vazio |
| `bootstrap` | Bootstrap concluído | `bootstrap.done` + pacote `nginx` instalado (`dpkg`) |
| `verify` | Smoke OK | Ficheiro `verify.passed` |
| `summary` | Resumo emitido | `summary.done` + `effective.env` presente |

## Cenários de reexecução

### 1) Sucesso completo e segundo `install.sh`

- **Dado**: todas as etapas `done` e artefatos presentes.
- **Esperado**: cada etapa é **pulada** após verificação OK; mensagem explícita no terminal.

### 2) Falha no meio (ex.: `secrets.sh`)

- **Dado**: `precheck` e `input` `done`; `secrets` falhou ou não foi marcado.
- **Esperado**: ao rerodar `install.sh`, **precheck** e **input** podem ser pulados se verificação OK; **secrets** executa de novo.

### 3) Estado inconsistente (artefato removido)

- **Dado**: `input=done` mas `input.env` foi apagado.
- **Esperado**: verificação falha; etapa volta a `pending` e o wizard **executa novamente**.

### 4) Forçar reexecução

- **Variáveis**:
  - `FRAGHUB_FORCE_ALL=1` — no início do `install.sh`, todas as etapas passam a `pending` uma única vez.
  - `FRAGHUB_FORCE_STEP=precheck|input|secrets|bootstrap|verify|summary` — antes de cada etapa, se coincidir com o nome, força `pending` só nessa etapa.
- **Esperado**: etapa correspondente **não** é pulada mesmo com `done` + verificação OK.

### 5) Limpar estado manualmente

- `bash scripts/installer/state.sh reset` remove `steps.env`.
- **Esperado**: próximo `install.sh` executa todas as etapas do zero (sujeito a prechecks).

## Critérios de conclusão do T-04

- [x] Cenários de rerun mapeados
- [x] Resultado esperado por etapa documentado
