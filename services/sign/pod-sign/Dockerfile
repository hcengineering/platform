
FROM hardcoreeng/base:v20250902
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

CMD [ "dumb-init", "node", "bundle.js" ]
