FROM node:18

WORKDIR /usr/src/app

COPY bundle.js ./

EXPOSE 8080
CMD [ "node", "--enable-source-maps", "bundle.js" ]
