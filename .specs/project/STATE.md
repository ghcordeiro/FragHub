# FragHub State

> Registro de decisões e estado atual do projeto

## Decisões tomadas

### Stack e arquitetura

| Decisão | Escolha | Data | Rationale |
|---------|---------|------|-----------|
| Suporte a jogos | CS2 + CS:GO Legacy | 2026-04-08 | Maximizar alcance da comunidade |
| Base de servidor | LinuxGSM | 2026-04-08 | Já resolve install/update/monitor |
| Banco de dados | MariaDB | 2026-04-08 | Open source, compatível MySQL |
| Framework CS2 | CounterStrikeSharp | 2026-04-08 | Padrão da comunidade |
| Framework CS:GO | SourceMod | 2026-04-08 | Padrão estabelecido |
| Match system CS2 | MatchZy (original) | 2026-04-08 | Mais simples, suficiente |
| Match system CS:GO | Get5 | 2026-04-08 | Padrão para competitivo |
| Admin CS2 | CS2-SimpleAdmin | 2026-04-08 | Mais completo, MySQL |
| Admin CS:GO | SourceBans++ | 2026-04-08 | Web panel incluso |
| Skins CS2 | WeaponPaints | 2026-04-08 | Mais popular |
| Skins CS:GO | Weapons & Knives | 2026-04-08 | Padrão |

### Autenticação

| Decisão | Escolha | Data | Rationale |
|---------|---------|------|-----------|
| Métodos de login | Google OAuth + Email/Senha | 2026-04-08 | Flexibilidade |
| Vinculação Steam | Separada do login | 2026-04-08 | Conta primeiro, Steam depois |
| Steam obrigatória | Só para jogar | 2026-04-08 | Pode navegar sem Steam |
| Admin criar contas | Sim | 2026-04-08 | Útil para adicionar amigos |
| Sessões | JWT (access + refresh) | 2026-04-08 | Stateless, escalável |

### Sistema de níveis

| Decisão | Escolha | Data | Rationale |
|---------|---------|------|-----------|
| Sistema de ranking | Níveis 1-10 (estilo Faceit) | 2026-04-08 | Familiar, visual |
| Faixas de ELO | Baseado na Faceit | 2026-04-08 | Referência do print |
| Formato da tag | `[6]` (só número) | 2026-04-08 | Clean, simples |
| Tag de admin | `[ADMIN]` sempre | 2026-04-08 | Prioridade sobre nível |
| ELO inicial | 1000 (Nível 4) | 2026-04-08 | Meio da tabela |
| Algoritmo | Glicko-2 simplificado | 2026-04-08 | Mais preciso que ELO puro |

### Plugins e features

| Decisão | Escolha | Data | Rationale |
|---------|---------|------|-----------|
| Demo recording | Automático | 2026-04-08 | Essencial para disputas |
| Tags in-game | Plugin customizado | 2026-04-08 | Integração com API |
| Discord integration | Webhooks | 2026-04-08 | Notificações de partida |

---

## Questões em aberto

| Questão | Status | Notas |
|---------|--------|-------|
| Domínio (fraghub.gg?) | Pendente | Verificar disponibilidade |
| Decay de ELO | v2.0 | -25/semana após 30 dias inativo |
| Anti-smurf | v2.0 | Verificação de horas/Prime |
| Mobile app | v2.0+ | React Native |

---

## Histórico de sessões

### 2026-04-14 — Feature `matches-api`: documentação alinhada ao fecho SDD

- **Contexto:** implementação já no repo; utilizador confirmou desenvolvimento completo.
- **Artefactos:** `validation.md` — gate **Validate** marcado **Aprovado** (CTO **2026-04-14**), secção *Pós-fecho* com próxima frente v0.4; `tasks.md` — sumário para tracker actualizado; `ROADMAP.md` — `matches-api` **[x]**; `PLANNING.md` — v0.3 ✅, contagem pendente v0.4→v1.0 **19**; `STATE.md` — *Próximos passos* → **frontend-setup**.

### 2026-04-13 — Feature `matches-api`: Get5 `series_end` + gates SDD

- **Parser:** `parseMatchWebhook` aceita **`series_end`** (Get5) com `team*.stats.players` ou `team*.players`; `external_match_id` `{matchid}-series`.
- **SDD:** `tasks.md` — gates **Specify**, **Plan**, **Tasks** e **Implement** marcados como concluídos/aprovados (**2026-04-13**); **Validate** pendente.
- **Evidência:** `validation.md` — bloco *Evidência local* preenchido.

### 2026-04-13 — Feature `matches-api`: SDD + implementação inicial

- **Artefactos:** `plan.md`, `tasks.md`, ADR **`docs/adr/0008-matches-api-schema-webhook.md`**, `validation.md` (rascunho).
- **Código:** migração **`006_matches_api_schema.sql`** + `database-baseline.sh`; `WEBHOOK_SECRET` / `DISCORD_WEBHOOK_URL` em `env.ts`, `test-env.ts`, `.env.example`, **`api-setup.sh`**; `matchWebhookPayloads.ts` / `matchWebhookService.ts` / `eloUpdateStub.ts` / `discordNotify.ts`; **`routes/matches.ts`** (webhook, listagem, detalhe + `includeRaw` admin, histórico/stats por jogador); `matchesWebhookLimiter`; `index.ts` monta **`matchesRouter` antes de `playersRouter`**.
- **Testes:** `matchWebhookPayloads.test.ts`.
### 2026-04-13 — Feature `players-api`: gate Validate aprovado

- **SDD:** utilizador confirmou **Validate**; `validation.md` e `tasks.md` atualizados (**2026-04-13**).
- **Roadmap / planeamento:** `ROADMAP.md` e `PLANNING.md` — `players-api` concluída; próxima frente v0.3: **`matches-api`**.

### 2026-04-13 — Feature `players-api`: E2E Ubuntu (ssh-ubuntu-e2e) PASS

- **Comando:** `run-e2e-remote.sh --remote-dir /home/ranch/FragHub --rerun --reset-database-baseline --reset-api-step` — **exit 0**.
- **Remoto:** migração **005** aplicada; API rebuild + systemd; rerun idempotente; smoke **auth-api** OK em `127.0.0.1:3001`.
- **Evidência:** `.specs/features/players-api/validation.md` (secção E2E).

### 2026-04-13 — Feature `players-api`: Implement na API

- **Código:** migração `005_players_api_users_ban_elo.sql` + `database-baseline.sh`; `src/utils/elo.ts`; `userService` (listagem, perfil, ban, plugin query com banidos); `routes/players.ts` (REST: listagem, perfil `:id`, `PATCH /me`, `DELETE` admin, `GET /player/:steamid`); `authMiddleware` → **401** `Account banned`; remoção de `routes/player.ts` e `levelFromElo.ts`.
- **Testes:** `elo.test.ts`; `auth.test.ts` (conta banida).
- **Artefactos:** `validation.md` (gate **Validate** pendente).
- **Próximo:** gate **Validate** (confirmação humana) após rever `validation.md`.

### 2026-04-13 — Feature `players-api`: gates Specify + Tasks aprovados

- **SDD:** utilizador confirmou **aprovado**; `tasks.md` — gates **Specify** e **Tasks** com estado **Aprovado**, aprovador **utilizador**, data **2026-04-13**; **Implement** desbloqueado.

### 2026-04-13 — Feature `players-api`: continuação SDD (pós steam-integration)

- **Contexto:** `steam-integration` encerrada (Validate **2026-04-13**); frente ativa v0.3: **`players-api`** (`.specs/features/players-api/spec.md` já existia de 2026-04-09).
- **Artefacto:** criado `.specs/features/players-api/tasks.md` com **gates SDD** (Plan dispensado conforme `PLANNING.md` Medium) e pares T/I (migrations `banned_*`, listagem, perfil, PATCH me, DELETE admin, consolidação de `GET /api/player/:steamid`, util de nível, qualidade).
- **Código actual:** `routes/player.ts` implementa parcialmente o endpoint plugin; `levelFromEloRating` ainda devolve `null` por design temporário — alinhar na fase **Implement** a **PLAYAPI-REQ-008** (tabela provisória no spec).
- **MCP `code-review-graph`:** indisponível neste runtime do agente (servidor MCP não registado).

### 2026-04-13 — Feature `steam-integration`: gate Validate aprovado

- **SDD:** utilizador confirmou **Validate**; `validation.md` e `tasks.md` atualizados (**2026-04-13**).
- **Roadmap / planeamento:** `ROADMAP.md` e `PLANNING.md` — `steam-integration` concluída; próxima frente v0.3: **`players-api`**.

### 2026-04-13 — Feature `steam-integration`: Plan/Tasks aprovados + Implement na API

- **SDD:** utilizador aprovou **Plan** e **Tasks**; `tasks.md` — **Implement** concluído no repo; `validation.md` criado (gate **Validate** em progresso).
- **Código:** rotas Steam OpenID (`/auth/steam/link`, `/auth/steam/callback`, `DELETE /auth/steam/link`), `GET /api/player/:steamid`, `DELETE /admin/players/:id/steam`; env `STEAM_*`; `api-setup.sh` gera segredos/URLs Steam; testes unitários `steamState` / parse `claimed_id`.
- **Próximo:** UAT Steam + evidências AC → fechar **Validate**.

### 2026-04-13 — Feature `steam-integration`: Specify aprovado + Plan/Tasks redigidos

- **SDD:** utilizador aprovou **Specify**; criados `plan.md`, `tasks.md`, ADR **`docs/adr/0007-steam-integration-openid-public-player.md`**, C4 L1/L2 em `docs/architecture/steam-integration-*.md`.
- **Spec:** **STEAMINT-REQ-009** alargado com `STEAM_STATE_SECRET` (HMAC do state, ≥32 caracteres).
- **Próximo:** gates formais **Plan** e **Tasks** em `tasks.md`; depois **Implement**.

### 2026-04-13 — Feature `auth-api`: gate Validate aprovado

- **SDD:** utilizador confirmou validação completa; `validation.md` e `tasks.md` atualizados (gate **Validate** aprovado **2026-04-13**).
- **Roadmap / planeamento:** `ROADMAP.md` e `PLANNING.md` — `auth-api` marcada como concluída; próxima frente v0.3: **`steam-integration`**.

### 2026-04-13 — Feature `api-setup`: gate Validate (CTO) aprovado

- **SDD:** utilizador confirmou **aprovado** (*spec-driven*); `validation.md` e `tasks.md` atualizados com fecho do gate CTO (**2026-04-13**).
- **E2E:** evidência prévia em Ubuntu (`run-e2e-remote.sh --rerun`); **NFR-001** ShellCheck permanece recomendado no host, sem bloquear fecho.
- **Próximo:** avançar roadmap v0.3 conforme `.specs/project/ROADMAP.md` / `PLANNING.md`.

### 2026-04-13 — CTO heartbeat (Linear GraphQL + Paperclip [FRAA-17](/FRAA/issues/FRAA-17))

- **Linear:** `LINEAR_API_KEY` presente no runtime; `commentCreate` em **FRA-15** com *Sumário para tracker* + nota de gates aprovados e **Implement** desbloqueado — comentário [no Linear](https://linear.app/fraghub/issue/FRA-15/fraghub-continuation-kickoff-sdd-linear-v03-api-setup#comment-7222fdac).
- **Paperclip:** `inbox-lite` do CTO **[]**; comentário de auditoria em [FRAA-17](/FRAA/issues/FRAA-17#comment-15e5c0a9-8808-48e3-99de-f36d56f8373b) com ligação ao Linear e pedido para o CEO fechar [FRAA-19](/FRAA/issues/FRAA-19) se redundante.
- **Repo:** `.specs/features/api-setup/tasks.md` — gates **Specify/Plan/Tasks** aprovados **2026-04-13**; **Implement** desbloqueado (próximo: pares **T/I** + `validation.md`).
- **Checkout CTO:** sem issue ativa atribuída em `todo`/`in_progress`/`blocked` neste run (histórico: [FRAA-18](/FRAA/issues/FRAA-18) **`done`**).

### 2026-04-13 — CEO heartbeat #10 (Paperclip: FRAA-18 `done` + erro `release` de novo)

- Contexto obrigatório recarregado (ordem AGENTS.md): `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md`.
- **Paperclip:** `inbox-lite` com [FRAA-17](/FRAA/issues/FRAA-17); `checkout` OK; comentário no pai com estado **filha [FRAA-18](/FRAA/issues/FRAA-18) = `done`**, gates SDD repo ainda pendentes, Linear FRA-15 manual.
- **Erro:** chamada `release` apesar da nota no próprio comentário — API repôs pai a **todo** sem assignee; **PATCH** corrigiu para **in_progress** + CEO + comentário de auditoria.
- **Regra reforçada:** não usar `release` neste fluxo de pai em tracking até haver comportamento seguro ou fecho explícito do issue.

### 2026-04-13 — CEO heartbeat #9 (Paperclip: FRAA-17 pai + lição `release`)

- Contexto obrigatório recarregado (ordem AGENTS.md): `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md`.
- **Paperclip:** [FRAA-18](/FRAA/issues/FRAA-18) em **in_progress**; inbox CEO vazio; `POST .../checkout` em [FRAA-17](/FRAA/issues/FRAA-17) (assignee CEO, estava `done`) transitou pai **done → in_progress** (delegação activa).
- **`release`:** reverteu FRAA-17 para **todo** e removeu assignee; **PATCH** repôs **in_progress** + assignee CEO + comentários de auditoria no Paperclip.
- **Lição:** não usar `release` no pai quando o objectivo é só fechar lock mas manter o pai em tracking **in_progress**; preferir PATCH explícito.
- Comentário adicional em [FRAA-18](/FRAA/issues/FRAA-18) para visibilidade do CTO.

### 2026-04-13 — CEO heartbeat #8 (FRAA-19: sumário pós-Tasks para Linear)

- Contexto obrigatório recarregado (ordem AGENTS.md): `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md`.
- **Paperclip:** `GET /api/agents/me` OK (CEO); `inbox-lite` com **[FRAA-19](/FRAA/issues/FRAA-19)** atribuída; `POST /api/issues/{id}/checkout` OK; `POST /api/issues/{id}/comments` com bloco *Sumário para tracker* + condição de gates; `PATCH` **done** com referência ao comentário.
- **SDD `api-setup`:** gates Specify/Plan/Tasks em `.specs/features/api-setup/tasks.md` permanecem *Aguardando confirmação formal*; **Implement (I-xx)** bloqueado até aprovação da linha Tasks.
- **code-review-graph / Linear API:** indisponíveis neste runtime do agente; sumário para colagem manual em Linear **FRA-15** conforme descrição da FRAA-19.

### 2026-04-13 — CEO heartbeat #7 (Paperclip API + sync CTO)

- Contexto obrigatório recarregado (ordem AGENTS.md): `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md`.
- **Paperclip:** `curl` com `PAPERCLIP_API_URL` + `PAPERCLIP_API_KEY` + `X-Paperclip-Run-Id` operacional; `GET /api/agents/me` OK (agente CEO); `GET /api/agents/me/inbox-lite` **[]** (sem atribuições ao CEO).
- **Issues:** comentário de sync SDD `api-setup` em [FRAA-18](/FRAA/issues/FRAA-18) (filha CTO, kickoff FRA-15); resumo com ligação ao filho em [FRAA-17](/FRAA/issues/FRAA-17). `POST .../checkout` da FRAA-18 pelo CEO → **409** (assignee CTO — esperado).
- **code-review-graph / Linear MCP:** continuam fora deste agente; Linear segue dependência humana/CTO conforme AGENTS.md.
- **Nota:** durante validação do schema de comentários foi criado um comentário `test` efémero em FRAA-18; seguido de comentário substancial com estado real.

### 2026-04-13 — CTO heartbeat (protocolo `curl` + [FRAA-18](/FRAA/issues/FRAA-18))

- **Paperclip:** `GET /api/agents/me` + `GET /api/agents/me/inbox-lite` OK via shell; comentário novo em [FRAA-18](/FRAA/issues/FRAA-18#comment-0dd33e8b-7c34-4152-8e51-ad56c7171132) (run `0ae7c312-6805-4c02-affb-9223728d2f08`).
- **Checkout:** `POST .../checkout` → *Issue checkout conflict* (há `executionRunId`/`activeRun` associado à issue — não houve checkout limpo neste heartbeat).
- **Linear:** `LINEAR_API_KEY` continua vazia no runtime → [FRAA-18](/FRAA/issues/FRAA-18) mantém-se **`blocked`**; desbloqueio: secret válido ou sync manual em [FRA-15](https://linear.app/fraghub/issue/FRA-15/fraghub-continuation-kickoff-sdd-linear-v03-api-setup); filha [FRAA-19](/FRAA/issues/FRAA-19) (**CEO**, `todo`) para colar *Sumário para tracker* pós-gates até **Tasks**.
- **SDD repo:** `.specs/features/api-setup/tasks.md` — gates inalterados; **Implement** bloqueado.

### 2026-04-12 — CEO heartbeat #6 (Specify: drift de estado)

- Contexto obrigatório recarregado (ordem AGENTS.md): `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md`.
- **code-review-graph** / **Linear** / **Paperclip** (`curl`): indisponíveis (sem MCP; shell rejeitado).
- **Artefacto:** `.specs/features/api-setup/spec.md` — **REQ-001 (3)**, **REQ-010** e **AC-007** alinhados ao estado canónico do instalador e ao fecho previsto em **T-03/I-03** (referência a `validation.md` para drift), sem alterar código de produção.
- **Gates:** tabela de gates em `tasks.md` inalterada; aprovação humana de **Specify** continua necessária se o texto aprovado divergir desta revisão.

### 2026-04-12 — CEO heartbeat #5 (Validate prep)

- Contexto obrigatório recarregado (ordem AGENTS.md): `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md`.
- **code-review-graph** / **Linear** / **Paperclip** (`curl`): indisponíveis (sem MCP; shell rejeitado).
- **Artefacto:** `.specs/features/api-setup/validation.md` — secção *Pré-requisitos (ambiente)* + mapeamento T→AC para quando **Implement** estiver concluído.
- **`api-setup`:** gates e bloqueio de **I-xx** inalterados.

### 2026-04-12 — CEO heartbeat #4 (artefatos SDD + tracker)

- Contexto obrigatório recarregado (ordem AGENTS.md): `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md`.
- **code-review-graph** / **Linear** / **Paperclip** (`curl` inbox): indisponíveis neste runtime (sem MCP; shell rejeitado).
- **Artefactos:** (1) `.specs/planning/PLANNING.md` — linha de totais ajustada para **24** features pendentes (v0.3→v1.0) após conclusão de v0.2; (2) `.specs/features/api-setup/tasks.md` — secção *Sumário para tracker* para colar na issue pai (pós-Tasks, AGENTS.md).
- **`api-setup`:** gates inalterados; **Implement (I-xx)** continua bloqueado até aprovação formal de Tasks.

### 2026-04-12 — CEO heartbeat #3 (alinhamento PLANNING + bloqueio runtime)

- Contexto obrigatório recarregado (ordem AGENTS.md): `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md`.
- **code-review-graph** e **Linear**: continuam indisponíveis neste runtime do agente.
- **Paperclip** `inbox-lite`: nova tentativa com `curl` — **shell rejeitado** de novo; sem inbox/checkout/comentário neste heartbeat.
- **Artefato**: `.specs/planning/PLANNING.md` — tabela *Status geral* atualizada para refletir **v0.2 concluída** e **v0.3** com `api-setup` em SDD (gates pendentes), eliminando deriva face a `ROADMAP.md`.

### 2026-04-12 — CTO heartbeat (reprise, contrato CTO)

- Confirmação de ambiente: execução de **shell rejeitada** também para comando trivial (`true`) — sem leitura fiável de `PAPERCLIP_*` nem chamadas `curl` ao Paperclip neste heartbeat.
- **Paperclip / contrato CTO (pontos 4–7)**: impossível marcar issue `blocked`/`in_progress` ou comentar via API até o operador restabelecer terminal (ou colar `inbox-lite` + id da issue pai).
- **`api-setup`**: gates Specify/Plan/Tasks em `.specs/features/api-setup/tasks.md` continuam *Aguardando confirmação formal* — **nenhuma fatia I-xx** executada (política SDD).
- **Desbloqueio**: operador (shell/rede + MCPs Linear + code-review-graph) + humano (aprovação formal dos gates antes de Implement).

### 2026-04-12 — CEO heartbeat #2 (Paperclip + compliance)

- Revalidação do contrato AGENTS.md: **Linear** e **code-review-graph** continuam **indisponíveis** neste runtime do agente (sem ferramentas MCP correspondentes).
- Tentativa de **Paperclip** `GET .../api/agents/me/inbox-lite` com `PAPERCLIP_*` injetados: **execução de shell rejeitada** pelo ambiente — não foi possível obter inbox, fazer checkout nem comentar issues neste heartbeat.
- Estado de `api-setup` **inalterado**: gates Specify/Plan/Tasks em *Aguardando confirmação formal*; **Implement bloqueado** por política explícita em `tasks.md`.
- **Desbloqueio (operador)**: permitir rede/shell para o processo do agente **ou** colar aqui o output do `inbox-lite` + ID da issue pai `api-setup`; reexpor MCPs Linear + code-review-graph no Cursor; aprovar gates na tabela de `tasks.md` quando estiverem prontos.

### 2026-04-12 — CEO heartbeat (governança SDD + `api-setup`)

- Contexto obrigatório recarregado: `CONSTITUTION.md`, `ROADMAP.md`, `STATE.md`, `PLANNING.md` (ordem AGENTS.md).
- Frente ativa do roadmap: **v0.3** com primeira feature **`api-setup`**; artefatos presentes em `.specs/features/api-setup/` (`spec.md`, `plan.md`, `tasks.md`, `validation.md`) e ADR `docs/adr/0005-api-backend-bootstrap-instalador.md`.
- **Gates SDD** em `tasks.md`: Specify, Plan e Tasks ainda em *Aguardando confirmação formal* — **Implement (I-xx) permanece bloqueado** até aprovação humana explícita (data + iniciais em Linear/Paperclip ou na tabela do `tasks.md`).
- **Bloqueadores de compliance neste runtime (CEO)**: ferramentas MCP **code-review-graph** e **Linear** não estão expostas a este agente; chamada **Paperclip** `inbox-lite` e shell local foram **indisponíveis/rejeitados** na tentativa de heartbeat — rastreabilidade operacional (issues) depende do operador reabrir integrações ou colar contexto da issue pai aqui.
- **Próxima ação concreta (humano ou integração restaurada)**: (1) aprovar formalmente os três primeiros gates de `api-setup` na ordem; (2) após aprovação de Tasks, autorizar execução dos pares T/I e preencher `validation.md` (preferencialmente E2E Ubuntu com Node 20 + MariaDB); (3) manter issue pai em **in_progress** até validação e resumo no pai, sem marcar *done* logo após delegar filhos.

### 2026-04-12 — CTO heartbeat (`api-setup`, SDD)

- Artefatos criados ou refinados em `.specs/features/api-setup/`: `plan.md`, `tasks.md`, `validation.md`; ADR `docs/adr/0005-api-backend-bootstrap-instalador.md`.
- `tasks.md` atualizado com tabela de **Gates SDD** explícitos (Specify/Plan/Tasks/Implement/Validate) para impedir merge de **I-xx** sem aprovação humana.
- Bloqueadores do agente neste runtime: execução de **shell** indisponível (sem ShellCheck/curl local); **Linear** e **code-review-graph** MCP não expostos ao agente — compliance total de AGENTS.md depende do operador reativar integrações.
- Próxima ação humana: aprovar gates na ordem; após **Tasks**, executar pares T/I e preencher `validation.md` (idealmente com E2E Ubuntu).

### 2026-04-09 — Specs completos v0.2→v1.0 (planejamento antecipado)

- Criado `.specs/planning/PLANNING.md` com mapa completo de 28 features (v0.2→v1.0): scope, pipeline SDD, ADRs esperadas, dependências e riscos por feature.
- 6 subagentes executados em paralelo, um por milestone (v0.2 a v1.0).
- 28 arquivos `spec.md` criados em `.specs/features/{slug}/` — todos com requisitos funcionais/NFRs, ACs verificáveis, Out of Scope e riscos.
- ROADMAP.md atualizado com granularidade de features (slug por item, marcação [~] para database-baseline em curso).
- Gate de Specify pendente feature a feature — specs são drafts prontos para revisão humana antes de avançar para Plan.
- Features com maior criticidade identificadas: `auth-api`, `matchmaking-queue`, `fraghub-tags-plugin`, `server-management-ui`.

### 2026-04-09 — Specify iniciado (database-baseline)

- Commit `feat(installer): entrega game-stack-baseline` registrado no `main` (game stack + tasks/validation + planos de teste).
- ROADMAP v0.1 atualizado: itens de plugins base e servicos systemd marcados como entregues via `game-stack-baseline`.
- Draft de especificacao criado em `.specs/features/database-baseline/spec.md` (MariaDB + schema inicial + migracoes).
- Gate pendente: aprovacao humana do Specify para avancar a fase Plan.

### 2026-04-09 — Validate concluido (game-stack-baseline)

- Skill executada: `.cursor/skills/ssh-ubuntu-e2e/scripts/run-e2e-remote.sh --remote-dir /home/ranch/FragHub --game-stack --rerun`.
- E2E remoto em Ubuntu 24.04 executado com evidencias reais de provisionamento LinuxGSM/SteamCMD.
- Falha real encontrada em `game_verify`:
  - `systemctl status` retornava erro para unit `loaded` porém `inactive`, causando falso negativo no AC de servicos.
- Correcao aplicada em `scripts/installer/game-verify.sh`:
  - validacao de unit alterada para `systemctl show --property=LoadState --value` (`loaded`).
- Revalidacao remota concluida:
  - `primeiro run E2E` finalizado com sucesso;
  - `rerun E2E (idempotencia)` finalizado com sucesso.
- `validation.md` atualizado e gate de Validate da feature `game-stack-baseline` fechado como **APROVADO**.

### 2026-04-09 — Validate iniciado (game-stack-baseline)

- Executada bateria de validacao local em simulacao controlada Linux:
  - sintaxe `bash -n` para todos os scripts do installer;
  - caminho feliz por etapas (`game_precheck` -> `game_summary`);
  - operacoes basicas de servico (`systemctl start/stop/status`) em harness de systemd.
- Validacoes negativas executadas com diagnostico acionavel:
  - falha por pre-condicao ausente no `game-precheck`;
  - falha por dependencia ausente no `plugins-cs2`;
  - ambas com causa + referencia de log + comando de recuperacao.
- Relatorio registrado em `.specs/features/game-stack-baseline/validation.md`:
  - AC-001..AC-004 e AC-006 em PASS (simulado);
  - AC-005 em PASS parcial (simulado).
- Gate de Validate permanece pendente de E2E em Ubuntu real para fechamento definitivo.
- Risco tecnico identificado: `fraghub_state_verify_game_services` valida caminho fixo `/etc/systemd/system`, reduzindo flexibilidade para ambiente de teste com `FRAGHUB_SYSTEMD_DIR` custom.

### 2026-04-09 — Implement concluido (game-stack-baseline, pacotes 3-6)

- T-03/T-04 concluidas com planos:
  - `tests/installer/plugins-cs2-plan.md`
  - `tests/installer/plugins-csgo-plan.md`
- I-03/I-04 concluidas com modulos:
  - `scripts/installer/plugins-cs2.sh`
  - `scripts/installer/plugins-csgo.sh`
- T-05 concluida com plano `tests/installer/game-services-plan.md`
- I-05 concluida com modulo `scripts/installer/game-services.sh`
- T-06 concluida com plano `tests/installer/game-e2e-plan.md`
- I-06 concluida com modulos:
  - `scripts/installer/game-verify.sh`
  - `scripts/installer/game-summary.sh`
- Pipeline integrado em `scripts/installer/install.sh` com etapas de game stack:
  - `game_precheck` -> `game_bootstrap` -> `plugins_cs2` -> `plugins_csgo` -> `game_services` -> `game_verify` -> `game_summary`
- Idempotencia expandida em `scripts/installer/state.sh` para etapas da game stack
- `tasks.md` atualizado com T-01..T-06 e I-01..I-06 marcados como concluidos

### 2026-04-09 — Implement avancou (game-stack-baseline, pacote 2)

- T-02 concluida com plano em `tests/installer/game-bootstrap-plan.md`
- I-02 concluida com modulo `scripts/installer/game-bootstrap.sh`
- Integracoes aplicadas:
  - `scripts/installer/install.sh` com etapa `game_bootstrap`
  - gate `FRAGHUB_ENABLE_GAME_STACK` para preservar fluxo legado do `cli-installer`
  - `scripts/installer/state.sh` com verificacao e checkpoint da etapa `game_bootstrap`
- `tasks.md` atualizado com T-02 e I-02 como concluidas

### 2026-04-09 — Implement iniciado (game-stack-baseline, pacote 1)

- T-01 concluida com plano em `tests/installer/game-precheck-plan.md`
- I-01 concluida com modulo `scripts/installer/game-precheck.sh`
- Integracoes aplicadas:
  - `scripts/installer/install.sh` com etapa `game_precheck`
  - `scripts/installer/state.sh` com verificacao e checkpoint da etapa `game_precheck`
- `tasks.md` atualizado com T-01 e I-01 como concluidas

### 2026-04-09 — Tasks criado (game-stack-baseline)

- `tasks.md` TDAD criado em `.specs/features/game-stack-baseline/tasks.md`
- Backlog definido em 6 pares teste+implementacao (T-01..T-06, I-01..I-06)
- Mapeamento Linear definido para issue pai `FRA-13`
- Gate pendente: aprovacao humana do Tasks para avancar a fase Implement

### 2026-04-09 — Plan concluido (game-stack-baseline)

- Linear ajustado: `FRA-5` marcado como Done e `FRA-13` criado para nova feature
- `plan.md` criado em `.specs/features/game-stack-baseline/plan.md`
- ADRs criadas:
  - `docs/adr/0003-game-stack-provisionamento-dual.md`
  - `docs/adr/0004-systemd-operacao-servidores-jogo.md`
- C4 publicados:
  - `docs/architecture/game-stack-baseline-context-l1.md`
  - `docs/architecture/game-stack-baseline-container-l2.md`
- Gate pendente: aprovacao humana do Plan para avancar a `tasks.md`

### 2026-04-09 — Specify iniciado (game-stack-baseline)

- Pre-Specify hook do Linear validado (MCP autenticado)
- Criado draft de especificacao em `.specs/features/game-stack-baseline/spec.md`
- Gate pendente: aprovacao humana do Specify para avancar a fase Plan

### 2026-04-09 — Gate fechado (cli-installer)

- Gate humano de Validate da feature `cli-installer` aprovado
- Feature `cli-installer` encerrada com AC-001..AC-006 em PASS
- Milestone v0.1 atualizada com entregáveis do installer baseline
- Próxima frente sugerida: iniciar escopo de plugins/serviços de jogo (MetaMod, CounterStrikeSharp, MatchZy, SourceMod, Get5)

### 2026-04-09 — Validate da feature CLI Installer

- Executada validacao tecnica dos ACs da feature `cli-installer`
- Relatorio registrado em `.specs/features/cli-installer/validation.md`
- AC-002, AC-003, AC-004 aprovados em validacao local
- AC-005 aprovado de forma parcial (idempotencia por etapa validada; falta E2E Ubuntu)
- AC-006 corrigido e revalidado: mensagens de erro agora incluem caminho de log e acao de recuperacao
- UAT remota em Ubuntu 24.04 executada via SSH; bloqueios encontrados:
  - rerun apos upgrade para 15GB RAM: pre-check de RAM aprovado
  - download LinuxGSM na URL primaria segue retornando HTTP 403 no bootstrap
- Correcao aplicada em `bootstrap.sh`: download LinuxGSM com URL oficial (`https://linuxgsm.sh`) + fallback (`raw.githubusercontent.com`) + retries
- Revalidacao remota concluida:
  - `FIRST_INSTALL_RC=0` (installer completo)
  - `SECOND_INSTALL_RC=0` (rerun idempotente, etapas puladas com verificacao)

### 2026-04-08 — Sessão inicial

- Definido stack completo CS2 + CS:GO
- Sistema de auth (Google/Email + Steam)
- Sistema de níveis 1-10 baseado na Faceit
- Tags in-game: `[N]` para nível, `[ADMIN]` para admins
- Criados specs: CONSTITUTION, PROJECT, STACK, LEVELS, AUTH, ROADMAP, DEPENDENCIES

---

### 2026-04-09 — Implement concluido (lote v0.2: database + plugins estendidos + backup)

- Lote v0.2 implementado no installer em ordem definida:
  1) `database-baseline`
  2) `plugins-extended-cs2` e `plugins-extended-csgo`
  3) `database-backup`
- Novos modulos de instalacao:
  - `scripts/installer/database-baseline.sh`
  - `scripts/installer/plugins-extended-cs2.sh`
  - `scripts/installer/plugins-extended-csgo.sh`
  - `scripts/installer/database-backup.sh`
- Integracao no pipeline principal (`install.sh`) com checkpoints dedicados em `state.sh`.
- `database-baseline`:
  - pre-check de porta/disco/SO;
  - bind local MariaDB em `/etc/mysql/conf.d/fraghub.cnf`;
  - provisionamento de `fraghub_db` + `fraghub_app@127.0.0.1`;
  - `schema_migrations` + migracoes base (`users`, `matches`, `stats`);
  - verificacoes de login e charset/collation.
- `plugins-extended-cs2`:
  - instalacao idempotente de CS2-SimpleAdmin e WeaponPaints com manifests;
  - schemas pluginados registrados em `schema_migrations` com prefixos `plgcs2_*`;
  - configuracao de demos em `/opt/fraghub/demos/cs2/` e manifesto `/opt/fraghub/state/plugins-cs2.json`.
- `plugins-extended-csgo`:
  - instalacao idempotente de SourceBans++, Weapons & Knives e RankMe com manifests;
  - schemas pluginados com prefixos `plgcsgo_*` e configuracao DB com permissao 600;
  - backend de stats do RankMe forçado para MySQL.
- `database-backup`:
  - usuario `fraghub_backup@127.0.0.1` (SELECT, LOCK TABLES);
  - `~/.my.cnf` dedicado (600);
  - script `/opt/fraghub/scripts/db-backup.sh` (700), log e rotacao de 7 dias;
  - cron diario 03:00 idempotente + execucao manual de validacao.
- Artefatos SDD criados para as 4 features v0.2:
  - `plan.md`, `tasks.md`, `validation.md`.

## Próximos passos

1. **v0.4 — Frontend portal:** primeira feature **`frontend-setup`** (Specify → … → Validate) conforme `ROADMAP.md` / `PLANNING.md`.
2. Revisar periodicamente schemas oficiais dos plugins de terceiros e alinhar migracoes locais quando houver mudancas upstream.
3. E2E remoto Ubuntu para validações de installer ou smoke de API quando a feature o exigir.

---

## Preferences

- Para tarefas leves de documentação/estado (como fechar gates e atualizar specs), preferência por modelo mais rápido para reduzir latência/custo.

---

## Contato

- **Autor**: Guilherme Cordeiro
- **GitHub**: @ghcordeiro
