
FROM hardcoreeng/base:v20250916
WORKDIR /usr/src/app
COPY bundle/bundle.js ./

EXPOSE 4009
CMD [ "dumb-init", "node", "bundle.js" ]
