#!/usr/bin/env bash
# CS2 update monitor: detects CS2 game updates via buildid and triggers
# automatic LinuxGSM update + plugin reinstall. Called by fraghub-cs2-monitor.timer.
#
# State files (all in FRAGHUB_STATE_DIR):
#   cs2-buildid.last         — last known good buildid
#   cs2-monitor.state        — WAITING_UPSTREAM / RETRY_COUNT / NEXT_WAIT tracking
#   cs2-update.log           — rolling structured log (last 200 lines)

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
STATE_DIR="${FRAGHUB_STATE_DIR:-/opt/fraghub/state}"
MONITOR_STATE_FILE="${STATE_DIR}/cs2-monitor.state"
UPDATE_LOG="${STATE_DIR}/cs2-update.log"
LGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
CS2_INSTANCE="${FRAGHUB_CS2_INSTANCE:-cs2server}"
# Alert after this many failed retries
MAX_RETRIES="${FRAGHUB_CS2_MONITOR_MAX_RETRIES:-20}"
# Exponential backoff caps (minutes): 2, 4, 8, 16, 30, 30, 30...
BACKOFF_CAPS=(2 4 8 16 30)

# Load effective.env for DISCORD_WEBHOOK_URL
if [[ -f "$EFFECTIVE_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
fi

# ---------------------------------------------------------------------------
# Structured update log (rolling, last 200 lines)
# ---------------------------------------------------------------------------
ulog() {
  local level="$1"
  local message="$2"
  local ts
  ts="$(date -Iseconds)"
  mkdir -p "$STATE_DIR"
  printf '[%s] [%s] %s\n' "$ts" "$level" "$message" >>"$UPDATE_LOG"
  # Keep last 200 lines
  if [[ -f "$UPDATE_LOG" ]]; then
    local lines
    lines="$(wc -l <"$UPDATE_LOG")"
    if (( lines > 200 )); then
      local tmp
      tmp="$(mktemp)"
      tail -n 200 "$UPDATE_LOG" >"$tmp"
      mv "$tmp" "$UPDATE_LOG"
    fi
  fi
  fraghub_log "$level" "$message"
}

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

# Exponential backoff: returns cap in minutes for given retry count
backoff_minutes() {
  local retry="$1"
  local idx=$(( retry - 1 ))
  local max_idx=$(( ${#BACKOFF_CAPS[@]} - 1 ))
  [[ $idx -gt $max_idx ]] && idx=$max_idx
  echo "${BACKOFF_CAPS[$idx]}"
}

# ---------------------------------------------------------------------------
# LinuxGSM binary update
# ---------------------------------------------------------------------------
run_lgsm_update() {
  local lgsm_script="${LGSM_DIR}/${CS2_INSTANCE}"
  if [[ ! -x "$lgsm_script" ]]; then
    ulog "WARN" "[cs2-monitor] LinuxGSM script nao encontrado em ${lgsm_script}; skip LGSM update."
    return 0
  fi
  ulog "INFO" "[cs2-monitor] Executando LinuxGSM update (download binario CS2)..."
  if bash "$lgsm_script" update; then
    ulog "INFO" "[cs2-monitor] LinuxGSM update concluido."
  else
    ulog "WARN" "[cs2-monitor] LinuxGSM update retornou erro (pode ser normal se server ainda online)."
  fi
}

# ---------------------------------------------------------------------------
# Full update pipeline: LGSM binary update + plugin reinstall
# ---------------------------------------------------------------------------
run_full_update() {
  run_lgsm_update
  bash "${SCRIPT_DIR}/plugin-update-cs2.sh"
}

# ---------------------------------------------------------------------------
# Main monitor logic
# ---------------------------------------------------------------------------
main() {
  ulog "INFO" "[cs2-monitor] Verificando buildid CS2..."

  # Check if appmanifest exists (server may not be installed)
  if ! cs2_appmanifest_path >/dev/null 2>&1; then
    ulog "INFO" "[cs2-monitor] appmanifest_730.acf nao encontrado; servidor CS2 pode nao estar instalado."
    return 0
  fi

  local current_buildid saved_buildid
  current_buildid="$(cs2_read_buildid)" || {
    ulog "WARN" "[cs2-monitor] Nao foi possivel ler buildid do appmanifest."
    return 0
  }
  saved_buildid="$(cs2_saved_buildid)"

  # Check if we are currently in WAITING_UPSTREAM retry loop
  local waiting retry_count
  waiting="$(monitor_state_get WAITING_UPSTREAM)"
  retry_count="$(monitor_state_get RETRY_COUNT)"
  retry_count="${retry_count:-0}"

  if [[ "$waiting" == "1" ]]; then
    local new_count=$(( retry_count + 1 ))
    local wait_min
    wait_min="$(backoff_minutes "$new_count")"
    ulog "INFO" "[cs2-monitor] WAITING_UPSTREAM ativo (tentativa ${new_count}/${MAX_RETRIES}, backoff atual: ${wait_min}min)."
    monitor_state_set RETRY_COUNT "$new_count"
    monitor_state_set LAST_ATTEMPT "$(date -Iseconds)"

    if (( new_count > MAX_RETRIES )); then
      ulog "ERROR" "[cs2-monitor] ${MAX_RETRIES} tentativas sem sucesso. Intervencao manual necessaria."
      discord_notify "🚨 FragHub CS2 — plugins ainda quebrados após ${MAX_RETRIES} tentativas (buildid: ${current_buildid}). Intervenção manual necessária."
      monitor_state_set RETRY_COUNT "0"
      return 0
    fi

    local exit_code=0
    run_full_update || exit_code=$?
    if [[ $exit_code -eq 0 ]]; then
      ulog "INFO" "[cs2-monitor] Recovery bem-sucedido apos ${new_count} tentativas."
      discord_notify "✅ FragHub CS2 — recovery completo após ${new_count} tentativa(s) (buildid: ${current_buildid})."
      cs2_save_buildid "$current_buildid"
      monitor_state_clear
    else
      ulog "WARN" "[cs2-monitor] Recovery falhou (tentativa ${new_count}). Proxima em ${wait_min}min."
    fi
    return 0
  fi

  # Normal check: has buildid changed?
  if [[ -n "$saved_buildid" && "$current_buildid" == "$saved_buildid" ]]; then
    ulog "INFO" "[cs2-monitor] Buildid inalterado (${current_buildid}). Nenhuma acao necessaria."
    return 0
  fi

  # Buildid changed (or first run)
  if [[ -n "$saved_buildid" ]]; then
    ulog "INFO" "[cs2-monitor] CS2 UPDATE DETECTADO: ${saved_buildid} -> ${current_buildid}"
    discord_notify "🔄 FragHub CS2 — update detectado (buildid ${saved_buildid} → ${current_buildid}). A executar update completo (binário + plugins)..."
  else
    ulog "INFO" "[cs2-monitor] Primeiro registo de buildid: ${current_buildid}"
    cs2_save_buildid "$current_buildid"
    return 0
  fi

  local exit_code=0
  run_full_update || exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    ulog "INFO" "[cs2-monitor] Update completo bem-sucedido (binario + plugins)."
    cs2_save_buildid "$current_buildid"
    monitor_state_clear
  else
    ulog "WARN" "[cs2-monitor] Update falhou na primeira tentativa. Upstream pode nao ter atualizado ainda. Ativando WAITING_UPSTREAM."
    monitor_state_set WAITING_UPSTREAM "1"
    monitor_state_set RETRY_COUNT "1"
    monitor_state_set PENDING_BUILDID "$current_buildid"
    monitor_state_set LAST_ATTEMPT "$(date -Iseconds)"
    discord_notify "⏳ FragHub CS2 — update falhou na 1ª tentativa (buildid: ${current_buildid}). Retentando com backoff exponencial (max ${MAX_RETRIES}x)."
  fi
}

main "$@"
