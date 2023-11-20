# UI Sanity testing using play-wright

## Prepare environment with docker to test final product.

```bash
rush update
rush build
rush bundle
rush docker:build
./prepare.sh
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