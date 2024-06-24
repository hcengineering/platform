FROM node:20

WORKDIR /usr/src/app

COPY bundle/bundle.js ./
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd --unsafe-perm

RUN apt-get update
RUN apt-get install libjemalloc2

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

EXPOSE 3000
CMD [ "node", "bundle.js" ]
