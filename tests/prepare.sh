#!/bin/bash

docker-compose -p sanity kill
docker-compose -p sanity down --volumes
docker-compose -p sanity up -d --force-recreate --renew-anon-volumes

./wait-elastic.sh 9201

# Create workspace record in accounts
./tool.sh create-workspace sanity-ws -o SanityTest
# Create user record in accounts
./tool.sh create-account user1 -f John -l Appleseed -p 1234
# Make user the workspace maintainer
./tool.sh set-user-role user1 sanity-ws 1
./tool.sh confirm-email user1

./restore-workspace.sh