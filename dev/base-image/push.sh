#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker push intabiafusion/base:${VERSION}
docker push intabiafusion/base-slim:${VERSION}
docker push intabiafusion/rekoni-base:${VERSION}
docker push intabiafusion/print-base:${VERSION}
docker push intabiafusion/front-base:${VERSION}
docker push intabiafusion/preview-base:${VERSION}
