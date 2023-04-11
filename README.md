# Anticrm Platform

Anticrm Platform is a framework that help building business applications (such as CRM) fast. Current exemplary applications include Chat, Task Management, and Applicant Tracking System.

## Installation

You need Microsoft's [rush](https://rushjs.io) to install application. Install [rush](https://rushjs.io) with `$ npm install -g @microsoft/rush` command and run `$ rush install` from the repository root, followed by `$ rush build`.

## Build and run inside docker

It is possible to setup all environment required with local docker containers.
Supported both amd64 and armv8 containers.

```bash
cd ./dev/
rush build    # Will build all required packages.
rush bundle   # Will prepare bundles.
rush docker:build   # Will build docker containers for all applications.
docker-compose up -d --force-recreate # Will setup all containers
```

By default docker volumes `dev_db` `dev_elastic` `dev_files` will be created for mongo/elastic/minio instances.

Before we could start we need to create workspace/account and associate it with workspace.

```bash
cd ./tool
rushx run-local create-workspace ws1 -o DevWorkspace # Create workspace
rushx run-local create-account user1 -p 1234 -f John -l Appleseed # Create account
rushx run-local configure sanity-ws --list --enable '*' # Enable all modules, then if they are not yet intended to be used by wide audience.
rushx run-local assign-workspace user1 ws1 # Assign workspace to user

```

Following URL http://localhost:8087 will lead us to app in production mode.

## Run in development mode

```
cd dev/prod
rushx dev-server
```

Then go to http://localhost:8080

## Update project structure and database

If projects structure is updated it might be needed to relink and rebuild projects.

```bash
rush update
rush build
```

It also might be required to upgrade running database.

```bash
cd ./dev/tool
rushx upgrade
```

## Tests

### Unit tests

```bash
rush lint
```

### UI tests

```bash
cd ./tests
rush build
rush bundle
rush docker:build
## creates test docker containers and setups test database
./prepare.sh
## runs UI tests
rushx uitest
```

## Package publishing

```bash
node ./common/scripts/bump.js packageName
```
