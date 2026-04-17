#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"
# shellcheck source=lib/cs2-extended-download.sh
source "${SCRIPT_DIR}/lib/cs2-extended-download.sh"
# shellcheck source=lib/lgsm-paths.sh
source "${SCRIPT_DIR}/lib/lgsm-paths.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
PLUGINS_CS2_MARKER="${FRAGHUB_PLUGINS_CS2_MARKER:-${INPUT_DIR}/plugins-cs2.done}"
DATABASE_BASELINE_MARKER="${FRAGHUB_DATABASE_BASELINE_MARKER:-${INPUT_DIR}/database-baseline.done}"
PLUGINS_EXTENDED_CS2_MARKER="${FRAGHUB_PLUGINS_EXTENDED_CS2_MARKER:-${INPUT_DIR}/plugins-extended-cs2.done}"

FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
FRAGHUB_CS2_INSTANCE="${FRAGHUB_CS2_INSTANCE:-cs2server}"
FRAGHUB_INSTALL_USER="${FRAGHUB_INSTALL_USER:-$(id -un)}"
CS2_PLUGIN_ROOT="${FRAGHUB_CS2_PLUGIN_ROOT:-${FRAGHUB_GAME_ROOT}/cs2/plugins}"
FRAGHUB_DEMOS_CS2_DIR="${FRAGHUB_DEMOS_CS2_DIR:-/opt/fraghub/demos/cs2}"
FRAGHUB_STATE_DIR="${FRAGHUB_STATE_DIR:-/opt/fraghub/state}"
FRAGHUB_MATCHZY_HOOK_FILE="${FRAGHUB_MATCHZY_HOOK_FILE:-${FRAGHUB_STATE_DIR}/matchzy-on-match-end.cfg}"
FRAGHUB_CS2_MANIFEST="${FRAGHUB_CS2_MANIFEST:-${FRAGHUB_STATE_DIR}/plugins-cs2.json}"
FRAGHUB_DB_APP_DEFAULTS="${FRAGHUB_DB_APP_DEFAULTS:-${INPUT_DIR}/mysql-app.cnf}"
FRAGHUB_DB_NAME="${FRAGHUB_DB_NAME:-fraghub_db}"

SQL_SIMPLEADMIN="${SCRIPT_DIR}/sql/plugins-cs2/001_simpleadmin.sql"
SQL_WEAPONPAINTS="${SCRIPT_DIR}/sql/plugins-cs2/001_weaponpaints.sql"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/plugins-extended-cs2.sh"
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
  [[ -f "$PLUGINS_CS2_MARKER" ]] || fail "Dependencia ausente: plugins-cs2 baseline nao concluido."
  [[ -f "$DATABASE_BASELINE_MARKER" ]] || fail "Dependencia ausente: database-baseline nao concluido."
  [[ -f "${CS2_PLUGIN_ROOT}/metamod/.installed" ]] || fail "MetaMod CS2 nao detectado."
  [[ -f "${CS2_PLUGIN_ROOT}/counterstrikesharp/.installed" ]] || fail "CounterStrikeSharp nao detectado."
  [[ -f "${CS2_PLUGIN_ROOT}/matchzy/.installed" ]] || fail "MatchZy nao detectado."
  command -v mysql >/dev/null 2>&1 || fail "mysql client nao encontrado."
  command -v curl >/dev/null 2>&1 || fail "curl nao encontrado."

  local free_mb
  free_mb="$(df -Pm "${FRAGHUB_GAME_ROOT}" | awk 'NR==2 {print $4}')"
  [[ "${free_mb:-0}" =~ ^[0-9]+$ ]] || fail "Nao foi possivel validar espaco em disco."
  (( free_mb >= 3072 )) || fail "Espaco insuficiente para plugins+demos (${free_mb}MB, minimo: 3072MB)."
  curl -fsSIL https://api.github.com >/dev/null || fail "Sem conectividade com GitHub releases."
  mysql_app_exec "SELECT 1;" >/dev/null || fail "Conexao ao banco via fraghub_app falhou."
  command -v python3 >/dev/null 2>&1 || fail "python3 e necessario para resolver URLs de releases GitHub."
  command -v unzip >/dev/null 2>&1 || fail "unzip e necessario para extrair plugins CS2."
  fraghub_lgsm_game_csgo_dir >/dev/null ||
    fail "Diretorio game/csgo do servidor nao encontrado (tentou-se \${LGSM}/\${FRAGHUB_CS2_INSTANCE}/serverfiles/game/csgo e \${LGSM}/serverfiles/game/csgo). Conclua game_bootstrap ou defina FRAGHUB_LGSM_GAME_CSGO_ROOT."
}

latest_tag() {
  local repo="$1"
  local tag
  tag="$(curl -fsSL "https://api.github.com/repos/${repo}/releases/latest" 2>/dev/null | sed -nE 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/p' | head -n1 || true)"
  [[ -n "${tag}" ]] || tag="unknown"
  printf '%s' "$tag"
}

fraghub_chown_game_tree() {
  local tree="$1"
  [[ -d "$tree" ]] || return 0
  chown -R "${FRAGHUB_INSTALL_USER}:${FRAGHUB_INSTALL_USER}" "$tree" 2>/dev/null || true
}

install_cs2_simpleadmin_release() {
  [[ "${FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD:-0}" == "1" ]] && {
    fraghub_log "WARN" "FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD=1: a saltar download do CS2-SimpleAdmin."
    return 0
  }
  local url tmp unst dst
  url="$(fraghub_github_cs2_simpleadmin_zip_url)" || fail "Falha ao obter URL do release CS2-SimpleAdmin (GitHub)."
  tmp="$(mktemp -d)"
  unst="${tmp}/extract"
  mkdir -p "$unst"
  fraghub_log "INFO" "A descarregar CS2-SimpleAdmin (GitHub)..."
  curl -fsSL "$url" -o "${tmp}/cs2-simpleadmin.zip"
  unzip -q -o "${tmp}/cs2-simpleadmin.zip" -d "$unst"
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."
  [[ -d "${unst}/counterstrikesharp" ]] || fail "Pacote CS2-SimpleAdmin invalido: falta counterstrikesharp/ no ZIP."
  mkdir -p "${dst}/addons"
  cp -a "${unst}/counterstrikesharp/." "${dst}/addons/counterstrikesharp/"
  fraghub_chown_game_tree "${dst}/addons/counterstrikesharp"
  rm -rf "$tmp"
  fraghub_log "INFO" "CS2-SimpleAdmin extraido para ${dst}/addons/counterstrikesharp/"
}

install_cs2_weaponpaints_release() {
  [[ "${FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD:-0}" == "1" ]] && {
    fraghub_log "WARN" "FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD=1: a saltar download do WeaponPaints."
    return 0
  }
  local url tmp unst dst
  url="$(fraghub_github_weaponpaints_zip_url)" || fail "Falha ao obter URL do release WeaponPaints (GitHub)."
  tmp="$(mktemp -d)"
  unst="${tmp}/extract"
  mkdir -p "$unst"
  fraghub_log "INFO" "A descarregar WeaponPaints (GitHub)..."
  curl -fsSL "$url" -o "${tmp}/weaponpaints.zip"
  unzip -q -o "${tmp}/weaponpaints.zip" -d "$unst"
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."
  [[ -d "${unst}/WeaponPaints" ]] || fail "Pacote WeaponPaints invalido: falta WeaponPaints/ no ZIP."
  mkdir -p "${dst}/addons/counterstrikesharp/plugins/WeaponPaints"
  cp -a "${unst}/WeaponPaints/." "${dst}/addons/counterstrikesharp/plugins/WeaponPaints/"
  fraghub_chown_game_tree "${dst}/addons/counterstrikesharp/plugins/WeaponPaints"
  rm -rf "$tmp"
  fraghub_log "INFO" "WeaponPaints extraido para ${dst}/addons/counterstrikesharp/plugins/WeaponPaints/"
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

configure_demo_recorder() {
  local owner_user
  owner_user="${FRAGHUB_INSTALL_USER:-$(id -un)}"
  command -v sudo >/dev/null 2>&1 || fail "sudo necessario para provisionar diretorios em /opt."
  fraghub_sudo_noninteractive_ok || fail "sudo sem password nao disponivel. Execute sudo -v ou defina FRAGHUB_SUDO_PASSWORD (ambientes controlados)."
  sudo mkdir -p "$FRAGHUB_DEMOS_CS2_DIR"
  sudo mkdir -p "$FRAGHUB_STATE_DIR"
  sudo chown -R "$owner_user":"$owner_user" "$FRAGHUB_DEMOS_CS2_DIR" "$FRAGHUB_STATE_DIR"
  sudo chmod 750 "$FRAGHUB_DEMOS_CS2_DIR"

  cat >"$FRAGHUB_MATCHZY_HOOK_FILE" <<EOF
# MatchZy demo hook (FragHub)
# Nao gravar demos para estados diferentes de finished/abandoned.
on_match_end_if_status=finished,abandoned
demo_autorecord=1
demo_output_dir=${FRAGHUB_DEMOS_CS2_DIR}
EOF
  chmod 600 "$FRAGHUB_MATCHZY_HOOK_FILE"
}

write_manifest() {
  local simpleadmin_version="$1"
  local weaponpaints_version="$2"
  mkdir -p "$(dirname "$FRAGHUB_CS2_MANIFEST")"
  cat >"$FRAGHUB_CS2_MANIFEST" <<EOF
{
  "generated_at": "$(date -Iseconds)",
  "plugins": [
    {"name":"CS2-SimpleAdmin","version":"${simpleadmin_version}","schema":"plgcs2_simpleadmin_001"},
    {"name":"WeaponPaints","version":"${weaponpaints_version}","schema":"plgcs2_weaponpaints_001"}
  ]
}
EOF
  chmod 600 "$FRAGHUB_CS2_MANIFEST"
}

verify_installation() {
  local dst
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."
  [[ -f "${dst}/addons/counterstrikesharp/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.dll" ]] ||
    fail "CS2-SimpleAdmin.dll ausente em addons/counterstrikesharp/plugins/ (servidor CS2)."
  [[ -f "${dst}/addons/counterstrikesharp/plugins/WeaponPaints/WeaponPaints.dll" ]] ||
    fail "WeaponPaints.dll ausente em addons/counterstrikesharp/plugins/WeaponPaints/."
  [[ -f "${dst}/addons/counterstrikesharp/configs/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.json" ]] ||
    fail "Config CS2-SimpleAdmin ausente (JSON em configs/plugins)."
  [[ -f "${dst}/addons/counterstrikesharp/configs/plugins/WeaponPaints/WeaponPaints.json" ]] ||
    fail "Config WeaponPaints ausente (JSON em configs/plugins)."
  [[ -d "$FRAGHUB_DEMOS_CS2_DIR" ]] || fail "Diretorio de demos ausente."
  [[ -f "$FRAGHUB_CS2_MANIFEST" ]] || fail "Manifesto CS2 ausente."

  local count
  count="$(mysql_app_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FRAGHUB_DB_NAME}' AND table_name IN ('sa_admins','sa_bans','wp_player_skins');")"
  [[ "$count" == "3" ]] || fail "Tabelas dos plugins CS2 nao encontradas por completo."
}

run_plugins_extended_cs2() {
  load_effective_env
  require_preconditions
  fraghub_log "INFO" "Iniciando plugins estendidos CS2 (PLGCS2-REQ-001..009)."

  local sa_version wp_version dst
  sa_version="$(latest_tag "daffyyyy/CS2-SimpleAdmin")"
  wp_version="$(latest_tag "Nereziel/cs2-WeaponPaints")"
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."

  install_cs2_simpleadmin_release
  write_config_if_missing "${dst}/addons/counterstrikesharp/configs/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.json" "{
  \"host\": \"127.0.0.1\",
  \"database\": \"${FRAGHUB_DB_NAME}\",
  \"username\": \"fraghub_app\",
  \"password\": \"${FRAGHUB_DB_PASSWORD}\"
}"
  ensure_schema_migration "plgcs2_simpleadmin_001" "cs2 simpleadmin schema" "$SQL_SIMPLEADMIN"

  install_cs2_weaponpaints_release
  write_config_if_missing "${dst}/addons/counterstrikesharp/configs/plugins/WeaponPaints/WeaponPaints.json" "{
  \"host\": \"127.0.0.1\",
  \"database\": \"${FRAGHUB_DB_NAME}\",
  \"username\": \"fraghub_app\",
  \"password\": \"${FRAGHUB_DB_PASSWORD}\"
}"
  ensure_schema_migration "plgcs2_weaponpaints_001" "cs2 weaponpaints schema" "$SQL_WEAPONPAINTS"

  configure_demo_recorder
  write_manifest "$sa_version" "$wp_version"
  fraghub_chown_game_tree "${dst}/addons/counterstrikesharp"
  verify_installation

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$PLUGINS_EXTENDED_CS2_MARKER"
  chmod 600 "$PLUGINS_EXTENDED_CS2_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "plugins-extended-cs2 concluido. Marcador: ${PLUGINS_EXTENDED_CS2_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_plugins_extended_cs2
fi
