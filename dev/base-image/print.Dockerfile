FROM hardcoreeng/base

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# Set executable path for puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install Chromium and fonts
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md?plain=1#L397
RUN apt-get update --fix-missing
RUN apt-get install -y gnupg wget libxss1
RUN apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf
RUN apt-get install -y chromium-common/stable  --no-install-recommends
RUN apt-get install -y chromium/stable  --no-install-recommends
RUN apt-get clean
