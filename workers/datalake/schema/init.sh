#!/usr/bin/env bash

./cockroach start-single-node --insecure --log-config-file=logs.yaml --cache=.25 --background --store=type=mem,size=50%
./cockroach sql --insecure --file optimizations.sql
./cockroach sql --insecure --execute="CREATE DATABASE datalake;"
./cockroach sql --insecure --database=datalake --file datalake.sql

cd /cockroach/cockroach-data/logs
tail -f cockroach.log
