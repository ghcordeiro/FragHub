#!/usr/bin/env bash

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
API_SETUP_MARKER="${FRAGHUB_API_SETUP_MARKER:-${INPUT_DIR}/api-setup.done}"
FRAGHUB_DB_APP_DEFAULTS="${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}"

FRAGHUB_API_DIR="${FRAGHUB_API_DIR:-/opt/fraghub/api}"
FRAGHUB_API_PORT="${FRAGHUB_API_PORT:-3001}"
FRAGHUB_API_SERVICE_NAME="${FRAGHUB_API_SERVICE_NAME:-fraghub-api.service}"
FRAGHUB_API_ENV_FILE="${FRAGHUB_API_DIR}/.env"
FRAGHUB_API_USER="${FRAGHUB_API_USER:-fraghub}"
FRAGHUB_API_GROUP="${FRAGHUB_API_GROUP:-fraghub}"
FRAGHUB_API_TEMPLATE_DIR="${FRAGHUB_API_TEMPLATE_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)/services/fraghub-api}"

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/api-setup.sh"
  exit 1
}

is_blank() {
  [[ -z "${1//[[:space:]]/}" ]]
}

generate_api_secret() {
  local len="${1:-48}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 64 | tr -d '\n=+/' | head -c "$len"
  else
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$len"
  fi
}

extract_db_field() {
  local key="$1"
  local value
  value="$(awk -F= -v key="$key" '$1 == key {print $2}' "$FRAGHUB_DB_APP_DEFAULTS" | tail -n1)"
  [[ -n "$value" ]] || fail "Campo obrigatorio '${key}' ausente em ${FRAGHUB_DB_APP_DEFAULTS}."
  printf '%s' "$value"
}

load_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo nao encontrado: ${EFFECTIVE_FILE}. Execute secrets.sh antes."
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
}

require_linux_ubuntu() {
  [[ "$(uname -s)" == "Linux" ]] || fail "api-setup suportada apenas em Linux."
  [[ -f /etc/os-release ]] || fail "/etc/os-release nao encontrado."
  # shellcheck disable=SC1091
  . /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] || fail "Distribuicao nao suportada: ${ID:-desconhecida}. Esperado: Ubuntu."
}

check_preconditions() {
  require_linux_ubuntu
  command -v node >/dev/null 2>&1 || fail "Node.js nao encontrado."
  command -v npm >/dev/null 2>&1 || fail "npm nao encontrado."
  node -v | grep -qE '^v20\.' || fail "Node.js 20.x esperado (obtido: $(node -v))."
  id "$FRAGHUB_API_USER" >/dev/null 2>&1 || fail "Usuario '${FRAGHUB_API_USER}' nao existe."
  fraghub_state_verify database_baseline || fail "Dependencia ausente: database-baseline nao concluida ou inconsistente com ${FRAGHUB_STEPS_FILE}."
  [[ -f "$FRAGHUB_DB_APP_DEFAULTS" ]] || fail "Credenciais de app DB ausentes: ${FRAGHUB_DB_APP_DEFAULTS}."
  command -v ss >/dev/null 2>&1 || fail "Comando ss nao encontrado para validar porta ${FRAGHUB_API_PORT}."

  if ss -ltn "( sport = :${FRAGHUB_API_PORT} )" | grep -q ":${FRAGHUB_API_PORT}"; then
    if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet "$FRAGHUB_API_SERVICE_NAME"; then
      fraghub_log "INFO" "Porta ${FRAGHUB_API_PORT} ja ocupada pelo servico ${FRAGHUB_API_SERVICE_NAME}; seguir."
    else
      fail "Pre-condicao falhou: porta ${FRAGHUB_API_PORT} ja esta em uso."
    fi
  fi
}

ensure_directories() {
  sudo mkdir -p "$FRAGHUB_API_DIR"
  sudo chown "${FRAGHUB_API_USER}:${FRAGHUB_API_GROUP}" "$FRAGHUB_API_DIR"
}

sync_api_template() {
  [[ -d "$FRAGHUB_API_TEMPLATE_DIR" ]] ||
    fail "Template da API inexistente: ${FRAGHUB_API_TEMPLATE_DIR}. Copie o repositorio ou defina FRAGHUB_API_TEMPLATE_DIR."
  sudo rsync -a \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude '.env' \
    "${FRAGHUB_API_TEMPLATE_DIR}/" \
    "${FRAGHUB_API_DIR}/"
  sudo chown -R "${FRAGHUB_API_USER}:${FRAGHUB_API_GROUP}" "$FRAGHUB_API_DIR"
}

write_environment_files() {
  local db_host db_user db_password db_name tmp_env tmp_example jwt_secret jwt_refresh frontend_url google_redirect google_id google_secret
  local steam_state steam_realm steam_return

  db_host="$(extract_db_field "host")"
  db_user="$(extract_db_field "user")"
  db_password="$(extract_db_field "password")"
  db_name="$(extract_db_field "database")"

  jwt_secret=""
  jwt_refresh=""
  if [[ -f "$FRAGHUB_API_ENV_FILE" ]]; then
    jwt_secret="$(grep -E '^JWT_SECRET=' "$FRAGHUB_API_ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
    jwt_refresh="$(grep -E '^JWT_REFRESH_SECRET=' "$FRAGHUB_API_ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
  fi
  if [[ ${#jwt_secret} -lt 32 ]]; then
    jwt_secret="$(generate_api_secret 48)"
  fi
  if [[ ${#jwt_refresh} -lt 32 ]]; then
    jwt_refresh="$(generate_api_secret 48)"
  fi

  steam_state=""
  if [[ -f "$FRAGHUB_API_ENV_FILE" ]]; then
    steam_state="$(grep -E '^STEAM_STATE_SECRET=' "$FRAGHUB_API_ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
  fi
  if [[ ${#steam_state} -lt 32 ]]; then
    steam_state="$(generate_api_secret 48)"
  fi

  webhook_secret=""
  if [[ -f "$FRAGHUB_API_ENV_FILE" ]]; then
    webhook_secret="$(grep -E '^WEBHOOK_SECRET=' "$FRAGHUB_API_ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
  fi
  if [[ ${#webhook_secret} -lt 32 ]]; then
    webhook_secret="$(generate_api_secret 48)"
  fi

  steam_return="${FRAGHUB_STEAM_RETURN_URL:-http://127.0.0.1:${FRAGHUB_API_PORT}/auth/steam/callback}"
  steam_realm="${FRAGHUB_STEAM_REALM:-}"
  if is_blank "$steam_realm"; then
    if is_blank "${FRAGHUB_DOMAIN:-}"; then
      steam_realm="http://127.0.0.1:${FRAGHUB_API_PORT}"
    else
      steam_realm="https://${FRAGHUB_DOMAIN}"
    fi
  fi

  frontend_url="${FRAGHUB_FRONTEND_URL:-}"
  if is_blank "$frontend_url"; then
    if is_blank "${FRAGHUB_DOMAIN:-}"; then
      frontend_url="http://127.0.0.1:5173"
    else
      frontend_url="https://${FRAGHUB_DOMAIN}"
    fi
  fi

  google_redirect="${FRAGHUB_GOOGLE_REDIRECT_URI:-http://127.0.0.1:${FRAGHUB_API_PORT}/auth/google/callback}"

  google_id="${FRAGHUB_GOOGLE_CLIENT_ID:-}"
  google_secret="${FRAGHUB_GOOGLE_CLIENT_SECRET:-}"
  if is_blank "$google_id" || is_blank "$google_secret"; then
    google_id='replace-me.apps.googleusercontent.com'
    google_secret='replace-me-google-oauth-secret-min-32-chars-long'
    fraghub_log "WARN" "Google OAuth ausente no effective.env; placeholders escritos em ${FRAGHUB_API_ENV_FILE}. Edite antes de usar GET /auth/google."
  fi

  tmp_env="$(mktemp)"
  umask 077
  {
    printf 'PORT=%s\n' "$FRAGHUB_API_PORT"
    printf 'DB_HOST=%s\n' "$db_host"
    printf 'DB_PORT=3306\n'
    printf 'DB_NAME=%s\n' "$db_name"
    printf 'DB_USER=%s\n' "$db_user"
    printf 'DB_PASSWORD=%s\n' "$db_password"
    printf 'NODE_ENV=production\n'
    printf 'LOG_LEVEL=info\n'
    printf 'JWT_SECRET=%s\n' "$jwt_secret"
    printf 'JWT_REFRESH_SECRET=%s\n' "$jwt_refresh"
    printf 'GOOGLE_CLIENT_ID=%s\n' "$google_id"
    printf 'GOOGLE_CLIENT_SECRET=%s\n' "$google_secret"
    printf 'GOOGLE_REDIRECT_URI=%s\n' "$google_redirect"
    printf 'FRONTEND_URL=%s\n' "$frontend_url"
    printf 'STEAM_REALM=%s\n' "$steam_realm"
    printf 'STEAM_RETURN_URL=%s\n' "$steam_return"
    printf 'STEAM_STATE_SECRET=%s\n' "$steam_state"
    printf 'WEBHOOK_SECRET=%s\n' "$webhook_secret"
    if [[ -n "${FRAGHUB_DISCORD_WEBHOOK_URL:-}" ]]; then
      printf 'DISCORD_WEBHOOK_URL=%s\n' "${FRAGHUB_DISCORD_WEBHOOK_URL}"
    fi
  } >"$tmp_env"
  sudo install -o "${FRAGHUB_API_USER}" -g "${FRAGHUB_API_GROUP}" -m 600 "$tmp_env" "$FRAGHUB_API_ENV_FILE"
  rm -f "$tmp_env"

  tmp_example="$(mktemp)"
  cat >"$tmp_example" <<'EOF'
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=fraghub_db
DB_USER=fraghub_app
DB_PASSWORD=<your_password_here>
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=<min_32_chars_random>
JWT_REFRESH_SECRET=<min_32_chars_random_different_from_jwt_secret>
GOOGLE_CLIENT_ID=<google_oauth_client_id>
GOOGLE_CLIENT_SECRET=<google_oauth_client_secret>
GOOGLE_REDIRECT_URI=http://127.0.0.1:3001/auth/google/callback
FRONTEND_URL=http://127.0.0.1:5173
STEAM_REALM=http://127.0.0.1:3001
STEAM_RETURN_URL=http://127.0.0.1:3001/auth/steam/callback
STEAM_STATE_SECRET=<min_32_chars_random_different_from_jwt>
WEBHOOK_SECRET=<min_32_chars_random_for_match_webhook>
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
EOF
  sudo install -o "${FRAGHUB_API_USER}" -g "${FRAGHUB_API_GROUP}" -m 644 "$tmp_example" "${FRAGHUB_API_DIR}/.env.example"
  rm -f "$tmp_example"
}

install_npm_dependencies() {
  sudo -u "${FRAGHUB_API_USER}" -H sh -c "cd '${FRAGHUB_API_DIR}' && npm install --no-audit --no-fund"
}

run_quality_checks() {
  sudo -u "${FRAGHUB_API_USER}" -H sh -c "cd '${FRAGHUB_API_DIR}' && npx tsc --noEmit"
  if [[ "${FRAGHUB_API_SKIP_LINT:-0}" == "1" ]]; then
    fraghub_log "WARN" "FRAGHUB_API_SKIP_LINT=1: a saltar npm run lint (use 0 em CI quando o projeto estiver verde)."
  else
    sudo -u "${FRAGHUB_API_USER}" -H sh -c "cd '${FRAGHUB_API_DIR}' && npm run lint"
  fi
  sudo -u "${FRAGHUB_API_USER}" -H sh -c "cd '${FRAGHUB_API_DIR}' && npm run build"
}

write_systemd_unit() {
  local tmp
  tmp="$(mktemp)"
  cat >"$tmp" <<EOF
[Unit]
Description=FragHub API Service
After=network.target mariadb.service
Requires=mariadb.service

[Service]
Type=simple
User=${FRAGHUB_API_USER}
Group=${FRAGHUB_API_GROUP}
WorkingDirectory=${FRAGHUB_API_DIR}
EnvironmentFile=${FRAGHUB_API_ENV_FILE}
ExecStart=node dist/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
  sudo install -o root -g root -m 644 "$tmp" "/etc/systemd/system/${FRAGHUB_API_SERVICE_NAME}"
  rm -f "$tmp"
}

start_and_verify_service() {
  local attempt=0 max_attempts=20
  sudo systemctl daemon-reload
  sudo systemctl enable "$FRAGHUB_API_SERVICE_NAME"
  sudo systemctl restart "$FRAGHUB_API_SERVICE_NAME"

  while (( attempt < max_attempts )); do
    if curl -fsS "http://127.0.0.1:${FRAGHUB_API_PORT}/health" >/dev/null 2>&1; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  fail "Servico ${FRAGHUB_API_SERVICE_NAME} iniciou, mas /health nao respondeu com sucesso em tempo habil."
}

write_marker() {
  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$API_SETUP_MARKER"
  chmod 600 "$API_SETUP_MARKER" 2>/dev/null || true
}

run_api_setup() {
  command -v sudo >/dev/null 2>&1 || fail "sudo necessario para api-setup."
  fraghub_sudo_noninteractive_ok || fail "sudo sem password nao disponivel. Execute sudo -v ou defina FRAGHUB_SUDO_PASSWORD (ambientes controlados)."

  fraghub_state_init

  local api_status
  api_status="$(fraghub_state_get api_setup)"
  if [[ "$api_status" == "done" ]]; then
    if fraghub_state_verify api_setup; then
      fraghub_log "INFO" "api-setup ja instalado (estado consistente). Nada a fazer."
      echo ""
      echo "==> API Setup: api-setup ja instalado."
      return 0
    fi
    fraghub_log "WARN" "Estado api_setup=done inconsistente com o sistema; reexecutando api-setup."
    fraghub_state_set api_setup "pending"
  fi

  load_effective_env
  check_preconditions
  ensure_directories
  sync_api_template
  write_environment_files
  install_npm_dependencies
  run_quality_checks
  write_systemd_unit
  start_and_verify_service
  write_marker
  fraghub_state_set api_setup "done"

  fraghub_log "INFO" "api-setup concluido. Marcador: ${API_SETUP_MARKER}; estado: ${FRAGHUB_STEPS_FILE}"
  echo ""
  echo "==> API Setup: projeto TypeScript, systemd (${FRAGHUB_API_SERVICE_NAME}) e /health ativos."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_api_setup
fi
