FROM intabia-fusion/base-slim:v20250811
WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

COPY ini[t]/ ./init-scripts/

CMD [ "node", "bundle.js" ]

