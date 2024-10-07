
FROM node:20

WORKDIR /usr/src/app

RUN apt-get update
RUN apt-get install libjemalloc2
RUN apt-get clean

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

COPY bundle/bundle.js ./

EXPOSE 8086
CMD [ "node", "bundle.js" ]
