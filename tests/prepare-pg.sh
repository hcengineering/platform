#!/usr/bin/env bash

# Check if docker-compose.override.yml exists
# Load env vars from .env (export them), so DB_PURE_PG_HOST and DB_PURE_PG_URL are available
set -a
. ./.env
set +a
# DB connection URLs are read from env files.
# For dev: ../dev/.env; for tests: ./tests/.env
# Set DB_PURE_PG_URL / DB_URL_PG to point to pgbouncer when running the pure-Postgres configuration.
# Do not hardcode URLs here so .env controls which DB backend is used.
if [ -f "docker-compose.override.versions.yml" ]; then
    docker compose -f docker-compose.yaml -f docker-compose.purepg.yaml -f docker-compose.pgbouncer.yaml -f docker-compose.override.versions.yml -p sanity kill
    docker compose -f docker-compose.yaml -f docker-compose.purepg.yaml -f docker-compose.pgbouncer.yaml -f docker-compose.override.versions.yml -p sanity down --volumes
    docker compose -f docker-compose.yaml -f docker-compose.purepg.yaml -f docker-compose.pgbouncer.yaml -f docker-compose.override.versions.yml -p sanity up -d --force-recreate --renew-anon-volumes
else
    docker compose -f docker-compose.yaml -f docker-compose.purepg.yaml -f docker-compose.pgbouncer.yaml -p sanity kill
    docker compose -f docker-compose.yaml -f docker-compose.purepg.yaml -f docker-compose.pgbouncer.yaml -p sanity down --volumes
    docker compose -f docker-compose.yaml -f docker-compose.purepg.yaml -f docker-compose.pgbouncer.yaml -p sanity up -d --force-recreate --renew-anon-volumes
fi
docker_exit=$?
if [ ${docker_exit} -eq 0 ]; then
    echo "Container started successfully"
else
    echo "Container started with errors"
    exit ${docker_exit}
fi

# Wait for pgbouncer to be ready (container named 'pgbouncer' under project 'sanity')
echo "Waiting for pgbouncer to be ready..."
PGB_CONTAINER=$(docker compose -p sanity ps -q pgbouncer 2>/dev/null || true)
if [ -n "$PGB_CONTAINER" ]; then
    for i in $(seq 1 60); do
        STATUS_HEALTH=$(docker inspect -f '{{ .State.Health.Status }}' "$PGB_CONTAINER" 2>/dev/null || true)
        STATUS_STATE=$(docker inspect -f '{{ .State.Status }}' "$PGB_CONTAINER" 2>/dev/null || true)
        if [ "$STATUS_HEALTH" = "healthy" ] || [ "$STATUS_STATE" = "running" ]; then
            echo "pgbouncer is ready (status: ${STATUS_HEALTH:-$STATUS_STATE})"
            break
        fi
        sleep 1
    done
else
    echo "pgbouncer container not found in the compose project; determining host:port to wait for..."
    # Default host/port to wait for
    WAIT_HOST=localhost
    WAIT_PORT=6432

    # Prefer an explicit host:port from DB_PURE_PG_HOST if present (format: host[:port])
    if [ -n "$DB_PURE_PG_HOST" ]; then
        if echo "$DB_PURE_PG_HOST" | grep -q ':[0-9][0-9]*'; then
            WAIT_HOST=$(echo "$DB_PURE_PG_HOST" | sed -E 's#^(.*):([0-9]+)$#\1#')
            WAIT_PORT=$(echo "$DB_PURE_PG_HOST" | sed -E 's#^(.*):([0-9]+)$#\2#')
        else
            WAIT_HOST="$DB_PURE_PG_HOST"
        fi
    # Fallback to parsing DB_PURE_PG_URL if provided (e.g. postgresql://user:pass@host:port/db)
    elif [ -n "$DB_PURE_PG_URL" ]; then
        HOSTPORT=$(echo "$DB_PURE_PG_URL" | sed -E 's#^[^:]+://([^@]+@)?([^/]+).*#\2#')
        if echo "$HOSTPORT" | grep -q ':[0-9][0-9]*'; then
            WAIT_HOST=$(echo "$HOSTPORT" | cut -d: -f1)
            WAIT_PORT=$(echo "$HOSTPORT" | cut -d: -f2)
        else
            WAIT_HOST="$HOSTPORT"
        fi
    fi

    echo "Waiting for ${WAIT_HOST}:${WAIT_PORT} to be available..."
    for i in $(seq 1 60); do
        if bash -c ">/dev/tcp/${WAIT_HOST}/${WAIT_PORT}" >/dev/null 2>&1; then
            echo "${WAIT_HOST}:${WAIT_PORT} is listening"
            break
        fi
        sleep 1
    done
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
