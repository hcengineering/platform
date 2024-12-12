## Import from Unified Format Guide

### Overview
The unified format represents workspace data in a hierarchical folder structure where:
* Root directory contains space configurations (*.yaml) and their corresponding folders
* Each space folder contains documents/issues (*.md) and their subdocuments/subissues
* Documents/issues can have child items in similarly-named folders
* File named `settings.yaml` is reserved and should not be used for spaces configuration
* Files without required `class` property in frontmatter will be skipped

See the complete working example in the [example workspace](./example-workspace).

### File Structure Example
```
workspace/
├── Documentation/
│   ├── Getting Started.md        # Standalone document
│   ├── User Guide.md             # Document with children
│   ├── User Guide/               # Child documents folder
│   │   ├── Installation.md
│   │   └── Configuration.md
│   └── files/                    # Attachments
│       └── architecture.png
├── Documentation.yaml            # Space configuration
├── Project Alpha/
│   ├── 1.Project Setup.md       # Issue with subtasks
│   ├── 1.Project Setup/         # Subtasks folder
│   │   ├── 2.Configure CI.md
│   │   └── 3.Setup Tests.md
│   ├── 4.Update Docs.md         # Standalone issue
│   └── files/
│       └── diagram.png          # Can be referenced in markdown content
└── Project Alpha.yaml           # Project configuration
```

### File Format Requirements

#### Space Configuration (*.yaml)
Project space (`Project Alpha.yaml`):
```yaml
class: tracker:class:Project       # Required
title: Project Alpha               # Required
identifier: ALPHA                  # Required, max 5 uppercase letters/numbers, must start with a letter
private: false                     # Optional, default: false
autoJoin: true                     # Optional, default: true
owners:                            # Optional, list of email addresses
  - john.doe@example.com
members:                           # Optional, list of email addresses
  - joe.shmoe@example.com
description: string                # Optional
defaultIssueStatus: Todo           # Optional
```

Teamspace (`Documentation.yaml`):
```yaml
class: document:class:Teamspace   # Required
title: Documentation              # Required
private: false                    # Optional, default: false
autoJoin: true                    # Optional, default: true
owners:                           # Optional, list of email addresses
  - john.doe@example.com
members:                          # Optional, list of email addresses
  - joe.shmoe@example.com
description: string               # Optional
```

#### Documents and Issues (*.md)
All files must include YAML frontmatter followed by Markdown content:

Document (`Getting Started.md`):
```yaml
---
class: document:class:Document    # Required
title: Getting Started Guide      # Required
---
# Content in Markdown format
```

Issue (`1.Project Setup.md`):
```yaml
---
class: tracker:class:Issue        # Required
title: Project Setup              # Required
status: In Progress               # Required
priority: High                    # Optional
assignee: John Smith              # Optional
estimation: 8                     # Optional, in hours
remainingTime: 4                  # Optional, in hours
---
Task description in Markdown...
```

### Task Identification
* Human-readable task ID is formed by combining project's identifier and task number from filename
* Example: For project with identifier "ALPHA" and task "1.Setup Project.md", the task ID will be "ALPHA-1"

### Allowed Values

Issue status values:
* `Backlog`
* `Todo`
* `In Progress`
* `Done`
* `Canceled`

Issue priority values:
* `Low`
* `Medium`
* `High`
* `Urgent`

### Run Import Tool
```bash
docker run \
  -e FRONT_URL="https://huly.app" \
  -v /path/to/workspace:/data \
  hardcoreeng/import-tool:latest \
  -- bundle.js import /data \
  --user your.email@company.com \
  --password yourpassword \
  --workspace workspace-id
```

### Limitations
* All users must exist in the system before import
* Assignees are mapped by full name
* Files in space directories can be used as attachments when referenced in markdown content
