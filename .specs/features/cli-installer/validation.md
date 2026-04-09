# CLI Installer - Validation Report

## Status do gate

- Gate de Validate: **APROVADO** em 2026-04-09.

## Contexto da validacao

- Data: 2026-04-09
- Ambientes de execucao:
  - local: macOS (darwin 25.4.0), com simulacao controlada para cenarios Linux;
  - remoto: Ubuntu 24.04.4 LTS x86_64 (`192.168.1.200`) com execucao real via SSH.
- Escopo: verificar aderencia aos AC-001..AC-006 de `.specs/features/cli-installer/spec.md`.

## Evidencias executadas

- Sintaxe dos scripts: `bash -n scripts/installer/*.sh` (passou).
- Fluxo de wizard e validacoes obrigatorias: execucao automatizada de `scripts/installer/input.sh` com entradas invalidas e validas.
- Mascaramento de segredos: execucao de `scripts/installer/secrets.sh` com segredos conhecidos e verificacao de ausencia no stdout/log.
- Idempotencia basica: verificacao de `scripts/installer/state.sh` para `done -> skip` com consistencia e `done -> pending` com inconsistencia.
- Falha com diagnostico: execucao negativa de `scripts/installer/verify.sh` com marcador de bootstrap ausente.
- Execucao E2E remota (Ubuntu real): `install.sh` completo com input automatizado, seguido de rerun de `install.sh` para validar idempotencia.
- Checagem de conectividade LinuxGSM no host remoto:
  - `https://linuxgsm.sh/linuxgsm.sh` -> HTTP 403
  - `https://raw.githubusercontent.com/GameServerManagers/LinuxGSM/master/linuxgsm.sh` -> HTTP 200

## Resultado por criterio de aceitacao

| AC | Status | Resultado |
| --- | --- | --- |
| AC-001 | PASS | Em Ubuntu 24.04 x86_64 com 15GB RAM, `install.sh` concluiu com sucesso (`FIRST_INSTALL_RC=0`) e resumo final foi gerado sem erro fatal. |
| AC-002 | PASS | Em ambiente nao suportado, `precheck.sh` aborta com erro e sem alterar sistema. |
| AC-003 | PASS | Campos obrigatorios invalidos bloqueiam avancar com mensagens claras. |
| AC-004 | PASS | Segredos nao aparecem em texto puro no output nem no log em cenarios validados. |
| AC-005 | PASS | Rerun em Ubuntu real (`SECOND_INSTALL_RC=0`) pulou todas as etapas ja concluidas com verificacao de consistencia (`precheck/input/secrets/bootstrap/verify/summary=done`). |
| AC-006 | PASS (revalidado) | Falha interrompe, mostra causa, aponta `LOG_FILE` e exibe acao de recuperacao (reexecucao do installer). |

## Riscos residuais

- Dependencia LinuxGSM pode oscilar entre origem primaria e CDN em alguns ambientes; fallback/retry agora mitiga este risco.

## Recomendacoes objetivas

1. Manter monitoramento de conectividade para LinuxGSM e preservar fallback/retry como padrao.
2. Opcional: executar a mesma bateria em Ubuntu 22.04 para cobertura cruzada de LTS.
