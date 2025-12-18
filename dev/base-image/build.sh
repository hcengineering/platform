#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker build -t intabiafusion/base:${VERSION} -f base.Dockerfile ${DOCKER_EXTRA} .
docker build -t intabiafusion/base-slim:${VERSION} -f slim.Dockerfile ${DOCKER_EXTRA} .
docker build -t intabiafusion/rekoni-base:${VERSION} -f rekoni.Dockerfile ${DOCKER_EXTRA} .
docker build -t intabiafusion/print-base:${VERSION} -f print.Dockerfile ${DOCKER_EXTRA} .
docker build -t intabiafusion/front-base:${VERSION} -f front.Dockerfile ${DOCKER_EXTRA} .
docker build -t intabiafusion/preview-base:${VERSION} -f preview.Dockerfile ${DOCKER_EXTRA} .