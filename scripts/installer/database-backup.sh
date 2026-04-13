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
DATABASE_BACKUP_MARKER="${FRAGHUB_DATABASE_BACKUP_MARKER:-${INPUT_DIR}/database-backup.done}"

FRAGHUB_DB_NAME="${FRAGHUB_DB_NAME:-fraghub_db}"
FRAGHUB_DB_BACKUP_USER="${FRAGHUB_DB_BACKUP_USER:-fraghub_backup}"
FRAGHUB_DB_BACKUP_HOST="${FRAGHUB_DB_BACKUP_HOST:-127.0.0.1}"
FRAGHUB_INSTALL_USER="${FRAGHUB_INSTALL_USER:-$(id -un)}"
FRAGHUB_DB_BACKUP_PASSWORD_FILE="${FRAGHUB_DB_BACKUP_PASSWORD_FILE:-${INPUT_DIR}/db-backup-password.env}"
FRAGHUB_MYCNF_PATH="${FRAGHUB_MYCNF_PATH:-/home/${FRAGHUB_INSTALL_USER}/.my.cnf}"
FRAGHUB_BACKUP_SCRIPT="${FRAGHUB_BACKUP_SCRIPT:-/opt/fraghub/scripts/db-backup.sh}"
FRAGHUB_BACKUP_DIR="${FRAGHUB_BACKUP_DIR:-/opt/fraghub/backups/db}"
FRAGHUB_BACKUP_LOG="${FRAGHUB_BACKUP_LOG:-/opt/fraghub/logs/db-backup.log}"

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/database-backup.sh"
  exit 1
}

generate_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n=+/' | cut -c1-24
  else
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | cut -c1-24
  fi
}

load_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo em falta: ${EFFECTIVE_FILE}."
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
}

load_or_create_backup_secret() {
  if [[ -f "$FRAGHUB_DB_BACKUP_PASSWORD_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$FRAGHUB_DB_BACKUP_PASSWORD_FILE"
  fi
  if [[ -z "${FRAGHUB_DB_BACKUP_PASSWORD:-}" ]]; then
    FRAGHUB_DB_BACKUP_PASSWORD="$(generate_password)"
    mkdir -p "$INPUT_DIR"
    umask 077
    printf 'FRAGHUB_DB_BACKUP_PASSWORD=%q\n' "$FRAGHUB_DB_BACKUP_PASSWORD" >"$FRAGHUB_DB_BACKUP_PASSWORD_FILE"
    chmod 600 "$FRAGHUB_DB_BACKUP_PASSWORD_FILE"
  fi
}

precheck() {
  [[ "$FRAGHUB_INSTALL_USER" != "root" ]] || fail "Backup deve operar com usuario nao-root."
  [[ -f "$DATABASE_BASELINE_MARKER" ]] || fail "Dependencia ausente: database-baseline nao concluido."
  command -v mysql >/dev/null 2>&1 || fail "mysql client nao encontrado."
  command -v mysqldump >/dev/null 2>&1 || fail "mysqldump nao encontrado."
  command -v gzip >/dev/null 2>&1 || fail "gzip nao encontrado."
  command -v crontab >/dev/null 2>&1 || fail "crontab nao encontrado."
  command -v sudo >/dev/null 2>&1 || fail "sudo necessario para database-backup."
  fraghub_sudo_noninteractive_ok || fail "sudo sem password nao disponivel. Execute sudo -v ou defina FRAGHUB_SUDO_PASSWORD (ambientes controlados)."

  if command -v systemctl >/dev/null 2>&1; then
    systemctl is-active --quiet mariadb || fail "MariaDB inativo."
  fi

  local free_mb
  free_mb="$(df -Pm /opt | awk 'NR==2 {print $4}')"
  [[ "${free_mb:-0}" =~ ^[0-9]+$ ]] || fail "Nao foi possivel validar espaco em disco."
  (( free_mb >= 5120 )) || fail "Espaco insuficiente para backup (${free_mb}MB, minimo recomendado: 5120MB)."

  sudo mysql --protocol=socket --batch --skip-column-names -e "USE \`${FRAGHUB_DB_NAME}\`; SELECT 1 FROM schema_migrations LIMIT 1;" >/dev/null || fail "Banco ${FRAGHUB_DB_NAME} ou tabela schema_migrations nao acessivel."
}

mysql_root_exec() {
  local sql="$1"
  sudo mysql --protocol=socket --batch --skip-column-names -e "$sql"
}

ensure_backup_db_user() {
  mysql_root_exec "CREATE USER IF NOT EXISTS '${FRAGHUB_DB_BACKUP_USER}'@'${FRAGHUB_DB_BACKUP_HOST}' IDENTIFIED BY '${FRAGHUB_DB_BACKUP_PASSWORD}';"
  mysql_root_exec "ALTER USER '${FRAGHUB_DB_BACKUP_USER}'@'${FRAGHUB_DB_BACKUP_HOST}' IDENTIFIED BY '${FRAGHUB_DB_BACKUP_PASSWORD}';"
  mysql_root_exec "REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${FRAGHUB_DB_BACKUP_USER}'@'${FRAGHUB_DB_BACKUP_HOST}';"
  mysql_root_exec "GRANT SELECT, LOCK TABLES ON \`${FRAGHUB_DB_NAME}\`.* TO '${FRAGHUB_DB_BACKUP_USER}'@'${FRAGHUB_DB_BACKUP_HOST}';"
  mysql_root_exec "FLUSH PRIVILEGES;"
}

ensure_my_cnf() {
  local tmp
  tmp="$(mktemp)"
  umask 077
  {
    printf '[mysqldump]\n'
    printf 'host=%s\n' "$FRAGHUB_DB_BACKUP_HOST"
    printf 'user=%s\n' "$FRAGHUB_DB_BACKUP_USER"
    printf 'password=%s\n' "$FRAGHUB_DB_BACKUP_PASSWORD"
    printf 'database=%s\n' "$FRAGHUB_DB_NAME"
  } >"$tmp"
  sudo install -o "$FRAGHUB_INSTALL_USER" -g "$FRAGHUB_INSTALL_USER" -m 600 "$tmp" "$FRAGHUB_MYCNF_PATH"
  rm -f "$tmp"
}

ensure_backup_script() {
  local tmp
  tmp="$(mktemp)"
  cat >"$tmp" <<EOF
#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

DEFAULTS_FILE="${FRAGHUB_MYCNF_PATH}"
BACKUP_DIR="${FRAGHUB_BACKUP_DIR}"
LOG_FILE="${FRAGHUB_BACKUP_LOG}"
DB_NAME="${FRAGHUB_DB_NAME}"
MIN_FREE_MB=500

mkdir -p "\${BACKUP_DIR}"
mkdir -p "\$(dirname "\${LOG_FILE}")"
chmod 700 "\${BACKUP_DIR}"

ts="\$(date '+%Y-%m-%d %H:%M:%S')"
free_mb="\$(df -Pm "\${BACKUP_DIR}" | awk 'NR==2 {print \$4}')"
if [[ ! "\${free_mb}" =~ ^[0-9]+$ ]] || (( free_mb < MIN_FREE_MB )); then
  printf '[%s] [FAILURE] free_mb=%s reason=insufficient-space\\n' "\${ts}" "\${free_mb:-unknown}" >>"\${LOG_FILE}"
  exit 12
fi

outfile="\${BACKUP_DIR}/fraghub_db_\$(date '+%Y%m%d_%H%M%S').sql.gz"
set +e
mysqldump --defaults-file="\${DEFAULTS_FILE}" "\${DB_NAME}" | gzip -9 >"\${outfile}"
rc=\$?
set -e
if (( rc != 0 )); then
  printf '[%s] [FAILURE] exit_code=%s file=%s\\n' "\${ts}" "\${rc}" "\${outfile}" >>"\${LOG_FILE}"
  rm -f "\${outfile}" 2>/dev/null || true
  exit "\${rc}"
fi

size_bytes="\$(stat -c '%s' "\${outfile}" 2>/dev/null || echo 0)"
if (( size_bytes <= 0 )); then
  printf '[%s] [FAILURE] exit_code=13 file=%s reason=empty-backup\\n' "\${ts}" "\${outfile}" >>"\${LOG_FILE}"
  rm -f "\${outfile}" 2>/dev/null || true
  exit 13
fi

find "\${BACKUP_DIR}" -type f -name 'fraghub_db_*.sql.gz' -mtime +7 -delete
printf '[%s] [SUCCESS] file=%s size_bytes=%s\\n' "\${ts}" "\${outfile}" "\${size_bytes}" >>"\${LOG_FILE}"
EOF

  sudo install -o "$FRAGHUB_INSTALL_USER" -g "$FRAGHUB_INSTALL_USER" -m 700 "$tmp" "$FRAGHUB_BACKUP_SCRIPT"
  rm -f "$tmp"
}

ensure_paths() {
  sudo mkdir -p "$FRAGHUB_BACKUP_DIR" "$(dirname "$FRAGHUB_BACKUP_SCRIPT")" "$(dirname "$FRAGHUB_BACKUP_LOG")"
  sudo chown "$FRAGHUB_INSTALL_USER":"$FRAGHUB_INSTALL_USER" "$FRAGHUB_BACKUP_DIR" "$(dirname "$FRAGHUB_BACKUP_LOG")"
  sudo chmod 700 "$FRAGHUB_BACKUP_DIR" "$(dirname "$FRAGHUB_BACKUP_LOG")"
}

ensure_cron() {
  local cron_line
  local current
  cron_line="0 3 * * * ${FRAGHUB_BACKUP_SCRIPT}"
  current="$(crontab -l 2>/dev/null || true)"
  if printf '%s\n' "$current" | rg -F -q "$cron_line"; then
    fraghub_log "INFO" "Cron de backup ja registrado; pulando."
    return 0
  fi
  { printf '%s\n' "$current"; printf '%s\n' "$cron_line"; } | sed '/^[[:space:]]*$/d' | crontab -
}

run_manual_backup_validation() {
  sudo -u "$FRAGHUB_INSTALL_USER" "$FRAGHUB_BACKUP_SCRIPT" || fail "Execucao manual do backup falhou."

  local newest
  newest="$(rg --files -g 'fraghub_db_*.sql.gz' "$FRAGHUB_BACKUP_DIR" | head -n1 || true)"
  [[ -n "$newest" ]] || fail "Nenhum arquivo de backup .sql.gz gerado."
  [[ -s "$newest" ]] || fail "Backup gerado vazio: ${newest}."
  rg -F -q "[SUCCESS]" "$FRAGHUB_BACKUP_LOG" || fail "Log de backup sem registro de SUCCESS."
}

write_marker() {
  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$DATABASE_BACKUP_MARKER"
  chmod 600 "$DATABASE_BACKUP_MARKER" 2>/dev/null || true
}

run_database_backup() {
  load_effective_env
  load_or_create_backup_secret
  precheck
  ensure_paths
  ensure_backup_db_user
  ensure_my_cnf
  ensure_backup_script
  ensure_cron
  run_manual_backup_validation
  write_marker
  fraghub_log "INFO" "database-backup concluido. Marcador: ${DATABASE_BACKUP_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_database_backup
fi
