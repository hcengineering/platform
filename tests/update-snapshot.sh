
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9000
export MONGO_URL=mongodb://localhost:27017
export TRANSACTOR_URL=ws://localhost:3333
export ELASTIC_URL=http://localhost:9200
export SERVER_SECRET=secret

location="${1:-./sanity-ws}"

# Restore workspace contents in mongo/elastic
node ../dev/tool/bundle.js backup ${location} sanity-ws
