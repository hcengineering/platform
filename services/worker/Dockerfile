FROM node:20-bullseye-slim

RUN apt-get update \
    && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# For better cache utilization, copy package.json and lock file first and install the dependencies before copying the
# rest of the application and building.
COPY . /app
WORKDIR /app

ARG TARGET_VERSION=0.7.255
RUN sed -E -i "s/(\"@hcengineering\/[^\"]*\": )\"[^\"]*\"/\1\"$TARGET_VERSION\"/g" package.json

# Alternatively, run npm ci, which installs only dependencies specified in the lock file and is generally faster.
RUN npm install --only=production \
    && npm run build

CMD ["npm", "start"]