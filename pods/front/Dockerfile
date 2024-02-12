FROM node:20-alpine

RUN apk add dumb-init
ENV NODE_ENV production

WORKDIR /app
RUN npm install --ignore-scripts=false --verbose sharp@v0.32.6 --unsafe-perm

COPY bundle/bundle.js ./
COPY dist/ ./dist/

EXPOSE 8080
CMD [ "dumb-init", "node", "./bundle.js" ]
