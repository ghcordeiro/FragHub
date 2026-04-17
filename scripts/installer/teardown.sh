#!/usr/bin/env bash
# Remove artefactos FragHub (servicos, /opt/fraghub, site nginx, BD app, estado do installer).
# Nao remove MariaDB/nginx a nivel de pacote nem regras UFW. Opcional: apagar LinuxGSM/jogos locais.
#
# Uso:
#   FRAGHUB_SUDO_PASSWORD=... bash scripts/installer/teardown.sh --yes
#   ... --purge-game-stacks   # tambem rm -rf ~/fraghub/linuxgsm e ~/fraghub/games

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=logging.sh
source "${SCRIPT_DIR}/logging.sh"

FRAGHUB_DB_NAME="${FRAGHUB_DB_NAME:-fraghub_db}"
FRAGHUB_DB_APP_USER="${FRAGHUB_DB_APP_USER:-fraghub_app}"
FRAGHUB_DB_BACKUP_USER="${FRAGHUB_DB_BACKUP_USER:-fraghub_backup}"
FRAGHUB_DB_APP_HOST="${FRAGHUB_DB_APP_HOST:-127.0.0.1}"
FRAGHUB_DB_BACKUP_HOST="${FRAGHUB_DB_BACKUP_HOST:-127.0.0.1}"
FRAGHUB_DB_CONF_FILE="${FRAGHUB_DB_CONF_FILE:-/etc/mysql/conf.d/fraghub.cnf}"
FRAGHUB_MYCNF_PATH="${FRAGHUB_MYCNF_PATH:-${HOME}/.my.cnf}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
FRAGHUB_GAME_ROOT="${FRAGHUB_GAME_ROOT:-${HOME}/fraghub/games}"

NGINX_SITES_AVAILABLE="/etc/nginx/sites-available/fraghub"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled/fraghub"

YES=0
PURGE_GAME_STACKS=0

usage() {
  cat <<'EOF'
Uso:
  bash scripts/installer/teardown.sh --yes [--purge-game-stacks]

  --yes                  Obrigatorio. Confirma remocao destrutiva.
  --purge-game-stacks    Remove tambem ~/fraghub/linuxgsm e ~/fraghub/games (re-download no proximo bootstrap).

Requer sudo (FRAGHUB_SUDO_PASSWORD ou cache sudo -n). Executar como o mesmo utilizador que correu o install (ex.: ranch).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      YES=1
      shift
      ;;
    --purge-game-stacks)
      PURGE_GAME_STACKS=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      printf 'Argumento desconhecido: %s\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$YES" != "1" ]]; then
  printf 'Abortado: passe --yes para confirmar a remocao.\n' >&2
  usage >&2
  exit 1
fi

command -v sudo >/dev/null 2>&1 || {
  printf 'sudo nao encontrado.\n' >&2
  exit 1
}
fraghub_sudo_noninteractive_ok || {
  printf 'sudo nao interactivo indisponivel. Defina FRAGHUB_SUDO_PASSWORD ou execute sudo -v.\n' >&2
  exit 1
}

stop_disable_remove_unit() {
  local unit="$1"
  if systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}' | grep -qx "${unit}"; then
    sudo systemctl stop "${unit}" 2>/dev/null || true
    sudo systemctl disable "${unit}" 2>/dev/null || true
  fi
  sudo rm -f "/etc/systemd/system/${unit}"
}

fraghub_log "INFO" "Teardown FragHub: a parar servicos systemd..."
stop_disable_remove_unit "fraghub-api.service"
stop_disable_remove_unit "fraghub-cs2.service"
stop_disable_remove_unit "fraghub-csgo.service"
sudo systemctl daemon-reload 2>/dev/null || true

fraghub_log "INFO" "A remover /opt/fraghub..."
sudo rm -rf /opt/fraghub

if command -v nginx >/dev/null 2>&1; then
  fraghub_log "INFO" "A remover site nginx fraghub..."
  sudo rm -f "$NGINX_SITES_ENABLED" "$NGINX_SITES_AVAILABLE"
  if [[ -f /etc/nginx/sites-available/default ]] && [[ ! -L /etc/nginx/sites-enabled/default ]]; then
    sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default 2>/dev/null || true
  fi
  if sudo nginx -t >/dev/null 2>&1; then
    sudo systemctl reload nginx 2>/dev/null || true
  else
    fraghub_log "WARN" "nginx -t falhou apos remocao; verifique a configuracao manualmente."
  fi
else
  fraghub_log "WARN" "nginx nao instalado; a saltar remocao de vhost."
fi

if [[ -f "$FRAGHUB_DB_CONF_FILE" ]]; then
  fraghub_log "INFO" "A remover ${FRAGHUB_DB_CONF_FILE}..."
  sudo rm -f "$FRAGHUB_DB_CONF_FILE"
fi

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet mariadb 2>/dev/null; then
  fraghub_log "INFO" "A remover base ${FRAGHUB_DB_NAME} e utilizadores MySQL da aplicacao..."
  sudo mysql --protocol=socket --batch --skip-column-names -e "\
DROP DATABASE IF EXISTS ${FRAGHUB_DB_NAME};\
DROP USER IF EXISTS '${FRAGHUB_DB_APP_USER}'@'${FRAGHUB_DB_APP_HOST}';\
DROP USER IF EXISTS '${FRAGHUB_DB_BACKUP_USER}'@'${FRAGHUB_DB_BACKUP_HOST}';\
FLUSH PRIVILEGES;" 2>/dev/null || fraghub_log "WARN" "Comandos MySQL falharam (BD ja ausente ou permissoes)."
  sudo systemctl restart mariadb 2>/dev/null || true
else
  fraghub_log "WARN" "MariaDB inativo ou ausente; a saltar DROP DATABASE."
fi

if [[ -f "$FRAGHUB_MYCNF_PATH" ]] && grep -q 'fraghub_backup' "$FRAGHUB_MYCNF_PATH" 2>/dev/null; then
  fraghub_log "INFO" "A remover ${FRAGHUB_MYCNF_PATH} (credenciais mysqldump FragHub)."
  rm -f "$FRAGHUB_MYCNF_PATH"
fi

if command -v crontab >/dev/null 2>&1; then
  local_cron="$(crontab -l 2>/dev/null || true)"
  if printf '%s\n' "$local_cron" | grep -F '/opt/fraghub/scripts/db-backup.sh' >/dev/null 2>&1; then
    fraghub_log "INFO" "A remover entrada cron de backup FragHub..."
    printf '%s\n' "$local_cron" | grep -Fv '/opt/fraghub/scripts/db-backup.sh' | sed '/^[[:space:]]*$/d' | crontab - 2>/dev/null || true
  fi
fi

fraghub_log "INFO" "A remover estado e ficheiros do installer em ${HOME}/.fraghub ..."
rm -rf "${HOME}/.fraghub"

if [[ "$PURGE_GAME_STACKS" == "1" ]]; then
  fraghub_log "INFO" "A remover stacks de jogo (linuxgsm + games)..."
  rm -rf "$FRAGHUB_LINUXGSM_DIR" "$FRAGHUB_GAME_ROOT"
fi

fraghub_log "INFO" "Teardown concluido. Volte a correr: bash scripts/installer/install.sh (e FRAGHUB_ENABLE_GAME_STACK=1 se precisar da stack de jogo)."
