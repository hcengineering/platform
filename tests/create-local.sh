
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9000
export MONGO_URL=mongodb://localhost:27017
export TRANSACTOR_URL=ws://localhost:3333
export ELASTIC_URL=http://localhost:9200
export SERVER_SECRET=secret

# Create workspace record in accounts
node ../dev/tool/bundle.js create-workspace sanity-ws -o SanityTest
# Create user record in accounts
node ../dev/tool/bundle.js create-account user1 -f John -l Appleseed -p 1234
node ../dev/tool/bundle.js confirm-email user1


# Restore workspace contents in mongo/elastic
node ../dev/tool/bundle.js backup-restore ./sanity-ws sanity-ws

node ../dev/tool/bundle.js upgrade-workspace sanity-ws

# Re-assign user to workspace.
node ../dev/tool/bundle.js assign-workspace user1 sanity-ws

node ../dev/tool/bundle.js configure sanity-ws --enable=*
node ../dev/tool/bundle.js configure sanity-ws --list