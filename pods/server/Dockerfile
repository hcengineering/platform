FROM hardcoreeng/base:v20250310
WORKDIR /usr/src/app

COPY bundle/model.json ./
COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 8080
CMD [ "node", "./bundle.js" ]
