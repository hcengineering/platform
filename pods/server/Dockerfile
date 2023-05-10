FROM node:18

ENV NODE_ENV production

WORKDIR /app
RUN npm install --ignore-scripts=false --verbose bufferutil --unsafe-perm

COPY bundle.js ./
# COPY ./dist/*.node ./

EXPOSE 8080
CMD [ "node", "./bundle.js" ]
