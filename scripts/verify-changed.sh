#!/usr/bin/env bash
set -euo pipefail

# Verify only packages touched by current branch changes.
# Usage:
#   ./scripts/verify-changed.sh             # local unstaged/staged/untracked changes
# Options:
#   SKIP_TESTS=1 ./scripts/verify-changed.sh   # run validate only

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

ensure_node_version() {
  # Best-effort: align shell Node with repo .nvmrc to avoid rush/pnpm engine issues.
  if [[ -f ".nvmrc" ]] && command -v nvm >/dev/null 2>&1; then
    local required
    required="$(tr -d '[:space:]' < .nvmrc)"
    if [[ -n "$required" ]]; then
      echo "Switching Node via nvm: $required"
      # shellcheck disable=SC1090
      nvm use "$required" >/dev/null
      echo "Using Node $(node -v)"
    fi
  elif [[ -f ".nvmrc" ]]; then
    echo "Note: .nvmrc found but 'nvm' is unavailable in this shell."
    echo "      Consider running: nvm use"
  fi
}

run_rush() {
  if command -v rush >/dev/null 2>&1; then
    rush "$@"
  else
    node common/scripts/install-run-rush.js "$@"
  fi
}

run_validate_with_transient_retry() {
  local pkg="$1"
  local out_file
  out_file="$(mktemp)"

  if run_rush validate -t "$pkg" 2>&1 | tee "$out_file"; then
    rm -f "$out_file"
    return 0
  fi

  # When workspace package declarations are stale, TS can fail with missing module declarations.
  # Do one targeted rebuild and retry validate once.
  if rg -n "Cannot find module '@hcengineering/|or its corresponding type declarations" "$out_file" >/dev/null 2>&1; then
    echo "Detected likely transient workspace declaration error. Rebuilding $pkg and retrying validate once..."
    run_rush rebuild -t "$pkg"
    run_rush validate -t "$pkg"
    rm -f "$out_file"
    return 0
  fi

  rm -f "$out_file"
  return 1
}

ensure_node_version

mapfile -t CHANGED_FILES < <(
  {
    git diff --name-only
    git diff --name-only --cached
    git ls-files --others --exclude-standard
  } | awk 'NF' | sort -u
)

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  echo "No local changed files."
  exit 0
fi

declare -A PKG_DIRS=()

for file in "${CHANGED_FILES[@]}"; do
  [[ "$file" == *"/node_modules/"* ]] && continue
  [[ "$file" == common/temp/* ]] && continue
  [[ ! -e "$file" ]] && continue

  dir="$file"
  [[ -f "$dir" ]] && dir="$(dirname "$dir")"

  while [[ "$dir" != "." && "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" ]]; then
      PKG_DIRS["$dir"]=1
      break
    fi
    dir="$(dirname "$dir")"
  done
done

if [[ ${#PKG_DIRS[@]} -eq 0 ]]; then
  echo "No changed Rush package directories detected."
  exit 0
fi

echo "Detected changed package directories:"
for d in "${!PKG_DIRS[@]}"; do
  echo "  - $d"
done

echo
echo "Resolving package names..."
PACKAGE_NAMES=()
for d in "${!PKG_DIRS[@]}"; do
  name="$(node -e "const p=require('./${d}/package.json'); process.stdout.write(p.name || '')")"
  if [[ -n "$name" ]]; then
    PACKAGE_NAMES+=("$name")
  fi
done

if [[ ${#PACKAGE_NAMES[@]} -eq 0 ]]; then
  echo "No package names resolved from changed directories."
  exit 0
fi

echo "Running targeted validate/test per package:"
for name in "${PACKAGE_NAMES[@]}"; do
  echo
  echo "==> $name :: validate"
  run_validate_with_transient_retry "$name"
  if [[ "${SKIP_TESTS:-0}" != "1" ]]; then
    echo "==> $name :: test"
    run_rush test -t "$name"
  fi
done

echo
echo "Done."

