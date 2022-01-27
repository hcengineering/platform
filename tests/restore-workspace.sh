#!/bin/bash

# Restore workspace contents in mongo/elastic
./tool.sh restore-workspace sanity-ws sanity-ws/

# Re-assign user to workspace.
./tool.sh assign-workspace user1 sanity-ws
