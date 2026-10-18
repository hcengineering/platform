FROM node:24.22.0

RUN apt-get update
RUN apt-get install libjemalloc2 dumb-init
RUN apt-get clean

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

WORKDIR /app
ENV NODE_ENV=production
RUN npm install --ignore-scripts=false --verbose bufferutil sharp@v0.35.3 utf-8-validate snappy@7.2.2 --unsafe-perm

