FROM tracexapp/rekoni-base:v20261018
WORKDIR /usr/src/app

RUN npm install --ignore-scripts=false --verbose pdfjs-dist@v6.2.108 unpdf@~1.8.1 --unsafe-perm

COPY bundle/bundle.js ./
EXPOSE 4004
CMD [ "node", "./bundle.js" ]
