# Multi-Tenant Architectures with Huly Network

Building secure, scalable multi-tenant applications using Huly Virtual Network.

## Table of Contents

- [Introduction](#introduction)
- [Multi-Tenancy Patterns](#multi-tenancy-patterns)
- [Container Isolation](#container-isolation)
- [Tenant Identification](#tenant-identification)
- [Data Isolation](#data-isolation)
- [Resource Management](#resource-management)
- [Security Considerations](#security-considerations)
- [Billing and Metering](#billing-and-metering)
- [Complete Example](#complete-example)

## Introduction

Multi-tenancy allows multiple customers (tenants) to share the same infrastructure while maintaining complete data and security isolation. Huly Network provides natural multi-tenancy through container kinds, labels, and reference management.

### Benefits of Multi-Tenant Architecture

- **Cost Efficiency**: Share infrastructure costs across tenants
- **Scalability**: Scale resources per tenant independently
- **Isolation**: Complete data and security separation
- **Flexibility**: Different tiers and features per tenant
- **Maintainability**: Single codebase for all tenants

## Multi-Tenancy Patterns

### Pattern 1: Tenant-Per-Container

Each tenant gets dedicated container instances:

```typescript
// Request workspace for specific tenant
const workspace = await client.get('workspace' as ContainerKind, {
  labels: ['tenant-acme-corp']
})
```

**Pros:**

- Complete isolation
- Easy to track resource usage
- Can scale per tenant

**Cons:**

- More containers to manage
- Higher resource overhead

### Pattern 2: Shared Container with Tenant Filtering

Multiple tenants share containers, data filtered by tenant ID:

```typescript
class SharedWorkspaceContainer implements Container {
  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    const tenantId = data.tenantId

    // All operations scoped to tenant
    switch (operation) {
      case 'getData':
        return this.getData(tenantId, data.filter)
    }
  }

  private async getData(tenantId: string, filter: any): Promise<any> {
    // Query with tenant filter
    return this.db.query({ ...filter, tenantId })
  }
}
```

**Pros:**

- Fewer containers
- Better resource utilization
- Easier to manage

**Cons:**

- Must ensure data isolation in code
- Risk of data leakage if not careful

### Pattern 3: Hybrid Approach

Shared containers for common operations, dedicated for sensitive data:

```typescript
// Shared query engine
const queryEngine = await client.get('query-engine' as ContainerKind, {
  labels: ['shared']
})

// Dedicated workspace for sensitive operations
const workspace = await client.get('workspace' as ContainerKind, {
  labels: ['tenant-acme-corp', 'dedicated']
})
```

## Container Isolation

### Using Labels for Tenant Routing

```typescript
// Agent factory with tenant-aware containers
// Note: For production code, use createAgent() from @hcengineering/network-client
import { createAgent } from '@hcengineering/network-client'

const { agent, server } = await createAgent('localhost:3738', {
  'tenant-workspace': async (options: GetOptions) => {
    const tenantId = options.labels?.[0]
    if (!tenantId) {
      throw new Error('Tenant ID required')
    }

    const uuid = `workspace-${tenantId}-${Date.now()}` as ContainerUuid
    const container = new TenantWorkspaceContainer(uuid, tenantId)

    return {
      uuid,
      container,
      endpoint: `workspace://${tenantId}/${uuid}` as any
    }
  }
})
```

### Tenant Workspace Container

```typescript
export class TenantWorkspaceContainer implements Container {
  private data = new Map<string, any>()
  private users = new Set<string>()

  constructor(readonly uuid: ContainerUuid, readonly tenantId: string) {
    console.log(`Workspace created for tenant: ${tenantId}`)
  }

  async request(operation: string, data?: any): Promise<any> {
    // All operations automatically scoped to this.tenantId

    switch (operation) {
      case 'createDocument':
        return this.createDocument(data)

      case 'listDocuments':
        return this.listDocuments()

      case 'addUser':
        return this.addUser(data.userId)
    }
  }

  private async createDocument(data: any): Promise<any> {
    const docId = generateId()
    const doc = {
      id: docId,
      tenantId: this.tenantId, // Automatically tagged
      ...data,
      createdAt: Date.now()
    }

    this.data.set(docId, doc)

    await this.broadcast({
      type: 'documentCreated',
      document: doc
    })

    return { success: true, document: doc }
  }

  private async listDocuments(): Promise<any> {
    // Only returns documents for this tenant
    return {
      success: true,
      documents: Array.from(this.data.values()),
      tenantId: this.tenantId
    }
  }
}
```

## Tenant Identification

### Method 1: Labels

Use labels to identify tenants:

```typescript
// Client requests workspace for tenant
const workspace = await client.get('workspace' as ContainerKind, {
  labels: ['tenant-id:acme-corp', 'tier:enterprise']
})
```

### Method 2: Extra Parameters

Pass tenant context in extra parameters:

```typescript
const workspace = await client.get('workspace' as ContainerKind, {
  extra: {
    tenantId: 'acme-corp',
    tier: 'enterprise',
    region: 'us-west'
  }
})
```

### Method 3: Request-Time Identification

Include tenant in every request:

```typescript
await workspace.request('createDocument', {
  tenantId: 'acme-corp', // Required in every request
  title: 'Q1 Report',
  content: '...'
})
```

### Best Practice: Combined Approach

```typescript
// Container-level isolation (preferred)
const workspace = await client.get('workspace' as ContainerKind, {
  labels: ['tenant:acme-corp']
})

// Request-level validation (defense in depth)
await workspace.request('createDocument', {
  tenantId: 'acme-corp', // Validated against container's tenant
  data: { ... }
})
```

## Data Isolation

### Database-Level Isolation

```typescript
export class DatabaseContainer implements Container {
  private db: TenantDatabase

  constructor(readonly uuid: ContainerUuid, readonly tenantId: string) {
    // Connect to tenant-specific database
    this.db = new TenantDatabase({
      database: `tenant_${tenantId}`,
      schema: tenantId
    })
  }

  async request(operation: string, data?: any): Promise<any> {
    // All queries automatically scoped to tenant database
    switch (operation) {
      case 'query':
        return await this.db.query(data.sql, data.params)
    }
  }
}
```

### Row-Level Security

```typescript
export class SharedDatabaseContainer implements Container {
  private db: Database

  async request(operation: string, data?: any): Promise<any> {
    const tenantId = data.tenantId

    switch (operation) {
      case 'query':
        // Always add tenant filter
        return await this.db.query(data.sql + ' WHERE tenant_id = ?', [...data.params, tenantId])
    }
  }
}
```

### In-Memory Isolation

```typescript
export class CacheContainer implements Container {
  // Separate cache per tenant
  private caches = new Map<string, Map<string, any>>()

  private getTenantCache(tenantId: string): Map<string, any> {
    if (!this.caches.has(tenantId)) {
      this.caches.set(tenantId, new Map())
    }
    return this.caches.get(tenantId)!
  }

  async request(operation: string, data?: any): Promise<any> {
    const cache = this.getTenantCache(data.tenantId)

    switch (operation) {
      case 'get':
        return { value: cache.get(data.key) }

      case 'set':
        cache.set(data.key, data.value)
        return { success: true }
    }
  }
}
```

## Resource Management

### Resource Quotas

```typescript
interface TenantQuota {
  maxDocuments: number
  maxUsers: number
  maxStorageBytes: number
  maxRequestsPerSecond: number
}

export class QuotaEnforcedContainer implements Container {
  private quotas = new Map<string, TenantQuota>()
  private usage = new Map<string, TenantUsage>()

  constructor(readonly uuid: ContainerUuid, readonly tenantId: string) {
    // Load quota for tenant
    this.quotas.set(tenantId, this.loadQuota(tenantId))
  }

  async request(operation: string, data?: any): Promise<any> {
    // Check quota before operation
    if (!(await this.checkQuota(operation, data))) {
      return {
        success: false,
        error: 'quota_exceeded',
        message: 'Your plan limit has been reached'
      }
    }

    // Process request
    const result = await this.processRequest(operation, data)

    // Update usage
    await this.updateUsage(operation, data)

    return result
  }

  private async checkQuota(operation: string, data: any): Promise<boolean> {
    const quota = this.quotas.get(this.tenantId)!
    const usage = this.usage.get(this.tenantId) || { documents: 0, users: 0 }

    switch (operation) {
      case 'createDocument':
        return usage.documents < quota.maxDocuments

      case 'addUser':
        return usage.users < quota.maxUsers

      default:
        return true
    }
  }
}
```

### Rate Limiting

```typescript
import { RateLimiter } from 'limiter'

export class RateLimitedContainer implements Container {
  private limiters = new Map<string, RateLimiter>()

  constructor(readonly uuid: ContainerUuid, readonly tenantId: string) {
    // Different limits per tier
    const tier = this.getTenantTier(tenantId)
    const limit = tier === 'enterprise' ? 1000 : 100 // requests per second

    this.limiters.set(
      tenantId,
      new RateLimiter({
        tokensPerInterval: limit,
        interval: 'second'
      })
    )
  }

  async request(operation: string, data?: any): Promise<any> {
    const limiter = this.limiters.get(this.tenantId)!

    // Try to consume token
    if (!(await limiter.tryRemoveTokens(1))) {
      return {
        success: false,
        error: 'rate_limit_exceeded',
        message: 'Too many requests, please try again later'
      }
    }

    return await this.processRequest(operation, data)
  }
}
```

## Security Considerations

### Preventing Data Leakage

```typescript
export class SecureTenantContainer implements Container {
  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    // 1. Validate tenant access
    if (!(await this.validateTenantAccess(data.tenantId, clientId))) {
      throw new Error('Unauthorized tenant access')
    }

    // 2. Ensure tenant ID matches container
    if (data.tenantId !== this.tenantId) {
      throw new Error('Tenant ID mismatch')
    }

    // 3. Process request
    const result = await this.processRequest(operation, data)

    // 4. Sanitize response (remove cross-tenant data)
    return this.sanitizeResponse(result, this.tenantId)
  }

  private sanitizeResponse(data: any, tenantId: string): any {
    // Remove any data not belonging to tenant
    if (Array.isArray(data)) {
      return data.filter((item) => item.tenantId === tenantId)
    }
    return data
  }
}
```

### Audit Logging

```typescript
export class AuditedContainer implements Container {
  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    const startTime = Date.now()

    // Log request
    await this.auditLog({
      timestamp: new Date().toISOString(),
      tenantId: this.tenantId,
      clientId,
      operation,
      data: this.sanitizeForAudit(data)
    })

    try {
      const result = await this.processRequest(operation, data)

      // Log success
      await this.auditLog({
        timestamp: new Date().toISOString(),
        tenantId: this.tenantId,
        operation,
        status: 'success',
        duration: Date.now() - startTime
      })

      return result
    } catch (error: any) {
      // Log failure
      await this.auditLog({
        timestamp: new Date().toISOString(),
        tenantId: this.tenantId,
        operation,
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      })

      throw error
    }
  }
}
```

## Billing and Metering

### Usage Tracking

```typescript
export class MeteredContainer implements Container {
  private usage = {
    requests: 0,
    computeTime: 0,
    storageBytes: 0
  }

  async request(operation: string, data?: any): Promise<any> {
    const startTime = Date.now()

    this.usage.requests++

    try {
      const result = await this.processRequest(operation, data)

      // Track compute time
      const duration = Date.now() - startTime
      this.usage.computeTime += duration

      // Track storage if applicable
      if (operation === 'store') {
        this.usage.storageBytes += this.calculateSize(data)
      }

      // Report to billing system
      await this.reportUsage()

      return result
    } catch (error) {
      this.usage.computeTime += Date.now() - startTime
      throw error
    }
  }

  private async reportUsage(): Promise<void> {
    // Send to billing system every 1000 requests
    if (this.usage.requests % 1000 === 0) {
      await fetch('https://billing.api/usage', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: this.tenantId,
          period: new Date().toISOString(),
          usage: this.usage
        })
      })
    }
  }
}
```

## Complete Example

### SaaS Application with Multiple Tenants

```typescript
// See examples/03-multi-tenant.ts for complete working example

import { AgentImpl } from '@hcengineering/network-core'
import type { GetOptions, ContainerUuid } from '@hcengineering/network-core'

// Define tenant workspace container
class SaaSTenantContainer implements Container {
  private data = new Map<string, any>()
  private users = new Set<string>()
  private quota: TenantQuota
  private usage: TenantUsage

  constructor(readonly uuid: ContainerUuid, readonly tenantId: string, readonly tier: 'free' | 'pro' | 'enterprise') {
    this.quota = this.getQuotaForTier(tier)
    this.usage = { documents: 0, users: 0, requests: 0 }
  }

  async request(operation: string, data?: any): Promise<any> {
    // Rate limiting
    if (!(await this.checkRateLimit())) {
      return { success: false, error: 'rate_limit_exceeded' }
    }

    // Quota checking
    if (!(await this.checkQuota(operation))) {
      return { success: false, error: 'quota_exceeded' }
    }

    // Process request
    this.usage.requests++

    switch (operation) {
      case 'createDocument':
        return await this.createDocument(data)
      case 'listDocuments':
        return await this.listDocuments()
      case 'addUser':
        return await this.addUser(data)
      case 'getUsage':
        return { success: true, usage: this.usage, quota: this.quota }
    }
  }

  // Implementation details...
}

// Create agent
// Note: For production code, use createAgent() from @hcengineering/network-client
const { agent, server } = await createAgent('localhost:3738', {
  'tenant-workspace': async (options: GetOptions) => {
    const tenantId = options.labels?.[0]
    const tier = options.extra?.tier || 'free'

    const container = new SaaSTenantContainer(`workspace-${tenantId}` as ContainerUuid, tenantId, tier)

    return {
      uuid: container.uuid,
      container,
      endpoint: `saas://${tenantId}/${container.uuid}` as any
    }
  }
})
```

## Best Practices

1. **Always validate tenant ID** in every request
2. **Use container-level isolation** when possible
3. **Implement quotas and rate limiting** per tenant
4. **Audit all operations** for security and compliance
5. **Monitor resource usage** per tenant
6. **Test cross-tenant access** prevention
7. **Plan for tenant data migration** and export
8. **Document tenant isolation** boundaries
9. **Implement graceful degradation** when quotas exceeded
10. **Provide tenant analytics** dashboard

## Next Steps

- [Container Development Guide](CONTAINER_DEVELOPMENT.md)
- [Security Best Practices](SECURITY.md)
- [Performance Tuning](PERFORMANCE.md)
- [Examples: Multi-Tenant](../examples/03-multi-tenant.ts)

---

For help building multi-tenant applications, see the [Troubleshooting Guide](TROUBLESHOOTING.md).
