
FROM hardcoreeng/print-base:v20250310
WORKDIR /usr/src/app
COPY bundle/bundle.js ./

# Chromium hangs when usging LD_PRELOAD and MALLOC_CONF
ENV LD_PRELOAD=
ENV MALLOC_CONF=

CMD [ "dumb-init", "node", "bundle.js" ]
