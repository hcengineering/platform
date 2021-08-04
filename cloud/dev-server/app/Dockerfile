FROM node:14

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY ./lib ./lib

EXPOSE 3333
CMD [ "node", "lib/server.js" ]
