FROM node:20

WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy --unsafe-perm

COPY bundle/bundle.js ./

EXPOSE 4007
CMD [ "node", "bundle.js" ]
