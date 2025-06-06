
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9002
export ACCOUNTS_URL=http://localhost:3003
export MONGO_URL=mongodb://localhost:27018
export ELASTIC_URL=http://localhost:9201
export SERVER_SECRET=secret

location="${1:-./sanity-ws}"

# Restore workspace contents in mongo/elastic
node ../dev/tool/bundle/bundle.js backup ${location} sanity-ws
