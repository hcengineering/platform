FROM node:20-alpine

WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY assets/avatar.png ./

EXPOSE 4008
CMD [ "node", "bundle.js" ]
