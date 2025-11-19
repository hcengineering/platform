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

