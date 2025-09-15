
FROM hardcoreeng/base:v20250902
WORKDIR /usr/src/app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 3078
CMD [ "node", "bundle.js" ]
