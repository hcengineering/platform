
FROM tracexapp/base-slim:v20261018
WORKDIR /usr/src/app
COPY bundle/bundle.js ./

EXPOSE 4009
CMD [ "dumb-init", "node", "bundle.js" ]
