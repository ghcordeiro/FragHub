#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> FragHub Installer (v0.1 prechecks)"
bash "$SCRIPT_DIR/precheck.sh"
echo "==> Pre-checks finalizados. Proximas etapas de instalacao serao adicionadas nas proximas tasks."
