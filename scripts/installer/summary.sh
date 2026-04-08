#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"
VERIFY_MARKER="${FRAGHUB_VERIFY_MARKER:-${INPUT_DIR}/verify.passed}"
SUMMARY_MARKER="${FRAGHUB_SUMMARY_MARKER:-${INPUT_DIR}/summary.done}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
LOG_FILE="${LOG_FILE:-/tmp/fraghub-installer.log}"

mask() {
  local s="$1"
  if [[ -z "${s//[[:space:]]/}" ]]; then
    printf '%s' "(vazio)"
    return
  fi
  if [[ "${#s}" -le 4 ]]; then
    printf '%s' "****"
    return
  fi
  printf '%s***%s' "${s:0:2}" "${s: -2}"
}

fail() {
  fraghub_log "ERROR" "$1"
  exit 1
}

run_summary() {
  [[ -f "$EFFECTIVE_FILE" ]] || fail "Ficheiro efetivo em falta: ${EFFECTIVE_FILE}"
  [[ -f "$VERIFY_MARKER" ]] || fail "Verify em falta (marcador: ${VERIFY_MARKER})."

  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$EFFECTIVE_FILE"
  set +a

  fraghub_log "INFO" "Geracao do resumo final (CLI-REQ-006)."

  echo ""
  echo "=========================================="
  echo "  FragHub — resumo da instalacao (v0.1)"
  echo "=========================================="
  echo ""
  echo "## Configuracao (valores sensiveis mascarados)"
  echo "  Hostname:     ${FRAGHUB_SERVER_HOSTNAME:-n/d}"
  echo "  Dominio:      ${FRAGHUB_DOMAIN:-"(nenhum — HTTP apenas)"}"
  echo "  Admin email:  ${FRAGHUB_ADMIN_EMAIL:-n/d}"
  echo "  Steam key:    $(mask "${FRAGHUB_STEAM_WEB_API_KEY:-}")"
  echo "  Senhas:       **** (ver ${EFFECTIVE_FILE})"
  echo ""
  echo "## Componentes instalados (baseline)"
  echo "  - Nginx (HTTP 80 / HTTPS 443 se configurado depois)"
  echo "  - MariaDB (servico local)"
  echo "  - Node.js 20 LTS"
  echo "  - UFW (22, 80, 443, 27015/tcp+udp, 27005/udp)"
  echo "  - LinuxGSM: ${FRAGHUB_LINUXGSM_DIR}/linuxgsm.sh"
  echo "  - Utilizador sistema: fraghub"
  echo ""
  echo "## Pendente / proximas milestones"
  echo "  - Instalar e configurar servidor CS2/CS:GO via LinuxGSM + SteamCMD"
  echo "  - Schema MariaDB e utilizador DB (fraghub) com FRAGHUB_DB_PASSWORD"
  echo "  - Aplicacao Node portal + Nginx reverse proxy"
  echo "  - SSL (certbot) se FRAGHUB_DOMAIN definido"
  echo ""
  echo "## Portas relevantes"
  echo "  - 22   SSH"
  echo "  - 80   HTTP (Nginx)"
  echo "  - 443  HTTPS (opcional)"
  echo "  - 27015/27005/27020  jogo / cliente / SourceTV (quando servidor ativo)"
  echo "  - 3306 MariaDB (localhost apenas — reforcar em hardening)"
  echo ""
  echo "## Ficheiros locais"
  echo "  - Input:    ${INPUT_DIR}/input.env"
  echo "  - Efetivo:  ${EFFECTIVE_FILE}"
  echo "  - Estado:   ${HOME}/.fraghub/installer/state/steps.env"
  echo "  - Log:      ${LOG_FILE}"
  echo ""
  echo "## Proximos comandos sugeridos"
  echo "  1) cd ${FRAGHUB_LINUXGSM_DIR} && ./linuxgsm.sh install (seguir documentacao LinuxGSM para o jogo alvo)"
  echo "  2) Configurar MariaDB e criar base fraghub_db (migrations em milestone seguinte)"
  echo "  3) Reexecutar installer apos falha: bash scripts/installer/install.sh (etapas concluidas podem ser ignoradas)"
  echo ""

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$SUMMARY_MARKER"
  chmod 600 "$SUMMARY_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "Resumo concluido. Marcador: ${SUMMARY_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_summary
fi
