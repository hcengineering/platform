#!/usr/bin/env bash

docker compose -p sanity kill
docker compose -p sanity down --volumes
docker compose -f docker-compose.yaml -p sanity up elastic mongodb cockroach redpanda redpanda_console -d --force-recreate --renew-anon-volumes
docker_exit=$?
if [ ${docker_exit} -eq 0 ]; then
    echo "Container started successfully"
else
    echo "Container started with errors"
    exit ${docker_exit}
fi

./wait-elastic.sh 9201