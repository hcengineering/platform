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


# Create init workspace
./tool.sh create-workspace init-ws-qms -w InitTest
./tool.sh configure init-ws-qms --enable=*
./tool.sh configure init-ws-qms --list

# Create workspace record in accounts
./tool.sh create-workspace sanity-ws-qms -w SanityTest
# Create user record in accounts
./tool.sh create-account user1 -f John -l Appleseed -p 1234
./tool.sh create-account user2 -f Kainin -l Dirak -p 1234
./tool.sh create-account user3 -f Cain -l Velasquez -p 1234
./tool.sh create-account user4 -f Armin -l Karmin -p 1234

# Make user the workspace maintainer
./tool.sh confirm-email user1
./tool.sh confirm-email user2
./tool.sh confirm-email user3
./tool.sh confirm-email user4

./tool.sh create-account user_qara -f Qara -l Admin -p 1234
./tool.sh confirm-email user_qara

./restore-workspace.sh