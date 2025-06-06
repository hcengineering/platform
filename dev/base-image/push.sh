#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker push hardcoreeng/base:${VERSION}
docker push hardcoreeng/rekoni-base:${VERSION}
docker push hardcoreeng/print-base:${VERSION}
docker push hardcoreeng/front-base:${VERSION}