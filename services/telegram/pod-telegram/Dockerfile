FROM hardcoreeng/base-slim:v20250916
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

EXPOSE 8086
CMD [ "node", "bundle.js" ]
