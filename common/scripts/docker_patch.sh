#!/usr/bin/env bash

# This script allows building and pushing docker images with a custom version tag.
# It can be run interactively or with the --version flag.

VERSION=""
PLATFORM="linux/amd64"
REMAINING_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    *)
      REMAINING_ARGS+=("$1")
      shift
      ;;
  esac
done

if [ -z "$VERSION" ]; then
  read -p "Enter version tag for docker images: " VERSION
fi

if [ -z "$VERSION" ]; then
  echo "Error: Version tag is required."
  exit 1
fi

export DOCKER_VERSION="$VERSION"
export DOCKER_EXTRA="--platform=$PLATFORM"
echo "Starting docker build and push for version: $DOCKER_VERSION ($PLATFORM)"

# We use 'node common/scripts/install-run-rush.js' to ensure we use the right rush version
node "$(dirname "$0")/install-run-rush.js" docker:build "${REMAINING_ARGS[@]}"
node "$(dirname "$0")/install-run-rush.js" docker:push "${REMAINING_ARGS[@]}"

echo "Docker patch completed for version: $DOCKER_VERSION"
