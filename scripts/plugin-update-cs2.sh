#!/usr/bin/env bash
# CS2 plugin recovery: reinstalls all CS2 plugins after a game update.
# Usage: bash scripts/plugin-update-cs2.sh [--no-server-restart]
#
# Safe to run at any time. Stops the server, reinstalls all plugins
# (Metamod -> CSS -> MatchZy -> WeaponPaints -> extended), restarts,
# and sends a Discord notification with the result.

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="${SCRIPT_DIR}/installer"
# shellcheck source=installer/logging.sh
source "${INSTALLER_DIR}/logging.sh"
# shellcheck source=lib/cs2-buildid.sh
source "${SCRIPT_DIR}/lib/cs2-buildid.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
PLUGINS_CS2_MARKER="${FRAGHUB_PLUGINS_CS2_MARKER:-${INPUT_DIR}/plugins-cs2.done}"
PLUGINS_EXTENDED_CS2_MARKER="${FRAGHUB_PLUGINS_EXTENDED_CS2_MARKER:-${INPUT_DIR}/plugins-extended-cs2.done}"
FRAGHUB_CS2_SERVICE="${FRAGHUB_CS2_SERVICE:-fraghub-cs2.service}"
PLUGINS_INSTALLED_ENV="${FRAGHUB_STATE_DIR:-/opt/fraghub/state}/cs2-plugins-installed.env"

NO_SERVER_RESTART=0
[[ "${1:-}" == "--no-server-restart" ]] && NO_SERVER_RESTART=1

# ---------------------------------------------------------------------------
# Discord notification (best-effort, never fatal)
# ---------------------------------------------------------------------------
discord_notify() {
  local message="$1"
  local webhook="${DISCORD_WEBHOOK_URL:-}"
  [[ -n "$webhook" ]] || return 0
  local payload
  payload="$(python3 -c "import json,sys; print(json.dumps({'content':sys.argv[1]}))" "$message")" || return 0
  curl -fsSL -X POST "$webhook" \
    -H "Content-Type: application/json" \
    -d "$payload" >/dev/null 2>&1 || true
}

# ---------------------------------------------------------------------------
# Server control helpers (non-fatal if service not installed)
# ---------------------------------------------------------------------------
server_stop() {
  if systemctl is-active --quiet "$FRAGHUB_CS2_SERVICE" 2>/dev/null; then
    fraghub_log "INFO" "A parar ${FRAGHUB_CS2_SERVICE}..."
    sudo systemctl stop "$FRAGHUB_CS2_SERVICE" || true
    sleep 3
  else
    fraghub_log "INFO" "${FRAGHUB_CS2_SERVICE} nao estava ativo."
  fi
}

server_start() {
  [[ "$NO_SERVER_RESTART" == "1" ]] && return 0
  if systemctl list-unit-files --quiet "$FRAGHUB_CS2_SERVICE" 2>/dev/null | grep -q "$FRAGHUB_CS2_SERVICE"; then
    fraghub_log "INFO" "A iniciar ${FRAGHUB_CS2_SERVICE}..."
    sudo systemctl start "$FRAGHUB_CS2_SERVICE" || true
  else
    fraghub_log "WARN" "${FRAGHUB_CS2_SERVICE} nao encontrado no systemd; inicio ignorado."
  fi
}

server_health_check() {
  [[ "$NO_SERVER_RESTART" == "1" ]] && return 0
  fraghub_log "INFO" "A aguardar 30s para verificar saude do servidor..."
  sleep 30
  if systemctl is-active --quiet "$FRAGHUB_CS2_SERVICE" 2>/dev/null; then
    fraghub_log "INFO" "${FRAGHUB_CS2_SERVICE} esta ativo apos reinicio."
    return 0
  fi
  fraghub_log "WARN" "${FRAGHUB_CS2_SERVICE} nao esta ativo apos 30s."
  return 1
}

# ---------------------------------------------------------------------------
# Save installed versions snapshot
# ---------------------------------------------------------------------------
save_installed_snapshot() {
  mkdir -p "$(dirname "$PLUGINS_INSTALLED_ENV")"
  umask 077
  {
    printf 'INSTALLED_AT=%s\n' "$(date -Iseconds)"
    # Extract versions from .installed markers if they have VERSION= field
    local meta
    local game_root="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"
    for plugin in metamod counterstrikesharp matchzy weaponpaints; do
      meta="${game_root}/cs2/plugins/${plugin}/.installed"
      if [[ -f "$meta" ]]; then
        local ver
        ver="$(grep '^VERSION=' "$meta" 2>/dev/null | cut -d= -f2 || true)"
        [[ -n "$ver" ]] && printf '%s_VERSION=%s\n' "${plugin^^}" "$ver"
      fi
    done
  } >"$PLUGINS_INSTALLED_ENV"
  chmod 600 "$PLUGINS_INSTALLED_ENV" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  fraghub_log "INFO" "=== CS2 Plugin Recovery iniciado ==="

  # Load effective.env first — needed for GITHUB_TOKEN, DISCORD_WEBHOOK_URL, DB creds.
  if [[ -f "$EFFECTIVE_FILE" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$EFFECTIVE_FILE"
    set +a
  else
    fraghub_log "WARN" "effective.env nao encontrado em ${EFFECTIVE_FILE}; continuando sem ele."
  fi

  # Preflight: connectivity — accept 403 (rate-limited) as reachable; only 000 = no network.
  local gh_http
  gh_http="$(curl -sSIL -o /dev/null -w '%{http_code}' --max-time 10 https://api.github.com 2>/dev/null || true)"
  if [[ "${gh_http}" == "000" ]]; then
    fraghub_log "ERROR" "Sem conectividade com GitHub — impossivel descarregar plugins."
    discord_notify "❌ FragHub CS2 — plugin recovery falhou: sem conectividade GitHub"
    exit 1
  fi

  server_stop

  # Clear plugin markers so the installer scripts re-run
  fraghub_log "INFO" "A limpar marcadores de plugins CS2..."
  rm -f "$PLUGINS_CS2_MARKER" "$PLUGINS_EXTENDED_CS2_MARKER"

  # Reinstall base plugins (Metamod, CSS, MatchZy, WeaponPaints, fraghub-tags)
  fraghub_log "INFO" "A reinstalar plugins base CS2..."
  if ! bash "${INSTALLER_DIR}/plugins-cs2.sh"; then
    fraghub_log "ERROR" "plugins-cs2.sh falhou."
    discord_notify "❌ FragHub CS2 — reinstalação de plugins base falhou. Upstream pode não ter atualizado ainda. Próxima tentativa em 10min."
    exit 1
  fi

  # Reinstall extended plugins (SimpleAdmin, WeaponPaints DB, AnyBaseLib, etc.)
  fraghub_log "INFO" "A reinstalar plugins estendidos CS2..."
  if ! bash "${INSTALLER_DIR}/plugins-extended-cs2.sh"; then
    fraghub_log "ERROR" "plugins-extended-cs2.sh falhou."
    discord_notify "❌ FragHub CS2 — reinstalação de plugins estendidos falhou."
    exit 1
  fi

  save_installed_snapshot

  # Restart server and check health
  server_start
  if server_health_check; then
    fraghub_log "INFO" "=== CS2 Plugin Recovery concluido com sucesso ==="
    discord_notify "✅ FragHub CS2 — plugins restaurados com sucesso (Metamod + CounterStrikeSharp + MatchZy + WeaponPaints + SimpleAdmin)"
  else
    fraghub_log "WARN" "Plugins instalados mas servidor nao ficou ativo — pode ser incompatibilidade de versao."
    discord_notify "⚠️ FragHub CS2 — plugins instalados mas servidor nao iniciou. Verifique logs: journalctl -u ${FRAGHUB_CS2_SERVICE}"
    exit 1
  fi
}

main "$@"
