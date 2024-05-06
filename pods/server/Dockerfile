FROM node:20

ENV NODE_ENV production

WORKDIR /app
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd --unsafe-perm
RUN npm install --ignore-scripts=false --verbose uNetworking/uWebSockets.js#v20.43.0

COPY bundle/bundle.js ./
RUN mv node_modules/uWebSockets.js/*.node .

EXPOSE 8080

ENV UWS_HTTP_MAX_HEADERS_SIZE 32768
CMD [ "node", "./bundle.js" ]
