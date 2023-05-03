FROM node:18

RUN apt install git
WORKDIR /usr/src/app

COPY bundle.js ./
# COPY ./dist/*.node ./

EXPOSE 8080
CMD [ "node", "bundle.js" ]
