
FROM hardcoreeng/base
WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./
COPY bundle/model.json ./

EXPOSE 4700
CMD [ "node", "--expose-gc", "bundle.js" ]
