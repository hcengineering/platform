FROM node:20

ENV NODE_ENV production

WORKDIR /app
RUN npm install --ignore-scripts=false --verbose sharp@v0.32.6 bufferutil utf-8-validate @mongodb-js/zstd snappy --unsafe-perm

RUN apt-get update
RUN apt-get install libjemalloc2
RUN apt-get clean

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./
COPY dist/ ./dist/

EXPOSE 8080
CMD [ "node", "./bundle.js" ]
