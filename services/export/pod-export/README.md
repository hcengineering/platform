# Huly Export Service

The Export Service provides asynchronous data export functionality for Huly workspaces. It allows workspace owners and administrators to export documents and their associated data in multiple formats (JSON, CSV, Unified).

## Overview

The Export Service is a standalone microservice that:
- Exports workspace data asynchronously via REST API
- Converts Huly documents to standardized formats
- Handles complex document relationships (references, collections, attachments)
- Packages exports as ZIP archives and saves them to the workspace Drive
- Sends notifications upon completion or failure

## Architecture

### Components

- **Server** (`server.ts`): Express REST API server with authentication
- **Exporter** (`exporter.ts`): Main export orchestration logic
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

## Features

### Permissions
- Only workspace owners can export data
- System admins can export any workspace
- Read-only tokens are rejected

### Performance
- Asynchronous processing (non-blocking API)
- Rate limiting for concurrent conversions (50 parallel operations)
- Efficient caching of referenced documents
- Streaming for large exports

### Error Handling
- Comprehensive error logging
- User notifications on failure
- Graceful handling of missing references
- Validation of required parameters

### Data Integrity
- Space-based organization
- Preserves document relationships
- Handles circular references
- Validates document structure

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
- Role-based authorization
- Secure file storage
- Temporary directory cleanup

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

**Export fails silently**
- Check service logs
- Verify storage connectivity
- Ensure sufficient disk space

### Logs

```bash
docker logs -f export-service
```

## Related Services

- **Account Service**: Authentication and authorization
- **Storage Service**: File storage backend
- **Drive**: Document storage and retrieval
- **Notification Service**: User notifications

## License

Eclipse Public License 2.0

## Support

For issues and questions, see the main Huly Platform repository.
