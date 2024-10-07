FROM node:20 AS runtime

RUN apt-get update
RUN apt-get install -y \
  coreutils \
  antiword \
  poppler-utils \
  html2text \
  unrtf
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose sharp@v0.30.2 pdfjs-dist@v2.12.313 --unsafe-perm

RUN apt-get update
RUN apt-get install -y libjemalloc2
RUN apt-get clean

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true

COPY bundle/bundle.js ./
EXPOSE 4004
CMD [ "node", "./bundle.js" ]
