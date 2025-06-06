#!/bin/bash

set -e

# Define the path to the docker-compose.override.yml
DOCKER_COMPOSE_PATH="./docker-compose.override.yml"

# Extract the version of hardcoreeng/transactor from the docker-compose file
VERSION=$(grep "image: hardcoreeng/transactor:" "$DOCKER_COMPOSE_PATH" | head -1 | sed -E 's/.*image: hardcoreeng\/transactor:([^[:space:]]+).*/\1/')

if [ -z "$VERSION" ]; then
  echo "Error: Could not find transactor version in docker-compose file"
  exit 1
fi

echo "Found transactor version: $VERSION"
echo "Fetching hardcoreeng/tool:$VERSION..."

# Pull the tool image with the same version
docker pull "hardcoreeng/tool:$VERSION"

# Create a temporary container from the image
CONTAINER_ID=$(docker container create "hardcoreeng/tool:$VERSION")

# Extract bundle.js from the container
echo "Extracting bundle.js..."
docker cp "$CONTAINER_ID:/usr/src/app/bundle.js" "bundle.js"

# Clean up the temporary container
docker rm "$CONTAINER_ID"

echo "Successfully extracted bundle.js to bundle.js"
