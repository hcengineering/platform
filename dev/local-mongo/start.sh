#!/bin/bash
mkdir -p ~/.mongo/data
mongod --config ./mongod.conf --dbpath ~/.mongo/data --directoryperdb --logpath ~/.mongo/mongod.log --fork # --replSet rs0
# while [ test $$(echo "rs.initiate().ok || rs.status().ok" | mongosh) -eq 1]
# do
#   echo 'Wait for mongo init'
#   sleep 1
# done
