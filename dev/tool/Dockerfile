FROM node:20

WORKDIR /usr/src/app

RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy msgpackr msgpackr-extract --unsafe-perm

COPY bundle/bundle.js ./

CMD [ "bash" ]
