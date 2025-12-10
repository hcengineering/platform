# Huly Export Service

The Export Service provides asynchronous data export functionality for Huly workspaces. It allows workspace owners and administrators to export documents and their associated data in multiple formats (JSON, CSV, Unified).

## Overview

The Export Service is a standalone microservice that:
- Exports workspace data asynchronously via REST API
- Exports documents from one workspace to another workspace
- Converts Huly documents to standardized formats
- Handles complex document relationships (references, collections, attachments)
- Packages exports as ZIP archives and saves them to the workspace Drive
- Sends notifications upon completion or failure

## Architecture

### Components

- **Server** (`server.ts`): Express REST API server with authentication
- **Exporter** (`exporter.ts`): Main export orchestration logic for file exports
- **Workspace Exporter** (`workspace/`): Cross-workspace document export functionality
  - `workspace-exporter.ts`: Main orchestrator for workspace-to-workspace exports
  - `document-exporter.ts`: Individual document export logic
  - `attachment-exporter.ts`: Attachment and blob migration
  - `relation-exporter.ts`: Forward and inverse relation handling
  - `space-exporter.ts`: Space migration and reuse
  - `data-mapper.ts`: Data transformation and field mapping
- **Converter** (`converter.ts`): Document conversion and type resolution
- **Serializers**: Format-specific output writers
  - `json/json-serializer.ts`: JSON format output
  - `csv/csv-serializer.ts`: CSV format output
- **Types** (`types.ts`): Unified document model definitions

### Export Flow

```
Client Request → Authentication → Export Job Created → Async Processing
                                                      ↓
                        Notification ← Save to Drive ← ZIP Archive ← Serialize ← Convert Docs
```

## API Endpoints

### POST `/exportAsync`

Initiates an asynchronous export job.

**Authentication**: Required (Bearer token or Cookie)

**Query Parameters**:
- `format` (required): Export format - `json`, `csv`, or `unified`

**Request Body**:
```json
{
  "_class": "task:class:Issue",
  "query": {
    "status": "active"
  },
  "attributesOnly": false
}
```

**Parameters**:
- `_class` (required): Ref to the document class to export (e.g., `task:class:Issue`)
- `query` (optional): MongoDB-style query to filter documents
- `attributesOnly` (boolean): If true, excludes attachments and collections

**Response**:
```json
{
  "message": "Export started"
}
```

**Authorization**:
- Requires workspace Owner role or system admin privileges
- Read-only tokens are rejected

**Process**:
1. Job is queued and response is returned immediately
2. Documents are fetched, converted, and serialized
3. Output is packaged as a ZIP archive
4. Archive is uploaded to workspace Drive
5. User receives notification with download link

### POST `/export-to-workspace`

Exports documents from the current workspace to another workspace. This endpoint copies documents, their attachments, and related data to a target workspace while preserving relationships and remapping IDs.

**Authentication**: Required (Bearer token or Cookie)

**Request Body**:
```json
{
  "targetWorkspace": "target-workspace-uuid",
  "_class": "documents:class:ControlledDocument",
  "query": {
    "_id": { "$in": ["doc-id-1", "doc-id-2"] }
  },
  "conflictStrategy": "duplicate",
  "includeAttachments": true,
  "relations": [
    {
      "field": "references",
      "class": "documents:class:ControlledDocument",
      "direction": "forward"
    }
  ],
  "fieldMappers": {
    "documents:class:ControlledDocument": {
      "author": "$currentUser",
      "owner": "$currentUser",
      "state": "draft"
    }
  },
  "objectId": "doc-id-1",
  "objectSpace": "space-id"
}
```

**Parameters**:
- `targetWorkspace` (required): UUID of the target workspace to export to
- `_class` (required): Ref to the document class to export (e.g., `documents:class:ControlledDocument`)
- `query` (optional): MongoDB-style query to filter documents. If not provided and specific documents are selected, uses `_id: { $in: [...] }`
- `conflictStrategy` (optional): How to handle existing documents in target workspace
  - `"duplicate"` (default): Create new documents with new IDs
  - `"skip"`: Skip documents that already exist (based on matching criteria)
- `includeAttachments` (optional, default: `true`): Whether to copy attachment blob data
- `relations` (optional): Array of relation definitions to export
  - `field`: Field name containing the relation
  - `class`: Class of related documents
  - `direction`: `"forward"` (dependencies) or `"inverse"` (references)
- `fieldMappers` (optional): Field value overrides per document class
  - Special value `"$currentUser"` is replaced with the current account's employee ID
  - Example: `{ "author": "$currentUser" }` sets author to current user
- `objectId` (optional): ID of the primary document for notification context
- `objectSpace` (optional): Space of the primary document for notification context

**Response**:
```json
{
  "message": "Export started"
}
```

**Authorization**:
- Requires Owner role in **both** source and target workspaces (or system admin privileges)
- Read-only tokens are rejected
- Target workspace must be accessible to the user

**Process**:
1. Validates user permissions for both source and target workspaces
2. Response is returned immediately (async processing)
3. Documents are fetched from source workspace
4. Forward relations (dependencies) are exported first
5. Main documents are exported with ID remapping
6. Inverse relations (references) are exported
7. Attachments and blob data are copied to target workspace
8. Spaces are created or reused in target workspace
9. User receives notification with export results

**Example Use Cases**:
- Copying controlled documents to a new workspace
- Migrating project data between workspaces
- Creating workspace templates
- Sharing documents with another team

**Error Handling**:
- Individual document failures don't stop the entire export
- Errors are collected and reported in the notification
- Failed documents are logged with specific error messages

## Export Formats

### JSON Format
- Human-readable nested JSON structure
- Preserves document relationships
- Includes metadata and attachments
- File structure: `{spaceName}/{className}/{docId}.json`

### CSV Format
- Flat tabular format
- One row per document
- Nested objects converted to JSON strings
- File structure: `{spaceName}/{className}.csv`

### Unified Format
- Standardized document structure
- Generic type system
- Suitable for data migration/integration
- File structure: `{spaceName}/{className}/{docId}.json`

## Document Conversion

The converter transforms Huly documents into a unified format that:

### Handles Special Types
- **References** (`RefTo`): Resolved to readable format (e.g., person names)
- **Collections**: Nested child documents included
- **Timestamps**: Formatted as ISO 8601 strings
- **Markdown**: Preserved with field markers
- **Collaborative Docs**: Fetched from storage and included
- **Attachments**: Binary data handled separately

### Field Categories
Documents are analyzed and fields are categorized:
- `markdownFields`: Fields containing markdown content
- `collabFields`: Fields referencing collaborative documents
- `refFields`: Fields containing document references
- `collectionFields`: Fields containing nested collections
- `attachments`: Associated attachment metadata

### Example Unified Document
```json
{
  "_class": "task:class:Issue",
  "_id": "issue-123",
  "space": "project-1",
  "data": {
    "title": "Fix bug",
    "description": "...",
    "assignee": "John Doe",
    "status": "In Progress"
  },
  "markdownFields": ["description"],
  "refFields": ["assignee", "status"],
  "collectionFields": ["comments"],
  "attachments": [
    {
      "id": "attach-1",
      "name": "screenshot.png",
      "size": 45678,
      "contentType": "image/png"
    }
  ]
}
```

## Configuration

### Environment Variables

Required:
- `PORT`: Service port (default: 4006)
- `SECRET`: JWT token secret
- `ACCOUNTS_URL`: URL to accounts service
- `SERVICE_ID`: Service identifier

Storage configuration (via `storageConfigFromEnv`):
- `STORAGE_PROVIDER`: Storage backend (`minio`, `s3`, etc.)
- `STORAGE_ENDPOINT`: Storage endpoint URL
- `STORAGE_ACCESS_KEY`: Storage access credentials
- `STORAGE_SECRET_KEY`: Storage secret credentials

### Docker Deployment

```bash
docker build -t hardcoreeng/export .
docker run -p 4006:4006 \
  -e SECRET=your-secret \
  -e ACCOUNTS_URL=http://accounts:3000 \
  -e SERVICE_ID=export-service \
  -e STORAGE_PROVIDER=minio \
  -e STORAGE_ENDPOINT=http://minio:9000 \
  hardcoreeng/export
```

## Development

### Build

```bash
rush build --to @hcengineering/pod-export
```

### Run Locally

```bash
cd services/export/pod-export
ACCOUNTS_URL="http://127.0.0.1:3000" SECRET="secret" DB_URL=postgresql://root@huly.local:26257/defaultdb?sslmode=disable SERVICE_ID="export" STORAGE_CONFIG="datalake|http://huly.local:4030" rushx run-local
```

### Testing

```bash
rushx test
```

## Output Structure

```
export-{workspace}-{class}-{format}-{timestamp}.zip
├── Space Name 1/
│   ├── ClassName/
│   │   ├── doc-1.json
│   │   ├── doc-2.json
│   │   └── attachments/
│   │       ├── file1.pdf
│   │       └── file2.png
├── Space Name 2/
│   └── ClassName/
│       └── docs.csv
```

## Notifications

Users receive in-app notifications:

**Success**:
```
Export completed successfully
[Link to download from Drive]
```

**Failure**:
```
Export failed: {error message}
```

## Security

- JWT token validation
- Workspace access verification
- Role-based authorization (Owner role required for both source and target workspaces)
- Target workspace permission validation
- Secure file storage
- Temporary directory cleanup
- Read-only token rejection

## Limitations

- Maximum documents per export: Limited by available memory
- Attachment size: Limited by storage configuration
- Export timeout: 30 minutes (configurable)
- Concurrent exports per workspace: 1

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Check token validity
- Verify workspace access
- Ensure user has Owner role

**400 Missing required parameters**
- Verify `_class` is provided
- Check `format` query parameter

**403 Forbidden**
- Read-only tokens cannot export
- Upgrade to full access token
- Verify Owner role in target workspace
- Check that target workspace is accessible

**404 Target workspace not found**
- Verify target workspace UUID is correct
- Ensure target workspace exists and is accessible
- Check user has access to target workspace

**Export fails silently**
- Check service logs
- Verify storage connectivity
- Ensure sufficient disk space
- Verify both source and target workspace connections are working

### Logs

```bash
docker logs -f export-service
```

## License

Eclipse Public License 2.0

## Support

For issues and questions, see the main Huly Platform repository.
