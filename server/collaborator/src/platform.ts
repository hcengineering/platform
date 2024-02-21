//
// Copyright © 2023 Hardcore Engineering Inc.
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

import client from '@hcengineering/client'
import clientResources from '@hcengineering/client-resources'
import core, { Client, Tx, TxOperations, WorkspaceId, systemAccountEmail, toWorkspaceString } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { Token, generateToken } from '@hcengineering/server-token'
import config from './config'

// eslint-disable-next-line
const WebSocket = require('ws')

async function connect (token: string): Promise<Client> {
  // We need to override default factory with 'ws' one.
  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    return new WebSocket(url, {
      headers: {
        'User-Agent': config.ServiceID
      }
    })
  })
  return await (await clientResources()).function.GetClient(token, config.TransactorUrl)
}

async function getTxOperations (client: Client, token: Token, isDerived: boolean = false): Promise<TxOperations> {
  const account = await client.findOne(core.class.Account, { email: token.email })
  const accountId = account?._id ?? core.account.System

  return new TxOperations(client, accountId, isDerived)
}

/**
 * @public
 */
export interface ClientFactoryParams {
  derived: boolean
}

/**
 * @public
 */
export type ClientFactory = (params: ClientFactoryParams) => Promise<TxOperations>

/**
 * @public
 */
export function getClientFactory (token: Token, controller: Controller): ClientFactory {
  return async ({ derived }: ClientFactoryParams) => {
    const workspaceClient = await controller.get(token.workspace)
    return await getTxOperations(workspaceClient.client, token, derived)
  }
}

/**
 * @public
 */
export class Controller {
  private readonly workspaces: Map<string, WorkspaceClient> = new Map<string, WorkspaceClient>()

  async get (workspaceId: WorkspaceId): Promise<WorkspaceClient> {
    const workspace = toWorkspaceString(workspaceId)

    let client = this.workspaces.get(workspace)
    if (client === undefined) {
      client = await WorkspaceClient.create(workspaceId)
      this.workspaces.set(workspace, client)
    }

    return client
  }

  async close (): Promise<void> {
    for (const workspace of this.workspaces.values()) {
      await workspace.close()
    }
    this.workspaces.clear()
  }
}

/**
 * @public
 */
export class WorkspaceClient {
  private readonly txHandlers: ((...tx: Tx[]) => Promise<void>)[] = []

  private constructor (
    readonly workspace: WorkspaceId,
    readonly client: Client
  ) {
    this.client.notify = (...tx: Tx[]) => {
      void this.txHandler(...tx)
    }
  }

  static async create (workspace: WorkspaceId): Promise<WorkspaceClient> {
    const token = generateToken(systemAccountEmail, workspace)
    const client = await connect(token)
    return new WorkspaceClient(workspace, client)
  }

  async close (): Promise<void> {
    await this.client.close()
  }

  private async txHandler (...tx: Tx[]): Promise<void> {
    for (const h of this.txHandlers) {
      await h(...tx)
    }
  }
}
