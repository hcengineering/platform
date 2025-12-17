#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker push haiodo/base:${VERSION}
docker push haiodo/base-slim:${VERSION}
docker push haiodo/rekoni-base:${VERSION}
docker push haiodo/print-base:${VERSION}
docker push haiodo/front-base:${VERSION}
docker push haiodo/preview-base:${VERSION}
