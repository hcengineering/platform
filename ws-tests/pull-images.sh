#!/bin/bash

# Function to handle interrupt
handle_interrupt() {
  echo -e "\nInterrupt received. Exiting..."
  exit 1
}

# Set trap for Ctrl+C (SIGINT)
trap handle_interrupt INT

# Path to docker-compose override file
OVERRIDE_FILE="./docker-compose.override.yml"

# Check if override file exists
if [ ! -f "$OVERRIDE_FILE" ]; then
  echo "Error: $OVERRIDE_FILE not found"
  exit 1
fi

echo "Pulling images specified in $OVERRIDE_FILE..."

# Extract all images from the override file without using a pipe to a subshell
images=($(grep "image:" $OVERRIDE_FILE | awk '{print $2}'))

# Pull each image
for image in "${images[@]}"; do
  if [ -n "$image" ]; then
    echo "Pulling $image..."
    docker pull $image 2>&1 | grep -v "What's next:" | grep -v "docker scout"
    pull_status=${PIPESTATUS[0]}
    if [ $pull_status -ne 0 ]; then
      echo "Failed to pull $image"
    else
      echo "Successfully pulled $image"
    fi
  fi
done

echo "All images have been processed."
