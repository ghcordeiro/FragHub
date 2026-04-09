#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=state.sh
source "${SCRIPT_DIR}/state.sh"

fraghub_state_init

if [[ "${FRAGHUB_FORCE_ALL:-0}" == "1" ]]; then
  fraghub_state_set precheck "pending"
  fraghub_state_set input "pending"
  fraghub_state_set secrets "pending"
  fraghub_state_set bootstrap "pending"
  fraghub_state_set database_baseline "pending"
  fraghub_state_set game_precheck "pending"
  fraghub_state_set game_bootstrap "pending"
  fraghub_state_set plugins_cs2 "pending"
  fraghub_state_set plugins_csgo "pending"
  fraghub_state_set plugins_extended_cs2 "pending"
  fraghub_state_set plugins_extended_csgo "pending"
  fraghub_state_set game_services "pending"
  fraghub_state_set game_verify "pending"
  fraghub_state_set game_summary "pending"
  fraghub_state_set database_backup "pending"
  fraghub_state_set verify "pending"
  fraghub_state_set summary "pending"
fi

run_step() {
  local step="$1"
  local script_path="$2"
  local title="$3"
  local done_msg="$4"

  fraghub_state_apply_force_flags "$step"

  if fraghub_state_should_skip "$step"; then
    echo "==> ${title} (ja concluido — verificacao OK). Pulando."
    return 0
  fi

  echo "==> ${title}"
  bash "$script_path"
  fraghub_state_set "$step" "done"
  echo "==> ${done_msg}"
}

echo "==> FragHub Installer (v0.2)"
run_step precheck "${SCRIPT_DIR}/precheck.sh" \
  "Pre-checks do ambiente" \
  "Pre-checks finalizados."
run_step input "${SCRIPT_DIR}/input.sh" \
  "Wizard de configuracao" \
  "Wizard de configuracao finalizado."
run_step secrets "${SCRIPT_DIR}/secrets.sh" \
  "Segredos e configuracao efetiva" \
  "Segredos e configuracao efetiva aplicados."
run_step bootstrap "${SCRIPT_DIR}/bootstrap.sh" \
  "Bootstrap de dependencias base" \
  "Bootstrap finalizado."
run_step database_baseline "${SCRIPT_DIR}/database-baseline.sh" \
  "Provisionamento baseline de banco (MariaDB + schema)" \
  "Database baseline finalizado."
if [[ "${FRAGHUB_ENABLE_GAME_STACK:-0}" == "1" ]]; then
  run_step game_precheck "${SCRIPT_DIR}/game-precheck.sh" \
    "Pre-check da stack de jogo" \
    "Pre-check da stack de jogo finalizado."
  run_step game_bootstrap "${SCRIPT_DIR}/game-bootstrap.sh" \
    "Provisionamento baseline CS2/CS:GO" \
    "Provisionamento baseline de jogo finalizado."
  run_step plugins_cs2 "${SCRIPT_DIR}/plugins-cs2.sh" \
    "Instalacao de plugins base CS2" \
    "Plugins base CS2 finalizados."
  run_step plugins_csgo "${SCRIPT_DIR}/plugins-csgo.sh" \
    "Instalacao de plugins base CS:GO" \
    "Plugins base CS:GO finalizados."
  run_step plugins_extended_cs2 "${SCRIPT_DIR}/plugins-extended-cs2.sh" \
    "Instalacao de plugins estendidos CS2" \
    "Plugins estendidos CS2 finalizados."
  run_step plugins_extended_csgo "${SCRIPT_DIR}/plugins-extended-csgo.sh" \
    "Instalacao de plugins estendidos CS:GO" \
    "Plugins estendidos CS:GO finalizados."
  run_step game_services "${SCRIPT_DIR}/game-services.sh" \
    "Configuracao de servicos de jogo" \
    "Servicos de jogo configurados."
  run_step game_verify "${SCRIPT_DIR}/game-verify.sh" \
    "Verificacao da stack de jogo" \
    "Verificacao da stack de jogo concluida."
  run_step game_summary "${SCRIPT_DIR}/game-summary.sh" \
    "Resumo da stack de jogo" \
    "Resumo da stack de jogo finalizado."
else
  echo "==> Stack de jogo desabilitada (FRAGHUB_ENABLE_GAME_STACK=0)."
fi
run_step database_backup "${SCRIPT_DIR}/database-backup.sh" \
  "Configuracao de backup diario do banco" \
  "Database backup finalizado."
run_step verify "${SCRIPT_DIR}/verify.sh" \
  "Verificacoes de saude (smoke)" \
  "Verificacoes concluidas."
run_step summary "${SCRIPT_DIR}/summary.sh" \
  "Resumo final e proximos passos" \
  "Resumo finalizado."
echo "==> Pipeline v0.2 do installer concluido."
