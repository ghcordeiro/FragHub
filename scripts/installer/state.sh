#!/usr/bin/env bash
# FragHub installer — estado local por etapa (ADR-0002).
# Uso: `source` a partir de install.sh, ou `bash state.sh status|reset`.

: "${HOME:?HOME nao definido}"
: "${FRAGHUB_STATE_DIR:=${HOME}/.fraghub/installer/state}"
FRAGHUB_STEPS_FILE="${FRAGHUB_STEPS_FILE:-${FRAGHUB_STATE_DIR}/steps.env}"

INPUT_DIR="${FRAGHUB_INPUT_DIR:-${HOME}/.fraghub/installer}"
INPUT_FILE="${FRAGHUB_INPUT_FILE:-${INPUT_DIR}/input.env}"
EFFECTIVE_FILE="${FRAGHUB_EFFECTIVE_ENV:-${INPUT_DIR}/effective.env}"

fraghub_state_init() {
  mkdir -p "$FRAGHUB_STATE_DIR"
  chmod 700 "$FRAGHUB_STATE_DIR"
}

fraghub_state_get() {
  local step="$1"
  [[ -f "$FRAGHUB_STEPS_FILE" ]] || {
    printf ''
    return 0
  }
  local line
  line="$(grep -E "^${step}=" "$FRAGHUB_STEPS_FILE" 2>/dev/null | tail -n1)" || true
  printf '%s' "${line#*=}"
}

fraghub_state_set() {
  local step="$1"
  local value="$2"
  mkdir -p "$FRAGHUB_STATE_DIR"
  umask 077
  local tmp
  tmp="$(mktemp)"
  if [[ -f "$FRAGHUB_STEPS_FILE" ]]; then
    grep -vE "^${step}=" "$FRAGHUB_STEPS_FILE" >"$tmp" 2>/dev/null || true
  fi
  printf '%s=%s\n' "$step" "$value" >>"$tmp"
  mv "$tmp" "$FRAGHUB_STEPS_FILE"
  chmod 600 "$FRAGHUB_STEPS_FILE"
}

fraghub_state_verify_precheck() {
  [[ "$(uname -s)" == "Linux" ]] || return 1
  [[ -f /etc/os-release ]] || return 1
  command -v sudo >/dev/null 2>&1 || return 1
  sudo -n true 2>/dev/null || return 1
  return 0
}

fraghub_state_verify_input() {
  [[ -f "$INPUT_FILE" ]] || return 1
  return 0
}

fraghub_state_verify_secrets() {
  [[ -f "$EFFECTIVE_FILE" ]] || return 1
  [[ -s "$EFFECTIVE_FILE" ]] || return 1
  return 0
}

fraghub_state_verify() {
  local step="$1"
  case "$step" in
    precheck) fraghub_state_verify_precheck ;;
    input) fraghub_state_verify_input ;;
    secrets) fraghub_state_verify_secrets ;;
    *) return 1 ;;
  esac
}

fraghub_state_should_skip() {
  local step="$1"
  local status
  status="$(fraghub_state_get "$step")"
  [[ "$status" == "done" ]] || return 1
  if fraghub_state_verify "$step"; then
    return 0
  fi
  printf '[fraghub] Estado "%s" inconsistente com o sistema; reexecutando etapa.\n' "$step" >&2
  fraghub_state_set "$step" "pending"
  return 1
}

fraghub_state_apply_force_flags() {
  local step="$1"
  local force="${FRAGHUB_FORCE_STEP:-}"
  if [[ "$force" == "$step" ]]; then
    fraghub_state_set "$step" "pending"
  fi
}

fraghub_state_reset() {
  rm -f "$FRAGHUB_STEPS_FILE"
  printf 'Estado do installer limpo (%s).\n' "$FRAGHUB_STEPS_FILE"
}

fraghub_state_dump() {
  if [[ -f "$FRAGHUB_STEPS_FILE" ]]; then
    cat "$FRAGHUB_STEPS_FILE"
  else
    printf '(nenhum estado em %s)\n' "$FRAGHUB_STEPS_FILE"
  fi
}

fraghub_state_main() {
  case "${1:-}" in
    status)
      fraghub_state_init
      fraghub_state_dump
      ;;
    reset)
      fraghub_state_init
      fraghub_state_reset
      ;;
    *)
      printf 'Uso: %s status|reset\n' "$(basename "$0")" >&2
      exit 1
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -o errexit
  set -o nounset
  set -o pipefail
  fraghub_state_main "${@:-}"
fi
