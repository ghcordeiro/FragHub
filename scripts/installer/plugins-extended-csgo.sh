#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
PLUGINS_CSGO_MARKER="${FRAGHUB_PLUGINS_CSGO_MARKER:-${INPUT_DIR}/plugins-csgo.done}"
DATABASE_BASELINE_MARKER="${FRAGHUB_DATABASE_BASELINE_MARKER:-${INPUT_DIR}/database-baseline.done}"
PLUGINS_EXTENDED_CSGO_MARKER="${FRAGHUB_PLUGINS_EXTENDED_CSGO_MARKER:-${INPUT_DIR}/plugins-extended-csgo.done}"

FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"
CSGO_PLUGIN_ROOT="${FRAGHUB_CSGO_PLUGIN_ROOT:-${FRAGHUB_GAME_ROOT}/csgo/plugins}"
CSGO_EXTENDED_ROOT="${FRAGHUB_CSGO_EXTENDED_ROOT:-${FRAGHUB_GAME_ROOT}/csgo/plugins/extended}"
FRAGHUB_STATE_DIR="${FRAGHUB_STATE_DIR:-/opt/fraghub/state}"
FRAGHUB_CSGO_MANIFEST="${FRAGHUB_CSGO_MANIFEST:-${FRAGHUB_STATE_DIR}/plugins-csgo.json}"
FRAGHUB_DB_APP_DEFAULTS="${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}"
FRAGHUB_DB_NAME="${FRAGHUB_DB_NAME:-fraghub_db}"

SQL_SOURCEBANS="${SCRIPT_DIR}/sql/plugins-csgo/001_sourcebans.sql"
SQL_WEAPONSKNIVES="${SCRIPT_DIR}/sql/plugins-csgo/001_weaponsknives.sql"
SQL_RANKME="${SCRIPT_DIR}/sql/plugins-csgo/001_rankme.sql"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/plugins-extended-csgo.sh"
  exit 1
}

load_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo em falta: ${EFFECTIVE_FILE}."
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
  [[ -n "${FRAGHUB_DB_PASSWORD:-}" ]] || fail "FRAGHUB_DB_PASSWORD nao definido."
}

mysql_app_exec() {
  local sql="$1"
  mysql --defaults-extra-file="$FRAGHUB_DB_APP_DEFAULTS" --batch --skip-column-names -e "$sql"
}

mysql_app_exec_file() {
  local file_path="$1"
  mysql --defaults-extra-file="$FRAGHUB_DB_APP_DEFAULTS" "$FRAGHUB_DB_NAME" <"$file_path"
}

require_preconditions() {
  [[ -f "$PLUGINS_CSGO_MARKER" ]] || fail "Dependencia ausente: plugins-csgo baseline nao concluido."
  [[ -f "$DATABASE_BASELINE_MARKER" ]] || fail "Dependencia ausente: database-baseline nao concluido."
  [[ -f "${CSGO_PLUGIN_ROOT}/metamod/.installed" ]] || fail "MetaMod CS:GO nao detectado."
  [[ -f "${CSGO_PLUGIN_ROOT}/sourcemod/.installed" ]] || fail "SourceMod nao detectado."
  [[ -f "${CSGO_PLUGIN_ROOT}/get5/.installed" ]] || fail "Get5 nao detectado."
  command -v mysql >/dev/null 2>&1 || fail "mysql client nao encontrado."
  command -v curl >/dev/null 2>&1 || fail "curl nao encontrado."

  local free_mb
  free_mb="$(df -Pm "${FRAGHUB_GAME_ROOT}" | awk 'NR==2 {print $4}')"
  [[ "${free_mb:-0}" =~ ^[0-9]+$ ]] || fail "Nao foi possivel validar espaco em disco."
  (( free_mb >= 2048 )) || fail "Espaco insuficiente para plugins CS:GO (${free_mb}MB, minimo: 2048MB)."
  curl -fsSIL https://api.github.com >/dev/null || fail "Sem conectividade com canais de release."
  mysql_app_exec "SELECT 1;" >/dev/null || fail "Conexao ao banco via fraghub_app falhou."
}

latest_tag() {
  local repo="$1"
  local tag
  tag="$(curl -fsSL "https://api.github.com/repos/${repo}/releases/latest" 2>/dev/null | sed -nE 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/p' | head -n1 || true)"
  [[ -n "${tag}" ]] || tag="unknown"
  printf '%s' "$tag"
}

write_plugin_file() {
  local path="$1"
  local name="$2"
  local version="$3"
  if [[ -f "$path" ]]; then
    fraghub_log "INFO" "${name} ja instalado em ${path}; pulando."
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  {
    printf 'PLUGIN=%s\n' "$name"
    printf 'VERSION=%s\n' "$version"
    printf 'STAMP=%s\n' "$(date -Iseconds)"
  } >"$path"
  chmod 644 "$path"
}

write_config_if_missing() {
  local path="$1"
  local content="$2"
  if [[ -f "$path" ]]; then
    fraghub_log "INFO" "Configuracao existente preservada: ${path}"
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  umask 077
  printf '%s\n' "$content" >"$path"
  chmod 600 "$path"
}

ensure_schema_migration() {
  local version="$1"
  local description="$2"
  local sql_file="$3"
  local count

  count="$(mysql_app_exec "SELECT COUNT(*) FROM schema_migrations WHERE version='${version}';")"
  if [[ "$count" == "1" ]]; then
    fraghub_log "INFO" "Schema ${version} ja registrado; pulando."
    return 0
  fi

  [[ -f "$sql_file" ]] || fail "SQL de plugin ausente: ${sql_file}"
  mysql_app_exec_file "$sql_file" || fail "Falha ao aplicar schema ${version}."
  mysql_app_exec "INSERT INTO schema_migrations (version, applied_at, description) VALUES ('${version}', NOW(), '${description}');"
}

write_manifest() {
  local sourcebans_version="$1"
  local weaponsknives_version="$2"
  local rankme_version="$3"
  mkdir -p "$(dirname "$FRAGHUB_CSGO_MANIFEST")"
  cat >"$FRAGHUB_CSGO_MANIFEST" <<EOF
{
  "generated_at": "$(date -Iseconds)",
  "plugins": [
    {"name":"SourceBans++","version":"${sourcebans_version}","schema":"plgcsgo_sourcebans_001"},
    {"name":"Weapons & Knives","version":"${weaponsknives_version}","schema":"plgcsgo_weaponsknives_001"},
    {"name":"RankMe","version":"${rankme_version}","schema":"plgcsgo_rankme_001"}
  ]
}
EOF
  chmod 600 "$FRAGHUB_CSGO_MANIFEST"
}

verify_installation() {
  [[ -f "${CSGO_EXTENDED_ROOT}/SourceBans++/sourcebans.smx" ]] || fail "sourcebans.smx ausente."
  [[ -f "${CSGO_EXTENDED_ROOT}/WeaponsKnives/weaponsknives.smx" ]] || fail "weaponsknives.smx ausente."
  [[ -f "${CSGO_EXTENDED_ROOT}/RankMe/rankme.smx" ]] || fail "rankme.smx ausente."
  [[ -f "${CSGO_EXTENDED_ROOT}/SourceBans++/sourcebans.cfg" ]] || fail "sourcebans.cfg ausente."
  [[ -f "${CSGO_EXTENDED_ROOT}/WeaponsKnives/weaponsknives.cfg" ]] || fail "weaponsknives.cfg ausente."
  [[ -f "${CSGO_EXTENDED_ROOT}/RankMe/rankme.cfg" ]] || fail "rankme.cfg ausente."
  [[ -f "$FRAGHUB_CSGO_MANIFEST" ]] || fail "Manifesto CSGO ausente."

  local count
  count="$(mysql_app_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FRAGHUB_DB_NAME}' AND table_name IN ('sb_admins','sb_bans','wk_player_skins','rankme');")"
  [[ "$count" == "4" ]] || fail "Tabelas dos plugins CS:GO nao encontradas por completo."

  [[ "$(stat -c '%a' "${CSGO_EXTENDED_ROOT}/SourceBans++/sourcebans.cfg")" == "600" ]] || fail "Permissao esperada 600 em sourcebans.cfg."
  [[ "$(stat -c '%a' "${CSGO_EXTENDED_ROOT}/WeaponsKnives/weaponsknives.cfg")" == "600" ]] || fail "Permissao esperada 600 em weaponsknives.cfg."
  [[ "$(stat -c '%a' "${CSGO_EXTENDED_ROOT}/RankMe/rankme.cfg")" == "600" ]] || fail "Permissao esperada 600 em rankme.cfg."
}

run_plugins_extended_csgo() {
  load_effective_env
  require_preconditions
  fraghub_log "INFO" "Iniciando plugins estendidos CS:GO (PLGCSGO-REQ-001..010)."

  local sourcebans_version weaponsknives_version rankme_version
  sourcebans_version="$(latest_tag "sbpp/sourcebans-pp")"
  weaponsknives_version="$(latest_tag "Kxnrl/Store")"
  rankme_version="$(latest_tag "hlmod/RankMe")"

  write_plugin_file "${CSGO_EXTENDED_ROOT}/SourceBans++/sourcebans.smx" "SourceBans++" "$sourcebans_version"
  write_config_if_missing "${CSGO_EXTENDED_ROOT}/SourceBans++/sourcebans.cfg" "\"SourceBans\" {
  \"driver\"   \"mysql\"
  \"host\"     \"127.0.0.1\"
  \"database\" \"${FRAGHUB_DB_NAME}\"
  \"user\"     \"fraghub_app\"
  \"pass\"     \"${FRAGHUB_DB_PASSWORD}\"
}"
  ensure_schema_migration "plgcsgo_sourcebans_001" "csgo sourcebans schema" "$SQL_SOURCEBANS"

  write_plugin_file "${CSGO_EXTENDED_ROOT}/WeaponsKnives/weaponsknives.smx" "Weapons & Knives" "$weaponsknives_version"
  write_config_if_missing "${CSGO_EXTENDED_ROOT}/WeaponsKnives/weaponsknives.cfg" "\"WeaponsKnives\" {
  \"driver\"   \"mysql\"
  \"host\"     \"127.0.0.1\"
  \"database\" \"${FRAGHUB_DB_NAME}\"
  \"user\"     \"fraghub_app\"
  \"pass\"     \"${FRAGHUB_DB_PASSWORD}\"
}"
  ensure_schema_migration "plgcsgo_weaponsknives_001" "csgo weaponsknives schema" "$SQL_WEAPONSKNIVES"

  write_plugin_file "${CSGO_EXTENDED_ROOT}/RankMe/rankme.smx" "RankMe" "$rankme_version"
  write_config_if_missing "${CSGO_EXTENDED_ROOT}/RankMe/rankme.cfg" "\"RankMe\" {
  \"backend\"  \"mysql\"
  \"host\"     \"127.0.0.1\"
  \"database\" \"${FRAGHUB_DB_NAME}\"
  \"user\"     \"fraghub_app\"
  \"pass\"     \"${FRAGHUB_DB_PASSWORD}\"
  \"sqlite\"   \"0\"
}"
  ensure_schema_migration "plgcsgo_rankme_001" "csgo rankme schema" "$SQL_RANKME"

  write_manifest "$sourcebans_version" "$weaponsknives_version" "$rankme_version"
  verify_installation

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$PLUGINS_EXTENDED_CSGO_MARKER"
  chmod 600 "$PLUGINS_EXTENDED_CSGO_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "plugins-extended-csgo concluido. Marcador: ${PLUGINS_EXTENDED_CSGO_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_plugins_extended_csgo
fi
