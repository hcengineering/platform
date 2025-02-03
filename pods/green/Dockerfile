
FROM hardcoreeng/base:v20250113a
WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 6767
CMD [ "node", "--expose-gc", "bundle.js" ]
