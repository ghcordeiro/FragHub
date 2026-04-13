#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
BOOTSTRAP_MARKER="${FRAGHUB_BOOTSTRAP_MARKER:-${INPUT_DIR}/bootstrap.done}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
LINUXGSM_URL_PRIMARY="${LINUXGSM_URL_PRIMARY:-https://linuxgsm.sh}"
LINUXGSM_URL_FALLBACK="${LINUXGSM_URL_FALLBACK:-https://raw.githubusercontent.com/GameServerManagers/LinuxGSM/master/linuxgsm.sh}"

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/install.sh"
  exit 1
}

require_linux_ubuntu() {
  [[ "$(uname -s)" == "Linux" ]] || fail "Bootstrap suportado apenas em Linux (Ubuntu LTS)."
  [[ -f /etc/os-release ]] || fail "Ficheiro /etc/os-release nao encontrado."
  # shellcheck disable=SC1091
  . /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] || fail "Distribuicao nao suportada para bootstrap: ${ID:-desconhecido}"
}

load_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo nao encontrado: ${EFFECTIVE_FILE}. Execute secrets.sh antes."
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
}

download_linuxgsm() {
  local dest="$1"
  local url
  local urls=("$LINUXGSM_URL_PRIMARY" "$LINUXGSM_URL_FALLBACK")

  for url in "${urls[@]}"; do
    fraghub_log "INFO" "Tentando download do LinuxGSM em: ${url}"
    if curl -fsSL --retry 3 --retry-delay 2 --retry-connrefused -o "$dest" "$url"; then
      return 0
    fi
    fraghub_log "WARN" "Falha no download do LinuxGSM em: ${url}"
  done

  fail "Nao foi possivel baixar LinuxGSM (URL primaria e fallback falharam)."
}

run_bootstrap() {
  require_linux_ubuntu
  load_effective_env

  if [[ "${FRAGHUB_BOOTSTRAP_DRY_RUN:-0}" == "1" ]]; then
    fraghub_log "INFO" "FRAGHUB_BOOTSTRAP_DRY_RUN=1 — nenhuma alteracao ao sistema (apenas validacao)."
    return 0
  fi

  command -v sudo >/dev/null 2>&1 || fail "sudo necessario para bootstrap."
  fraghub_sudo_noninteractive_ok || fail "sudo sem password nao disponivel. Execute sudo -v ou defina FRAGHUB_SUDO_PASSWORD (ambientes controlados)."

  fraghub_log "INFO" "Inicio do bootstrap de dependencias base (CLI-REQ-004)."

  export DEBIAN_FRONTEND=noninteractive

  sudo mkdir -p /etc/apt/keyrings

  sudo dpkg --add-architecture i386 2>/dev/null || true

  fraghub_log "INFO" "apt-get update"
  sudo apt-get update -qq

  fraghub_log "INFO" "Instalacao de pacotes base (nginx, mariadb, ufw, ferramentas)."
  sudo apt-get install -y \
    curl \
    wget \
    ca-certificates \
    gnupg \
    ufw \
    nginx \
    mariadb-server

  fraghub_log "INFO" "Instalacao de bibliotecas 32-bit (SteamCMD / LinuxGSM) — best-effort."
  sudo apt-get install -y lib32gcc-s1 lib32stdc++6 lib32z1 2>/dev/null || \
    fraghub_log "WARN" "Pacotes lib32 opcionais nao instalados (continuar)."

  if [[ ! -f /etc/apt/sources.list.d/nodesource.list ]]; then
    fraghub_log "INFO" "Configuracao do repositorio Node.js 20 LTS (NodeSource)."
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
    sudo apt-get update -qq
  fi

  fraghub_log "INFO" "Instalacao do Node.js (nodejs)."
  sudo apt-get install -y nodejs

  if ! id fraghub >/dev/null 2>&1; then
    fraghub_log "INFO" "Criacao do utilizador de sistema fraghub."
    sudo useradd -r -m -d /home/fraghub -s /usr/sbin/nologin fraghub
  fi

  fraghub_log "INFO" "Download do LinuxGSM para ${FRAGHUB_LINUXGSM_DIR}."
  mkdir -p "$FRAGHUB_LINUXGSM_DIR"
  download_linuxgsm "${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh"
  chmod +x "${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh"

  fraghub_log "INFO" "Configuracao minima UFW (CLI-REQ-005) — SSH/HTTP/HTTPS e portas de jogo."
  sudo ufw allow OpenSSH 2>/dev/null || sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow 27015/tcp
  sudo ufw allow 27015/udp
  sudo ufw allow 27005/udp
  sudo ufw allow 27020/udp 2>/dev/null || true
  sudo ufw --force enable

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$BOOTSTRAP_MARKER"
  chmod 600 "$BOOTSTRAP_MARKER" 2>/dev/null || true

  fraghub_log "INFO" "Bootstrap concluido. Marcador: ${BOOTSTRAP_MARKER}"

  echo ""
  echo "==> Bootstrap: pacotes base, Node 20, LinuxGSM (script), UFW e utilizador fraghub aplicados."
  echo "    LinuxGSM: ${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_bootstrap
fi
