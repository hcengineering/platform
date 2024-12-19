# Huly Platform

[![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/huly_io?style=for-the-badge)](https://x.com/huly_io)
![GitHub License](https://img.shields.io/github/license/hcengineering/platform?style=for-the-badge)

⭐️ Your star shines on us. Star us on GitHub!

## About

The Huly Platform is a robust framework designed to accelerate the development of business applications, such as CRM systems. 
This repository includes several applications, such as Chat, Project Management, CRM, HRM, and ATS. 
Various teams are building products on top of the Platform, including [Huly](https://huly.io) and [TraceX](https://tracex.co).

![Huly](https://repository-images.githubusercontent.com/392073243/6d27d5cc-38cd-4d88-affe-bb88b393180c)

## Self-Hosting

If you're primarily interested in self-hosting Huly without the intention to modify or contribute to its development, please use [huly-selfhost](https://github.com/hcengineering/huly-selfhost). 
This project offers a convenient method to host Huly using `docker`, designed for ease of use and quick setup. Explore this option to effortlessly enjoy Huly on your own server.

## Activity

![Alt](https://repobeats.axiom.co/api/embed/c42c99e21691fa60ea61b5cdf11c2e0647621534.svg "Repobeats analytics image")

## Table of Content

- [Huly Platform](#huly-platform)
  - [About](#about)
  - [Self-Hosting](#self-hosting)
  - [Activity](#activity)
  - [Table of Content](#table-of-content)
  - [Pre-requisites](#pre-requisites)
  - [Verification](#verification)
  - [Installation](#installation)
  - [Build and run](#build-and-run)
  - [Run in development mode](#run-in-development-mode)
  - [Update project structure and database](#update-project-structure-and-database)
  - [Troubleshooting](#troubleshooting)
  - [Build \& Watch](#build--watch)
  - [Tests](#tests)
    - [Unit tests](#unit-tests)
    - [UI tests](#ui-tests)
  - [Package publishing](#package-publishing)
  - [Additional testing](#additional-testing)

## Pre-requisites

- Before proceeding, ensure that your system meets the following requirements:
  - [Node.js](https://nodejs.org/en/download/) (v20.11.0 is required)
  - [Docker](https://docs.docker.com/get-docker/)
  - [Docker Compose](https://docs.docker.com/compose/install/)

## Verification

To verify the installation, perform the following checks in your terminal:

- Ensure that the `docker` commands are available:
  ```bash
  docker --version
  docker compose version
## Fast start

```bash
sh ./scripts/fast-start.sh
```

## Installation

You need [pnpm](https://pnpm.io) and [Turbo](https://turbo.build) to install and build the application.

1. Install pnpm globally using the command:
   ```bash
   npm install -g pnpm
   ```
2. Navigate to the repository root and run the following commands:
   ```bash
   pnpm install
   pnpm build
   ```
Alternatively, you can just execute:

```bash
sh ./scripts/presetup.sh
```

## Build and run

Development environment setup requires Docker to be installed on system.

Support is available for both amd64 and arm64 containers on Linux and macOS.

```bash
cd ./dev/
pnpm build    # Will build all the required packages.
# pnpm rebuild  # could be used to omit build cache.
pnpm bundle   # Will prepare bundles.
pnpm package  # Will build all webpack packages.
pnpm validate # Will validate all sources with typescript and generate d.ts files required for ts-node execution.
pnpm svelte-check # Optional. svelte files validation using svelte-check.
pnpm docker:build   # Will build Docker containers for all applications in the local Docker environment.
pnpm docker:up # Will set up all the containers
```

Be aware `rush docker:build` will automatically execute all required phases like build, bundle, package.

Alternatively, you can just execute:

```bash
sh ./scripts/build.sh
```

By default, Docker volumes named dev_db, dev_elastic, and dev_files will be created for the MongoDB, Elasticsearch, and MinIO instances.

Before you can begin, you need to create a workspace and an account and associate it with the workspace.

```bash
cd ./tool # dev/tool in the repository root
rushx run-local create-workspace ws1 -w DevWorkspace # Create workspace
rushx run-local create-account user1 -p 1234 -f John -l Appleseed # Create account
rushx run-local configure ws1 --list --enable '*' # Enable all modules, even if they are not yet intended to be used by a wide audience.
rushx run-local assign-workspace user1 ws1 # Assign workspace to user.
rushx run-local confirm-email user1 # To allow the creation of additional test workspaces.

```

Alternatively, you can just execute:

```bash
sh ./scripts/create-workspace.sh
```

Add the following line to your /etc/hosts file

```
127.0.0.1 host.docker.internal
```

Accessing the URL http://host.docker.internal:8087 will lead you to the app in development mode.

Limitations:

- Local installation does not support sending emails, thus disabling functionalities such as password recovery and email notifications.

## Run in development mode

Development mode allows for live reloading and a smoother development process.

```bash
cd dev/prod
pnpm validate
pnpm dev-server
```

Then go to http://localhost:8080

Click on "Login with password" link on the bottom of the right panel and use the following login credentials:

```plain
Email: user1
Password: 1234
Workspace: ws1
```

## Update project structure and database

If the project's structure is updated, it may be necessary to relink and rebuild the projects.

```bash
pnpm install
pnpm build
```

It may also be necessary to upgrade the running database.

```bash
cd ./dev/tool
rushx upgrade -f
```

## Troubleshooting

If a build fails, but the code is correct, try to delete the [build cache](https://rushjs.io/pages/maintainer/build_cache/) and retry.

```bash
# from the project root
rm -rf common/temp/build-cache
```

## Build & Watch

For development purpose `pnpm build:watch` action could be used.

It includes build and validate phases in watch mode.

## Tests

### Unit tests

```bash
pnpm test # To execute all tests

pnpm test --filter=<package-name> # For individual test execution inside a package directory
```

### UI tests

```bash
cd ./tests
pnpm build
pnpm bundle
pnpm docker:build
## creates test Docker containers and sets up test database
./prepare.sh
## runs UI tests
pnpm uitest
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

<sub><sup>&copy; 2024 <a href="https://hardcoreeng.com">Hardcore Engineering Inc</a>.</sup></sub>

