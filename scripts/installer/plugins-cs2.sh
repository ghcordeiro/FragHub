#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"
# shellcheck source=lib/lgsm-paths.sh
source "${SCRIPT_DIR}/lib/lgsm-paths.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
GAME_BOOTSTRAP_MARKER="${FRAGHUB_GAME_BOOTSTRAP_MARKER:-${INPUT_DIR}/game-bootstrap.done}"
PLUGINS_CS2_MARKER="${FRAGHUB_PLUGINS_CS2_MARKER:-${INPUT_DIR}/plugins-cs2.done}"
FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"
FRAGHUB_INSTALL_USER="${FRAGHUB_INSTALL_USER:-$(id -un)}"

CS2_PLUGIN_ROOT="${FRAGHUB_GAME_ROOT}/cs2/plugins"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  exit 1
}

require_bootstrap() {
  [[ -f "$GAME_BOOTSTRAP_MARKER" ]] || fail "Dependencia ausente: game_bootstrap nao concluido (${GAME_BOOTSTRAP_MARKER})."
}

load_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo em falta: ${EFFECTIVE_FILE}."
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
}

fraghub_tags_api_base_url() {
  if [[ -n "${FRAGHUB_TAGS_API_URL:-}" ]]; then
    printf '%s' "${FRAGHUB_TAGS_API_URL}"
    return 0
  fi
  local d="${FRAGHUB_DOMAIN:-}"
  if [[ -n "$d" ]]; then
    if [[ "$d" == http://* ]] || [[ "$d" == https://* ]]; then
      printf '%s' "$d"
    else
      printf 'https://%s' "$d"
    fi
    return 0
  fi
  printf 'http://127.0.0.1:%s' "${FRAGHUB_API_PORT:-3001}"
}

fraghub_chown_game_subtree() {
  local tree="$1"
  [[ -d "$tree" ]] || return 0
  chown -R "${FRAGHUB_INSTALL_USER}:${FRAGHUB_INSTALL_USER}" "$tree" 2>/dev/null || true
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

  fraghub_log "WARN" "Plugins base CS2 (MetaMod/CounterStrikeSharp/MatchZy): apenas marcadores em ${CS2_PLUGIN_ROOT}. Para o servidor carregar, instale os binarios (LinuxGSM mods ou guia upstream) em serverfiles/game/csgo/addons/."

  load_effective_env
  # Phase 5: Install FragHub Tags plugin (CounterStrikeSharp so carrega de addons/counterstrikesharp no game/csgo).
  install_fraghub_tags_cs2

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$PLUGINS_CS2_MARKER"
  chmod 600 "$PLUGINS_CS2_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "plugin_install_cs2 concluido. Marcador: ${PLUGINS_CS2_MARKER}"
}

install_fraghub_tags_cs2() {
  local plugin_name="fraghub-tags"
  local marker_dir="${CS2_PLUGIN_ROOT}/${plugin_name}"
  local src_dll="${REPO_ROOT}/plugins/cs2/fraghub-tags/bin/Release/net8.0/fraghub-tags.dll"
  local dst plugin_dir cfg_json api_base

  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado (defina FRAGHUB_LGSM_GAME_CSGO_ROOT se a instalação for nao standard)."
  plugin_dir="${dst}/addons/counterstrikesharp/plugins/${plugin_name}"
  cfg_json="${dst}/addons/counterstrikesharp/configs/plugins/${plugin_name}/fraghub-tags.json"

  [[ -f "$src_dll" ]] || fail "DLL fraghub-tags em falta no repositorio: ${src_dll} (compile com dotnet build -c Release)."

  mkdir -p "$plugin_dir" "$(dirname "$cfg_json")"
  cp -f "$src_dll" "${plugin_dir}/fraghub-tags.dll"
  fraghub_log "INFO" "fraghub-tags.dll instalado em ${plugin_dir}/ (CounterStrikeSharp)."

  api_base="$(fraghub_tags_api_base_url)"
  if [[ ! -f "$cfg_json" ]]; then
    FRAGHUB_TAGS_JSON_TMP_API="$api_base" python3 -c 'import json, os; print(json.dumps({"ConfigVersion": 1, "ApiUrl": os.environ["FRAGHUB_TAGS_JSON_TMP_API"]}, indent=2))' >"$cfg_json"
    chmod 600 "$cfg_json" 2>/dev/null || true
    fraghub_log "INFO" "Criado ${cfg_json} (ApiUrl -> ${api_base})."
  else
    fraghub_log "INFO" "Config existente preservada: ${cfg_json}"
  fi

  fraghub_chown_game_subtree "$plugin_dir"
  fraghub_chown_game_subtree "$(dirname "$cfg_json")"

  mkdir -p "$marker_dir"
  install_plugin_marker "$plugin_name"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_plugins_cs2
fi
