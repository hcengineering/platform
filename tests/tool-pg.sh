#!/usr/bin/env bash

export MODEL_VERSION=$(node ../common/scripts/show_version.js)
export STORAGE_CONFIG="datalake|http://localhost:4031"
export ACCOUNTS_URL=http://localhost:3003
export TRANSACTOR_URL=ws://localhost:3334
export ACCOUNT_DB_URL=postgresql://root@localhost:26258/defaultdb?sslmode=disable
export MONGO_URL=mongodb://localhost:27018
export ELASTIC_URL=http://localhost:9201
export SERVER_SECRET=secret
export DB_URL=postgresql://root@localhost:26258/defaultdb?sslmode=disable
export QUEUE_CONFIG='localhost:19093;-staging'

node ${TOOL_OPTIONS} ../dev/tool/bundle/bundle.js $@