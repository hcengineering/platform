#!/usr/bin/env bash

# Restore workspace contents in mongo/elastic
./tool.sh backup-restore ./sanity-ws sanity-ws --upgrade

# Re-assign user to workspace.
./tool.sh assign-workspace user1 sanity-ws
./tool.sh assign-workspace user2 sanity-ws

./tool.sh set-user-role user1 sanity-ws OWNER
./tool.sh set-user-role user2 sanity-ws OWNER

./tool.sh configure sanity-ws --enable=*
./tool.sh configure sanity-ws --list

# setup issue createdOn for yesterday
./tool.sh change-field sanity-ws --objectId 65e47f1f1b875b51e3b4b983 --objectClass tracker:class:Issue --attribute createdOn --value $(($(date +%s)*1000 - 86400000)) --type number