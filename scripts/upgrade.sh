#!/usr/bin/env bash
# FragHub upgrade script — safe upgrade with backup, migration, and rollback support.
# Usage: bash scripts/upgrade.sh [--dry-run] [--skip-backup] [--rollback]
#
# Environment variables (overrides):
#   FRAGHUB_INPUT_DIR      — installer state directory (default: ~/.fraghub/installer)
#   FRAGHUB_API_DIR        — API installation directory (default: /opt/fraghub/api)
#   FRAGHUB_API_SERVICE    — systemd service name (default: fraghub-api.service)
#   FRAGHUB_DB_APP_DEFAULTS — mysql client defaults file
#   FRAGHUB_BACKUP_DIR     — backup root directory (default: /opt/fraghub/backups)
#   FRAGHUB_SKIP_BACKUP    — if set to "1", skip backup step
#   FRAGHUB_DRY_RUN        — if set to "1", dry-run mode (no changes applied)

set -o errexit
set -o nounset
set -o pipefail

# ---------------------------------------------------------------------------
# Constants and defaults
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="${SCRIPT_DIR}/installer"
UPGRADE_VERSION="0.3"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
DB_APP_DEFAULTS="${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}"

FRAGHUB_API_DIR="${FRAGHUB_API_DIR:-/opt/fraghub/api}"
FRAGHUB_API_SERVICE="${FRAGHUB_API_SERVICE:-fraghub-api.service}"
FRAGHUB_BACKUP_DIR="${FRAGHUB_BACKUP_DIR:-/opt/fraghub/backups}"
FRAGHUB_DB_MIGRATIONS_DIR="${FRAGHUB_DB_MIGRATIONS_DIR:-${INSTALLER_DIR}/sql/database}"

SKIP_BACKUP="${FRAGHUB_SKIP_BACKUP:-0}"
DRY_RUN="${FRAGHUB_DRY_RUN:-0}"
ROLLBACK_MODE="0"

LOG_FILE="${LOG_FILE:-/tmp/fraghub-upgrade.log}"
UPGRADE_STATE_FILE="${INPUT_DIR}/upgrade.state"
ROLLBACK_MANIFEST=""

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

log() {
  local level="$1"
  local message="$2"
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  printf '[%s] [%s] %s\n' "$ts" "$level" "$message" | tee -a "$LOG_FILE"
}

fail() {
  local message="$1"
  log "ERROR" "$message"
  {
    printf '\n'
    printf 'Upgrade falhou. Opcoes:\n'
    printf '  1) Verifique o log: %s\n' "$LOG_FILE"
    printf '  2) Corrija a causa raiz.\n'
    printf '  3) Para reverter ao estado anterior: bash scripts/upgrade.sh --rollback\n'
    printf '  4) Para reexecutar: bash scripts/upgrade.sh\n'
  } >&2
  exit 1
}

dry_run_log() {
  local message="$1"
  log "DRY-RUN" "[DRY-RUN] $message"
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN="1"
        log "INFO" "Modo dry-run ativado. Nenhuma alteracao sera aplicada."
        ;;
      --skip-backup)
        SKIP_BACKUP="1"
        log "WARN" "Backup desabilitado via --skip-backup."
        ;;
      --rollback)
        ROLLBACK_MODE="1"
        ;;
      *)
        log "WARN" "Argumento desconhecido ignorado: $1"
        ;;
    esac
    shift
  done
}

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------

check_not_root() {
  if [ "${EUID}" -eq 0 ]; then
    fail "Nao execute o upgrade como root. Use um usuario normal com permissao sudo."
  fi
}

check_sudo_available() {
  command -v sudo >/dev/null 2>&1 || fail "sudo obrigatorio para upgrade."
  if [[ -n "${FRAGHUB_SUDO_PASSWORD:-}" ]]; then
    if ! echo "${FRAGHUB_SUDO_PASSWORD}" | sudo -S -p '' true 2>/dev/null; then
      fail "sudo com FRAGHUB_SUDO_PASSWORD falhou."
    fi
  elif ! sudo -n true 2>/dev/null; then
    fail "Permissao sudo sem prompt nao disponivel. Execute 'sudo -v' ou defina FRAGHUB_SUDO_PASSWORD."
  fi
}

check_git_available() {
  command -v git >/dev/null 2>&1 || fail "git obrigatorio para upgrade."
}

check_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo nao encontrado: ${EFFECTIVE_FILE}. Execute install.sh antes de upgrade."
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
  log "INFO" "Variaveis de ambiente efetivas carregadas de: ${EFFECTIVE_FILE}"
}

check_api_dir() {
  [[ -d "$FRAGHUB_API_DIR" ]] || fail "Diretorio da API nao encontrado: ${FRAGHUB_API_DIR}. Execute install.sh antes de upgrade."
  [[ -f "${FRAGHUB_API_DIR}/package.json" ]] || fail "package.json da API ausente em ${FRAGHUB_API_DIR}."
}

check_db_defaults() {
  [[ -f "$DB_APP_DEFAULTS" ]] || fail "Credenciais de banco ausentes: ${DB_APP_DEFAULTS}. Execute install.sh antes de upgrade."
}

check_systemd_service() {
  if ! command -v systemctl >/dev/null 2>&1; then
    log "WARN" "systemctl nao disponivel. Controle de servico sera ignorado."
    return 0
  fi
  if ! systemctl list-unit-files "$FRAGHUB_API_SERVICE" 2>/dev/null | grep -q "$FRAGHUB_API_SERVICE"; then
    log "WARN" "Servico ${FRAGHUB_API_SERVICE} nao encontrado no systemd. Controle de servico sera ignorado."
  fi
}

run_preconditions() {
  log "INFO" "Verificando pre-condicoes do upgrade..."
  check_not_root
  check_sudo_available
  check_git_available
  check_effective_env
  check_api_dir
  check_db_defaults
  check_systemd_service
  log "INFO" "Pre-condicoes OK."
}

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------

create_backup_dir() {
  local ts
  ts="$(date '+%Y%m%d_%H%M%S')"
  ROLLBACK_MANIFEST="${FRAGHUB_BACKUP_DIR}/${ts}/manifest.env"
  mkdir -p "${FRAGHUB_BACKUP_DIR}/${ts}"
  printf 'BACKUP_TIMESTAMP=%s\n' "$ts" > "$ROLLBACK_MANIFEST"
  log "INFO" "Diretorio de backup: ${FRAGHUB_BACKUP_DIR}/${ts}"
}

backup_database() {
  local backup_ts_dir
  backup_ts_dir="$(dirname "$ROLLBACK_MANIFEST")"
  local db_file="${backup_ts_dir}/fraghub_db.sql.gz"

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "Backup de banco seria criado em: ${db_file}"
    return 0
  fi

  log "INFO" "Iniciando backup do banco de dados..."
  command -v mysqldump >/dev/null 2>&1 || fail "mysqldump obrigatorio para backup de banco."

  mysqldump \
    --defaults-extra-file="$DB_APP_DEFAULTS" \
    --single-transaction \
    --routines \
    --triggers \
    --hex-blob \
    fraghub_db 2>/dev/null | gzip > "$db_file" \
    || fail "Falha ao criar backup do banco de dados."

  printf 'DB_BACKUP_FILE=%s\n' "$db_file" >> "$ROLLBACK_MANIFEST"
  log "INFO" "Backup de banco criado: ${db_file} ($(du -h "$db_file" | cut -f1))"
}

backup_api_dir() {
  local backup_ts_dir
  backup_ts_dir="$(dirname "$ROLLBACK_MANIFEST")"
  local api_archive="${backup_ts_dir}/fraghub_api_dist.tar.gz"
  local api_env_backup="${backup_ts_dir}/fraghub_api.env.bak"

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "Backup de dist/ seria criado em: ${api_archive}"
    return 0
  fi

  log "INFO" "Fazendo backup de dist/ e .env da API..."
  if [[ -d "${FRAGHUB_API_DIR}/dist" ]]; then
    sudo tar czf "$api_archive" -C "$FRAGHUB_API_DIR" dist \
      || fail "Falha ao criar backup de dist/."
    printf 'API_DIST_BACKUP=%s\n' "$api_archive" >> "$ROLLBACK_MANIFEST"
  else
    log "WARN" "dist/ nao encontrado; backup do diretorio de compilacao ignorado."
  fi

  if [[ -f "${FRAGHUB_API_DIR}/.env" ]]; then
    sudo cp "${FRAGHUB_API_DIR}/.env" "$api_env_backup" \
      || fail "Falha ao fazer backup de .env."
    sudo chmod 600 "$api_env_backup"
    printf 'API_ENV_BACKUP=%s\n' "$api_env_backup" >> "$ROLLBACK_MANIFEST"
    log "INFO" "Backup de .env criado: ${api_env_backup}"
  fi
}

backup_installer_state() {
  local backup_ts_dir
  backup_ts_dir="$(dirname "$ROLLBACK_MANIFEST")"
  local state_backup="${backup_ts_dir}/installer_state.tar.gz"

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "Backup do estado de installer seria criado em: ${state_backup}"
    return 0
  fi

  if [[ -d "$INPUT_DIR" ]]; then
    tar czf "$state_backup" -C "$(dirname "$INPUT_DIR")" "$(basename "$INPUT_DIR")" \
      || log "WARN" "Backup do estado do installer falhou (nao critico)."
    printf 'INSTALLER_STATE_BACKUP=%s\n' "$state_backup" >> "$ROLLBACK_MANIFEST"
    log "INFO" "Backup do estado de installer: ${state_backup}"
  fi
}

record_current_version() {
  local current_version=""
  if [[ -f "${FRAGHUB_API_DIR}/package.json" ]]; then
    current_version="$(grep '"version"' "${FRAGHUB_API_DIR}/package.json" | head -1 | grep -o '"[^"]*"' | tail -1 | tr -d '"' || true)"
  fi
  printf 'ROLLBACK_API_VERSION=%s\n' "${current_version:-unknown}" >> "$ROLLBACK_MANIFEST"
  log "INFO" "Versao antes do upgrade: ${current_version:-unknown}"
}

run_backup() {
  if [[ "$SKIP_BACKUP" == "1" ]]; then
    log "WARN" "Backup ignorado (--skip-backup ou FRAGHUB_SKIP_BACKUP=1)."
    ROLLBACK_MANIFEST="/dev/null"
    return 0
  fi

  log "INFO" "Iniciando backup pre-upgrade..."
  create_backup_dir
  record_current_version
  backup_database
  backup_api_dir
  backup_installer_state
  log "INFO" "Backup concluido. Manifesto: ${ROLLBACK_MANIFEST}"
}

# ---------------------------------------------------------------------------
# Service control
# ---------------------------------------------------------------------------

stop_api_service() {
  if ! command -v systemctl >/dev/null 2>&1; then
    return 0
  fi
  if ! systemctl list-unit-files "$FRAGHUB_API_SERVICE" 2>/dev/null | grep -q "$FRAGHUB_API_SERVICE"; then
    return 0
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "sudo systemctl stop ${FRAGHUB_API_SERVICE}"
    return 0
  fi

  log "INFO" "Parando servico ${FRAGHUB_API_SERVICE}..."
  sudo systemctl stop "$FRAGHUB_API_SERVICE" || log "WARN" "Falha ao parar ${FRAGHUB_API_SERVICE} (pode nao estar rodando)."
}

start_api_service() {
  if ! command -v systemctl >/dev/null 2>&1; then
    return 0
  fi
  if ! systemctl list-unit-files "$FRAGHUB_API_SERVICE" 2>/dev/null | grep -q "$FRAGHUB_API_SERVICE"; then
    return 0
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "sudo systemctl start ${FRAGHUB_API_SERVICE}"
    return 0
  fi

  log "INFO" "Iniciando servico ${FRAGHUB_API_SERVICE}..."
  sudo systemctl daemon-reload
  sudo systemctl start "$FRAGHUB_API_SERVICE" \
    || fail "Falha ao iniciar ${FRAGHUB_API_SERVICE} apos upgrade."
}

wait_for_health() {
  local port="${FRAGHUB_API_PORT:-3001}"
  local attempt=0
  local max=20

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "Health check em http://127.0.0.1:${port}/health seria verificado."
    return 0
  fi

  log "INFO" "Aguardando /health em porta ${port}..."
  while (( attempt < max )); do
    if curl -fsS "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
      log "INFO" "/health respondeu OK apos upgrade."
      return 0
    fi
    attempt=$(( attempt + 1 ))
    sleep 1
  done
  fail "/health nao respondeu em ${max}s apos upgrade. Verifique: journalctl -u ${FRAGHUB_API_SERVICE}"
}

# ---------------------------------------------------------------------------
# Code update
# ---------------------------------------------------------------------------

sync_code() {
  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "Sincronizacao de codigo seria executada via rsync."
    return 0
  fi

  log "INFO" "Sincronizando codigo da API para ${FRAGHUB_API_DIR}..."
  local repo_api_dir
  repo_api_dir="$(cd "${SCRIPT_DIR}/../services/fraghub-api" && pwd 2>/dev/null)" \
    || fail "Diretorio services/fraghub-api nao encontrado no repositorio."

  sudo rsync -a \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude '.env' \
    "${repo_api_dir}/" \
    "${FRAGHUB_API_DIR}/" \
    || fail "Falha ao sincronizar codigo via rsync."

  sudo chown -R "${FRAGHUB_API_USER:-fraghub}:${FRAGHUB_API_GROUP:-fraghub}" "$FRAGHUB_API_DIR"
  log "INFO" "Codigo sincronizado."
}

install_dependencies() {
  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "npm install seria executado em ${FRAGHUB_API_DIR}."
    return 0
  fi

  log "INFO" "Instalando/atualizando dependencias npm..."
  sudo -u "${FRAGHUB_API_USER:-fraghub}" -H sh -c \
    "cd '${FRAGHUB_API_DIR}' && npm install --no-audit --no-fund" \
    || fail "Falha ao instalar dependencias npm."
  log "INFO" "Dependencias npm atualizadas."
}

build_api() {
  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "npm run build seria executado em ${FRAGHUB_API_DIR}."
    return 0
  fi

  log "INFO" "Compilando TypeScript..."
  sudo -u "${FRAGHUB_API_USER:-fraghub}" -H sh -c \
    "cd '${FRAGHUB_API_DIR}' && npm run build" \
    || fail "Falha ao compilar TypeScript. Verifique erros de tipagem."
  log "INFO" "Build concluido."
}

# ---------------------------------------------------------------------------
# Database migrations
# ---------------------------------------------------------------------------

mysql_app_exec() {
  local sql="$1"
  mysql --defaults-extra-file="$DB_APP_DEFAULTS" --batch --skip-column-names -e "$sql"
}

mysql_app_exec_file() {
  local file_path="$1"
  local db_name
  db_name="$(awk -F= '/^database=/{print $2}' "$DB_APP_DEFAULTS" | tail -1)"
  mysql --defaults-extra-file="$DB_APP_DEFAULTS" "$db_name" < "$file_path"
}

migration_registered() {
  local version="$1"
  local count
  count="$(mysql_app_exec "SELECT COUNT(*) FROM schema_migrations WHERE version='${version}';" 2>/dev/null || echo "0")"
  [[ "$count" == "1" ]]
}

register_migration() {
  local version="$1"
  local description="$2"
  mysql_app_exec "INSERT INTO schema_migrations (version, applied_at, description) VALUES ('${version}', NOW(), '${description}');"
}

list_pending_migrations() {
  local pending=()
  local version description file_path
  while IFS='|' read -r version description file_path; do
    [[ -n "$version" ]] || continue
    [[ -f "$file_path" ]] || continue
    if ! migration_registered "$version"; then
      pending+=("${version}|${description}|${file_path}")
    fi
  done < <(list_all_migrations)
  printf '%s\n' "${pending[@]:-}"
}

list_all_migrations() {
  local dir="$FRAGHUB_DB_MIGRATIONS_DIR"
  if [[ ! -d "$dir" ]]; then
    return 0
  fi
  while IFS= read -r -d '' sql_file; do
    local basename version description
    basename="$(basename "$sql_file" .sql)"
    version="${basename%%_*}"
    description="${basename#*_}"
    printf '%s|%s|%s\n' "$version" "$description" "$sql_file"
  done < <(find "$dir" -maxdepth 1 -name '*.sql' -print0 | sort -z)
}

run_migrations() {
  if [[ "$DRY_RUN" == "1" ]]; then
    dry_run_log "Migracoes de banco seriam verificadas e aplicadas."
    local pending
    pending="$(list_pending_migrations || true)"
    if [[ -z "$pending" ]]; then
      dry_run_log "Nenhuma migracao pendente encontrada."
    else
      dry_run_log "Migracoes pendentes que seriam aplicadas:"
      while IFS= read -r line; do
        [[ -n "$line" ]] && dry_run_log "  ${line%%|*}: ${line#*|}"
      done <<< "$pending"
    fi
    return 0
  fi

  log "INFO" "Verificando e aplicando migracoes de banco..."

  # Ensure schema_migrations table exists
  mysql_app_exec "CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(128) PRIMARY KEY,
    applied_at DATETIME NOT NULL,
    description VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;" \
    || fail "Falha ao garantir tabela schema_migrations."

  local applied_count=0
  local version description file_path
  while IFS='|' read -r version description file_path; do
    [[ -n "$version" ]] || continue
    [[ -f "$file_path" ]] || { log "WARN" "Arquivo de migracao nao encontrado: ${file_path}; ignorando."; continue; }

    if migration_registered "$version"; then
      log "INFO" "Migracao ${version} ja aplicada; pulando."
      continue
    fi

    log "INFO" "Aplicando migracao ${version}: ${description}..."
    mysql_app_exec_file "$file_path" \
      || fail "Falha ao aplicar migracao ${version}. Estado do banco pode estar inconsistente."
    register_migration "$version" "$description"
    applied_count=$(( applied_count + 1 ))
    log "INFO" "Migracao ${version} aplicada."
  done < <(list_all_migrations)

  if (( applied_count == 0 )); then
    log "INFO" "Nenhuma migracao nova a aplicar."
  else
    log "INFO" "${applied_count} migracao(oes) aplicada(s)."
  fi
}

# ---------------------------------------------------------------------------
# Rollback
# ---------------------------------------------------------------------------

find_latest_backup() {
  local latest
  latest="$(find "$FRAGHUB_BACKUP_DIR" -maxdepth 2 -name 'manifest.env' -print 2>/dev/null | sort -r | head -1)"
  printf '%s' "${latest:-}"
}

rollback_api_dist() {
  local manifest="$1"
  local api_archive
  api_archive="$(grep '^API_DIST_BACKUP=' "$manifest" | cut -d= -f2- || true)"
  if [[ -z "$api_archive" || ! -f "$api_archive" ]]; then
    log "WARN" "Nenhum backup de dist/ encontrado no manifesto. Rollback de dist/ ignorado."
    return 0
  fi
  log "INFO" "Restaurando dist/ de: ${api_archive}..."
  sudo tar xzf "$api_archive" -C "$FRAGHUB_API_DIR" \
    || fail "Falha ao restaurar dist/ do backup."
  sudo chown -R "${FRAGHUB_API_USER:-fraghub}:${FRAGHUB_API_GROUP:-fraghub}" "${FRAGHUB_API_DIR}/dist"
  log "INFO" "dist/ restaurado com sucesso."
}

rollback_api_env() {
  local manifest="$1"
  local env_backup
  env_backup="$(grep '^API_ENV_BACKUP=' "$manifest" | cut -d= -f2- || true)"
  if [[ -z "$env_backup" || ! -f "$env_backup" ]]; then
    log "WARN" "Nenhum backup de .env encontrado no manifesto. Rollback de .env ignorado."
    return 0
  fi
  log "INFO" "Restaurando .env de: ${env_backup}..."
  sudo cp "$env_backup" "${FRAGHUB_API_DIR}/.env"
  sudo chmod 600 "${FRAGHUB_API_DIR}/.env"
  log "INFO" ".env restaurado com sucesso."
}

rollback_database() {
  local manifest="$1"
  local db_backup
  db_backup="$(grep '^DB_BACKUP_FILE=' "$manifest" | cut -d= -f2- || true)"
  if [[ -z "$db_backup" || ! -f "$db_backup" ]]; then
    log "WARN" "Nenhum backup de banco encontrado no manifesto. Rollback de banco ignorado."
    return 0
  fi

  log "WARN" "Rollback de banco requer restauracao de dump SQL completo."
  log "WARN" "ATENCAO: Esta operacao sobrescreve todos os dados desde o backup!"

  local db_name
  db_name="$(awk -F= '/^database=/{print $2}' "$DB_APP_DEFAULTS" | tail -1)"
  [[ -n "$db_name" ]] || fail "Nome do banco nao encontrado em ${DB_APP_DEFAULTS}."

  log "INFO" "Restaurando banco ${db_name} de: ${db_backup}..."
  zcat "$db_backup" | mysql --defaults-extra-file="$DB_APP_DEFAULTS" "$db_name" \
    || fail "Falha ao restaurar banco de dados."
  log "INFO" "Banco restaurado com sucesso."
}

run_rollback() {
  log "INFO" "Iniciando rollback..."

  local manifest
  manifest="$(find_latest_backup)"
  if [[ -z "$manifest" ]]; then
    fail "Nenhum backup encontrado em ${FRAGHUB_BACKUP_DIR}. Rollback impossivel."
  fi

  log "INFO" "Usando backup: $(dirname "$manifest")"
  log "INFO" "Manifesto: ${manifest}"

  stop_api_service

  rollback_api_dist "$manifest"
  rollback_api_env "$manifest"
  rollback_database "$manifest"

  start_api_service
  wait_for_health

  log "INFO" "Rollback concluido com sucesso."
  printf '\n'
  printf 'Sistema restaurado ao estado anterior. Manifesto: %s\n' "$manifest"
}

# ---------------------------------------------------------------------------
# Upgrade state tracking
# ---------------------------------------------------------------------------

write_upgrade_state() {
  local state="$1"
  mkdir -p "$(dirname "$UPGRADE_STATE_FILE")"
  printf 'UPGRADE_STATE=%s\n' "$state" > "$UPGRADE_STATE_FILE"
  printf 'UPGRADE_TS=%s\n' "$(date -Iseconds)" >> "$UPGRADE_STATE_FILE"
  printf 'UPGRADE_VERSION=%s\n' "$UPGRADE_VERSION" >> "$UPGRADE_STATE_FILE"
  [[ -n "$ROLLBACK_MANIFEST" ]] && \
    printf 'ROLLBACK_MANIFEST=%s\n' "$ROLLBACK_MANIFEST" >> "$UPGRADE_STATE_FILE"
}

# ---------------------------------------------------------------------------
# Main upgrade flow
# ---------------------------------------------------------------------------

run_upgrade() {
  log "INFO" "Iniciando upgrade FragHub (v${UPGRADE_VERSION})..."
  [[ "$DRY_RUN" == "1" ]] && log "INFO" "*** MODO DRY-RUN — nenhuma alteracao sera aplicada ***"

  write_upgrade_state "started"
  run_backup
  stop_api_service
  sync_code
  install_dependencies
  build_api
  run_migrations
  start_api_service
  wait_for_health
  write_upgrade_state "completed"

  log "INFO" "Upgrade concluido com sucesso."
  printf '\n'
  printf '==> FragHub upgrade (v%s) concluido!\n' "$UPGRADE_VERSION"
  [[ "$SKIP_BACKUP" != "1" ]] && printf '    Backup disponivel em: %s\n' "$(dirname "${ROLLBACK_MANIFEST:-/dev/null}")"
  printf '    Para reverter: bash scripts/upgrade.sh --rollback\n'
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

: > "$LOG_FILE"
parse_args "${@:-}"

if [[ "$ROLLBACK_MODE" == "1" ]]; then
  run_preconditions
  run_rollback
else
  run_preconditions
  run_upgrade
fi
