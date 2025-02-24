#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker build -t hardcoreeng/base:${VERSION} -f base.Dockerfile ${DOCKER_EXTRA} .
docker build -t hardcoreeng/rekoni-base:${VERSION} -f rekoni.Dockerfile ${DOCKER_EXTRA} .
docker build -t hardcoreeng/print-base:${VERSION} -f print.Dockerfile ${DOCKER_EXTRA} .
docker build -t hardcoreeng/front-base:${VERSION} -f front.Dockerfile ${DOCKER_EXTRA} .