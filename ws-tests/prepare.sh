#!/usr/bin/env bash



# Check if docker-compose.override.yml exists
if [ -f "docker-compose.override.yml" ]; then
    echo "Using docker-compose.override.yml"
    docker compose -p sanity -f docker-compose.yaml -f docker-compose.override.yml kill
    docker compose -p sanity -f docker-compose.yaml -f docker-compose.override.yml down --volumes
    docker compose -p sanity -f docker-compose.yaml -f docker-compose.override.yml up -d --force-recreate --renew-anon-volumes
else
    docker compose -p sanity kill
    docker compose -p sanity down --volumes
    docker compose -p sanity up -d --force-recreate --renew-anon-volumes
fi
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
./tool.sh create-account user1 -f John -l Appleseed -p 1234
./tool.sh create-account user2 -f Kainin -l Dirak -p 1234

./tool.sh create-workspace api-tests email:user1
./tool-europe.sh create-workspace api-tests-cr email:user1 --region 'europe'
./tool.sh assign-workspace user1 api-tests
./tool.sh assign-workspace user1 api-tests-cr

rm -rf ./sanity/.auth
