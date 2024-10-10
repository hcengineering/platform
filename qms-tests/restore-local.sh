
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9000
export MONGO_URL=mongodb://localhost:27017
export ELASTIC_URL=http://localhost:9200
export SERVER_SECRET=secret

# Restore workspace contents in mongo/elastic
./tool-local.sh backup-restore ./sanity-ws-qms sanity-ws-qms

./tool-local.sh upgrade-workspace sanity-ws-qms

# Re-assign user to workspace.
./tool-local.sh assign-workspace user1 sanity-ws-qms
./tool-local.sh assign-workspace user2 sanity-ws-qms
./tool-local.sh assign-workspace user3 sanity-ws-qms
./tool-local.sh assign-workspace user4 sanity-ws-qms

./tool-local.sh assign-workspace user_qara sanity-ws-qms
./tool-local.sh set-user-role user1 sanity-ws-qms OWNER
./tool-local.sh set-user-role user2 sanity-ws-qms OWNER

./tool-local.sh configure sanity-ws-qms --enable=*
./tool-local.sh configure sanity-ws-qms --list