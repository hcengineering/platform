FROM tracexapp/base-slim:v20261018
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

EXPOSE 8087
CMD [ "node", "bundle.js" ]
