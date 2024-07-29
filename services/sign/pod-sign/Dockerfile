
FROM node:20

RUN apt-get update && apt-get install dumb-init
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

CMD [ "dumb-init", "node", "bundle.js" ]
