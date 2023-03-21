 docker run -ti -e SERVER_SECRET=secret \
 -e MONGO_URL=mongodb://127.0.0.1:27017 \
 -e TRANSACTOR_URL=ws://127.0.0.1:3333 \
 -e MINIO_ENDPOINT=minio \
 -e MINIO_ACCESS_KEY=minioadmin \
 -e MINIO_SECRET_KEY=minioadmin \
 --rm --network host \
 hardcoreeng/tool node ./bundle upgrade