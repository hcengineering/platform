#!/bin/bash

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

../tests/wait-elastic.sh 9201

# Create user record in accounts
./tool.sh create-account user1 -f John -l Appleseed -p 1234
./tool.sh create-account user2 -f Kainin -l Dirak -p 1234
./tool.sh create-account user3 -f Cain -l Velasquez -p 1234
./tool.sh create-account user4 -f Armin -l Karmin -p 1234
./tool.sh create-account user_qara -f Qara -l Admin -p 1234

# Create init workspace
./tool.sh create-workspace init-ws-qms email:user1

./tool.sh configure init-ws-qms --enable=*
./tool.sh configure init-ws-qms --list

# Create test workspace
./tool.sh create-workspace sanity-ws-qms email:user1

./restore-workspace.sh
