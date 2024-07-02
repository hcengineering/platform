
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9000
export MONGO_URL=mongodb://localhost:27017
export TRANSACTOR_URL=ws://localhost:3333
export ELASTIC_URL=http://localhost:9200
export SERVER_SECRET=secret

# Restore workspace contents in mongo/elastic
./tool-local.sh backup-restore ./sanity-ws sanity-ws

./tool-local.sh upgrade-workspace sanity-ws

# Re-assign user to workspace.
./tool-local.sh assign-workspace user1 sanity-ws
./tool-local.sh assign-workspace user2 sanity-ws
./tool-local.sh set-user-role user1 sanity-ws OWNER
./tool-local.sh set-user-role user2 sanity-ws OWNER

./tool-local.sh configure sanity-ws --enable=*
./tool-local.sh configure sanity-ws --list