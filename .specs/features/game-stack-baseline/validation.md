# Game Stack Baseline - Validation Report

## Status do gate

- Gate de Validate: **APROVADO** em 2026-04-09.
- Fechamento baseado em validacao local (simulada) + E2E remoto em Ubuntu real com rerun idempotente.

## Contexto da validacao

- Data: 2026-04-09
- Ambiente de execucao:
  - local: macOS (darwin 25.4.0), com simulacao controlada de runtime Linux (`uname/sudo/systemctl/curl` stubs) para exercitar o fluxo de game stack.
  - remoto: Ubuntu 24.04 x86_64 (`ranch@192.168.1.200`) com execucao real via SSH.
- Escopo: verificar aderencia aos AC-001..AC-006 de `.specs/features/game-stack-baseline/spec.md`.

## Evidencias executadas

- Sintaxe dos scripts: `bash -n scripts/installer/*.sh` (passou).
- Caminho feliz por etapas:
  - `game-precheck.sh`
  - `game-bootstrap.sh`
  - `plugins-cs2.sh`
  - `plugins-csgo.sh`
  - `game-services.sh`
  - `game-verify.sh`
  - `game-summary.sh`
- Operacoes basicas de servico (simulado): `systemctl start|stop|status fraghub-cs2.service` e `fraghub-csgo.service` (passou).
- E2E remoto Ubuntu real:
  - comando: `bash .cursor/skills/ssh-ubuntu-e2e/scripts/run-e2e-remote.sh --remote-dir /home/ranch/FragHub --game-stack --rerun`.
  - primeiro run real executou precheck, bootstrap de jogo (LinuxGSM/SteamCMD), plugins, services e summary.
  - rerun executado com sucesso e etapas concluídas foram puladas por consistencia (`done -> skip`).
- Falha real detectada e corrigida durante validate:
  - `game_verify` falhava ao validar units via `systemctl status` quando service estava `loaded` porém `inactive`.
  - correcao aplicada em `scripts/installer/game-verify.sh`: validacao por `LoadState=loaded`.
  - revalidacao remota apos correcao: `primeiro run E2E` e `rerun E2E` concluídos com sucesso.
- Verificacao de diagnostico acionavel (falha simulada):
  - ausencia de `bootstrap.done` no `game-precheck`;
  - ausencia de `game-bootstrap.done` no `plugins-cs2`;
  - ambos retornaram erro com causa + orientacao de recuperacao no stderr e referencia ao `LOG_FILE`.
- Idempotencia (state store):
  - `done -> skip` validado para `game_precheck`, `game_bootstrap`, `plugins_cs2`, `plugins_csgo`, `game_verify`, `game_summary`.
  - observacao: `game_services` ficou inconsistente em ambiente com `FRAGHUB_SYSTEMD_DIR` custom por verificacao fixa em `/etc/systemd/system`.

## Resultado por criterio de aceitacao

| AC | Status | Resultado |
| --- | --- | --- |
| AC-001 | PASS | Em Ubuntu 24.04 real, o fluxo provisionou CS2 e CS:GO com sucesso e concluiu pipeline do installer. |
| AC-002 | PASS | Falhas de pre-condicao continuam bloqueando execucao antes de alterar estado (evidencia local/simulada + validacao de fluxo real). |
| AC-003 | PASS | Plugins base CS2/CS:GO detectados e refletidos no `game_summary` remoto (`MetaMod`, `CounterStrikeSharp`, `MatchZy`, `SourceMod`, `Get5`). |
| AC-004 | PASS | Units `fraghub-cs2.service` e `fraghub-csgo.service` criadas no host real; validacao ajustada para detectar unit carregada independentemente de active state. |
| AC-005 | PASS | Rerun remoto com `--rerun` pulou etapas ja concluídas sem duplicidade indevida. |
| AC-006 | PASS | Falha real observada em `game_verify` exibiu causa + log + comando de recuperacao; apos correcao, fluxo recuperou e concluiu com sucesso. |

## Riscos residuais

- `fraghub_state_verify_game_services` valida units em caminho fixo (`/etc/systemd/system`), reduzindo flexibilidade em ambiente com `FRAGHUB_SYSTEMD_DIR` custom.

## Recomendacoes objetivas

1. Tornar `fraghub_state_verify_game_services` aderente a `FRAGHUB_SYSTEMD_DIR` para evitar falso negativo em ambientes controlados de validacao.
2. Opcional: repetir a bateria completa em Ubuntu 22.04 para cobertura cruzada de LTS.
