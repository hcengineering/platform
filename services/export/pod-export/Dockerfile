
FROM hardcoreeng/print-base:v20250113a
WORKDIR /usr/src/app
COPY bundle/bundle.js ./

# Chromium hangs when usging LD_PRELOAD and MALLOC_CONF
# TODO: remove this
ENV LD_PRELOAD=
ENV MALLOC_CONF=

CMD [ "dumb-init", "node", "bundle.js" ]
