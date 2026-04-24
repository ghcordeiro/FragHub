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
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SYSTEMD_DIR="${FRAGHUB_SYSTEMD_DIR:-/etc/systemd/system}"

fail() {
  fraghub_fail_actionable "$1" "FRAGHUB_ENABLE_GAME_STACK=1 bash scripts/installer/install.sh"
  exit 1
}

require_plugins() {
  [[ -f "$PLUGINS_CS2_MARKER" ]] || fail "Dependencia ausente: plugins CS2 nao concluidos."
  [[ -f "$PLUGINS_EXTENDED_CS2_MARKER" ]] || fail "Dependencia ausente: plugins estendidos CS2 nao concluidos."
  # CS:GO is optional — only required if its markers exist (CSGO may not be installed)
  if [[ -f "$PLUGINS_CSGO_MARKER" ]] || [[ -f "$PLUGINS_EXTENDED_CSGO_MARKER" ]]; then
    [[ -f "$PLUGINS_CSGO_MARKER" ]] || fail "Dependencia ausente: plugins CS:GO base nao concluidos."
    [[ -f "$PLUGINS_EXTENDED_CSGO_MARKER" ]] || fail "Dependencia ausente: plugins estendidos CS:GO nao concluidos."
  else
    fraghub_log "INFO" "CS:GO markers ausentes — servico CS:GO sera ignorado."
  fi
}

csgo_enabled() {
  [[ -f "$PLUGINS_CSGO_MARKER" ]] && [[ -f "$PLUGINS_EXTENDED_CSGO_MARKER" ]]
}

write_monitor_units() {
  local monitor_service="${SYSTEMD_DIR}/fraghub-cs2-monitor.service"
  local monitor_timer="${SYSTEMD_DIR}/fraghub-cs2-monitor.timer"

  sudo tee "$monitor_service" >/dev/null <<EOF
[Unit]
Description=FragHub CS2 Plugin Update Monitor
After=network.target

[Service]
Type=oneshot
User=${FRAGHUB_INSTALL_USER}
ExecStart=/bin/bash ${REPO_ROOT}/scripts/cs2-update-monitor.sh
StandardOutput=journal
StandardError=journal
EOF

  sudo tee "$monitor_timer" >/dev/null <<EOF
[Unit]
Description=FragHub CS2 Plugin Update Monitor Timer
Requires=fraghub-cs2-monitor.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=10min
AccuracySec=1min

[Install]
WantedBy=timers.target
EOF
  fraghub_log "INFO" "Monitor units criados: fraghub-cs2-monitor.service + fraghub-cs2-monitor.timer"
}

write_unit_file() {
  local unit_name="$1"
  local instance_name="$2"
  local unit_path="${SYSTEMD_DIR}/${unit_name}"

  # Type=oneshot + RemainAfterExit=yes is required for LinuxGSM:
  # LGSM spawns the game into a screen/tmux session and exits 0.
  # With Type=simple systemd would see exit 0 and mark the unit dead.
  # With oneshot+RemainAfterExit the unit stays "active (exited)" after
  # ExecStart returns, and ExecStop is called cleanly on shutdown.
  sudo tee "$unit_path" >/dev/null <<EOF
[Unit]
Description=FragHub ${instance_name}
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=${FRAGHUB_INSTALL_USER}
WorkingDirectory=${FRAGHUB_LINUXGSM_DIR}
ExecStart=${FRAGHUB_LINUXGSM_DIR}/${instance_name} start
ExecStop=${FRAGHUB_LINUXGSM_DIR}/${instance_name} stop
ExecReload=${FRAGHUB_LINUXGSM_DIR}/${instance_name} restart

[Install]
WantedBy=multi-user.target
EOF
}

run_game_services() {
  fraghub_log "INFO" "Iniciando service_config (GSTACK-REQ-005)."
  require_plugins
  [[ "${FRAGHUB_INSTALL_USER}" != "root" ]] || fail "Servico de jogo nao pode ser configurado para usuario root."

  command -v sudo >/dev/null 2>&1 || fail "sudo necessario para criar unidades systemd."
  fraghub_sudo_noninteractive_ok || fail "sudo sem password nao disponivel para configurar servicos. Defina FRAGHUB_SUDO_PASSWORD em E2E se necessario."
  command -v systemctl >/dev/null 2>&1 || fail "systemctl nao disponivel."

  write_unit_file "fraghub-cs2.service" "$FRAGHUB_CS2_INSTANCE"
  if csgo_enabled; then
    write_unit_file "fraghub-csgo.service" "$FRAGHUB_CSGO_INSTANCE"
  fi
  write_monitor_units

  sudo systemctl daemon-reload
  # Always enable CS2 on boot.
  sudo systemctl enable fraghub-cs2.service
  if csgo_enabled; then
    sudo systemctl enable fraghub-csgo.service
  fi
  # Timer always enabled — it is the recovery mechanism, not optional.
  sudo systemctl enable --now fraghub-cs2-monitor.timer

  mkdir -p "$INPUT_DIR"
  umask 077
  date -Iseconds >"$GAME_SERVICES_MARKER"
  chmod 600 "$GAME_SERVICES_MARKER" 2>/dev/null || true
  fraghub_log "INFO" "service_config concluido. Marcador: ${GAME_SERVICES_MARKER}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_game_services
fi
