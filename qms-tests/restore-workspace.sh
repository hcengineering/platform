#!/bin/bash

# Restore workspace contents in mongo/elastic
./tool.sh backup-restore ./sanity-ws-qms/ sanity-ws-qms

./tool.sh upgrade-workspace sanity-ws-qms 

# Re-assign user to workspace.
./tool.sh assign-workspace user1 sanity-ws-qms
./tool.sh assign-workspace user2 sanity-ws-qms
./tool.sh assign-workspace user3 sanity-ws-qms
./tool.sh assign-workspace user4 sanity-ws-qms

./tool.sh set-user-role user2 sanity-ws-qms OWNER
./tool.sh assign-workspace user_qara sanity-ws-qms

./tool.sh configure sanity-ws-qms --enable=*
./tool.sh configure sanity-ws-qms --list