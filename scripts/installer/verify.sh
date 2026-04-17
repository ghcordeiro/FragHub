#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
BOOTSTRAP_MARKER="${FRAGHUB_BOOTSTRAP_MARKER:-${INPUT_DIR}/bootstrap.done}"
DATABASE_BASELINE_MARKER="${FRAGHUB_DATABASE_BASELINE_MARKER:-${INPUT_DIR}/database-baseline.done}"
DATABASE_BACKUP_MARKER="${FRAGHUB_DATABASE_BACKUP_MARKER:-${INPUT_DIR}/database-backup.done}"
API_SETUP_MARKER="${FRAGHUB_API_SETUP_MARKER:-${INPUT_DIR}/api-setup.done}"
ADMIN_BOOTSTRAP_MARKER="${FRAGHUB_ADMIN_BOOTSTRAP_MARKER:-${INPUT_DIR}/admin-bootstrap.done}"
PORTAL_SETUP_MARKER="${FRAGHUB_PORTAL_SETUP_MARKER:-${INPUT_DIR}/portal-setup.done}"
NGINX_SETUP_MARKER="${FRAGHUB_NGINX_SETUP_MARKER:-${INPUT_DIR}/nginx-setup.done}"
VERIFY_MARKER="${FRAGHUB_VERIFY_MARKER:-${INPUT_DIR}/verify.passed}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
FRAGHUB_DB_APP_DEFAULTS="${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}"
FRAGHUB_DB_NAME="${FRAGHUB_DB_NAME:-fraghub_db}"
FRAGHUB_BACKUP_SCRIPT="${FRAGHUB_BACKUP_SCRIPT:-/opt/fraghub/scripts/db-backup.sh}"
FRAGHUB_API_SERVICE_NAME="${FRAGHUB_API_SERVICE_NAME:-fraghub-api.service}"
FRAGHUB_API_PORT="${FRAGHUB_API_PORT:-3001}"

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/install.sh"
  rm -f "$VERIFY_MARKER"
  exit 1
}

service_active() {
  local unit="$1"
  if command -v systemctl >/dev/null 2>&1; then
    systemctl is-active --quiet "$unit"
  else
    service "$unit" status >/dev/null 2>&1
  fi
}

run_verify() {
  [[ "$(uname -s)" == "Linux" ]] || fail "Verificacao suportada apenas em Linux."
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo em falta: ${EFFECTIVE_FILE}"
  [[ -f "$BOOTSTRAP_MARKER" ]] || fail "Bootstrap nao concluido (marcador em falta: ${BOOTSTRAP_MARKER})."
  [[ -f "$DATABASE_BASELINE_MARKER" ]] || fail "database-baseline nao concluido (${DATABASE_BASELINE_MARKER})."
  [[ -f "$DATABASE_BACKUP_MARKER" ]] || fail "database-backup nao concluido (${DATABASE_BACKUP_MARKER})."
  [[ -f "$API_SETUP_MARKER" ]] || fail "api-setup nao concluido (${API_SETUP_MARKER})."
  [[ -f "$ADMIN_BOOTSTRAP_MARKER" ]] || fail "admin-bootstrap nao concluido (${ADMIN_BOOTSTRAP_MARKER})."
  [[ -f "$PORTAL_SETUP_MARKER" ]] || fail "portal-setup nao concluido (${PORTAL_SETUP_MARKER})."
  [[ -f "$NGINX_SETUP_MARKER" ]] || fail "nginx-setup nao concluido (${NGINX_SETUP_MARKER})."
  [[ -f /opt/fraghub/portal/dist/index.html ]] || fail "Portal em falta: /opt/fraghub/portal/dist/index.html."
  [[ -L /etc/nginx/sites-enabled/fraghub ]] || fail "Site Nginx fraghub nao esta activo em sites-enabled."

  fraghub_log "INFO" "Inicio das verificacoes de saude (smoke)."

  service_active nginx || fail "Nginx nao esta ativo."
  service_active mariadb || fail "MariaDB nao esta ativo."
  [[ -f "$FRAGHUB_DB_APP_DEFAULTS" ]] || fail "Ficheiro de credenciais app DB ausente: ${FRAGHUB_DB_APP_DEFAULTS}."
  mysql --defaults-extra-file="$FRAGHUB_DB_APP_DEFAULTS" --batch --skip-column-names -e "USE \`${FRAGHUB_DB_NAME}\`; SELECT COUNT(*) FROM schema_migrations;" >/dev/null || fail "Schema baseline do banco nao validado."

  command -v node >/dev/null 2>&1 || fail "Node.js nao encontrado no PATH."
  node -v | grep -qE '^v(20|22)\.' || fail "Node.js 20 ou 22 LTS esperado (obtido: $(node -v))."

  sudo ufw status | head -n 5 >/dev/null || fail "Nao foi possivel ler estado do UFW."

  if [[ "${FRAGHUB_ENABLE_GAME_STACK:-0}" == "1" ]]; then
    [[ -x "${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh" ]] || fail "linuxgsm.sh nao encontrado ou nao executavel em ${FRAGHUB_LINUXGSM_DIR}."
  fi

  id fraghub >/dev/null 2>&1 || fail "Utilizador fraghub nao existe."
  [[ -x "$FRAGHUB_BACKUP_SCRIPT" ]] || fail "Script de backup nao encontrado/executavel: ${FRAGHUB_BACKUP_SCRIPT}."
  service_active "$FRAGHUB_API_SERVICE_NAME" || fail "Servico da API nao esta ativo (${FRAGHUB_API_SERVICE_NAME})."
  curl -fsS "http://127.0.0.1:${FRAGHUB_API_PORT}/health" >/dev/null || fail "Endpoint /health da API nao respondeu com sucesso."

  local root_body
  root_body="$(curl -fsS "http://127.0.0.1:80/")"
  if printf '%s' "$root_body" | grep -qiF "Welcome to nginx"; then
    fail "Nginx ainda serve a pagina por defeito (verifique sites-enabled/fraghub e remocao de default)."
  fi

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$VERIFY_MARKER"
  chmod 600 "$VERIFY_MARKER" 2>/dev/null || true

  fraghub_log "INFO" "Verificacoes de saude OK. Marcador: ${VERIFY_MARKER}"

  echo ""
  echo "==> Verify: nginx+portal, mariadb+schema, admin na BD, node v20, UFW, backup DB, API /health e utilizador fraghub OK."
  if [[ "${FRAGHUB_ENABLE_GAME_STACK:-0}" == "1" ]]; then
    echo "    (stack de jogo: LinuxGSM verificado.)"
  fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_verify
fi
