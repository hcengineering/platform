
FROM hardcoreeng/base:v20250310
WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./
COPY bundle/model.json ./

EXPOSE 3000
CMD [ "node", "--expose-gc", "bundle.js" ]
