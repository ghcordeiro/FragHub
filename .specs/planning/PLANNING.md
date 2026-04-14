# FragHub — Plano de Features v0.2 → v1.0

> Documento temporário de planejamento. Criado em: 2026-04-09.
> Serve como mapa de trabalho até a v1.0. Não é spec — é a lista de features com scope e dependências.
> Cada feature ganha seu próprio `.specs/features/{slug}/spec.md` via fase Specify do SDD.

---

## Status geral

| Milestone | Features | Estado |
|-----------|----------|--------|
| v0.1 | cli-installer, game-stack-baseline | ✅ Concluída |
| v0.2 | database-baseline, plugins-extended-cs2, plugins-extended-csgo, database-backup | ✅ Concluída (alinhado a `ROADMAP.md` / `STATE.md`) |
| v0.3 | api-setup, auth-api, steam-integration, players-api, matches-api | ✅ `api-setup`, `auth-api`, `steam-integration`, `players-api` (Validate **2026-04-13**); `matches-api` — Implement **2026-04-13**, Validate pendente |
| v0.4 | frontend-setup, nginx-ssl, auth-ui, player-profile-ui, leaderboard-ui | ⬜ Pendente |
| v0.5 | elo-system, matchmaking-queue, match-notifications, fraghub-tags-plugin | ⬜ Pendente |
| v0.6 | admin-dashboard, server-management-ui, admin-logs, plugin-config-ui | ⬜ Pendente |
| v1.0 | upgrade-command, ci-cd, tests-suite, security-audit, docs-release, landing-page | ⬜ Pendente |

**Total features pendentes (v0.3→v1.0):** 20 — *`api-setup`, `auth-api`, `steam-integration` e `players-api` concluídas (Validate **2026-04-13**); v0.2 (4) concluída; v0.1 (2) já entregue antes deste mapa.*

---

## v0.2 — Banco de dados e plugins

> Critério de conclusão: stats salvando no banco, bans sincronizados

### database-baseline
- **Scope:** Large
- **Pipeline SDD:** Specify (draft ✅) → Plan → Tasks → Implement
- **ADRs esperadas:** estratégia de migração versionada; permissões mínimas do user de app; bind-address
- **Depends on:** cli-installer, game-stack-baseline
- **Riscos:** variação de pacote MariaDB 22.04 vs 24.04; estado parcial pós-migração

### plugins-extended-cs2
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks (implícito) → Implement
- **Plugins:** CS2-SimpleAdmin, WeaponPaints, demo-recorder automático
- **ADRs esperadas:** —
- **Depends on:** game-stack-baseline, database-baseline (SimpleAdmin usa MySQL)
- **Riscos:** versões de plugins dependem de CounterStrikeSharp; canal de download instável

### plugins-extended-csgo
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks (implícito) → Implement
- **Plugins:** SourceBans++, Weapons & Knives, RankMe
- **ADRs esperadas:** —
- **Depends on:** game-stack-baseline, database-baseline (SourceBans usa MySQL)
- **Riscos:** SourceBans++ requer web panel separado; RankMe precisa de schema próprio

### database-backup
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **ADRs esperadas:** estratégia de backup (cron + rotação local vs remote)
- **Depends on:** database-baseline
- **Riscos:** —

---

## v0.3 — API backend

> Critério de conclusão: login funcionando, API respondendo

### api-setup
- **Status:** ✅ Concluída (gate Validate / CTO **2026-04-13**; ver `.specs/features/api-setup/validation.md`)
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **Stack:** Node.js 20 LTS + Express + TypeScript (strict) + ESLint + Prettier
- **ADRs esperadas:** estrutura de pastas; ORM vs query builder (ex: Knex)
- **Depends on:** database-baseline
- **Riscos:** —

### auth-api
- **Status:** ✅ Concluída (gate Validate **2026-04-13**; ver `.specs/features/auth-api/validation.md`)
- **Scope:** Complex
- **Pipeline SDD:** Specify → Plan → Tasks → Implement
- **ADRs esperadas:** Google OAuth flow (passport vs manual); JWT access+refresh rotation; armazenamento de sessions; rate limiting
- **Depends on:** api-setup
- **Riscos:** refresh token rotation segura; CSRF em OAuth; revogação de tokens

### steam-integration
- **Status:** ✅ Concluída (gate Validate **2026-04-13**; ver `.specs/features/steam-integration/validation.md`)
- **Scope:** Medium
- **Pipeline SDD:** Specify → Plan → Tasks → Implement *(Plan/Tasks formalizados **2026-04-13**)*
- **ADRs esperadas:** Steam OpenID vs Web API para vinculação; obrigatoriedade por feature (apenas queue)
- **Depends on:** auth-api
- **Riscos:** dependência externa Steam; usuário já autenticado vinculando Steam

### players-api
- **Status:** ✅ Concluída (gate Validate **2026-04-13**; ver `.specs/features/players-api/validation.md`)
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks → Implement
- **Endpoints:** CRUD usuários, perfil público, `/api/player/{steamid}` (para plugins)
- **ADRs esperadas:** —
- **Depends on:** auth-api, database-baseline
- **Riscos:** —

### matches-api
- **Status:** Implement concluído no repo (**2026-04-13**); gate **Validate** pendente (ver `validation.md`)
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks → Implement
- **Endpoints:** criar/listar/detalhar partidas, stats por jogador/partida
- **ADRs esperadas:** schema de stats (normalizado vs desnormalizado); ingestão de resultados (webhook MatchZy/Get5)
- **Depends on:** players-api
- **Riscos:** formato de resultado do MatchZy vs Get5 podem divergir

---

## v0.4 — Frontend portal

> Critério de conclusão: usuário consegue logar e ver próprio perfil

### frontend-setup
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **Stack:** React 18+ + TypeScript (strict) + Vite + ESLint + Prettier
- **ADRs esperadas:** roteamento (React Router v6); estado global (Zustand vs Context); HTTP client (axios vs fetch)
- **Depends on:** api-setup
- **Riscos:** —

### nginx-ssl
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **ADRs esperadas:** integração certbot no installer; reverse proxy configuração (API + frontend)
- **Depends on:** api-setup, frontend-setup
- **Riscos:** certbot requer domínio válido; fallback para HTTP em ambiente local

### auth-ui
- **Scope:** Large
- **Pipeline SDD:** Specify → Plan → Tasks → Implement
- **Páginas:** Login, Registro, Vinculação Steam
- **ADRs esperadas:** gestão de sessão no cliente; fluxo de redirect OAuth; feedback de erro multi-provider
- **Ativações toolkit:** frontend-component-architect (Plan); accessibility + seo (Implement)
- **Depends on:** frontend-setup, auth-api
- **Riscos:** UX de vinculação Steam pós-login; consistência de estado entre abas

### player-profile-ui
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks → Implement
- **Páginas:** Perfil, stats, histórico de partidas, badge de nível
- **Ativações toolkit:** accessibility (Implement)
- **Depends on:** auth-ui, matches-api
- **Riscos:** —

### leaderboard-ui
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **Páginas:** Ranking por ELO com paginação
- **Ativações toolkit:** seo (página pública); accessibility (Implement)
- **Depends on:** players-api
- **Riscos:** —

---

## v0.5 — Sistema de matchmaking

> Critério de conclusão: queue funcionando, times balanceados, tags in-game

### elo-system
- **Scope:** Large
- **Pipeline SDD:** Specify → Plan → Tasks → Implement
- **ADRs esperadas:** Glicko-2 simplificado vs ELO puro; faixas de nível (1-10 baseadas no Faceit); ELO inicial 1000 = Nível 4; decay v2.0
- **Depends on:** players-api, matches-api
- **Riscos:** divergência de expectativa de jogadores vs algoritmo

### matchmaking-queue
- **Scope:** Complex
- **Pipeline SDD:** Specify → Plan → Tasks → Implement
- **ADRs esperadas:** fila em memória vs Redis; state machine de partida; balanceamento por ELO; map veto; timeout; concorrência
- **Depends on:** elo-system
- **Riscos:** fila concorrente; desistências durante veto; estado inconsistente se servidor cair

### match-notifications
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks → Implement
- **ADRs esperadas:** notificação browser (polling vs SSE); Discord webhook
- **Depends on:** matchmaking-queue
- **Riscos:** —

### fraghub-tags-plugin
- **Scope:** Large
- **Pipeline SDD:** Specify → Plan → Tasks → Implement
- **Runtimes:** CounterStrikeSharp (.NET 8) para CS2 + SourcePawn (SourceMod) para CS:GO
- **ADRs esperadas:** cache TTL de tags; fallback sem API; endpoint dedicado para plugins
- **Depends on:** players-api, game-stack-baseline
- **Riscos:** dois runtimes de linguagem (C# + SourcePawn); latência de chamada HTTP in-game; CS2 plugin requer assembly .NET

---

## v0.6 — Painel admin

> Critério de conclusão: admin consegue gerenciar tudo pela web

### admin-dashboard
- **Scope:** Large
- **Pipeline SDD:** Specify → Plan → Tasks → Implement
- **ADRs esperadas:** RBAC (roles no JWT vs middleware de rota); auditoria de ações admin
- **Ativações toolkit:** frontend-component-architect; accessibility
- **Depends on:** auth-api, auth-ui
- **Riscos:** escalada de privilégios; CRUD ban/unban com impacto em SourceBans++

### server-management-ui
- **Scope:** Large
- **Pipeline SDD:** Specify → Plan → Tasks → Implement
- **ADRs esperadas:** RCON via web (WebSocket vs polling); isolamento de RCON na API; permissões de escrita de cfg
- **Ativações toolkit:** best-practices (segurança RCON exposta)
- **Depends on:** game-stack-baseline, admin-dashboard
- **Riscos:** exposição de RCON via browser = maior risco de segurança do projeto; escrita de arquivo cfg via SSH

### admin-logs
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks → Implement
- **ADRs esperadas:** estrutura da tabela de audit log; retenção e purge
- **Depends on:** admin-dashboard
- **Riscos:** —

### plugin-config-ui
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks → Implement
- **ADRs esperadas:** configuração via UI (escrita em cfg por RCON ou SSH direto)
- **Depends on:** server-management-ui
- **Riscos:** —

---

## v1.0 — Produção

> Critério de conclusão: projeto pronto para uso público

### upgrade-command
- **Scope:** Medium
- **Pipeline SDD:** Specify → Tasks → Implement
- **ADRs esperadas:** estratégia de upgrade seguro (backup antes, rollback em falha, versioning de installer)
- **Depends on:** todas as features de installer (v0.1 + v0.2)
- **Riscos:** upgrade de MariaDB com migração; reinício de serviços em produção

### ci-cd
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **ADRs esperadas:** GitHub Actions: lint + ShellCheck + test por push; release tag automático
- **Depends on:** todo o codebase
- **Riscos:** —

### tests-suite
- **Scope:** Large
- **Pipeline SDD:** Specify → Plan → Tasks → Implement
- **ADRs esperadas:** estratégia unit + e2e; cobertura mínima por camada; fixtures de banco; mocking de RCON
- **Depends on:** todas as features
- **Riscos:** cobertura retroativa custosa; ideal iniciar paralelamente ao Implement das features de v0.3+

### security-audit
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **ADRs esperadas:** checklist OWASP para API REST; JWT; cookies; RCON; permissões de arquivo
- **Depends on:** auth-api, admin-dashboard, server-management-ui
- **Riscos:** —

### docs-release
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **Entregáveis:** README, CONTRIBUTING, LICENSE (GPL-3.0), guia de instalação completo, CHANGELOG
- **Depends on:** todas as features
- **Riscos:** —

### landing-page
- **Scope:** Medium
- **Pipeline SDD:** Specify → Implement
- **Ativações toolkit:** seo; accessibility
- **Depends on:** frontend-setup
- **Riscos:** —

---

## Gates críticos (bloqueadores de cadeia)

| Gate | Motivo |
|------|--------|
| `database-baseline` aprovado | Sem banco, v0.3 e v0.2 restante não começam |
| `auth-api` aprovado | Sem auth, v0.4 e v0.5 não decolam |
| `matchmaking-queue` aprovado | Feature mais complexa; bloqueia v0.5 completa |
| `fraghub-tags-plugin` aprovado | Único ponto de integração backend ↔ jogo em runtime |
| `server-management-ui` aprovado | Maior risco de segurança — requer ADR de isolamento de RCON |

---

## Legenda de scope

| Scope | Critério | Pipeline |
|-------|----------|---------|
| Medium | feature clara, <10 tasks | Specify → (Tasks implícito) → Implement |
| Large | multi-componente | Specify → Plan + ADR + C4 → Tasks → Implement |
| Complex | ambiguidade ou domínio novo | idem Large + discuss gray areas + UAT interativa |
