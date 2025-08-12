#!/usr/bin/env bash

export MODEL_VERSION=$(node ../common/scripts/show_version.js)
export STORAGE_CONFIG="minio|localhost:9002?accessKey=minioadmin&secretKey=minioadmin"
export ACCOUNTS_URL=http://localhost:3003
export TRANSACTOR_URL=ws://localhost:3334
export ACCOUNT_DB_URL=mongodb://localhost:27018
export MONGO_URL=mongodb://localhost:27018
export DB_URL=mongodb://localhost:27018
export ELASTIC_URL=http://localhost:9201
export SERVER_SECRET=secret
export QUEUE_CONFIG='localhost:19093;-staging'

node ../dev/tool/bundle/bundle.js $@