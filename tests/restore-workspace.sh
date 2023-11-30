#!/bin/bash

# Restore workspace contents in mongo/elastic
./tool.sh backup-restore ./sanity-ws sanity-ws

./tool.sh upgrade-workspace sanity-ws

# Re-assign user to workspace.
./tool.sh assign-workspace user1 sanity-ws
./tool.sh assign-workspace user2 sanity-ws

./tool.sh configure sanity-ws --enable=*
./tool.sh configure sanity-ws --list

./generator.sh gen issue sanity-ws '' 1 --title 'Issue for the Created filter-0'
./generator.sh gen issue sanity-ws '' 1 --minusDay '1' --title 'Issue for the Created filter-1'
./generator.sh gen issue sanity-ws '' 1 --minusDay '6' --title 'Issue for the Created filter-6'
