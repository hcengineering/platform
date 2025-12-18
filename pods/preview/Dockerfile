FROM intabiafusion/preview-base:v20251218

WORKDIR /app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 4040
CMD ["dumb-init", "node", "bundle.js"]
