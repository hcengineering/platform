# Anticrm Platform

Anticrm Platform is a framework that help building business applications (such as CRM) fast.
Current exemplary applications include Chat, Issue Management(Tracker), and Applicant Tracking System, Boards, Leads, HR.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Local Environment Limitations](#local-environment-limitations)
- [Updating Project Structure and Database](#updating-project-structure-and-database)
  - [Troubleshooting](#troubleshooting)
- [Tests](#tests)
  - [Unit Tests](#unit-tests)
  - [UI Tests](#ui-tests)
- [Package Publishing](#package-publishing)
- [Additional Testing](#additional-testing)

## Prerequisites

Before installing the Anticrm Platform, ensure that you have the following prerequisites:

1. Node.js 18: Make sure you have Node.js 18 installed on your system. You can download Node.js 18 from the official Node.js website ([https://nodejs.org](https://nodejs.org)) or use a package manager of your choice.
2. Docker: Install Docker on your system. Docker is required to set up the development environment and run the platform in containers. You can download Docker from the official Docker website ([https://www.docker.com](https://www.docker.com)) and follow the installation instructions specific to your operating system. The platform supports both `amd64` and `armv8` (arm64) containers on Linux and macOS.
3. `@microsoft/rush`: Install the Rush tool by running the following command:
```bash
npm install -g @microsoft/rush
```

## Installation

1. From the repository root, run the following commands:
    ```bash
    rush install
    rush build
    ```
2. Change the directory to ./dev/.
    ```bash
    cd ./dev/
    ```
3. Build all the required packages by running the following command:
    ```bash
    rush build
    ```
4. Prepare the bundles by running the following command:
    ```bash
    rush bundle
    ```
5. Build the Docker containers for all applications in the local Docker environment by running the following command:
    ```bash
    rush docker:build
    ```
6. Set up all the containers by running the following command:
    ```bash
    docker-compose up -d --force-recreate
    # or
    docker compose up -d --force-recreate
    # if you are using Docker Compose v2
    ```
    By default, Docker volumes dev_db, dev_elastic, and dev_files will be created for MongoDB, Elasticsearch, and MinIO instances, respectively.

7. Before you can start using the platform, you need to create a workspace/account and associate it with the workspace. Follow these steps:

    a. Change the directory to ./tool.
    ```bash
    cd ./tool
    ```
    b. Create a workspace by running the following command:
    ```bash
    rushx run-local create-workspace ws1 -o DevWorkspace
    ```
    c. Create an account by running the following command:
    ```bash
    rushx run-local create-account user1 -p 1234 -f John -l Appleseed
    ```
    d. Enable all modules by running the following command:
    ```bash
    rushx run-local configure sanity-ws --list --enable '*'
    ```
    e. Assign the workspace to the user by running the following command:
    ```bash
    rushx run-local assign-workspace user1 ws1
    ```
    f. Confirm the email by running the following command:
    ```bash
    rushx run-local confirm-email user1
    ```
8. Go to http://localhost:8087 to access the platform in **production** mode.  If you want to access the platform in **development** mode, follow these steps:
   
    a. Change the directory to ./dev/prod.
    ```bash
    cd ./dev/prod
    ```
    b. Run the following command:
    ```bash
    rushx dev-server
    ```
    c. Go to http://localhost:8080 to access the platform in development mode.
   
9. Use `user1` and `1234` as the username and password, respectively, to log in to the platform.

## Local Environment Limitations

- The local installation does not support sending emails, so functionalities like password recovery and email notifications are not available.
- Integrations with Telegram, Gmail, and Content are only available as Docker containers, built from private repository sources. However, they can still be used with the platform.

## Updating Project Structure and Database

If the project's structure is updated, you may need to relink and rebuild the projects. Follow these steps:

1. Update the project structure:
```bash
rush update
```
2. Rebuild the projects:
```bash
rush link
```

If required, you may also need to upgrade the running database. Follow these steps:

1. Change the directory to ./dev/.
```bash
cd ./dev/
```
2. Run the upgrade command:
```bash
rushx upgrade
```

### Troubleshooting

In case the project doesn't build for any logical reason, try the following steps:

1. Update the project:
```bash
rush update
```
2. Clean and rebuild the project:
```bash
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
