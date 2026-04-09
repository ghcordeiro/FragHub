#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
GAME_PRECHECK_MARKER="${FRAGHUB_GAME_PRECHECK_MARKER:-${INPUT_DIR}/game-precheck.done}"
GAME_BOOTSTRAP_MARKER="${FRAGHUB_GAME_BOOTSTRAP_MARKER:-${INPUT_DIR}/game-bootstrap.done}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"

FRAGHUB_CS2_INSTANCE="${FRAGHUB_CS2_INSTANCE:-cs2server}"
FRAGHUB_CSGO_INSTANCE="${FRAGHUB_CSGO_INSTANCE:-csgoserver}"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  exit 1
}

require_game_precheck() {
  [[ -f "$GAME_PRECHECK_MARKER" ]] || fail "Pre-condicao ausente: game_precheck nao concluido (${GAME_PRECHECK_MARKER})."
}

require_linuxgsm_runtime() {
  [[ -x "${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh" ]] || fail "LinuxGSM nao disponivel em ${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh."
}

write_instance_stub() {
  local game_id="$1"
  local instance_name="$2"
  local target_dir="$FRAGHUB_GAME_ROOT/$game_id"

  mkdir -p "$target_dir"
  umask 077
  {
    printf '# FragHub game bootstrap metadata\n'
    printf 'GAME_ID=%s\n' "$game_id"
    printf 'INSTANCE=%s\n' "$instance_name"
    printf 'STAMP=%s\n' "$(date -Iseconds)"
  } >"${target_dir}/instance.env"
  chmod 600 "${target_dir}/instance.env"
}

provision_instance() {
  local game_id="$1"
  local instance_name="$2"

  fraghub_log "INFO" "Provisionando instancia ${instance_name} (${game_id})."
  write_instance_stub "$game_id" "$instance_name"

  if [[ "${FRAGHUB_GAME_BOOTSTRAP_DRY_RUN:-0}" == "1" ]]; then
    fraghub_log "INFO" "DRY-RUN ativo: provisionamento LinuxGSM para ${instance_name} nao executado."
    return 0
  fi

  (
    cd "$FRAGHUB_LINUXGSM_DIR"
    ./linuxgsm.sh "$instance_name"
    "./${instance_name}" auto-install
  )

  [[ -x "${FRAGHUB_LINUXGSM_DIR}/${instance_name}" ]] || fail "Instancia ${instance_name} nao ficou disponivel apos bootstrap."
  fraghub_log "INFO" "Instancia ${instance_name} provisionada com sucesso."
}

run_game_bootstrap() {
  fraghub_log "INFO" "Iniciando game_bootstrap (GSTACK-REQ-002)."
  require_game_precheck
  require_linuxgsm_runtime

  mkdir -p "$INPUT_DIR"
  mkdir -p "$FRAGHUB_GAME_ROOT"

  # Ordem deterministica para reduzir variancia operacional.
  provision_instance "cs2" "$FRAGHUB_CS2_INSTANCE"
  provision_instance "csgo" "$FRAGHUB_CSGO_INSTANCE"

  umask 077
  date -Iseconds >"$GAME_BOOTSTRAP_MARKER"
  chmod 600 "$GAME_BOOTSTRAP_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "game_bootstrap concluido. Marcador: ${GAME_BOOTSTRAP_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_game_bootstrap
fi
