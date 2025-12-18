FROM intabiafusion/base-slim:v20251218

WORKDIR /usr/src/app

RUN npm install --ignore-scripts=false --verbose zeromq --unsafe-perm

COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

EXPOSE 8080
CMD [ "node", "./bundle.js" ]
