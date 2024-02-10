FROM node:20

WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY dist/ ./dist/

EXPOSE 8080
CMD [ "node", "bundle.js" ]
