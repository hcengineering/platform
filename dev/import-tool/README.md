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