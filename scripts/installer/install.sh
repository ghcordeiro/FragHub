#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> FragHub Installer (v0.1)"
bash "$SCRIPT_DIR/precheck.sh"
echo "==> Pre-checks finalizados."
bash "$SCRIPT_DIR/input.sh"
echo "==> Wizard de configuracao finalizado."
bash "$SCRIPT_DIR/secrets.sh"
echo "==> Segredos e configuracao efetiva aplicados. Proximas etapas serao adicionadas nas proximas tasks."
