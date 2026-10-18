FROM tracexapp/base-slim:v20261018

WORKDIR /app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 8080
CMD ["dumb-init", "node", "bundle.js"]
