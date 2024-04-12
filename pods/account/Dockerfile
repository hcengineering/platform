FROM node:20

WORKDIR /usr/src/app

COPY bundle/bundle.js ./
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd --unsafe-perm

EXPOSE 3000
CMD [ "node", "bundle.js" ]
