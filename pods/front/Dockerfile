FROM node:20

ENV NODE_ENV production

WORKDIR /app
RUN npm install --ignore-scripts=false --verbose sharp@v0.32.6 bufferutil utf-8-validate @mongodb-js/zstd --unsafe-perm
COPY bundle/bundle.js ./
COPY dist/ ./dist/

EXPOSE 8080
CMD [ "node", "./bundle.js" ]
