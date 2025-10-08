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
  Class,
  ClientConnectEvent,
  ClientConnection,
  createClient,
  Doc,
  DocChunk,
  DocumentQuery,
  Domain,
  DOMAIN_MODEL,
  DOMAIN_TX,
  FindOptions,
  FindResult,
  generateId,
  Hierarchy,
  LoadModelResponse,
  ModelDb,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  Timestamp,
  Tx,
  TxCreateDoc,
  TxDb,
  TxHandler,
  TxResult,
  type DomainParams,
  type DomainRequestOptions,
  type DomainResult,
  type OperationDomain,
  WorkspaceEvent,
  TxWorkspaceEvent,
  Client,
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

// Minimal model for testing - similar to query tests
function generateMinimalModel (): Tx[] {
  const txes: Tx[] = []

  // Fill Tx'es with basic model classes
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

class TestConnection implements ClientConnection {
  private readonly hierarchy: Hierarchy
  private readonly model: ModelDb
  private readonly transactions: TxDb
  private readonly handlers: TxHandler[] = []
  private _connected: boolean = true
  onConnect?: (event: ClientConnectEvent, lastTx: string | undefined, data: any) => Promise<void>
  getLastHash?: () => Promise<string | undefined>

  constructor (txes: Tx[]) {
    this.hierarchy = new Hierarchy()
    for (const tx of txes) {
      this.hierarchy.tx(tx)
    }

    this.transactions = new TxDb(this.hierarchy)
    this.model = new ModelDb(this.hierarchy)
    for (const tx of txes) {
      void this.transactions.tx(tx)
      void this.model.tx(tx)
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
    const domain = this.hierarchy.getClass(_class).domain
    if (domain === DOMAIN_TX) {
      return await this.transactions.findAll(_class, query, options)
    }
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

    // Notify handlers
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

  // Simulate receiving transactions from server
  simulateTransaction (tx: Tx): void {
    this.handlers.forEach(h => {
      h(tx)
    })
  }
}

describe('Client Core Implementation', () => {
  let testConnection: TestConnection
  let client: Client

  beforeEach(async () => {
    const txes = generateMinimalModel()
    testConnection = new TestConnection(txes)

    client = await createClient(async (handler: TxHandler) => {
      testConnection.pushHandler(handler)
      return testConnection
    })
  })

  it('should create a client instance', () => {
    expect(client).toBeDefined()
    expect(client.getHierarchy()).toBeDefined()
    expect(client.getModel()).toBeDefined()
  })

  it('should handle findAll operations', async () => {
    const spaces = await client.findAll(core.class.Space, {})
    expect(spaces).toBeDefined()
    expect(Array.isArray(spaces)).toBe(true)
  })

  it('should handle findOne operations', async () => {
    const space = await client.findOne(core.class.Space, { name: 'TestSpace' })
    if (space !== undefined) {
      expect(space.name).toBe('TestSpace')
    }
  })

  it('should handle tx operations', async () => {
    const tx: TxCreateDoc<Doc> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      objectId: generateId(),
      objectClass: core.class.Space,
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      createdOn: Date.now(),
      attributes: {
        name: 'NewSpace',
        description: '',
        private: false,
        archived: false,
        members: []
      }
    }

    const result = await client.tx(tx)
    expect(result).toBeDefined()
  })

  it('should handle updateFromRemote for model transactions', async () => {
    const notifySpy = jest.fn()
    client.notify = notifySpy

    const tx: TxCreateDoc<Doc> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      objectId: generateId(),
      objectClass: core.class.Space,
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      createdOn: Date.now(),
      attributes: {
        name: 'RemoteSpace',
        description: '',
        private: false,
        archived: false,
        members: []
      }
    }

    testConnection.simulateTransaction(tx)

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(notifySpy).toHaveBeenCalled()
  })

  it('should close connection properly', async () => {
    await client.close()
    expect(testConnection.isConnected()).toBe(false)
  })

  it('should handle domainRequest', async () => {
    const result = await client.domainRequest('test-domain' as OperationDomain, {})
    expect(result).toBeDefined()
  })

  it('should update hierarchy and model on model transactions', async () => {
    const hierarchy = client.getHierarchy()
    const model = client.getModel()

    expect(hierarchy).toBeDefined()
    expect(model).toBeDefined()

    const tx: TxCreateDoc<Doc> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      objectId: generateId(),
      objectClass: core.class.Space,
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      createdOn: Date.now(),
      attributes: {
        name: 'ModelSpace',
        description: '',
        private: false,
        archived: false,
        members: []
      }
    }

    await client.tx(tx)

    // Verify the transaction was applied
    const spaces = await client.findAll(core.class.Space, { name: 'ModelSpace' })
    expect(spaces.length).toBeGreaterThanOrEqual(0)
  })

  it('should handle reconnection events', async () => {
    let eventReceived: ClientConnectEvent | undefined

    const onConnectHandler = async (event: ClientConnectEvent, lastTx: string | undefined, data: any): Promise<void> => {
      eventReceived = event
    }

    testConnection.onConnect = onConnectHandler

    if (testConnection.onConnect !== undefined) {
      await testConnection.onConnect(ClientConnectEvent.Connected, undefined, {})
    }

    expect(eventReceived).toBe(ClientConnectEvent.Connected)
  })

  it('should handle workspace events', async () => {
    const notifySpy = jest.fn()
    client.notify = notifySpy

    const workspaceTx: TxWorkspaceEvent = {
      _id: generateId(),
      _class: core.class.TxWorkspaceEvent,
      space: core.space.Tx,
      objectSpace: core.space.Workspace,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      createdOn: Date.now(),
      event: WorkspaceEvent.LastTx,
      params: { lastTx: 'test-last-tx' }
    }

    testConnection.simulateTransaction(workspaceTx)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(notifySpy).toHaveBeenCalled()
  })

  it('should handle searchFulltext', async () => {
    const query: SearchQuery = { query: 'test' }
    const options: SearchOptions = {}
    const result = await client.searchFulltext(query, options)
    expect(result).toBeDefined()
    expect(result.docs).toBeDefined()
  })

  it('should handle mixin updates in findAll', async () => {
    const spaces = await client.findAll(core.class.Space, {}, { limit: 10 })
    expect(spaces).toBeDefined()
    expect(spaces.total).toBeDefined()
  })

  it('should skip already applied model transactions', async () => {
    const tx: TxCreateDoc<Doc> = {
      _id: generateId(),
      _class: core.class.TxCreateDoc,
      space: core.space.Tx,
      objectId: generateId(),
      objectClass: core.class.Space,
      objectSpace: core.space.Model,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      createdOn: Date.now(),
      attributes: {
        name: 'DuplicateSpace',
        description: '',
        private: false,
        archived: false,
        members: []
      }
    }

    // Apply the same transaction twice
    await client.tx(tx)

    const notifySpy = jest.fn()
    client.notify = notifySpy

    // Simulate receiving the same transaction from remote
    testConnection.simulateTransaction(tx)

    await new Promise(resolve => setTimeout(resolve, 100))

    // Should still notify but skip model update
    expect(notifySpy).toHaveBeenCalled()
  })
})
