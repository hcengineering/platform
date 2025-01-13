FROM hardcoreeng/base

WORKDIR /usr/src/app
RUN npm install --ignore-scripts=false --verbose sharp@v0.32.6 --unsafe-perm
