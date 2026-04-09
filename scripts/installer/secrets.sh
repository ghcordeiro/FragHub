#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
INPUT_FILE="${FRAGHUB_INPUT_FILE:-${INPUT_DIR}/input.env}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"

is_blank() {
  [[ -z "${1//[[:space:]]/}" ]]
}

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/install.sh"
  exit 1
}

fraghub_generate_password() {
  local len="${1:-24}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n=+/' | head -c "$len"
  else
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$len"
  fi
}

load_input() {
  [[ -f "$INPUT_FILE" ]] || fail "Arquivo de input nao encontrado: ${INPUT_FILE}. Execute o wizard (input.sh) antes."
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$INPUT_FILE"
  set +a
}

write_effective_env() {
  local hostname steam_key db_pass rcon_pass admin_email admin_pass domain discord google_id google_secret
  hostname="${FRAGHUB_SERVER_HOSTNAME:-}"
  steam_key="${FRAGHUB_STEAM_WEB_API_KEY:-}"
  db_pass="${FRAGHUB_DB_PASSWORD:-}"
  rcon_pass="${FRAGHUB_RCON_PASSWORD:-}"
  admin_email="${FRAGHUB_ADMIN_EMAIL:-}"
  admin_pass="${FRAGHUB_ADMIN_PASSWORD:-}"
  domain="${FRAGHUB_DOMAIN:-}"
  discord="${FRAGHUB_DISCORD_WEBHOOK:-}"
  google_id="${FRAGHUB_GOOGLE_CLIENT_ID:-}"
  google_secret="${FRAGHUB_GOOGLE_CLIENT_SECRET:-}"

  mkdir -p "$INPUT_DIR"
  umask 077
  {
    printf '# FragHub installer - configuracao efetiva (nao commitar)\n'
    printf 'export FRAGHUB_SERVER_HOSTNAME=%q\n' "$hostname"
    printf 'export FRAGHUB_STEAM_WEB_API_KEY=%q\n' "$steam_key"
    printf 'export FRAGHUB_DB_PASSWORD=%q\n' "$db_pass"
    printf 'export FRAGHUB_RCON_PASSWORD=%q\n' "$rcon_pass"
    printf 'export FRAGHUB_ADMIN_EMAIL=%q\n' "$admin_email"
    printf 'export FRAGHUB_ADMIN_PASSWORD=%q\n' "$admin_pass"
    printf 'export FRAGHUB_DOMAIN=%q\n' "$domain"
    printf 'export FRAGHUB_DISCORD_WEBHOOK=%q\n' "$discord"
    printf 'export FRAGHUB_GOOGLE_CLIENT_ID=%q\n' "$google_id"
    printf 'export FRAGHUB_GOOGLE_CLIENT_SECRET=%q\n' "$google_secret"
  } >"$EFFECTIVE_FILE"
  chmod 600 "$EFFECTIVE_FILE"
}

apply_secrets() {
  fraghub_log "INFO" "Processando segredos (valores nunca escritos em claro no log)."

  load_input

  if is_blank "${FRAGHUB_DB_PASSWORD:-}"; then
    FRAGHUB_DB_PASSWORD="$(fraghub_generate_password 24)"
    fraghub_log "INFO" "FRAGHUB_DB_PASSWORD ausente: gerada automaticamente (valor nao registrado)."
  else
    fraghub_log "INFO" "FRAGHUB_DB_PASSWORD fornecida pelo usuario (valor nao registrado)."
  fi

  if is_blank "${FRAGHUB_RCON_PASSWORD:-}"; then
    FRAGHUB_RCON_PASSWORD="$(fraghub_generate_password 24)"
    fraghub_log "INFO" "FRAGHUB_RCON_PASSWORD ausente: gerada automaticamente (valor nao registrado)."
  else
    fraghub_log "INFO" "FRAGHUB_RCON_PASSWORD fornecida pelo usuario (valor nao registrado)."
  fi

  write_effective_env
  fraghub_log "INFO" "Configuracao efetiva gravada em ${EFFECTIVE_FILE} (permissoes 600)."

  echo ""
  echo "==> Segredos aplicados"
  echo "    Arquivo efetivo: ${EFFECTIVE_FILE}"
  echo "    Senhas DB/RCON: definidas (valores nao exibidos no terminal)."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  apply_secrets
fi
