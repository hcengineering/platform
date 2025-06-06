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
├── QMS Documents/              # QMS documentation
│   ├── [SOP-001] Document Control.md           # Document template
│   ├── [SOP-001] Document Control/             # Template implementations
│   │   └── [SOP-002] Document Review.md        # Controlled document
│   └── [WI-001] Document Template Usage.md     # Standalone controlled document
└── QMS Documents.yaml         # QMS space configuration
```

### File Format Requirements
* All spaces files must be in YAML format
* All document/issue files must include YAML frontmatter followed by Markdown content
* Children documents/issues are located in the folder with the same name as the parent document/issue


#### Tracker Issues

##### 1. Project Configuration (*.yaml)
Example: `Project Alpha.yaml`:
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

##### 2. Issue (*.md)
Example: `1.Project Setup.md`:
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

##### Issue Identification
* Human-readable issue ID is formed by combining project's identifier and issue number from filename
* Example: For project with identifier `ALPHA` and issue `1.Setup Project.md`, the issue ID will be `ALPHA-1`

##### Allowed Values

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

#### Documents

##### 1. Teamspace Configuration (*.yaml)
Example: `Documentation.yaml`:
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

##### 2. Document (*.md)
Example: `Getting Started.md`:
```yaml
---
class: document:class:Document    # Required
title: Getting Started Guide      # Required
---
# Content in Markdown format
```

#### Controlled Documents
##### 1. Space Configuration (*.yaml)
QMS Document Space: `QMS Documents.yaml`:
```yaml
class: documents:class:OrgSpace   # Required
title: QMS Documents              # Required
private: false                    # Optional, default: false
owners:                           # Optional, list of email addresses
  - john.doe@example.com
members:                          # Optional, list of email addresses
  - joe.shmoe@example.com
description: string               # Optional
qualified: john.doe@example.com   # Optional, qualified user
manager: jane.doe@example.com     # Optional, QMS manager
qara: bob.smith@example.com       # Optional, QA/RA specialist
```

##### 2. Document Template (*.md)
Example: `[SOP-001] Document Control.md`:
```yaml
---
class: documents:mixin:DocumentTemplate  # Required
title: SOP Template                      # Required
docPrefix: SOP                           # Required, document code prefix
category: documents:category:Procedures  # Required
author: John Smith                       # Required
owner: Jane Wilson                       # Required
abstract: Template description           # Optional
reviewers:                               # Optional
  - alice.cooper@example.com
approvers:                               # Optional
  - david.brown@example.com
coAuthors:                               # Optional
  - bob.dylan@example.com
---
Template content in Markdown...
```

##### 3. Controlled Document (*.md)
Example: `[SOP-002] Document Review.md`:
```yaml
---
class: documents:class:ControlledDocument # Required
title: Document Review Procedure          # Required
template: [SOP-001] Document Control.md   # Required, path to template
author: John Smith                        # Required
owner: Jane Wilson                        # Required
abstract: Document description            # Optional
reviewers:                                # Optional
  - alice.cooper@example.com
approvers:                                # Optional
  - david.brown@example.com
coAuthors:                                # Optional
  - bob.dylan@example.com
changeControl:                            # Optional
  description: Initial document creation
  reason: Need for standardized process
  impact: Improved document control
---
Document content in Markdown...
```
##### Controlled Document Code Format
* Document code must be specified in file name: `[CODE] Any File Name.md`
* If code is not specified for controlled document, it will be generated automatically using template's docPrefix and sequential number (e.g. `SOP-99`)
* If code is not specified for template, it will be generated automatically as `TMPL-seqNumber`, where `seqNumber` is the sequence number of the template in the space


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
* Document codes (in square brackets) must be unique across all document spaces
* Controlled documents must be created in the same space as their templates
* Controlled documents can be imported only with `Draft` status
