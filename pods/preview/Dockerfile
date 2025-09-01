FROM hardcoreeng/front-base:v20250310 AS base

FROM node:22-slim
WORKDIR /app

# Copy pre-installed node_modules from your base image
COPY --from=base /app/node_modules ./node_modules

# Install runtime dependencies in one layer and clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init \
    libjemalloc2 \
    ffmpeg \
    poppler-utils \
    libreoffice \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/share/doc/* \
    && rm -rf /usr/share/man/*

ENV LD_PRELOAD=libjemalloc.so.2
ENV MALLOC_CONF=dirty_decay_ms:1000,narenas:2,background_thread:true
ENV NODE_ENV=production

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 4040
CMD ["dumb-init", "node", "bundle.js"]
