
FROM node:20

WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate --unsafe-perm

COPY bundle/bundle.js ./

EXPOSE 3078
CMD [ "node", "bundle.js" ]
