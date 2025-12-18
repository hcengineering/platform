FROM intabiafusion/base-slim:v20251218
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

EXPOSE 8086
CMD [ "node", "bundle.js" ]
