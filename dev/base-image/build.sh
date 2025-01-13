#!/usr/bin/env bash

docker build -t hardcoreeng/base -f base.Dockerfile .
docker build -t hardcoreeng/rekoni-base -f rekoni.Dockerfile .
docker build -t hardcoreeng/print-base -f print.Dockerfile .
docker build -t hardcoreeng/front-base -f print.Dockerfile .