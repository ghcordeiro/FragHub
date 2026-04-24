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
  command -v python3 >/dev/null 2>&1 || fail "python3 e necessario para resolver URLs de releases GitHub."
  command -v unzip >/dev/null 2>&1 || fail "unzip e necessario para extrair plugins CS2."

  local free_mb
  free_mb="$(df -Pm "${FRAGHUB_GAME_ROOT}" | awk 'NR==2 {print $4}')"
  [[ "${free_mb:-0}" =~ ^[0-9]+$ ]] || fail "Nao foi possivel validar espaco em disco."
  (( free_mb >= 3072 )) || fail "Espaco insuficiente para plugins+demos (${free_mb}MB, minimo: 3072MB)."
  # Accept 403 (rate-limited but reachable); only fail on timeout/DNS (code 000).
  local gh_http
  gh_http="$(curl -sSIL -o /dev/null -w '%{http_code}' --max-time 10 https://api.github.com 2>/dev/null || true)"
  [[ "${gh_http}" == "000" ]] && fail "Sem conectividade com GitHub releases (timeout/DNS)."
  mysql_app_exec "SELECT 1;" >/dev/null || fail "Conexao ao banco via fraghub_app falhou."
  fraghub_lgsm_game_csgo_dir >/dev/null ||
    fail "Diretorio game/csgo do servidor nao encontrado (tentou-se \${LGSM}/\${FRAGHUB_CS2_INSTANCE}/serverfiles/game/csgo e \${LGSM}/serverfiles/game/csgo). Conclua game_bootstrap ou defina FRAGHUB_LGSM_GAME_CSGO_ROOT."
}

fraghub_gh_auth_header() {
  [[ -n "${GITHUB_TOKEN:-}" ]] && printf '%s' "Authorization: Bearer ${GITHUB_TOKEN}" || printf ''
}

latest_tag() {
  local repo="$1"
  local tag auth_header curl_args=()
  auth_header="$(fraghub_gh_auth_header)"
  [[ -n "$auth_header" ]] && curl_args+=(-H "$auth_header")
  tag="$(curl -fsSL "${curl_args[@]}" "https://api.github.com/repos/${repo}/releases/latest" 2>/dev/null \
    | sed -nE 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/p' | head -n1 || true)"
  [[ -n "${tag}" ]] || tag="unknown"
  printf '%s' "$tag"
}

fraghub_chown_game_tree() {
  local tree="$1"
  [[ -d "$tree" ]] || return 0
  chown -R "${FRAGHUB_INSTALL_USER}:${FRAGHUB_INSTALL_USER}" "$tree" 2>/dev/null || true
}

# Install a plugin whose ZIP root is `addons/` — copies into game/csgo/addons/
install_addons_zip_plugin() {
  local name="$1"
  local url="$2"
  local dst="$3"

  [[ "${FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD:-0}" == "1" ]] && {
    fraghub_log "WARN" "FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD=1: a saltar download de ${name}."
    return 0
  }

  local tmp unst
  tmp="$(mktemp -d)"
  unst="${tmp}/extract"
  mkdir -p "$unst"
  fraghub_log "INFO" "A descarregar ${name}..."
  curl -fsSL "$url" -o "${tmp}/plugin.zip"
  unzip -q -o "${tmp}/plugin.zip" -d "$unst"
  [[ -d "${unst}/addons" ]] || fail "Pacote ${name} invalido: falta addons/ no ZIP."
  mkdir -p "${dst}/addons"
  cp -a "${unst}/addons/." "${dst}/addons/"
  fraghub_chown_game_tree "${dst}/addons/counterstrikesharp"
  rm -rf "$tmp"
  fraghub_log "INFO" "${name} instalado em ${dst}/addons/"
}

fraghub_curl_gh_api() {
  local url="$1"
  local auth_header curl_args=()
  auth_header="$(fraghub_gh_auth_header)"
  [[ -n "$auth_header" ]] && curl_args+=(-H "$auth_header")
  curl -fsSL "${curl_args[@]}" "$url"
}

install_cs2_anybaselib_release() {
  local url
  url="$(fraghub_curl_gh_api "https://api.github.com/repos/NickFox007/AnyBaseLibCS2/releases/latest" 2>/dev/null \
    | sed -nE 's/.*"browser_download_url":[[:space:]]*"([^"]+AnyBaseLib\.zip)".*/\1/p' | head -n1)"
  [[ -n "$url" ]] || fail "Falha ao obter URL do AnyBaseLibCS2 (GitHub)."
  local dst
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."
  install_addons_zip_plugin "AnyBaseLibCS2" "$url" "$dst"
}

install_cs2_playersettings_release() {
  local url
  url="$(fraghub_curl_gh_api "https://api.github.com/repos/NickFox007/PlayerSettingsCS2/releases/latest" 2>/dev/null \
    | sed -nE 's/.*"browser_download_url":[[:space:]]*"([^"]+PlayerSettings\.zip)".*/\1/p' | head -n1)"
  [[ -n "$url" ]] || fail "Falha ao obter URL do PlayerSettingsCS2 (GitHub)."
  local dst
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."
  install_addons_zip_plugin "PlayerSettingsCS2" "$url" "$dst"
}

install_cs2_menumanager_release() {
  local url
  url="$(fraghub_curl_gh_api "https://api.github.com/repos/NickFox007/MenuManagerCS2/releases/latest" 2>/dev/null \
    | sed -nE 's/.*"browser_download_url":[[:space:]]*"([^"]+MenuManager\.zip)".*/\1/p' | head -n1)"
  [[ -n "$url" ]] || fail "Falha ao obter URL do MenuManagerCS2 (GitHub)."
  local dst
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."
  install_addons_zip_plugin "MenuManagerCS2" "$url" "$dst"
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

# WeaponPaints requer que o seu weaponpaints.json exista em gamedata/ E que as
# suas assinaturas estejam mergeadas no gamedata.json principal (CSS <v300 nao
# carrega gamedata de plugins automaticamente).
configure_weaponpaints_gamedata() {
  local dst="$1"
  local gamedata_dir="${dst}/addons/counterstrikesharp/gamedata"
  local gamedata_json="${gamedata_dir}/gamedata.json"
  local wp_gamedata="${dst}/addons/counterstrikesharp/plugins/WeaponPaints/gamedata/weaponpaints.json"

  [[ -f "$wp_gamedata" ]] || { fraghub_log "WARN" "weaponpaints.json nao encontrado no plugin; a saltar."; return 0; }

  # Copia o ficheiro standalone para gamedata/ (necessario para CSS carregar)
  cp -f "$wp_gamedata" "${gamedata_dir}/weaponpaints.json"
  fraghub_log "INFO" "weaponpaints.json copiado para ${gamedata_dir}/."

  # Merge das assinaturas no gamedata.json principal
  [[ -f "$gamedata_json" ]] || { fraghub_log "WARN" "gamedata.json nao encontrado; a saltar merge."; return 0; }
  python3 - "$gamedata_json" "$wp_gamedata" <<'PYEOF'
import json, sys, shutil
gamedata_path, wp_path = sys.argv[1], sys.argv[2]
shutil.copy2(gamedata_path, gamedata_path + ".bak")
with open(gamedata_path) as f:
    gamedata = json.load(f)
with open(wp_path) as f:
    wp_gamedata = json.load(f)
added = [k for k in wp_gamedata if k not in gamedata]
gamedata.update(wp_gamedata)
with open(gamedata_path, "w") as f:
    json.dump(gamedata, f, indent=2)
if added:
    print(f"[WeaponPaints] Adicionadas {len(added)} entradas ao gamedata.json: {', '.join(added)}")
else:
    print("[WeaponPaints] gamedata.json ja estava atualizado.")
PYEOF
  fraghub_log "INFO" "Merge gamedata WeaponPaints concluido."
}

# WeaponPaints usa APIs internas do CS2 (knife apply, gloves) que requerem
# FollowCS2ServerGuidelines=false — sem isto os comandos nao funcionam.
configure_css_core() {
  local dst="$1"
  local core_json="${dst}/addons/counterstrikesharp/configs/core.json"

  [[ -f "$core_json" ]] || { fraghub_log "WARN" "core.json nao encontrado; a saltar configuracao."; return 0; }

  python3 - "$core_json" <<'PYEOF'
import json, sys
path = sys.argv[1]
with open(path) as f:
    d = json.load(f)
if not d.get("FollowCS2ServerGuidelines") == False:
    d["FollowCS2ServerGuidelines"] = False
    with open(path, "w") as f:
        json.dump(d, f, indent=4)
    print(f"[CSS] FollowCS2ServerGuidelines definido como false em {path}")
else:
    print(f"[CSS] FollowCS2ServerGuidelines ja era false.")
PYEOF
  fraghub_log "INFO" "CSS core.json configurado."
}

configure_demo_recorder() {
  local owner_user
  owner_user="${FRAGHUB_INSTALL_USER:-$(id -un)}"
  # Dirs may already exist from initial install (e.g. during plugin recovery).
  # Only run privileged mkdir/chown when they are absent.
  if [[ ! -d "$FRAGHUB_DEMOS_CS2_DIR" ]] || [[ ! -d "$FRAGHUB_STATE_DIR" ]]; then
    command -v sudo >/dev/null 2>&1 || fail "sudo necessario para provisionar diretorios em /opt."
    fraghub_sudo_noninteractive_ok || fail "sudo sem password nao disponivel. Execute sudo -v ou defina FRAGHUB_SUDO_PASSWORD (ambientes controlados)."
    sudo mkdir -p "$FRAGHUB_DEMOS_CS2_DIR"
    sudo mkdir -p "$FRAGHUB_STATE_DIR"
    sudo chown -R "$owner_user":"$owner_user" "$FRAGHUB_DEMOS_CS2_DIR" "$FRAGHUB_STATE_DIR"
    sudo chmod 750 "$FRAGHUB_DEMOS_CS2_DIR"
  fi

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
  local sa_version="$1"
  local wp_version="$2"
  local anybaselib_version="$3"
  local playersettings_version="$4"
  local menumanager_version="$5"
  mkdir -p "$(dirname "$FRAGHUB_CS2_MANIFEST")"
  cat >"$FRAGHUB_CS2_MANIFEST" <<EOF
{
  "generated_at": "$(date -Iseconds)",
  "plugins": [
    {"name":"AnyBaseLibCS2","version":"${anybaselib_version}"},
    {"name":"PlayerSettingsCS2","version":"${playersettings_version}"},
    {"name":"MenuManagerCS2","version":"${menumanager_version}"},
    {"name":"CS2-SimpleAdmin","version":"${sa_version}","schema":"plgcs2_simpleadmin_001"},
    {"name":"WeaponPaints","version":"${wp_version}","schema":"plgcs2_weaponpaints_001"}
  ]
}
EOF
  chmod 600 "$FRAGHUB_CS2_MANIFEST"
}

verify_installation() {
  local dst
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."
  local css="${dst}/addons/counterstrikesharp"
  local core_json="${css}/configs/core.json"

  # Dependencias do WeaponPaints
  [[ -f "${css}/shared/AnyBaseLib/AnyBaseLib.dll" ]] ||
    fail "AnyBaseLib.dll ausente em shared/AnyBaseLib/."
  [[ -f "${css}/plugins/PlayerSettings/PlayerSettings.dll" ]] ||
    fail "PlayerSettings.dll ausente em plugins/PlayerSettings/."
  [[ -f "${css}/plugins/MenuManagerCore/MenuManagerCore.dll" ]] ||
    fail "MenuManagerCore.dll ausente em plugins/MenuManagerCore/."

  # Plugins principais
  [[ -f "${css}/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.dll" ]] ||
    fail "CS2-SimpleAdmin.dll ausente em plugins/CS2-SimpleAdmin/."
  [[ -f "${css}/plugins/WeaponPaints/WeaponPaints.dll" ]] ||
    fail "WeaponPaints.dll ausente em plugins/WeaponPaints/."

  # Configs
  [[ -f "${css}/configs/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.json" ]] ||
    fail "Config CS2-SimpleAdmin ausente."
  [[ -f "${css}/configs/plugins/WeaponPaints/WeaponPaints.json" ]] ||
    fail "Config WeaponPaints ausente."

  # Gamedata
  [[ -f "${css}/gamedata/weaponpaints.json" ]] ||
    fail "weaponpaints.json ausente em gamedata/."
  python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
sys.exit(0 if 'CAttributeList_SetOrAddAttributeValueByName' in d else 1)
" "${css}/gamedata/gamedata.json" ||
    fail "Assinatura CAttributeList_SetOrAddAttributeValueByName ausente em gamedata.json."

  # CSS core (algumas versoes nao materializam core.json por defeito)
  if [[ -f "$core_json" ]]; then
    python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
sys.exit(0 if d.get('FollowCS2ServerGuidelines') == False else 1)
" "$core_json" ||
      fail "FollowCS2ServerGuidelines nao esta definido como false em core.json."
  else
    fraghub_log "WARN" "core.json ausente em ${core_json}; verificação de FollowCS2ServerGuidelines ignorada."
  fi

  # Infra
  [[ -d "$FRAGHUB_DEMOS_CS2_DIR" ]] || fail "Diretorio de demos ausente."
  [[ -f "$FRAGHUB_CS2_MANIFEST" ]] || fail "Manifesto CS2 ausente."

  # Tabelas DB
  local count
  count="$(mysql_app_exec "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FRAGHUB_DB_NAME}' AND table_name IN ('sa_admins','sa_bans','wp_player_skins','wp_player_knife','wp_player_gloves','wp_player_agents','wp_player_music','wp_player_pins');")"
  [[ "$count" == "8" ]] || fail "Tabelas dos plugins CS2 incompletas (esperadas 8: sa_admins, sa_bans, wp_player_skins, wp_player_knife, wp_player_gloves, wp_player_agents, wp_player_music, wp_player_pins)."
}

run_plugins_extended_cs2() {
  load_effective_env
  require_preconditions
  fraghub_log "INFO" "Iniciando plugins estendidos CS2."

  local sa_version wp_version anybaselib_version playersettings_version menumanager_version dst
  anybaselib_version="$(latest_tag "NickFox007/AnyBaseLibCS2")"
  playersettings_version="$(latest_tag "NickFox007/PlayerSettingsCS2")"
  menumanager_version="$(latest_tag "NickFox007/MenuManagerCS2")"
  sa_version="$(latest_tag "daffyyyy/CS2-SimpleAdmin")"
  wp_version="$(latest_tag "Nereziel/cs2-WeaponPaints")"
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado."

  # Dependencias do WeaponPaints (ordem obrigatoria: AnyBaseLib -> PlayerSettings -> MenuManager)
  install_cs2_anybaselib_release
  install_cs2_playersettings_release
  install_cs2_menumanager_release

  # CS2-SimpleAdmin
  install_cs2_simpleadmin_release
  write_config_if_missing "${dst}/addons/counterstrikesharp/configs/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.json" "{
  \"host\": \"127.0.0.1\",
  \"database\": \"${FRAGHUB_DB_NAME}\",
  \"username\": \"fraghub_app\",
  \"password\": \"${FRAGHUB_DB_PASSWORD}\"
}"
  ensure_schema_migration "plgcs2_simpleadmin_001" "cs2 simpleadmin schema" "$SQL_SIMPLEADMIN"

  # WeaponPaints
  install_cs2_weaponpaints_release
  write_config_if_missing "${dst}/addons/counterstrikesharp/configs/plugins/WeaponPaints/WeaponPaints.json" "{
  \"DatabaseHost\": \"127.0.0.1\",
  \"DatabasePort\": 3306,
  \"DatabaseUser\": \"fraghub_app\",
  \"DatabasePassword\": \"${FRAGHUB_DB_PASSWORD}\",
  \"DatabaseName\": \"${FRAGHUB_DB_NAME}\",
  \"Website\": \"\",
  \"KnifeEnabled\": true,
  \"GloveEnabled\": true,
  \"AgentEnabled\": true,
  \"MusicEnabled\": true,
  \"PinsEnabled\": true,
  \"StickerInfo\": true,
  \"KeyChainInfo\": true,
  \"StatTrak\": true,
  \"CmdRefreshCooldownSeconds\": 5
}"
  ensure_schema_migration "plgcs2_weaponpaints_001" "cs2 weaponpaints schema" "$SQL_WEAPONPAINTS"
  configure_weaponpaints_gamedata "$dst"
  configure_css_core "$dst"

  configure_demo_recorder
  write_manifest "$sa_version" "$wp_version" "$anybaselib_version" "$playersettings_version" "$menumanager_version"
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
