FROM haiodo/base-slim:v20250811
WORKDIR /usr/src/app

RUN npm install -g pnpm

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml

RUN pnpm install
COPY ./bundle .

EXPOSE 4012
CMD [ "node", "index.js" , "start"]
