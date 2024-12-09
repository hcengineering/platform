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

import {
  type Account,
  type Class,
  type Client,
  type Data,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type ModelDb,
  type Ref,
  type Space,
  type WithLookup,
  type TxResult,
  DocumentUpdate,
  TxOperations,
  AttachedDoc,
  AttachedData,
  Mixin,
  MixinUpdate,
  MixinData,
  generateId
} from '@hcengineering/core'
import client, { clientId } from '@hcengineering/client'
import { addLocation, getResource } from '@hcengineering/platform'

import { login, selectWorkspace } from './account'
import { type ServerConfig, loadServerConfig } from './config'
import {
  type MarkupFormat,
  type MarkupOperations,
  type MarkupRef,
  MarkupContent,
  createMarkupOperations
} from './markup'
import { type PlatformClient, type ConnectOptions, WithMarkup } from './types'

/**
 * Create platform client
 * @public */
export async function connect (url: string, options: ConnectOptions): Promise<PlatformClient> {
  const config = await loadServerConfig(url)

  const { endpoint, token } = await getWorkspaceToken(url, options, config)
  return await createClient(url, endpoint, token, config, options)
}

async function createClient (
  url: string,
  endpoint: string,
  token: string,
  config: ServerConfig,
  options: ConnectOptions
): Promise<PlatformClient> {
  addLocation(clientId, () => import(/* webpackChunkName: "client" */ '@hcengineering/client-resources'))

  const { workspace, socketFactory, connectionTimeout } = options

  const clientFactory = await getResource(client.function.GetClient)
  const connection = await clientFactory(token, endpoint, {
    socketFactory,
    connectionTimeout
  })
  const account = await connection.getAccount()

  return new PlatformClientImpl(url, workspace, token, config, connection, account)
}

class PlatformClientImpl implements PlatformClient {
  private readonly client: TxOperations
  private readonly markup: MarkupOperations

  constructor (
    private readonly url: string,
    private readonly workspace: string,
    private readonly token: string,
    private readonly config: ServerConfig,
    private readonly connection: Client,
    private readonly account: Account
  ) {
    this.client = new TxOperations(connection, account._id)
    this.markup = createMarkupOperations(url, workspace, token, config)
  }

  // Client

  getHierarchy (): Hierarchy {
    return this.client.getHierarchy()
  }

  getModel (): ModelDb {
    return this.client.getModel()
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return await this.client.findOne(_class, query, options)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.client.findAll(_class, query, options)
  }

  async close (): Promise<void> {
    await this.connection.close()
  }

  private async processMarkup<T>(_class: Ref<Class<Doc>>, id: Ref<Doc>, data: WithMarkup<T>): Promise<T> {
    const result: any = {}

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof MarkupContent) {
        result[key] = this.markup.uploadMarkup(_class, id, key, value.content, value.kind)
      } else {
        result[key] = value
      }
    }

    return result as T
  }

  // DocOperations

  async createDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: WithMarkup<Data<T>>,
    id?: Ref<T>
  ): Promise<Ref<T>> {
    id ??= generateId()
    const data = await this.processMarkup<Data<T>>(_class, id, attributes)
    return await this.client.createDoc(_class, space, data, id)
  }

  async updateDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: WithMarkup<DocumentUpdate<T>>,
    retrieve?: boolean
  ): Promise<TxResult> {
    const update = await this.processMarkup<DocumentUpdate<T>>(_class, objectId, operations)
    return await this.client.updateDoc(_class, space, objectId, update, retrieve)
  }

  async removeDoc<T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, objectId: Ref<T>): Promise<TxResult> {
    return await this.client.removeDoc(_class, space, objectId)
  }

  // CollectionOperations

  async addCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: Extract<keyof T, string> | string,
    attributes: WithMarkup<AttachedData<P>>,
    id?: Ref<P>
  ): Promise<Ref<P>> {
    id ??= generateId()
    const data = await this.processMarkup<AttachedData<P>>(_class, id, attributes)
    return await this.client.addCollection(_class, space, attachedTo, attachedToClass, collection, data, id)
  }

  async updateCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    objectId: Ref<P>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: Extract<keyof T, string> | string,
    operations: WithMarkup<DocumentUpdate<P>>,
    retrieve?: boolean
  ): Promise<Ref<T>> {
    const update = await this.processMarkup<DocumentUpdate<P>>(_class, objectId, operations)
    return await this.client.updateCollection(
      _class,
      space,
      objectId,
      attachedTo,
      attachedToClass,
      collection,
      update,
      retrieve
    )
  }

  async removeCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    objectId: Ref<P>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: Extract<keyof T, string> | string
  ): Promise<Ref<T>> {
    return await this.client.removeCollection(_class, space, objectId, attachedTo, attachedToClass, collection)
  }

  // MixinOperations

  async createMixin<D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    objectSpace: Ref<Space>,
    mixin: Ref<Mixin<M>>,
    attributes: WithMarkup<MixinData<D, M>>
  ): Promise<TxResult> {
    const data = await this.processMarkup<MixinData<D, M>>(objectClass, objectId, attributes)
    return await this.client.createMixin(objectId, objectClass, objectSpace, mixin, data)
  }

  async updateMixin<D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    objectSpace: Ref<Space>,
    mixin: Ref<Mixin<M>>,
    attributes: WithMarkup<MixinUpdate<D, M>>
  ): Promise<TxResult> {
    const update = await this.processMarkup<MixinUpdate<D, M>>(objectClass, objectId, attributes)
    return await this.client.updateMixin(objectId, objectClass, objectSpace, mixin, update)
  }

  // Markup

  async fetchMarkup (
    objectClass: Ref<Class<Doc>>,
    objectId: Ref<Doc>,
    objectAttr: string,
    markup: MarkupRef,
    format: MarkupFormat
  ): Promise<string> {
    return await this.markup.fetchMarkup(objectClass, objectId, objectAttr, markup, format)
  }

  async uploadMarkup (
    objectClass: Ref<Class<Doc>>,
    objectId: Ref<Doc>,
    objectAttr: string,
    markup: string,
    format: MarkupFormat
  ): Promise<MarkupRef> {
    return await this.markup.uploadMarkup(objectClass, objectId, objectAttr, markup, format)
  }

  // AsyncDisposable

  async [Symbol.asyncDispose] (): Promise<void> {
    await this.close()
  }
}

async function getWorkspaceToken (
  url: string,
  options: ConnectOptions,
  config?: ServerConfig
): Promise<{ endpoint: string, token: string }> {
  config ??= await loadServerConfig(url)

  let token: string

  if ('token' in options) {
    token = options.token
  } else {
    const { email, password, workspace } = options
    token = await login(config.ACCOUNTS_URL, email, password, workspace)
  }

  if (token === undefined) {
    throw new Error('Login failed')
  }

  const ws = await selectWorkspace(config.ACCOUNTS_URL, token, options.workspace)
  if (ws === undefined) {
    throw new Error('Workspace not found')
  }

  return { endpoint: ws.endpoint, token: ws.token }
}
