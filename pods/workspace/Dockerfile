FROM node:20

WORKDIR /usr/src/app

RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy --unsafe-perm

RUN apt-get update
RUN apt-get install libjemalloc2
RUN apt-get clean

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

# Workaround to copy optional init directory
# RUN mkdir -p ./init-scripts
COPY bundle/bundle.js init ./init-scripts/
RUN ls -la
RUN ls -la init-scripts
RUN mv init-scripts/bundle.js ./

COPY bundle/bundle.js.map ./

CMD [ "node", "bundle.js" ]
