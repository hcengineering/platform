export MODEL_VERSION=$(node ../common/scripts/show_version.js)
export STORAGE_CONFIG="datalake|http://localhost:4030"
export MONGO_URL=mongodb://localhost:27017
export DB_URL=postgresql://root@localhost:26257/defaultdb?sslmode=disable
export ACCOUNT_DB_URL=postgresql://root@localhost:26257/defaultdb?sslmode=disable
export ACCOUNTS_URL=http://localhost:3000
export TRANSACTOR_URL="ws://huly.local:3333,ws://huly.local:3332;;cockroach"
export ELASTIC_URL=http://localhost:9200
export SERVER_SECRET=secret
export QUEUE_CONFIG=localhost:19092

# Restore workspace contents in mongo/elastic
node ../dev/tool/bundle/bundle.js $@