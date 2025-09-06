//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { systemAccountUuid, WorkspaceUuid, type Client } from '@hcengineering/core'
import { generateToken, type Token } from '@hcengineering/server-token'

import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'

export class SignController {
  private readonly clients: Map<string, Client> = new Map<string, Client>()

  protected static _instance: SignController

  private constructor () {
    SignController._instance = this
  }

  static getSignController (): SignController {
    if (SignController._instance !== undefined) {
      return SignController._instance
    }

    return new SignController()
  }

  async getClient (token: Token): Promise<Client> {
    const { workspace } = token
    const clientKey = this.getClientKey(workspace)
    let client = this.clients.get(clientKey)

    if (client === undefined) {
      client = await this.createPlatformClient(workspace)
      this.clients.set(clientKey, client)
    }

    return client
  }

  private async createPlatformClient (workspace: WorkspaceUuid): Promise<Client> {
    const token = generateToken(systemAccountUuid, workspace, { service: 'sign' })
    const endpoint = await getTransactorEndpoint(token)
    const connection = await createClient(endpoint, token)

    console.log(`Platform client has been created (workspace: ${workspace})`)

    return connection
  }

  private getClientKey (workspace: string): string {
    return `${workspace}`
  }

  cleanUp (): void {
    for (const client of this.clients.values()) {
      void client.close()
    }
  }
}
