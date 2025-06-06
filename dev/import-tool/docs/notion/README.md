## Import from Notion Guide

### Export Data from Notion

1. Follow [Notion's official guide](https://www.notion.so/help/export-your-content) to export your content
2. Important: Select **Markdown & CSV** export format
3. Extract the exported archive to a local directory

### Run Import Tool

1. Place your extracted Notion export in a directory (e.g., `/path/to/export`)
2. Choose one of two import options:
#### Option 1: Import with Original Teamspace Structure
```
docker run \
  -e FRONT_URL="https://huly.app" \
  -v /path/to/export:/data \
  hardcoreeng/import-tool:latest \
  -- bundle.js import-notion-with-teamspaces /data \
  --user your.email@company.com \
  --password yourpassword \
  --workspace workspace-id
```
#### Option 2: Import to Single Teamspace
```
docker run \
  -e FRONT_URL="https://huly.app" \
  -v /path/to/export:/data \
  hardcoreeng/import-tool:latest \
  -- bundle.js import-notion-to-teamspace /data \
  --user your.email@company.com \
  --password yourpassword \
  --workspace workspace-id \
  --teamspace teamspace-name-to-be-created
```

#### Limitations
* Notion databases are not imported (CSV format not supported)
* Comments are not included in Notion exports, so they will not be imported
* Images and files must be included in the export to be imported
#### Notes
* All documents preserve their hierarchy
* Internal links between documents are maintained
* Images and attachments are imported automatically if present in export