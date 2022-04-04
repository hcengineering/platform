# Anticrm Platform

Anticrm Platform is a framework that help building business applications (such as CRM) fast. Current exemplary applications include Chat, Task Management, and Applicant Tracking System.

## Installation

You need Microsoft's [rush](https://rushjs.io) to install application. Install [rush](https://rushjs.io) with `$ npm install -g @microsoft/rush` command and run `$ rush install` from the repository root, followed by `$ rush build`.

## Run in development mode

```
cd dev/prod
rushx dev
```

Then go to http://localhost:8080/login:component:LoginApp and use following credentials to login into the system:

- login: rosamund@hc.engineering
- pass: 1111
- workspace: trx40

To connect to running local server `dev-server` command  should be used instead.

## Build and run inside docker

It is possible to setup all environment required with local docker containers.
Supported both amd64 and armv8 containers.

```bash
rush build    # Will build all required packages.
rush bundle   # Will prepare bundles.
rush docker:build   # Will build docker containers for all applications.
cd ./dev/
docker-compose up -d --force-recreate # Will setup all containers

# we a few seconds delay, to be sure elastic is up and running.
./deploy/setup-es-attachment-pipeline.sh    # Setup elastic search plugin configuration.
```

By default docker volumes `dev_db` `dev_elastic` `dev_files` will be created for mongo/elastic/minio instances.

Before we could start we need to create workspace/account and associate it with workspace.

```bash
cd ./dev/tool
rushx run-local create-workspace ws1 -o DevWorkspace # Create workspace
rushx run-local create-account user1 -p 1234 -f John -l Appleseed # Create account
rushx run-local assign-workspace user1 ws1 # Assign worksapce to user
```

Following URL http://localhost:8081/login:component:LoginApp will lead us to app.

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