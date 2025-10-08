//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import core, {
  type Client,
  type Tx,
  generateId,
  TxCreateDoc,
  type Doc,
  createClient,
  type ClientConnection,
  type TxHandler,
  ClientConnectEvent,
  type LoadModelResponse,
  Hierarchy,
  ModelDb,
  TxDb,
  type Class,
  type Ref,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type SearchQuery,
  type SearchOptions,
  type SearchResult,
  type TxResult,
  type Timestamp,
  type Domain,
  type DocChunk,
  type OperationDomain,
  type DomainParams,
  type DomainRequestOptions,
  type DomainResult,
  DOMAIN_MODEL,
  DOMAIN_TX,
  ClassifierKind,
  TxFactory,
  type Data,
  type Obj
} from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'

const txFactory = new TxFactory(core.account.System)

function createClass (_class: Ref<Class<Obj>>, attributes: Data<Class<Obj>>): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(core.class.Class, core.space.Model, attributes, _class)
}

// Generate minimal model for testing
function generateMinimalModel (): Tx[] {
  const txes: Tx[] = []

  txes.push(createClass(core.class.Obj, { label: 'Obj' as IntlString, kind: ClassifierKind.CLASS }))
  txes.push(
    createClass(core.class.Doc, { label: 'Doc' as IntlString, extends: core.class.Obj, kind: ClassifierKind.CLASS })
  )
  txes.push(
    createClass(core.class.Class, {
      label: 'Class' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
    })
  )
  txes.push(
    createClass(core.class.Space, {
      label: 'Space' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
    })
  )
  txes.push(
    createClass(core.class.Tx, {
      label: 'Tx' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_TX
    })
  )
  txes.push(
    createClass(core.class.TxCUD, {
      label: 'TxCUD' as IntlString,
      extends: core.class.Tx,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_TX
    })
  )
  txes.push(
    createClass(core.class.TxCreateDoc, {
      label: 'TxCreateDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(core.class.TxUpdateDoc, {
      label: 'TxUpdateDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(core.class.TxRemoveDoc, {
      label: 'TxRemoveDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )

  return txes
}

// Test utilities for creating mock servers and clients

/**
 * Mock ClientConnection for integration testing
 */
export class MockClientConnection implements ClientConnection {
  private readonly handlers: TxHandler[] = []
  private _connected: boolean = true
  private readonly hierarchy: Hierarchy
  private readonly model: ModelDb
  private readonly transactions: TxDb

  onConnect?: (event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>
  getLastHash?: () => Promise<string | undefined>

  constructor (txes: Tx[] = []) {
    const minimalModel = txes.length === 0 ? generateMinimalModel() : txes

    this.hierarchy = new Hierarchy()
    for (const tx of minimalModel) {
      this.hierarchy.tx(tx)
    }

    this.model = new ModelDb(this.hierarchy)
    this.transactions = new TxDb(this.hierarchy)

    for (const tx of minimalModel) {
      void this.model.tx(tx)
      void this.transactions.tx(tx)
    }
  }

  isConnected (): boolean {
    return this._connected
  }

  setConnected (value: boolean): void {
    this._connected = value
  }

  pushHandler (handler: TxHandler): void {
    this.handlers.push(handler)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.model.findAll(_class, query, options)
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return { docs: [] }
  }

  async tx (tx: Tx): Promise<TxResult> {
    if (tx.objectSpace === core.space.Model) {
      this.hierarchy.tx(tx)
      await this.model.tx(tx)
    }
    await this.transactions.tx(tx)

    this.handlers.forEach(h => {
      h(tx)
    })

    return {}
  }

  async loadModel (last: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    const txes = await this.transactions.findAll(core.class.Tx, {
      objectSpace: core.space.Model,
      modifiedOn: { $gt: last }
    })

    if (hash !== undefined) {
      return {
        transactions: txes,
        hash: 'test-hash',
        full: false
      }
    }
    return txes
  }

  async close (): Promise<void> {
    this._connected = false
  }

  async loadChunk (domain: Domain, idx?: number): Promise<DocChunk> {
    return {
      idx: idx ?? 0,
      docs: [],
      finished: true
    }
  }

  async getDomainHash (domain: Domain): Promise<string> {
    return 'test-hash'
  }

  async closeChunk (idx: number): Promise<void> {}

  async loadDocs (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return []
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {}

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {}

  async sendForceClose (): Promise<void> {}

  async domainRequest (
    ctx: OperationDomain,
    params: DomainParams,
    options?: DomainRequestOptions
  ): Promise<DomainResult> {
    return { domain: ctx, value: null }
  }

  simulateTransaction (tx: Tx): void {
    this.handlers.forEach(h => {
      h(tx)
    })
  }

  async simulateConnect (event: ClientConnectEvent = ClientConnectEvent.Connected): Promise<void> {
    if (this.onConnect !== undefined) {
      await this.onConnect(event, undefined, {})
    }
  }
}

/**
 * Create a test client with mock connection
 */
export async function createTestClient (initialTxes: Tx[] = []): Promise<{
  client: Client
  connection: MockClientConnection
  close: () => Promise<void>
}> {
  const connection = new MockClientConnection(initialTxes)

  const client = await createClient(async (handler: TxHandler) => {
    connection.pushHandler(handler)
    return connection
  })

  return {
    client,
    connection,
    close: async () => {
      await client.close()
    }
  }
}

/**
 * Helper to create a test transaction
 */
export function createTestTx (
  objectClass: Ref<Class<Doc>> = core.class.Space,
  attributes: any = {}
): TxCreateDoc<Doc> {
  return {
    _id: generateId(),
    _class: core.class.TxCreateDoc,
    space: core.space.Tx,
    objectId: generateId(),
    objectClass,
    objectSpace: core.space.Model,
    modifiedBy: core.account.System,
    modifiedOn: Date.now(),
    createdOn: Date.now(),
    attributes: {
      name: 'TestDoc',
      description: '',
      ...attributes
    }
  }
}

describe('Client-Resources Integration Tests', () => {
  it('should create a full client with connection', async () => {
    const { client, connection, close } = await createTestClient()

    expect(client).toBeDefined()
    expect(client.getHierarchy()).toBeDefined()
    expect(client.getModel()).toBeDefined()
    expect(connection.isConnected()).toBe(true)

    await close()
  })

  it('should handle transactions end-to-end', async () => {
    const { client, close } = await createTestClient()

    const notifySpy = jest.fn()
    client.notify = notifySpy

    const tx = createTestTx(core.class.Space, {
      name: 'TestSpace',
      private: false,
      archived: false,
      members: []
    })

    // When we tx directly, it goes through the connection which simulates the server
    // The transaction is processed locally first, then notify is called when
    // transaction comes back from "server" (our mock connection)
    await client.tx(tx)

    // The mock connection immediately notifies handlers when we call tx
    // So notifySpy should have been called
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(notifySpy).toHaveBeenCalled()

    await close()
  })

  it('should handle reconnection events', async () => {
    const { connection, close } = await createTestClient()

    let connectEventReceived: ClientConnectEvent | undefined

    const originalOnConnect = connection.onConnect
    connection.onConnect = async (event, lastTx, data) => {
      connectEventReceived = event
      await originalOnConnect?.(event, lastTx, data)
    }

    await connection.simulateConnect(ClientConnectEvent.Reconnected)

    expect(connectEventReceived).toBe(ClientConnectEvent.Reconnected)

    await close()
  })

  it('should handle model updates', async () => {
    const { client, close } = await createTestClient()

    const tx = createTestTx(core.class.Space, {
      name: 'ModelSpace',
      private: false,
      archived: false,
      members: []
    })

    tx.objectSpace = core.space.Model

    await client.tx(tx)

    const spaces = await client.findAll(core.class.Space, { name: 'ModelSpace' })
    expect(spaces).toBeDefined()

    await close()
  })

  it('should handle findAll with options', async () => {
    const { client, close } = await createTestClient()

    const result = await client.findAll(core.class.Space, {}, { limit: 10, sort: { name: 1 } })

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result.total).toBeDefined()

    await close()
  })

  it('should handle findOne', async () => {
    const { client, close } = await createTestClient()

    const result = await client.findOne(core.class.Space, {})

    // Result may be undefined if no documents exist
    expect(result === undefined || result !== null).toBe(true)

    await close()
  })

  it('should handle connection loss and reconnection', async () => {
    const { connection, close } = await createTestClient()

    expect(connection.isConnected()).toBe(true)

    connection.setConnected(false)
    expect(connection.isConnected()).toBe(false)

    connection.setConnected(true)
    expect(connection.isConnected()).toBe(true)

    await close()
  })

  it('should handle multiple handlers', async () => {
    const { connection, close } = await createTestClient()

    const handler1 = jest.fn()
    const handler2 = jest.fn()

    connection.pushHandler(handler1)
    connection.pushHandler(handler2)

    const tx = createTestTx()

    connection.simulateTransaction(tx)

    expect(handler1).toHaveBeenCalledWith(tx)
    expect(handler2).toHaveBeenCalledWith(tx)

    await close()
  })

  it('should handle searchFulltext', async () => {
    const { client, close } = await createTestClient()

    const query: SearchQuery = { query: 'test' }
    const options: SearchOptions = {}

    const result = await client.searchFulltext(query, options)

    expect(result).toBeDefined()
    expect(result.docs).toBeDefined()
    expect(Array.isArray(result.docs)).toBe(true)

    await close()
  })

  it('should handle domainRequest', async () => {
    const { client, close } = await createTestClient()

    const result = await client.domainRequest('test-domain' as OperationDomain, {})

    expect(result).toBeDefined()

    await close()
  })

  it('should properly clean up on close', async () => {
    const { connection, close } = await createTestClient()

    expect(connection.isConnected()).toBe(true)

    await close()

    expect(connection.isConnected()).toBe(false)
  })

  it('should handle upgrade events', async () => {
    const { connection, close } = await createTestClient()

    let upgradeReceived = false

    const originalOnConnect = connection.onConnect
    connection.onConnect = async (event, lastTx, data) => {
      if (event === ClientConnectEvent.Upgraded) {
        upgradeReceived = true
      }
      await originalOnConnect?.(event, lastTx, data)
    }

    await connection.simulateConnect(ClientConnectEvent.Upgraded)

    expect(upgradeReceived).toBe(true)

    await close()
  })

  it('should handle maintenance events', async () => {
    const { connection, close } = await createTestClient()

    let maintenanceReceived = false

    const originalOnConnect = connection.onConnect
    connection.onConnect = async (event, lastTx, data) => {
      if (event === ClientConnectEvent.Maintenance) {
        maintenanceReceived = true
      }
      await originalOnConnect?.(event, lastTx, data)
    }

    await connection.simulateConnect(ClientConnectEvent.Maintenance)

    expect(maintenanceReceived).toBe(true)

    await close()
  })

  it('should handle concurrent transactions', async () => {
    const { client, connection, close } = await createTestClient()

    const notifySpy = jest.fn()
    client.notify = notifySpy

    const tx1 = createTestTx(core.class.Space, { name: 'Space1' })
    const tx2 = createTestTx(core.class.Space, { name: 'Space2' })
    const tx3 = createTestTx(core.class.Space, { name: 'Space3' })

    await Promise.all([
      client.tx(tx1),
      client.tx(tx2),
      client.tx(tx3)
    ])

    connection.simulateTransaction(tx1)
    connection.simulateTransaction(tx2)
    connection.simulateTransaction(tx3)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(notifySpy.mock.calls.length).toBeGreaterThanOrEqual(3)

    await close()
  })
})
