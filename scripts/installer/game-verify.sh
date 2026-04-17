#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"
# shellcheck source=lib/lgsm-paths.sh
source "${SCRIPT_DIR}/lib/lgsm-paths.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
GAME_SERVICES_MARKER="${FRAGHUB_GAME_SERVICES_MARKER:-${INPUT_DIR}/game-services.done}"
GAME_VERIFY_MARKER="${FRAGHUB_GAME_VERIFY_MARKER:-${INPUT_DIR}/game-verify.done}"
FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
FRAGHUB_CS2_INSTANCE="${FRAGHUB_CS2_INSTANCE:-cs2server}"

service_exists() {
  local unit="$1"
  local load_state
  load_state="$(systemctl show "$unit" --property=LoadState --value 2>/dev/null || true)"
  [[ "$load_state" == "loaded" ]]
}

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  rm -f "$GAME_VERIFY_MARKER"
  exit 1
}

check_plugin_markers() {
  [[ -f "${FRAGHUB_GAME_ROOT}/cs2/plugins/metamod/.installed" ]] || fail "MetaMod CS2 nao detectado."
  [[ -f "${FRAGHUB_GAME_ROOT}/cs2/plugins/counterstrikesharp/.installed" ]] || fail "CounterStrikeSharp nao detectado."
  [[ -f "${FRAGHUB_GAME_ROOT}/cs2/plugins/matchzy/.installed" ]] || fail "MatchZy nao detectado."
  local cs2_game
  cs2_game="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado (defina FRAGHUB_LGSM_GAME_CSGO_ROOT se a instalação for nao standard)."
  [[ -f "${cs2_game}/addons/counterstrikesharp/plugins/fraghub-tags/fraghub-tags.dll" ]] || fail "fraghub-tags nao detectado no servidor (counterstrikesharp)."
  [[ -f "${cs2_game}/addons/counterstrikesharp/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.dll" ]] || fail "CS2-SimpleAdmin nao detectado no servidor (counterstrikesharp)."
  [[ -f "${cs2_game}/addons/counterstrikesharp/plugins/WeaponPaints/WeaponPaints.dll" ]] || fail "WeaponPaints nao detectado no servidor (counterstrikesharp)."
  [[ -f "${FRAGHUB_GAME_ROOT}/csgo/plugins/metamod/.installed" ]] || fail "MetaMod CS:GO nao detectado."
  [[ -f "${FRAGHUB_GAME_ROOT}/csgo/plugins/sourcemod/.installed" ]] || fail "SourceMod nao detectado."
  [[ -f "${FRAGHUB_GAME_ROOT}/csgo/plugins/get5/.installed" ]] || fail "Get5 nao detectado."
  [[ -f "${FRAGHUB_GAME_ROOT}/csgo/plugins/extended/SourceBans++/sourcebans.smx" ]] || fail "SourceBans++ nao detectado."
  [[ -f "${FRAGHUB_GAME_ROOT}/csgo/plugins/extended/WeaponsKnives/weaponsknives.smx" ]] || fail "Weapons & Knives nao detectado."
  [[ -f "${FRAGHUB_GAME_ROOT}/csgo/plugins/extended/RankMe/rankme.smx" ]] || fail "RankMe nao detectado."
}

run_game_verify() {
  fraghub_log "INFO" "Iniciando game_verify (GSTACK-REQ-006/007/008)."
  [[ -f "$GAME_SERVICES_MARKER" ]] || fail "Dependencia ausente: service_config nao concluido."
  command -v systemctl >/dev/null 2>&1 || fail "systemctl nao disponivel para validar unidades."

  service_exists "fraghub-cs2.service" || fail "Unidade fraghub-cs2.service nao detectada."
  service_exists "fraghub-csgo.service" || fail "Unidade fraghub-csgo.service nao detectada."
  check_plugin_markers

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$GAME_VERIFY_MARKER"
  chmod 600 "$GAME_VERIFY_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "game_verify concluido. Marcador: ${GAME_VERIFY_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_game_verify
fi
