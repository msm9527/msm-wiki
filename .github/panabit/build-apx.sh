#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "usage: $0 <version> <target> <input_tar_gz> <output_apx>" >&2
  exit 1
fi

VERSION="$1"
TARGET="$2"
INPUT_TARBALL="$3"
OUTPUT_APX="$4"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="${SCRIPT_DIR}/template"
PANABIT_TEXT_ENCODING="GB18030"

if [[ ! -f "${INPUT_TARBALL}" ]]; then
  echo "error: input tarball not found: ${INPUT_TARBALL}" >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

PKG_DIR="${WORK_DIR}/pkg"
STAGE_DIR="${WORK_DIR}/stage"

mkdir -p "${PKG_DIR}" "${STAGE_DIR}"
tar -xzf "${INPUT_TARBALL}" -C "${PKG_DIR}"

if [[ ! -f "${PKG_DIR}/msm" ]]; then
  echo "error: msm binary is required in ${INPUT_TARBALL}" >&2
  exit 1
fi

cp -R "${TEMPLATE_DIR}/." "${STAGE_DIR}/"
install -m 0755 "${PKG_DIR}/msm" "${STAGE_DIR}/bin/msm"
rm -f "${STAGE_DIR}/bin/.gitkeep"

sed \
  -e "s|__APP_VERSION__|${VERSION}|g" \
  -e "s|__APP_TARGET__|${TARGET}|g" \
  "${TEMPLATE_DIR}/app.inf" > "${STAGE_DIR}/app.inf"

chmod +x \
  "${STAGE_DIR}/afterinstall" \
  "${STAGE_DIR}/appctrl" \
  "${STAGE_DIR}/preinstall" \
  "${STAGE_DIR}/web/cgi/ajax_msm" \
  "${STAGE_DIR}/web/cgi/webmain"

convert_text_file() {
  local file_path="$1"
  local temp_path="${file_path}.iconv"

  iconv -f UTF-8 -t "${PANABIT_TEXT_ENCODING}" "${file_path}" > "${temp_path}"
  mv "${temp_path}" "${file_path}"
}

convert_panabit_text_files() {
  local file_path
  local files=(
    "${STAGE_DIR}/app.inf"
    "${STAGE_DIR}/web/cgi/ajax_msm"
    "${STAGE_DIR}/web/cgi/webmain"
    "${STAGE_DIR}/web/html/main.html"
    "${STAGE_DIR}/web/html/server_config.html"
    "${STAGE_DIR}/web/html/server_log.html"
  )

  if ! command -v iconv >/dev/null 2>&1; then
    echo "error: iconv is required to build Panabit APX text files" >&2
    exit 1
  fi

  for file_path in "${files[@]}"; do
    if [[ -f "${file_path}" ]]; then
      convert_text_file "${file_path}"
    fi
  done
}

convert_panabit_text_files

mkdir -p "$(dirname -- "${OUTPUT_APX}")"
COPYFILE_DISABLE=1 tar -czf "${OUTPUT_APX}" -C "${STAGE_DIR}" .
