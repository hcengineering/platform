
FROM node:20

WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy --unsafe-perm

RUN apt-get update
RUN apt-get install libjemalloc2
RUN apt-get clean

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 3078
CMD [ "node", "bundle.js" ]
