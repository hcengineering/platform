#!/usr/bin/env bash

mkdir -p ./.build
cd ./.build
if ! test -f ./v20.43.0.zip; then
  wget --quiet https://github.com/uNetworking/uWebSockets.js/archive/refs/tags/v20.43.0.zip
fi
if ! test -f ../lib/uws.js; then
  unzip -qq -j -o ./v20.43.0.zip -d ../lib
fi
