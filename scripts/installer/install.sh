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

echo "==> FragHub Installer (v0.1)"
run_step precheck "${SCRIPT_DIR}/precheck.sh" \
  "Pre-checks do ambiente" \
  "Pre-checks finalizados."
run_step input "${SCRIPT_DIR}/input.sh" \
  "Wizard de configuracao" \
  "Wizard de configuracao finalizado."
run_step secrets "${SCRIPT_DIR}/secrets.sh" \
  "Segredos e configuracao efetiva" \
  "Segredos e configuracao efetiva aplicados."
echo "==> Pipeline atual concluido. Proximas etapas serao adicionadas nas proximas tasks."
