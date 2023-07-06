# Anticrm Platform

Anticrm Platform is a framework that help building business applications (such as CRM) fast.
Current exemplary applications include Chat, Issue Management(Tracker), and Applicant Tracking System, Boards, Leads, HR.

## Installation

You need Microsoft's [rush](https://rushjs.io) to install application.

Install [rush](https://rushjs.io) with `$ npm install -g @microsoft/rush` command and run `$ rush install` from the repository root, followed by `$ rush build`.

## Build and run

Development environment setup require Docker to be installed on system.

Supported both amd64 and armv8(arm64) containers on Linux and Macos.

```bash
cd ./dev/
rush build    # Will build all required packages.
rush bundle   # Will prepare bundles.
rush docker:build   # Will build docker containers for all applications in local docker environment.
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
rushx run-local confirm-email user1 # To allow create of more test workspaces.

```

Following URL http://localhost:8087 will lead us to app in production mode.

Limitations:

- Location installation do not allow to send emails, so password recovery and notification to email functionality is not working.
- Telegram/Gmail/Content integrations are available only as docker container and they are build from private repository sources, but could be used with platform.

## Run in development mode

Development mode allow to live reload and smooth development process.

```bash
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

In cases when project doesn't build for any logical reason try:

```bash
rush update
rush build --clean
```

## Tests

### Unit tests

```bash
rush test # To execute all tests

rushx test # For individual test execution inside a package directory
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

To execute tests in development environment, please do following steps:

```bash
cd ./tests
./create-local.sh ## use ./restore-local.sh to just restore sanity workspace to predefined initial state.
cd ./sanity
rushx dev-uitest # To execute all tests against the development environment.
rushx dev-debug -g 'pattern' # To execute tests in debug mode with only test matching pattern.
```

## Package publishing

```bash
node ./common/scripts/bump.js -p projectName
```

## Additional testing

This project is tested with BrowserStack.
