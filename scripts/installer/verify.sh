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
VERIFY_MARKER="${FRAGHUB_VERIFY_MARKER:-${INPUT_DIR}/verify.passed}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"

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

  fraghub_log "INFO" "Inicio das verificacoes de saude (smoke)."

  service_active nginx || fail "Nginx nao esta ativo."
  service_active mariadb || fail "MariaDB nao esta ativo."

  command -v node >/dev/null 2>&1 || fail "Node.js nao encontrado no PATH."
  node -v | grep -qE '^v20\.' || fail "Node.js 20 LTS esperado (obtido: $(node -v))."

  sudo ufw status | head -n 5 >/dev/null || fail "Nao foi possivel ler estado do UFW."

  [[ -x "${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh" ]] || fail "linuxgsm.sh nao encontrado ou nao executavel em ${FRAGHUB_LINUXGSM_DIR}."

  id fraghub >/dev/null 2>&1 || fail "Utilizador fraghub nao existe."

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$VERIFY_MARKER"
  chmod 600 "$VERIFY_MARKER" 2>/dev/null || true

  fraghub_log "INFO" "Verificacoes de saude OK. Marcador: ${VERIFY_MARKER}"

  echo ""
  echo "==> Verify: nginx, mariadb, node v20, UFW, LinuxGSM e utilizador fraghub OK."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_verify
fi
