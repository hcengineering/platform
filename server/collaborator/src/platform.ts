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

import core, { Client, TxOperations, WorkspaceId, systemAccountEmail, toWorkspaceString } from '@hcengineering/core'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import { Token, generateToken } from '@hcengineering/server-token'

async function connect (token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  return await createClient(endpoint, token)
}

async function getTxOperations (client: Client, token: Token, isDerived: boolean = false): Promise<TxOperations> {
  const account = client.getModel().getAccountByEmail(token.email)
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
export type ClientFactory = (params?: ClientFactoryParams) => Promise<TxOperations>

/**
 * @public
 */
export function simpleClientFactory (token: Token): ClientFactory {
  return async (params?: ClientFactoryParams) => {
    const derived = params?.derived ?? false
    const client = await connect(generateToken(token.email, token.workspace))
    return await getTxOperations(client, token, derived)
  }
}

/**
 * @public
 */
export function reusableClientFactory (token: Token, controller: Controller): ClientFactory {
  return async (params?: ClientFactoryParams) => {
    const derived = params?.derived ?? false
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
  private constructor (
    readonly workspace: WorkspaceId,
    readonly client: Client
  ) {}

  static async create (workspace: WorkspaceId): Promise<WorkspaceClient> {
    const token = generateToken(systemAccountEmail, workspace)
    const client = await connect(token)
    return new WorkspaceClient(workspace, client)
  }

  async close (): Promise<void> {
    await this.client.close()
  }
}
