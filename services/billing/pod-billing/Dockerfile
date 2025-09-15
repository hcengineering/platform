FROM hardcoreeng/base:v20250915
WORKDIR /app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

CMD [ "dumb-init", "node", "bundle.js" ]
