#!/usr/bin/env bash
# CS2 update monitor: detects CS2 game updates via buildid and triggers
# automatic plugin reinstall. Called by fraghub-cs2-monitor.timer every 10min.
#
# State files (all in FRAGHUB_STATE_DIR):
#   cs2-buildid.last         — last known good buildid
#   cs2-monitor.state        — WAITING_UPSTREAM / RETRY_COUNT tracking

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=installer/logging.sh
source "${SCRIPT_DIR}/installer/logging.sh"
# shellcheck source=lib/cs2-buildid.sh
source "${SCRIPT_DIR}/lib/cs2-buildid.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
MONITOR_STATE_FILE="${FRAGHUB_STATE_DIR:-/opt/fraghub/state}/cs2-monitor.state"
# Alert after this many failed retries (~2h at 10min interval)
MAX_RETRIES="${FRAGHUB_CS2_MONITOR_MAX_RETRIES:-12}"

# Load effective.env for DISCORD_WEBHOOK_URL
if [[ -f "$EFFECTIVE_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
fi

# ---------------------------------------------------------------------------
# Discord notification (best-effort)
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
# Monitor state helpers
# ---------------------------------------------------------------------------
monitor_state_get() {
  local key="$1"
  [[ -f "$MONITOR_STATE_FILE" ]] || { printf ''; return 0; }
  grep "^${key}=" "$MONITOR_STATE_FILE" 2>/dev/null | cut -d= -f2 | head -n1 || true
}

monitor_state_set() {
  local key="$1"
  local value="$2"
  mkdir -p "$(dirname "$MONITOR_STATE_FILE")"
  local tmp
  tmp="$(mktemp)"
  if [[ -f "$MONITOR_STATE_FILE" ]]; then
    grep -v "^${key}=" "$MONITOR_STATE_FILE" >"$tmp" 2>/dev/null || true
  fi
  printf '%s=%s\n' "$key" "$value" >>"$tmp"
  mv "$tmp" "$MONITOR_STATE_FILE"
  chmod 600 "$MONITOR_STATE_FILE" 2>/dev/null || true
}

monitor_state_clear() {
  [[ -f "$MONITOR_STATE_FILE" ]] && rm -f "$MONITOR_STATE_FILE"
  return 0
}

# ---------------------------------------------------------------------------
# Main monitor logic
# ---------------------------------------------------------------------------
main() {
  fraghub_log "INFO" "[cs2-monitor] Verificando buildid CS2..."

  # Check if appmanifest exists (server may not be installed)
  if ! cs2_appmanifest_path >/dev/null 2>&1; then
    fraghub_log "INFO" "[cs2-monitor] appmanifest_730.acf nao encontrado; servidor CS2 pode nao estar instalado."
    return 0
  fi

  local current_buildid saved_buildid
  current_buildid="$(cs2_read_buildid)" || {
    fraghub_log "WARN" "[cs2-monitor] Nao foi possivel ler buildid do appmanifest."
    return 0
  }
  saved_buildid="$(cs2_saved_buildid)"

  # Check if we are currently in WAITING_UPSTREAM retry loop
  local waiting retry_count
  waiting="$(monitor_state_get WAITING_UPSTREAM)"
  retry_count="$(monitor_state_get RETRY_COUNT)"
  retry_count="${retry_count:-0}"

  if [[ "$waiting" == "1" ]]; then
    fraghub_log "INFO" "[cs2-monitor] WAITING_UPSTREAM ativo (tentativa ${retry_count}/${MAX_RETRIES}). A tentar plugin recovery..."
    local new_count=$(( retry_count + 1 ))
    monitor_state_set RETRY_COUNT "$new_count"

    if (( new_count > MAX_RETRIES )); then
      fraghub_log "ERROR" "[cs2-monitor] ${MAX_RETRIES} tentativas sem sucesso. Intervencao manual necessaria."
      discord_notify "🚨 FragHub CS2 — plugins ainda quebrados após ${MAX_RETRIES} tentativas (buildid: ${current_buildid}). Intervencao manual necessária."
      # Reset counter to avoid spam; keep WAITING_UPSTREAM=1 so retries continue
      monitor_state_set RETRY_COUNT "0"
      return 0
    fi

    if bash "${SCRIPT_DIR}/plugin-update-cs2.sh"; then
      fraghub_log "INFO" "[cs2-monitor] Recovery bem-sucedido apos ${new_count} tentativas."
      cs2_save_buildid "$current_buildid"
      monitor_state_clear
    else
      fraghub_log "WARN" "[cs2-monitor] Recovery falhou (tentativa ${new_count}). Proxima em 10min."
    fi
    return 0
  fi

  # Normal check: has buildid changed?
  if [[ -n "$saved_buildid" && "$current_buildid" == "$saved_buildid" ]]; then
    fraghub_log "INFO" "[cs2-monitor] Buildid inalterado (${current_buildid}). Nenhuma acao necessaria."
    return 0
  fi

  # Buildid changed (or first run)
  if [[ -n "$saved_buildid" ]]; then
    fraghub_log "INFO" "[cs2-monitor] CS2 UPDATE DETECTADO: ${saved_buildid} -> ${current_buildid}"
    discord_notify "🔄 FragHub CS2 — update detectado (buildid ${saved_buildid} → ${current_buildid}). A reinstalar plugins..."
  else
    fraghub_log "INFO" "[cs2-monitor] Primeiro registo de buildid: ${current_buildid}"
    # On first run, just save buildid without reinstalling
    cs2_save_buildid "$current_buildid"
    return 0
  fi

  if bash "${SCRIPT_DIR}/plugin-update-cs2.sh"; then
    fraghub_log "INFO" "[cs2-monitor] Plugin recovery bem-sucedido."
    cs2_save_buildid "$current_buildid"
    monitor_state_clear
  else
    fraghub_log "WARN" "[cs2-monitor] Plugin recovery falhou. Upstream pode nao ter atualizado ainda. Ativando WAITING_UPSTREAM."
    monitor_state_set WAITING_UPSTREAM "1"
    monitor_state_set RETRY_COUNT "1"
    monitor_state_set PENDING_BUILDID "$current_buildid"
    discord_notify "⏳ FragHub CS2 — recovery falhou na primeira tentativa (buildid: ${current_buildid}). Retentando a cada 10min (max ${MAX_RETRIES}x)."
  fi
}

main "$@"
