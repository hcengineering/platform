FROM haiodo/base-slim:v20250811
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

EXPOSE 8096
CMD [ "node", "bundle.js" ]
