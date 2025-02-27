#!/usr/bin/env bash

export MODEL_VERSION=$(node ../common/scripts/show_version.js)
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9002
export ACCOUNTS_URL=http://localhost:3003
export TRANSACTOR_URL=ws://localhost:3334
# export ACCOUNT_DB_URL=postgresql://root@localhost:26258/defaultdb?sslmode=disable
export ACCOUNT_DB_URL=mongodb://localhost:27018
export MONGO_URL=mongodb://localhost:27018
export ELASTIC_URL=http://localhost:9201
export SERVER_SECRET=secret
export DB_URL=postgresql://root@localhost:26258/defaultdb?sslmode=disable

export REGION_INFO="|America;europe|" # Europe without name will not be available for creation of new workspaces.
export TRANSACTOR_URL="ws://transactor:3334;ws://localhost:3334,ws://transactor-europe:3335;ws://localhost:3335;europe,"

node ${TOOL_OPTIONS} --max-old-space-size=8096 ../dev/tool/bundle/bundle.js $@