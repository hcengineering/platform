# Container Development Guide

Learn how to build robust containers for Huly Virtual Network.

## Table of Contents

- [Introduction](#introduction)
- [Container Basics](#container-basics)
- [Container Lifecycle](#container-lifecycle)
- [Implementing Request Handlers](#implementing-request-handlers)
- [Event Broadcasting](#event-broadcasting)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Testing Containers](#testing-containers)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

## Introduction

Containers are the core building blocks of Huly Network applications. They encapsulate business logic, manage state, and handle client requests. This guide will teach you how to build production-ready containers.

## Container Basics

### The Container Interface

Every container must implement the `Container` interface:

```typescript
import type { Container, ContainerUuid, ClientUuid } from '@hcengineering/network-core'

interface Container {
  // Handle requests from clients
  request(operation: string, data?: any, clientId?: ClientUuid): Promise<any>

  // Health check
  ping(): Promise<void>

  // Cleanup resources
  terminate(): Promise<void>

  // Client connection management
  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void
  disconnect(clientId: ClientUuid): void

  // Optional: called when container is removed from network
  onTerminated?(): void
}
```

### Minimal Container

Here's the simplest possible container:

```typescript
export class MinimalContainer implements Container {
  constructor(readonly uuid: ContainerUuid) {}

  async request(operation: string, data?: any): Promise<any> {
    return { message: 'Hello, World!' }
  }

  async ping(): Promise<void> {}
  async terminate(): Promise<void> {}

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {}
  disconnect(clientId: ClientUuid): void {}
}
```

### Container with Operations

Most containers handle multiple operations:

```typescript
export class CalculatorContainer implements Container {
  constructor(readonly uuid: ContainerUuid) {}

  async request(operation: string, data?: any): Promise<any> {
    switch (operation) {
      case 'add':
        return { result: data.a + data.b }

      case 'subtract':
        return { result: data.a - data.b }

      case 'multiply':
        return { result: data.a * data.b }

      case 'divide':
        if (data.b === 0) {
          throw new Error('Division by zero')
        }
        return { result: data.a / data.b }

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }

  async ping(): Promise<void> {}
  async terminate(): Promise<void> {}

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {}
  disconnect(clientId: ClientUuid): void {}
}
```

## Container Lifecycle

### Lifecycle Phases

```
1. Creation      → Container factory called
2. Registration  → Added to network registry
3. Active        → Processing requests
4. Referenced    → Clients hold references
5. Idle          → No references, countdown started
6. Terminating   → terminate() called
7. Removed       → Removed from registry
```

### Handling Creation

Containers are created by factory functions:

```typescript
import type { GetOptions, ContainerUuid } from '@hcengineering/network-core'
import { createAgent } from '@hcengineering/network-client'

const { agent, server } = await createAgent('localhost:3738', {
  'my-service': async (options: GetOptions) => {
    // Extract creation parameters
    const uuid = options.uuid ?? generateUuid()
    const userId = options.extra?.userId
    const tier = options.labels?.[0] || 'free'

    // Create container with parameters
    const container = new MyServiceContainer(uuid, userId, tier)

    // Initialize if needed
    await container.initialize()

    // Return container with endpoint
    return {
      uuid,
      container,
      endpoint: `myservice://host/${uuid}` as any
    }
  }
})
```

### Handling Termination

Always clean up resources in `terminate()`:

```typescript
export class DatabaseContainer implements Container {
  private connection?: DatabaseConnection
  private cache = new Map<string, any>()

  async terminate(): Promise<void> {
    console.log(`Terminating container ${this.uuid}`)

    // 1. Notify connected clients
    await this.notifyShutdown()

    // 2. Close external connections
    if (this.connection) {
      await this.connection.close()
      this.connection = undefined
    }

    // 3. Clear caches
    this.cache.clear()

    // 4. Cancel any pending operations
    this.cancelPendingOperations()

    console.log(`Container ${this.uuid} terminated`)
  }

  // Optional: called after removal from network
  onTerminated(): void {
    console.log(`Container ${this.uuid} removed from network`)
  }
}
```

## Implementing Request Handlers

### Request Handler Pattern

Use a switch statement or command pattern:

```typescript
export class UserServiceContainer implements Container {
  private users = new Map<string, User>()

  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    console.log(`Operation: ${operation}`, data)

    try {
      switch (operation) {
        case 'createUser':
          return await this.createUser(data)

        case 'getUser':
          return await this.getUser(data.userId)

        case 'updateUser':
          return await this.updateUser(data.userId, data.updates)

        case 'deleteUser':
          return await this.deleteUser(data.userId)

        case 'listUsers':
          return await this.listUsers(data.filter)

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
            supportedOperations: ['createUser', 'getUser', 'updateUser', 'deleteUser', 'listUsers']
          }
      }
    } catch (error: any) {
      console.error(`Error in ${operation}:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async createUser(data: any): Promise<any> {
    const user: User = {
      id: generateId(),
      name: data.name,
      email: data.email,
      createdAt: Date.now()
    }

    this.users.set(user.id, user)

    await this.broadcast({
      type: 'userCreated',
      user
    })

    return { success: true, user }
  }

  private async getUser(userId: string): Promise<any> {
    const user = this.users.get(userId)

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    return { success: true, user }
  }

  // ... other methods
}
```

### Async Operations

Handle long-running operations properly:

```typescript
export class ProcessingContainer implements Container {
  private activeJobs = new Map<string, AbortController>()

  async request(operation: string, data?: any): Promise<any> {
    switch (operation) {
      case 'startJob': {
        const jobId = generateId()
        const controller = new AbortController()
        this.activeJobs.set(jobId, controller)

        // Start async processing
        this.processJob(jobId, data, controller.signal).catch((err) => {
          console.error(`Job ${jobId} failed:`, err)
        })

        return { success: true, jobId }
      }

      case 'cancelJob': {
        const controller = this.activeJobs.get(data.jobId)
        if (controller) {
          controller.abort()
          this.activeJobs.delete(data.jobId)
          return { success: true }
        }
        return { success: false, error: 'Job not found' }
      }

      case 'getJobStatus': {
        const active = this.activeJobs.has(data.jobId)
        return { success: true, active }
      }
    }
  }

  private async processJob(jobId: string, data: any, signal: AbortSignal): Promise<void> {
    try {
      for (let i = 0; i < 100; i++) {
        if (signal.aborted) {
          await this.broadcast({
            type: 'jobCancelled',
            jobId
          })
          return
        }

        // Do work
        await this.processChunk(data, i)

        // Report progress
        await this.broadcast({
          type: 'jobProgress',
          jobId,
          progress: i + 1
        })
      }

      await this.broadcast({
        type: 'jobCompleted',
        jobId
      })
    } finally {
      this.activeJobs.delete(jobId)
    }
  }

  async terminate(): Promise<void> {
    // Cancel all active jobs
    for (const [jobId, controller] of this.activeJobs) {
      controller.abort()
    }
    this.activeJobs.clear()
  }
}
```

## Event Broadcasting

### Broadcasting to Connected Clients

```typescript
export class ChatRoomContainer implements Container {
  private clients = new Map<ClientUuid, (data: any) => Promise<void>>()
  private messages: Message[] = []

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {
    console.log(`Client ${clientId} connected`)
    this.clients.set(clientId, broadcast)

    // Send welcome message
    broadcast({
      type: 'welcome',
      message: `Welcome! ${this.clients.size} users online`,
      history: this.messages.slice(-10) // Last 10 messages
    }).catch((err) => console.error('Failed to send welcome:', err))
  }

  disconnect(clientId: ClientUuid): void {
    console.log(`Client ${clientId} disconnected`)
    this.clients.delete(clientId)

    // Notify others
    this.broadcast({
      type: 'userLeft',
      clientId,
      usersOnline: this.clients.size
    }).catch((err) => console.error('Failed to broadcast:', err))
  }

  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    switch (operation) {
      case 'sendMessage': {
        const message: Message = {
          id: generateId(),
          clientId: clientId!,
          text: data.text,
          timestamp: Date.now()
        }

        this.messages.push(message)

        // Broadcast to all connected clients
        await this.broadcast({
          type: 'newMessage',
          message
        })

        return { success: true, messageId: message.id }
      }
    }
  }

  private async broadcast(event: any): Promise<void> {
    const promises = Array.from(this.clients.values()).map((fn) =>
      fn(event).catch((err) => console.error('Broadcast error:', err))
    )
    await Promise.all(promises)
  }

  async terminate(): Promise<void> {
    await this.broadcast({
      type: 'roomClosed',
      message: 'Chat room is closing'
    })
    this.clients.clear()
    this.messages = []
  }
}
```

### Selective Broadcasting

Send events to specific clients:

```typescript
export class NotificationContainer implements Container {
  private subscribers = new Map<
    ClientUuid,
    {
      broadcast: (data: any) => Promise<void>
      filter: NotificationFilter
    }
  >()

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {
    // Store with default filter
    this.subscribers.set(clientId, {
      broadcast,
      filter: { all: true }
    })
  }

  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    switch (operation) {
      case 'subscribe': {
        const sub = this.subscribers.get(clientId!)
        if (sub) {
          sub.filter = data.filter
        }
        return { success: true }
      }

      case 'sendNotification': {
        await this.sendNotification(data.notification)
        return { success: true }
      }
    }
  }

  private async sendNotification(notification: Notification): Promise<void> {
    const promises: Promise<void>[] = []

    for (const [clientId, { broadcast, filter }] of this.subscribers) {
      if (this.matchesFilter(notification, filter)) {
        promises.push(
          broadcast({ type: 'notification', notification }).catch((err) =>
            console.error(`Failed to notify ${clientId}:`, err)
          )
        )
      }
    }

    await Promise.all(promises)
  }

  private matchesFilter(notification: Notification, filter: NotificationFilter): boolean {
    if (filter.all) return true
    if (filter.types && !filter.types.includes(notification.type)) return false
    if (filter.priority && notification.priority < filter.priority) return false
    return true
  }
}
```

## State Management

### In-Memory State

```typescript
export class SessionContainer implements Container {
  private sessionData = new Map<string, any>()
  private lastActivity = Date.now()
  private readonly TIMEOUT = 30 * 60 * 1000 // 30 minutes

  async request(operation: string, data?: any): Promise<any> {
    this.lastActivity = Date.now()

    switch (operation) {
      case 'set':
        this.sessionData.set(data.key, data.value)
        return { success: true }

      case 'get':
        return {
          success: true,
          value: this.sessionData.get(data.key)
        }

      case 'getAll':
        return {
          success: true,
          data: Object.fromEntries(this.sessionData)
        }

      case 'isActive':
        const inactive = Date.now() - this.lastActivity
        return {
          success: true,
          active: inactive < this.TIMEOUT
        }
    }
  }
}
```

### Persistent State

```typescript
export class PersistentContainer implements Container {
  private cache = new Map<string, any>()
  private db: Database

  constructor(readonly uuid: ContainerUuid, private readonly dbPath: string) {}

  async initialize(): Promise<void> {
    this.db = await openDatabase(this.dbPath)

    // Load initial data into cache
    const data = await this.db.loadAll()
    for (const [key, value] of data) {
      this.cache.set(key, value)
    }
  }

  async request(operation: string, data?: any): Promise<any> {
    switch (operation) {
      case 'set': {
        // Update cache
        this.cache.set(data.key, data.value)

        // Persist to database (async)
        this.db.save(data.key, data.value).catch((err) => console.error('Failed to persist:', err))

        return { success: true }
      }

      case 'get': {
        // Try cache first
        let value = this.cache.get(data.key)

        // Fall back to database
        if (value === undefined) {
          value = await this.db.load(data.key)
          if (value !== undefined) {
            this.cache.set(data.key, value)
          }
        }

        return { success: true, value }
      }
    }
  }

  async terminate(): Promise<void> {
    // Flush any pending writes
    await this.db.flush()
    await this.db.close()
    this.cache.clear()
  }
}
```

## Error Handling

### Graceful Error Handling

```typescript
export class RobustContainer implements Container {
  async request(operation: string, data?: any): Promise<any> {
    try {
      // Validate input
      this.validateRequest(operation, data)

      // Process request
      const result = await this.processRequest(operation, data)

      return { success: true, result }
    } catch (error: any) {
      console.error(`Error in ${operation}:`, error)

      // Categorize errors
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: 'validation',
          message: error.message,
          fields: error.fields
        }
      }

      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: 'not_found',
          message: error.message
        }
      }

      if (error instanceof PermissionError) {
        return {
          success: false,
          error: 'permission_denied',
          message: error.message
        }
      }

      // Generic error
      return {
        success: false,
        error: 'internal_error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      }
    }
  }

  private validateRequest(operation: string, data?: any): void {
    if (!operation) {
      throw new ValidationError('Operation is required')
    }

    // Operation-specific validation
    switch (operation) {
      case 'createUser':
        if (!data?.email) {
          throw new ValidationError('Email is required', ['email'])
        }
        if (!this.isValidEmail(data.email)) {
          throw new ValidationError('Invalid email', ['email'])
        }
        break
    }
  }
}
```

## Testing Containers

### Unit Tests

```typescript
import { describe, it, expect } from '@jest/globals'

describe('CalculatorContainer', () => {
  let container: CalculatorContainer

  beforeEach(() => {
    container = new CalculatorContainer('test-uuid' as ContainerUuid)
  })

  afterEach(async () => {
    await container.terminate()
  })

  it('should add numbers', async () => {
    const result = await container.request('add', { a: 2, b: 3 })
    expect(result).toEqual({ result: 5 })
  })

  it('should handle division by zero', async () => {
    await expect(container.request('divide', { a: 10, b: 0 })).rejects.toThrow('Division by zero')
  })

  it('should reject unknown operations', async () => {
    await expect(container.request('unknown', {})).rejects.toThrow('Unknown operation')
  })
})
```

### Integration Tests

```typescript
describe('Container Integration', () => {
  let tickManager: TickManager
  let network: Network
  let agent: NetworkAgent
  let client: NetworkClient

  beforeAll(async () => {
    // Setup infrastructure
    tickManager = new TickManagerImpl(1)
    tickManager.start()
    network = new NetworkImpl(tickManager)

    // Create agent using createAgent
    const agentResult = await createAgent('localhost:3738', {
      calculator: async (options) => ({
        uuid: options.uuid ?? ('calc-1' as ContainerUuid),
        container: new CalculatorContainer('calc-1' as ContainerUuid),
        endpoint: 'test://calc-1' as any
      })
    })
    agent = agentResult.agent

    // Connect client
    client = createNetworkClient('localhost:3737')
    await client.waitConnection()
    await client.register(agent)
  })

  afterAll(async () => {
    await client.close()
    tickManager.stop()
  })

  it('should perform calculations via network', async () => {
    const ref = await client.get('calculator' as any, {})
    const result = await ref.request('multiply', { a: 6, b: 7 })

    expect(result).toEqual({ result: 42 })

    await ref.close()
  })
})
```

## Best Practices

### 1. Validate Inputs

Always validate incoming data:

```typescript
private validateCreateUser(data: any): void {
  if (!data?.name || typeof data.name !== 'string') {
    throw new ValidationError('Name must be a non-empty string')
  }
  if (!data?.email || !this.isValidEmail(data.email)) {
    throw new ValidationError('Valid email is required')
  }
}
```

### 2. Use Type Safety

Define proper types:

```typescript
interface CreateUserRequest {
  name: string
  email: string
  role?: UserRole
}

interface UpdateUserRequest {
  userId: string
  updates: Partial<User>
}

async request(operation: string, data?: any): Promise<any> {
  switch (operation) {
    case 'createUser':
      return await this.createUser(data as CreateUserRequest)
    case 'updateUser':
      return await this.updateUser(data as UpdateUserRequest)
  }
}
```

### 3. Log Operations

Add structured logging:

```typescript
async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
  const startTime = Date.now()

  console.log('Request', {
    container: this.uuid,
    operation,
    clientId,
    timestamp: new Date().toISOString()
  })

  try {
    const result = await this.handleRequest(operation, data, clientId)

    console.log('Success', {
      container: this.uuid,
      operation,
      duration: Date.now() - startTime
    })

    return result
  } catch (error: any) {
    console.error('Error', {
      container: this.uuid,
      operation,
      error: error.message,
      duration: Date.now() - startTime
    })
    throw error
  }
}
```

### 4. Handle Cleanup Properly

Always clean up in terminate():

```typescript
async terminate(): Promise<void> {
  try {
    // 1. Stop accepting new requests
    this.isTerminating = true

    // 2. Wait for pending operations
    await this.waitForPendingOperations()

    // 3. Notify clients
    await this.broadcast({ type: 'containerClosing' })

    // 4. Close connections
    await this.closeConnections()

    // 5. Clear state
    this.clearState()
  } catch (error) {
    console.error('Error during termination:', error)
  }
}
```

### 5. Document Operations

Document your container's API:

```typescript
/**
 * User Management Container
 *
 * Operations:
 * - createUser(data: CreateUserRequest): Promise<CreateUserResponse>
 * - getUser(data: { userId: string }): Promise<GetUserResponse>
 * - updateUser(data: UpdateUserRequest): Promise<UpdateUserResponse>
 * - deleteUser(data: { userId: string }): Promise<DeleteUserResponse>
 * - listUsers(data: ListUsersRequest): Promise<ListUsersResponse>
 *
 * Events:
 * - userCreated: { user: User }
 * - userUpdated: { userId: string, changes: Partial<User> }
 * - userDeleted: { userId: string }
 */
export class UserManagementContainer implements Container {
  // ...
}
```

## Common Patterns

### Singleton Container

For containers that should have only one instance:

```typescript
// Use stateless container with HA
agent.addStatelessContainer(
  'singleton-service' as ContainerUuid,
  'singleton' as ContainerKind,
  'singleton://agent/service' as ContainerEndpointRef,
  new SingletonContainer('singleton-service' as ContainerUuid)
)
```

### Container with Dependencies

Inject dependencies:

```typescript
export class ServiceContainer implements Container {
  constructor(
    readonly uuid: ContainerUuid,
    private readonly database: Database,
    private readonly cache: CacheService,
    private readonly eventBus: EventBus
  ) {}

  // Factory function
  static async create(uuid: ContainerUuid): Promise<ServiceContainer> {
    const db = await Database.connect()
    const cache = new CacheService()
    const eventBus = new EventBus()

    return new ServiceContainer(uuid, db, cache, eventBus)
  }
}
```

### Container Pool

For resource-intensive containers:

```typescript
// Agent maintains a pool
const containerPool = new ContainerPool(5) // Max 5 instances

const { agent, server } = await createAgent('localhost:3738', {
  worker: async (options) => {
    const container = await containerPool.acquire()
    return {
      uuid: container.uuid,
      container,
      endpoint: `worker://agent/${container.uuid}` as any
    }
  }
})
```

## Next Steps

- [Agent Development Guide](AGENT_DEVELOPMENT.md) - Deploy your containers
- [Error Handling Best Practices](ERROR_HANDLING.md) - Advanced error handling
- [Testing Guide](TESTING.md) - Comprehensive testing strategies
- [Examples](../examples/) - Real-world container examples

---

Need help? Check the [Troubleshooting Guide](TROUBLESHOOTING.md) or open an issue on GitHub.
