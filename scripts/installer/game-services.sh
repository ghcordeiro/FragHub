#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
PLUGINS_CS2_MARKER="${FRAGHUB_PLUGINS_CS2_MARKER:-${INPUT_DIR}/plugins-cs2.done}"
PLUGINS_CSGO_MARKER="${FRAGHUB_PLUGINS_CSGO_MARKER:-${INPUT_DIR}/plugins-csgo.done}"
PLUGINS_EXTENDED_CS2_MARKER="${FRAGHUB_PLUGINS_EXTENDED_CS2_MARKER:-${INPUT_DIR}/plugins-extended-cs2.done}"
PLUGINS_EXTENDED_CSGO_MARKER="${FRAGHUB_PLUGINS_EXTENDED_CSGO_MARKER:-${INPUT_DIR}/plugins-extended-csgo.done}"
GAME_SERVICES_MARKER="${FRAGHUB_GAME_SERVICES_MARKER:-${INPUT_DIR}/game-services.done}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"

FRAGHUB_CS2_INSTANCE="${FRAGHUB_CS2_INSTANCE:-cs2server}"
FRAGHUB_CSGO_INSTANCE="${FRAGHUB_CSGO_INSTANCE:-csgoserver}"
FRAGHUB_INSTALL_USER="${FRAGHUB_INSTALL_USER:-$(id -un)}"

SYSTEMD_DIR="${FRAGHUB_SYSTEMD_DIR:-/etc/systemd/system}"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  exit 1
}

require_plugins() {
  [[ -f "$PLUGINS_CS2_MARKER" ]] || fail "Dependencia ausente: plugins CS2 nao concluidos."
  [[ -f "$PLUGINS_CSGO_MARKER" ]] || fail "Dependencia ausente: plugins CS:GO nao concluidos."
  [[ -f "$PLUGINS_EXTENDED_CS2_MARKER" ]] || fail "Dependencia ausente: plugins estendidos CS2 nao concluidos."
  [[ -f "$PLUGINS_EXTENDED_CSGO_MARKER" ]] || fail "Dependencia ausente: plugins estendidos CS:GO nao concluidos."
}

write_unit_file() {
  local unit_name="$1"
  local instance_name="$2"
  local unit_path="${SYSTEMD_DIR}/${unit_name}"

  sudo tee "$unit_path" >/dev/null <<EOF
[Unit]
Description=FragHub ${instance_name}
After=network.target

[Service]
Type=simple
User=${FRAGHUB_INSTALL_USER}
WorkingDirectory=${FRAGHUB_LINUXGSM_DIR}
ExecStart=${FRAGHUB_LINUXGSM_DIR}/${instance_name} start
ExecStop=${FRAGHUB_LINUXGSM_DIR}/${instance_name} stop
ExecReload=${FRAGHUB_LINUXGSM_DIR}/${instance_name} restart
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

run_game_services() {
  fraghub_log "INFO" "Iniciando service_config (GSTACK-REQ-005)."
  require_plugins
  [[ "${FRAGHUB_INSTALL_USER}" != "root" ]] || fail "Servico de jogo nao pode ser configurado para usuario root."

  command -v sudo >/dev/null 2>&1 || fail "sudo necessario para criar unidades systemd."
  sudo -n true 2>/dev/null || fail "sudo sem password nao disponivel para configurar servicos."
  command -v systemctl >/dev/null 2>&1 || fail "systemctl nao disponivel."

  write_unit_file "fraghub-cs2.service" "$FRAGHUB_CS2_INSTANCE"
  write_unit_file "fraghub-csgo.service" "$FRAGHUB_CSGO_INSTANCE"

  sudo systemctl daemon-reload
  if [[ "${FRAGHUB_ENABLE_GAME_SERVICES_ON_BOOT:-0}" == "1" ]]; then
    sudo systemctl enable fraghub-cs2.service fraghub-csgo.service
  fi

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$GAME_SERVICES_MARKER"
  chmod 600 "$GAME_SERVICES_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "service_config concluido. Marcador: ${GAME_SERVICES_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_game_services
fi
