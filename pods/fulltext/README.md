# Fulltext Service

Fulltext indexing service for the Platform. Provides full-text search capabilities by indexing documents and communication messages.

## Environment Variables

### Required

- **`SERVER_SECRET`** - Secret key for server authentication
- **`DB_URL`** - Database connection URL (PostgreSQL or MongoDB)
- **`FULLTEXT_DB_URL`** - Elasticsearch connection URL (e.g., `http://localhost:9200`)
- **`REKONI_URL`** - Rekoni service URL for content extraction (e.g., `http://localhost:4004`)
- **`ELASTIC_INDEX_NAME`** - Name of the Elasticsearch index to use
- **`ACCOUNTS_URL`** - Accounts service URL (e.g., `http://localhost:3000`)

### Optional

- **`PORT`** - Service port (default: `4700`)
- **`MODEL_JSON`** - Path to model JSON file (default: `model.json`)
- **`ELASTIC_ANALYZER`** - Elasticsearch/OpenSearch analyzer used for the extracted document text (default: `rebuilt_english`, a custom English analyzer)
  - Set a built-in language analyzer such as `russian`, `german` or `french` to get stemming for non-English content
  - The default keeps the index name `${ELASTIC_INDEX_NAME}_${ElasticIndexVersion}` (version defaults to `v2`). A non-default analyzer uses `${ELASTIC_INDEX_NAME}_${ElasticIndexVersion}_${ELASTIC_ANALYZER}`, e.g. `storage_index_v2_russian`
  - On restart, the service creates the new index before cleaning up old versions, including indexes for previous analyzers. If the cluster rejects the analyzer (e.g. a typo or `icu_analyzer` without the ICU plugin) and an existing index is available, the service logs an error once and continues searching and indexing using that index; fix the configuration and restart to try again. With no existing index, initialization retries every 5 seconds and logs each failure; indexing starts only after the cluster accepts the analyzer
  - Neither an index-version change nor an analyzer change automatically reindexes workspaces. After a successful change (including switching back to the default), run the dev tool's `fulltext-reindex-all` command with `FULLTEXT_URL` set and the deployment's account database and queue configuration. It queues `FullReindex` for every active, enabled workspace, in order of last visit; inactive/disabled workspaces are excluded and need `fulltext-reindex <workspace-name>` when reactivated. Existing documents are absent from the new index until reindexing completes; the service logs a reminder when cleaning up old indexes
- **`HULYLAKE_URL`** - Hulylake service URL for communication indexing (default: empty string)
  - Required only if `COMMUNICATION_API_ENABLED=true`
- **`COMMUNICATION_API_ENABLED`** - Enable communication API for indexing messages (default: disabled)
  - Set to `'true'` to enable indexing of communication messages from cards
  - When disabled, communication indexing is skipped even if `HULYLAKE_URL` is provided
- **`ENABLE_CONSOLE`** - Enable console logging (default: `'true'`)
- **`VERSION`** - Service version (default: `'0.7.0'`)
- **`DB_PREPARE`** - Enable database prepared statements (default: `'true'`)
- **`STORAGE_CONFIG`** - Storage configuration (see storage service documentation)

## Features

- Full-text indexing of documents and attachments
- Communication message indexing (when `COMMUNICATION_API_ENABLED=true`)
- Elasticsearch integration for search
- Rekoni integration for content extraction from various file types
- Workspace-based indexing with automatic reindexing support

## API Endpoints

- `PUT /api/v1/search` - Search documents
- `PUT /api/v1/full-text-search` - Full-text search
- `PUT /api/v1/index-documents` - Index specific documents
- `PUT /api/v1/reindex` - Reindex workspace
- `PUT /api/v1/close` - Close workspace indexer

## Reindexing a Workspace

### Using the Dev Tool (Recommended)

The easiest way to reindex a workspace is using the dev tool:

```bash
# Set FULLTEXT_URL environment variable
export FULLTEXT_URL=http://localhost:4700

# Reindex a specific workspace
rushx tool fulltext-reindex <workspace-name>
```

This sends a reindex event through the queue system, which is the recommended approach.

### Using the API Directly

You can also call the reindex endpoint directly via HTTP:

**Endpoint:** `PUT http://<fulltext-service-url>/api/v1/reindex`

**Request Body:**
```json
{
  "token": "<workspace-token>",
  "onlyDrop": false
}
```

**Or use Authorization header:**
```bash
curl -X PUT http://localhost:4700/api/v1/reindex \
  -H "Authorization: Bearer <workspace-token>" \
  -H "Content-Type: application/json" \
  -d '{"onlyDrop": false}'
```

**Parameters:**
- `token` (required): A valid token containing workspace information. Can be provided in the request body or as `Authorization: Bearer <token>` header.
- `onlyDrop` (optional): If `true`, only clears the index without reindexing. Default: `false`.

**Note:** The token must be generated with the workspace UUID and signed with the same `SERVER_SECRET` used by the fulltext service.

## Communication API

When `COMMUNICATION_API_ENABLED=true`, the service will:
- Index communication messages from cards
- Use Hulylake service to fetch message groups and messages
- Require `HULYLAKE_URL` to be set

When disabled (default), communication indexing is skipped, preventing errors if Hulylake is not available.

