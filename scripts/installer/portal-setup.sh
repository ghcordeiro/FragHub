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
PORTAL_SETUP_MARKER="${FRAGHUB_PORTAL_SETUP_MARKER:-${INPUT_DIR}/portal-setup.done}"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRAGHUB_WEB_SRC="${FRAGHUB_WEB_SRC:-${REPO_ROOT}/fraghub-web}"
FRAGHUB_PORTAL_DIR="${FRAGHUB_PORTAL_DIR:-/opt/fraghub/portal}"
DIST_DEST="${FRAGHUB_PORTAL_DIST:-${FRAGHUB_PORTAL_DIR}/dist}"

fail() {
  fraghub_fail_actionable "$1" "bash scripts/installer/portal-setup.sh"
  rm -f "$PORTAL_SETUP_MARKER"
  exit 1
}

run_portal_setup() {
  [[ "$(uname -s)" == "Linux" ]] || fail "portal-setup suportado apenas em Linux."
  [[ -d "$FRAGHUB_WEB_SRC" ]] || fail "Diretorio fraghub-web em falta: ${FRAGHUB_WEB_SRC} (defina FRAGHUB_WEB_SRC ou clone o repo completo)."
  [[ -f "${FRAGHUB_WEB_SRC}/package.json" ]] || fail "package.json nao encontrado em ${FRAGHUB_WEB_SRC}."

  fraghub_state_verify api_setup || fail "Dependencia: api_setup nao concluida ou inconsistente."

  command -v node >/dev/null 2>&1 || fail "Node.js nao encontrado."
  command -v npm >/dev/null 2>&1 || fail "npm nao encontrado."
  node -v | grep -qE '^v20\.' || fail "Node.js 20.x esperado (obtido: $(node -v))."
  fraghub_sudo_noninteractive_ok || fail "sudo nao disponivel para publicar em ${FRAGHUB_PORTAL_DIR}."

  fraghub_log "INFO" "Build do portal (Vite) a partir de ${FRAGHUB_WEB_SRC}."

  pushd "$FRAGHUB_WEB_SRC" >/dev/null
  npm ci
  npm run build
  popd >/dev/null

  [[ -f "${FRAGHUB_WEB_SRC}/dist/index.html" ]] || fail "Build nao gerou dist/index.html."

  fraghub_log "INFO" "Publicacao de dist/ para ${DIST_DEST} (sudo)."

  sudo mkdir -p "$DIST_DEST"
  sudo rsync -a --delete "${FRAGHUB_WEB_SRC}/dist/" "${DIST_DEST}/"
  sudo chmod -R a+rX "${FRAGHUB_PORTAL_DIR}"

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$PORTAL_SETUP_MARKER"
  chmod 600 "$PORTAL_SETUP_MARKER" 2>/dev/null || true

  fraghub_log "INFO" "portal-setup concluido. Marcador: ${PORTAL_SETUP_MARKER}"
  echo ""
  echo "==> Portal: build e copia para ${DIST_DEST} concluidos."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_portal_setup
fi
