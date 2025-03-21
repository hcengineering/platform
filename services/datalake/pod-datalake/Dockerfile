FROM hardcoreeng/base:v20250113a
WORKDIR /usr/src/app

RUN npm install --ignore-scripts=false --verbose sharp@v0.32.6 --unsafe-perm

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

CMD [ "dumb-init", "node", "bundle.js" ]
