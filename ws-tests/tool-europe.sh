#!/usr/bin/env bash

export MODEL_VERSION=$(node ../common/scripts/show_version.js)
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=huly.local:9002
export ACCOUNTS_URL=http://huly.local:3003
export TRANSACTOR_URL=ws://huly.local:3334
export ACCOUNT_DB_URL=postgresql://root@huly.local:26258/defaultdb?sslmode=disable
export MONGO_URL=mongodb://huly.local:27018
export ELASTIC_URL=http://huly.local:9201
export SERVER_SECRET=secret
export DB_URL=postgresql://root@huly.local:26258/defaultdb?sslmode=disable

export REGION_INFO="|America;europe|" # Europe without name will not be available for creation of new workspaces.
export TRANSACTOR_URL="ws://huly.local:3334;ws://huly.local:3334,ws://huly.local:3335;ws://huly.local:3335;europe,"
export QUEUE_CONFIG=huly.local:19093

# Check if local bundle.js exists and use it if available
BUNDLE_PATH="../dev/tool/bundle/bundle.js"
if [ -f "./bundle.js" ]; then
  BUNDLE_PATH="./bundle.js"
fi

node ${TOOL_OPTIONS} --max-old-space-size=8096 $BUNDLE_PATH $@