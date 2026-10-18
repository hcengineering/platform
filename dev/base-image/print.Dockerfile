FROM node:24.22.0

WORKDIR /usr/src/app
ENV NODE_ENV=production
RUN npm install --ignore-scripts=false --verbose bufferutil utf-8-validate snappy@7.2.2 msgpackr msgpackr-extract --unsafe-perm

# Chromium hangs when usging LD_PRELOAD and MALLOC_CONF
ENV LD_PRELOAD=
ENV MALLOC_CONF=

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Set executable path for puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Currently the latest version available for both amd64 and arm64 on Debian 12
# Corresponds to puppeteer v25.3.0
# see https://pptr.dev/supported-browsers
# Debian only keeps the current security build in its pool, so this pin will
# go stale again once bookworm ships a newer chromium point release.
ARG CHROMIUM_VERSION="150.0.7871.100-1~deb12u1"

# Install Chromium and fonts
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md?plain=1#L397
RUN apt-get update --fix-missing
RUN apt-get install -y dumb-init
RUN apt-get install -y gnupg wget libxss1
RUN apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf
RUN apt-get install -y chromium-common=${CHROMIUM_VERSION} --no-install-recommends
RUN apt-get install -y chromium=${CHROMIUM_VERSION} --no-install-recommends
RUN apt-get clean