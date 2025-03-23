export MODEL_VERSION=$(node ../common/scripts/show_version.js)
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost:9000
export MONGO_URL=mongodb://localhost:27017
export DB_URL=mongodb://localhost:27017
export ACCOUNT_DB_URL=mongodb://localhost:27017
export ACCOUNTS_URL=http://localhost:3000
export TRANSACTOR_URL=ws://localhost:3333
export ELASTIC_URL=http://localhost:9200
export SERVER_SECRET=secret
export QUEUE_CONFIG=localhost:19092

# Restore workspace contents in mongo/elastic
node ../dev/tool/bundle/bundle.js $@