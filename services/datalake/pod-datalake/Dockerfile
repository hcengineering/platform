FROM haiodo/base-slim:v20250916
WORKDIR /app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

CMD [ "dumb-init", "node", "bundle.js" ]
