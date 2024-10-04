FROM node:22

WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy --unsafe-perm

COPY bundle/bundle.js ./
COPY assets/avatar.png ./

EXPOSE 4010
CMD [ "node", "bundle.js" ]
