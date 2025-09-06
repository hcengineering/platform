#!/usr/bin/env bash

./tool-local.sh create-account user1 -f John -l Appleseed -p 1234
./tool-local.sh create-account user2 -f Kainin -l Dirak -p 1234

./tool-local.sh create-workspace sanity-ws email:user1 -r cockroach

# Restore workspace contents in mongo/elastic
./tool-local.sh backup-restore ./sanity-ws sanity-ws --upgrade

./tool-local.sh assign-workspace user1 sanity-ws
./tool-local.sh assign-workspace user2 sanity-ws

./tool-local.sh set-user-role user1 sanity-ws OWNER
./tool-local.sh set-user-role user2 sanity-ws OWNER

./tool-local.sh configure sanity-ws --enable=*
./tool-local.sh configure sanity-ws --list
