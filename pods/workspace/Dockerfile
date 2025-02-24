FROM hardcoreeng/base:v20250113a
WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

COPY ini[t]/ ./init-scripts/

CMD [ "node", "bundle.js" ]

