#!/bin/bash

export FULLTEXT_URL="http://huly.local:4710"
export DB_URL="mongodb://huly.local:27018"
# export DB_URL="postgresql://postgres:example@huly.local:5432"
# export DB_URL="postgresql://root@huly.local:26258/defaultdb?sslmode=disable"
# export GREEN_URL="http://huly.local:6767?token=secret"
export REGION=
export SERVER_PORT="3334"
export METRICS_CONSOLE="false"
export DEBUG_PRINT_SQL="true"
export METRICS_FILE="$(pwd)/../../metrics.txt"
export STORAGE_CONFIG="datalake|http://huly.local:4031"
export SERVER_SECRET="secret"
export ENABLE_CONSOLE="true"
export COLLABORATOR_URL="ws://huly.local:3079"
export ENABLE_COMPRESSION=true
export FRONT_URL="http://huly.local:8083"
export ACCOUNTS_URL="http://huly.local:3003"
export MODEL_JSON="$(pwd)/../../models/all/bundle/model.json"
export MODEL_VERSION="0.7.230"
export STATS_URL="http://huly.local:4901"
export QUEUE_CONFIG="huly.local:19093"

cd "$(dirname "$0")"
node --inspect --nolazy -r ts-node/register src/__start.ts
