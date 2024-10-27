#!/bin/bash
MONGO_URL="mongodb://127.0.0.1:27017"
DAYS=365
dump='dump'

mkdir -p ${dump}
mkdir -p ${dump}/workspaces

get_dbs="db.getSiblingDB('account').getCollection('workspace').find({lastVisit: {\$gt: Date.now() - ($DAYS * 24 * 60 * 60 * 1000)}}).forEach(it=>console.log(it.workspace, it.lastVisit))"

mongosh --version
mongosh ${MONGO_URL} --eval "$get_dbs" > ${dump}/databases.list

mongodump --uri="${MONGO_URL}" --gzip --db account --archive="${dump}/account.gz"
mongodump --uri="${MONGO_URL}" --gzip --db '%ai-bot' --archive="${dump}/ai-bot.gz"
mongodump --uri="${MONGO_URL}" --gzip --db '%github' --archive="${dump}/github.gz"

echo '#restore script' > ${dump}/restore.sh
echo "MONGO_URL=\"${MONGO_URL}\"" >> ${dump}/restore.sh
echo "do_drop=false" >> ${dump}/restore.sh

echo 'mongorestore --uri="${MONGO_URL}" --gzip --drop --nsFrom "account" --nsTo "account" --archive=./account.gz ' >> ${dump}/restore.sh
echo 'mongorestore --uri="${MONGO_URL}" --gzip --drop --nsFrom "%ai-bot" --nsTo "%ai-bot" --archive=./ai-bot.gz ' >> ${dump}/restore.sh
echo 'mongorestore --uri="${MONGO_URL}" --gzip --drop --nsFrom "%github" --nsTo "%github" --archive=./github.gz ' >> ${dump}/restore.sh

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
    echo "mongorestore --uri=\"\${MONGO_URL}\" --gzip --drop --nsFrom \"${db}\" --nsTo \"${db}\" --archive=./workspaces/${db}-${lastVisit}.gz" >> ${dump}/restore.sh
done < ${dump}/databases.list

