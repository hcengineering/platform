#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker push intabia-fusion/base:${VERSION}
docker push intabia-fusion/base-slim:${VERSION}
docker push intabia-fusion/rekoni-base:${VERSION}
docker push intabia-fusion/print-base:${VERSION}
docker push intabia-fusion/front-base:${VERSION}
docker push intabia-fusion/preview-base:${VERSION}
