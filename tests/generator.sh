#!/bin/bash

export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost
export MINIO_PORT=9002
export TRANSACTOR_URL=ws://localhost:3334

node ../dev/generator/bundle.js "$@"