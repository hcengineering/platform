#!/bin/bash

CONFIG_PATH="../src/config/default.toml"
SECRET=$(grep '^token_secret' "$CONFIG_PATH" | sed -E 's/.*=\s*"(.*)"/\1/') # "

if [ -z "$SECRET" ]; then
  echo "❌No token_secret in $CONFIG_PATH"
  exit 1
fi

claims=$1 # "claims.json"

#TOKEN=$(echo -n "${SECRET}" | jwt -alg HS256 -key - -sign claims.json)
TOKEN=$(echo -n "${SECRET}" | jwt -alg HS256 -key - -sign ${claims})

echo "$TOKEN"
