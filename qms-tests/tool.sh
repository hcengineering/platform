#!/bin/bash

export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9002
export ACCOUNTS_URL=http://localhost:3003
export TRANSACTOR_URL=ws://localhost:3334
export MONGO_URL=mongodb://localhost:27018
export ACCOUNT_DB_URL=mongodb://localhost:27018
export DB_URL=mongodb://localhost:27018
export SERVER_SECRET=secret
export STORAGE_CONFIG="minio|localhost:9002?accessKey=minioadmin&secretKey=minioadmin"
export QUEUE_CONFIG=huly.local:19093

node ../dev/tool/bundle/bundle.js $@