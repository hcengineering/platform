FROM haiodo/base-slim:v20250411
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

EXPOSE 8095
CMD [ "node", "bundle.js" ]
