
FROM hardcoreeng/base:v20250310
WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 6767
CMD [ "node", "--expose-gc", "bundle.js" ]
