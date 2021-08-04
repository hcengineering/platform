FROM node:14

WORKDIR /usr/src/app

COPY package.json ./
COPY index.mjs ./

RUN npm install


EXPOSE 3333
CMD [ "node", "index.mjs" ]
