FROM hardcoreeng/front-base:v20250310
WORKDIR /app

RUN apt-get update
RUN apt-get install -y \
  ffmpeg \
  poppler-utils \
  libreoffice
RUN apt-get clean

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 4040
CMD [ "dumb-init", "node", "bundle.js" ]
