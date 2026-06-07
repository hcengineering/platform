#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_DIR:-${ROOT_DIR}/exports/praut-${STAMP}}"
PRAUT_BASE_URL="${PRAUT_BASE_URL:-https://praut.cz}"

usage() {
  cat <<'USAGE'
Extract data from the Praut instance.

Usage:
  scripts/praut-huly-extract.sh raw-mongo
  scripts/praut-huly-extract.sh workspace-backup <workspace-url-or-uuid>
  scripts/praut-huly-extract.sh api-export

Modes:
  raw-mongo
    Creates gzip mongodump archives for account DB, integration DBs, and active workspace DBs.
    Required env:
      MONGO_URL=mongodb://127.0.0.1:27017
    Optional env:
      OUT_DIR=exports/praut-YYYYMMDD-HHMMSS
      DAYS=365

  workspace-backup <workspace-url-or-uuid>
    Uses the platform backup tool to export one Praut workspace including blobs.
    Required env depends on dev/tool run-local or run-local-mongo configuration.
    Optional env:
      TOOL_RUNNER="rushx run-local" or "rushx run-local-mongo"
      OUT_DIR=exports/praut-YYYYMMDD-HHMMSS

  api-export
    Starts async JSON/CSV exports through the Praut export service. Result ZIPs are saved
    into the workspace Drive, so this mode records API responses and requests.
    Required env:
      PRAUT_EXPORT_URL=https://praut.cz/_export
      PRAUT_TOKEN=<workspace bearer token>
    Optional env:
      PRAUT_BASE_URL=https://praut.cz
      PRAUT_FORMAT=json|csv
      PRAUT_CLASSES=tracker:class:Issue,document:class:Document
      OUT_DIR=exports/praut-YYYYMMDD-HHMMSS

Legacy HULY_* variables are still accepted as fallbacks because Praut currently
uses the Huly platform data model internally.
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

make_out_dir() {
  mkdir -p "$OUT_DIR"
  echo "$OUT_DIR"
}

raw_mongo() {
  require_cmd mongosh
  require_cmd mongodump

  local mongo_url="${MONGO_URL:-mongodb://127.0.0.1:27017}"
  local days="${DAYS:-365}"
  local dir
  dir="$(make_out_dir)"
  mkdir -p "${dir}/workspaces"

  local query
  query="db.getSiblingDB('account').getCollection('workspace').find({ disabled: { \$ne: true }, mode: 'active', lastVisit: { \$gt: Date.now() - (${days} * 24 * 60 * 60 * 1000)}}).forEach(it => console.log(it.workspace, it.lastVisit))"

  echo "Listing active workspaces from ${mongo_url}"
  mongosh "$mongo_url" --quiet --eval "$query" > "${dir}/databases.list"

  echo "Dumping account and integration databases into ${dir}"
  mongodump --uri="$mongo_url" --gzip --db account --archive="${dir}/account.gz"

  for db in '%ai-bot' '%github' 'calendar-service' 'analytics-collector' 'gmail-service' 'telegram-service'; do
    if mongosh "$mongo_url" --quiet --eval "db.getMongo().getDBNames().includes('${db}')" | grep -q true; then
      mongodump --uri="$mongo_url" --gzip --db "$db" --archive="${dir}/${db//%/}.gz"
    fi
  done

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    read -r db last_visit <<<"$line"
    echo "Dumping workspace ${db}"
    mongodump --uri="$mongo_url" --gzip --db "$db" --archive="${dir}/workspaces/${db}-${last_visit}.gz"
  done < "${dir}/databases.list"

  echo "Raw Mongo export complete: ${dir}"
}

workspace_backup() {
  local workspace="${1:-}"
  if [[ -z "$workspace" ]]; then
    echo "Missing workspace argument." >&2
    usage
    exit 1
  fi

  local runner="${TOOL_RUNNER:-rushx run-local}"
  local dir
  dir="$(make_out_dir)"
  mkdir -p "${dir}/workspace-backup"

  echo "Running Praut workspace backup for ${workspace}"
  (
    cd "${ROOT_DIR}/dev/tool"
    # shellcheck disable=SC2086
    $runner backup "${dir}/workspace-backup" "$workspace" --force --fullVerify
  )

  echo "Workspace backup complete: ${dir}/workspace-backup"
}

api_export() {
  require_cmd curl

  local export_url="${PRAUT_EXPORT_URL:-${HULY_EXPORT_URL:-${PRAUT_BASE_URL%/}/_export}}"
  local token="${PRAUT_TOKEN:-${HULY_TOKEN:-}}"
  local format="${PRAUT_FORMAT:-${HULY_FORMAT:-json}}"
  local classes="${PRAUT_CLASSES:-${HULY_CLASSES:-tracker:class:Issue,document:class:Document,contact:class:Person,contact:class:Organization,lead:class:Lead,recruit:class:Candidate}}"

  if [[ -z "$export_url" || -z "$token" ]]; then
    echo "PRAUT_EXPORT_URL and PRAUT_TOKEN are required for api-export." >&2
    exit 1
  fi

  local dir
  dir="$(make_out_dir)"
  mkdir -p "${dir}/api-export"

  IFS=',' read -ra class_list <<<"$classes"
  for class_ref in "${class_list[@]}"; do
    class_ref="$(echo "$class_ref" | xargs)"
    [[ -z "$class_ref" ]] && continue

    local body="${dir}/api-export/${class_ref//[:\/]/_}.request.json"
    local response="${dir}/api-export/${class_ref//[:\/]/_}.response.json"
    printf '{"_class":"%s","query":{},"attributesOnly":false}\n' "$class_ref" > "$body"

    echo "Requesting ${format} export for ${class_ref}"
    curl -sS \
      -X POST "${export_url%/}/exportAsync?format=${format}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      --data-binary "@${body}" \
      -o "$response"
  done

  echo "API export requests complete. Praut will save ZIPs into the workspace Drive."
  echo "Request/response log: ${dir}/api-export"
}

main() {
  local mode="${1:-}"
  case "$mode" in
    raw-mongo)
      raw_mongo
      ;;
    workspace-backup)
      shift
      workspace_backup "$@"
      ;;
    api-export)
      api_export
      ;;
    -h|--help|help|"")
      usage
      ;;
    *)
      echo "Unknown mode: ${mode}" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
