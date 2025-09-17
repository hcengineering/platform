FROM node:22-slim

RUN apt-get update
RUN apt-get install libjemalloc2 dumb-init ca-certificates -y
RUN apt-get clean

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

WORKDIR /usr/src/app
ENV NODE_ENV=production
