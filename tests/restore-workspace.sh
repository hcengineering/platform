#!/bin/bash

# Restore workspace contents in mongo/elastic
./tool.sh backup-restore ./sanity-ws sanity-ws

./tool.sh upgrade-workspace sanity-ws

# Re-assign user to workspace.
./tool.sh assign-workspace user1 sanity-ws

./tool.sh configure sanity-ws --enable=*
./tool.sh configure sanity-ws --list
