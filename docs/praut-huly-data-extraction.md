# Praut Data Extraction

The source of truth is `praut.cz`, not Huly Cloud. Praut currently uses the Huly platform data model internally, so some class names still look like `tracker:class:Issue` or `document:class:Document`; that is schema terminology, not a remote Huly dependency.

This repo currently has no running local Praut containers and no obvious Praut Docker volumes. To extract real data, use one of the source paths below.

## Preferred Outputs

- `raw-mongo`: full database dump for older Mongo-backed Praut deployments.
- `workspace-backup`: platform internal backup for one Praut workspace, including blobs. Best for restore or full-fidelity migration.
- `api-export`: readable JSON/CSV export through the Praut export service. Best for mapping data into Praut-specific schemas.

## 1. Full Raw Mongo Dump

Use this when the source Praut database is MongoDB and reachable from this machine.

```bash
MONGO_URL='mongodb://user:pass@host:27017' \
OUT_DIR='exports/praut-raw' \
scripts/praut-extract.sh raw-mongo
```

The output contains:

- `account.gz`
- integration DB dumps such as `github.gz`, `gmail-service.gz`
- `workspaces/*.gz`
- `databases.list`

## 2. Full Workspace Backup

Use this when the Praut backend/tooling can connect to the source account DB, workspace DB, and storage.

For the local Cockroach/Postgres compose setup:

```bash
OUT_DIR='exports/praut-workspace' \
TOOL_RUNNER='rushx run-local' \
scripts/praut-extract.sh workspace-backup '<workspace-url-or-uuid>'
```

For older local Mongo setup:

```bash
OUT_DIR='exports/praut-workspace' \
TOOL_RUNNER='rushx run-local-mongo' \
scripts/praut-extract.sh workspace-backup '<workspace-url-or-uuid>'
```

This writes the internal backup format under `exports/praut-workspace/workspace-backup`.

## 3. Readable JSON/CSV Export

Use this when the Praut app is running and the export service is reachable.

```bash
PRAUT_EXPORT_URL='https://praut.cz/_export' \
PRAUT_TOKEN='<workspace-token>' \
PRAUT_FORMAT='json' \
PRAUT_CLASSES='tracker:class:Issue,document:class:Document,contact:class:Person' \
OUT_DIR='exports/praut-api' \
scripts/praut-extract.sh api-export
```

The export service is asynchronous. Praut stores ZIP results in the workspace Drive; the script stores the request and response log under `exports/praut-api/api-export`.

## Classes To Export First

Start with:

- `tracker:class:Issue`
- `document:class:Document`
- `contact:class:Person`
- `contact:class:Organization`
- `lead:class:Lead`
- `recruit:class:Candidate`

Some classes may not exist in a given Praut deployment. Remove missing classes from `PRAUT_CLASSES` and rerun.

## Current Local Finding

On this machine, `docker compose ps` in `dev/` showed no running Praut containers. Existing Docker containers are from other projects, not Praut. Real extraction needs either a running Praut stack here or remote DB/storage/API access.
