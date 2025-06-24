#!/usr/bin/env bash

# Restore workspace contents in mongo/elastic
./tool-local.sh backup-restore ./sanity-ws sanity-ws --upgrade

# Re-assign user to workspace.
./tool-local.sh assign-workspace user1 sanity-ws
./tool-local.sh assign-workspace user2 sanity-ws
./tool-local.sh set-user-role user1 sanity-ws OWNER
./tool-local.sh set-user-role user2 sanity-ws OWNER

./tool-local.sh configure sanity-ws --enable=*
./tool-local.sh configure sanity-ws --list