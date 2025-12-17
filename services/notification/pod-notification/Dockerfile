FROM intabia-fusion/base-slim:v20250811
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

EXPOSE 8089 
CMD [ "node", "bundle.js" ]
