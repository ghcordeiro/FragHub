#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"
# shellcheck source=lib/lgsm-paths.sh
source "${SCRIPT_DIR}/lib/lgsm-paths.sh"
# shellcheck source=lib/cs2-extended-download.sh
source "${SCRIPT_DIR}/lib/cs2-extended-download.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
GAME_BOOTSTRAP_MARKER="${FRAGHUB_GAME_BOOTSTRAP_MARKER:-${INPUT_DIR}/game-bootstrap.done}"
PLUGINS_CS2_MARKER="${FRAGHUB_PLUGINS_CS2_MARKER:-${INPUT_DIR}/plugins-cs2.done}"
FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"
FRAGHUB_INSTALL_USER="${FRAGHUB_INSTALL_USER:-$(id -un)}"

CS2_PLUGIN_ROOT="${FRAGHUB_GAME_ROOT}/cs2/plugins"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  exit 1
}

require_bootstrap() {
  [[ -f "$GAME_BOOTSTRAP_MARKER" ]] || fail "Dependencia ausente: game_bootstrap nao concluido (${GAME_BOOTSTRAP_MARKER})."
}

require_tools() {
  command -v curl >/dev/null 2>&1 || fail "curl nao encontrado."
  command -v unzip >/dev/null 2>&1 || fail "unzip nao encontrado."
  command -v tar >/dev/null 2>&1 || fail "tar nao encontrado."
  command -v python3 >/dev/null 2>&1 || fail "python3 necessario para resolver URLs de release."
}

load_effective_env() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo em falta: ${EFFECTIVE_FILE}."
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a
}

fraghub_tags_api_base_url() {
  if [[ -n "${FRAGHUB_TAGS_API_URL:-}" ]]; then
    printf '%s' "${FRAGHUB_TAGS_API_URL}"
    return 0
  fi
  local d="${FRAGHUB_DOMAIN:-}"
  if [[ -n "$d" ]]; then
    if [[ "$d" == http://* ]] || [[ "$d" == https://* ]]; then
      printf '%s' "$d"
    else
      printf 'https://%s' "$d"
    fi
    return 0
  fi
  printf 'http://127.0.0.1:%s' "${FRAGHUB_API_PORT:-3001}"
}

fraghub_chown_game_subtree() {
  local tree="$1"
  [[ -d "$tree" ]] || return 0
  chown -R "${FRAGHUB_INSTALL_USER}:${FRAGHUB_INSTALL_USER}" "$tree" 2>/dev/null || true
}

install_plugin_marker() {
  local plugin_name="$1"
  local plugin_dir="${CS2_PLUGIN_ROOT}/${plugin_name}"
  mkdir -p "$plugin_dir"
  umask 077
  {
    printf 'PLUGIN=%s\n' "$plugin_name"
    printf 'GAME=cs2\n'
    printf 'STAMP=%s\n' "$(date -Iseconds)"
  } >"${plugin_dir}/.installed"
  chmod 600 "${plugin_dir}/.installed"
}

patch_gameinfo_gi() {
  local gi="$1"
  [[ -f "$gi" ]] || fail "gameinfo.gi nao encontrado: ${gi}"
  python3 - "$gi" <<'PYEOF'
import re, sys
path = sys.argv[1]
with open(path) as f:
    lines = f.readlines()
if any('csgo/addons/metamod' in l for l in lines):
    sys.exit(0)
out = []
patched = False
for line in lines:
    if not patched and re.match(r'^[ \t]+Game[ \t]+csgo[ \t]*$', line.rstrip('\n')):
        indent = re.match(r'^([ \t]+)', line).group(1)
        out.append(indent + 'Game\tcsgo/addons/metamod\n')
        patched = True
    out.append(line)
if not patched:
    sys.exit(1)
with open(path, 'w') as f:
    f.writelines(out)
PYEOF
  fraghub_log "INFO" "gameinfo.gi: entrada csgo/addons/metamod inserida."
}

install_metamod_cs2() {
  local dst="$1"
  if [[ "${FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD:-0}" == "1" ]]; then
    fraghub_log "WARN" "FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD=1: a saltar download do Metamod:Source."
  else
    local url tmp
    url="$(fraghub_metamod_tar_url)" || fail "Falha ao obter URL do Metamod:Source (AlliedModders)."
    tmp="$(mktemp -d)"
    fraghub_log "INFO" "A descarregar Metamod:Source: ${url}"
    curl -fsSL "$url" -o "${tmp}/metamod.tar.gz"
    mkdir -p "${dst}/addons"
    tar -xzf "${tmp}/metamod.tar.gz" -C "${dst}"
    rm -rf "$tmp"
    fraghub_log "INFO" "Metamod:Source extraido para ${dst}/addons/metamod/"
  fi
  patch_gameinfo_gi "${dst}/gameinfo.gi"
  fraghub_chown_game_subtree "${dst}/addons/metamod"
  install_plugin_marker "metamod"
}

install_css_cs2() {
  local dst="$1"
  if [[ "${FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD:-0}" == "1" ]]; then
    fraghub_log "WARN" "FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD=1: a saltar download do CounterStrikeSharp."
  else
    local url tmp unst
    url="$(fraghub_css_zip_url)" || fail "Falha ao obter URL do CounterStrikeSharp (GitHub)."
    tmp="$(mktemp -d)"
    unst="${tmp}/extract"
    mkdir -p "$unst"
    fraghub_log "INFO" "A descarregar CounterStrikeSharp (com runtime): ${url}"
    curl -fsSL "$url" -o "${tmp}/counterstrikesharp.zip"
    unzip -q -o "${tmp}/counterstrikesharp.zip" -d "$unst"
    [[ -d "${unst}/addons/counterstrikesharp" ]] || fail "Pacote CSS invalido: falta addons/counterstrikesharp/ no ZIP."
    mkdir -p "${dst}/addons"
    cp -a "${unst}/addons/." "${dst}/addons/"
    rm -rf "$tmp"
    fraghub_log "INFO" "CounterStrikeSharp extraido para ${dst}/addons/counterstrikesharp/"
  fi
  fraghub_chown_game_subtree "${dst}/addons/counterstrikesharp"
  install_plugin_marker "counterstrikesharp"
}

install_matchzy_cs2() {
  local dst="$1"
  local plugin_dir="${dst}/addons/counterstrikesharp/plugins/MatchZy"
  if [[ "${FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD:-0}" == "1" ]]; then
    fraghub_log "WARN" "FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD=1: a saltar download do MatchZy."
  else
    local url tmp unst
    url="$(fraghub_matchzy_zip_url)" || fail "Falha ao obter URL do MatchZy (GitHub)."
    tmp="$(mktemp -d)"
    unst="${tmp}/extract"
    mkdir -p "$unst"
    fraghub_log "INFO" "A descarregar MatchZy: ${url}"
    curl -fsSL "$url" -o "${tmp}/matchzy.zip"
    unzip -q -o "${tmp}/matchzy.zip" -d "$unst"
    local src_plugin="${unst}/addons/counterstrikesharp/plugins/MatchZy"
    [[ -d "$src_plugin" ]] || fail "Pacote MatchZy invalido: falta addons/counterstrikesharp/plugins/MatchZy/ no ZIP."
    mkdir -p "$plugin_dir"
    cp -a "${src_plugin}/." "$plugin_dir/"
    [[ -d "${unst}/cfg" ]] && cp -a "${unst}/cfg/." "${dst}/cfg/"
    rm -rf "$tmp"
    fraghub_log "INFO" "MatchZy extraido para ${plugin_dir}/"
  fi
  fraghub_chown_game_subtree "$plugin_dir"
  install_plugin_marker "matchzy"
}

install_weaponpaints_cs2() {
  local dst="$1"
  local plugin_dir="${dst}/addons/counterstrikesharp/plugins/WeaponPaints"
  if [[ "${FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD:-0}" == "1" ]]; then
    fraghub_log "WARN" "FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD=1: a saltar download do WeaponPaints."
  else
    local url tmp unst
    url="$(fraghub_github_weaponpaints_zip_url)" || fail "Falha ao obter URL do WeaponPaints (GitHub)."
    tmp="$(mktemp -d)"
    unst="${tmp}/extract"
    mkdir -p "$unst"
    fraghub_log "INFO" "A descarregar WeaponPaints: ${url}"
    curl -fsSL "$url" -o "${tmp}/weaponpaints.zip"
    unzip -q -o "${tmp}/weaponpaints.zip" -d "$unst"
    # ZIP structure: WeaponPaints/ at root (no addons/... prefix)
    local src_plugin="${unst}/WeaponPaints"
    [[ -d "$src_plugin" ]] || fail "Pacote WeaponPaints invalido: falta WeaponPaints/ no ZIP."
    mkdir -p "$plugin_dir"
    cp -a "${src_plugin}/." "$plugin_dir/"
    rm -rf "$tmp"
    fraghub_log "INFO" "WeaponPaints extraido para ${plugin_dir}/"
  fi
  fraghub_chown_game_subtree "$plugin_dir"
  install_plugin_marker "weaponpaints"
}

install_fraghub_tags_cs2() {
  local plugin_name="fraghub-tags"
  local marker_dir="${CS2_PLUGIN_ROOT}/${plugin_name}"
  local src_dll="${REPO_ROOT}/plugins/cs2/fraghub-tags/bin/Release/net8.0/fraghub-tags.dll"
  local dst plugin_dir cfg_json api_base

  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado (defina FRAGHUB_LGSM_GAME_CSGO_ROOT se a instalação for nao standard)."
  plugin_dir="${dst}/addons/counterstrikesharp/plugins/${plugin_name}"
  cfg_json="${dst}/addons/counterstrikesharp/configs/plugins/${plugin_name}/fraghub-tags.json"

  [[ -f "$src_dll" ]] || fail "DLL fraghub-tags em falta no repositorio: ${src_dll} (compile com dotnet build -c Release)."

  mkdir -p "$plugin_dir" "$(dirname "$cfg_json")"
  cp -f "$src_dll" "${plugin_dir}/fraghub-tags.dll"
  fraghub_log "INFO" "fraghub-tags.dll instalado em ${plugin_dir}/ (CounterStrikeSharp)."

  api_base="$(fraghub_tags_api_base_url)"
  if [[ ! -f "$cfg_json" ]]; then
    FRAGHUB_TAGS_JSON_TMP_API="$api_base" python3 -c 'import json, os; print(json.dumps({"ConfigVersion": 1, "ApiUrl": os.environ["FRAGHUB_TAGS_JSON_TMP_API"]}, indent=2))' >"$cfg_json"
    chmod 600 "$cfg_json" 2>/dev/null || true
    fraghub_log "INFO" "Criado ${cfg_json} (ApiUrl -> ${api_base})."
  else
    fraghub_log "INFO" "Config existente preservada: ${cfg_json}"
  fi

  fraghub_chown_game_subtree "$plugin_dir"
  fraghub_chown_game_subtree "$(dirname "$cfg_json")"

  mkdir -p "$marker_dir"
  install_plugin_marker "$plugin_name"
}

verify_base_installation() {
  local dst="$1"
  [[ -d "${dst}/addons/metamod" ]] || fail "Metamod nao encontrado em ${dst}/addons/metamod/."
  grep -q 'csgo/addons/metamod' "${dst}/gameinfo.gi" || fail "gameinfo.gi nao tem entrada do Metamod."
  [[ -d "${dst}/addons/counterstrikesharp" ]] || fail "CounterStrikeSharp nao encontrado em ${dst}/addons/counterstrikesharp/."
  [[ -f "${dst}/addons/counterstrikesharp/plugins/MatchZy/MatchZy.dll" ]] || fail "MatchZy.dll ausente em plugins/MatchZy/."
  [[ -f "${CS2_PLUGIN_ROOT}/metamod/.installed" ]] || fail "Marcador metamod ausente."
  [[ -f "${CS2_PLUGIN_ROOT}/counterstrikesharp/.installed" ]] || fail "Marcador counterstrikesharp ausente."
  [[ -f "${CS2_PLUGIN_ROOT}/matchzy/.installed" ]] || fail "Marcador matchzy ausente."
  [[ -f "${CS2_PLUGIN_ROOT}/weaponpaints/.installed" ]] || fail "Marcador weaponpaints ausente."
}

run_plugins_cs2() {
  fraghub_log "INFO" "Iniciando plugin_install_cs2 (GSTACK-REQ-003)."
  require_bootstrap
  require_tools

  if [[ "${FRAGHUB_CS2_SKIP_GITHUB_DOWNLOAD:-0}" != "1" ]]; then
    curl -fsSIL https://api.github.com >/dev/null 2>&1 || fail "Sem conectividade com GitHub."
  fi

  local dst
  dst="$(fraghub_lgsm_game_csgo_dir)" || fail "game/csgo do LGSM nao encontrado (defina FRAGHUB_LGSM_GAME_CSGO_ROOT se a instalacao for nao standard)."

  mkdir -p "$CS2_PLUGIN_ROOT"

  install_metamod_cs2 "$dst"
  install_css_cs2 "$dst"
  install_matchzy_cs2 "$dst"
  install_weaponpaints_cs2 "$dst"

  load_effective_env
  install_fraghub_tags_cs2

  verify_base_installation "$dst"

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$PLUGINS_CS2_MARKER"
  chmod 600 "$PLUGINS_CS2_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "plugin_install_cs2 concluido. Marcador: ${PLUGINS_CS2_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_plugins_cs2
fi
