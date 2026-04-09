#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
GAME_BOOTSTRAP_MARKER="${FRAGHUB_GAME_BOOTSTRAP_MARKER:-${INPUT_DIR}/game-bootstrap.done}"
PLUGINS_CS2_MARKER="${FRAGHUB_PLUGINS_CS2_MARKER:-${INPUT_DIR}/plugins-cs2.done}"
FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"

CS2_PLUGIN_ROOT="${FRAGHUB_GAME_ROOT}/cs2/plugins"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  exit 1
}

require_bootstrap() {
  [[ -f "$GAME_BOOTSTRAP_MARKER" ]] || fail "Dependencia ausente: game_bootstrap nao concluido (${GAME_BOOTSTRAP_MARKER})."
}

install_plugin_marker() {
  local plugin_name="$1"
  local plugin_dir="${CS2_PLUGIN_ROOT}/${plugin_name}"
  mkdir -p "$plugin_dir"
  umask 077
  {
    printf 'PLUGIN=%s\n' "$plugin_name"
    printf 'GAME=cs2\n'
    printf 'STAMP=%s\n' "$(date -Iseconds)"
  } >"${plugin_dir}/.installed"
  chmod 600 "${plugin_dir}/.installed"
}

run_plugins_cs2() {
  fraghub_log "INFO" "Iniciando plugin_install_cs2 (GSTACK-REQ-003)."
  require_bootstrap

  mkdir -p "$CS2_PLUGIN_ROOT"
  install_plugin_marker "metamod"
  install_plugin_marker "counterstrikesharp"
  install_plugin_marker "matchzy"

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$PLUGINS_CS2_MARKER"
  chmod 600 "$PLUGINS_CS2_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "plugin_install_cs2 concluido. Marcador: ${PLUGINS_CS2_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_plugins_cs2
fi
