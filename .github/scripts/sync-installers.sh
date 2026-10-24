#!/usr/bin/env bash
set -euo pipefail

# Reuse the release mirror configuration: host,user,password,target_path[,port].
# Stable: target_path/install.sh; Beta: target_path/beta/install.sh.
CHANNEL="${1:-all}"
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"

fail() {
  echo "error: $*" >&2
  exit 1
}

case "$CHANNEL" in
  all) channels=(stable beta) ;;
  stable|beta) channels=("$CHANNEL") ;;
  *) fail 'channel must be all, stable or beta' ;;
esac

[[ -n "${EXTRA_SERVERS:-}" ]] || fail 'DEPLOY_SERVERS is not configured'
RUN_ID="${GITHUB_RUN_ID:-$$}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:-1}"
[[ "$RUN_ID" =~ ^[0-9]+$ && "$RUN_ATTEMPT" =~ ^[0-9]+$ ]] || fail 'invalid run identifier'

servers=()
while IFS= read -r line || [[ -n "$line" ]]; do
  line="$(sed 's/^[[:space:]]*//;s/[[:space:]]*$//' <<< "$line")"
  [[ -z "$line" ]] || servers+=("$line")
done <<< "$EXTRA_SERVERS"
[[ ${#servers[@]} -gt 0 ]] || fail 'DEPLOY_SERVERS has no servers'

# Validate every entry before changing any server. Credentials are never logged.
for entry in "${servers[@]}"; do
  IFS=',' read -r host user pass target port extra <<< "$entry"
  [[ -n "$host" && -n "$user" && -n "$pass" && -n "$target" && -z "$extra" ]] || fail 'invalid DEPLOY_SERVERS entry'
  [[ "$host" != -* && "$user" != -* ]] || fail 'invalid SSH destination'
  [[ -z "$port" || "$port" =~ ^[0-9]+$ ]] || fail 'invalid SSH port'
  [[ "$target" = /* && ! "$target" =~ (^|/)\.\.?(/|$) ]] || fail 'download directory must be an absolute path without dot segments'
  [[ "$target" != *$'\n'* && "$target" != *$'\r'* ]] || fail 'invalid download directory'
  [[ "$target" =~ [^/] ]] || fail 'refusing to use the filesystem root'
done

sync_channel() {
  local channel="$1" base="$2" source target stage_name stage checksum target_quoted stage_quoted checksum_quoted
  case "$channel" in
    stable) source="$REPO_ROOT/install_cn.sh"; target="$base" ;;
    beta) source="$REPO_ROOT/install_beta_cn.sh"; target="$base/beta" ;;
  esac
  bash -n "$source"
  checksum="$(sha256sum -- "$source")"
  checksum="${checksum%% *}"
  stage_name=".install.sh.sync-${RUN_ID}-${RUN_ATTEMPT}-${channel}"
  stage="$target/$stage_name"
  printf -v target_quoted '%q' "$target"
  printf -v stage_quoted '%q' "$stage_name"
  printf -v checksum_quoted '%q' "$checksum"

  # An existing channel marker proves this is an established download directory.
  sshpass -e ssh "${SSH_ARGS[@]}" "${user}@${host}" "bash -s -- ${target_quoted}" <<'REMOTE'
set -euo pipefail
[[ -d "$1" && -f "$1/.version" ]] || { echo 'error: download directory or .version is missing' >&2; exit 1; }
REMOTE

  if ! sshpass -e rsync -tz --protect-args -e "$RSYNC_SSH" -- "$source" "${user}@${host}:${stage}"; then
    printf -v stage_quoted '%q' "$stage"
    sshpass -e ssh "${SSH_ARGS[@]}" "${user}@${host}" "rm -f -- ${stage_quoted}" >/dev/null 2>&1 || true
    fail "failed to upload ${channel} installer"
  fi

  sshpass -e ssh "${SSH_ARGS[@]}" "${user}@${host}" \
    "bash -s -- ${target_quoted} ${stage_quoted} ${checksum_quoted}" <<'REMOTE'
set -euo pipefail
target="$1"
staged="$target/$2"
expected="$3"
trap 'rm -f -- "$staged"' EXIT
actual="$(sha256sum -- "$staged")"
[[ "${actual%% *}" = "$expected" ]] || { echo 'error: installer SHA256 mismatch' >&2; exit 1; }
# BSD chmod (used by the macOS regression runner) treats `--` as a path;
# staged is constructed from the validated target and cannot begin with `-`.
chmod 0755 "$staged"
mv -f -- "$staged" "$target/install.sh"
REMOTE
  echo "Synced ${channel}: $(basename -- "$source") -> ${channel}/install.sh (SHA256 verified)"
}

for entry in "${servers[@]}"; do
  IFS=',' read -r host user pass target port extra <<< "$entry"
  while [[ "$target" = */ ]]; do target="${target%/}"; done
  export SSHPASS="$pass"
  SSH_ARGS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o ServerAliveInterval=10 -o ServerAliveCountMax=3)
  RSYNC_SSH='ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o ServerAliveInterval=10 -o ServerAliveCountMax=3'
  if [[ -n "$port" ]]; then
    SSH_ARGS+=(-p "$port")
    RSYNC_SSH+=" -p $port"
  fi
  for channel in "${channels[@]}"; do
    sync_channel "$channel" "$target"
  done
done
unset SSHPASS
