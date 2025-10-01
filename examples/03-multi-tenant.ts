/**
 * Example 3: Multi-Tenant Container Management
 * 
 * This example demonstrates managing per-tenant containers with labels.
 * Each tenant gets their own isolated workspace with separate data.
 * 
 * @example
 * // Start the network server first:
 * // cd pods/network-pod && rushx dev
 * 
 * // Then run this example:
 * // npx ts-node examples/03-multi-tenant.ts
 */

import { AgentImpl, TickManagerImpl, NetworkImpl } from '../packages/core/src'
import { NetworkServer } from '../packages/server/src'
import { createNetworkClient, NetworkAgentServer } from '../packages/client/src'
import type { 
  Container, 
  ContainerUuid, 
  ClientUuid,
  ContainerKind,
  GetOptions
} from '../packages/core/src'

interface Document {
  id: string
  title: string
  content: string
  createdAt: number
  createdBy: string
}

class TenantWorkspaceContainer implements Container {
  private users = new Set<string>()
  private documents = new Map<string, Document>()
  private documentCounter = 0

  constructor(
    readonly uuid: ContainerUuid,
    readonly tenantId: string
  ) {
    console.log(`[Workspace] Created for tenant: ${tenantId} (${uuid})`)
  }

  async request(operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    // All operations are tenant-isolated
    switch (operation) {
      case 'addUser':
        this.users.add(data.userId)
        console.log(`[${this.tenantId}] User added: ${data.userId}`)
        return { 
          success: true, 
          userId: data.userId,
          userCount: this.users.size 
        }

      case 'removeUser':
        const removed = this.users.delete(data.userId)
        console.log(`[${this.tenantId}] User removed: ${data.userId}`)
        return { 
          success: removed, 
          userCount: this.users.size 
        }

      case 'listUsers':
        return {
          success: true,
          users: Array.from(this.users),
          count: this.users.size
        }

      case 'createDocument': {
        const docId = `doc-${this.tenantId}-${++this.documentCounter}`
        const doc: Document = {
          id: docId,
          title: data.title,
          content: data.content,
          createdAt: Date.now(),
          createdBy: data.userId || 'unknown'
        }
        this.documents.set(docId, doc)
        console.log(`[${this.tenantId}] Document created: ${doc.title}`)
        return { 
          success: true, 
          document: doc 
        }
      }

      case 'getDocument': {
        const doc = this.documents.get(data.documentId)
        return { 
          success: true, 
          document: doc,
          found: doc !== undefined
        }
      }

      case 'updateDocument': {
        const doc = this.documents.get(data.documentId)
        if (!doc) {
          return { success: false, error: 'Document not found' }
        }
        if (data.title !== undefined) doc.title = data.title
        if (data.content !== undefined) doc.content = data.content
        console.log(`[${this.tenantId}] Document updated: ${doc.id}`)
        return { success: true, document: doc }
      }

      case 'deleteDocument': {
        const deleted = this.documents.delete(data.documentId)
        console.log(`[${this.tenantId}] Document deleted: ${data.documentId}`)
        return { success: deleted }
      }

      case 'listDocuments':
        return { 
          success: true, 
          documents: Array.from(this.documents.values()),
          count: this.documents.size
        }

      case 'getStats':
        return {
          success: true,
          tenantId: this.tenantId,
          uuid: this.uuid,
          userCount: this.users.size,
          documentCount: this.documents.size,
          users: Array.from(this.users),
          recentDocuments: Array.from(this.documents.values())
            .slice(-5)
            .map(d => ({ id: d.id, title: d.title }))
        }

      case 'search': {
        const query = data.query.toLowerCase()
        const results = Array.from(this.documents.values()).filter(doc =>
          doc.title.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query)
        )
        return {
          success: true,
          results,
          count: results.length
        }
      }

      default:
        return { success: false, error: 'Unknown operation' }
    }
  }

  async ping(): Promise<void> {}

  async terminate(): Promise<void> {
    console.log(`[Workspace] Tenant ${this.tenantId} workspace terminated`)
    this.users.clear()
    this.documents.clear()
  }

  connect(clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {}
  disconnect(clientId: ClientUuid): void {}
}

async function main(): Promise<void> {
  console.log('=== Multi-Tenant Container Management Example ===\n')

  // 1. Setup infrastructure
  const tickManager = new TickManagerImpl(1)
  tickManager.start()
  const network = new NetworkImpl(tickManager)
  const server = new NetworkServer(network, tickManager, '*', 3737)
  console.log('✓ Network server started\n')

  // 2. Create agent with tenant workspace factory
  const agent = new AgentImpl('workspace-agent' as any, {
    'tenant-workspace': async (options: GetOptions) => {
      const tenantId = options.labels?.[0] || 'default'
      const uuid = options.uuid ?? `workspace-${tenantId}-${Date.now()}` as ContainerUuid
      const container = new TenantWorkspaceContainer(uuid, tenantId)
      return {
        uuid,
        container,
        endpoint: `workspace://${tenantId}/${uuid}` as any
      }
    }
  })

  const agentServer = new NetworkAgentServer(tickManager, 'localhost', '*', 3738)
  await agentServer.start(agent)
  console.log('✓ Agent server started\n')

  // 3. Connect client
  const client = createNetworkClient('localhost:3737')
  await client.waitConnection(5000)
  console.log('✓ Client connected\n')

  // 4. Register agent
  await client.register(agent)
  console.log('✓ Agent registered\n')

  // Helper function to get tenant workspace
  async function getTenantWorkspace(tenantId: string) {
    return await client.get('tenant-workspace' as ContainerKind, {
      labels: [tenantId],
      extra: { tenantId }
    })
  }

  // 5. Setup workspaces for different tenants
  console.log('=== Setting up Tenant: ACME Corp ===\n')
  const acmeWorkspace = await getTenantWorkspace('tenant-acme')
  
  await acmeWorkspace.request('addUser', { userId: 'alice@acme.com' })
  await acmeWorkspace.request('addUser', { userId: 'bob@acme.com' })
  
  await acmeWorkspace.request('createDocument', {
    userId: 'alice@acme.com',
    title: 'Q1 Financial Report',
    content: 'Revenue increased by 25%...'
  })
  
  await acmeWorkspace.request('createDocument', {
    userId: 'bob@acme.com',
    title: 'Product Roadmap',
    content: 'Feature releases planned for...'
  })

  const acmeStats = await acmeWorkspace.request('getStats')
  console.log('ACME Workspace Stats:', acmeStats)
  console.log()

  console.log('=== Setting up Tenant: Globex Inc ===\n')
  const globexWorkspace = await getTenantWorkspace('tenant-globex')
  
  await globexWorkspace.request('addUser', { userId: 'charlie@globex.com' })
  await globexWorkspace.request('addUser', { userId: 'diana@globex.com' })
  await globexWorkspace.request('addUser', { userId: 'eve@globex.com' })
  
  await globexWorkspace.request('createDocument', {
    userId: 'charlie@globex.com',
    title: 'Marketing Strategy 2024',
    content: 'Focus on digital channels...'
  })

  const globexStats = await globexWorkspace.request('getStats')
  console.log('Globex Workspace Stats:', globexStats)
  console.log()

  console.log('=== Setting up Tenant: StartupXYZ ===\n')
  const startupWorkspace = await getTenantWorkspace('tenant-startupxyz')
  
  await startupWorkspace.request('addUser', { userId: 'founder@startupxyz.com' })
  
  await startupWorkspace.request('createDocument', {
    userId: 'founder@startupxyz.com',
    title: 'MVP Specs',
    content: 'Build minimum viable product with...'
  })

  const startupStats = await startupWorkspace.request('getStats')
  console.log('StartupXYZ Workspace Stats:', startupStats)
  console.log()

  // 6. Demonstrate tenant isolation
  console.log('=== Demonstrating Tenant Isolation ===\n')
  
  console.log('ACME documents:')
  const acmeDocs = await acmeWorkspace.request('listDocuments')
  acmeDocs.documents.forEach((doc: Document) => {
    console.log(`  - ${doc.title} (by ${doc.createdBy})`)
  })
  console.log()

  console.log('Globex documents:')
  const globexDocs = await globexWorkspace.request('listDocuments')
  globexDocs.documents.forEach((doc: Document) => {
    console.log(`  - ${doc.title} (by ${doc.createdBy})`)
  })
  console.log()

  console.log('StartupXYZ documents:')
  const startupDocs = await startupWorkspace.request('listDocuments')
  startupDocs.documents.forEach((doc: Document) => {
    console.log(`  - ${doc.title} (by ${doc.createdBy})`)
  })
  console.log()

  // 7. Search within tenant (isolated)
  console.log('=== Searching within ACME tenant ===\n')
  const searchResults = await acmeWorkspace.request('search', { query: 'report' })
  console.log(`Found ${searchResults.count} result(s):`)
  searchResults.results.forEach((doc: Document) => {
    console.log(`  - ${doc.title}`)
  })
  console.log()

  // 8. Summary
  console.log('=== Summary ===\n')
  console.log('Tenant Comparison:')
  console.log(`  ACME:       ${acmeStats.userCount} users, ${acmeStats.documentCount} docs`)
  console.log(`  Globex:     ${globexStats.userCount} users, ${globexStats.documentCount} docs`)
  console.log(`  StartupXYZ: ${startupStats.userCount} users, ${startupStats.documentCount} docs`)
  console.log()

  // 9. Cleanup
  console.log('--- Cleanup ---')
  await acmeWorkspace.close()
  await globexWorkspace.close()
  await startupWorkspace.close()
  await client.close()
  await agentServer.close()
  await server.close()
  tickManager.stop()
  
  console.log('\n✓ Example completed successfully!')
  console.log('\nKey takeaway: Each tenant has completely isolated data.')
  console.log('Documents and users from one tenant are never visible to others.')
}

main().catch(console.error)

export { TenantWorkspaceContainer }
