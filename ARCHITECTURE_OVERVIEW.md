# Huly Platform Architecture Overview

## Service Overview

The Huly platform consists of **30+ microservices** working together in a distributed architecture. Services are organized into functional layers for core business logic, data storage, real-time communication, media processing, and supporting features.

### Core Backend Services

| Service | Port | Description |
|---------|------|-------------|
| **account** | 3000 | Authentication and user management. Handles login, registration, JWT tokens, workspace membership, and user permissions. |
| **transactor** | 3332 | Core transaction processing engine. Maintains WebSocket connections for real-time updates, processes all data mutations, enforces business logic, and publishes events to the message queue. |
| **workspace** | - | Workspace lifecycle management. Handles workspace creation, initialization, upgrades, and maintenance background jobs. |
| **stats** | 4900 | Metrics collection and aggregation. Collects usage statistics and health metrics from all services for monitoring. |

### Storage & Data Services

| Service | Port | Description |
|---------|------|-------------|
| **datalake** | 4030 | Blob storage management with metadata. Handles file uploads, permissions, and coordinates with MinIO for object storage. |
| **hulylake** | 8096 | Storage adapter API. Provides S3-compatible interface for accessing stored objects. |
| **hulykvs** | 8094 | Key-value store service. Fast storage for configuration, preferences, and cached data. |

### Search & Indexing

| Service | Port | Description |
|---------|------|-------------|
| **fulltext** | 4702 | Full-text search indexing. Consumes events, extracts content, maintains Elasticsearch index for fast searches. |
| **rekoni** | 4004 | Document intelligence service. Extracts text and structured data from binary documents (PDF, DOC, DOCX, RTF, HTML) for searchability and resume parsing. Supports HeadHunter, LinkedIn, and generic resume formats. |

### Real-time Services

| Service | Port | Description |
|---------|------|-------------|
| **collaborator** | 3078 | Real-time document collaboration using Y.js CRDT. Enables simultaneous editing with conflict resolution. |
| **hulygun** | - | Event processor. Consumes and processes events from Redpanda for real-time updates. |

### Media Services

| Service | Port | Description |
|---------|------|-------------|
| **stream** | 1080 | Video streaming service with HLS transcoding for recording playback. |
| **media** | - | Media processing queue. Handles video/audio conversion and optimization. |
| **preview** | 4040 | Thumbnail and preview generation for images and documents. |

### Feature Services

| Service | Port | Description |
|---------|------|-------------|
| **print** | 4005 | PDF generation service for printing documents and reports. See [Document printing](docs/printing.md) for the export flow, authorization, rendering readiness, and browser debugging. |
| **sign** | 4006 | Digital signature service for document signing with certificates. |
| **payment** | 3040 | Payment and billing integration (Polar). Handles subscriptions and payments. |
| **export** | 4009 | Data export service for workspace backups and data extraction. |
| **analytics** | 4017 | Analytics event collection and processing. |
| **process** | - | Workflow automation and process orchestration. |
| **rating** | - | Content rating and quality metrics. |

### Backup Services

| Service | Port | Description |
|---------|------|-------------|
| **backup** | - | Automated backup service. Periodically backs up workspace data to object storage. |
| **backup-api** | 4039 | Backup REST API. Provides endpoints for backup management and restoration. |

### Frontend

| Service | Port | Description |
|---------|------|-------------|
| **front** | 8087/8088 | Web application server. Serves the Huly UI, handles static assets and client-side routing. |

### Infrastructure (Databases & Message Queues)

| Service | Port(s) | Description |
|---------|---------|-------------|
| **postgres** | 5432 | **PostgreSQL - Primary Application Database**. Stores ALL business data: users, workspaces, documents, transactions, metadata, permissions. Relational database with ACID guarantees. |
| **elastic** | 9200 | Elasticsearch search engine. Stores full-text search indexes managed by fulltext service. |
| **minio** | 9000, 9001 | S3-compatible object storage. Stores binary files, attachments, images, and blobs in buckets (blobs, eu, backups). |
| **redpanda** | 9092, 19092 | Kafka-compatible event streaming. Provides reliable async messaging between services. |

### Monitoring & Observability

| Service | Port | Description |
|---------|------|-------------|
| **jaeger** | 16686, 4318 | Distributed tracing UI and OTLP collector. All services send traces for performance monitoring. |
| **redpanda_console** | 8000 | Kafka management UI for monitoring topics, consumers, and message flow. |

### Service Communication Patterns

- **Synchronous (HTTP/WebSocket)**: Client ↔ Front ↔ Backend Services
- **Asynchronous (Events)**: Producers (Transactor, Workspace) → Redpanda → Consumers (Fulltext, Media, Process)
- **Primary Database**: All services → PostgreSQL (main application data)
- **Search Index**: Fulltext → Elasticsearch
- **Object Storage**: Services → MinIO (S3 API)
- **Real-time Updates**: Client ↔ Transactor (WebSocket), Client ↔ Collaborator (WebSocket)

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Desktop[Desktop App]
    end
    
    subgraph "Frontend"
        Front[Front Server<br/>:8087]
    end
    
    subgraph "Core Backend Services"
        Account[Account<br/>:3000<br/>Auth & Users]
        Workspace[Workspace<br/>Management]
        Transactor[Transactor<br/>:3332<br/>Transactions]
        Stats[Stats<br/>:4900<br/>Metrics]
    end
    
    subgraph "Storage Services"
        Datalake[Datalake<br/>:4030<br/>Blob Storage]
        Hulylake[Hulylake<br/>:8096<br/>Storage API]
        HulyKVS[HulyKVS<br/>:8094<br/>Key-Value]
    end
    
    subgraph "Search & Indexing"
        Fulltext[Fulltext<br/>:4702<br/>Search]
        Rekoni[Rekoni<br/>:4004<br/>Doc Intelligence]
    end
    
    subgraph "Real-time"
        Collaborator[Collaborator<br/>:3078<br/>Doc Sync]
        Gun[HulyGun<br/>Events]
    end
    
    subgraph "Media Services"
        Stream[Stream<br/>:1080<br/>Video]
        MediaProc[Media<br/>Processing]
        Preview[Preview<br/>:4040<br/>Thumbnails]
    end
    
    subgraph "Feature Services"
        Print[Print<br/>:4005]
        Sign[Sign<br/>:4006]
        Payment[Payment<br/>:3040]
        Export[Export<br/>:4009]
        Analytics[Analytics<br/>:4017]
        Process[Process<br/>Automation]
        Rating[Rating<br/>Metrics]
    end
    
    subgraph "Backup Services"
        BackupSvc[Backup<br/>Service]
        BackupAPI[Backup API<br/>:4039]
    end
    
    subgraph "Primary Database"
        PostgreSQL[(PostgreSQL<br/>:5432<br/>Main Application DB)]
    end
    
    subgraph "Supporting Infrastructure"
        Elasticsearch[(Elasticsearch<br/>:9200)]
        Minio[(MinIO<br/>:9000)]
        Redpanda[Redpanda<br/>:9092<br/>Kafka]
    end
    
    Browser --> Front
    Desktop --> Front
    
    Front --> Account
    Front --> Transactor
    Front --> Collaborator
    Front --> Datalake
    
    Account --> PostgreSQL
    Workspace --> PostgreSQL
    Transactor --> PostgreSQL
    Transactor --> Redpanda
    Transactor --> Fulltext
    
    Datalake --> PostgreSQL
    Datalake --> Minio
    Hulylake --> PostgreSQL
    Hulylake --> Minio
    HulyKVS --> PostgreSQL
    
    Fulltext --> Elasticsearch
    Fulltext --> PostgreSQL
    Fulltext --> Rekoni
    Fulltext --> Redpanda
    
    Gun --> Redpanda
    
    Stream --> Datalake
    MediaProc --> Redpanda
    Preview --> Datalake
    
    style Front fill:#4A90E2
    style Account fill:#E24A4A
    style Transactor fill:#E24A4A
    style PostgreSQL fill:#7ED321
    style Redpanda fill:#F5A623
```

---



## 2. Event-Driven Architecture (Redpanda/Kafka)

```mermaid
graph LR
    subgraph "Event Producers"
        Transactor[Transactor<br/>Transactions]
        Workspace[Workspace<br/>Workspaces]
        Rating[Rating<br/>Ratings]
    end
    
    subgraph "Event Bus"
        Redpanda[Redpanda<br/>Kafka Topics<br/>:9092]
    end
    
    subgraph "Event Consumers"
        Fulltext[Fulltext<br/>Search Indexing]
        Media[Media<br/>Processing]
        Process[Process<br/>Automation]
        Gun[HulyGun<br/>Event Processor]
        BackupSvc2[Backup<br/>Archival]
    end
    
    subgraph "Queue Configuration"
        QC["QUEUE_CONFIG<br/>pg / redpanda:9092<br/>Region-based routing"]
    end
    
    Transactor -->|Document Events| Redpanda
    Transactor -->|User Actions| Redpanda
    Workspace -->|Workspace Events| Redpanda
    Rating -->|Rating Events| Redpanda
    
    Redpanda -->|Index Events| Fulltext
    Redpanda -->|Media Events| Media
    Redpanda -->|Process Events| Process
    Redpanda -->|All Events| Gun
    Redpanda -->|Backup Events| BackupSvc2
    
    QC -.Config.-> Transactor
    QC -.Config.-> Workspace
    QC -.Config.-> Fulltext
    QC -.Config.-> Media
    QC -.Config.-> Process
    QC -.Config.-> BackupSvc2
    
    style Redpanda fill:#F5A623
    style Transactor fill:#E24A4A
```

---

## 3. Storage Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Client[Client Application]
    end
    
    subgraph "Storage APIs"
        Datalake[Datalake :4030<br/>Blob Management]
        Hulylake[Hulylake :8096<br/>Storage Adapter]
    end
    
    subgraph "Primary Database"
        PostgreSQL[(PostgreSQL<br/>File Metadata<br/>Permissions<br/>References)]
    end
    
    subgraph "Object Storage"
        Minio[(MinIO :9000<br/>S3-Compatible)]
        Buckets[Buckets:<br/>• blobs<br/>• eu<br/>• backups]
    end
    
    subgraph "Media Processing"
        Preview[Preview :4040<br/>Thumbnails]
        Stream[Stream :1080<br/>Video Streaming]
        Media[Media<br/>Processing Queue]
    end
    
    Client -->|Upload| Datalake
    Client -->|Read| Hulylake
    Client -->|Stream Video| Stream
    Client -->|Get Preview| Preview
    
    Datalake -->|Metadata| PostgreSQL
    Datalake -->|Store Blobs| Minio
    
    Hulylake -->|Metadata| PostgreSQL
    Hulylake -->|Access Blobs| Minio
    
    Minio --> Buckets
    
    Preview -->|Read| Datalake
    Preview -->|Cache| Minio
    
    Stream -->|Upload| Datalake
    Stream -->|Transcode| Media
    
    Media -->|Store| Minio
    
    style Datalake fill:#4A90E2
    style Minio fill:#C92A2A
    style PostgreSQL fill:#7ED321
```

---

## 4. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant Front
    participant Account
    participant Transactor
    participant Workspace
    participant PostgreSQL
    
    Client->>Front: Login Request
    Front->>Account: Authenticate
    Account->>PostgreSQL: Verify Credentials
    PostgreSQL-->>Account: User Record
    Account->>Account: Generate JWT Token<br/>(SERVER_SECRET=secret)
    Account-->>Front: JWT Token
    Front-->>Client: Token + Workspace List
    
    Client->>Front: Connect to Workspace
    Front->>Account: Verify Token
    Account-->>Front: Token Valid + User Info
    
    Front->>Workspace: Get Workspace Info
    Workspace->>PostgreSQL: Query Workspace
    PostgreSQL-->>Workspace: Workspace Data
    Workspace-->>Front: Workspace Config
    
    Client->>Transactor: WebSocket Connect<br/>with Token
    Transactor->>Account: Verify Token
    Account-->>Transactor: User Authorized
    Transactor->>PostgreSQL: Load User Permissions
    Transactor-->>Client: Connected
    
    Note over Client,PostgreSQL: All services share SERVER_SECRET=secret<br/>for internal authentication
```

---

## Service Summary Table

| Service | Container | Port | Purpose | Dependencies |
|---------|-----------|------|---------|--------------|
| **Frontend** | | | | |
| front | tracexapp/front | 8087/8088 | Web application server | account, transactor, collaborator, datalake |
| **Core** | | | | |
| account | tracexapp/account | 3000 | Authentication & user management | postgres, redpanda, stats |
| transactor | tracexapp/transactor | 3332 | Transaction processing (WebSocket) | postgres, redpanda, fulltext, account |
| workspace | tracexapp/workspace | - | Workspace management | postgres, redpanda, minio, account |
| stats | tracexapp/stats | 4900 | Metrics collection | - |
| **Storage** | | | | |
| datalake | tracexapp/datalake | 4030 | Blob storage & metadata | postgres, minio, account |
| hulylake | tracexapp/hulylake | 8096 | Storage adapter API | postgres, minio |
| hulykvs | tracexapp/hulykvs | 8094 | Key-value store | postgres |
| **Search** | | | | |
| fulltext | tracexapp/fulltext | 4702 | Full-text search indexing | elasticsearch, postgres, rekoni, redpanda |
| rekoni | tracexapp/rekoni-service | 4004 | Document intelligence | stats |
| **Real-time** | | | | |
| collaborator | tracexapp/collaborator | 3078 | Real-time document collaboration | account, datalake, transactor |
| hulygun | tracexapp/hulygun | - | Event processor | redpanda, account |
| **Media** | | | | |
| stream | tracexapp/stream | 1080 | Video streaming | datalake, redpanda |
| media | tracexapp/media | - | Media processing | redpanda, account |
| preview | tracexapp/preview | 4040 | Thumbnail generation | datalake |
| **Features** | | | | |
| print | tracexapp/print | 4005 | PDF generation | postgres, minio, account |
| sign | tracexapp/sign | 4006 | Digital signatures | postgres, minio, account |
| payment | tracexapp/payment | 3040 | Payment processing | account |
| export | tracexapp/export | 4009 | Data export | postgres, minio, account |
| analytics | tracexapp/analytics-collector | 4017 | Analytics collection | account, stats |
| process | tracexapp/process | - | Workflow automation | redpanda, account |
| rating | tracexapp/rating | - | Content rating | postgres, redpanda, account |
| **Backup** | | | | |
| backup | tracexapp/backup | - | Automated backup | postgres, minio, account |
| backup-api | tracexapp/backup-api | 4039 | Backup REST API | minio, account |
| **Primary Database** | | | | |
| postgres | postgres:16 | 5432 | **Main application database** - stores users, workspaces, documents, transactions, metadata, permissions | - |
| **Supporting Infrastructure** | | | | |
| elastic | elasticsearch:7.14.2 | 9200 | Search engine for full-text indexes | - |
| minio | minio/minio | 9000, 9001 | Object storage (S3) for files and blobs | - |
| redpanda | redpandadata/redpanda:v24.3.6 | 9092, 19092 | Event streaming (Kafka) for async processing | - |
| **Monitoring** | | | | |
| jaeger | jaegertracing/all-in-one | 16686, 4318 | Distributed tracing and performance monitoring | - |
| redpanda_console | redpandadata/console:v2.8.3 | 8000 | Kafka management UI | redpanda |

---

## Environment Variables Summary

### Common Configuration (Shared by Most Services)
- `SERVER_SECRET` / `SECRET`: `secret` - Shared authentication secret
- `REGION`: `pg` - Deployment region identifier
- `ACCOUNTS_URL`: `http://tracex.local:3000` - Account service URL
- `STATS_URL`: `http://tracex.local:4900` - Metrics collection URL
- `OTEL_EXPORTER_OTLP_ENDPOINT`: `http://jaeger:4318/v1/traces` - Tracing endpoint
- `STORAGE_CONFIG`: `${STORAGE_CONFIG}` - MinIO connection string
- `QUEUE_CONFIG`: `${QUEUE_CONFIG}` - Redpanda/Kafka configuration

### Database Configuration
- `DB_URL` / `DB_URL_PG`: PostgreSQL connection string
- `FULLTEXT_DB_URL`: `http://tracex.local:9200` - Elasticsearch URL
- `HULY_DB_CONNECTION`: PostgreSQL connection for Huly* services

### Storage Configuration
- `STORAGE_CONFIG`: MinIO configuration (format: `minio|minio?accessKey=minioadmin&secretKey=minioadmin`)
- `AWS_ENDPOINT_URL`: `http://minio:9000` - S3-compatible endpoint
- `AWS_ACCESS_KEY_ID`: `minioadmin`
- `AWS_SECRET_ACCESS_KEY`: `minioadmin`
- `BUCKETS`: `blobs,eu|http://minio:9000?accessKey=minioadmin&secretKey=minioadmin` - Datalake bucket configuration

### Queue Configuration
- `QUEUE_CONFIG`: `redpanda:9092` - Region-based event routing
- `HULY_KAFKA_BOOTSTRAP`: `redpanda:9092` - Kafka bootstrap servers

### Service URLs (Internal)
- `ACCOUNTS_URL`: `http://tracex.local:3000`
- `TRANSACTOR_URL`: `ws://tracex.local:3332`
- `FULLTEXT_URL`: `http://tracex.local:4702`
- `REKONI_URL`: `http://tracex.local:4004`
- `COLLABORATOR_URL`: `ws://tracex.local:3078`
- `DATALAKE_URL`: `http://tracex.local:4030`
- `HULYLAKE_URL`: `http://tracex.local:8096`
- `PREVIEW_URL`: `http://tracex.local:4040`
- `STREAM_URL`: `http://tracex.local:1080/recording`
- `PAYMENT_URL`: `http://tracex.local:3040`
- `PRINT_URL`: `http://tracex.local:4005`
- `SIGN_URL`: `http://tracex.local:4006`
- `BACKUP_URL`: `http://tracex.local:4039/api/backup`
- `AI_BOT_URL`: `http://tracex.local:4010`

### Frontend Configuration
- `FILES_URL`: `http://tracex.local:4030/blob/:workspace/:blobId/:filename` - File download URL pattern
- `FRONT_URL`: `http://tracex.local:8087` - Frontend base URL
- `BRANDING_URL`: `http://tracex.local:8087/branding.json`
- `DESKTOP_UPDATES_URL`: `https://dist.tracex.co`

### Authentication & Security
- `HULY_TOKEN_SECRET`: `secret` - Token signing for Huly services
- `SERVER_SECRET`: `secret` - Service-to-service auth
- `ADMIN_EMAILS`: Admin user emails
- `LAST_NAME_FIRST`: `true` - Name formatting preference

### Feature Flags
- `ENABLE_COMPRESSION`: `true` - Transactor compression

### Rate Limiting (Transactor)
- `RATE_LIMIT_MAX`: `250` - Requests per window
- `RATE_LIMIT_WINDOW`: `30000` - 30 seconds

### Workspace Configuration
- `WS_OPERATION`: `all+backup` - Operation mode
- `WORKSPACE_LIMIT_PER_USER`: `10000`
- `REGION_INFO`: `pg|PostgreSQL` - Available regions

### Backup Configuration
- `BUCKET_NAME`: `backups`
- `BACKUP_STORAGE`: `${BACKUP_STORAGE_CONFIG}`
- `INTERVAL`: `60` - Backup interval in second
### Stream Service
- `STREAM_ENDPOINT_URL`: `datalake://tracex.local:4030`
- `STREAM_INSECURE`: `true`
- `STREAM_MAX_PARALLEL_SCALING_COUNT`: `6`

---

## Troubleshooting Guide

### Service Health Verification

```bash
# Check all services
docker ps

# Check individual service logs
docker logs -f [container_id]
```
