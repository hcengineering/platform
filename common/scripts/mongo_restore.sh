MONGO_URL="mongodb://127.0.0.1:27017"
do_drop=
#export do_drop=--drop

postfix=
#postfix='-huly'

trap "exit" INT

mongorestore --uri="${MONGO_URL}" --gzip ${do_drop} --nsFrom "account.*" --nsTo "%account${postfix}.*" --archive=./account.gz
mongorestore --uri="${MONGO_URL}" --gzip ${do_drop} --nsFrom "%ai-bot.*" --nsTo "%ai-bot${postfix}.*" --archive=./ai-bot.gz
mongorestore --uri="${MONGO_URL}" --gzip ${do_drop} --nsFrom "%github.*" --nsTo "%github${postfix}.*" --archive=./github.gz
mongorestore --uri="${MONGO_URL}" --gzip ${do_drop} --nsFrom "calendar-service.*" --nsTo "%calendar-service${postfix}.*" --archive=./calendar-service.gz
mongorestore --uri="${MONGO_URL}" --gzip ${do_drop} --nsFrom "analytics-collector.*" --nsTo "%analytics-collector${postfix}.*" --archive=./analytics-collector.gz
mongorestore --uri="${MONGO_URL}" --gzip ${do_drop} --nsFrom "gmail-service.*" --nsTo "%gmail-service${postfix}.*" --archive=./gmail-service.gz
mongorestore --uri="${MONGO_URL}" --gzip ${do_drop} --nsFrom "telegram-service.*" --nsTo "%telegram-service${postfix}.*" --archive=./telegram-service.gz


while IFS= read -r line; do
    arr=($line)
    db="${arr[0]}"
    lastVisit="${arr[1]}"
    aName="./workspaces/$db-$lastVisit.gz"
    stampName="./workspaces/$db-$lastVisit.gz.restored"
    if [ -f $aName ]; then
        if [ -f $stampName ]; then
          echo "DB already restored $aName"
        else
          echo "Restoring DB $aName"
          mongorestore --uri="${MONGO_URL}" --gzip ${do_drop} --nsFrom "${db}" --nsTo "${db}" --archive="./workspaces/${db}-${lastVisit}.gz"
          touch ${stampName}
        fi
    fi
done < ./databases.list
