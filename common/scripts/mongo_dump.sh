#!/usr/bin/env bash
MONGO_URL="mongodb://127.0.0.1:27017"
DAYS=365
dump='dump'

trap "exit" INT

mkdir -p ${dump}
mkdir -p ${dump}/workspaces

get_dbs="db.getSiblingDB('account').getCollection('workspace').find({ disabled: {\$ne:true}, mode: 'active', lastVisit: {\$gt: Date.now() - ($DAYS * 24 * 60 * 60 * 1000)}}).forEach(it=>console.log(it.workspace, it.lastVisit))"

mongosh --version
mongosh ${MONGO_URL} --eval "$get_dbs" > ${dump}/databases.list

mongodump --uri="${MONGO_URL}" --gzip --db account --archive="${dump}/account.gz"
mongodump --uri="${MONGO_URL}" --gzip --db '%ai-bot' --archive="${dump}/ai-bot.gz"
mongodump --uri="${MONGO_URL}" --gzip --db '%github' --archive="${dump}/github.gz"
mongodump --uri="${MONGO_URL}" --gzip --db 'calendar-service' --archive="${dump}/calendar-service.gz"
mongodump --uri="${MONGO_URL}" --gzip --db 'analytics-collector' --archive="${dump}/analytics-collector.gz"
mongodump --uri="${MONGO_URL}" --gzip --db 'gmail-service' --archive="${dump}/gmail-service.gz"
mongodump --uri="${MONGO_URL}" --gzip --db 'telegram-service' --archive="${dump}/telegram-service.gz"

while IFS= read -r line; do
    arr=($line)
    db="${arr[0]}"
    lastVisit="${arr[1]}"
    echo "DUMPING $db at lastModified $lastVisit"
    aName="${dump}/workspaces/$db-$lastVisit.gz"
    if [ -f $aName ]; then
        echo "DB already dumped $aName"
    else
        mongodump --uri="$MONGO_URL" --gzip --db $db --archive=$aName
    fi
done < ${dump}/databases.list

