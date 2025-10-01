#!/bin/bash

export NETWORK_HOST="huly.local:3737"
export AGENT_HOST="huly.local:13738"
export MODE="transactor"
export FULLTEXT_URL="http://localhost:4710"
export DB_URL="mongodb://localhost:27018"
# export SERVER_PORT="3334"
export METRICS_CONSOLE="false"
export DEBUG_PRINT_SQL="true"
export METRICS_FILE="$(pwd)/../../metrics.txt"
export STORAGE_CONFIG="minio|localhost?accessKey=minioadmin&secretKey=minioadmin"
export SERVER_SECRET="secret"
export ENABLE_CONSOLE="true"
export COLLABORATOR_URL="ws://localhost:3079"
export FRONT_URL="http://localhost:8083"
export ACCOUNTS_URL="http://localhost:3003"
export MODEL_JSON="$(pwd)/../../models/all/bundle/model.json"
export MODEL_VERSION="0.7.230"
export STATS_URL="http://huly.local:4901"
export QUEUE_CONFIG="localhost:19093"

node --inspect --nolazy -r ts-node/register src/__start.ts
