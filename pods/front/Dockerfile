FROM node:18-alpine

RUN apk add dumb-init
ENV NODE_ENV production

WORKDIR /app
RUN npm install --ignore-scripts=false --verbose sharp --unsafe-perm

COPY bundle.js ./
COPY dist/ ./dist/

EXPOSE 8080
CMD [ "dumb-init", "node", "./bundle.js" ]
