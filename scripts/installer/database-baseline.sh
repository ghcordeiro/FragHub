#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
DATABASE_BASELINE_MARKER="${FRAGHUB_DATABASE_BASELINE_MARKER:-${INPUT_DIR}/database-baseline.done}"

FRAGHUB_DB_NAME="${FRAGHUB_DB_NAME:-fraghub_db}"
FRAGHUB_DB_APP_USER="${FRAGHUB_DB_APP_USER:-fraghub_app}"
FRAGHUB_DB_APP_HOST="${FRAGHUB_DB_APP_HOST:-127.0.0.1}"
FRAGHUB_DB_CONF_FILE="${FRAGHUB_DB_CONF_FILE:-/etc/mysql/conf.d/fraghub.cnf}"
FRAGHUB_DB_APP_DEFAULTS="${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}"
FRAGHUB_DB_MIGRATIONS_DIR="${FRAGHUB_DB_MIGRATIONS_DIR:-${SCRIPT_DIR}/sql/database}"

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/database-baseline.sh"
  exit 1
}

load_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo nao encontrado: ${EFFECTIVE_FILE}. Execute secrets.sh antes."
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
  [[ -n "${FRAGHUB_DB_PASSWORD:-}" ]] || fail "FRAGHUB_DB_PASSWORD nao definido no cofre (${EFFECTIVE_FILE})."
}

require_ubuntu_lts_x64() {
  [[ "$(uname -s)" == "Linux" ]] || fail "database-baseline suportada apenas em Linux."
  [[ "$(uname -m)" == "x86_64" ]] || fail "Arquitetura nao suportada: $(uname -m). Esperado: x86_64."
  [[ -f /etc/os-release ]] || fail "/etc/os-release nao encontrado."
  # shellcheck disable=SC1091
  . /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] || fail "Distribuicao nao suportada: ${ID:-desconhecida}. Esperado: Ubuntu LTS."
  case "${VERSION_ID:-}" in
    22.04|24.04) ;;
    *) fail "Versao Ubuntu nao suportada: ${VERSION_ID:-desconhecida}. Esperado: 22.04 ou 24.04." ;;
  esac
}

check_port_3306_conflict() {
  if ss -ltn "( sport = :3306 )" | grep -q ":3306"; then
    if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet mariadb; then
      fraghub_log "INFO" "Porta 3306 ocupada pelo proprio MariaDB ativo; seguir."
      return 0
    fi
    fail "Pre-condicao falhou: porta 3306 em uso por processo nao verificado como MariaDB."
  fi
}

check_disk_datadir() {
  local datadir
  local avail_mb
  datadir="/var/lib/mysql"
  [[ -d "$datadir" ]] || datadir="/var/lib"
  avail_mb="$(df -Pm "$datadir" | awk 'NR==2 {print $4}')"
  [[ "${avail_mb:-0}" =~ ^[0-9]+$ ]] || fail "Nao foi possivel obter espaco livre em ${datadir}."
  if (( avail_mb < 2048 )); then
    fail "Pre-condicao falhou: espaco livre insuficiente em ${datadir} (${avail_mb}MB, minimo: 2048MB)."
  fi
}

run_precheck() {
  fraghub_log "INFO" "Iniciando pre-check de banco (DBASE-REQ-001)."
  require_ubuntu_lts_x64
  command -v ss >/dev/null 2>&1 || fail "Comando ss nao encontrado para validar porta 3306."
  command -v df >/dev/null 2>&1 || fail "Comando df nao encontrado para validar espaco em disco."
  check_port_3306_conflict
  check_disk_datadir
  fraghub_log "INFO" "Pre-check de banco concluido com sucesso."
}

configure_mariadb_local_bind() {
  local tmp
  tmp="$(mktemp)"
  {
    printf '[mysqld]\n'
    printf 'bind-address = 127.0.0.1\n'
  } >"$tmp"
  sudo install -o root -g root -m 644 "$tmp" "$FRAGHUB_DB_CONF_FILE"
  rm -f "$tmp"
}

install_mariadb() {
  fraghub_log "INFO" "Instalando/configurando MariaDB (DBASE-REQ-002)."
  command -v sudo >/dev/null 2>&1 || fail "sudo necessario para database-baseline."
  sudo -n true 2>/dev/null || fail "sudo sem password nao disponivel. Execute sudo -v antes."

  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  sudo apt-get install -y mariadb-server mariadb-client

  configure_mariadb_local_bind
  sudo systemctl daemon-reload || true
  sudo systemctl enable --now mariadb
  if ! systemctl is-active --quiet mariadb; then
    fail "MariaDB nao esta ativo apos instalacao/configuracao."
  fi
}

mysql_root_exec() {
  local sql="$1"
  sudo mysql --protocol=socket --batch --skip-column-names -e "$sql"
}

write_app_defaults_file() {
  local tmp
  tmp="$(mktemp)"
  umask 077
  {
    printf '[client]\n'
    printf 'host=%s\n' "$FRAGHUB_DB_APP_HOST"
    printf 'user=%s\n' "$FRAGHUB_DB_APP_USER"
    printf 'password=%s\n' "${FRAGHUB_DB_PASSWORD}"
    printf 'database=%s\n' "$FRAGHUB_DB_NAME"
  } >"$tmp"
  mkdir -p "$INPUT_DIR"
  install -m 600 "$tmp" "$FRAGHUB_DB_APP_DEFAULTS"
  rm -f "$tmp"
}

mysql_app_exec() {
  local sql="$1"
  mysql --defaults-extra-file="$FRAGHUB_DB_APP_DEFAULTS" --batch --skip-column-names -e "$sql"
}

mysql_app_exec_file() {
  local file_path="$1"
  mysql --defaults-extra-file="$FRAGHUB_DB_APP_DEFAULTS" "$FRAGHUB_DB_NAME" <"$file_path"
}

provision_db_and_app_user() {
  fraghub_log "INFO" "Provisionando banco e usuario de aplicacao (DBASE-REQ-003)."
  mysql_root_exec "CREATE DATABASE IF NOT EXISTS \`${FRAGHUB_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql_root_exec "CREATE USER IF NOT EXISTS '${FRAGHUB_DB_APP_USER}'@'${FRAGHUB_DB_APP_HOST}' IDENTIFIED BY '${FRAGHUB_DB_PASSWORD}';"
  mysql_root_exec "ALTER USER '${FRAGHUB_DB_APP_USER}'@'${FRAGHUB_DB_APP_HOST}' IDENTIFIED BY '${FRAGHUB_DB_PASSWORD}';"
  mysql_root_exec "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON \`${FRAGHUB_DB_NAME}\`.* TO '${FRAGHUB_DB_APP_USER}'@'${FRAGHUB_DB_APP_HOST}';"
  mysql_root_exec "FLUSH PRIVILEGES;"
  write_app_defaults_file
}

ensure_schema_migrations() {
  mysql_app_exec "CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(128) PRIMARY KEY,
    applied_at DATETIME NOT NULL,
    description VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
}

migration_registered() {
  local version="$1"
  local count
  count="$(mysql_app_exec "SELECT COUNT(*) FROM schema_migrations WHERE version='${version}';")"
  [[ "$count" == "1" ]]
}

register_migration() {
  local version="$1"
  local description="$2"
  mysql_app_exec "INSERT INTO schema_migrations (version, applied_at, description) VALUES ('${version}', NOW(), '${description}');"
}

apply_migrations() {
  fraghub_log "INFO" "Aplicando migracoes versionadas (DBASE-REQ-004/005)."
  ensure_schema_migrations

  local version description file_path
  while IFS='|' read -r version description file_path; do
    [[ -n "$version" ]] || continue
    [[ -f "$file_path" ]] || fail "Migracao ausente: ${file_path}"

    if migration_registered "$version"; then
      fraghub_log "INFO" "Migracao ${version} ja aplicada; pulando."
      continue
    fi

    mysql_app_exec_file "$file_path" || fail "Falha ao aplicar migracao ${version} (${description})."
    register_migration "$version" "$description"
    fraghub_log "INFO" "Migracao aplicada: ${version} (${description})."
  done <<EOF
001|create_users|${FRAGHUB_DB_MIGRATIONS_DIR}/001_create_users.sql
002|create_matches|${FRAGHUB_DB_MIGRATIONS_DIR}/002_create_matches.sql
003|create_stats|${FRAGHUB_DB_MIGRATIONS_DIR}/003_create_stats.sql
EOF
}

verify_post_install() {
  fraghub_log "INFO" "Executando verificacao pos-instalacao (DBASE-REQ-006)."
  mysql_app_exec "SELECT 1;" >/dev/null

  local table_name count
  for table_name in schema_migrations users matches stats; do
    count="$(mysql_app_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FRAGHUB_DB_NAME}' AND table_name='${table_name}';")"
    [[ "$count" == "1" ]] || fail "Tabela obrigatoria ausente: ${table_name}."
  done

  count="$(mysql_app_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FRAGHUB_DB_NAME}' AND table_name IN ('schema_migrations','users','matches','stats') AND table_collation='utf8mb4_unicode_ci';")"
  [[ "$count" == "4" ]] || fail "Collation esperado (utf8mb4_unicode_ci) nao confirmado em todas as tabelas nucleares."
}

write_marker() {
  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$DATABASE_BASELINE_MARKER"
  chmod 600 "$DATABASE_BASELINE_MARKER" 2>/dev/null || true
}

run_database_baseline() {
  load_effective_env
  run_precheck
  install_mariadb
  provision_db_and_app_user
  apply_migrations
  verify_post_install
  write_marker
  fraghub_log "INFO" "database-baseline concluido. Marcador: ${DATABASE_BASELINE_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_database_baseline
fi
