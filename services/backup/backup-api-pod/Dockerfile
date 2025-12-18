FROM intabiafusion/front-base:v20251218
WORKDIR /app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

CMD [ "dumb-init", "node", "bundle.js" ]
