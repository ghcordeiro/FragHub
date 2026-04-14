#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
GAME_BOOTSTRAP_MARKER="${FRAGHUB_GAME_BOOTSTRAP_MARKER:-${INPUT_DIR}/game-bootstrap.done}"
PLUGINS_CSGO_MARKER="${FRAGHUB_PLUGINS_CSGO_MARKER:-${INPUT_DIR}/plugins-csgo.done}"
FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"

CSGO_PLUGIN_ROOT="${FRAGHUB_GAME_ROOT}/csgo/plugins"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  exit 1
}

require_bootstrap() {
  [[ -f "$GAME_BOOTSTRAP_MARKER" ]] || fail "Dependencia ausente: game_bootstrap nao concluido (${GAME_BOOTSTRAP_MARKER})."
}

install_plugin_marker() {
  local plugin_name="$1"
  local plugin_dir="${CSGO_PLUGIN_ROOT}/${plugin_name}"
  mkdir -p "$plugin_dir"
  umask 077
  {
    printf 'PLUGIN=%s\n' "$plugin_name"
    printf 'GAME=csgo\n'
    printf 'STAMP=%s\n' "$(date -Iseconds)"
  } >"${plugin_dir}/.installed"
  chmod 600 "${plugin_dir}/.installed"
}

run_plugins_csgo() {
  fraghub_log "INFO" "Iniciando plugin_install_csgo (GSTACK-REQ-004)."
  require_bootstrap

  mkdir -p "$CSGO_PLUGIN_ROOT"
  install_plugin_marker "metamod"
  install_plugin_marker "sourcemod"
  install_plugin_marker "get5"

  # Phase 5: Install FragHub Tags plugin (fraghub-tags-csgo)
  install_fraghub_tags_csgo

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$PLUGINS_CSGO_MARKER"
  chmod 600 "$PLUGINS_CSGO_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "plugin_install_csgo concluido. Marcador: ${PLUGINS_CSGO_MARKER}"
}

install_fraghub_tags_csgo() {
  local plugin_name="fraghub-tags"
  local plugin_dir="${CSGO_PLUGIN_ROOT}/${plugin_name}"
  local src_smx="plugins/csgo/fraghub-tags/fraghub_tags.smx"
  local src_cfg="plugins/csgo/fraghub-tags/fraghub_tags.cfg"

  # Create plugin directory
  mkdir -p "$plugin_dir"

  # Copy SMX if it exists
  if [[ -f "$src_smx" ]]; then
    cp "$src_smx" "$plugin_dir/"
    fraghub_log "INFO" "Copied fraghub_tags.smx to $plugin_dir"
  else
    fraghub_log "WARN" "SMX not found at $src_smx; skipping"
  fi

  # Create or update config file
  cat >"${plugin_dir}/fraghub_tags.cfg" << 'EOF'
// FragHub Tags Plugin Configuration (CS:GO)
api_url=http://localhost:3000
EOF
  fraghub_log "INFO" "Created config: ${plugin_dir}/fraghub_tags.cfg"

  install_plugin_marker "$plugin_name"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_plugins_csgo
fi
