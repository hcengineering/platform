#!/usr/bin/env bash

docker build -t hardcoreeng/base -f base.Dockerfile ${DOCKER_EXTRA} .
docker build -t hardcoreeng/rekoni-base -f rekoni.Dockerfile ${DOCKER_EXTRA} .
docker build -t hardcoreeng/print-base -f print.Dockerfile ${DOCKER_EXTRA} .
docker build -t hardcoreeng/front-base -f front.Dockerfile ${DOCKER_EXTRA} .