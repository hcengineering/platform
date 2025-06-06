#!/bin/bash

# Restore workspace contents in mongo/elastic
./tool.sh backup-restore ./sanity-ws-qms/ sanity-ws-qms

./tool.sh upgrade-workspace sanity-ws-qms 

# Re-assign user to workspace.
./tool.sh assign-workspace user1 sanity-ws-qms
./tool.sh assign-workspace user2 sanity-ws-qms
./tool.sh assign-workspace user3 sanity-ws-qms
./tool.sh assign-workspace user4 sanity-ws-qms
./tool.sh assign-workspace user_qara sanity-ws-qms

./tool.sh set-user-role user2 sanity-ws-qms OWNER

./tool.sh configure sanity-ws-qms --enable=*
./tool.sh configure sanity-ws-qms --list

# resets employee active status so it can be set again and trigger filling default spaces owners
# can be removed once we merge prod and develop and update the sanity workspace backup
./tool.sh change-field sanity-ws-qms --objectId 65a04887e1043543cd5f21a5 --objectClass contact:class:Person --attribute contact:mixin:Employee.active --value false --type boolean