FROM hardcoreeng/base:v20250310
WORKDIR /usr/src/app

COPY package.json ./
# Install ws, since it is external dependency and it is not included in the base image
RUN WS_VERSION=$(grep -o '"ws": *"[^"]*"' package.json | grep -o '[0-9][^"]*' | head -1) && \
    if [ -z "$WS_VERSION" ]; then WS_VERSION="8.18.0"; fi && \
    echo "Installing ws version: $WS_VERSION" && \
    rm package.json && \
    npm install --no-package-lock ws@$WS_VERSION

COPY bundle/bundle.js ./

EXPOSE 8087
CMD [ "node", "bundle.js" ]
