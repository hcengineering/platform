#!/usr/bin/env bash

version=${DOCKER_VERSION:-$(git rev-parse HEAD)}

# Check for cleanup flag from environment
cleanup=false
if [ "$DOCKER_BUILD_CLEANUP" = "true" ]; then
  cleanup=true
fi

echo "Building version: $version" 

docker build -t "$1" -t "$1:$version" ${DOCKER_EXTRA} .

if [ "$cleanup" = true ]; then
  echo "Cleaning up build artifacts..."

  if [ -d "bundle" ]; then
    echo "  Removing bundle/"
    rm -rf bundle
  fi

  if [ -d "dist" ]; then
    echo "  Removing dist/"
    rm -rf dist
  fi

  if [ -d ".rush" ]; then
    echo "  Removing .rush/"
    rm -rf .rush
  fi

  echo "  Size after cleanup: $(du -sh . 2>/dev/null | cut -f1)"
fi
