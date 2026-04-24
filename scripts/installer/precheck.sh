#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

MIN_DISK_GB="${MIN_DISK_GB:-100}"
MIN_RAM_GB="${MIN_RAM_GB:-8}"
LOG_FILE="${LOG_FILE:-/tmp/fraghub-installer.log}"

SUPPORTED_UBUNTU=("22.04" "24.04")
NETWORK_ENDPOINTS=(
  "https://archive.ubuntu.com"
  "https://github.com"
  "https://steamcdn-a.akamaihd.net"
)

log() {
  local level="$1"
  local message="$2"
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  printf '[%s] [%s] %s\n' "$ts" "$level" "$message" | tee -a "$LOG_FILE"
}

fail() {
  local message="$1"
  log "ERROR" "$message"
  {
    printf '\n'
    printf 'Recuperacao sugerida:\n'
    printf '  1) Verifique o log detalhado: %s\n' "$LOG_FILE"
    printf '  2) Corrija a causa raiz indicada acima.\n'
    printf '  3) Reexecute o installer: bash scripts/installer/install.sh\n'
  } >&2
  exit 1
}

check_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Comando obrigatorio ausente: $cmd"
}

check_not_root() {
  if [ "${EUID}" -eq 0 ]; then
    fail "Nao execute o installer como root. Use um usuario normal com permissao sudo."
  fi
}

check_os() {
  local kernel os_id version_id version_ok="false"

  kernel="$(uname -s)"
  if [ "$kernel" != "Linux" ]; then
    fail "Sistema operacional nao suportado: $kernel. Suportado: Ubuntu Linux 22.04/24.04."
  fi

  [ -f /etc/os-release ] || fail "Arquivo /etc/os-release nao encontrado."
  # shellcheck disable=SC1091
  . /etc/os-release

  os_id="${ID:-}"
  version_id="${VERSION_ID:-}"

  if [ "$os_id" != "ubuntu" ]; then
    fail "Sistema operacional nao suportado: ${os_id:-desconhecido}. Suportado: Ubuntu."
  fi

  for version in "${SUPPORTED_UBUNTU[@]}"; do
    if [ "$version_id" = "$version" ]; then
      version_ok="true"
      break
    fi
  done

  [ "$version_ok" = "true" ] || fail "Versao Ubuntu nao suportada: $version_id. Use 22.04 ou 24.04."
  log "INFO" "SO valido: Ubuntu $version_id"
}

check_architecture() {
  local arch
  arch="$(uname -m)"
  [ "$arch" = "x86_64" ] || fail "Arquitetura nao suportada: $arch. Use x86_64."
  log "INFO" "Arquitetura valida: $arch"
}

check_sudo_access() {
  check_command sudo
  if [[ -n "${FRAGHUB_SUDO_PASSWORD:-}" ]]; then
    if ! echo "${FRAGHUB_SUDO_PASSWORD}" | sudo -S -p '' true 2>/dev/null; then
      fail "sudo com FRAGHUB_SUDO_PASSWORD falhou."
    fi
  elif ! sudo -v; then
    fail "sudo nao disponivel ou autenticacao falhou. Confirme que o seu utilizador pode usar sudo."
  fi
  log "INFO" "Sudo validado."
}

check_disk() {
  local available_kb available_gb
  available_kb="$(df -Pk / | awk 'NR==2 {print $4}')"
  available_gb=$((available_kb / 1024 / 1024))

  if [ "$available_gb" -lt "$MIN_DISK_GB" ]; then
    fail "Disco insuficiente: ${available_gb}GB disponiveis. Minimo recomendado: ${MIN_DISK_GB}GB."
  fi
  log "INFO" "Disco OK: ${available_gb}GB disponiveis."
}

check_ram() {
  local mem_kb mem_gb
  mem_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
  mem_gb=$((mem_kb / 1024 / 1024))

  if [ "$mem_gb" -lt "$MIN_RAM_GB" ]; then
    fail "RAM insuficiente: ${mem_gb}GB detectados. Minimo recomendado: ${MIN_RAM_GB}GB."
  fi
  log "INFO" "RAM OK: ${mem_gb}GB detectados."
}

check_network() {
  local endpoint

  if command -v curl >/dev/null 2>&1; then
    for endpoint in "${NETWORK_ENDPOINTS[@]}"; do
      if ! curl -fsSIL --max-time 8 "$endpoint" >/dev/null; then
        fail "Falha de conectividade com: $endpoint"
      fi
    done
  elif command -v wget >/dev/null 2>&1; then
    for endpoint in "${NETWORK_ENDPOINTS[@]}"; do
      if ! wget --spider --timeout=8 "$endpoint" >/dev/null 2>&1; then
        fail "Falha de conectividade com: $endpoint"
      fi
    done
  else
    fail "Nem curl nem wget estao disponiveis para validar conectividade."
  fi

  log "INFO" "Conectividade externa validada."
}

run_prechecks() {
  : >"$LOG_FILE"
  log "INFO" "Iniciando pre-checks do FragHub Installer."
  check_not_root
  check_os
  check_architecture
  check_sudo_access
  check_disk
  check_ram
  check_network
  log "INFO" "Pre-checks concluidos com sucesso."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_prechecks
fi
