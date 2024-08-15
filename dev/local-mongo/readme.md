# Overview

A docker configuration to use local installation of mongo db.

## Migrate from docker volume based mongo

```bash
./dump-docker.sh # To dump all databases
./start.sh # to start a local mongodb on ~/.mongo/data folder
./import.sh # To import all stuff into local mongo database.
```

## Usage

```bash
./start.sh # Will start a local mongo database
./stop.sh # Will stop a local mongo dabase

rush docker:local # Will up all necessary containers and point them into local mongo database
```