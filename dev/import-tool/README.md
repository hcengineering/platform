# Huly Import Tool

Tool for importing data into Huly workspace.

## Recommended Import Method

### Unified Format Import
The recommended way to import data into Huly is using our [Unified Import Format](./docs/huly/README.md). This format provides a straightforward way to migrate data from any system by converting it into an intermediate, human-readable structure.

See the [complete guide](./docs/huly/README.md) and [example workspace](./docs/huly/example-workspace) to get started.

### Why Use Unified Format?
- Simple, human-readable format using YAML and Markdown
- Flexible structure that can represent data from any system
- Easy to validate and fix data before import
- Can be generated automatically by script or prepared manually

## Direct Import Options

We also support direct import from some platforms:

1. **Notion**: see [Import from Notion Guide](./docs/notion/README.md)
2. **ClickUp**: see [Import from ClickUp Guide](./docs/clickup/README.md)

These direct imports are suitable for simple migrations, but for complex cases or systems not listed above, please use the Unified Format.

## Authentication

The import commands sign in either with an email and password or with an API token.

### Email and password
Pass `--user` and `--password`. This only works for accounts that have a password.

### API token
Accounts that sign in with Google, GitHub or another single sign-on provider have no password. They can use an API token instead:

1. Open *Settings* → *API Tokens* in Huly and create a token for the workspace you want to import into.
2. Pass the token to the import tool in the `HULY_API_TOKEN` environment variable (recommended, command line arguments are visible to other processes on the machine) or with `--token`, and omit `--user` and `--password`.

```
docker run \
  -e FRONT_URL="https://huly.app" \
  -e HULY_API_TOKEN="your-api-token" \
  -v /path/to/workspace:/data \
  hardcoreeng/import-tool:latest \
  -- bundle.js import /data \
  --workspace workspace-id
```

The import runs with the permissions of the account that created the token. Revoke the token in *Settings* → *API Tokens* once the import is done.
