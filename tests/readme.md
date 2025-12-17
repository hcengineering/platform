# UI Sanity testing using play-wright

## Prepare environment with docker to test final product.

Two variants, first use a local build and use an already build version.

### A local build

```bash
rush update
rush build
rush bundle
rush docker:build
./prepare.sh
```

### An already build version

```bash
./create-version-override.sh v0.7.309 # Will create a version override file.
./prepare-pg.sh # To prepare all stuff
./reset-version.sh # To go back to local build

# open http://localhost:8083
```

### Restore to pure DB

To purge content of sanity workspace following command could be used.

```bash
./restore-workspace.sh
```

## Prepare local dev environment

```bash
rush update
rush build
rush bundle
./create-local.sh
```

### Restore to pure DB for Local setup

To purge content of sanity workspace following command could be used.

```bash
./restore-local.sh
```

## Running UI tests

```bash
cd ./sanity
rushx uitest # for docker setup
rushx dev-uitest # for dev setup
```

## Debugging UI tests

```bash
cd ./sanity
rushx debug -g test-name # for docker setup
rushx dev-debug -g test-name # for local setup
```

## Capturing new testing scenarios

```bash
rushx codegen # for docker setup
rushx dev-codegen # for local setup
```

## Test authoring.

Please update all navigation with using PlatformURI for CI and dev environment compatible testing.

## Generate Allure

```bash
allure generate allure-results -o allure-report --clean
allure open allure-report
```
