#!/usr/bin/env bash

export ACCOUNTS_URL=http://localhost:3333
export UPLOAD_URL=http://localhost:3333/files
export COLLABORATOR_URL=ws://localhost:3078
export MINIO_ENDPOINT=minio
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin 

node ./bundle/bundle.js