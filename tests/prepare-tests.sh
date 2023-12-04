#!/bin/bash

docker compose -p sanity kill
docker compose -p sanity down --volumes
docker compose -p sanity up elastic mongodb -d --force-recreate --renew-anon-volumes

./wait-elastic.sh 9201