FROM node:20

WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy msgpackr msgpackr-extract --unsafe-perm
RUN npm install --ignore-scripts=false --verbose uNetworking/uWebSockets.js#v20.47.0

RUN apt-get update
RUN apt-get install libjemalloc2

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

RUN mv node_modules/uWebSockets.js/*.node .
COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 8080
ENV UWS_HTTP_MAX_HEADERS_SIZE 32768
CMD node bundle.js
