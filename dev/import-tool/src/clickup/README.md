## Import from ClickUp Guide

### Export Data from ClickUp

1. Follow [ClickUp's official guide](https://help.clickup.com/hc/en-us/articles/6310551109527-Task-data-export) to export your tasks as CSV
2. Save the CSV file to your local machine

### Run Import Tool
1. Place your ClickUp CSV file in a directory (e.g., /path/to/export)
2. Run the import tool using Docker:

```
docker run \
  -e FRONT_URL="https://huly.app" \
  -v /path/to/export:/data \
  hardcoreeng/import-tool:latest \
  -- bundle.js import-clickup-tasks /data/tasks.csv \
  --user your.email@company.com \
  --password yourpassword \
  --workspace workspace-id
```

#### User Mapping
* Users must be created in the platform before import
* ClickUp assignees are mapped to platform users by full name (e.g., "Jane Doe")
* If user is not found:
  * Task will be imported without assignee
  * Original assignee name will be added as a comment: *ClickUp assignee: John Smith*

#### Limitations
* Checklist items are imported as unchecked since ClickUp export doesn't include checkbox states
* Failed attachment downloads are skipped with warning messages (Original attachment URL is added as a comment)
