# Plano de validação — pre-checks (`precheck.sh`) (T-01)

## Escopo

Casos de teste manuais/automatizáveis para `scripts/installer/precheck.sh`, alinhados a **CLI-REQ-001**.

## Casos positivos (Ubuntu alvo)

| Check | Pré-condição | Esperado |
| --- | --- | --- |
| SO | Ubuntu 22.04 ou 24.04 LTS, `/etc/os-release` presente | `INFO` com versão e continuação |
| Arquitetura | `uname -m` = `x86_64` | Mensagem de arquitetura válida |
| Sudo | `sudo -v` recente ou `sudo -n true` | Sudo validado |
| Disco | `df` com espaço livre ≥ `MIN_DISK_GB` (default 100) | Disco OK |
| RAM | `/proc/meminfo` com total ≥ `MIN_RAM_GB` (default 8) | RAM OK |
| Rede | `curl` ou `wget` a endpoints configurados | Conectividade validada |

## Casos negativos

| Check | Simulação | Esperado |
| --- | --- | --- |
| Root | `sudo ./precheck.sh` ou como UID 0 | Falha: não executar como root |
| SO | macOS, WSL não-Ubuntu, etc. | Falha antes de alterar sistema (se kernel ≠ Linux, aborta cedo) |
| Ubuntu | Debian ou Ubuntu não-LTS | Falha: versão não suportada |
| Arquitetura | `aarch64` | Falha: arquitetura não suportada |
| Sudo | Sem cache sudo (`sudo -k`) e sem TTY | Falha: permissão sudo |
| Disco | `MIN_DISK_GB=9999` | Falha: disco insuficiente |
| RAM | `MIN_RAM_GB=999` | Falha: RAM insuficiente |
| Rede | Firewall bloqueando HTTPS | Falha: conectividade com endpoint indicado |

## Critérios de falha

- Qualquer check crítico falha → exit code **≠ 0**.
- Mensagem `ERROR` no log + `tee` em `LOG_FILE` (default `/tmp/fraghub-installer.log`).

## Critérios de conclusão do T-01

- [x] Casos positivos e negativos documentados
- [x] Critérios de falha claros por check
