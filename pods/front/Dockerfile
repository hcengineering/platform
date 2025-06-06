FROM hardcoreeng/front-base:v20250310
WORKDIR /app

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./
COPY dist/ ./dist/

EXPOSE 8080
CMD [ "node", "./bundle.js" ]
