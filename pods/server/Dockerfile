FROM node:20

ENV NODE_ENV production

WORKDIR /app
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd --unsafe-perm
RUN npm install --ignore-scripts=false --verbose uNetworking/uWebSockets.js#v20.43.0

RUN apt-get update
RUN apt-get install libjemalloc2

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

COPY bundle/bundle.js ./
RUN mv node_modules/uWebSockets.js/*.node .

EXPOSE 8080

ENV UWS_HTTP_MAX_HEADERS_SIZE 32768
CMD [ "node", "./bundle.js" ]
