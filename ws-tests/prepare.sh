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
./tool.sh create-account admin -f Super -l Admin -p 1234
./tool.sh set-user-admin admin true

./tool.sh create-account user1 -f John -l Appleseed -p 1234
./tool.sh create-account user2 -f Kainin -l Dirak -p 1234

./tool.sh confirm-email user1
./tool.sh confirm-email user2


./tool.sh create-workspace api-tests -w api-tests
./tool-europe.sh create-workspace api-tests-cr -w api-tests --region 'europe'
./tool.sh assign-workspace user1 api-tests
./tool.sh assign-workspace user1 api-tests-cr
