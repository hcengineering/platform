FROM node:20

ENV NODE_ENV production

WORKDIR /app
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd --unsafe-perm

COPY bundle/bundle.js ./

EXPOSE 8080
CMD [ "node", "./bundle.js" ]
