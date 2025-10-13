FROM node:20-bullseye-slim

RUN apt-get update \
    && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV NODE_ENV=production
RUN npm install --ignore-scripts=false --verbose @temporalio/worker @temporalio/workflow --unsafe-perm

COPY bundle/bundle.js ./
COPY bundle/workflows.js ./

CMD [ "node", "bundle.js" ]
