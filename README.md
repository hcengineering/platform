# Anticrm Platform

Anticrm Platform is a framework that helps in building business applications (such as CRM) fast.
The current exemplary applications include Chat, Issue Management (Tracker), Applicant Tracking System, Boards, Leads, and HR.

## Installation

You need Microsoft's [rush](https://rushjs.io) to install application.

Install [rush](https://rushjs.io) with `$ npm install -g @microsoft/rush` command and run `$ rush install` from the repository root, followed by `$ rush build`.

## Build and run

Development environment setup requires Docker to be installed on system.

Support is available for both amd64 and armv8 (arm64) containers on Linux and macOS.

```bash
cd ./dev/
rush build    # Will build all the required packages.
rush bundle   # Will prepare bundles.
rush docker:build   # Will build Docker containers for all applications in the local Docker environment.
docker-compose up -d --force-recreate # Will set up all the containers
```

By default, Docker volumes named dev_db, dev_elastic, and dev_files will be created for the MongoDB, Elasticsearch, and MinIO instances.

Before you can begin, you need to create a workspace and an account and associate it with the workspace.

```bash
cd ./tool
rushx run-local create-workspace ws1 -o DevWorkspace # Create workspace
rushx run-local create-account user1 -p 1234 -f John -l Appleseed # Create account
rushx run-local configure sanity-ws --list --enable '*' # Enable all modules, even if they are not yet intended to be used by a wide audience.
rushx run-local assign-workspace user1 ws1 # Assign workspace to user.
rushx run-local confirm-email user1 # To allow the creation of additional test workspaces.

```

Accessing the URL http://localhost:8087 will lead you to the app in production mode.

Limitations:

- Location installation does not allow sending emails, so password recovery and notification to email functionalities are not working.
- Integrations with Telegram, Gmail, and other content sources are available only as Docker containers, built from private repository sources. However, these integrations can be used with the platform.

## Run in development mode

Development mode allows for live reloading and a smoother development process.

```bash
cd dev/prod
rushx dev-server
```

Then go to http://localhost:8080

## Update project structure and database

If the project's structure is updated, it may be necessary to relink and rebuild the projects.

```bash
rush update
rush build
```

It may also be necessary to upgrade the running database.

```bash
cd ./dev/tool
rushx upgrade
```

In cases where the project fails to build for any logical reason, try the following steps:

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
## creates test Docker containers and sets up test database
./prepare.sh
## runs UI tests
rushx uitest
```

To execute tests in the development environment, please follow these steps:

```bash
cd ./tests
./create-local.sh ## use ./restore-local.sh if you only want to restore the workspace to a predefined initial state for sanity.
cd ./sanity
rushx dev-uitest # To execute all tests against the development environment.
rushx dev-debug -g 'pattern' # To execute tests in debug mode with only the matching test pattern.
```

## Package publishing

```bash
node ./common/scripts/bump.js -p projectName
```

## Additional testing

This project is tested with BrowserStack.
