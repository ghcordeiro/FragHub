#!/usr/bin/env bash
# CS2 buildid library: detect game updates via steamapps/appmanifest_730.acf

FRAGHUB_STATE_DIR="${FRAGHUB_STATE_DIR:-/opt/fraghub/state}"
FRAGHUB_CS2_BUILDID_FILE="${FRAGHUB_CS2_BUILDID_FILE:-${FRAGHUB_STATE_DIR}/cs2-buildid.last}"
FRAGHUB_LINUXGSM_DIR="${FRAGHUB_LINUXGSM_DIR:-${HOME}/fraghub/linuxgsm}"
FRAGHUB_CS2_INSTANCE="${FRAGHUB_CS2_INSTANCE:-cs2server}"

cs2_appmanifest_path() {
  local lgsm inst per_inst shared
  lgsm="${FRAGHUB_LINUXGSM_DIR}"
  inst="${FRAGHUB_CS2_INSTANCE}"
  per_inst="${lgsm}/${inst}/serverfiles/steamapps/appmanifest_730.acf"
  shared="${lgsm}/serverfiles/steamapps/appmanifest_730.acf"
  if [[ -f "$per_inst" ]]; then
    printf '%s' "$per_inst"
    return 0
  fi
  if [[ -f "$shared" ]]; then
    printf '%s' "$shared"
    return 0
  fi
  return 1
}

cs2_read_buildid() {
  local manifest
  manifest="$(cs2_appmanifest_path)" || return 1
  awk -F'"' '/"buildid"/{print $4; exit}' "$manifest"
}

cs2_saved_buildid() {
  [[ -f "$FRAGHUB_CS2_BUILDID_FILE" ]] || { printf ''; return 0; }
  tr -d '[:space:]' <"$FRAGHUB_CS2_BUILDID_FILE"
}

cs2_save_buildid() {
  local buildid="$1"
  mkdir -p "$(dirname "$FRAGHUB_CS2_BUILDID_FILE")"
  umask 077
  printf '%s\n' "$buildid" >"$FRAGHUB_CS2_BUILDID_FILE"
  chmod 600 "$FRAGHUB_CS2_BUILDID_FILE" 2>/dev/null || true
}

# Returns 0 (true) if buildid changed or was never recorded; 1 if unchanged.
cs2_buildid_changed() {
  local current saved
  current="$(cs2_read_buildid)" || return 1
  [[ -n "$current" ]] || return 1
  saved="$(cs2_saved_buildid)"
  [[ -z "$saved" || "$current" != "$saved" ]]
}
