#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
GAME_VERIFY_MARKER="${FRAGHUB_GAME_VERIFY_MARKER:-${INPUT_DIR}/game-verify.done}"
GAME_SUMMARY_MARKER="${FRAGHUB_GAME_SUMMARY_MARKER:-${INPUT_DIR}/game-summary.done}"
FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  exit 1
}

check_marker() {
  local label="$1"
  local file="$2"
  if [[ -f "$file" ]]; then
    printf '  - %s: OK\n' "$label"
  else
    printf '  - %s: PENDENTE\n' "$label"
  fi
}

run_game_summary() {
  [[ -f "$GAME_VERIFY_MARKER" ]] || fail "Dependencia ausente: game_verify nao concluido."
  fraghub_log "INFO" "Gerando game_summary (GSTACK-REQ-006)."

  echo ""
  echo "=========================================="
  echo "  FragHub — resumo da stack de jogo (v0.1)"
  echo "=========================================="
  echo ""
  echo "## Provisionamento por jogo"
  check_marker "CS2 instance" "${FRAGHUB_GAME_ROOT}/cs2/instance.env"
  check_marker "CS:GO instance" "${FRAGHUB_GAME_ROOT}/csgo/instance.env"
  echo ""
  echo "## Plugins CS2"
  check_marker "MetaMod" "${FRAGHUB_GAME_ROOT}/cs2/plugins/metamod/.installed"
  check_marker "CounterStrikeSharp" "${FRAGHUB_GAME_ROOT}/cs2/plugins/counterstrikesharp/.installed"
  check_marker "MatchZy" "${FRAGHUB_GAME_ROOT}/cs2/plugins/matchzy/.installed"
  echo ""
  echo "## Plugins CS:GO"
  check_marker "MetaMod" "${FRAGHUB_GAME_ROOT}/csgo/plugins/metamod/.installed"
  check_marker "SourceMod" "${FRAGHUB_GAME_ROOT}/csgo/plugins/sourcemod/.installed"
  check_marker "Get5" "${FRAGHUB_GAME_ROOT}/csgo/plugins/get5/.installed"
  echo ""
  echo "## Servicos"
  echo "  - fraghub-cs2.service"
  echo "  - fraghub-csgo.service"
  echo ""
  echo "## Comandos recomendados"
  echo "  - systemctl status fraghub-cs2"
  echo "  - systemctl status fraghub-csgo"
  echo "  - journalctl -u fraghub-cs2 -n 50 --no-pager"
  echo "  - journalctl -u fraghub-csgo -n 50 --no-pager"
  echo "  - cd ${FRAGHUB_LINUXGSM_DIR} && ./cs2server details && ./csgoserver details"
  echo ""

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$GAME_SUMMARY_MARKER"
  chmod 600 "$GAME_SUMMARY_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "game_summary concluido. Marcador: ${GAME_SUMMARY_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_game_summary
fi
