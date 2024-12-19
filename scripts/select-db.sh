#!/bin/bash

DB_TYPE=${HULY_DB_TYPE:-all}
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_DIR="$BASE_DIR/dev"

case "$DB_TYPE" in
  mongo)
    docker compose -f "$COMPOSE_DIR/docker-compose.yaml" -f "$COMPOSE_DIR/docker-compose.mongo.yaml" "$@"
    ;;
  cockroach)
    docker compose -f "$COMPOSE_DIR/docker-compose.yaml" -f "$COMPOSE_DIR/docker-compose.cockroach.yaml" "$@"
    ;;
  all|*)
    docker compose -f "$COMPOSE_DIR/docker-compose.yaml" "$@"
    ;;
esac
