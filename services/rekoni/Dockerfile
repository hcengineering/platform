FROM node:20-alpine AS build

WORKDIR /usr/src/app

RUN apk upgrade --update && apk add \
  coreutils \
  libxml2-dev \
  html2text \
  autoconf \
  automake \
  build-base \
  gcc

RUN cd ~ && \
  wget http://www.gnu.org/software/unrtf/unrtf-0.21.9.tar.gz && \
  tar xzvf unrtf-0.21.9.tar.gz && \
  cd unrtf-0.21.9/ && \
  ./bootstrap && \
  ./configure && \
  make && \
  make install


FROM node:20-alpine AS runtime

RUN apk upgrade --update && apk add \
  coreutils \
  antiword \
  poppler-utils \
  html2text
ENV NODE_ENV=production
COPY --from=build /usr/local/bin/unrtf /usr/local/bin
RUN mkdir /usr/local/share/unrtf
COPY --from=build /usr/local/share/unrtf/* /usr/local/share/unrtf/
WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose sharp@v0.30.2 pdfjs-dist@v2.12.313 --unsafe-perm
COPY bundle/bundle.js ./
EXPOSE 4004
CMD [ "node", "./bundle.js" ]
