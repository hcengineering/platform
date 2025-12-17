#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker build -t haiodo/base:${VERSION} -f base.Dockerfile ${DOCKER_EXTRA} .
docker build -t haiodo/base-slim:${VERSION} -f slim.Dockerfile ${DOCKER_EXTRA} .
docker build -t haiodo/rekoni-base:${VERSION} -f rekoni.Dockerfile ${DOCKER_EXTRA} .
docker build -t haiodo/print-base:${VERSION} -f print.Dockerfile ${DOCKER_EXTRA} .
docker build -t haiodo/front-base:${VERSION} -f front.Dockerfile ${DOCKER_EXTRA} .
docker build -t haiodo/preview-base:${VERSION} -f preview.Dockerfile ${DOCKER_EXTRA} .