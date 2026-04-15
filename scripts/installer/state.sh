#!/usr/bin/env bash
# FragHub installer — estado local por etapa (ADR-0002).
# Uso: `source` a partir de install.sh, ou `bash state.sh status|reset`.

: "${HOME:?HOME nao definido}"
STATE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${STATE_SCRIPT_DIR}/logging.sh"

: "${FRAGHUB_STATE_DIR:=${HOME}/.fraghub/installer/state}"
FRAGHUB_STEPS_FILE="${FRAGHUB_STEPS_FILE:-${FRAGHUB_STATE_DIR}/steps.env}"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
INPUT_FILE="${FRAGHUB_INPUT_FILE:-${INPUT_DIR}/input.env}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
BOOTSTRAP_MARKER="${FRAGHUB_BOOTSTRAP_MARKER:-${INPUT_DIR}/bootstrap.done}"
DATABASE_BASELINE_MARKER="${FRAGHUB_DATABASE_BASELINE_MARKER:-${INPUT_DIR}/database-baseline.done}"
GAME_PRECHECK_MARKER="${FRAGHUB_GAME_PRECHECK_MARKER:-${INPUT_DIR}/game-precheck.done}"
GAME_BOOTSTRAP_MARKER="${FRAGHUB_GAME_BOOTSTRAP_MARKER:-${INPUT_DIR}/game-bootstrap.done}"
PLUGINS_CS2_MARKER="${FRAGHUB_PLUGINS_CS2_MARKER:-${INPUT_DIR}/plugins-cs2.done}"
PLUGINS_CSGO_MARKER="${FRAGHUB_PLUGINS_CSGO_MARKER:-${INPUT_DIR}/plugins-csgo.done}"
PLUGINS_EXTENDED_CS2_MARKER="${FRAGHUB_PLUGINS_EXTENDED_CS2_MARKER:-${INPUT_DIR}/plugins-extended-cs2.done}"
PLUGINS_EXTENDED_CSGO_MARKER="${FRAGHUB_PLUGINS_EXTENDED_CSGO_MARKER:-${INPUT_DIR}/plugins-extended-csgo.done}"
GAME_SERVICES_MARKER="${FRAGHUB_GAME_SERVICES_MARKER:-${INPUT_DIR}/game-services.done}"
GAME_VERIFY_MARKER="${FRAGHUB_GAME_VERIFY_MARKER:-${INPUT_DIR}/game-verify.done}"
GAME_SUMMARY_MARKER="${FRAGHUB_GAME_SUMMARY_MARKER:-${INPUT_DIR}/game-summary.done}"
DATABASE_BACKUP_MARKER="${FRAGHUB_DATABASE_BACKUP_MARKER:-${INPUT_DIR}/database-backup.done}"
API_SETUP_MARKER="${FRAGHUB_API_SETUP_MARKER:-${INPUT_DIR}/api-setup.done}"
ADMIN_BOOTSTRAP_MARKER="${FRAGHUB_ADMIN_BOOTSTRAP_MARKER:-${INPUT_DIR}/admin-bootstrap.done}"
PORTAL_SETUP_MARKER="${FRAGHUB_PORTAL_SETUP_MARKER:-${INPUT_DIR}/portal-setup.done}"
NGINX_SETUP_MARKER="${FRAGHUB_NGINX_SETUP_MARKER:-${INPUT_DIR}/nginx-setup.done}"
VERIFY_MARKER="${FRAGHUB_VERIFY_MARKER:-${INPUT_DIR}/verify.passed}"
SUMMARY_MARKER="${FRAGHUB_SUMMARY_MARKER:-${INPUT_DIR}/summary.done}"

fraghub_state_init() {
  mkdir -p "$FRAGHUB_STATE_DIR"
  chmod 700 "$FRAGHUB_STATE_DIR"
}

fraghub_state_get() {
  local step="$1"
  [[ -f "$FRAGHUB_STEPS_FILE" ]] || {
    printf ''
    return 0
  }
  local line
  line="$(grep -E "^${step}=" "$FRAGHUB_STEPS_FILE" 2>/dev/null | tail -n1)" || true
  printf '%s' "${line#*=}"
}

fraghub_state_set() {
  local step="$1"
  local value="$2"
  mkdir -p "$FRAGHUB_STATE_DIR"
  umask 077
  local tmp
  tmp="$(mktemp)"
  if [[ -f "$FRAGHUB_STEPS_FILE" ]]; then
    grep -vE "^${step}=" "$FRAGHUB_STEPS_FILE" >"$tmp" 2>/dev/null || true
  fi
  printf '%s=%s\n' "$step" "$value" >>"$tmp"
  mv "$tmp" "$FRAGHUB_STEPS_FILE"
  chmod 600 "$FRAGHUB_STEPS_FILE"
}

fraghub_state_verify_precheck() {
  [[ "$(uname -s)" == "Linux" ]] || return 1
  [[ -f /etc/os-release ]] || return 1
  command -v sudo >/dev/null 2>&1 || return 1
  fraghub_sudo_noninteractive_ok || return 1
  return 0
}

fraghub_state_verify_input() {
  [[ -f "$INPUT_FILE" ]] || return 1
  return 0
}

fraghub_state_verify_secrets() {
  [[ -f "$EFFECTIVE_FILE" ]] || return 1
  [[ -s "$EFFECTIVE_FILE" ]] || return 1
  return 0
}

fraghub_state_verify_bootstrap() {
  [[ -f "$BOOTSTRAP_MARKER" ]] || return 1
  dpkg-query -W -f='${Status}' nginx 2>/dev/null | grep -q "install ok installed" || return 1
  if [[ "${FRAGHUB_ENABLE_GAME_STACK:-0}" == "1" ]]; then
    [[ -x "${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}/linuxgsm.sh" ]] || return 1
  fi
  return 0
}

fraghub_state_verify_database_baseline() {
  [[ -f "$DATABASE_BASELINE_MARKER" ]] || return 1
  [[ -f "${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}" ]] || return 1
  return 0
}

fraghub_state_verify_game_precheck() {
  [[ -f "$GAME_PRECHECK_MARKER" ]] || return 1
  [[ -x "${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}/linuxgsm.sh" ]] || return 1
  return 0
}

fraghub_state_verify_game_bootstrap() {
  [[ -f "$GAME_BOOTSTRAP_MARKER" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/cs2/instance.env" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/csgo/instance.env" ]] || return 1
  return 0
}

fraghub_state_verify_plugins_cs2() {
  [[ -f "$PLUGINS_CS2_MARKER" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/cs2/plugins/metamod/.installed" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/cs2/plugins/counterstrikesharp/.installed" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/cs2/plugins/matchzy/.installed" ]] || return 1
  return 0
}

fraghub_state_verify_plugins_csgo() {
  [[ -f "$PLUGINS_CSGO_MARKER" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/csgo/plugins/metamod/.installed" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/csgo/plugins/sourcemod/.installed" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/csgo/plugins/get5/.installed" ]] || return 1
  return 0
}

fraghub_state_verify_plugins_extended_cs2() {
  [[ -f "$PLUGINS_EXTENDED_CS2_MARKER" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/cs2/plugins/extended/CS2-SimpleAdmin/CS2-SimpleAdmin.dll" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/cs2/plugins/extended/WeaponPaints/WeaponPaints.dll" ]] || return 1
  return 0
}

fraghub_state_verify_plugins_extended_csgo() {
  [[ -f "$PLUGINS_EXTENDED_CSGO_MARKER" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/csgo/plugins/extended/SourceBans++/sourcebans.smx" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/csgo/plugins/extended/WeaponsKnives/weaponsknives.smx" ]] || return 1
  [[ -f "${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}/csgo/plugins/extended/RankMe/rankme.smx" ]] || return 1
  return 0
}

fraghub_state_verify_game_services() {
  [[ -f "$GAME_SERVICES_MARKER" ]] || return 1
  [[ -f "/etc/systemd/system/fraghub-cs2.service" ]] || return 1
  [[ -f "/etc/systemd/system/fraghub-csgo.service" ]] || return 1
  return 0
}

fraghub_state_verify_game_verify() {
  [[ -f "$GAME_VERIFY_MARKER" ]] || return 1
  return 0
}

fraghub_state_verify_game_summary() {
  [[ -f "$GAME_SUMMARY_MARKER" ]] || return 1
  return 0
}

fraghub_state_verify_database_backup() {
  [[ -f "$DATABASE_BACKUP_MARKER" ]] || return 1
  [[ -x "${FRAGHUB_BACKUP_SCRIPT:-/opt/fraghub/scripts/db-backup.sh}" ]] || return 1
  return 0
}

fraghub_state_verify_api_setup() {
  [[ -f "$API_SETUP_MARKER" ]] || return 1
  [[ -f "/etc/systemd/system/${FRAGHUB_API_SERVICE_NAME:-fraghub-api.service}" ]] || return 1
  [[ -f "${FRAGHUB_API_DIR:-/opt/fraghub/api}/package.json" ]] || return 1
  [[ -f "${FRAGHUB_API_DIR:-/opt/fraghub/api}/dist/index.js" ]] || return 1
  [[ -f "${FRAGHUB_API_DIR:-/opt/fraghub/api}/.env" ]] || return 1
  return 0
}

fraghub_state_verify_admin_bootstrap() {
  [[ -f "$ADMIN_BOOTSTRAP_MARKER" ]] || return 1
  [[ -f "${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}" ]] || return 1
  [[ -f "$EFFECTIVE_FILE" ]] || return 1
  return 0
}

fraghub_state_verify_portal_setup() {
  [[ -f "$PORTAL_SETUP_MARKER" ]] || return 1
  [[ -f "${FRAGHUB_PORTAL_DIST:-/opt/fraghub/portal/dist}/index.html" ]] || return 1
  return 0
}

fraghub_state_verify_nginx_setup() {
  [[ -f "$NGINX_SETUP_MARKER" ]] || return 1
  [[ -f /etc/nginx/sites-available/fraghub ]] || return 1
  [[ -L /etc/nginx/sites-enabled/fraghub ]] || return 1
  return 0
}

fraghub_state_verify_verify() {
  [[ -f "$VERIFY_MARKER" ]] || return 1
  [[ -f "$PORTAL_SETUP_MARKER" ]] || return 1
  [[ -f "$NGINX_SETUP_MARKER" ]] || return 1
  [[ -f /opt/fraghub/portal/dist/index.html ]] || return 1
  [[ -L /etc/nginx/sites-enabled/fraghub ]] || return 1
  local root_body
  root_body="$(curl -fsS --max-time 5 "http://127.0.0.1:80/" 2>/dev/null)" || return 1
  if printf '%s' "$root_body" | grep -qiF "Welcome to nginx"; then
    return 1
  fi
  return 0
}

fraghub_state_verify_summary() {
  [[ -f "$SUMMARY_MARKER" ]] || return 1
  [[ -f "$EFFECTIVE_FILE" ]] || return 1
  return 0
}

fraghub_state_verify() {
  local step="$1"
  case "$step" in
    precheck) fraghub_state_verify_precheck ;;
    input) fraghub_state_verify_input ;;
    secrets) fraghub_state_verify_secrets ;;
    bootstrap) fraghub_state_verify_bootstrap ;;
    database_baseline) fraghub_state_verify_database_baseline ;;
    game_precheck) fraghub_state_verify_game_precheck ;;
    game_bootstrap) fraghub_state_verify_game_bootstrap ;;
    plugins_cs2) fraghub_state_verify_plugins_cs2 ;;
    plugins_csgo) fraghub_state_verify_plugins_csgo ;;
    plugins_extended_cs2) fraghub_state_verify_plugins_extended_cs2 ;;
    plugins_extended_csgo) fraghub_state_verify_plugins_extended_csgo ;;
    game_services) fraghub_state_verify_game_services ;;
    game_verify) fraghub_state_verify_game_verify ;;
    game_summary) fraghub_state_verify_game_summary ;;
    database_backup) fraghub_state_verify_database_backup ;;
    api_setup) fraghub_state_verify_api_setup ;;
    admin_bootstrap) fraghub_state_verify_admin_bootstrap ;;
    portal_setup) fraghub_state_verify_portal_setup ;;
    nginx_setup) fraghub_state_verify_nginx_setup ;;
    verify) fraghub_state_verify_verify ;;
    summary) fraghub_state_verify_summary ;;
    *) return 1 ;;
  esac
}

fraghub_state_should_skip() {
  local step="$1"
  local status
  status="$(fraghub_state_get "$step")"
  [[ "$status" == "done" ]] || return 1
  if fraghub_state_verify "$step"; then
    return 0
  fi
  printf '[fraghub] Estado "%s" inconsistente com o sistema; reexecutando etapa.\n' "$step" >&2
  fraghub_state_set "$step" "pending"
  return 1
}

fraghub_state_apply_force_flags() {
  local step="$1"
  local force="${FRAGHUB_FORCE_STEP:-}"
  if [[ "$force" == "$step" ]]; then
    fraghub_state_set "$step" "pending"
  fi
}

fraghub_state_reset() {
  rm -f "$FRAGHUB_STEPS_FILE"
  printf 'Estado do installer limpo (%s).\n' "$FRAGHUB_STEPS_FILE"
}

fraghub_state_dump() {
  if [[ -f "$FRAGHUB_STEPS_FILE" ]]; then
    cat "$FRAGHUB_STEPS_FILE"
  else
    printf '(nenhum estado em %s)\n' "$FRAGHUB_STEPS_FILE"
  fi
}

fraghub_state_main() {
  case "${1:-}" in
    status)
      fraghub_state_init
      fraghub_state_dump
      ;;
    reset)
      fraghub_state_init
      fraghub_state_reset
      ;;
    *)
      printf 'Uso: %s status|reset\n' "$(basename "$0")" >&2
      exit 1
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -o errexit
  set -o nounset
  set -o pipefail
  fraghub_state_main "${@:-}"
fi
