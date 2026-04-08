#!/usr/bin/env bash
# FragHub installer — helpers de log (ficheiro para `source`, sem set -e global).

: "${LOG_FILE:=/tmp/fraghub-installer.log}"

# Lista de nomes de variáveis cujo valor nunca deve aparecer em mensagens de log.
# Usada por fraghub_mask_secrets para redação defensiva se a mensagem os contiver.
FRAGHUB_LOG_SECRET_VARS=(
  FRAGHUB_STEAM_WEB_API_KEY
  FRAGHUB_DB_PASSWORD
  FRAGHUB_RCON_PASSWORD
  FRAGHUB_ADMIN_PASSWORD
  FRAGHUB_GOOGLE_CLIENT_SECRET
  FRAGHUB_GOOGLE_CLIENT_ID
)

fraghub_mask_secrets() {
  local text="$1"
  local v val
  for v in "${FRAGHUB_LOG_SECRET_VARS[@]}"; do
    val="${!v:-}"
    if [[ -n "$val" && ${#val} -ge 4 ]]; then
      while [[ "$text" == *"$val"* ]]; do
        text="${text//$val/<redacted>}"
      done
    fi
  done
  printf '%s' "$text"
}

fraghub_log() {
  local level="$1"
  local message="$2"
  local ts masked
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  masked="$(fraghub_mask_secrets "$message")"
  printf '[%s] [%s] %s\n' "$ts" "$level" "$masked" | tee -a "$LOG_FILE"
}
