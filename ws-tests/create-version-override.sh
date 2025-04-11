#!/bin/bash

# Define the target version
VERSION="$1"

# Path to docker-compose.yaml file
COMPOSE_FILE="./docker-compose.yaml"
OVERRIDE_FILE="./docker-compose.override.yml"

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found"
    exit 1
fi

# Create override file with header
echo "# Automatically generated docker-compose override with fixed versions" > $OVERRIDE_FILE
echo "services:" >> $OVERRIDE_FILE

# Extract hardcoreeng services and add them to the override file with fixed versions
grep -B 1 "image: hardcoreeng/" $COMPOSE_FILE | grep -v "\-\-" | grep -v "image:" | sed 's/:$//g' | while read -r service; do
    service=$(echo $service | tr -d ' ')
    if [ -n "$service" ]; then
        echo "  $service:" >> $OVERRIDE_FILE
        
        # Get the image name
        image=$(grep -A 1 "$service:" $COMPOSE_FILE | grep "image: hardcoreeng/" | awk '{print $2}')
        pod_name=$(echo $image | sed 's/hardcoreeng\///')
        
        echo "    image: hardcoreeng/$pod_name:$VERSION" >> $OVERRIDE_FILE
        echo "    pull_policy: always" >> $OVERRIDE_FILE
        if [ "$pod_name" == "account" ]; then
          echo "    environment:" >> $OVERRIDE_FILE
          echo "      - REGION_INFO=|;europe|Europe" >> $OVERRIDE_FILE
        fi
        if [ "$pod_name" == "workspace" ]; then
          echo "    environment:" >> $OVERRIDE_FILE
          echo "      - INIT_WORKSPACE=huly" >> $OVERRIDE_FILE 
        fi
    fi
done

./fetch-tool-bundle.sh

echo "Created $OVERRIDE_FILE with fixed version $VERSION for all hardcoreeng services"
echo "To use it, run: prepare.sh"

