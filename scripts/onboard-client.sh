#!/usr/bin/env bash
# FragHub Client Onboarding
# Run on Guilherme's machine (not the client server) to generate a config file.
# Usage: bash scripts/onboard-client.sh

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLIENTS_DIR="${REPO_ROOT}/clients"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
bold()    { printf '\033[1m%s\033[0m' "$*"; }
cyan()    { printf '\033[0;36m%s\033[0m' "$*"; }
green()   { printf '\033[0;32m%s\033[0m' "$*"; }
yellow()  { printf '\033[0;33m%s\033[0m' "$*"; }
red()     { printf '\033[0;31m%s\033[0m' "$*"; }

info()    { echo "  $(cyan "→") $*"; }
ok()      { echo "  $(green "✓") $*"; }
warn()    { echo "  $(yellow "!") $*" >&2; }
fail()    { echo "  $(red "✗") $*" >&2; exit 1; }

is_blank()        { [[ -z "${1//[[:space:]]/}" ]]; }
min_len()         { [[ "${#1}" -ge "$2" ]]; }
is_valid_email()  { [[ "$1" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; }
is_valid_domain() {
  is_blank "$1" && return 0
  [[ "$1" =~ ^localhost$ ]] && return 0
  [[ "$1" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$ ]]
}
is_valid_discord() {
  is_blank "$1" && return 0
  [[ "$1" =~ ^https://discord(app)?\.com/api/webhooks/ ]]
}
is_valid_ip_or_host() {
  [[ "$1" =~ ^[a-zA-Z0-9._-]+$ ]]
}

gen_password() {
  openssl rand -base64 32 | tr -d '\n=+/' | head -c 24
}

mask() {
  local s="$1"
  is_blank "$s" && { printf '(vazio)'; return; }
  [[ "${#s}" -le 4 ]] && { printf '****'; return; }
  printf '%s***%s' "${s:0:2}" "${s: -2}"
}

ask() {
  local prompt="$1"
  local var_name="$2"
  local secret="${3:-0}"
  local default_val="${4:-}"
  local value

  while true; do
    if [[ -n "$default_val" ]]; then
      printf '  %s [%s]: ' "$prompt" "$(mask "$default_val")"
    else
      printf '  %s: ' "$prompt"
    fi

    if [[ "$secret" == "1" ]]; then
      read -rs value
      echo
    else
      read -r value
    fi

    if is_blank "$value" && [[ -n "$default_val" ]]; then
      value="$default_val"
    fi

    printf '%s' "$value"
    return 0
  done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo
  echo "$(bold "FragHub — Onboarding de Novo Cliente")"
  echo "$(cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")"
  echo "  Gera um arquivo de config para deploy não-interativo."
  echo "  O arquivo ficará em clients/<nome>.env (gitignored)."
  echo

  # ── Client identifier ──────────────────────────────────────────────────────
  echo "$(bold "1. Identificação do cliente")"
  local client_name
  while true; do
    printf '  Nome do cliente (ex: acme, cliente-joao): '
    read -r client_name
    if is_blank "$client_name"; then echo "  Obrigatório."; continue; fi
    if [[ ! "$client_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
      echo "  Use apenas letras, números, hífens ou underscores."
      continue
    fi
    break
  done

  local output_file="${CLIENTS_DIR}/${client_name}.env"
  if [[ -f "$output_file" ]]; then
    warn "Arquivo já existe: ${output_file}"
    printf '  Sobrescrever? [s/N]: '
    read -r confirm
    [[ "$confirm" =~ ^[sS]$ ]] || fail "Abortado."
  fi

  # ── Server access ──────────────────────────────────────────────────────────
  echo
  echo "$(bold "2. Acesso ao servidor do cliente")"
  local server_ip ssh_user
  while true; do
    printf '  IP ou hostname do servidor: '
    read -r server_ip
    is_valid_ip_or_host "$server_ip" && break
    echo "  IP/hostname inválido."
  done
  while true; do
    printf '  Usuário SSH (ex: ubuntu, root): '
    read -r ssh_user
    is_blank "$ssh_user" && { echo "  Obrigatório."; continue; }
    break
  done

  # ── FragHub config ─────────────────────────────────────────────────────────
  echo
  echo "$(bold "3. Configuração do FragHub")"

  local hostname
  while true; do
    printf '  Hostname do servidor (para logs, ex: acme-cs2): '
    read -r hostname
    is_blank "$hostname" && { echo "  Obrigatório."; continue; }
    break
  done

  local steam_key
  while true; do
    printf '  Steam Web API Key (obrigatório, mín 8 chars): '
    read -rs steam_key; echo
    min_len "$steam_key" 8 && break
    echo "  Steam API Key muito curta."
  done

  local domain
  while true; do
    printf '  Domínio público (opcional, ex: play.acme.com): '
    read -r domain
    is_valid_domain "$domain" && break
    echo "  Domínio inválido."
  done

  # ── Admin account ──────────────────────────────────────────────────────────
  echo
  echo "$(bold "4. Conta admin inicial")"

  local admin_email
  while true; do
    printf '  Email do admin: '
    read -r admin_email
    is_valid_email "$admin_email" && break
    echo "  Email inválido."
  done

  local admin_pass
  while true; do
    printf '  Senha do admin (mín 8, maiúscula+minúscula+dígito): '
    read -rs admin_pass; echo
    if ! min_len "$admin_pass" 8; then echo "  Mínimo 8 caracteres."; continue; fi
    if [[ ! "$admin_pass" =~ [a-z] ]] || [[ ! "$admin_pass" =~ [A-Z] ]] || [[ ! "$admin_pass" =~ [0-9] ]]; then
      echo "  Precisa ter maiúscula, minúscula e dígito."
      continue
    fi
    break
  done

  # ── Auto-generated secrets ─────────────────────────────────────────────────
  local db_pass rcon_pass
  db_pass="$(gen_password)"
  rcon_pass="$(gen_password)"
  ok "Senha DB gerada automaticamente: $(mask "$db_pass")"
  ok "Senha RCON gerada automaticamente: $(mask "$rcon_pass")"

  # ── Optional ──────────────────────────────────────────────────────────────
  echo
  echo "$(bold "5. Opcional")"

  local discord
  while true; do
    printf '  Discord webhook URL (Enter para pular): '
    read -r discord
    is_valid_discord "$discord" && break
    echo "  URL inválida. Use https://discord.com/api/webhooks/... ou deixe vazio."
  done

  local google_id="" google_secret=""
  printf '  Configurar Google OAuth? [s/N]: '
  read -r google_yn
  if [[ "$google_yn" =~ ^[sS]$ ]]; then
    printf '  Google Client ID: '
    read -r google_id
    printf '  Google Client Secret: '
    read -rs google_secret; echo
  fi

  local game_stack="0"
  printf '  Instalar stack de jogo CS2? [s/N]: '
  read -r gs_yn
  [[ "$gs_yn" =~ ^[sS]$ ]] && game_stack="1"

  # ── Write config ───────────────────────────────────────────────────────────
  mkdir -p "$CLIENTS_DIR"
  umask 077
  cat > "$output_file" <<EOF
# FragHub config — cliente: ${client_name}
# Servidor: ${ssh_user}@${server_ip}
# Gerado em: $(date -Iseconds)

# Required
FRAGHUB_SERVER_HOSTNAME=${hostname}
FRAGHUB_STEAM_WEB_API_KEY=${steam_key}
FRAGHUB_ADMIN_EMAIL=${admin_email}
FRAGHUB_ADMIN_PASSWORD=${admin_pass}

# Auto-generated secrets
FRAGHUB_DB_PASSWORD=${db_pass}
FRAGHUB_RCON_PASSWORD=${rcon_pass}

# Optional
FRAGHUB_DOMAIN=${domain}
FRAGHUB_DISCORD_WEBHOOK=${discord}
FRAGHUB_GOOGLE_CLIENT_ID=${google_id}
FRAGHUB_GOOGLE_CLIENT_SECRET=${google_secret}

# Game stack
FRAGHUB_ENABLE_GAME_STACK=${game_stack}
EOF
  chmod 600 "$output_file"

  # ── Summary ───────────────────────────────────────────────────────────────
  echo
  echo "$(green "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")"
  echo "$(bold "Config gerado:") ${output_file}"
  echo
  echo "$(bold "Para fazer deploy:")"
  echo
  echo "  $(cyan "# 1. Copiar repo e config para o servidor")"
  echo "  scp -r . ${ssh_user}@${server_ip}:~/FragHub"
  echo "  scp ${output_file} ${ssh_user}@${server_ip}:~/fraghub-config.env"
  echo
  echo "  $(cyan "# 2. SSH e rodar installer")"
  echo "  ssh ${ssh_user}@${server_ip} \\"
  echo "    'cd ~/FragHub && bash scripts/installer/install.sh --config ~/fraghub-config.env'"
  echo
  if [[ "$game_stack" == "1" ]]; then
    warn "Stack de jogo ativada — servidor precisa de ≥8GB RAM e ≥65GB disco."
  fi
}

main "$@"
