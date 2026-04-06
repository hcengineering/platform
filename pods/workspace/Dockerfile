FROM hardcoreeng/base-slim:v20250916
WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./
RUN mkdir -p ./init-scripts/

CMD [ "node", "bundle.js" ]
