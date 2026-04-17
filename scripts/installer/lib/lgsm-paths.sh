#!/usr/bin/env bash
# Caminhos do LinuxGSM: algumas instalações usam serverfiles por instância (cs2server/serverfiles/...),
# outras usam serverfiles partilhado na raiz do LGSM (serverfiles/game/csgo).

fraghub_lgsm_game_csgo_dir() {
  if [[ -n "${FRAGHUB_LGSM_GAME_CSGO_ROOT:-}" ]]; then
    printf '%s' "${FRAGHUB_LGSM_GAME_CSGO_ROOT}"
    return 0
  fi
  local lgsm inst per_inst shared
  lgsm="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
  inst="${FRAGHUB_CS2_INSTANCE:-cs2server}"
  per_inst="${lgsm}/${inst}/serverfiles/game/csgo"
  shared="${lgsm}/serverfiles/game/csgo"
  if [[ -d "$per_inst" ]]; then
    printf '%s' "$per_inst"
    return 0
  fi
  if [[ -d "$shared" ]]; then
    printf '%s' "$shared"
    return 0
  fi
  return 1
}
