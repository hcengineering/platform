#!/bin/bash
export FULLTEXT_DB_URL=http://localhost:9200
export DB_URL=mongodb://localhost:27017

# "DB_URL": "postgresql://postgres:example@localhost:5432",
export STORAGE_CONFIG="minio|localhost?accessKey=minioadmin&secretKey=minioadmin"
export SERVER_SECRET=secret
export REKONI_URL=http://localhost:4004
export MODEL_JSON=./bundle/model.json
export ELASTIC_INDEX_NAME=local_storage_index
export STATS_URL=http://huly.local:4900
export ACCOUNTS_URL=http://localhost:3000
rushx bundle
node --inspect ./bundle/bundle.js