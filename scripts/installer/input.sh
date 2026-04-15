#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

LOG_FILE="${LOG_FILE:-/tmp/fraghub-installer.log}"
INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
INPUT_FILE="${FRAGHUB_INPUT_FILE:-${INPUT_DIR}/input.env}"

log() {
  local level="$1"
  local message="$2"
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  printf '[%s] [%s] %s\n' "$ts" "$level" "$message" | tee -a "$LOG_FILE"
}

fail() {
  local message="$1"
  log "ERROR" "$message"
  {
    printf '\n'
    printf 'Recuperacao sugerida:\n'
    printf '  1) Verifique o log detalhado: %s\n' "$LOG_FILE"
    printf '  2) Corrija a causa raiz indicada acima.\n'
    printf '  3) Reexecute o installer: bash scripts/installer/install.sh\n'
  } >&2
  exit 1
}

is_blank() {
  [[ -z "${1//[[:space:]]/}" ]]
}

min_len() {
  local s="$1"
  local n="$2"
  [[ "${#s}" -ge "$n" ]]
}

is_valid_email() {
  local e="$1"
  [[ "$e" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]
}

is_valid_optional_domain() {
  local d="$1"
  is_blank "$d" && return 0
  [[ "$d" =~ ^localhost$ ]] && return 0
  [[ "$d" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$ ]]
}

is_valid_discord_webhook() {
  local u="$1"
  is_blank "$u" && return 0
  [[ "$u" =~ ^https://discord(app)?\.com/api/webhooks/ ]]
}

mask_secret() {
  local s="$1"
  if is_blank "$s"; then
    printf '%s' "(vazio)"
    return
  fi
  if [[ "${#s}" -le 4 ]]; then
    printf '%s' "****"
    return
  fi
  printf '%s***%s' "${s:0:2}" "${s: -2}"
}

write_input_file() {
  local hostname steam_key db_pass rcon_pass admin_email admin_pass domain discord google_id google_secret
  hostname="$1"
  steam_key="$2"
  db_pass="$3"
  rcon_pass="$4"
  admin_email="$5"
  admin_pass="$6"
  domain="$7"
  discord="$8"
  google_id="$9"
  google_secret="${10}"

  mkdir -p "$INPUT_DIR"
  umask 077
  {
    printf '# FragHub installer - input coletado (nao commitar)\n'
    printf 'export FRAGHUB_SERVER_HOSTNAME=%q\n' "$hostname"
    printf 'export FRAGHUB_STEAM_WEB_API_KEY=%q\n' "$steam_key"
    printf 'export FRAGHUB_DB_PASSWORD=%q\n' "$db_pass"
    printf 'export FRAGHUB_RCON_PASSWORD=%q\n' "$rcon_pass"
    printf 'export FRAGHUB_ADMIN_EMAIL=%q\n' "$admin_email"
    printf 'export FRAGHUB_ADMIN_PASSWORD=%q\n' "$admin_pass"
    printf 'export FRAGHUB_DOMAIN=%q\n' "$domain"
    printf 'export FRAGHUB_DISCORD_WEBHOOK=%q\n' "$discord"
    printf 'export FRAGHUB_GOOGLE_CLIENT_ID=%q\n' "$google_id"
    printf 'export FRAGHUB_GOOGLE_CLIENT_SECRET=%q\n' "$google_secret"
  } >"$INPUT_FILE"
  chmod 600 "$INPUT_FILE"
  log "INFO" "Input salvo em ${INPUT_FILE} (permissoes 600)."
}

collect_inputs() {
  local hostname steam_key db_pass rcon_pass admin_email admin_pass domain discord google_id google_secret

  log "INFO" "Iniciando wizard de configuracao (CLI-REQ-002)."

  while true; do
    printf 'Hostname do servidor (obrigatorio): '
    read -r hostname
    if is_blank "$hostname"; then
      echo "Valor obrigatorio. Informe um hostname nao vazio."
      continue
    fi
    break
  done

  while true; do
    printf 'Steam Web API Key (obrigatorio): '
    read -rs steam_key
    echo
    if is_blank "$steam_key" || ! min_len "$steam_key" 8; then
      echo "Steam Web API Key obrigatoria (minimo 8 caracteres)."
      continue
    fi
    break
  done

  while true; do
    printf 'Senha do banco de dados (Enter para gerar automaticamente depois): '
    read -rs db_pass
    echo
    if ! is_blank "$db_pass" && ! min_len "$db_pass" 8; then
      echo "Senha deve ter no minimo 8 caracteres ou ficar vazia para geracao automatica."
      continue
    fi
    break
  done

  while true; do
    printf 'Senha RCON (Enter para gerar automaticamente depois): '
    read -rs rcon_pass
    echo
    if ! is_blank "$rcon_pass" && ! min_len "$rcon_pass" 8; then
      echo "Senha deve ter no minimo 8 caracteres ou ficar vazia para geracao automatica."
      continue
    fi
    break
  done

  while true; do
    printf 'Email do admin inicial (obrigatorio): '
    read -r admin_email
    if ! is_valid_email "$admin_email"; then
      echo "Email invalido."
      continue
    fi
    break
  done

  while true; do
    printf 'Senha do admin inicial (obrigatorio, min 8, maiuscula+minuscula+digito): '
    read -rs admin_pass
    echo
    if ! min_len "$admin_pass" 8; then
      echo "Senha do admin deve ter no minimo 8 caracteres."
      continue
    fi
    if [[ ! "$admin_pass" =~ [a-z] ]] || [[ ! "$admin_pass" =~ [A-Z] ]] || [[ ! "$admin_pass" =~ [0-9] ]]; then
      echo "Senha do admin: inclua pelo menos uma maiuscula, uma minuscula e um digito (regra igual a /auth/register)."
      continue
    fi
    break
  done

  while true; do
    printf 'Dominio publico (opcional, ex.: fraghub.example.com): '
    read -r domain
    if ! is_valid_optional_domain "$domain"; then
      echo "Dominio invalido. Deixe vazio ou use FQDN valido / localhost."
      continue
    fi
    break
  done

  while true; do
    printf 'URL do webhook Discord (opcional): '
    read -r discord
    if ! is_valid_discord_webhook "$discord"; then
      echo "Webhook invalido. Use URL https://discord.com/api/webhooks/... (ou discordapp.com) ou deixe vazio."
      continue
    fi
    break
  done

  while true; do
    printf 'Google OAuth Client ID (opcional): '
    read -r google_id
    printf 'Google OAuth Client Secret (opcional): '
    read -rs google_secret
    echo
    if is_blank "$google_id" && is_blank "$google_secret"; then
      break
    fi
    if is_blank "$google_id" || is_blank "$google_secret"; then
      echo "Informe ambos Client ID e Client Secret ou deixe ambos vazios."
      continue
    fi
    break
  done

  write_input_file "$hostname" "$steam_key" "$db_pass" "$rcon_pass" "$admin_email" "$admin_pass" "$domain" "$discord" "$google_id" "$google_secret"

  echo ""
  echo "==> Resumo (valores sensiveis mascarados)"
  echo "    Hostname:           ${hostname}"
  echo "    Steam API Key:      $(mask_secret "$steam_key")"
  if is_blank "$db_pass"; then
    echo "    Senha DB:           (sera gerada automaticamente)"
  else
    echo "    Senha DB:           $(mask_secret "$db_pass")"
  fi
  if is_blank "$rcon_pass"; then
    echo "    Senha RCON:         (sera gerada automaticamente)"
  else
    echo "    Senha RCON:         $(mask_secret "$rcon_pass")"
  fi
  echo "    Admin email:        ${admin_email}"
  echo "    Admin senha:        ****"
  echo "    Dominio:            ${domain:-"(nenhum)"}"
  echo "    Discord webhook:    ${discord:-"(nenhum)"}"
  if is_blank "$google_id"; then
    echo "    Google OAuth:       (nao configurado)"
  else
    echo "    Google OAuth:       Client ID $(mask_secret "$google_id") / Secret ****"
  fi
  log "INFO" "Wizard de configuracao concluido."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  collect_inputs
fi
