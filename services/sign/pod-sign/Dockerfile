
FROM node:20

RUN apt-get update && apt-get install dumb-init
WORKDIR /usr/src/app

RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy --unsafe-perm

COPY bundle/bundle.js ./

CMD [ "dumb-init", "node", "bundle.js" ]
