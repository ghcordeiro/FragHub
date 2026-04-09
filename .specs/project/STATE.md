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

## Próximos passos

1. **Feature `database-baseline`**: revisar e aprovar `.specs/features/database-baseline/spec.md`; em seguida Plan (ADR + C4) e Tasks conforme SDD.
2. **Hardening de idempotencia**: alinhar `fraghub_state_verify_game_services` ao `FRAGHUB_SYSTEMD_DIR` para suportar validacao controlada sem falso negativo.
3. **Cobertura cruzada opcional**: repetir E2E completo em Ubuntu 22.04 LTS para ampliar confianca.
4. **Linear sync**: tentar novamente hook pos-Tasks quando MCP Linear estiver disponivel.

---

## Preferences

- Para tarefas leves de documentação/estado (como fechar gates e atualizar specs), preferência por modelo mais rápido para reduzir latência/custo.

---

## Contato

- **Autor**: Guilherme Cordeiro
- **GitHub**: @ghcordeiro
