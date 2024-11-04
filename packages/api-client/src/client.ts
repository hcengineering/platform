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
  concatLink
} from '@hcengineering/core'
import client, { clientId } from '@hcengineering/client'
import { addLocation, getResource } from '@hcengineering/platform'

import { login, selectWorkspace } from './account'
import { type APIClient, type ConnectOptions, type ConnectSocketOptions } from './types'

interface ServerConfig {
  ACCOUNTS_URL: string
}

/** @public */
export async function connect (url: string, options: ConnectOptions): Promise<APIClient> {
  const config = await loadServerConfig(url)

  const { endpoint, token } = await getWorkspaceToken(url, options, config)
  return await createClient(endpoint, token, options)
}

/** @public */
export async function createClient (endpoint: string, token: string, options: ConnectSocketOptions): Promise<APIClient> {
  addLocation(clientId, () => import(/* webpackChunkName: "client" */ '@hcengineering/client-resources'))

  const { socketFactory, connectionTimeout } = options

  const clientFactory = await getResource(client.function.GetClient)
  const connection = await clientFactory(token, endpoint, {
    socketFactory,
    connectionTimeout
  })
  const account = await connection.getAccount()

  return new APIClientImpl(connection, account)
}

class APIClientImpl implements APIClient {
  private readonly client: TxOperations

  constructor (
    private readonly connection: Client,
    private readonly account: Account
  ) {
    this.client = new TxOperations(connection, account._id)
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

  // TxOperations

  async createDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: Data<T>,
    id?: Ref<T>
  ): Promise<Ref<T>> {
    return await this.client.createDoc(_class, space, attributes, id)
  }

  updateDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: DocumentUpdate<T>,
    retrieve?: boolean
  ): Promise<TxResult> {
    return this.client.updateDoc(_class, space, objectId, operations, retrieve)
  }

  removeDoc<T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, objectId: Ref<T>): Promise<TxResult> {
    return this.client.removeDoc(_class, space, objectId)
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

async function loadServerConfig (url: string): Promise<ServerConfig> {
  const configUrl = concatLink(url, '/config.json')
  const res = await fetch(configUrl)
  if (res.ok) {
    return (await res.json()) as ServerConfig
  }
  throw new Error('Failed to fetch config')
}
