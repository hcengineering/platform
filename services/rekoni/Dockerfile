FROM node:22-alpine AS runtime

RUN apk upgrade --update && apk add \
  coreutils \
  antiword \
  poppler-utils \
  html2text \
  unrtf
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose sharp@v0.30.2 pdfjs-dist@v2.12.313 --unsafe-perm
COPY bundle/bundle.js ./
EXPOSE 4004
CMD [ "node", "./bundle.js" ]
