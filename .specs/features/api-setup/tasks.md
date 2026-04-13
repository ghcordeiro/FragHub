# api-setup — Tasks (TDAD)

> **Backlog executável.** Marcar como concluído apenas após evidência em `validation.md`. Ordem sugerida: T/I em pares.

## Legenda

- **T-xx** — critério de teste / verificação
- **I-xx** — implementação correspondente

## Gates SDD (explicitos)

A partir de **2026-04-13**, o gate **Tasks** (e Specify/Plan) está **aprovado** por humano — **I-xx** permitidos com evidência em `validation.md`. Regra histórica: antes dessa data, nenhum **I-xx** sem aprovação explícita (comentário Linear/Paperclip ou tabela abaixo).

| Gate | Estado | Aprovador | Data |
|------|--------|-----------|------|
| Specify (`spec.md`) | Aprovado | board (`local-board`) | 2026-04-13 |
| Plan (`plan.md` + ADR-0005) | Aprovado | board (`local-board`) | 2026-04-13 |
| Tasks (pares abaixo) | Aprovado | board (`local-board`) | 2026-04-13 |
| Implement | Concluído — E2E Ubuntu **2026-04-13** (`run-e2e-remote.sh --rerun`); detalhes em `validation.md` | — | 2026-04-13 |
| Validate | **Aprovado** — gate CTO fechado (**2026-04-13**); ver `validation.md` | CTO (utilizador) | 2026-04-13 |

Evidência da aprovação dos gates **Specify / Plan / Tasks**: comentário `Approved` no Paperclip na issue **FRAA-18** (comentário `210cc757-4d59-412c-88c6-aff4babf59e7`, 2026-04-13).

---

### Par 1 — Shell e política de execução

- **T-01**: `shellcheck scripts/installer/api-setup.sh` sem erros (APISETUP-NFR-001).
- **I-01**: Corrigir quaisquer findings do ShellCheck sem alterar comportamento funcional já acordado na spec.

### Par 2 — Idempotência do módulo

- **T-02**: Com `api_setup=done` em `steps.env` e verificação `fraghub_state_verify_api_setup` a PASS, executar **apenas** `bash scripts/installer/api-setup.sh` e observar saída: deve terminar `0` com mensagem clara tipo "api-setup ja instalado" sem reinstalar dependências npm (AC-006 interpretação módulo).
- **I-02**: No início de `run_api_setup`, consultar estado/marcadores canónicos e sair cedo com código 0 quando já instalado e consistente; caso inconsistente, seguir fluxo completo ou falhar com ação recuperável (alinhado a APISETUP-NFR-002).

### Par 3 — Rastreabilidade de estado (spec vs ADR-0002)

- **T-03**: Documento único (spec ou validation) descreve onde verificar conclusão: `steps.env`, `api-setup.done`, e opcional linha em `/opt/fraghub/state` se for introduzida.
- **I-03**: Resolver drift AC-007 / REQ-010 — ou persistir conclusão também em `/opt/fraghub/state` **ou** atualizar `spec.md` para o caminho real `FRAGHUB_STATE_DIR/steps.env` e ajustar AC-007.

### Par 4 — Scaffold Node

- **T-04**: Em Ubuntu de integração, após run: `npx tsc --noEmit`, `npm run lint`, `npm run build` em `/opt/fraghub/api/` como `fraghub` (AC-003, AC-004, AC-005).
- **I-04**: Garantir ficheiros gerados cumprem REQ-002..REQ-008 (incl. `.gitignore` com `.env`, `.env.example` com placeholders).

### Par 5 — systemd e health

- **T-05**: `systemctl is-active fraghub-api.service` == `active`; `curl -sf http://127.0.0.1:3001/health` JSON com `status=ok` e `db=connected` quando MariaDB ativo (AC-001, AC-002); `systemctl is-enabled fraghub-api.service` (AC-008).
- **I-05**: Validar unit gerada contra REQ-009 (nomes de serviço MariaDB, `EnvironmentFile`, restart policy).

### Par 6 — Pipeline installer

- **T-06**: `bash scripts/installer/install.sh` (ou subset com env de CI) avança etapa `api_setup` e `verify` sem regressão nas etapas anteriores.
- **I-06**: Confirmar `install.sh`, `state.sh`, `verify.sh`, `summary.sh` coerentes com o comportamento final dos pares acima.

---

## Dependências entre pares

`I-02`/`I-03` podem alterar mensagens e ficheiros tocados em `I-06`. `I-04`–`I-05` são o núcleo entregue; `I-01` pode ser feito em paralelo.

## Sumário para tracker (Linear / Paperclip)

Colar na **issue pai** após aprovação dos gates até **Tasks** (AGENTS.md: pós-Tasks sync).

- **Feature:** `api-setup` (milestone v0.3)
- **Specify:** `.specs/features/api-setup/spec.md` — gate na tabela acima
- **Plan:** `.specs/features/api-setup/plan.md` + ADR `docs/adr/0005-api-backend-bootstrap-instalador.md`
- **Tasks:** 6 pares **T-01/I-01** … **T-06/I-06** (ShellCheck → pipeline installer); **Implement** desbloqueado em **2026-04-13** (evidência Paperclip `FRAA-18` / board `Approved`)
- **Validate:** evidências em `.specs/features/api-setup/validation.md`
- **Sub-issues sugeridas (opcional):** um ticket por par T/I ou por bloco (1–2, 3, 4–5, 6); manter pai em `in_progress` até revisão dos filhos e resumo no pai

## Bloqueadores externos

| Bloqueador | Quem desbloqueia | Condição |
|------------|------------------|----------|
| Linear indisponível no agente | Operador / integração Cursor | MCP ou CLI Linear + issue pai da feature |
| code-review-graph indisponível | Operador | MCP ativo para `detect_changes` / `query_graph` em reviews |
| Shell remoto CI / E2E Ubuntu | Agente de validação ou skill ssh-ubuntu-e2e | Ambiente com Node 20 + MariaDB + sudo |
