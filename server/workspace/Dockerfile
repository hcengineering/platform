FROM node

WORKDIR /usr/src/app

COPY bundle.js ./

ENV TRANSACTOR_URL ws://transactor/
ENV MINIO_ENDPOINT minio

EXPOSE 8080
CMD [ "bash" ]
