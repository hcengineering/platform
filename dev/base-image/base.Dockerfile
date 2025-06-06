FROM node:22

RUN apt-get update
RUN apt-get install libjemalloc2 dumb-init
RUN apt-get clean

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

WORKDIR /usr/src/app
ENV NODE_ENV=production
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate snappy msgpackr msgpackr-extract --unsafe-perm
