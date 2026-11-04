# UI Sanity testing using play-wright

## Prepare environment with docker to test final product.

The UI test stack uses `tracex.local` for its browser-facing URLs. Before
starting it locally, add this entry to the host's `/etc/hosts` (CI already does this):

```text
127.0.0.1 tracex.local
```

The print container maps the same hostname to `host-gateway` and reaches the
services through their published ports. This keeps the page and file URLs on the
same hostname, including authentication cookies. Server-to-server connections
continue to use internal Docker service names.

Playwright runs full Chromium in headless mode and treats the configured local
HTTP origins as secure contexts so the clipboard APIs used by the tests remain
available. The default headless shell does not apply the secure-origin flag.

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

## Update the workspace snapshot

Use the same command locally and in CI:

```bash
./update-snapshot.sh [backup-directory]
```

The test stack uses PostgreSQL on port 5433 and Datalake on port 4031.
`tool.sh`, `prepare.sh`, and `restore-workspace.sh` are the shared test commands.
The `*-local.sh` commands target the development stack on ports 5432 and 4030.
`prepare-tests.sh` starts only the infrastructure required by integration tests.

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