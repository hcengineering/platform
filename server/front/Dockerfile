FROM node:16

WORKDIR /usr/src/app

COPY bundle.js ./
COPY dist/ ./dist/

EXPOSE 8080
CMD [ "node", "bundle.js" ]
