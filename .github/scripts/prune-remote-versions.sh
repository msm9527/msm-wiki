#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"
CHANNEL="${2:-}"
KEEP_COUNT="${3:-3}"
CURRENT_VERSION="${4:-}"

fail() {
  echo "error: $*" >&2
  exit 1
}

if [[ -z "${TARGET_DIR}" || -z "${CURRENT_VERSION}" ]]; then
  fail "usage: prune-remote-versions.sh <target_dir> <stable|beta> <keep_count> <current_version>"
fi

if [[ ! "${KEEP_COUNT}" =~ ^[1-9][0-9]*$ ]]; then
  fail "keep_count must be a positive integer: ${KEEP_COUNT}"
fi

if [[ ! -d "${TARGET_DIR}" ]]; then
  fail "target directory does not exist: ${TARGET_DIR}"
fi

TARGET_DIR="$(cd -- "${TARGET_DIR}" && pwd -P)"
if [[ "${TARGET_DIR}" == "/" ]]; then
  fail "refusing to prune the filesystem root"
fi

case "${CHANNEL}" in
  stable)
    VERSION_PATTERN='^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z]+)*$'
    ;;
  beta)
    VERSION_PATTERN='^beta-[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z]+)*$'
    ;;
  *)
    fail "unsupported channel: ${CHANNEL}"
    ;;
esac

if [[ ! "${CURRENT_VERSION}" =~ ${VERSION_PATTERN} ]]; then
  fail "current version does not match ${CHANNEL} version format: ${CURRENT_VERSION}"
fi

if [[ ! -d "${TARGET_DIR}/${CURRENT_VERSION}" ]]; then
  fail "current version directory does not exist after upload: ${TARGET_DIR}/${CURRENT_VERSION}"
fi

version_names=()
while IFS= read -r name; do
  if [[ "${name}" =~ ${VERSION_PATTERN} ]]; then
    version_names+=("${name}")
  fi
done < <(find "${TARGET_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%f\n')

sorted_versions=()
if (( ${#version_names[@]} > 0 )); then
  mapfile -t sorted_versions < <(printf '%s\n' "${version_names[@]}" | sort -Vr)
fi

# 始终保留本次上传版本，防止强制重传旧版本时 .version 指向已删除目录。
kept_versions=("${CURRENT_VERSION}")
for name in "${sorted_versions[@]}"; do
  if [[ "${name}" == "${CURRENT_VERSION}" ]]; then
    continue
  fi
  if (( ${#kept_versions[@]} >= KEEP_COUNT )); then
    break
  fi
  kept_versions+=("${name}")
done

is_kept() {
  local candidate="$1"
  local kept
  for kept in "${kept_versions[@]}"; do
    if [[ "${candidate}" == "${kept}" ]]; then
      return 0
    fi
  done
  return 1
}

echo "${CHANNEL} 版本保留策略：保留 ${KEEP_COUNT} 个，本次版本 ${CURRENT_VERSION}"
printf '保留目录：'
printf ' %s' "${kept_versions[@]}"
printf '\n'

deleted_count=0
for name in "${sorted_versions[@]}"; do
  if is_kept "${name}"; then
    continue
  fi
  echo "删除旧版本目录：${TARGET_DIR}/${name}"
  rm -rf -- "${TARGET_DIR:?}/${name}"
  deleted_count=$((deleted_count + 1))
done

echo "版本清理完成：删除 ${deleted_count} 个旧目录；非版本目录和普通文件未处理"
