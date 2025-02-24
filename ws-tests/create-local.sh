#!/usr/bin/env bash

./tool-local.sh create-account user1 -f John -l Appleseed -p 1234
./tool-local.sh create-account user2 -f Kainin -l Dirak -p 1234

./tool-local.sh create-workspace sanity-ws email:user1
