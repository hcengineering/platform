
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9002
export MONGO_URL=mongodb://localhost:27018
export TRANSACTOR_URL=ws:/localhost:3334
export ELASTIC_URL=http://localhost:9201
export SERVER_SECRET=secret

# Restore workspace contents in mongo/elastic
node ../dev/tool/bundle.js restore-workspace sanity-ws sanity-ws/

# Re-assign user to workspace.
node ../dev/tool/bundle.js assign-workspace user1 sanity-ws
