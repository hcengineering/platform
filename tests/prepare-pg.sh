#!/usr/bin/env bash

docker compose -p sanity kill
docker compose -p sanity down --volumes
docker compose -p sanity up -d --force-recreate --renew-anon-volumes
docker_exit=$?
if [ ${docker_exit} -eq 0 ]; then
    echo "Container started successfully"
else
    echo "Container started with errors"
    exit ${docker_exit}
fi

if [ "x$DO_CLEAN" == 'xtrue' ]; then
    echo 'Do docker Clean'
    docker system prune -a -f
fi

./wait-elastic.sh 9201

# Create user record in accounts
./tool-pg.sh create-account user1 -f John -l Appleseed -p 1234
./tool-pg.sh create-account user2 -f Kainin -l Dirak -p 1234
./tool-pg.sh create-account admin -f Super -l User -p 1234

# Create workspace record in accounts
./tool-pg.sh create-workspace sanity-ws email:user1

./restore-pg.sh
rm -rf ./sanity/.auth
