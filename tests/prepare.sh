#!/bin/bash

docker-compose -p sanity kill
docker-compose -p sanity down --volumes
docker-compose -p sanity up -d --force-recreate --renew-anon-volumes

# Creae workspace record in accounts
./tool.sh create-workspace sanity-ws -o SanityTest
# Create user record in accounts
./tool.sh create-account user1 -f John -l Appleseed -p 1234

./restore-workspace.sh