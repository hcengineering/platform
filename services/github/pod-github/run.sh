export APP_ID="$POD_GITHUB_APPID"
export CLIENT_ID="$POD_GITHUB_CLIENTID"
export CLIENT_SECRET="$POD_GITHUB_CLIENT_SECRET"
export PRIVATE_KEY="$POD_GITHUB_PRIVATE_KEY"
export SERVER_SECRET=secret
export ACCOUNTS_URL=http://localhost:3000
export COLLABORATOR_URL=http://localhost:3078
export MINIO_ACCESS_KEY=minioadminchmo
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=localhost
export MONGO_URL=mongodb://localhost:27017
rush bundle --to @hcengineering/pod-github
node $@ bundle/bundle.js $@