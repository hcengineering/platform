#!/usr/bin/env bash

./tool.sh create-workspace asa -w asa
./tool.sh backup-restore ${DUMP_ROOT}/asa asa --skip blob
./tool.sh assign-workspace user1 asa