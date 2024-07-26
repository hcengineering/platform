
FROM node:20

WORKDIR /usr/src/app

RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy --unsafe-perm
COPY bundle/bundle.js ./

RUN apt-get update
RUN apt-get install libjemalloc2

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

EXPOSE 3078
CMD [ "node", "--inspect", "--async-stack-traces", "bundle.js" ]
