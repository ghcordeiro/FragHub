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
GAME_PRECHECK_MARKER="${FRAGHUB_GAME_PRECHECK_MARKER:-${INPUT_DIR}/game-precheck.done}"

GAME_NETWORK_ENDPOINTS=(
  "https://github.com"
  "https://steamcdn-a.akamaihd.net"
)

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/install.sh"
  exit 1
}

check_cli_installer_prereqs() {
  [[ -f "$BOOTSTRAP_MARKER" ]] || fail "Pre-condicao ausente: bootstrap do cli-installer nao concluido (${BOOTSTRAP_MARKER})."
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Pre-condicao ausente: configuracao efetiva nao encontrada (${EFFECTIVE_FILE})."
  fraghub_log "INFO" "Pre-condicoes do cli-installer validadas."
}

check_linuxgsm_runtime() {
  [[ -d "$FRAGHUB_LINUXGSM_DIR" ]] || fail "Diretorio LinuxGSM nao encontrado: ${FRAGHUB_LINUXGSM_DIR}."
  [[ -x "${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh" ]] || fail "Runtime LinuxGSM invalido: ${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh nao executavel."
  fraghub_log "INFO" "Runtime LinuxGSM validado."
}

check_game_directories() {
  local root_dir
  root_dir="$(dirname "$FRAGHUB_LINUXGSM_DIR")"
  [[ -d "$root_dir" ]] || fail "Estrutura esperada ausente para stack de jogo: ${root_dir}."
  fraghub_log "INFO" "Estrutura de diretorios minima validada (${root_dir})."
}

check_game_network() {
  local endpoint
  if command -v curl >/dev/null 2>&1; then
    for endpoint in "${GAME_NETWORK_ENDPOINTS[@]}"; do
      if ! curl -fsSIL --max-time 8 "$endpoint" >/dev/null; then
        fail "Falha de conectividade para distribuicao de artefatos: ${endpoint}"
      fi
    done
  elif command -v wget >/dev/null 2>&1; then
    for endpoint in "${GAME_NETWORK_ENDPOINTS[@]}"; do
      if ! wget --spider --timeout=8 "$endpoint" >/dev/null 2>&1; then
        fail "Falha de conectividade para distribuicao de artefatos: ${endpoint}"
      fi
    done
  else
    fail "Nem curl nem wget disponiveis para validar conectividade da stack de jogo."
  fi
  fraghub_log "INFO" "Conectividade para stack de jogo validada."
}

run_game_precheck() {
  fraghub_log "INFO" "Iniciando game_precheck (GSTACK-REQ-001)."
  check_cli_installer_prereqs
  check_linuxgsm_runtime
  check_game_directories
  check_game_network

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$GAME_PRECHECK_MARKER"
  chmod 600 "$GAME_PRECHECK_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "game_precheck concluido. Marcador: ${GAME_PRECHECK_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_game_precheck
fi
