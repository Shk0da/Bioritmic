#!/bin/bash
set -euo pipefail

MC_CONFIG_DIR="${MC_CONFIG_DIR:-/tmp/mc}"
export MC_CONFIG_DIR
export MINIO_ROOT_USER="${MINIO_ROOT_USER:-bioritmic}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-bioritmic}"

mc alias set local http://127.0.0.1:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null
mc mb "local/${S3_BUCKET:-bioritmic}" --ignore-existing >/dev/null
echo "MinIO bucket ready."
