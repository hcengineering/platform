#!/usr/bin/env bash

docker push hardcoreeng/base ${DOCKER_EXTRA}
docker push hardcoreeng/rekoni-base ${DOCKER_EXTRA}
docker push hardcoreeng/print-base ${DOCKER_EXTRA}
docker push hardcoreeng/front-base ${DOCKER_EXTRA}