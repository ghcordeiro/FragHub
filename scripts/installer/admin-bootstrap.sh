#!/usr/bin/env bash
# Garante utilizador admin a partir de FRAGHUB_ADMIN_EMAIL / FRAGHUB_ADMIN_PASSWORD (effective.env).
# Executar apos api-setup (Node + bcrypt em /opt/fraghub/api).
# Opcional: FRAGHUB_ADMIN_BOOTSTRAP_PURGE=1 remove todos os utilizadores e dados dependentes antes do upsert.

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"
# shellcheck source=state.sh
source "${SCRIPT_DIR}/state.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
FRAGHUB_DB_APP_DEFAULTS="${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}"
FRAGHUB_DB_NAME="${FRAGHUB_DB_NAME:-fraghub_db}"
FRAGHUB_API_DIR="${FRAGHUB_API_DIR:-/opt/fraghub/api}"
ADMIN_BOOTSTRAP_MARKER="${FRAGHUB_ADMIN_BOOTSTRAP_MARKER:-${INPUT_DIR}/admin-bootstrap.done}"
BCRYPT_COST="${FRAGHUB_ADMIN_BCRYPT_COST:-12}"

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/admin-bootstrap.sh"
  exit 1
}

is_blank() {
  [[ -z "${1//[[:space:]]/}" ]]
}

load_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo nao encontrado: ${EFFECTIVE_FILE}."
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
}

sql_escape() {
  local s="${1:-}"
  s="${s//\'/\'\'}"
  printf '%s' "$s"
}

mysql_app_exec() {
  local sql="$1"
  mysql --defaults-extra-file="$FRAGHUB_DB_APP_DEFAULTS" --batch --skip-column-names -e "USE \`${FRAGHUB_DB_NAME}\`; ${sql}"
}

mysql_app_exec_noselect() {
  local sql="$1"
  mysql --defaults-extra-file="$FRAGHUB_DB_APP_DEFAULTS" -e "USE \`${FRAGHUB_DB_NAME}\`; ${sql}"
}

table_exists() {
  local t="$1"
  local c
  c="$(mysql_app_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FRAGHUB_DB_NAME}' AND table_name='${t}';")"
  [[ "$c" == "1" ]]
}

delete_all_if_exists() {
  local t="$1"
  table_exists "$t" || return 0
  fraghub_log "INFO" "A limpar tabela ${t} (bootstrap admin / purge)."
  mysql_app_exec_noselect "DELETE FROM \`${t}\`;"
}

validate_password_policy() {
  local p="$1"
  ((${#p} >= 8)) || return 1
  [[ "$p" =~ [a-z] ]] || return 1
  [[ "$p" =~ [A-Z] ]] || return 1
  [[ "$p" =~ [0-9] ]] || return 1
  return 0
}

validate_email() {
  local e="$1"
  [[ "$e" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || return 1
  return 0
}

hash_password_bcrypt() {
  local plain="$1"
  (
    cd "$FRAGHUB_API_DIR"
    export FRAGHUB_BOOTSTRAP_PW="$plain"
    node -e "
const bcrypt = require('bcrypt');
const cost = Number(process.env.BCRYPT_COST || 12);
const p = process.env.FRAGHUB_BOOTSTRAP_PW || '';
bcrypt.hash(p, cost).then((h) => { process.stdout.write(h); }).catch((err) => { console.error(err); process.exit(1); });
"
  )
}

purge_users_and_dependents() {
  delete_all_if_exists queue_players
  delete_all_if_exists queue_sessions
  delete_all_if_exists admin_audit_logs
  delete_all_if_exists server_configs
  delete_all_if_exists player_bans
  delete_all_if_exists elo_history
  delete_all_if_exists refresh_tokens
  if table_exists users; then
    mysql_app_exec_noselect "DELETE FROM users;"
  fi
}

upsert_admin_user() {
  local email="$1"
  local hash="$2"
  local display="$3"
  local sql
  sql="INSERT INTO users (email, password_hash, display_name, role, elo_rating) VALUES ('$(sql_escape "$email")','$(sql_escape "$hash")','$(sql_escape "$display")','admin',1000) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', display_name = VALUES(display_name), updated_at = CURRENT_TIMESTAMP;"
  mysql_app_exec_noselect "$sql"
}

write_marker() {
  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$ADMIN_BOOTSTRAP_MARKER"
  chmod 600 "$ADMIN_BOOTSTRAP_MARKER" 2>/dev/null || true
}

run_admin_bootstrap() {
  [[ "$(uname -s)" == "Linux" ]] || fail "admin-bootstrap suportado apenas em Linux."
  fraghub_state_verify database_baseline || fail "Dependencia: database-baseline nao concluida."
  fraghub_state_verify api_setup || fail "Dependencia: api-setup nao concluido (precisa de Node e bcrypt em ${FRAGHUB_API_DIR})."
  [[ -f "$FRAGHUB_DB_APP_DEFAULTS" ]] || fail "Credenciais app DB ausentes: ${FRAGHUB_DB_APP_DEFAULTS}."
  [[ -d "$FRAGHUB_API_DIR/node_modules/bcrypt" ]] || fail "Pacote bcrypt ausente em ${FRAGHUB_API_DIR}/node_modules (reexecute api-setup)."

  load_effective_env

  local email="${FRAGHUB_ADMIN_EMAIL:-}"
  local pass="${FRAGHUB_ADMIN_PASSWORD:-}"
  is_blank "$email" && fail "FRAGHUB_ADMIN_EMAIL vazio no ${EFFECTIVE_FILE}."
  is_blank "$pass" && fail "FRAGHUB_ADMIN_PASSWORD vazio no ${EFFECTIVE_FILE}."
  validate_email "$email" || fail "FRAGHUB_ADMIN_EMAIL invalido."
  validate_password_policy "$pass" || fail "FRAGHUB_ADMIN_PASSWORD fraco: minimo 8 caracteres com maiuscula, minuscula e digito (igual a API)."

  local purge="${FRAGHUB_ADMIN_BOOTSTRAP_PURGE:-0}"
  local display="${FRAGHUB_ADMIN_DISPLAY_NAME:-}"
  if is_blank "$display"; then
    display="${email%%@*}"
    [[ -n "$display" ]] || display="Admin"
  fi

  local password_hash
  password_hash="$(BCRYPT_COST="$BCRYPT_COST" hash_password_bcrypt "$pass")"
  [[ -n "$password_hash" ]] || fail "Falha ao gerar hash bcrypt."

  if [[ "$purge" == "1" ]]; then
    fraghub_log "WARN" "FRAGHUB_ADMIN_BOOTSTRAP_PURGE=1: a remover todos os utilizadores e filas/tokens associados."
    purge_users_and_dependents
  fi

  upsert_admin_user "$email" "$password_hash" "$display"

  local role_check
  role_check="$(mysql_app_exec "SELECT role FROM users WHERE email='$(sql_escape "$email")' LIMIT 1;")"
  [[ "$role_check" == "admin" ]] || fail "Upsert admin falhou: role obtida '${role_check}'."

  write_marker
  fraghub_log "INFO" "Bootstrap de admin concluido (email em claro omitido do log). Marcador: ${ADMIN_BOOTSTRAP_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_admin_bootstrap
fi
