
FROM node:22

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Set executable path for puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install Chromium and fonts
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md?plain=1#L397
RUN apt-get update && \
  apt-get install -y gnupg wget dumb-init && \
  apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 && \
  apt-get install -y chromium --no-install-recommends && \
  apt-get clean

WORKDIR /usr/src/app

RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate @mongodb-js/zstd snappy --unsafe-perm
COPY bundle/bundle.js ./

CMD [ "dumb-init", "node", "bundle.js" ]
